import { supabase } from './supabaseClient';

export type PlanItemType = {
  planned_for: string; // ISO string
  duration_minutes: number;
  title: string;
  checklist: string[];
};

interface PreviewResponse {
  previewPlan: PlanItemType[];
}

interface AcceptResponse {
  insertedItems: any[]; // row objects from task_plan_items
}

/**
 * Request an AI-generated preview plan for a task.  
 * @param taskId the id of the task to plan for
 * @param random if true, ask the LLM to vary the wording (used for regenerating)
 */
export async function getPlanPreview(taskId: string, random = false): Promise<PlanItemType[]> {
  const headers: Record<string, string> = {};
  const session = await supabase.auth.getSession();
  if (session.data.session?.access_token) {
    headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
  }
  const { data, error } = await supabase.functions.invoke<PreviewResponse>('ai-plan-preview', {
    body: JSON.stringify({ task_id: taskId, random }),
    headers,
  });
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('No preview data');
  }
  return data.previewPlan;
}

/**
 * Persist an AI-generated plan to the database.  
 * @param taskId the id of the task
 * @param plan the plan items array (typically one returned from getPlanPreview)
 * @param regenerate whether existing items for the task should be wiped first
 */
export async function acceptPlan(
  taskId: string,
  plan: PlanItemType[],
  regenerate = false,
): Promise<any[]> {
  const headers: Record<string, string> = {};
  const session = await supabase.auth.getSession();
  if (session.data.session?.access_token) {
    headers['Authorization'] = `Bearer ${session.data.session.access_token}`;
  }
  const { data, error } = await supabase.functions.invoke<AcceptResponse>('ai-plan-accept', {
    body: JSON.stringify({ task_id: taskId, plan, regenerate }),
    headers,
  });
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('No accept response');
  }
  return data.insertedItems;
}

/**
 * Convenience wrapper for regenerating the plan (simply calls preview with random=true).
 */
export async function regeneratePlan(taskId: string): Promise<PlanItemType[]> {
  return getPlanPreview(taskId, true);
}
