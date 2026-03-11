import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { PlannerSubtask } from '@/lib/plannerTypes';

interface DocumentPlanModalProps {
  open: boolean;
  loading?: boolean;
  taskTitle: string;
  taskDue?: string;
  extractedSummary?: string;
  highlights?: string[];
  plan: PlannerSubtask[];
  onCreateTaskAndPlan: () => Promise<void>;
  onCreateTaskOnly: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onCancel: () => Promise<void>;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not scheduled';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

export function DocumentPlanModal({
  open,
  loading = false,
  taskTitle,
  taskDue,
  extractedSummary,
  highlights = [],
  plan,
  onCreateTaskAndPlan,
  onCreateTaskOnly,
  onRegenerate,
  onCancel,
}: DocumentPlanModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => { if (!loading) void onCancel(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Extracted Task + AI Plan Preview</DialogTitle>
          <DialogDescription>
            Review the extracted task info, specific subtasks, and reminder previews before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm overflow-y-auto pr-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
            <div><span className="text-gray-500">Title:</span> <span className="text-gray-900">{taskTitle || 'Untitled task'}</span></div>
            <div><span className="text-gray-500">Due:</span> <span className="text-gray-900">{taskDue || 'Not set'}</span></div>
            {extractedSummary ? <div className="text-gray-700">{extractedSummary}</div> : null}
            {highlights.length ? (
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                {highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-3">
            {plan.length === 0 ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-blue-700">No plan items generated yet.</p>
              </div>
            ) : (
              plan.map((item, idx) => (
                <div key={`${idx}-${item.title}`} className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="font-semibold text-blue-950">{item.title}</div>
                    <div className="text-sm text-blue-800">{item.duration_minutes || 0} min</div>
                  </div>
                  {item.description ? <div className="text-sm text-blue-900">{item.description}</div> : null}
                  <div className="text-sm text-blue-800">
                    Suggested time: {formatDateTime(item.scheduled_start)} to {formatDateTime(item.scheduled_end)}
                  </div>
                  {item.reminders.length ? (
                    <div className="rounded-lg border border-blue-100 bg-white/80 p-3 space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reminder Preview</div>
                      {item.reminders.map((reminder) => (
                        <div key={`${reminder.send_at}-${reminder.message}`} className="text-sm text-gray-700">
                          {formatDateTime(reminder.send_at)}: {reminder.message}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => void onRegenerate()}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Regenerate Plan
          </button>
          <button
            onClick={() => void onCreateTaskOnly()}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Create Task Only
          </button>
          <button
            onClick={() => void onCreateTaskAndPlan()}
            disabled={loading || plan.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Task + Plan
          </button>
          <button
            onClick={() => void onCancel()}
            disabled={loading}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
