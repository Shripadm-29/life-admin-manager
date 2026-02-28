import { Reminder, ReminderFormValues, ReminderRepeatType, Task } from '@/app/types';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ReminderModalProps {
  isOpen: boolean;
  reminder: Reminder | null;
  tasks: Task[];
  onClose: () => void;
  onSave: (values: ReminderFormValues) => Promise<void>;
}

const repeatOptions: Array<{ value: ReminderRepeatType; label: string }> = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom (days)' },
];

const toLocalDateTime = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const defaultValues = (): ReminderFormValues => ({
  title: '',
  description: '',
  remindAt: '',
  repeatType: 'none',
  repeatIntervalDays: null,
  taskId: null,
  isEnabled: true,
});

export function ReminderModal({
  isOpen,
  reminder,
  tasks,
  onClose,
  onSave,
}: ReminderModalProps) {
  const [values, setValues] = useState<ReminderFormValues>(defaultValues());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (!reminder) {
      setValues(defaultValues());
      setError('');
      return;
    }

    setValues({
      title: reminder.title,
      description: reminder.description || '',
      remindAt: toLocalDateTime(reminder.remindAt),
      repeatType: reminder.repeatType,
      repeatIntervalDays: reminder.repeatIntervalDays,
      taskId: reminder.taskId,
      isEnabled: reminder.isEnabled,
    });
    setError('');
  }, [isOpen, reminder]);

  if (!isOpen) return null;

  const setField = <K extends keyof ReminderFormValues>(field: K, value: ReminderFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const title = values.title.trim();
    if (!title) {
      setError('Title is required.');
      return;
    }

    if (!values.remindAt) {
      setError('Reminder date and time are required.');
      return;
    }

    const remindDate = new Date(values.remindAt);
    if (Number.isNaN(remindDate.getTime())) {
      setError('Reminder date/time is invalid.');
      return;
    }

    if (values.repeatType === 'custom' && (!values.repeatIntervalDays || values.repeatIntervalDays < 1)) {
      setError('Custom repeat interval must be at least 1 day.');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        ...values,
        title,
        remindAt: remindDate.toISOString(),
        repeatIntervalDays: values.repeatType === 'custom' ? values.repeatIntervalDays : null,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save reminder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {reminder ? 'Edit Reminder' : 'Create Reminder'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={values.title}
              onChange={(event) => setField('title', event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Reminder title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={values.description}
              onChange={(event) => setField('description', event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Optional details"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={values.remindAt}
              onChange={(event) => setField('remindAt', event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
            <select
              value={values.repeatType}
              onChange={(event) => setField('repeatType', event.target.value as ReminderRepeatType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {repeatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {values.repeatType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom interval (days)</label>
              <input
                type="number"
                min={1}
                value={values.repeatIntervalDays ?? ''}
                onChange={(event) => setField('repeatIntervalDays', Number(event.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link to task (optional)</label>
            <select
              value={values.taskId || ''}
              onChange={(event) => setField('taskId', event.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No linked task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={values.isEnabled}
              onChange={(event) => setField('isEnabled', event.target.checked)}
              className="w-4 h-4"
            />
            Reminder is enabled
          </label>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? 'Saving...' : reminder ? 'Update Reminder' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
