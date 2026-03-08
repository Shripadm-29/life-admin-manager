import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { format } from 'date-fns';
import { PlanItemType } from '@/lib/aiPlan';

interface AIPlanModalProps {
  open: boolean;
  taskTitle: string;
  taskDue?: string;
  previewPlan: PlanItemType[];
  onAccept: (plan: PlanItemType[]) => Promise<void>;
  onRegenerate: () => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

export function AIPlanModal({
  open,
  taskTitle,
  taskDue,
  previewPlan,
  onAccept,
  onRegenerate,
  onClose,
  loading = false,
}: AIPlanModalProps) {
  const [accepting, setAccepting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await onAccept(previewPlan);
    } finally {
      setAccepting(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return iso;
      return format(date, 'PP p');
    } catch {
      return iso;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI suggested plan for &quot;{taskTitle}&quot;</DialogTitle>
          {taskDue && (
            <DialogDescription>Due {formatDateTime(taskDue)}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto mt-2">
          {previewPlan.length === 0 ? (
            <p className="text-center text-gray-500">No plan items generated.</p>
          ) : (
            previewPlan.map((item, idx) => (
              <div key={idx} className="border rounded-md p-3">
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span>{formatDateTime((item as any).plannedFor ?? (item as any).planned_for ?? '')}</span>
                  <span>{(item as any).durationMinutes ?? (item as any).duration_minutes ?? 0} min</span>
                </div>
                <div className="font-semibold">{item.title}</div>
                {item.checklist && item.checklist.length > 0 && (
                  <ul className="mt-1 ml-4 list-disc text-sm text-gray-700">
                    {item.checklist.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleRegenerate}
            disabled={regenerating || accepting || loading}
          >
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={accepting || regenerating || loading}
          >
            Skip
          </Button>
          <Button
            onClick={handleAccept}
            disabled={accepting || regenerating || loading}
          >
            {accepting ? 'Saving…' : 'Accept Plan'}
          </Button>
        </DialogFooter>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
