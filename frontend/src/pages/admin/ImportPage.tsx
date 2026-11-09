import { useState, type FormEvent } from 'react'
import { applyImport, listImports, validateImport } from '../../api/imports'
import { useMock } from '../../api/client'
import type { ImportJobDto, ImportType } from '../../api/types'
import { PageHead } from '../../components/PageHead'
import { Alert, Badge, ErrorAlert, Field } from '../../components/ui'
import { fmtDateTime } from '../../lib/format'
import { useLoad } from '../../lib/useLoad'

/** Наборы загрузки и ключи сопоставления (ТЗ 7.1, 7.2) */
const SETS: Record<ImportType, { title: string; columns: string; key: string }> = {
  EMPLOYEES: {
    title: 'Сотрудники',
    columns: 'Внешний ID, ФИО, подразделение, образовательная программа, категория, статус, руководитель',
    key: 'внешний ID сотрудника',
  },
  INDICATORS: {
    title: 'Справочник показателей',
    columns: 'Код, категория, версия, тип оценки, единица, балл или цель, порядок начисления, подтверждения',
    key: 'код + версия',
  },
  MEASUREMENTS: {
    title: 'Фактические данные РОП',
    columns: 'Показатель, период, программа, факт, числитель, знаменатель, документ-основание',
    key: 'показатель + период + программа',
  },
  ACHIEVEMENTS: {
    title: 'Единичные достижения',
    columns: 'Вид, название, дата, идентификаторы, участники (в т. ч. внешние), документы, заявитель',
    key: 'вид + DOI или номер документа',
  },
}

const ACTION: Record<string, { label: string; badge: string }> = {
  NEW: { label: 'Создать', badge: 'open' },
  UPDATE: { label: 'Обновить', badge: 'sent' },
  SKIP: { label: 'Уже есть', badge: 'none' },
  ERROR: { label: 'Ошибка', badge: 'returned' },
}

/** Импорт XLSX с предварительной проверкой и протоколом (ТЗ 7) */
export function ImportPage() {
  const [type, setType] = useState<ImportType>('EMPLOYEES')
  const [file, setFile] = useState<File | null>(null)
  const [job, setJob] = useState<ImportJobDto | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const history = useLoad(() => (useMock ? Promise.resolve([]) : listImports()), 'imports')

  async function check(event: FormEvent) {
    event.preventDefault()
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      setJob(await validateImport(type, file))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  async function apply() {
    if (!job) return
    setBusy(true)
    try {
      setJob(await applyImport(job.id))
      history.reload()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const errors = job?.rows.filter((r) => r.action === 'ERROR').length ?? 0

  return (
    <>
      <PageHead title="Импорт XLSX" lead="Сначала проверка и протокол, потом подтверждение. Повторная загрузка не создаёт дублей." />
      {useMock && (
        <Alert title="Режим заглушек">
          Разбор XLSX выполняет сервер (пакет import, Apache POI). Без сервера можно посмотреть форматы наборов ниже.
        </Alert>
      )}
      <div className="grid grid--sidebar">
        <form className="form" onSubmit={check}>
          <Field id="type" label="Набор данных">
            <select id="type" className="select" value={type} onChange={(e) => setType(e.target.value as ImportType)}>
              {(Object.keys(SETS) as ImportType[]).map((t) => (
                <option key={t} value={t}>
                  {SETS[t].title}
                </option>
              ))}
            </select>
          </Field>
          <Field id="file" label="Файл XLSX">
            <input id="file" type="file" className="input" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Field>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={!file || busy}>
              Проверить файл
            </button>
          </div>
          {error ? <ErrorAlert error={error} /> : null}
        </form>
        <aside className="card">
          <p className="card__title">{SETS[type].title}</p>
          <p>
            <strong>Колонки:</strong> {SETS[type].columns}.
          </p>
          <p>
            <strong>Ключ сопоставления:</strong> {SETS[type].key}. Запись с тем же ключом обновляется, а не создаётся заново.
          </p>
          <p className="muted">Утверждённые результаты импорт не перезаписывает.</p>
        </aside>
      </div>

      {job && (
        <section className="section">
          <div className="section__head">
            <h2>
              Протокол: {job.fileName} — {job.status === 'APPLIED' ? 'загружено' : 'проверено'}
            </h2>
            {job.status === 'VALIDATED' && (
              <button type="button" className="btn btn--primary" disabled={busy} onClick={apply}>
                Загрузить {errors > 0 ? 'строки без ошибок' : 'всё'}
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col" className="num">
                    Строка
                  </th>
                  <th scope="col">Ключ</th>
                  <th scope="col">Действие</th>
                  <th scope="col">Сообщение</th>
                </tr>
              </thead>
              <tbody>
                {job.rows.map((r) => (
                  <tr key={r.row} className={r.action === 'ERROR' ? 'row--warning' : undefined}>
                    <td className="num">{r.row}</td>
                    <td>{r.key}</td>
                    <td>
                      <Badge kind={ACTION[r.action].badge}>{ACTION[r.action].label}</Badge>
                    </td>
                    <td>{r.message ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(history.data ?? []).length > 0 && (
        <section className="section">
          <h2>История загрузок</h2>
          <ul className="list-plain">
            {history.data!.map((j) => (
              <li key={j.id}>
                {fmtDateTime(j.uploadedAt)} — {SETS[j.type].title}, {j.fileName}, {j.uploadedBy}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
