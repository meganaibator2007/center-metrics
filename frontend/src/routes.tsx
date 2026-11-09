import { createBrowserRouter } from 'react-router'
import { RequireRole } from './auth/RequireRole'
import { AppLayout } from './layout/AppLayout'
import { AchievementFormPage } from './pages/achievement/AchievementFormPage'
import { AchievementPage } from './pages/achievement/AchievementPage'
import { AchievementsPage } from './pages/achievement/AchievementsPage'
import { QueuePage } from './pages/achievement/QueuePage'
import { RegistryPage } from './pages/achievement/RegistryPage'
import { AuditPage } from './pages/admin/AuditPage'
import { ImportPage } from './pages/admin/ImportPage'
import { IndicatorFormPage, IndicatorsPage } from './pages/admin/IndicatorsPage'
import { PeriodsPage } from './pages/admin/PeriodsPage'
import { UserFormPage, UsersPage } from './pages/admin/UsersPage'
import { ForbiddenPage, NotFoundPage, ServerErrorPage, SoonPage } from './pages/error/ErrorPages'
import { HomePage } from './pages/home/HomePage'
import { MyIndicatorsPage } from './pages/home/MyIndicatorsPage'
import { AnalyticsPage } from './pages/reports/AnalyticsPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { TargetsPage } from './pages/targets/TargetsPage'
import { LoginPage } from './pages/user/LoginPage'

// Разделы интерфейса по ТЗ, раздел 10. RequireRole — удобство: права проверяет сервер.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <ServerErrorPage /> },
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ServerErrorPage />,
    children: [
      {
        element: <RequireRole />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'achievements/:id', element: <AchievementPage /> },
          { path: 'reports', element: <ReportsPage /> },
        ],
      },
      {
        element: <RequireRole roles={['EMPLOYEE']} />,
        children: [{ path: 'my/indicators', element: <MyIndicatorsPage /> }],
      },
      {
        element: <RequireRole roles={['EMPLOYEE', 'ADMIN', 'REVIEWER']} />,
        children: [
          { path: 'my/achievements', element: <AchievementsPage /> },
          { path: 'my/achievements/new', element: <AchievementFormPage /> },
          { path: 'my/achievements/:id/edit', element: <AchievementFormPage /> },
        ],
      },
      {
        element: <RequireRole roles={['REVIEWER']} />,
        children: [{ path: 'review', element: <QueuePage mode="review" /> }],
      },
      {
        element: <RequireRole roles={['DIRECTOR']} />,
        children: [{ path: 'approval', element: <QueuePage mode="approval" /> }],
      },
      {
        element: <RequireRole roles={['REVIEWER', 'DIRECTOR', 'ADMIN']} />,
        children: [
          { path: 'targets', element: <TargetsPage /> },
          { path: 'registry', element: <RegistryPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
        ],
      },
      {
        path: 'admin',
        element: <RequireRole roles={['ADMIN']} />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'users/new', element: <UserFormPage /> },
          { path: 'users/:id', element: <UserFormPage /> },
          { path: 'indicators', element: <IndicatorsPage /> },
          { path: 'indicators/new', element: <IndicatorFormPage /> },
          { path: 'indicators/:id', element: <IndicatorFormPage /> },
          { path: 'periods', element: <PeriodsPage /> },
          { path: 'import', element: <ImportPage /> },
          { path: 'audit', element: <AuditPage /> },
        ],
      },
      { path: 'soon/:feature', element: <SoonPage /> },
      { path: '403', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
