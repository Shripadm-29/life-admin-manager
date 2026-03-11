import { RouterProvider } from 'react-router';
import { router } from '@/app/routes.tsx';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';

const AppShell = () => {
  const { authLoading } = useAuth();

  return (
    <>
      <RouterProvider router={router} />
      {authLoading ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/30 backdrop-blur-[1px]">
          <div className="rounded-xl bg-white px-5 py-4 shadow-xl border border-slate-200">
            <p className="text-sm font-medium text-slate-700">Restoring your session...</p>
          </div>
        </div>
      ) : null}
    </>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
};

export default App;