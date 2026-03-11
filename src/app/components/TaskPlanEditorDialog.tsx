import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { PlannerSubtask, TaskPlanResponse } from '@/lib/plannerTypes';

interface TaskPlanEditorDialogProps {
  open: boolean;
  title: string;
  description?: string;
  initialPlan: TaskPlanResponse;
  saveLabel?: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (plan: TaskPlanResponse) => Promise<void>;
}

const createEmptySubtask = (): PlannerSubtask => ({
  title: '',
  description: '',
  duration_minutes: 30,
  scheduled_start: null,
  scheduled_end: null,
  deadline: null,
  reminders: [],
});

const isoToLocalInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const localInputToIso = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export function TaskPlanEditorDialog({
  open,
  title,
  description,
  initialPlan,
  saveLabel = 'Save Changes',
  saving = false,
  onClose,
  onSave,
}: TaskPlanEditorDialogProps) {
  const [items, setItems] = useState<PlannerSubtask[]>(initialPlan.plan.length ? initialPlan.plan : [createEmptySubtask()]);

  useEffect(() => {
    setItems(initialPlan.plan.length ? initialPlan.plan : [createEmptySubtask()]);
  }, [initialPlan, open]);

  const updateItem = (index: number, patch: Partial<PlannerSubtask>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const updateReminder = (itemIndex: number, reminderIndex: number, patch: { send_at?: string | null; message?: string }) => {
    setItems((current) => current.map((item, currentIndex) => {
      if (currentIndex !== itemIndex) return item;
      return {
        ...item,
        reminders: item.reminders.map((reminder, currentReminderIndex) => currentReminderIndex === reminderIndex
          ? {
            ...reminder,
            send_at: patch.send_at ?? reminder.send_at,
            message: patch.message ?? reminder.message,
          }
          : reminder),
      };
    }));
  };

  const addReminder = (itemIndex: number) => {
    setItems((current) => current.map((item, currentIndex) => currentIndex === itemIndex
      ? {
        ...item,
        reminders: [...item.reminders, { send_at: item.scheduled_start || null, message: '' }],
      }
      : item));
  };

  const removeReminder = (itemIndex: number, reminderIndex: number) => {
    setItems((current) => current.map((item, currentIndex) => currentIndex === itemIndex
      ? {
        ...item,
        reminders: item.reminders.filter((_, currentReminderIndex) => currentReminderIndex !== reminderIndex),
      }
      : item));
  };

  const addSubtask = () => {
    setItems((current) => [...current, createEmptySubtask()]);
  };

  const removeSubtask = (index: number) => {
    setItems((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSave = async () => {
    await onSave({
      plan: items.map((item, index) => ({
        ...item,
        sort_order: index,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !saving) onClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-2">
          {items.map((item, index) => (
            <div key={`${index}-${item.id || 'draft'}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-800">Subtask {index + 1}</div>
                {items.length > 1 ? (
                  <Button variant="outline" size="sm" onClick={() => removeSubtask(index)}>
                    Remove
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <Input value={item.title} onChange={(event) => updateItem(index, { title: event.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <Textarea value={item.description || ''} onChange={(event) => updateItem(index, { description: event.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                  <Input type="number" min={5} step={5} value={item.duration_minutes ?? 30} onChange={(event) => updateItem(index, { duration_minutes: Number(event.target.value) || 30 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                  <Input type="datetime-local" value={isoToLocalInput(item.deadline)} onChange={(event) => updateItem(index, { deadline: localInputToIso(event.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Suggested Start</label>
                  <Input type="datetime-local" value={isoToLocalInput(item.scheduled_start)} onChange={(event) => updateItem(index, { scheduled_start: localInputToIso(event.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Suggested End</label>
                  <Input type="datetime-local" value={isoToLocalInput(item.scheduled_end)} onChange={(event) => updateItem(index, { scheduled_end: localInputToIso(event.target.value) })} />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-800">Reminders</div>
                  <Button variant="outline" size="sm" onClick={() => addReminder(index)}>Add Reminder</Button>
                </div>

                {item.reminders.length === 0 ? (
                  <div className="text-sm text-slate-500">No reminders for this subtask yet.</div>
                ) : item.reminders.map((reminder, reminderIndex) => (
                  <div key={`${index}-${reminderIndex}`} className="grid gap-3 md:grid-cols-[180px_1fr_auto] items-start">
                    <Input type="datetime-local" value={isoToLocalInput(reminder.send_at)} onChange={(event) => updateReminder(index, reminderIndex, { send_at: localInputToIso(event.target.value) })} />
                    <Textarea value={reminder.message} onChange={(event) => updateReminder(index, reminderIndex, { message: event.target.value })} />
                    <Button variant="outline" size="sm" onClick={() => removeReminder(index, reminderIndex)}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={addSubtask}>Add Subtask</Button>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving || items.some((item) => !item.title.trim())}>
              {saving ? 'Savingâ€¦' : saveLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}