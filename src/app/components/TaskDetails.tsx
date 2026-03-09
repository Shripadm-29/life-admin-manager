import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { getPlanPreview, regeneratePlan } from '@/lib/aiPlan';
import {
  TaskPlanRecord,
  SubtaskRecord,
  getLatestTaskPlan,
  listSubtasks,
  saveDraftPlan,
  acceptDraftPlan,
  skipDraftPlan,
  addSubtask,
  toggleSubtask,
  planItemsToSteps,
} from '@/lib/taskPlanning';
import { format } from 'date-fns';
import { StatusMessage } from '@/app/components/ui/status-message';

export function TaskDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const taskId = id!;

  const [task, setTask] = useState<any>(null);
  const [taskPlan, setTaskPlan] = useState<TaskPlanRecord | null>(null);
  const [subtasks, setSubtasks] = useState<SubtaskRecord[]>([]);
  const [legacyPlanItems, setLegacyPlanItems] = useState<any[]>([]);
  const [linkedDocuments, setLinkedDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [savingSubtask, setSavingSubtask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadTaskPage();
  }, [user, taskId]);

  const loadTaskPage = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchTask(), fetchPlanningState(), fetchLinkedDocuments()]);
    setLoading(false);
  };

  const fetchTask = async () => {
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
  };

  const fetchLegacyPlanItems = async () => {
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
      if (data) setLegacyPlanItems(data);
    } catch (e) {
      console.error('fetchLegacyPlanItems exception', e);
    }
  };

  const fetchPlanningState = async () => {
    try {
      const [latestPlan, currentSubtasks] = await Promise.all([
        getLatestTaskPlan(taskId, user!.id),
        listSubtasks(taskId, user!.id),
      ]);
      setTaskPlan(latestPlan);
      setSubtasks(currentSubtasks);
      setLegacyPlanItems([]);
    } catch (e) {
      // Fall back to legacy plan item model so existing users are not blocked.
      console.warn('New planning tables unavailable, using legacy model.', e);
      setTaskPlan(null);
      setSubtasks([]);
      await fetchLegacyPlanItems();
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

  const handleGenerateDraft = async (random = false) => {
    setPlanningLoading(true);
    setError(null);
    try {
      const previewPlan = random
        ? await regeneratePlan(taskId)
        : await getPlanPreview(taskId);

      const steps = planItemsToSteps(previewPlan);
      const savedDraft = await saveDraftPlan(taskId, user!.id, steps);
      setTaskPlan(savedDraft);
    } catch (e: any) {
      console.error('generate error', e);
      const msg = e?.message || String(e);
      setError(`Could not generate draft plan: ${msg}`);
    } finally {
      setPlanningLoading(false);
    }
  };

  const handleAcceptDraft = async () => {
    if (!taskPlan || taskPlan.status !== 'draft') return;

    const hasExistingSubtasks = subtasks.length > 0 || legacyPlanItems.length > 0;
    const replaceExisting = hasExistingSubtasks
      ? window.confirm('Replace existing subtasks with this new plan? Click Cancel to keep existing subtasks and append the draft steps.')
      : false;

    setPlanningLoading(true);
    setError(null);
    try {
      await acceptDraftPlan(taskId, user!.id, taskPlan.id, replaceExisting);
      await fetchPlanningState();
    } catch (e: any) {
      console.error(e);
      setError(`Failed to accept plan: ${e?.message || 'unknown error'}`);
    } finally {
      setPlanningLoading(false);
    }
  };

  const handleSkipDraft = async () => {
    if (!taskPlan || taskPlan.status !== 'draft') return;
    setPlanningLoading(true);
    setError(null);
    try {
      await skipDraftPlan(taskPlan.id, user!.id);
      await fetchPlanningState();
    } catch (e: any) {
      setError(`Failed to skip draft plan: ${e?.message || 'unknown error'}`);
    } finally {
      setPlanningLoading(false);
    }
  };

  const handleEditPlanFromAccepted = async () => {
    const sourceSteps = subtasks.length
      ? subtasks.map((s) => s.title)
      : legacyPlanItems.map((p) => p.title);

    if (!sourceSteps.length) {
      setError('No accepted subtasks found to edit.');
      return;
    }

    setPlanningLoading(true);
    setError(null);
    try {
      const draft = await saveDraftPlan(taskId, user!.id, sourceSteps);
      setTaskPlan(draft);
    } catch (e: any) {
      setError(`Failed to open draft for editing: ${e?.message || 'unknown error'}`);
    } finally {
      setPlanningLoading(false);
    }
  };

  const markLegacyItemDone = async (item: any) => {
    const { error } = await supabase
      .from('task_plan_items')
      .update({ status: item.status === 'todo' ? 'done' : 'todo' })
      .eq('id', item.id);

    if (!error) {
      fetchLegacyPlanItems();
    }
  };

  const handleToggleSubtask = async (item: SubtaskRecord) => {
    try {
      await toggleSubtask(item.id, user!.id, !item.completed);
      await fetchPlanningState();
    } catch (e: any) {
      setError(`Failed to update subtask: ${e?.message || 'unknown error'}`);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) {
      setError('Subtask title cannot be empty.');
      return;
    }

    setSavingSubtask(true);
    setError(null);
    try {
      await addSubtask(taskId, user!.id, newSubtaskTitle);
      setNewSubtaskTitle('');
      await fetchPlanningState();
    } catch (e: any) {
      setError(`Failed to add subtask: ${e?.message || 'unknown error'}`);
    } finally {
      setSavingSubtask(false);
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

  const planningState: 'none' | 'draft' | 'accepted' | 'skipped' = taskPlan?.status === 'draft'
    ? 'draft'
    : taskPlan?.status === 'accepted' || subtasks.length > 0 || legacyPlanItems.length > 0
      ? 'accepted'
      : taskPlan?.status === 'skipped'
        ? 'skipped'
        : 'none';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
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
            {planningLoading && (
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
                <div className="text-sm text-gray-500 mb-1">Description</div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                  {(task.description || task.notes)?.trim()
                    ? (task.description || task.notes)
                    : 'No description added for this task.'}
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

            {(planningState === 'none' || planningState === 'skipped') && (
              <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-semibold text-blue-900">
                      {planningState === 'skipped' ? 'AI plan skipped' : 'No AI plan yet'}
                    </div>
                    <div className="text-sm text-blue-700">
                      Generate a draft plan to break this task into actionable subtasks.
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerateDraft(false)}
                    disabled={planningLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {planningLoading ? 'Generating…' : 'Generate Plan'}
                  </button>
                </div>
              </div>
            )}

            {planningState === 'draft' && taskPlan && (
              <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div>
                    <div className="font-semibold text-amber-900">Draft Plan (v{taskPlan.version})</div>
                    <div className="text-sm text-amber-700">Preview the suggested steps before turning them into real subtasks.</div>
                  </div>
                </div>

                <ul className="mb-4 list-disc ml-5 text-sm text-gray-800 space-y-1">
                  {(taskPlan.steps || []).map((step, idx) => (
                    <li key={`${idx}-${step}`}>{step}</li>
                  ))}
                </ul>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAcceptDraft}
                    disabled={planningLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Accept Plan
                  </button>
                  <button
                    onClick={() => handleGenerateDraft(true)}
                    disabled={planningLoading}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={handleSkipDraft}
                    disabled={planningLoading}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Skip for Now
                  </button>
                </div>
              </div>
            )}

            {planningState === 'accepted' && (
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <button
                  onClick={handleEditPlanFromAccepted}
                  disabled={planningLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Edit Plan
                </button>
                <button
                  onClick={() => handleGenerateDraft(true)}
                  disabled={planningLoading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Regenerate Plan
                </button>
              </div>
            )}

            {subtasks.length > 0 ? (
              <div className="space-y-4">
                {subtasks.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-md border ${
                      item.completed ? 'bg-green-50 opacity-60' : 'bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{item.title}</div>
                      </div>
                      <button
                        onClick={() => handleToggleSubtask(item)}
                        className="text-blue-600 text-sm underline"
                      >
                        {item.completed ? 'Undo' : 'Mark done'}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a new subtask"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={handleAddSubtask}
                    disabled={savingSubtask}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {savingSubtask ? 'Adding…' : 'Add Subtask'}
                  </button>
                </div>
              </div>
            ) : legacyPlanItems.length > 0 ? (
              <div className="space-y-4">
                {legacyPlanItems.map((item) => (
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
                        onClick={() => markLegacyItemDone(item)}
                        className="text-blue-600 text-sm underline"
                      >
                        {item.status === 'done' ? 'Undo' : 'Mark done'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No accepted subtasks yet.</p>
            )}
          </>
        ) : (
          <p className="text-red-600">Task not found.</p>
        )}
      </div>
    </div>
  );
}
