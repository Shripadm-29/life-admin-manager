import { createBrowserRouter, Navigate } from 'react-router';
import { Login } from '@/app/components/Login';
import { Signup } from '@/app/components/Signup';
import { PasswordReset } from '@/app/components/PasswordReset';
import { ResetPasswordConfirm } from '@/app/components/ResetPasswordConfirm';
import { Dashboard } from '@/app/components/Dashboard';
import { TasksPage } from '@/app/components/TasksPage';
import { TaskForm } from '@/app/components/TaskForm';
import { TaskDetails } from '@/app/components/TaskDetails';
import { DocumentsPage } from '@/app/components/DocumentsPage';
import { AIExtraction } from '@/app/components/AIExtraction';
import { RemindersPage } from '@/app/components/RemindersPage';
import { ProfilePage } from '@/app/components/ProfilePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/signup',
    Component: Signup,
  },
  {
    path: '/reset-password',
    Component: PasswordReset,
  },
  {
    path: '/reset-password-confirm',
    Component: ResetPasswordConfirm,
  },
  {
    path: '/dashboard',
    Component: Dashboard,
  },
  {
    path: '/tasks',
    Component: TasksPage,
  },
  {
    path: '/tasks/new',
    Component: TaskForm,
  },
  {
    path: '/tasks/:id',
    Component: TaskDetails,
  },
  {
    path: '/tasks/:id/edit',
    Component: TaskForm,
  },
  {
    path: '/documents',
    Component: DocumentsPage,
  },
  {
    path: '/documents/extract',
    Component: AIExtraction,
  },
  {
    path: '/reminders',
    Component: RemindersPage,
  },
  {
    path: '/profile',
    Component: ProfilePage,
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
