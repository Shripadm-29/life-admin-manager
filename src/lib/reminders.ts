import { Reminder, ReminderFormValues, Task } from '@/app/types';
import { supabase } from '@/lib/supabaseClient';

const mapReminder = (row: any): Reminder => ({
  id: row.id,
  userId: row.user_id,
  taskId: row.task_id,
  title: row.title,
  description: row.description,
  remindAt: row.remind_at,
  repeatType: row.repeat_type,
  repeatIntervalDays: row.repeat_interval_days,
  isEnabled: row.is_enabled,
  lastTriggeredAt: row.last_triggered_at,
  emailSent: row.email_sent,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  taskTitle: row.tasks?.title || null,
});

export const listReminders = async (userId: string): Promise<Reminder[]> => {
  const { data, error } = await supabase
    .from('reminders')
    .select('*, tasks:task_id(title)')
    .eq('user_id', userId)
    .order('remind_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load reminders.');
  }

  return (data || []).map(mapReminder);
};

export const createReminder = async (
  userId: string,
  values: ReminderFormValues,
): Promise<Reminder> => {
  const payload = {
    user_id: userId,
    task_id: values.taskId,
    title: values.title,
    description: values.description || null,
    remind_at: values.remindAt,
    repeat_type: values.repeatType,
    repeat_interval_days: values.repeatType === 'custom' ? values.repeatIntervalDays : null,
    is_enabled: values.isEnabled,
  };

  const { data, error } = await supabase
    .from('reminders')
    .insert(payload)
    .select('*, tasks:task_id(title)')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create reminder.');
  }

  return mapReminder(data);
};

export const updateReminder = async (
  reminderId: string,
  userId: string,
  values: ReminderFormValues,
): Promise<Reminder> => {
  const payload = {
    task_id: values.taskId,
    title: values.title,
    description: values.description || null,
    remind_at: values.remindAt,
    repeat_type: values.repeatType,
    repeat_interval_days: values.repeatType === 'custom' ? values.repeatIntervalDays : null,
    is_enabled: values.isEnabled,
  };

  const { data, error } = await supabase
    .from('reminders')
    .update(payload)
    .eq('id', reminderId)
    .eq('user_id', userId)
    .select('*, tasks:task_id(title)')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update reminder.');
  }

  return mapReminder(data);
};

export const deleteReminder = async (
  reminderId: string,
  userId: string,
): Promise<void> => {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to delete reminder.');
  }
};

export const toggleReminderEnabled = async (
  reminderId: string,
  userId: string,
  enabled: boolean,
): Promise<void> => {
  const { error } = await supabase
    .from('reminders')
    .update({ is_enabled: enabled })
    .eq('id', reminderId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to update reminder state.');
  }
};

export const listTaskOptions = async (userId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('id,title,category,priority,due_date,due_at,notes,status,created_at')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load task options.');
  }

  return (data || []).map((task: any) => ({
    id: task.id,
    title: task.title,
    category: task.category,
    priority: task.priority,
    dueDate: task.due_at || task.due_date,
    notes: task.notes || '',
    completed: task.status === 'completed',
    status: task.status,
    createdAt: task.created_at,
  }));
};
