import { supabase } from './supabaseClient';
import { PlanItemType } from './aiPlan';

export type PlanStatus = 'draft' | 'accepted' | 'skipped';

export interface TaskPlanRecord {
  id: string;
  task_id: string;
  user_id: string;
  steps: string[];
  status: PlanStatus;
  version: number;
  created_at: string;
}

export interface SubtaskRecord {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

const normalizeStep = (step: string): string => step.trim().replace(/\s+/g, ' ');

export const planItemsToSteps = (items: PlanItemType[]): string[] => {
  return items
    .map((item) => {
      const title = item.title?.trim() || 'Untitled step';
      const checklist = (item.checklist || []).map((s) => s.trim()).filter(Boolean);
      if (!checklist.length) return title;
      return `${title}: ${checklist.join('; ')}`;
    })
    .map(normalizeStep)
    .filter(Boolean);
};

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

  return data as TaskPlanRecord | null;
};

export const saveDraftPlan = async (
  taskId: string,
  userId: string,
  steps: string[],
): Promise<TaskPlanRecord> => {
  const cleanSteps = steps.map(normalizeStep).filter(Boolean);
  if (!cleanSteps.length) {
    throw new Error('Draft plan must contain at least one step.');
  }

  const latest = await getLatestTaskPlan(taskId, userId);
  const nextVersion = (latest?.version || 0) + 1;

  if (latest && latest.status === 'draft') {
    const { data, error } = await supabase
      .from('task_plans')
      .update({ steps: cleanSteps, version: nextVersion, status: 'draft' })
      .eq('id', latest.id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return data as TaskPlanRecord;
  }

  const { data, error } = await supabase
    .from('task_plans')
    .insert({
      task_id: taskId,
      user_id: userId,
      steps: cleanSteps,
      status: 'draft',
      version: nextVersion,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as TaskPlanRecord;
};

const insertSubtasks = async (
  taskId: string,
  userId: string,
  steps: string[],
): Promise<SubtaskRecord[]> => {
  const baseInserts = steps.map((step) => ({
    task_id: taskId,
    user_id: userId,
    title: step,
    completed: false,
  }));

  let { data, error } = await supabase
    .from('subtasks')
    .insert(baseInserts)
    .select('*');

  // Some existing DBs may have legacy subtasks columns like planned_for as NOT NULL.
  if (error && String(error.message || '').toLowerCase().includes('planned_for')) {
    const fallbackInserts = steps.map((step, idx) => ({
      task_id: taskId,
      user_id: userId,
      title: step,
      completed: false,
      planned_for: new Date(Date.now() + idx * 60 * 60 * 1000).toISOString(),
      duration_minutes: 30,
      order_index: idx,
      status: 'todo',
      created_by: 'ai',
      checklist: [],
    }));

    ({ data, error } = await supabase
      .from('subtasks')
      .insert(fallbackInserts as any)
      .select('*'));
  }

  if (error) throw error;
  return (data || []) as SubtaskRecord[];
};

export const acceptDraftPlan = async (
  taskId: string,
  userId: string,
  planId: string,
  replaceExistingSubtasks = false,
): Promise<SubtaskRecord[]> => {
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

  if (replaceExistingSubtasks) {
    const { error: delErr } = await supabase
      .from('subtasks')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId);
    if (delErr) throw delErr;
  }

  const created = await insertSubtasks(taskId, userId, (plan.steps || []) as string[]);

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
): Promise<SubtaskRecord[]> => {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as SubtaskRecord[];
};

export const addSubtask = async (
  taskId: string,
  userId: string,
  title: string,
): Promise<SubtaskRecord> => {
  const cleanTitle = normalizeStep(title);
  if (!cleanTitle) {
    throw new Error('Subtask title is required.');
  }

  let { data, error } = await supabase
    .from('subtasks')
    .insert({ task_id: taskId, user_id: userId, title: cleanTitle, completed: false })
    .select('*')
    .single();

  if (error && String(error.message || '').toLowerCase().includes('planned_for')) {
    ({ data, error } = await supabase
      .from('subtasks')
      .insert({
        task_id: taskId,
        user_id: userId,
        title: cleanTitle,
        completed: false,
        planned_for: new Date().toISOString(),
        duration_minutes: 30,
        status: 'todo',
        created_by: 'manual',
        checklist: [],
        order_index: 9999,
      } as any)
      .select('*')
      .single());
  }

  if (error) throw error;
  return data as SubtaskRecord;
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
