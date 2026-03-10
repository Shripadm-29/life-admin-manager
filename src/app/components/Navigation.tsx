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
  Check,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications';
import { NotificationItem } from '@/app/types';

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

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
    setNotificationsOpen(false);
  };

  const loadNotifications = async (currentUserId: string) => {
    const [items, unread] = await Promise.all([
      listNotifications(currentUserId, 8),
      getUnreadNotificationCount(currentUserId),
    ]);

    setNotifications(items);
    setUnreadCount(unread);
  };

  const handleMarkRead = async (notificationId: string) => {
    if (!user) return;
    await markNotificationRead(notificationId, user.id);
    await loadNotifications(user.id);
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    await loadNotifications(user.id);
  };

  useEffect(() => {
    if (!user) return;

    loadNotifications(user.id).catch(() => {
      setNotifications([]);
      setUnreadCount(0);
    });

    const intervalId = window.setInterval(() => {
      loadNotifications(user.id).catch(() => undefined);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        setNotificationsOpen(false);
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
              ref={notificationsRef}
              className="hidden sm:block relative"
            >
              <button
                type="button"
                className="relative inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/20 border border-white/30 text-white hover:bg-white/25 transition-colors"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setProfileMenuOpen(false);
                }}
                aria-label="Open notifications"
                aria-haspopup="menu"
                aria-expanded={notificationsOpen}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] leading-5 font-semibold text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <div
                className={`absolute right-0 top-full mt-2 w-80 rounded-md bg-white shadow-lg border border-gray-200 transition-all z-20 ${
                  notificationsOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
              >
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-gray-500">No notifications yet.</p>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 border-b border-gray-100 ${
                          notification.isRead ? 'bg-white' : 'bg-blue-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                            <p className="text-xs text-gray-600 mt-1">{notification.body}</p>
                            <p className="text-[11px] text-gray-500 mt-1">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkRead(notification.id)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-blue-600 hover:bg-blue-100"
                              aria-label="Mark notification as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

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
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                }}
              >
                {user?.avatarUrl && !imageError ? (
                  <img 
                    src={user.avatarUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                    onError={() => setImageError(true)}
                  />
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
