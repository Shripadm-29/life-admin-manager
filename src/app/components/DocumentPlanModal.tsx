import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';

interface DocumentPlanModalProps {
  open: boolean;
  loading?: boolean;
  taskTitle: string;
  taskDue?: string;
  steps: string[];
  onCreateTaskAndPlan: () => Promise<void>;
  onCreateTaskOnly: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onCancel: () => Promise<void>;
}

export function DocumentPlanModal({
  open,
  loading = false,
  taskTitle,
  taskDue,
  steps,
  onCreateTaskAndPlan,
  onCreateTaskOnly,
  onRegenerate,
  onCancel,
}: DocumentPlanModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => { if (!loading) void onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extracted Task + AI Plan Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <div><span className="text-gray-500">Title:</span> <span className="text-gray-900">{taskTitle || 'Untitled task'}</span></div>
            <div><span className="text-gray-500">Due:</span> <span className="text-gray-900">{taskDue || 'Not set'}</span></div>
          </div>

          <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
            <div className="font-medium text-blue-900 mb-2">Suggested AI plan</div>
            {steps.length === 0 ? (
              <p className="text-blue-700">No steps generated yet.</p>
            ) : (
              <ul className="list-disc ml-5 space-y-1 text-blue-900">
                {steps.map((step, idx) => (
                  <li key={`${idx}-${step}`}>{step}</li>
                ))}
              </ul>
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
            disabled={loading || steps.length === 0}
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
