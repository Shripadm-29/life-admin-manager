import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { AIPlanModal } from '@/app/components/AIPlanModal';
import { getPlanPreview, acceptPlan, regeneratePlan, PlanItemType } from '@/lib/aiPlan';
import { format } from 'date-fns';
import { StatusMessage } from '@/app/components/ui/status-message';

export function TaskDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const taskId = id!;

  const [task, setTask] = useState<any>(null);
  const [planItems, setPlanItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState<PlanItemType[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchTask();
    fetchPlanItems();
  }, [user, taskId]);

  const fetchTask = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user!.id)
      .single();
    if (error) {
      setError('Failed to load task.');
    } else {
      setTask(data);
    }
    setLoading(false);
  };

  const fetchPlanItems = async () => {
    try {
      const { data, error, status } = await supabase
        .from('task_plan_items')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', user!.id)
        .order('order_index', { ascending: true });

      if (error) {
        // RLS or missing table can surface as 404/status 404
        console.warn('fetchPlanItems error', { error, status });
        // optionally show generic message
        if (status !== 404) {
          setError('Could not load existing plan items');
        }
        return;
      }
      if (data) setPlanItems(data);
    } catch (e) {
      console.error('fetchPlanItems exception', e);
      setError('Failed to fetch plan items');
    }
  };

  const handleGenerate = async (random = false) => {
    console.log('handleGenerate', { taskId, random });
    setModalLoading(true);
    try {
      const plan = random
        ? await regeneratePlan(taskId)
        : await getPlanPreview(taskId);
      console.log('plan received', plan);
      setModalPlan(plan);
      setModalOpen(true);
    } catch (e: any) {
      console.error('generate error', e);
      const msg = e?.message || String(e);
      setError(`Could not generate plan: ${msg}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleAcceptPlan = async (plan: PlanItemType[]) => {
    try {
      await acceptPlan(taskId, plan, true); // wipe previous if any
      setModalOpen(false);
      fetchPlanItems();
    } catch (e) {
      console.error(e);
      setError('Failed to save plan.');
    }
  };

  const markItemDone = async (item: any) => {
    const { data, error } = await supabase
      .from('task_plan_items')
      .update({ status: item.status === 'todo' ? 'done' : 'todo' })
      .eq('id', item.id);
    if (!error) {
      fetchPlanItems();
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      return format(new Date(iso), 'PP p');
    } catch {
      return iso;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/tasks')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          ← Back to Tasks
        </button>

        {error && (
          <div className="mb-4">
            <StatusMessage variant="error" message={error} />
          </div>
        )}

        {loading ? (
          <p>Loading task…</p>
        ) : task ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h2>
            {modalLoading && (
              <div className="my-4">
                <StatusMessage variant="loading" message="Generating plan…" />
              </div>
            )}
            <p className="text-sm text-gray-500 mb-6">
              Due {formatDateTime(task.due_date)}
            </p>

            <div className="flex gap-3 mb-8">
              <button
                onClick={() => handleGenerate(false)}
                disabled={modalLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {modalLoading ? 'Generating…' : 'Generate Plan'}
              </button>
              <button
                onClick={() => handleGenerate(true)}
                disabled={modalLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                {modalLoading ? 'Generating…' : 'Regenerate Plan'}
              </button>
            </div>

            {planItems.length > 0 ? (
              <div className="space-y-4">
                {planItems.map(item => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-md border ${
                      item.status === 'done' ? 'bg-green-50 opacity-60' : 'bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{item.title}</div>
                        <div className="text-sm text-gray-500">
                          {formatDateTime(item.planned_for)} • {item.duration_minutes} min
                        </div>
                      </div>
                      <button
                        onClick={() => markItemDone(item)}
                        className="text-blue-600 text-sm underline"
                      >
                        {item.status === 'done' ? 'Undo' : 'Mark done'}
                      </button>
                    </div>
                    {item.checklist && item.checklist.length > 0 && (
                      <ul className="mt-2 ml-4 list-disc text-sm text-gray-700">
                        {item.checklist.map((step: string, i: number) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No plan items yet.</p>
            )}
          </>
        ) : (
          <p className="text-red-600">Task not found.</p>
        )}
      </div>

      <AIPlanModal
        open={modalOpen}
        taskTitle={task?.title || ''}
        taskDue={task?.due_date}
        previewPlan={modalPlan}
        onAccept={handleAcceptPlan}
        onRegenerate={async () => {
          const plan = await regeneratePlan(taskId);
          setModalPlan(plan);
        }}
        onClose={() => setModalOpen(false)}
        loading={modalLoading}
      />
    </div>
  );
}
