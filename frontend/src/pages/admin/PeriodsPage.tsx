import { useState, type FormEvent } from 'react'
import { closePeriod, createPeriod, listPeriods, reopenPeriod } from '../../api/periods'
import type { PeriodRequest, PeriodType } from '../../api/types'
import { PageHead } from '../../components/PageHead'
import { Alert, Badge, ErrorAlert, Field, Loading } from '../../components/ui'
import { fieldErrors } from '../../lib/errors'
import { fmtDate, fmtDateTime } from '../../lib/format'
import { PERIOD_TYPE_LABEL } from '../../lib/labels'
import { useLoad } from '../../lib/useLoad'

/** Отчётные периоды (ФР-09): календарные и произвольные, закрытие и санкционированное переоткрытие */
export function PeriodsPage() {
  const { data, error, loading, reload } = useLoad(listPeriods, 'periods-admin')
  const [form, setForm] = useState<PeriodRequest>({ name: '', type: 'QUARTER', startDate: '', endDate: '' })
  const [formError, setFormError] = useState<unknown>(null)
  const [actionError, setActionError] = useState<unknown>(null)
  const [message, setMessage] = useState<string | null>(null)
  const errors = fieldErrors(formError)

  async function create(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      await createPeriod(form)
      setForm({ name: '', type: form.type, startDate: '', endDate: '' })
      setMessage('Период создан')
      reload()
    } catch (err) {
      setFormError(err)
    }
  }

  async function act(action: () => Promise<unknown>, done: string) {
    setActionError(null)
    try {
      await action()
      setMessage(done)
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <>
      <PageHead title="Отчётные периоды" lead="При закрытии фиксируется снимок официальных итогов; изменения после — только через пересмотр." />
      {message && <Alert kind="success" title={message} />}
      {actionError ? <ErrorAlert error={actionError} /> : null}
      {loading && !data && <Loading />}
      {error ? <ErrorAlert error={error} onRetry={reload} /> : null}
      {data && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Период</th>
                <th scope="col">Тип</th>
                <th scope="col">Границы</th>
                <th scope="col">Статус</th>
                <th scope="col">
                  <span className="visually-hidden">Действия</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{PERIOD_TYPE_LABEL[p.type]}</td>
                  <td className="nowrap">
                    {fmtDate(p.startDate)} — {fmtDate(p.endDate)}
                  </td>
                  <td>
                    {p.closed ? <Badge kind="closed">Закрыт {fmtDateTime(p.closedAt)}</Badge> : <Badge kind="open">Открыт</Badge>}
                  </td>
                  <td>
                    {p.closed ? (
                      <button
                        type="button"
                        className="btn btn--small btn--outline"
                        onClick={() => {
                          const reason = window.prompt('Основание для переоткрытия (решение директора)')
                          if (reason?.trim()) void act(() => reopenPeriod(p.id, reason.trim()), `Период «${p.name}» открыт снова`)
                        }}
                      >
                        Переоткрыть
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn--small btn--outline"
                        onClick={() => window.confirm(`Закрыть «${p.name}»? Итоги будут зафиксированы.`) && void act(() => closePeriod(p.id), `Период «${p.name}» закрыт`)}
                      >
                        Закрыть
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="card form section" onSubmit={create} noValidate>
        <p className="card__title">Новый период</p>
        {formError && !Object.keys(errors).length ? <Alert kind="error" title={String((formError as Error).message)} /> : null}
        <div className="form-row">
          <Field id="p-name" label="Название" required error={errors.name}>
            <input id="p-name" className="input" value={form.name} placeholder="I квартал 2027" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field id="p-type" label="Тип">
            <select id="p-type" className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PeriodType })}>
              {(Object.keys(PERIOD_TYPE_LABEL) as PeriodType[]).map((t) => (
                <option key={t} value={t}>
                  {PERIOD_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field id="p-start" label="Начало" required error={errors.startDate}>
            <input id="p-start" type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field id="p-end" label="Окончание" required error={errors.endDate}>
            <input id="p-end" type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            Создать период
          </button>
        </div>
      </form>
    </>
  )
}
