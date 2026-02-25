import { Task, Document, Reminder } from '@/app/types';

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Submit Financial Aid Application',
    category: 'Academic',
    priority: 'high',
    dueDate: '2026-02-05',
    notes: 'Need to gather tax documents and transcripts',
    completed: false,
  },
  {
    id: '2',
    title: 'Register for Spring Classes',
    category: 'Academic',
    priority: 'high',
    dueDate: '2026-02-10',
    notes: 'Check prerequisites for CS 301',
    completed: false,
  },
  {
    id: '3',
    title: 'Pay Tuition Bill',
    category: 'Finance',
    priority: 'high',
    dueDate: '2026-01-25',
    notes: 'Due before semester starts',
    completed: false,
  },
  {
    id: '4',
    title: 'Update Resume',
    category: 'Career',
    priority: 'medium',
    dueDate: '2026-02-15',
    notes: 'Add recent internship experience',
    completed: false,
  },
  {
    id: '5',
    title: 'Schedule Health Checkup',
    category: 'Health',
    priority: 'low',
    dueDate: '2026-02-20',
    notes: 'Annual physical at student health center',
    completed: false,
  },
  {
    id: '6',
    title: 'Order Textbooks',
    category: 'Academic',
    priority: 'medium',
    dueDate: '2026-01-28',
    notes: 'Check used book options',
    completed: true,
  },
];

export const mockDocuments: Document[] = [
  {
    id: '1',
    filePath: 'Transcript_Fall_2025.pdf',
    taskId: '1',
  },
  {
    id: '2',
    filePath: 'Tax_Form_1098T.pdf',
    taskId: '1',
  },
  {
    id: '3',
    filePath: 'Resume_Jan_2026.pdf',
    taskId: '4',
  },
  {
    id: '4',
    filePath: 'Health_Insurance_Card.pdf',
  },
];

export const mockReminders: Reminder[] = [
  {
    id: '1',
    taskId: '3',
    taskName: 'Pay Tuition Bill',
    reminderDate: '2026-01-24',
    status: 'scheduled',
  },
  {
    id: '2',
    taskId: '1',
    taskName: 'Submit Financial Aid Application',
    reminderDate: '2026-02-03',
    status: 'scheduled',
  },
  {
    id: '3',
    taskId: '2',
    taskName: 'Register for Spring Classes',
    reminderDate: '2026-02-08',
    status: 'scheduled',
  },
  {
    id: '4',
    taskId: '6',
    taskName: 'Order Textbooks',
    reminderDate: '2026-01-27',
    status: 'sent',
  },
];
