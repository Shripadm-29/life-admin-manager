import { RouterProvider } from 'react-router';
import { router } from '@/app/routes.tsx';
import { AuthProvider } from '@/app/context/AuthContext';

export const App = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default App;