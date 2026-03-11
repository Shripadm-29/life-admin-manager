export interface Task {
  id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  description?: string | null;
  notes: string;
  completed: boolean;
  status?: string;
  source?: 'manual' | 'document' | string;
  createdAt?: string;
}

export interface Document {
  id: string;
  filePath: string;
  taskId?: string;
  extractedTitle?: string;
  extractedDueDate?: string;
  extractionConfidence?: number;
  extractedText?: string;
  extractedMetadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface Reminder {
  id: string;
  userId: string;
  taskId: string | null;
  subtaskId?: string | null;
  title: string;
  description: string | null;
  remindAt: string;
  repeatType: ReminderRepeatType;
  repeatIntervalDays: number | null;
  isEnabled: boolean;
  source: 'manual' | 'subtask';
  status?: string | null;
  lastTriggeredAt: string | null;
  emailSent: boolean;
  createdAt: string;
  updatedAt: string;
  taskTitle?: string | null;
  subtaskTitle?: string | null;
}

export type ReminderRepeatType =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'custom';

export interface NotificationItem {
  id: string;
  userId: string;
  reminderId: string | null;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface ReminderFormValues {
  title: string;
  description: string;
  remindAt: string;
  repeatType: ReminderRepeatType;
  repeatIntervalDays: number | null;
  taskId: string | null;
  isEnabled: boolean;
}
