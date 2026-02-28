import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { StatusMessage } from '@/app/components/ui/status-message';
import { Reminder, ReminderFormValues, Task } from '@/app/types';
import {
  createReminder,
  deleteReminder,
  listReminders,
  listTaskOptions,
  toggleReminderEnabled,
  updateReminder,
} from '@/lib/reminders';
import { ReminderModal } from '@/app/components/ReminderModal';
import { Bell, Calendar, CalendarClock, Clock, Plus, Repeat, Trash2 } from 'lucide-react';

export function RemindersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async (currentUserId: string) => {
    setError(null);
    const [remindersData, tasksData] = await Promise.all([
      listReminders(currentUserId),
      listTaskOptions(currentUserId),
    ]);
    setReminders(remindersData);
    setTasks(tasksData);
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    (async () => {
      try {
        await loadData(user.id);
      } catch {
        setError('Failed to load reminders.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  const openCreateModal = () => {
    setEditingReminder(null);
    setModalOpen(true);
  };

  const openEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingReminder(null);
  };

  const handleSaveReminder = async (values: ReminderFormValues) => {
    if (!user) return;

    setActionError(null);
    if (editingReminder) {
      const updated = await updateReminder(editingReminder.id, user.id, values);
      setReminders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      return;
    }

    const created = await createReminder(user.id, values);
    setReminders((prev) => [created, ...prev].sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()));
  };

  const handleDeleteReminder = async (reminder: Reminder) => {
    if (!user) return;
    const confirmed = window.confirm(`Delete reminder "${reminder.title}"?`);
    if (!confirmed) return;

    try {
      setActionLoadingId(reminder.id);
      await deleteReminder(reminder.id, user.id);
      setReminders((prev) => prev.filter((item) => item.id !== reminder.id));
    } catch {
      setActionError('Failed to delete reminder.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleEnabled = async (reminder: Reminder) => {
    if (!user) return;
    const nextEnabled = !reminder.isEnabled;

    setReminders((prev) =>
      prev.map((item) =>
        item.id === reminder.id ? { ...item, isEnabled: nextEnabled } : item,
      ),
    );

    try {
      await toggleReminderEnabled(reminder.id, user.id, nextEnabled);
    } catch {
      setActionError('Failed to update reminder status.');
      setReminders((prev) =>
        prev.map((item) =>
          item.id === reminder.id ? { ...item, isEnabled: reminder.isEnabled } : item,
        ),
      );
    }
  };

  const repeatLabel = (reminder: Reminder) => {
    if (reminder.repeatType === 'custom') {
      return `Every ${reminder.repeatIntervalDays || 1} day(s)`;
    }
    return reminder.repeatType.charAt(0).toUpperCase() + reminder.repeatType.slice(1);
  };

  const upcomingReminders = useMemo(() => {
    const now = new Date();
    return reminders
      .filter((reminder) => reminder.isEnabled && new Date(reminder.remindAt) >= now)
      .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
  }, [reminders]);

  const disabledReminders = useMemo(
    () => reminders.filter((reminder) => !reminder.isEnabled),
    [reminders],
  );

  const pastDueReminders = useMemo(() => {
    const now = new Date();
    return reminders
      .filter((reminder) => reminder.isEnabled && new Date(reminder.remindAt) < now)
      .sort((a, b) => new Date(b.remindAt).getTime() - new Date(a.remindAt).getTime());
  }, [reminders]);

  if (!user) return null;

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reminders</h2>
              <p className="text-gray-600">Create and manage email + in-app reminders</p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Reminder
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-3xl font-bold text-gray-900">{upcomingReminders.length}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Past Due</p>
                <p className="text-3xl font-bold text-gray-900">{pastDueReminders.length}</p>
              </div>
              <div className="bg-amber-100 rounded-full p-3">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disabled</p>
                <p className="text-3xl font-bold text-gray-900">{disabledReminders.length}</p>
              </div>
              <div className="bg-gray-100 rounded-full p-3">
                <Bell className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-3xl font-bold text-gray-900">{reminders.length}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <CalendarClock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {actionError && (
          <div className="mb-6 bg-red-50 text-red-700 border border-red-200 rounded-md px-4 py-3 text-sm">
            {actionError}
          </div>
        )}

        {upcomingReminders.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Reminders</h3>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {upcomingReminders.map((reminder) => (
                <div key={reminder.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{reminder.title}</h4>
                      {reminder.description && (
                        <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>Next reminder: {formatDateTime(reminder.remindAt)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                          <Repeat className="w-3 h-3 mr-1" />
                          {repeatLabel(reminder)}
                        </span>
                        {reminder.taskTitle && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            Task: {reminder.taskTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={reminder.isEnabled}
                          onChange={() => handleToggleEnabled(reminder)}
                        />
                        Enabled
                      </label>
                      <button
                        type="button"
                        onClick={() => openEditModal(reminder)}
                        className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(reminder)}
                        disabled={actionLoadingId === reminder.id}
                        className="inline-flex items-center px-3 py-1 text-xs rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-70"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {actionLoadingId === reminder.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pastDueReminders.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Past Due Reminders</h3>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {pastDueReminders.map((reminder) => (
                <div key={reminder.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-100 rounded-lg p-3">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{reminder.title}</h4>
                      {reminder.description && (
                        <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>Scheduled for: {formatDateTime(reminder.remindAt)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                          <Repeat className="w-3 h-3 mr-1" />
                          {repeatLabel(reminder)}
                        </span>
                        {reminder.taskTitle && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            Task: {reminder.taskTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(reminder)}
                        className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(reminder)}
                        disabled={actionLoadingId === reminder.id}
                        className="inline-flex items-center px-3 py-1 text-xs rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-70"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {actionLoadingId === reminder.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {disabledReminders.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Disabled Reminders</h3>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {disabledReminders.map((reminder) => (
                <div key={reminder.id} className="p-6 hover:bg-gray-50 transition-colors opacity-85">
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <Bell className="w-5 h-5 text-gray-600" />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{reminder.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Last scheduled: {formatDateTime(reminder.remindAt)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(reminder)}
                      className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Enable
                    </button>
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

        <ReminderModal
          isOpen={modalOpen}
          reminder={editingReminder}
          tasks={tasks}
          onClose={closeModal}
          onSave={handleSaveReminder}
        />
      </div>
    </div>
  );
}
