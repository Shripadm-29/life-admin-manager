import { RouterProvider } from 'react-router';
import { router } from './routes';
// import { AuthProvider } from '@/app/context/AuthContext';

export default function App() {
  return (
    <RouterProvider router={router} />
  );
}