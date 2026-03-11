import { supabase } from './supabaseClient';
import {
  PlannerReminder,
  PlannerSubtask,
  TaskPlanRecord,
  TaskPlanResponse,
} from './plannerTypes';

const sanitizeText = (value?: string | null) => value?.trim() || '';

const normalizeReminder = (reminder: PlannerReminder): PlannerReminder => ({
  id: reminder.id,
  send_at: reminder.send_at,
  message: sanitizeText(reminder.message),
  status: reminder.status || 'scheduled',
  created_at: reminder.created_at,
});

export const normalizePlan = (plan: PlannerSubtask[]): PlannerSubtask[] => {
  return plan
    .map((item, index) => ({
      ...item,
      title: sanitizeText(item.title),
      description: sanitizeText(item.description) || null,
      completed: Boolean(item.completed),
      duration_minutes: item.duration_minutes ?? null,
      scheduled_start: item.scheduled_start || null,
      scheduled_end: item.scheduled_end || null,
      deadline: item.deadline || null,
      sort_order: item.sort_order ?? index,
      reminders: (item.reminders || [])
        .map(normalizeReminder)
        .filter((reminder) => reminder.message && reminder.send_at),
    }))
    .filter((item) => item.title);
};

const mapTaskPlanRecord = (row: any): TaskPlanRecord => ({
  id: row.id,
  task_id: row.task_id,
  user_id: row.user_id,
  status: row.status,
  version: row.version,
  raw_ai_response: (row.raw_ai_response || { plan: [] }) as TaskPlanResponse,
  created_at: row.created_at,
});

