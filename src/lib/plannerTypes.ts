export type PlanStatus = 'draft' | 'accepted' | 'skipped';

export type ReminderStatus = 'scheduled' | 'sent' | 'cancelled';

export interface PlannerReminder {
  id?: string;
  send_at: string | null;
  message: string;
  status?: ReminderStatus;
  created_at?: string;
}

export interface PlannerSubtask {
  id?: string;
  task_id?: string;
  title: string;
  description?: string | null;
  completed?: boolean;
  duration_minutes?: number | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  deadline?: string | null;
  sort_order?: number;
  reminders: PlannerReminder[];
  created_at?: string;
  updated_at?: string;
}

export interface DocumentExtractionSummary {
  summary?: string;
  instructions?: string[];
  deadlines?: string[];
  deliverables?: string[];
  constraints?: string[];
}

export interface DocumentPlanningContext {
  id: string;
  file_name: string;
  extracted_text: string;
  extracted_title?: string | null;
  extracted_due_date?: string | null;
  extraction_confidence?: number | null;
  metadata?: DocumentExtractionSummary;
}

export interface CalendarBusyEvent {
  title: string;
  start: string;
  end: string;
}

export interface CalendarFreeBlock {
  start: string;
  end: string;
  duration_minutes: number;
}

export interface CalendarPlanningContext {
  connected: boolean;
  timezone: string;
  busy_events: CalendarBusyEvent[];
  free_blocks: CalendarFreeBlock[];
}

export interface TaskPlanningContext {
  task: {
    id: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
    created_at?: string | null;
    planning_requested_at?: string | null;
    priority?: string | null;
    source?: 'manual' | 'document' | string | null;
  };
  documents: DocumentPlanningContext[];
  calendar: CalendarPlanningContext;
}

export interface TaskPlanResponse {
  plan: PlannerSubtask[];
}

export interface TaskPlanRecord {
  id: string;
  task_id: string;
  user_id: string;
  status: PlanStatus;
  version: number;
  raw_ai_response: TaskPlanResponse;
  created_at: string;
}