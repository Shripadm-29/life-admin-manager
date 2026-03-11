import { supabase } from './supabaseClient';
import {
  PlannerSubtask,
  TaskPlanResponse,
  TaskPlanningContext,
} from './plannerTypes';

export type PlanItemType = PlannerSubtask & {
  plannedFor?: string;
  durationMinutes?: number;
  checklist?: string[];
};

interface PreviewResponse {
  plan: TaskPlanResponse['plan'];
}

const MAX_DOCUMENTS = 4;
const MAX_DOCUMENT_TEXT = 3000;
const MAX_BUSY_EVENTS = 50;
const MAX_FREE_BLOCKS = 50;

const toBoundedPlanningContext = (
  context: TaskPlanningContext,
): TaskPlanningContext => {
  return {
    ...context,
    documents: (context.documents || [])
      .slice(0, MAX_DOCUMENTS)
      .map((document) => ({
        ...document,
        extracted_text: (document.extracted_text || '').slice(0, MAX_DOCUMENT_TEXT),
      })),
    calendar: {
      ...context.calendar,
      busy_events: (context.calendar?.busy_events || []).slice(0, MAX_BUSY_EVENTS),
      free_blocks: (context.calendar?.free_blocks || []).slice(0, MAX_FREE_BLOCKS),
    },
  };
};

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

const isAnyHttp401Error = (error: unknown): boolean => {
  const err = error as { context?: unknown };
  const response = err?.context as Response | undefined;
  return Boolean(response && response.status === 401);
};

const invokeFunctionWithSession = async <T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: unknown }> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  return supabase.functions.invoke<T>(functionName, {
    body,
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
  });
};

const invokeWithAuthRefresh = async <T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> => {
  let result = await invokeFunctionWithSession<T>(functionName, body);

  if (result.error && (isAnyHttp401Error(result.error) || await isInvalidJwtHttpError(result.error))) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) {
      result = await invokeFunctionWithSession<T>(functionName, body);
    }
  }

  if (result.error && (isAnyHttp401Error(result.error) || await isInvalidJwtHttpError(result.error))) {
    await supabase.auth.signOut();
    throw new Error('Your session is not authorized for Edge Functions. Please sign in again and retry.');
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

  const responseFromContext = (() => {
    const maybeResponse = err.context as Response | undefined;
    if (maybeResponse && typeof maybeResponse.status === 'number') {
      return maybeResponse;
    }
    return undefined;
  })();

  if (responseFromContext) {
    let responseBody = '';
    try {
      responseBody = (await responseFromContext.clone().text()).trim();
    } catch {
      responseBody = '';
    }
    const detail = responseBody ? `: ${responseBody}` : '';
    return `Edge Function failed with HTTP ${responseFromContext.status}${detail}`;
  }

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

export const generatePlan = async (
  context: TaskPlanningContext,
  random = false,
): Promise<TaskPlanResponse> => {
  const boundedContext = toBoundedPlanningContext(context);

  const data = await invokeWithAuthRefresh<PreviewResponse>(
    'ai-plan-preview',
    { planningContext: boundedContext, random },
  );

  return { plan: data.plan };
};

export const regeneratePlan = async (
  context: TaskPlanningContext,
): Promise<TaskPlanResponse> => {
  return generatePlan(context, true);
};
