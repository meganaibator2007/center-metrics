import { fileUrl, request } from './client'
import type { ImportJobDto, ImportType } from './types'

/** Загрузка файла: сервер проверяет строки и возвращает протокол, ничего не меняя */
export function validateImport(type: ImportType, file: File): Promise<ImportJobDto> {
  const form = new FormData()
  form.set('type', type)
  form.set('file', file)
  return request<ImportJobDto>('POST', '/imports', form)
}
/** Подтверждение: загружаются строки NEW и UPDATE, утверждённые результаты не перезаписываются */
export const applyImport = (id: number) => request<ImportJobDto>('POST', `/imports/${id}/apply`)
export const listImports = () => request<ImportJobDto[]>('GET', '/imports')
/** Шаблон XLSX для набора */
export const importTemplateUrl = (type: ImportType) => fileUrl(`/imports/templates/${type}`)
