import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { Dashboard } from './components/Dashboard';
import { DocumentsPage } from './components/DocumentsPage';
import { TasksPage } from './components/TasksPage';
import { TaskForm } from './components/TaskForm';
import { AIExtraction } from './components/AIExtraction';
import { RemindersPage } from './components/RemindersPage';
import { ProfilePage } from './components/ProfilePage';

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
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);