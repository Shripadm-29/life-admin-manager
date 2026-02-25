export interface Task {
  id: string;
  title: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  // frontend code typically works with dueDate when displaying
  dueDate: string;
  notes: string;
  completed: boolean;
  status?: string;
}

export interface Document {
  id: string;
  file_path: string;
  task_id?: string;
  extracted_title?: string;
  extracted_due_date?: string;
  extraction_confidence?: number;
  created_at?: string;
}

export interface Reminder {
  id: string;
  taskId: string;
  taskName: string;
  reminderDate: string;
  status: 'scheduled' | 'sent';
}
