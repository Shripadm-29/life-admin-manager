import { Reminder, ReminderFormValues, Task } from '@/app/types';
import { supabase } from '@/lib/supabaseClient';

const mapManualReminder = (row: any): Reminder => ({
  id: row.id,
  userId: row.user_id,
  taskId: row.task_id,
  subtaskId: null,
  title: row.title,
  description: row.description,
  remindAt: row.remind_at,
  repeatType: row.repeat_type,
  repeatIntervalDays: row.repeat_interval_days,
  isEnabled: row.is_enabled,
  source: 'manual',
  status: row.is_enabled ? 'scheduled' : 'cancelled',
  lastTriggeredAt: row.last_triggered_at,
  emailSent: row.email_sent,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  taskTitle: row.tasks?.title || null,
  subtaskTitle: null,
});

const mapSubtaskReminder = (row: any, taskTitleById: Map<string, string>): Reminder => ({
  id: row.id,
  userId: row.user_id,
  taskId: row.subtasks?.task_id || null,
  subtaskId: row.subtask_id,
  title: row.message || row.subtasks?.title || 'Scheduled subtask reminder',
  description: row.subtasks?.title ? `Subtask: ${row.subtasks.title}` : null,
  remindAt: row.send_at,
  repeatType: 'none',
  repeatIntervalDays: null,
  isEnabled: row.status === 'scheduled',
  source: 'subtask',
  status: row.status || 'scheduled',
  lastTriggeredAt: null,
  emailSent: row.status === 'sent',
  createdAt: row.created_at,
  updatedAt: row.created_at,
  taskTitle: row.subtasks?.task_id ? taskTitleById.get(row.subtasks.task_id) || null : null,
  subtaskTitle: row.subtasks?.title || null,
});

export const listReminders = async (userId: string): Promise<Reminder[]> => {
  const [manualResult, subtaskResult] = await Promise.all([
    supabase
      .from('reminders')
      .select('*, tasks:task_id(title)')
      .eq('user_id', userId)
      .order('remind_at', { ascending: true }),
    supabase
      .from('subtask_reminders')
      .select('id,user_id,subtask_id,send_at,message,status,created_at,subtasks!inner(id,title,task_id)')
      .eq('user_id', userId)
      .order('send_at', { ascending: true }),
  ]);

  if (manualResult.error) {
    throw new Error(manualResult.error.message || 'Failed to load reminders.');
  }

  if (subtaskResult.error) {
    throw new Error(subtaskResult.error.message || 'Failed to load subtask reminders.');
  }

  const taskIds = Array.from(
    new Set(
      (subtaskResult.data || [])
        .map((row: any) => row.subtasks?.task_id)
        .filter(Boolean),
    ),
  );

  const taskTitleById = new Map<string, string>();
  if (taskIds.length) {
    const { data: taskRows, error: taskError } = await supabase
      .from('tasks')
      .select('id,title')
      .in('id', taskIds);

    if (taskError) {
      throw new Error(taskError.message || 'Failed to load reminder tasks.');
    }

    for (const task of taskRows || []) {
      taskTitleById.set(task.id, task.title);
    }
  }

  return [
    ...(manualResult.data || []).map(mapManualReminder),
    ...(subtaskResult.data || []).map((row: any) => mapSubtaskReminder(row, taskTitleById)),
  ].sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
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

  return mapManualReminder(data);
};

export const updateReminder = async (
  reminder: Reminder,
  userId: string,
  values: ReminderFormValues,
): Promise<Reminder> => {
  if (reminder.source === 'subtask') {
    const payload = {
      send_at: values.remindAt,
      message: (values.description || values.title || '').trim(),
      status: values.isEnabled ? 'scheduled' : 'cancelled',
    };

    const { data, error } = await supabase
      .from('subtask_reminders')
      .update(payload)
      .eq('id', reminder.id)
      .eq('user_id', userId)
      .select('id,user_id,subtask_id,send_at,message,status,created_at,subtasks!inner(id,title,task_id)')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update reminder.');
    }

    const taskTitleById = new Map<string, string>();
    const taskId = data.subtasks?.task_id;
    if (taskId) {
      const { data: taskRow, error: taskError } = await supabase
        .from('tasks')
        .select('id,title')
        .eq('id', taskId)
        .maybeSingle();

      if (taskError) {
        throw new Error(taskError.message || 'Failed to load reminder task.');
      }

      if (taskRow?.id && taskRow?.title) {
        taskTitleById.set(taskRow.id, taskRow.title);
      }
    }

    return mapSubtaskReminder(data, taskTitleById);
  }

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
    .eq('id', reminder.id)
    .eq('user_id', userId)
    .select('*, tasks:task_id(title)')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update reminder.');
  }

  return mapManualReminder(data);
};

export const deleteReminder = async (
  reminder: Reminder,
  userId: string,
): Promise<void> => {
  if (reminder.source === 'subtask') {
    const { error } = await supabase
      .from('subtask_reminders')
      .delete()
      .eq('id', reminder.id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to remove reminder.');
    }

    return;
  }

  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminder.id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to delete reminder.');
  }
};

export const toggleReminderEnabled = async (
  reminder: Reminder,
  userId: string,
  enabled: boolean,
): Promise<void> => {
  if (reminder.source === 'subtask') {
    const { error } = await supabase
      .from('subtask_reminders')
      .update({ status: enabled ? 'scheduled' : 'cancelled' })
      .eq('id', reminder.id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message || 'Failed to update reminder state.');
    }

    return;
  }

  const { error } = await supabase
    .from('reminders')
    .update({ is_enabled: enabled })
    .eq('id', reminder.id)
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
