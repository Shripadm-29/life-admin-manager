import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { mockReminders } from '@/app/data/mockData';
import { StatusMessage } from '@/app/components/ui/status-message';
import { Reminder } from '@/app/types';
import { Bell, Calendar, CheckCircle, Clock } from 'lucide-react';

export function RemindersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      try {
        setReminders(mockReminders);
      } catch {
        setError('Failed to load reminders.');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [user, navigate]);

  if (!user) return null;

  const scheduledReminders = reminders.filter(r => r.status === 'scheduled');
  const sentReminders = reminders.filter(r => r.status === 'sent');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > 0) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Reminders</h2>
          <p className="text-gray-600">View and manage your task reminders</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-3xl font-bold text-gray-900">{scheduledReminders.length}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sent</p>
                <p className="text-3xl font-bold text-gray-900">{sentReminders.length}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {scheduledReminders.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Reminders</h3>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {scheduledReminders.map(reminder => (
                <div key={reminder.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{reminder.taskName}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Reminder: {formatDate(reminder.reminderDate)}</span>
                      </div>
                    </div>

                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      Scheduled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sentReminders.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sent Reminders</h3>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {sentReminders.map(reminder => (
                <div key={reminder.id} className="p-6 hover:bg-gray-50 transition-colors opacity-75">
                  <div className="flex items-start gap-4">
                    <div className="bg-green-100 rounded-lg p-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{reminder.taskName}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Sent: {formatDate(reminder.reminderDate)}</span>
                      </div>
                    </div>

                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      Sent
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error ? (
          <StatusMessage variant="error" message={error} icon={<Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />} />
        ) : loading ? (
          <StatusMessage
            variant="loading"
            message="Loading reminders..."
            icon={<Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />}
          />
        ) : reminders.length === 0 ? (
          <StatusMessage
            variant="empty"
            message="No reminders set up yet."
            icon={<Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />}
          />
        ) : null}
      </div>
    </div>
  );
}
