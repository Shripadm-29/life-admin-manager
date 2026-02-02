export interface Task {
  id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  notes: string;
  completed: boolean;
}

export interface Document {
  id: string;
  filename: string;
  uploadDate: string;
  linkedTaskId?: string;
}

export interface Reminder {
  id: string;
  taskId: string;
  taskName: string;
  reminderDate: string;
  status: 'scheduled' | 'sent';
}
