import type { ProblemDetail } from './types'

/** Ошибка ответа сервера: код HTTP и тело в формате ProblemDetail */
export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetail

  constructor(status: number, problem: ProblemDetail = {}) {
    super(problem.detail ?? problem.title ?? `Ошибка ${status}`)
    this.status = status
    this.problem = problem
  }
}
