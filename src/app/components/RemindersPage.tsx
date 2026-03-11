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
import { Bell, Calendar, CalendarClock, Clock, Plus, Repeat, Search, Trash2 } from 'lucide-react';

export function RemindersPage() {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'time-asc' | 'time-desc' | 'title-asc' | 'title-desc'>('time-asc');

  const getReminderKey = (reminder: Reminder) => `${reminder.source}-${reminder.id}`;

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
    if (authLoading) {
      return;
    }

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
  }, [user, authLoading, navigate]);

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
      const updated = await updateReminder(editingReminder, user.id, values);
      setReminders((prev) =>
        prev.map((item) =>
          item.id === updated.id && item.source === updated.source ? updated : item,
        ),
      );
      return;
    }

    const created = await createReminder(user.id, values);
    setReminders((prev) => [created, ...prev].sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()));
  };

  const handleDeleteReminder = async (reminder: Reminder) => {
    if (!user) return;
    const confirmed = window.confirm(
      reminder.source === 'subtask'
        ? `Remove the AI reminder for "${reminder.title}"?`
        : `Delete reminder "${reminder.title}"?`,
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(getReminderKey(reminder));
      await deleteReminder(reminder, user.id);
      setReminders((prev) => prev.filter((item) => !(item.id === reminder.id && item.source === reminder.source)));
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
        item.id === reminder.id && item.source === reminder.source
          ? {
              ...item,
              isEnabled: nextEnabled,
              status: nextEnabled
                ? item.status === 'sent'
                  ? 'sent'
                  : 'scheduled'
                : 'cancelled',
            }
          : item,
      ),
    );

    try {
      await toggleReminderEnabled(reminder, user.id, nextEnabled);
    } catch {
      setActionError('Failed to update reminder status.');
      setReminders((prev) =>
        prev.map((item) =>
          item.id === reminder.id && item.source === reminder.source
            ? { ...item, isEnabled: reminder.isEnabled, status: reminder.status }
            : item,
        ),
      );
    }
  };

  const openReminderContext = (reminder: Reminder) => {
    if (!reminder.taskId) return;
    if (reminder.subtaskId) {
      navigate(`/tasks/${reminder.taskId}?subtask=${reminder.subtaskId}`);
      return;
    }
    navigate(`/tasks/${reminder.taskId}`);
  };

  const matchesReminderSearch = (reminder: Reminder, term: string) => {
    if (!term.trim()) return true;
    const needle = term.toLowerCase();
    const haystack = [
      reminder.title,
      reminder.description,
      reminder.taskTitle,
      reminder.subtaskTitle,
      reminder.remindAt,
      reminder.source,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  };

  const sortReminders = (items: Reminder[]) => {
    const byTimeAsc = (a: Reminder, b: Reminder) =>
      new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime();
    const byTimeDesc = (a: Reminder, b: Reminder) =>
      new Date(b.remindAt).getTime() - new Date(a.remindAt).getTime();
    const byTitleAsc = (a: Reminder, b: Reminder) => a.title.localeCompare(b.title);
    const byTitleDesc = (a: Reminder, b: Reminder) => b.title.localeCompare(a.title);

    const sorter =
      sortBy === 'time-desc'
        ? byTimeDesc
        : sortBy === 'title-asc'
          ? byTitleAsc
          : sortBy === 'title-desc'
            ? byTitleDesc
            : byTimeAsc;

    return [...items].sort(sorter);
  };

  const visibleReminders = useMemo(
    () => reminders.filter((reminder) => matchesReminderSearch(reminder, searchTerm)),
    [reminders, searchTerm],
  );

  const repeatLabel = (reminder: Reminder) => {
    if (reminder.source === 'subtask') {
      return reminder.status === 'sent' ? 'AI reminder sent' : 'One-time AI reminder';
    }

    if (reminder.repeatType === 'custom') {
      return `Every ${reminder.repeatIntervalDays || 1} day(s)`;
    }
    return reminder.repeatType.charAt(0).toUpperCase() + reminder.repeatType.slice(1);
  };

  const upcomingReminders = useMemo(() => {
    const now = new Date();
    return sortReminders(
      visibleReminders
      .filter((reminder) => reminder.isEnabled && new Date(reminder.remindAt) >= now)
    );
  }, [visibleReminders, sortBy]);

  const disabledReminders = useMemo(
    () => sortReminders(visibleReminders.filter((reminder) => !reminder.isEnabled && reminder.status !== 'sent')),
    [visibleReminders, sortBy],
  );

  const pastDueReminders = useMemo(() => {
    const now = new Date();
    return sortReminders(
      visibleReminders
      .filter((reminder) => (reminder.isEnabled || reminder.status === 'sent') && new Date(reminder.remindAt) < now)
    );
  }, [visibleReminders, sortBy]);

  if (authLoading || !user) return null;

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

          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by title, task, subtask, source, or date"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="time-asc">Sort: Time (earliest first)</option>
                <option value="time-desc">Sort: Time (latest first)</option>
                <option value="title-asc">Sort: Title (A-Z)</option>
                <option value="title-desc">Sort: Title (Z-A)</option>
              </select>
            </div>
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
                <div
                  key={getReminderKey(reminder)}
                  className={`p-6 hover:bg-gray-50 transition-colors ${reminder.taskId ? 'cursor-pointer' : ''}`}
                  onClick={() => openReminderContext(reminder)}
                >
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
                        <span className={`inline-flex items-center px-2 py-1 rounded-full ${reminder.source === 'subtask' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                          {reminder.source === 'subtask' ? 'AI subtask reminder' : 'Manual reminder'}
                        </span>
                        {reminder.subtaskTitle && reminder.source === 'subtask' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            Subtask: {reminder.subtaskTitle}
                          </span>
                        )}
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
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => handleToggleEnabled(reminder)}
                        />
                        Enabled
                      </label>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(reminder);
                        }}
                        className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteReminder(reminder);
                        }}
                        disabled={actionLoadingId === getReminderKey(reminder)}
                        className="inline-flex items-center px-3 py-1 text-xs rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-70"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {actionLoadingId === getReminderKey(reminder) ? 'Deleting...' : reminder.source === 'subtask' ? 'Remove' : 'Delete'}
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
                <div
                  key={getReminderKey(reminder)}
                  className={`p-6 hover:bg-gray-50 transition-colors ${reminder.taskId ? 'cursor-pointer' : ''}`}
                  onClick={() => openReminderContext(reminder)}
                >
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
                        <span className={`inline-flex items-center px-2 py-1 rounded-full ${reminder.source === 'subtask' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                          {reminder.source === 'subtask' ? 'AI subtask reminder' : 'Manual reminder'}
                        </span>
                        {reminder.subtaskTitle && reminder.source === 'subtask' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            Subtask: {reminder.subtaskTitle}
                          </span>
                        )}
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
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(reminder);
                        }}
                        className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteReminder(reminder);
                        }}
                        disabled={actionLoadingId === getReminderKey(reminder)}
                        className="inline-flex items-center px-3 py-1 text-xs rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-70"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {actionLoadingId === getReminderKey(reminder) ? 'Deleting...' : reminder.source === 'subtask' ? 'Remove' : 'Delete'}
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
                <div
                  key={getReminderKey(reminder)}
                  className={`p-6 hover:bg-gray-50 transition-colors opacity-85 ${reminder.taskId ? 'cursor-pointer' : ''}`}
                  onClick={() => openReminderContext(reminder)}
                >
                  <div className="flex items-start gap-4">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <Bell className="w-5 h-5 text-gray-600" />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{reminder.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mb-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full ${reminder.source === 'subtask' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                          {reminder.source === 'subtask' ? 'AI subtask reminder' : 'Manual reminder'}
                        </span>
                        {reminder.taskTitle ? <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700">Task: {reminder.taskTitle}</span> : null}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Last scheduled: {formatDateTime(reminder.remindAt)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleToggleEnabled(reminder);
                      }}
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
        ) : visibleReminders.length === 0 ? (
          <StatusMessage
            variant="empty"
            message={reminders.length ? 'No reminders match your search.' : 'No reminders set up yet.'}
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
