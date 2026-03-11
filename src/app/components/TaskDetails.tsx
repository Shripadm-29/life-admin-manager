import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { format } from 'date-fns';
import { useRef } from 'react';
import { Navigation } from '@/app/components/Navigation';
import { TaskPlanEditorDialog } from '@/app/components/TaskPlanEditorDialog';
import { StatusMessage } from '@/app/components/ui/status-message';
import { useAuth } from '@/app/context/AuthContext';
import { generatePlan, regeneratePlan } from '@/lib/aiPlan';
import { buildTaskPlanningContext } from '@/lib/planningContext';
import { PlannerSubtask, TaskPlanRecord, TaskPlanResponse } from '@/lib/plannerTypes';
import { supabase } from '@/lib/supabaseClient';
import {
  acceptDraftPlan,
  addSubtask,
  deleteSubtask,
  getLatestTaskPlan,
  listSubtasks,
  saveDraftPlan,
  skipDraftPlan,
  toggleSubtask,
  updateDraftPlan,
  updateSubtask,
} from '@/lib/taskPlanning';

type EditorMode = 'draft' | 'edit-subtask' | 'add-subtask' | null;

const createEmptySubtask = (): PlannerSubtask => ({
  title: '',
  description: '',
  duration_minutes: 30,
  scheduled_start: null,
  scheduled_end: null,
  deadline: null,
  reminders: [],
});

