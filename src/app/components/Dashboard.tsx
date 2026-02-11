import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient'; // Adjusted path to match your structure

export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      // 1. Ask Supabase directly: "Who is logged in?"
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // 2. If nobody is logged in, kick them to the login page
        navigate('/login');
      } else {
        // 3. If they are logged in, save their info to display
        setUser(user);
      }
    } catch (error) {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Life Admin Manager</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-900 font-medium border border-red-200 px-3 py-1 rounded"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600">Select a tool to get started.</p>
        </div>
        
        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Documents Card (Your Sprint 3 Feature) */}
          <Link to="/documents" className="block group">
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow h-full border-l-4 border-blue-500 p-6">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                Documents
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Securely upload, store, and manage your important files.
              </p>
              <div className="mt-4 text-blue-600 text-sm font-medium group-hover:underline">
                Go to Documents &rarr;
              </div>
            </div>
          </Link>

          {/* Tasks Card (Placeholder for future) */}
          <Link to="/tasks" className="block group">
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow h-full border-l-4 border-green-500 p-6">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-600">
                Tasks
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                View upcoming to-dos and manage deadlines.
              </p>
              <div className="mt-4 text-green-600 text-sm font-medium group-hover:underline">
                View Tasks &rarr;
              </div>
            </div>
          </Link>

          {/* Profile Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg h-full border-l-4 border-purple-500 p-6 opacity-75">
            <h3 className="text-lg font-medium text-gray-900">
              Profile
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Manage your account settings (Coming soon).
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}