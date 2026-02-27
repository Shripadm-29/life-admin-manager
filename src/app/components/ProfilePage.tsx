import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { User, Mail, LogOut } from 'lucide-react';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Profile & Settings</h2>
          <p className="text-gray-600">Manage your account settings</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
                <p className="text-sm text-gray-600">View and manage your account details</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-md">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">{user.email}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Account Actions</h4>
              
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">About Life Admin Manager</h3>
          <p className="text-sm text-blue-800">
            Life Admin Manager helps college students stay organized with tasks, documents, 
            deadlines, and reminders. Stay on top of your academic and personal life with ease.
          </p>
          <p className="text-sm text-blue-700 mt-2">
            Version 1.0.0 • Made for students, by students
          </p>
        </div>
      </div>
    </div>
  );
}