export function TaskDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const taskId = id!;
  const highlightedSubtaskId = new URLSearchParams(location.search).get('subtask');
  const subtaskRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [task, setTask] = useState<any>(null);
  const [taskPlan, setTaskPlan] = useState<TaskPlanRecord | null>(null);
  const [subtasks, setSubtasks] = useState<PlannerSubtask[]>([]);
  const [linkedDocuments, setLinkedDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorPlan, setEditorPlan] = useState<TaskPlanResponse>({ plan: [] });
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    void loadTaskPage();
  }, [user, taskId]);

  const loadTaskPage = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    await Promise.all([fetchTask(), fetchPlanningState(), fetchLinkedDocuments()]);
    setLoading(false);
  };

  const fetchTask = async () => {
    const { data, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user!.id)
      .single();

    if (taskError) {
      setError('Failed to load task.');
      return;
    }

    setTask(data);
  };

  const fetchPlanningState = async () => {
    const [latestPlan, currentSubtasks] = await Promise.all([
      getLatestTaskPlan(taskId, user!.id),
      listSubtasks(taskId, user!.id),
    ]);
    setTaskPlan(latestPlan);
    setSubtasks(currentSubtasks);
  };

  const fetchLinkedDocuments = async () => {
    const { data, error: docsError } = await supabase
      .from('documents')
      .select('id,file_path,created_at,extracted_title,extracted_due_date,extracted_metadata')
      .eq('task_id', taskId)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (!docsError) {
      setLinkedDocuments(data || []);
    }
  };

  useEffect(() => {
    if (!highlightedSubtaskId) return;
    const target = subtaskRefs.current[highlightedSubtaskId];
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedSubtaskId, subtasks]);

  const handleGenerateDraft = async (random = false) => {
    setPlanningLoading(true);
    setError(null);

    try {
      const context = await buildTaskPlanningContext(taskId, user!.id);
      const rawPlan = random ? await regeneratePlan(context) : await generatePlan(context);
      const savedDraft = await saveDraftPlan(taskId, user!.id, rawPlan);
      setTaskPlan(savedDraft);
    } catch (failure: any) {
      setError(`Could not generate draft plan: ${failure?.message || 'unknown error'}`);
    } finally {
      setPlanningLoading(false);
    }
  };

  const handleAcceptDraft = async () => {
    if (!taskPlan || taskPlan.status !== 'draft') return;

    const replaceExistingSubtasks = subtasks.length > 0
      ? window.confirm('Replace the current accepted subtasks with this draft? Cancel keeps the current subtasks and appends the new ones.')
      : false;

    setPlanningLoading(true);
    setError(null);
    try {
      await acceptDraftPlan(taskId, user!.id, taskPlan.id, { replaceExistingSubtasks });
      await fetchPlanningState();
    } catch (failure: any) {
      setError(`Failed to accept plan: ${failure?.message || 'unknown error'}`);
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
    } catch (failure: any) {
      setError(`Failed to skip draft plan: ${failure?.message || 'unknown error'}`);
    } finally {
      setPlanningLoading(false);
    }
  };

  const openDraftEditor = () => {
    if (!taskPlan?.raw_ai_response?.plan?.length) return;
    setEditorMode('draft');
    setEditorPlan(taskPlan.raw_ai_response);
    setEditingSubtaskId(null);
    setEditorOpen(true);
  };

  const handleEditAcceptedPlan = async () => {
    if (!subtasks.length) {
      setError('No accepted subtasks found to edit.');
      return;
    }

    setPlanningLoading(true);
    setError(null);
    try {
      const draft = await saveDraftPlan(taskId, user!.id, { plan: subtasks });
      setTaskPlan(draft);
      setEditorMode('draft');
      setEditorPlan(draft.raw_ai_response);
      setEditingSubtaskId(null);
      setEditorOpen(true);
    } catch (failure: any) {
      setError(`Failed to open editable draft: ${failure?.message || 'unknown error'}`);
    } finally {
      setPlanningLoading(false);
    }
  };

  const openSubtaskEditor = (subtask: PlannerSubtask) => {
    setEditorMode('edit-subtask');
    setEditorPlan({ plan: [subtask] });
    setEditingSubtaskId(subtask.id || null);
    setEditorOpen(true);
  };

  const openAddSubtaskEditor = () => {
    setEditorMode('add-subtask');
    setEditorPlan({ plan: [createEmptySubtask()] });
    setEditingSubtaskId(null);
    setEditorOpen(true);
  };

  const handleEditorSave = async (plan: TaskPlanResponse) => {
    setEditorSaving(true);
    setError(null);
    try {
      if (editorMode === 'draft' && taskPlan) {
        const updated = await updateDraftPlan(taskPlan.id, user!.id, plan);
        setTaskPlan(updated);
      } else if (editorMode === 'edit-subtask' && editingSubtaskId) {
        await updateSubtask(editingSubtaskId, user!.id, plan.plan[0]);
      } else if (editorMode === 'add-subtask') {
        await addSubtask(taskId, user!.id, plan.plan[0]);
      }

      setEditorOpen(false);
      await fetchPlanningState();
    } catch (failure: any) {
      setError(`Failed to save changes: ${failure?.message || 'unknown error'}`);
    } finally {
      setEditorSaving(false);
    }
  };

  const handleToggleSubtask = async (subtask: PlannerSubtask) => {
    try {
      await toggleSubtask(subtask.id!, user!.id, !subtask.completed);
      await fetchPlanningState();
    } catch (failure: any) {
      setError(`Failed to update subtask: ${failure?.message || 'unknown error'}`);
    }
  };

  const handleDeleteSubtask = async (subtask: PlannerSubtask) => {
    const confirmed = window.confirm(`Delete subtask "${subtask.title}"? Its scheduled reminders will be cancelled.`);
    if (!confirmed) return;

    try {
      await deleteSubtask(subtask.id!, user!.id);
      await fetchPlanningState();
    } catch (failure: any) {
      setError(`Failed to delete subtask: ${failure?.message || 'unknown error'}`);
    }
  };

  const parseAppDate = (value?: string | null) => {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0, 0);
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDateTime = (value?: string | null) => {
    const parsed = parseAppDate(value);
    return parsed ? format(parsed, 'PP p') : 'Not set';
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

      const { data, error: urlError } = await supabase.storage.from('documents').createSignedUrl(filePath, 60 * 60);
      if (urlError || !data?.signedUrl) {
        throw urlError || new Error('Could not open document.');
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Failed to open linked document.');
    }
  };

  if (!user) return null;

  const planningState: 'none' | 'draft' | 'accepted' | 'skipped' = taskPlan?.status === 'draft'
    ? 'draft'
    : subtasks.length > 0 || taskPlan?.status === 'accepted'
      ? 'accepted'
      : taskPlan?.status === 'skipped'
        ? 'skipped'
        : 'none';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate('/tasks')} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
          ← Back to Tasks
        </button>

        {error ? <div className="mb-4"><StatusMessage variant="error" message={error} /></div> : null}

        {loading ? (
          <p>Loading task…</p>
        ) : task ? (
          <>
            <div className="mb-6 rounded-2xl border border-white/60 bg-white/90 p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">{task.title}</h2>
                  <p className="text-slate-600 max-w-3xl whitespace-pre-wrap">{(task.description || task.notes || 'No description added for this task.').trim()}</p>
                </div>
                <button onClick={() => navigate(`/tasks/${taskId}/edit`)} className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                  Edit Task Details
                </button>
              </div>

              {planningLoading ? <div className="mt-4"><StatusMessage variant="loading" message="Building planning context and generating the AI plan…" /></div> : null}

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-slate-500">Due</div><div className="font-medium text-slate-900">{formatDateTime(task.due_at || task.due_date)}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-slate-500">Priority</div><div className="font-medium text-slate-900">{task.priority || 'Not set'}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-slate-500">Source</div><div className="font-medium text-slate-900">{task.source || 'manual'}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-slate-500">Updated</div><div className="font-medium text-slate-900">{formatUpdatedLabel(task.updated_at || task.created_at)}</div></div>
              </div>

              {linkedDocuments.length > 0 ? (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <div className="text-sm font-semibold text-slate-800 mb-3">Attached Documents</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {linkedDocuments.map((doc) => (
                      <div key={doc.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="font-medium text-slate-900">{getDisplayFileName(doc.file_path)}</div>
                        {(doc.extracted_title || doc.extracted_due_date) ? (
                          <div className="mt-2 text-xs text-slate-600">
                            {doc.extracted_title ? <div>Extracted task: {doc.extracted_title}</div> : null}
                            {doc.extracted_due_date ? <div>Extracted due date: {doc.extracted_due_date}</div> : null}
                          </div>
                        ) : null}
                        <button onClick={() => openLinkedDocument(doc)} className="mt-3 text-sm text-blue-600 hover:underline">View document</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {(planningState === 'none' || planningState === 'skipped') ? (
              <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="font-semibold text-blue-950">{planningState === 'skipped' ? 'Planning skipped for now' : 'No AI plan yet'}</div>
                    <div className="text-sm text-blue-800">Generate a structured plan that uses task details, extracted document text, calendar availability, and reminder timing.</div>
                  </div>
                  <button onClick={() => void handleGenerateDraft(false)} disabled={planningLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    {planningLoading ? 'Generating…' : 'Generate Plan'}
                  </button>
                </div>
              </div>
            ) : null}

            {planningState === 'draft' && taskPlan ? (
              <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                  <div>
                    <div className="font-semibold text-amber-950">Draft Plan (v{taskPlan.version})</div>
                    <div className="text-sm text-amber-800">Preview and edit the proposed subtasks, schedule, and reminders before they become real subtasks.</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleAcceptDraft} disabled={planningLoading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">Accept Plan</button>
                    <button onClick={() => void handleGenerateDraft(true)} disabled={planningLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Regenerate</button>
                    <button onClick={openDraftEditor} disabled={planningLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Edit Before Accept</button>
                    <button onClick={handleSkipDraft} disabled={planningLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Skip for Now</button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {taskPlan.raw_ai_response.plan.map((item, index) => (
                    <div key={`${index}-${item.title}`} className="rounded-xl border border-amber-200 bg-white p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="text-sm text-slate-600">{item.duration_minutes || 0} min</div>
                      </div>
                      {item.description ? <div className="text-sm text-slate-700">{item.description}</div> : null}
                      <div className="text-sm text-slate-600">Suggested time: {formatDateTime(item.scheduled_start)} to {formatDateTime(item.scheduled_end)}</div>
                      <div className="text-sm text-slate-600">Deadline: {formatDateTime(item.deadline)}</div>
                      {item.reminders.length ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reminder Preview</div>
                          {item.reminders.map((reminder) => (
                            <div key={`${reminder.send_at}-${reminder.message}`} className="text-sm text-slate-700">
                              {formatDateTime(reminder.send_at)}: {reminder.message}
                            </div>
                          ))}
                        </div>
                      ) : <div className="text-sm text-slate-500">No reminder suggested for this subtask.</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {planningState === 'accepted' ? (
              <div className="mb-5 flex flex-wrap gap-3">
                <button onClick={handleEditAcceptedPlan} disabled={planningLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Edit Plan</button>
                <button onClick={() => void handleGenerateDraft(true)} disabled={planningLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Regenerate Plan</button>
                <button onClick={openAddSubtaskEditor} disabled={planningLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Add Subtask</button>
              </div>
            ) : null}

            {subtasks.length > 0 ? (
              <div className="space-y-4">
                {subtasks.map((item) => (
                  <div
                    key={item.id}
                    ref={(node) => {
                      if (item.id) {
                        subtaskRefs.current[item.id] = node;
                      }
                    }}
                    className={`rounded-2xl border p-5 ${item.completed ? 'border-green-200 bg-green-50/80' : 'border-white/60 bg-white/90'} ${highlightedSubtaskId && item.id === highlightedSubtaskId ? 'ring-2 ring-blue-400 shadow-md' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={Boolean(item.completed)}
                        onChange={() => void handleToggleSubtask(item)}
                        className="mt-1 h-5 w-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                        aria-label={item.completed ? `Mark ${item.title} incomplete` : `Mark ${item.title} done`}
                      />

                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 flex-1">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-lg font-semibold text-slate-900 ${item.completed ? 'line-through' : ''}`}>{item.title}</h3>
                          {item.completed ? <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">Completed</span> : null}
                          </div>
                          {item.description ? <p className="text-sm text-slate-700">{item.description}</p> : null}
                          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                            <div>Duration: {item.duration_minutes || 0} min</div>
                            <div>Start: {formatDateTime(item.scheduled_start)}</div>
                            <div>End: {formatDateTime(item.scheduled_end)}</div>
                            <div>Deadline: {formatDateTime(item.deadline)}</div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reminders</div>
                            {item.reminders.length ? item.reminders.map((reminder) => (
                              <div key={reminder.id || `${reminder.send_at}-${reminder.message}`} className="text-sm text-slate-700">
                                <span className="font-medium">{formatDateTime(reminder.send_at)}</span> • {reminder.message} <span className="text-slate-500">({reminder.status || 'scheduled'})</span>
                              </div>
                            )) : <div className="text-sm text-slate-500">No scheduled reminders.</div>}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button onClick={() => openSubtaskEditor(item)} className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Edit</button>
                          <button onClick={() => void handleDeleteSubtask(item)} className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : planningState === 'accepted' ? (
              <p className="text-gray-500">No accepted subtasks yet.</p>
            ) : null}
          </>
        ) : (
          <p className="text-red-600">Task not found.</p>
        )}
      </div>

      <TaskPlanEditorDialog
        open={editorOpen}
        title={editorMode === 'draft' ? 'Edit Draft Plan' : editorMode === 'edit-subtask' ? 'Edit Subtask' : 'Add Subtask'}
        description={editorMode === 'draft' ? 'Adjust subtask wording, schedule, and reminder timing before saving the draft.' : 'Update the subtask schedule and reminder messages.'}
        initialPlan={editorPlan}
        saveLabel={editorMode === 'add-subtask' ? 'Add Subtask' : 'Save Changes'}
        saving={editorSaving}
        onClose={() => setEditorOpen(false)}
        onSave={handleEditorSave}
      />
    </div>
  );
}
