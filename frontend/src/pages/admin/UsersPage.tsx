import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { createUser, getUser, listDepartments, listPrograms, listUsers, resetPassword, setUserActive, updateUser } from '../../api/org'
import type { Category, Permission, Role, UserDto, UserRequest } from '../../api/types'
import { PageHead } from '../../components/PageHead'
import { Alert, Badge, Breadcrumbs, EmptyRow, ErrorAlert, Field, Loading, Req } from '../../components/ui'
import { fieldErrors } from '../../lib/errors'
import { CATEGORY_LABEL, PERMISSION_LABEL, ROLE_LABEL } from '../../lib/labels'
import { useLoad } from '../../lib/useLoad'

const ROLES = Object.keys(ROLE_LABEL) as Role[]
const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]
const PERMISSIONS = Object.keys(PERMISSION_LABEL) as Permission[]

/** Сотрудники и учётные записи (ФР-01): роли, категории оценки, подразделение, программы */
export function UsersPage() {
  const [params, setParams] = useSearchParams()
  const filter = {
    q: params.get('q') ?? '',
    role: params.get('role') ?? '',
    category: params.get('category') ?? '',
    active: params.get('active') ?? '',
    page: Number(params.get('page') ?? 0),
    size: 20,
  }
  const { data, error, loading, reload } = useLoad(() => listUsers(filter), JSON.stringify(filter))
  const [actionError, setActionError] = useState<unknown>(null)

  function set(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    if (name !== 'page') next.delete('page')
    setParams(next, { replace: true })
  }

  async function toggle(user: UserDto) {
    setActionError(null)
    try {
      await setUserActive(user.id, !user.active)
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <>
      <PageHead
        title="Сотрудники и роли"
        actions={
          <Link className="btn btn--primary" to="/admin/users/new">
            Добавить сотрудника
          </Link>
        }
      />
      <div className="filters">
        <div className="field field--grow">
          <label className="field__label" htmlFor="q">
            ФИО или логин
          </label>
          <input id="q" className="input" defaultValue={filter.q} onBlur={(e) => set('q', e.target.value.trim())} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="role">
            Роль
          </label>
          <select id="role" className="select" value={filter.role} onChange={(e) => set('role', e.target.value)}>
            <option value="">Все</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="category">
            Категория
          </label>
          <select id="category" className="select" value={filter.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">Все</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="active">
            Состояние
          </label>
          <select id="active" className="select" value={filter.active} onChange={(e) => set('active', e.target.value)}>
            <option value="">Все</option>
            <option value="true">Активные</option>
            <option value="false">Деактивированные</option>
          </select>
        </div>
      </div>
      {actionError ? <ErrorAlert error={actionError} /> : null}
      {loading && !data && <Loading />}
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      {data && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Сотрудник</th>
                  <th scope="col">Логин</th>
                  <th scope="col">Роли</th>
                  <th scope="col">Категории</th>
                  <th scope="col">Состояние</th>
                  <th scope="col">
                    <span className="visually-hidden">Действия</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.content.length === 0 && <EmptyRow colSpan={6}>Никого не нашли</EmptyRow>}
                {data.content.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.fullName}
                      <div className="cell-sub">{[u.position, u.departmentName].filter(Boolean).join(', ')}</div>
                    </td>
                    <td>{u.login}</td>
                    <td>{u.roles.map((r) => ROLE_LABEL[r]).join(', ')}</td>
                    <td>{u.categories.map((c) => CATEGORY_LABEL[c]).join(', ') || '—'}</td>
                    <td>{u.active ? <Badge kind="open">Активен</Badge> : <Badge kind="closed">Деактивирован</Badge>}</td>
                    <td>
                      <div className="cell-actions">
                        <Link className="btn btn--small btn--outline" to={`/admin/users/${u.id}`}>
                          Изменить
                        </Link>
                        <button type="button" className="btn btn--small btn--outline" onClick={() => toggle(u)}>
                          {u.active ? 'Деактивировать' : 'Активировать'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>
              Всего: {data.page.totalElements}. Страница {data.page.number + 1} из {data.page.totalPages}.
            </span>
            {data.page.totalPages > 1 && (
              <span className="form-actions">
                <button type="button" className="btn btn--small btn--outline" disabled={filter.page === 0} onClick={() => set('page', String(filter.page - 1))}>
                  Назад
                </button>
                <button
                  type="button"
                  className="btn btn--small btn--outline"
                  disabled={filter.page + 1 >= data.page.totalPages}
                  onClick={() => set('page', String(filter.page + 1))}
                >
                  Дальше
                </button>
              </span>
            )}
          </div>
        </>
      )}
    </>
  )
}

/** Создание и изменение учётной записи */
export function UserFormPage() {
  const { id } = useParams()
  const editId = id ? Number(id) : null
  const navigate = useNavigate()
  const existing = useLoad<UserDto | null>(() => (editId ? getUser(editId) : Promise.resolve(null)), `user-${editId}`)
  const departments = useLoad(listDepartments, 'departments')
  const programs = useLoad(listPrograms, 'programs')
  if (existing.loading || !departments.data || !programs.data) return <Loading />
  if (existing.error) return <ErrorAlert error={existing.error} />
  return (
    <UserForm
      key={editId ?? 'new'}
      initial={existing.data}
      departments={departments.data}
      programs={programs.data}
      onSaved={() => navigate('/admin/users', { state: { message: 'Сохранено' } })}
    />
  )
}

function UserForm({
  initial,
  departments,
  programs,
  onSaved,
}: {
  initial: UserDto | null
  departments: Array<{ id: number; name: string }>
  programs: Array<{ id: number; code: string; name: string }>
  onSaved: () => void
}) {
  const [form, setForm] = useState<UserRequest>({
    lastName: initial?.lastName ?? '',
    firstName: initial?.firstName ?? '',
    middleName: initial?.middleName ?? '',
    login: initial?.login ?? '',
    roles: initial?.roles ?? ['EMPLOYEE'],
    categories: initial?.categories ?? ['PPS'],
    departmentId: initial?.departmentId ?? null,
    position: initial?.position ?? '',
    programIds: initial?.programIds ?? [],
    reviewProgramIds: initial?.reviewProgramIds ?? [],
    permissions: initial?.permissions ?? [],
    managerId: initial?.managerId ?? null,
    externalId: initial?.externalId ?? null,
    password: null,
  })
  const [error, setError] = useState<unknown>(null)
  const errors = fieldErrors(error)

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      if (initial) await updateUser(initial.id, form)
      else await createUser(form)
      onSaved()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <Breadcrumbs items={[{ to: '/admin/users', label: 'Сотрудники' }, { label: initial ? initial.fullName : 'Новый сотрудник' }]} />
      <PageHead title={initial ? 'Изменение сотрудника' : 'Новый сотрудник'} />
      {error && !Object.keys(errors).length ? <ErrorAlert error={error} /> : null}
      <form className="form" onSubmit={save} noValidate>
        <div className="form-row form-row--3">
          <Field id="lastName" label="Фамилия" required error={errors.lastName}>
            <input id="lastName" className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </Field>
          <Field id="firstName" label="Имя" required error={errors.firstName}>
            <input id="firstName" className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </Field>
          <Field id="middleName" label="Отчество">
            <input id="middleName" className="input" value={form.middleName ?? ''} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
          </Field>
        </div>
        <div className="form-row">
          <Field id="login" label="Логин" required error={errors.login} hint="Латинские буквы, цифры, точка, дефис">
            <input id="login" className="input" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
          </Field>
          {!initial && (
            <Field id="password" label="Временный пароль" required error={errors.password} hint="Не короче 8 символов">
              <input id="password" type="password" className="input" autoComplete="new-password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          )}
        </div>
        <fieldset className="fieldset">
          <legend>Роли доступа</legend>
          {errors.roles && <p className="field__error">{errors.roles}</p>}
          <div className="check-group">
            {ROLES.map((r) => (
              <label key={r} className="check">
                <input type="checkbox" checked={form.roles.includes(r)} onChange={() => setForm({ ...form, roles: toggle(form.roles, r) })} />
                {ROLE_LABEL[r]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="fieldset">
          <legend>Категории оценки</legend>
          {errors.categories && <p className="field__error">{errors.categories}</p>}
          <div className="check-group">
            {CATEGORIES.map((c) => (
              <label key={c} className="check">
                <input type="checkbox" checked={form.categories.includes(c)} onChange={() => setForm({ ...form, categories: toggle(form.categories, c) })} />
                {CATEGORY_LABEL[c]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-row">
          <Field id="department" label="Подразделение">
            <select id="department" className="select" value={form.departmentId ?? ''} onChange={(e) => setForm({ ...form, departmentId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Не указано</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="position" label="Должность">
            <input id="position" className="input" value={form.position ?? ''} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </Field>
        </div>
        <fieldset className="fieldset">
          <legend>Образовательные программы сотрудника</legend>
          {errors.programIds && <p className="field__error">{errors.programIds}</p>}
          <div className="check-group">
            {programs.map((p) => (
              <label key={p.id} className="check">
                <input type="checkbox" checked={form.programIds.includes(p.id)} onChange={() => setForm({ ...form, programIds: toggle(form.programIds, p.id) })} />
                {p.code} {p.name}
              </label>
            ))}
          </div>
        </fieldset>
        {form.roles.includes('REVIEWER') && (
          <fieldset className="fieldset">
            <legend>
              Область проверки РОП <Req />
            </legend>
            <p className="field__hint">Программы, результаты которых РОП проверяет и по которым вносит целевые показатели.</p>
            {errors.reviewProgramIds && <p className="field__error">{errors.reviewProgramIds}</p>}
            <div className="check-group">
              {programs.map((p) => (
                <label key={p.id} className="check">
                  <input
                    type="checkbox"
                    checked={form.reviewProgramIds.includes(p.id)}
                    onChange={() => setForm({ ...form, reviewProgramIds: toggle(form.reviewProgramIds, p.id) })}
                  />
                  {p.code} {p.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <fieldset className="fieldset">
          <legend>Полномочия</legend>
          <div className="check-group">
            {PERMISSIONS.map((perm) => (
              <label key={perm} className="check">
                <input type="checkbox" checked={form.permissions.includes(perm)} onChange={() => setForm({ ...form, permissions: toggle(form.permissions, perm) })} />
                {PERMISSION_LABEL[perm]}
              </label>
            ))}
          </div>
        </fieldset>
        <Field id="externalId" label="Внешний идентификатор" hint="Табельный номер или ID из кадровой системы: ключ при импорте">
          <input id="externalId" className="input" value={form.externalId ?? ''} onChange={(e) => setForm({ ...form, externalId: e.target.value || null })} />
        </Field>
        {Object.keys(errors).length > 0 && <Alert kind="error" title="Проверьте поля формы" />}
        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            Сохранить
          </button>
          <Link className="btn btn--outline" to="/admin/users">
            Отмена
          </Link>
        </div>
      </form>
      {initial && <ResetPassword user={initial} />}
    </>
  )
}

/** Выдача временного пароля: после входа сотрудник обязан его сменить */
function ResetPassword({ user }: { user: UserDto }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [done, setDone] = useState(false)
  const errors = fieldErrors(error)

  async function reset(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setDone(false)
    try {
      await resetPassword(user.id, password)
      setPassword('')
      setDone(true)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <form className="card form section" onSubmit={reset} noValidate>
      <p className="card__title">Временный пароль</p>
      {user.mustChangePassword && <p className="muted">Сотрудник ещё не сменил выданный пароль.</p>}
      {done && <Alert kind="success" title="Пароль выдан. При следующем входе сотрудник задаст свой." />}
      <Field id="tmp-password" label="Новый временный пароль" required error={errors.password} hint="Не короче 8 символов; передайте сотруднику лично">
        <input id="tmp-password" type="password" className="input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <div className="form-actions">
        <button type="submit" className="btn btn--outline" disabled={password.length < 8}>
          Выдать временный пароль
        </button>
      </div>
    </form>
  )
}
