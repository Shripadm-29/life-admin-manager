import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  ListTodo,
  FileText,
  Bell,
  User,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tasks', label: 'Tasks', icon: ListTodo },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/reminders', label: 'Reminders', icon: Bell },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setMobileOpen(false);
    setProfileMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-lg border-b border-white/10">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-16 gap-4">
          <div className="flex items-center min-w-0">
            <Link
              to="/dashboard"
              onClick={() => {
                setMobileOpen(false);
                setProfileMenuOpen(false);
              }}
              className="text-lg sm:text-xl font-bold text-white truncate tracking-tight hover:text-white/90 transition-colors"
            >
              Life Admin Manager
            </Link>
          </div>

          <div className="hidden sm:flex flex-1 justify-center">
            <div className="flex items-center gap-2.5 rounded-full bg-white/10 px-3.5 py-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-6 py-2 text-base font-medium rounded-full transition-all ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'text-white/85 hover:text-white hover:bg-white/15'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-2.5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <div
              ref={profileMenuRef}
              className="hidden sm:block relative group"
              onMouseEnter={() => setProfileMenuOpen(true)}
              onMouseLeave={() => setProfileMenuOpen(false)}
            >
              <button
                type="button"
                className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/20 border border-white/30 overflow-hidden"
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((prev) => !prev)}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-white" />
                )}
              </button>

              <div
                className={`absolute right-0 top-full mt-2 w-40 rounded-md bg-white shadow-lg border border-gray-200 transition-all z-20 ${
                  profileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
              >
                <Link
                  to="/profile"
                  onClick={() => setProfileMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-md"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-md inline-flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>

            <button
              type="button"
              className="sm:hidden inline-flex items-center justify-center text-white/90 hover:text-white p-2"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="sm:hidden pb-3 pt-2">
            <div className="grid grid-cols-1 gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  location.pathname === '/profile'
                    ? 'bg-white/20 text-white'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
              >
                <User className="w-5 h-5 mr-2" />
                Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-white/85 hover:text-white hover:bg-white/10"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
