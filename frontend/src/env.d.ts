interface ImportMetaEnv {
  /** "true" — клиент работает на заглушках из src/api/mock.ts вместо сервера */
  readonly VITE_API_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
