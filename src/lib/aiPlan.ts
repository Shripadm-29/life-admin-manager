import { supabase } from './supabaseClient';

export type PlanItemType = {
  plannedFor: string;  // ISO string.
  durationMinutes: number;
  title: string;
  checklist: string[];
};

interface PreviewResponse {
  previewPlan: PlanItemType[];
}

interface AcceptResponse {
  insertedItems: Record<string, string | number | string[] | null>[];  // Row objects from task_plan_items.
}

/**
 * Request an AI-generated preview plan for a task.
 * @param taskId The ID of the task to plan for.
 * @param random If true, ask the LLM to vary the wording (used for regenerating).
 */
export const getPlanPreview = async (
  taskId: string,
  random = false,
): Promise<PlanItemType[]> => {
  const headers: Record<string, string> = {};
  const session = await supabase.auth.getSession();
  if (session.data.session?.access_token) {
    headers.Authorization = `Bearer ${session.data.session.access_token}`;
  }
  const { data, error } = await supabase.functions.invoke<PreviewResponse>(
    'ai-plan-preview',
    {
      body: JSON.stringify({ taskId, random }),
      headers,
    },
  );
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('No preview data');
  }
  return data.previewPlan;
};

/**
 * Persist an AI-generated plan to the database.
 * @param taskId The ID of the task.
 * @param plan The plan items array (typically one returned from getPlanPreview).
 * @param regenerate Whether existing items for the task should be wiped first.
 */
export const acceptPlan = async (
  taskId: string,
  plan: PlanItemType[],
  regenerate = false,
): Promise<Record<string, string | number | string[] | null>[]> => {
  const headers: Record<string, string> = {};
  const session = await supabase.auth.getSession();
  if (session.data.session?.access_token) {
    headers.Authorization = `Bearer ${session.data.session.access_token}`;
  }
  const { data, error } = await supabase.functions.invoke<AcceptResponse>(
    'ai-plan-accept',
    {
      body: JSON.stringify({ taskId, plan, regenerate }),
      headers,
    },
  );
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('No accept response');
  }
  return data.insertedItems;
};

/**
 * Convenience wrapper for regenerating the plan
 * (simply calls preview with random=true).
 */
export const regeneratePlan = async (
  taskId: string,
): Promise<PlanItemType[]> => {
  return getPlanPreview(taskId, true);
};
