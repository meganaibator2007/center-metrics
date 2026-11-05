import { createBrowserRouter, Navigate } from 'react-router'
import { HomeRedirect } from './auth/HomeRedirect'
import { RequireRole } from './auth/RequireRole'
import { AppLayout } from './layout/AppLayout'
import { ForbiddenPage, NotFoundPage, SoonPage } from './pages/error/ErrorPages'
import { PlannedPage } from './pages/PlannedPage'
import { LoginPage } from './pages/user/LoginPage'

// Все экраны MVP уже есть как маршруты. PlannedPage заменяется настоящим экраном
// по мере переноса из прототипа; в task и due — задача и срок по плану до 20.11.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomeRedirect /> },
      {
        element: <RequireRole role="TEACHER" />,
        children: [
          { path: 'cabinet', element: <PlannedPage title="Личный кабинет" task="T-47, T-62" due="12.11" /> },
          { path: 'entries/new', element: <PlannedPage title="Ввод данных" task="T-50, T-52, T-56" due="13.11" /> },
          { path: 'report', element: <PlannedPage title="Мой отчёт" task="T-67" due="14.11" /> },
          { path: 'report/submit', element: <PlannedPage title="Отправка отчёта" task="T-65" due="14.11" /> },
        ],
      },
      {
        path: 'admin',
        element: <RequireRole role="ADMIN" />,
        children: [
          { index: true, element: <Navigate to="control" replace /> },
          { path: 'control', element: <PlannedPage title="Контроль сдачи" task="T-74" due="16.11" /> },
          { path: 'summary', element: <PlannedPage title="Сводный отчёт" task="T-69" due="16.11" /> },
          { path: 'indicators', element: <PlannedPage title="Справочник показателей" task="T-36" due="10.11" /> },
          { path: 'indicators/new', element: <PlannedPage title="Новый показатель" task="T-37" due="10.11" /> },
          { path: 'periods', element: <PlannedPage title="Отчётные периоды" task="T-42, T-44" due="13.11" /> },
          { path: 'users', element: <PlannedPage title="Пользователи" task="T-31" due="11.11" /> },
          {
            path: 'reports/:teacherId',
            element: <PlannedPage title="Отчёт преподавателя" task="T-67" due="16.11" />,
          },
        ],
      },
      { path: 'soon/:feature', element: <SoonPage /> },
      { path: '403', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
