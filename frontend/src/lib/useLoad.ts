import { useCallback, useEffect, useState } from 'react'

interface LoadState<T> {
  data: T | null
  error: unknown
  loading: boolean
}

/**
 * Загрузка данных для экрана: { data, error, loading, reload }.
 * key — строка из параметров запроса: изменилась (другой период, фильтр) — загружаем заново.
 */
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const [state, setState] = useState<LoadState<T>>({ data: null, error: null, loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, loading: true, error: null }))
    load().then(
      (data) => !cancelled && setState({ data, error: null, loading: false }),
      (error: unknown) => !cancelled && setState({ data: null, error, loading: false }),
    )
    return () => {
      cancelled = true
    }
    // load меняется на каждой отрисовке, поэтому перезагрузку задаёт key
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const setData = useCallback((data: T) => setState({ data, error: null, loading: false }), [])
  return { ...state, reload, setData }
}
