export interface Task {
  id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  // Frontend code typically works with dueDate when displaying.
  dueDate: string;
  notes: string;
  completed: boolean;
  status?: string;
}

export interface Document {
  id: string;
  filePath: string;
  taskId?: string;
  extractedTitle?: string;
  extractedDueDate?: string;
  extractionConfidence?: number;
  createdAt?: string;
}

export interface Reminder {
  id: string;
  taskId: string;
  taskName: string;
  reminderDate: string;
  status: 'scheduled' | 'sent';
}
