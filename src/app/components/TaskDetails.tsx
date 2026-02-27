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
  const [linkedDocuments, setLinkedDocuments] = useState<any[]>([]);
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
    fetchLinkedDocuments();
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

  const fetchLinkedDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id,file_path,created_at')
        .eq('task_id', taskId)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setLinkedDocuments(data || []);
      }
    } catch (e) {
      console.error('fetchLinkedDocuments exception', e);
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

  const parseAppDate = (value?: string | null) => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0, 0);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const formatDateTime = (value?: string | null) => {
    try {
      const parsed = parseAppDate(value);
      if (!parsed) return 'Unknown';
      return format(parsed, 'PP p');
    } catch {
      return value || 'Unknown';
    }
  };

  const formatUpdatedLabel = (value?: string | null) => {
    const parsed = parseAppDate(value);
    if (!parsed) return 'Unknown';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const updatedDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const diffDays = Math.round((today.getTime() - updatedDay.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return `Today ${format(parsed, 'p')}`;
    if (diffDays === 1) return `Yesterday ${format(parsed, 'p')}`;
    return format(parsed, 'PP p');
  };

  const getDisplayFileName = (filePath: string) => {
    if (!filePath) return 'document';
    const baseName = filePath.split('/').pop() || filePath;
    const timestampPattern = /^\d{10,}-(?:\d+-)?(.+)$/;
    const matched = baseName.match(timestampPattern);
    return matched?.[1] || baseName;
  };

  const openLinkedDocument = async (doc: any) => {
    try {
      const filePath = doc.file_path;
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        window.open(filePath, '_blank', 'noopener,noreferrer');
        return;
      }
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60 * 60);
      if (error || !data?.signedUrl) throw error || new Error('Could not open document.');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error(e);
      setError('Failed to open linked document.');
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

            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Due:</span>{' '}
                  <span className="text-gray-900">{task.due_at || task.due_date ? formatDateTime(task.due_at || task.due_date) : 'Not set'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Category:</span>{' '}
                  <span className="text-gray-900">{task.category || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Priority:</span>{' '}
                  <span className="text-gray-900">{task.priority || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{' '}
                  <span className="text-gray-900">{task.status || 'todo'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>{' '}
                  <span className="text-gray-900">{task.created_at ? formatDateTime(task.created_at) : 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>{' '}
                  <span className="text-gray-900">{formatUpdatedLabel(task.updated_at || task.created_at)}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-1">Notes</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                  {task.notes?.trim() ? task.notes : 'No notes added for this task.'}
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => navigate(`/tasks/${taskId}/edit`)}
                  className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Edit Task Details
                </button>
              </div>

              {linkedDocuments.length > 0 && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-500 mb-2">Linked Documents</div>
                  <div className="space-y-2">
                    {linkedDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                        <div className="text-sm text-gray-800">{getDisplayFileName(doc.file_path)}</div>
                        <button
                          onClick={() => openLinkedDocument(doc)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
        taskDue={task?.due_at || task?.due_date}
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
