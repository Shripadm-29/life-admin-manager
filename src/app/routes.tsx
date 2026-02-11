// import { createBrowserRouter, Navigate } from 'react-router-dom';
// import { Login } from '@/app/components/Login';
// import { Signup } from '@/app/components/Signup';
// import { Dashboard } from '@/app/components/Dashboard';
// import { TasksPage } from '@/app/components/TasksPage';
// import { TaskForm } from '@/app/components/TaskForm';
// import { DocumentsPage } from '@/app/components/DocumentsPage';
// import { AIExtraction } from '@/app/components/AIExtraction';
// import { RemindersPage } from '@/app/components/RemindersPage';
// import { ProfilePage } from '@/app/components/ProfilePage';

// export const router = createBrowserRouter([
//   {
//     path: '/',
//     element: <Navigate to="/login" replace />,
//   },
//   {
//     path: '/login',
//     Component: Login,
//   },
//   {
//     path: '/signup',
//     Component: Signup,
//   },
//   {
//     path: '/dashboard',
//     Component: Dashboard,
//   },
//   {
//     path: '/tasks',
//     Component: TasksPage,
//   },
//   {
//     path: '/tasks/new',
//     Component: TaskForm,
//   },
//   {
//     path: '/tasks/:id/edit',
//     Component: TaskForm,
//   },
//   {
//     path: '/documents',
//     Component: DocumentsPage,
//   },
//   {
//     path: '/documents/extract',
//     Component: AIExtraction,
//   },
//   {
//     path: '/reminders',
//     Component: RemindersPage,
//   },
//   {
//     path: '/profile',
//     Component: ProfilePage,
//   },
//   {
//     path: '*',
//     element: <Navigate to="/login" replace />,
//   },
// ]);


import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { Dashboard } from './components/Dashboard';
import { DocumentsPage } from './components/DocumentsPage';
// If you have these other files, uncomment them. If not, comment them out to prevent errors.
// import { TasksPage } from './components/TasksPage';
// import { TaskForm } from './components/TaskForm';
// import { AIExtraction } from './components/AIExtraction';
// import { RemindersPage } from './components/RemindersPage';
// import { ProfilePage } from './components/ProfilePage';

export const router = createBrowserRouter([
  {
    path: '/',
    // Redirect root to login
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/documents',
    element: <DocumentsPage />,
  },
  // Catch-all: Redirect unknown pages to login
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);