const mapSubtask = (row: any): PlannerSubtask => ({
  id: row.id,
  task_id: row.task_id,
  title: row.title,
  description: row.description,
  completed: row.completed,
  duration_minutes: row.duration_minutes,
  scheduled_start: row.scheduled_start || row.planned_for || null,
  scheduled_end: row.scheduled_end || null,
  deadline: row.deadline,
  sort_order: row.sort_order ?? row.order_index ?? 0,
  reminders: (row.subtask_reminders || []).map((reminder: any) => ({
    id: reminder.id,
    send_at: reminder.send_at,
    message: reminder.message,
    status: reminder.status,
    created_at: reminder.created_at,
  })),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const getLatestTaskPlan = async (
  taskId: string,
  userId: string,
): Promise<TaskPlanRecord | null> => {
  const { data, error } = await supabase
    .from('task_plans')
    .select('*')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapTaskPlanRecord(data) : null;
};

export const saveDraftPlan = async (
  taskId: string,
  userId: string,
  rawPlan: TaskPlanResponse,
): Promise<TaskPlanRecord> => {
  const normalized = { plan: normalizePlan(rawPlan.plan) };
  if (!normalized.plan.length) {
    throw new Error('Draft plan must contain at least one subtask.');
  }

  const latest = await getLatestTaskPlan(taskId, userId);
  const nextVersion = (latest?.version || 0) + 1;

  if (latest && latest.status === 'draft') {
    const { data, error } = await supabase
      .from('task_plans')
      .update({ raw_ai_response: normalized, version: nextVersion, status: 'draft' })
      .eq('id', latest.id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return mapTaskPlanRecord(data);
  }

  const { data, error } = await supabase
    .from('task_plans')
    .insert({
      task_id: taskId,
      user_id: userId,
      status: 'draft',
      version: nextVersion,
      raw_ai_response: normalized,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapTaskPlanRecord(data);
};

const cancelSubtaskReminders = async (subtaskIds: string[], userId: string) => {
  if (!subtaskIds.length) return;

  const { error } = await supabase
    .from('subtask_reminders')
    .update({ status: 'cancelled' })
    .in('subtask_id', subtaskIds)
    .eq('user_id', userId)
    .neq('status', 'sent');

  if (error) throw error;
};

const insertSubtasks = async (
  taskId: string,
  userId: string,
  subtasks: PlannerSubtask[],
): Promise<PlannerSubtask[]> => {
  const baseInserts = subtasks.map((item, index) => ({
    task_id: taskId,
    user_id: userId,
    title: item.title,
    description: item.description || null,
    completed: Boolean(item.completed),
    duration_minutes: item.duration_minutes ?? null,
    scheduled_start: item.scheduled_start || null,
    scheduled_end: item.scheduled_end || null,
    deadline: item.deadline || null,
    sort_order: item.sort_order ?? index,
    updated_at: new Date().toISOString(),
  }));

  let { data, error } = await supabase
    .from('subtasks')
    .insert(baseInserts)
    .select('*');

  if (error && String(error.message || '').toLowerCase().includes('planned_for')) {
    const legacyCompatibleInserts = subtasks.map((item, index) => {
      const plannedFor = item.scheduled_start || item.deadline || new Date().toISOString();
      return {
        task_id: taskId,
        user_id: userId,
        title: item.title,
        description: item.description || null,
        completed: Boolean(item.completed),
        duration_minutes: item.duration_minutes ?? 30,
        scheduled_start: item.scheduled_start || plannedFor,
        scheduled_end: item.scheduled_end || null,
        deadline: item.deadline || null,
        sort_order: item.sort_order ?? index,
        updated_at: new Date().toISOString(),
        planned_for: plannedFor,
        order_index: item.sort_order ?? index,
        status: item.completed ? 'done' : 'todo',
        created_by: 'ai',
        checklist: [],
      };
    });

    ({ data, error } = await supabase
      .from('subtasks')
      .insert(legacyCompatibleInserts as any)
      .select('*'));
  }

  if (error) throw error;

  const reminderInserts = (data || []).flatMap((subtask: any, index: number) => {
    const source = subtasks[index];
    return (source.reminders || []).map((reminder) => ({
      subtask_id: subtask.id,
      user_id: userId,
      send_at: reminder.send_at,
      message: reminder.message,
      status: reminder.status || 'scheduled',
    }));
  });

  if (reminderInserts.length) {
    const { error: reminderError } = await supabase
      .from('subtask_reminders')
      .insert(reminderInserts);

    if (reminderError) throw reminderError;
  }

  return listSubtasks(taskId, userId);
};

export const acceptDraftPlan = async (
  taskId: string,
  userId: string,
  planId: string,
  options?: {
    replaceExistingSubtasks?: boolean;
    editedPlan?: TaskPlanResponse;
  },
): Promise<PlannerSubtask[]> => {
  const { data: plan, error: planErr } = await supabase
    .from('task_plans')
    .select('*')
    .eq('id', planId)
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .single();

  if (planErr || !plan) {
    throw planErr || new Error('Draft plan not found.');
  }

  const resolvedPlan = options?.editedPlan
    ? { plan: normalizePlan(options.editedPlan.plan) }
    : ((plan.raw_ai_response || { plan: [] }) as TaskPlanResponse);

  if (!resolvedPlan.plan.length) {
    throw new Error('Accepted plan must contain at least one subtask.');
  }

  if (options?.editedPlan) {
    const { error: updatePlanError } = await supabase
      .from('task_plans')
      .update({ raw_ai_response: resolvedPlan })
      .eq('id', planId)
      .eq('user_id', userId);

    if (updatePlanError) throw updatePlanError;
  }

  if (options?.replaceExistingSubtasks) {
    const existing = await listSubtasks(taskId, userId);
    await cancelSubtaskReminders(existing.map((item) => item.id!).filter(Boolean), userId);
    const { error: delErr } = await supabase
      .from('subtasks')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId);
    if (delErr) throw delErr;
  }

  const created = await insertSubtasks(taskId, userId, resolvedPlan.plan);

  const { error: updateErr } = await supabase
    .from('task_plans')
    .update({ status: 'accepted' })
    .eq('id', plan.id)
    .eq('user_id', userId);

  if (updateErr) throw updateErr;
  return created;
};

export const skipDraftPlan = async (planId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('task_plans')
    .update({ status: 'skipped' })
    .eq('id', planId)
    .eq('user_id', userId);

  if (error) throw error;
};

export const listSubtasks = async (
  taskId: string,
  userId: string,
): Promise<PlannerSubtask[]> => {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*, subtask_reminders(*)')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(mapSubtask);
};

export const addSubtask = async (
  taskId: string,
  userId: string,
  subtask: PlannerSubtask,
): Promise<void> => {
  const existing = await listSubtasks(taskId, userId);
  await insertSubtasks(taskId, userId, [
    {
      ...subtask,
      title: sanitizeText(subtask.title),
      sort_order: existing.length,
    },
  ]);
};

export const toggleSubtask = async (
  subtaskId: string,
  userId: string,
  completed: boolean,
): Promise<void> => {
  const { error } = await supabase
    .from('subtasks')
    .update({ completed })
    .eq('id', subtaskId)
    .eq('user_id', userId);

  if (error) throw error;
};

export const updateDraftPlan = async (
  planId: string,
  userId: string,
  rawPlan: TaskPlanResponse,
): Promise<TaskPlanRecord> => {
  const normalized = { plan: normalizePlan(rawPlan.plan) };
  const { data, error } = await supabase
    .from('task_plans')
    .update({ raw_ai_response: normalized })
    .eq('id', planId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return mapTaskPlanRecord(data);
};

const syncSubtaskReminders = async (
  subtaskId: string,
  userId: string,
  reminders: PlannerReminder[],
) => {
  const normalized = reminders
    .map(normalizeReminder)
    .filter((reminder) => reminder.message && reminder.send_at);

  const { data: existingRows, error: existingError } = await supabase
    .from('subtask_reminders')
    .select('*')
    .eq('subtask_id', subtaskId)
    .eq('user_id', userId);

  if (existingError) throw existingError;

  const keepIds = new Set(normalized.map((reminder) => reminder.id).filter(Boolean));
  const toCancel = (existingRows || [])
    .filter((row) => row.status !== 'sent' && !keepIds.has(row.id))
    .map((row) => row.id);

  if (toCancel.length) {
    const { error: cancelError } = await supabase
      .from('subtask_reminders')
      .update({ status: 'cancelled' })
      .in('id', toCancel)
      .eq('user_id', userId);

    if (cancelError) throw cancelError;
  }

  for (const reminder of normalized) {
    if (reminder.id) {
      const { error: updateError } = await supabase
        .from('subtask_reminders')
        .update({
          send_at: reminder.send_at,
          message: reminder.message,
          status: reminder.status || 'scheduled',
        })
        .eq('id', reminder.id)
        .eq('user_id', userId);

      if (updateError) throw updateError;
      continue;
    }

    const { error: insertError } = await supabase
      .from('subtask_reminders')
      .insert({
        subtask_id: subtaskId,
        user_id: userId,
        send_at: reminder.send_at,
        message: reminder.message,
        status: reminder.status || 'scheduled',
      });

    if (insertError) throw insertError;
  }
};

export const updateSubtask = async (
  subtaskId: string,
  userId: string,
  subtask: PlannerSubtask,
): Promise<void> => {
  const { error } = await supabase
    .from('subtasks')
    .update({
      title: sanitizeText(subtask.title),
      description: sanitizeText(subtask.description) || null,
      completed: Boolean(subtask.completed),
      duration_minutes: subtask.duration_minutes ?? null,
      scheduled_start: subtask.scheduled_start || null,
      scheduled_end: subtask.scheduled_end || null,
      deadline: subtask.deadline || null,
      sort_order: subtask.sort_order ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subtaskId)
    .eq('user_id', userId);

  if (error) throw error;
  await syncSubtaskReminders(subtaskId, userId, subtask.reminders || []);
};

export const deleteSubtask = async (
  subtaskId: string,
  userId: string,
): Promise<void> => {
  await cancelSubtaskReminders([subtaskId], userId);
  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', subtaskId)
    .eq('user_id', userId);

  if (error) throw error;
};
