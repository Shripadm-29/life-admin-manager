import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { LayoutDashboard, ListTodo, FileText, Bell, User, Menu, X } from 'lucide-react';

export function Navigation() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tasks', label: 'Tasks', icon: ListTodo },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/reminders', label: 'Reminders', icon: Bell },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-lg">
      <div className="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-lg sm:text-xl font-bold text-white">Life Admin Manager</h1>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-4 pt-1 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white/20 text-white rounded-t-lg border-b-2 border-white'
                        : 'text-white/80 hover:text-white hover:bg-white/10 rounded-t-lg'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            className="sm:hidden inline-flex items-center justify-center text-white/90 hover:text-white p-2"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="sm:hidden pb-3">
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
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
