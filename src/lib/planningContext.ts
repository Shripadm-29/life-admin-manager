import { supabase } from './supabaseClient';
import { ensureTaskDocumentsExtracted } from './documentExtraction';
import { getCalendarPlanningContext } from './googleCalendar';
import { TaskPlanningContext } from './plannerTypes';

export const buildTaskPlanningContext = async (
  taskId: string,
  userId: string,
): Promise<TaskPlanningContext> => {
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single();

  if (error || !task) {
    throw error || new Error('Task not found.');
  }

  let documents;
  try {
    documents = await ensureTaskDocumentsExtracted(taskId);
  } catch (error: any) {
    throw new Error(`Failed to extract document context: ${error?.message || 'unknown error'}`);
  }

  let calendar;
  try {
    calendar = await getCalendarPlanningContext(task.due_at || task.due_date || null);
  } catch (error: any) {
    throw new Error(`Failed to fetch calendar context: ${error?.message || 'unknown error'}`);
  }

  return {
    task: {
      id: task.id,
      title: task.title,
      description: task.description || task.notes || null,
      due_date: task.due_at || task.due_date || null,
      created_at: task.created_at || null,
      planning_requested_at: new Date().toISOString(),
      priority: task.priority || null,
      source: task.source || 'manual',
    },
    documents,
    calendar,
  };
};