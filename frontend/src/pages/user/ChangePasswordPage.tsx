import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { changePassword } from '../../api/org'
import { useAuth } from '../../auth/useAuth'
import { PageHead } from '../../components/PageHead'
import { Alert, ErrorAlert, Field } from '../../components/ui'
import { fieldErrors } from '../../lib/errors'

/** Смена пароля. После временного пароля от админа сюда отправляет RequireRole */
export function ChangePasswordPage() {
  const { user, retry } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrent] = useState('')
  const [newPassword, setNew] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [mismatch, setMismatch] = useState(false)
  const errors = fieldErrors(error)
  const forced = user?.mustChangePassword

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMismatch(newPassword !== repeat)
    if (newPassword !== repeat) return
    try {
      await changePassword({ currentPassword, newPassword })
      // Перечитываем пользователя: признак временного пароля снят
      retry()
      navigate('/', { replace: true, state: { message: 'Пароль изменён' } })
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <PageHead title="Смена пароля" lead={user?.fullName} />
      {forced && (
        <Alert title="Задайте свой пароль">Вы вошли по временному паролю от администратора. Чтобы продолжить, смените его.</Alert>
      )}
      {error && !Object.keys(errors).length ? <ErrorAlert error={error} /> : null}
      <form className="form" onSubmit={save} noValidate>
        <Field id="current" label="Текущий пароль" required error={errors.currentPassword}>
          <input id="current" type="password" className="input" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field id="new" label="Новый пароль" required error={errors.newPassword} hint="Не короче 8 символов">
          <input id="new" type="password" className="input" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
        </Field>
        <Field id="repeat" label="Повторите новый пароль" required error={mismatch ? 'Пароли не совпадают' : undefined}>
          <input id="repeat" type="password" className="input" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </Field>
        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={!currentPassword || newPassword.length < 8}>
            Сменить пароль
          </button>
        </div>
      </form>
    </>
  )
}
