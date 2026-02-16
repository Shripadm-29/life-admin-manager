import { RouterProvider } from 'react-router';
import { router } from '@/app/routes.tsx';
import { AuthProvider } from '@/app/context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}