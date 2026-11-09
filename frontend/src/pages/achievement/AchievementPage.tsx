import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import {
  addEvidenceLink,
  approveAchievement,
  evidenceFileUrl,
  checkDuplicates,
  deleteAchievement,
  getAchievement,
  joinAchievement,
  rejectAchievement,
  removeEvidence,
  returnAchievement,
  reviewAchievement,
  sendToRevision,
  submitAchievement,
  uploadEvidence,
} from '../../api/achievements'
import { useMock } from '../../api/client'
import type { AchievementDto, DuplicateDto } from '../../api/types'
import { hasRole } from '../../auth/context'
import { useAuth } from '../../auth/useAuth'
import { PageHead } from '../../components/PageHead'
import { Alert, Breadcrumbs, ErrorAlert, Field, Loading, StatusBadge } from '../../components/ui'
import { errorText, fieldErrors } from '../../lib/errors'
import { fmt, fmtDate, fmtDateTime, fmtSize } from '../../lib/format'
import { ACTION_LABEL, CATEGORY_FULL, IDENTIFIER_LABEL, STATUS } from '../../lib/labels'
import { useLoad } from '../../lib/useLoad'

const EDITABLE = ['DRAFT', 'RETURNED', 'REVISION']

/** Карточка достижения: реквизиты, участники и доли, документы, история решений и действия по маршруту */
export function AchievementPage() {
  const id = Number(useParams().id)
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: a, error, loading, reload, setData } = useLoad(() => getAchievement(id), `achievement-${id}`)
  const [message, setMessage] = useState<string | null>((location.state as { message?: string } | null)?.message ?? null)
  const [actionError, setActionError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)

  if (loading && !a) return <Loading />
  if (error) return <ErrorAlert error={error} onRetry={reload} />
  if (!a || !user) return null

  const participant = a.participants.some((p) => p.userId === user.id) || a.owner.id === user.id
  const author = a.owner.id === user.id || a.enteredBy === user.fullName
  const editable = author && EDITABLE.includes(a.status)
  // Проверка и утверждение — разные решения (ТЗ 2.2, 4.2): /review из ON_REVIEW, /approve только из REVIEWED.
  // Результат самого РОП (reviewer = DIRECTOR) проверяет директор, потом он же утверждает.
  const reviewTurn =
    a.status === 'ON_REVIEW' &&
    !participant &&
    (a.reviewer === 'ROP' ? hasRole(user, 'REVIEWER') : hasRole(user, 'DIRECTOR'))
  const approveTurn = a.status === 'REVIEWED' && !participant && hasRole(user, 'DIRECTOR')
  const revisionTurn = a.status === 'APPROVED' && !participant && hasRole(user, 'DIRECTOR')
  const canJoin =
    hasRole(user, 'EMPLOYEE') && !participant && a.status !== 'REJECTED' && a.participants.length > 0 && a.basePoints > 0
  const mine = a.participants.find((p) => p.userId === user.id)

  async function run(action: () => Promise<AchievementDto | void>, done: string) {
    setBusy(true)
    setActionError(null)
    setMessage(null)
    try {
      const result = await action()
      if (result) setData(result)
      else reload()
      setMessage(done)
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Удалить черновик? Восстановить его будет нельзя.')) return
    try {
      await deleteAchievement(id)
      navigate('/my/achievements', { replace: true })
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          participant || author ? { to: '/my/achievements', label: 'Мои достижения' } : { to: '/registry', label: 'Реестр' },
          { label: a.title },
        ]}
      />
      <PageHead
        title={a.title}
        lead={
          <>
            {a.indicatorCode} · {a.indicatorName}
          </>
        }
        actions={
          editable && (
            <>
              <Link className="btn btn--outline" to={`/my/achievements/${a.id}/edit`}>
                Изменить
              </Link>
              <button type="button" className="btn btn--primary btn--arrow" disabled={busy} onClick={() => run(() => submitAchievement(id), 'Отправлено на проверку.')}>
                Отправить на проверку
              </button>
            </>
          )
        }
      />

      {message && <Alert kind="success" title={message} />}
      {actionError ? <ErrorAlert error={actionError} /> : null}
      {a.lastComment && ['RETURNED', 'REJECTED', 'REVISION'].includes(a.status) && (
        <Alert kind="error" title={a.status === 'REJECTED' ? 'Причина отклонения' : 'Замечание'}>
          {a.lastComment}
        </Alert>
      )}

      <div className="grid grid--sidebar">
        <div>
          <dl className="meta">
            <div>
              <dt>Статус</dt>
              <dd>
                <StatusBadge status={a.status} reviewer={a.reviewer} />
              </dd>
            </div>
            <div>
              <dt>Период</dt>
              <dd>{a.periodName}</dd>
            </div>
            <div>
              <dt>Дата события</dt>
              <dd>{fmtDate(a.eventDate)}</dd>
            </div>
            <div>
              <dt>Категория</dt>
              <dd>{CATEGORY_FULL[a.category]}</dd>
            </div>
            <div>
              <dt>{a.identifierType ? IDENTIFIER_LABEL[a.identifierType] : 'Идентификатор'}</dt>
              <dd>{a.identifier ?? '—'}</dd>
            </div>
            {a.programName && (
              <div>
                <dt>Программа и дисциплина</dt>
                <dd>
                  {a.programName}
                  {a.discipline ? `, «${a.discipline}»` : ''}
                </dd>
              </div>
            )}
            <div>
              <dt>Заявитель</dt>
              <dd>{a.owner.fullName}</dd>
            </div>
            {a.enteredBy && (
              <div>
                <dt>Административный ввод</dt>
                <dd>
                  {a.enteredBy}. Основание: {a.basis}
                </dd>
              </div>
            )}
          </dl>
          {a.description && <p>{a.description}</p>}

          <section className="section">
            <h2>Участники и доли</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Участник</th>
                    <th scope="col" className="num">
                      Вес
                    </th>
                    <th scope="col" className="num">
                      Доля
                    </th>
                    <th scope="col" className="num">
                      Балл
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {a.participants.map((p, i) => (
                    <tr key={i}>
                      <td>
                        {p.fullName}
                        {p.external && <div className="cell-sub">внешний соавтор — доля не распределяется</div>}
                      </td>
                      <td className="num">{fmt(p.weight)}</td>
                      <td className="num">{fmt(p.share * 100)} %</td>
                      <td className="num">
                        <strong>{fmt(p.points)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}>
                      B = {fmt(a.basePoints)}, c = {fmt(a.coefficient)}, N = {a.participants.length}
                    </td>
                    <td className="num">{fmt(a.participants.reduce((s, p) => s + p.points, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="field__hint">
              {a.status === 'APPROVED'
                ? 'Начисления утверждены директором и входят в официальный итог.'
                : 'Предварительный расчёт: в официальный итог войдёт после утверждения директором.'}
              {a.version > 1 && ` Редакция расчёта ${a.version}, прежние сохранены в истории.`}
            </p>
            {canJoin && (
              <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => run(() => joinAchievement(id), 'Вы добавлены в соавторы, доли пересчитаны.')}>
                Я соавтор — присоединиться
              </button>
            )}
          </section>

          <Evidence a={a} editable={editable} onChange={reload} />

          {(reviewTurn || approveTurn) && <DuplicatesCheck a={a} />}
        </div>

        <aside>
          {mine && (
            <section className="card card--accent">
              <p className="stat__label">Мой балл</p>
              <p className="stat__value">{fmt(mine.points)}</p>
              <p className="stat__note">{STATUS[a.status].label}</p>
            </section>
          )}
          {reviewTurn && <Decision a={a} mode="review" busy={busy} run={run} />}
          {approveTurn && <Decision a={a} mode="approve" busy={busy} run={run} />}
          {revisionTurn && <Decision a={a} mode="revision" busy={busy} run={run} />}
          {editable && a.status === 'DRAFT' && (
            <p>
              <button type="button" className="btn btn--danger btn--small" onClick={remove}>
                Удалить черновик
              </button>
            </p>
          )}
          <section className="card">
            <p className="card__title">История</p>
            <ol className="list-steps">
              {a.history.map((h) => (
                <li key={h.id}>
                  <strong>{ACTION_LABEL[h.action]}</strong>
                  <div className="cell-sub">
                    {h.actor}, {fmtDateTime(h.at)}
                  </div>
                  {h.comment && <div>{h.comment}</div>}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </>
  )
}

interface DecisionProps {
  a: AchievementDto
  /** review — проверка (РОП или директор для результатов РОП), approve — утверждение, revision — пересмотр */
  mode: 'review' | 'approve' | 'revision'
  busy: boolean
  run: (action: () => Promise<AchievementDto>, done: string) => Promise<void>
}

/** Решение РОП или директора; возврат и отклонение — только с комментарием (ТЗ 4.1) */
function Decision({ a, mode, busy, run }: DecisionProps) {
  const [comment, setComment] = useState('')
  const [missing, setMissing] = useState(false)
  const approved = mode === 'revision'
  const reviewer = mode === 'review'
  const title = approved ? 'Пересмотр' : reviewer ? (a.reviewer === 'DIRECTOR' ? 'Проверка директором' : 'Решение РОП') : 'Утверждение'

  function withComment(action: (text: string) => Promise<AchievementDto>, done: string) {
    if (!comment.trim()) {
      setMissing(true)
      return
    }
    setMissing(false)
    void run(() => action(comment.trim()), done).then(() => setComment(''))
  }

  return (
    <section className="card card--outline">
      <p className="card__title">{title}</p>
      {!approved && (
        <p className="muted">
          {reviewer
            ? a.reviewer === 'DIRECTOR'
              ? 'Заявитель — РОП, поэтому проверку данных выполняет директор. Утверждение — следующим отдельным решением.'
              : 'Проверьте документы, авторство, дубли и расчёт доли.'
            : 'Проверка пройдена. В официальный итог результат войдёт только после вашего утверждения.'}
        </p>
      )}
      <Field id="comment" label="Комментарий" error={missing ? 'Для возврата, отклонения и пересмотра нужен комментарий' : undefined}>
        <textarea id="comment" className="textarea" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
      <div className="form-actions">
        {approved ? (
          <button type="button" className="btn btn--outline" disabled={busy} onClick={() => withComment((c) => sendToRevision(a.id, c), 'Отправлено на пересмотр.')}>
            Отправить на пересмотр
          </button>
        ) : (
          <>
            {reviewer ? (
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy}
                onClick={() => run(() => reviewAchievement(a.id, comment.trim() || null), 'Проверка пройдена, результат ждёт утверждения.')}
              >
                {a.reviewer === 'DIRECTOR' ? 'Проверено' : 'Проверено — директору'}
              </button>
            ) : (
              <button type="button" className="btn btn--primary" disabled={busy} onClick={() => run(() => approveAchievement(a.id, comment.trim() || null), 'Утверждено. Начисления вошли в итог.')}>
                Утвердить
              </button>
            )}
            <button type="button" className="btn btn--outline" disabled={busy} onClick={() => withComment((c) => returnAchievement(a.id, c), 'Возвращено на доработку.')}>
              Вернуть на доработку
            </button>
            <button type="button" className="btn btn--danger" disabled={busy} onClick={() => withComment((c) => rejectAchievement(a.id, c), 'Отклонено.')}>
              Отклонить
            </button>
          </>
        )}
      </div>
    </section>
  )
}

/** Подтверждающие документы (ФР-04): файлы PDF, JPG, PNG до 10 МБ или ссылки */
function Evidence({ a, editable, onChange }: { a: AchievementDto; editable: boolean; onChange: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('')
  const [requisites, setRequisites] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const errors = fieldErrors(error)

  async function add(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (file) await uploadEvidence(a.id, file, docType.trim(), requisites.trim() || null)
      else await addEvidenceLink(a.id, docType.trim(), url.trim(), requisites.trim() || null)
      setFile(null)
      setUrl('')
      setDocType('')
      setRequisites('')
      ;(event.target as HTMLFormElement).reset()
      onChange()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function remove(evidenceId: number) {
    try {
      await removeEvidence(a.id, evidenceId)
      onChange()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <section className="section">
      <h2>Подтверждающие документы</h2>
      {a.evidence.length === 0 && <p className="muted">Документов пока нет. Без них отправить на проверку нельзя.</p>}
      <ul className="list-plain">
        {a.evidence.map((e) => (
          <li key={e.id}>
            <strong>{e.docType}:</strong>{' '}
            {e.url ? (
              <a href={e.url} target="_blank" rel="noreferrer">
                {e.url}
              </a>
            ) : useMock ? (
              <span title="Файлы хранит сервер: в режиме заглушек скачать нельзя">{e.fileName}</span>
            ) : (
              <a href={evidenceFileUrl(a.id, e.id)}>{e.fileName}</a>
            )}
            {e.requisites && <span>, {e.requisites}</span>}{' '}
            <span className="muted">
              {fmtSize(e.size)} · {e.uploadedBy}, {fmtDateTime(e.uploadedAt)}
            </span>{' '}
            {editable && (
              <button type="button" className="btn btn--small btn--outline" onClick={() => remove(e.id)}>
                Убрать
              </button>
            )}
          </li>
        ))}
      </ul>
      {editable && (
        <form className="form" onSubmit={add}>
          {error ? <p className="field__error">{errorText(error)}</p> : null}
          <div className="form-row">
            <Field id="docType" label="Тип документа" required error={errors.docType} hint="Копия статьи, сертификат, приказ…">
              <input id="docType" className="input" value={docType} onChange={(e) => setDocType(e.target.value)} />
            </Field>
            <Field id="requisites" label="Реквизиты" hint="Номер и дата документа">
              <input id="requisites" className="input" value={requisites} onChange={(e) => setRequisites(e.target.value)} />
            </Field>
          </div>
          <div className="form-row">
            <Field id="file" label="Файл" hint="PDF, JPG или PNG до 10 МБ" error={errors.file}>
              <input id="file" type="file" className="input" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <Field id="url" label="…или ссылка" error={errors.url}>
              <input id="url" className="input" value={url} disabled={!!file} placeholder="https://elibrary.ru/…" onChange={(e) => setUrl(e.target.value)} />
            </Field>
          </div>
          <button type="submit" className="btn btn--outline btn--small" disabled={busy || !docType.trim() || (!file && !url.trim())}>
            Добавить документ
          </button>
        </form>
      )}
    </section>
  )
}

/** Для проверяющего: возможные повторы этого достижения в реестре (ТЗ 5.2) */
function DuplicatesCheck({ a }: { a: AchievementDto }) {
  const { data } = useLoad<DuplicateDto[]>(
    () =>
      checkDuplicates({
        indicatorId: a.indicatorId,
        identifierType: a.identifierType,
        identifier: a.identifier,
        title: a.title,
        eventDate: a.eventDate,
        excludeId: a.id,
      }),
    `dups-${a.id}`,
  )
  if (!data) return null
  return (
    <section className="section">
      <h2>Проверка дублей</h2>
      {data.length === 0 ? (
        <Alert kind="success" title="Повторов не найдено">
          По идентификатору, названию и дате совпадений в реестре нет.
        </Alert>
      ) : (
        <Alert kind="error" title="Возможные повторы">
          <ul className="list-plain">
            {data.map((d) => (
              <li key={d.achievementId}>
                {d.match === 'STRICT' ? 'Тот же идентификатор' : 'Похожая запись'}:{' '}
                <Link to={`/achievements/${d.achievementId}`}>
                  {d.indicatorCode} · {d.title}
                </Link>{' '}
                ({d.participants.join(', ')}, «{STATUS[d.status].label}»)
              </li>
            ))}
          </ul>
        </Alert>
      )}
      <p className="field__hint">Повторное начисление за то же достижение по тому же основанию запрещено.</p>
    </section>
  )
}
