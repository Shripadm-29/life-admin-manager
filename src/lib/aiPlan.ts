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
  insertedItems: any[];  // Row objects from task_plan_items.
}

const isInvalidJwtHttpError = async (error: unknown): Promise<boolean> => {
  const err = error as { name?: string; context?: unknown };
  if (err?.name !== 'FunctionsHttpError') {
    return false;
  }

  const response = err.context as Response | undefined;
  if (!response || response.status !== 401) {
    return false;
  }

  try {
    const body = (await response.clone().text()).toLowerCase();
    return body.includes('invalid jwt');
  } catch {
    return false;
  }
};

const invokeWithAuthRefresh = async <T>(
  functionName: string,
  body: unknown,
): Promise<T> => {
  let result = await supabase.functions.invoke<T>(functionName, { body });

  if (result.error && await isInvalidJwtHttpError(result.error)) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) {
      result = await supabase.functions.invoke<T>(functionName, { body });
    }
  }

  if (result.error && await isInvalidJwtHttpError(result.error)) {
    await supabase.auth.signOut();
    throw new Error('Your session token is invalid. Please sign in again.');
  }

  if (result.error) {
    throw new Error(await formatFunctionError(result.error));
  }

  if (!result.data) {
    throw new Error(`No response data from ${functionName}`);
  }

  return result.data;
};

const formatFunctionError = async (error: unknown): Promise<string> => {
  if (!error) {
    return 'Unknown Edge Function error';
  }
  if (typeof error === 'string') {
    return error;
  }

  const err = error as {
    name?: string;
    message?: string;
    context?: unknown;
  };

  if (err.name === 'FunctionsHttpError') {
    const response = err.context as Response | undefined;
    if (response) {
      let responseBody = '';
      try {
        responseBody = (await response.clone().text()).trim();
      } catch {
        // Ignore response body parsing failures.
      }
      const detail = responseBody ? `: ${responseBody}` : '';
      return `Edge Function failed with HTTP ${response.status}${detail}`;
    }
  }

  if (err.name === 'FunctionsFetchError') {
    return (
      'Unable to reach the Supabase Edge Function. ' +
      'Verify the function is deployed and CORS allows: authorization, apikey, x-client-info, content-type.'
    );
  }

  if (err.message) {
    return err.message;
  }

  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown Edge Function error';
  }
};

/**
 * Request an AI-generated preview plan for a task.
 * @param taskId The ID of the task to plan for.
 * @param random If true, ask the LLM to vary the wording (used for regenerating).
 */
export const getPlanPreview = async (
  taskId: string,
  random = false,
): Promise<PlanItemType[]> => {
  const data = await invokeWithAuthRefresh<PreviewResponse>(
    'ai-plan-preview',
    { taskId, random },
  );

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
): Promise<any[]> => {
  const data = await invokeWithAuthRefresh<AcceptResponse>(
    'ai-plan-accept',
    { taskId, plan, regenerate },
  );

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
