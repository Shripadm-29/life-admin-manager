import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ArrowLeft, CheckCircle, Edit2 } from 'lucide-react';
import { Navigation } from '@/app/components/Navigation';
import { DocumentPlanModal } from '@/app/components/DocumentPlanModal';
import { StatusMessage } from '@/app/components/ui/status-message';
import { useAuth } from '@/app/context/AuthContext';
import { ensureDocumentExtraction } from '@/lib/documentExtraction';
import { generatePlan, regeneratePlan } from '@/lib/aiPlan';
import { buildTaskPlanningContext } from '@/lib/planningContext';
import { DocumentExtractionSummary, PlannerSubtask } from '@/lib/plannerTypes';
import { supabase } from '@/lib/supabaseClient';
import { acceptDraftPlan, saveDraftPlan, skipDraftPlan } from '@/lib/taskPlanning';

export function AIExtraction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const filename = location.state?.filename || 'document.pdf';
  const documentId = location.state?.documentId;

  const [extractedTitle, setExtractedTitle] = useState('');
  const [extractedDate, setExtractedDate] = useState('');
  const [extractedSummary, setExtractedSummary] = useState('');
  const [documentHighlights, setDocumentHighlights] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planPreview, setPlanPreview] = useState<PlannerSubtask[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentDraftPlanId, setCurrentDraftPlanId] = useState<string | null>(null);
  const [taskCreatedInFlow, setTaskCreatedInFlow] = useState(false);

  const inferCategoryFromText = (value: string) => {
    const text = value.toLowerCase();
    if (/invoice|bill|payment|tuition|fee|bank|tax|rent/.test(text)) return 'Finance';
    if (/interview|resume|cv|job|career|internship|application/.test(text)) return 'Career';
    if (/doctor|appointment|health|fitness|workout|medical/.test(text)) return 'Health';
    if (/travel|trip|flight|hotel|itinerary/.test(text)) return 'Travel';
    if (/project|proposal|milestone|deliverable/.test(text)) return 'Project';
    if (/exam|homework|assignment|class|course|lecture|syllabus/.test(text)) return 'Academic';
    return 'Personal';
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        if (documentId) {
          const extracted = await ensureDocumentExtraction(documentId);
          setExtractedTitle(extracted.extracted_title || filename.replace(/\.[^.]+$/, ''));
          setExtractedDate(extracted.extracted_due_date || '');

          const metadata = (extracted.metadata || {}) as DocumentExtractionSummary;
          setExtractedSummary(metadata.summary || 'The document was processed and is ready for task planning.');
          setDocumentHighlights([
            ...(metadata.instructions || []).slice(0, 2),
            ...(metadata.deliverables || []).slice(0, 2),
            ...(metadata.deadlines || []).slice(0, 2),
            ...(metadata.constraints || []).slice(0, 2),
          ].filter(Boolean));
        } else {
          setExtractedTitle(filename.replace(/\.[^.]+$/, ''));
          setExtractedSummary('No stored document record was found for this upload, so only the filename is available.');
        }
      } catch (failure) {
        console.error(failure);
        setError('Failed to extract document information.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate, filename, documentId]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-8 text-center text-gray-500">
              <p className="animate-pulse">Extracting information from the document...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const createOrFindTask = async () => {
    const { data: existing, error: existingErr } = await supabase
      .from('tasks')
      .select('*')
      .ilike('title', extractedTitle || filename)
      .eq('user_id', user!.id)
      .limit(1)
      .maybeSingle();

    if (existingErr) throw existingErr;

    let task: any = existing;
    let created = false;
    if (task) {
      if (extractedDate && extractedDate !== task.due_date) {
        const { error: updateErr } = await supabase
          .from('tasks')
          .update({ due_date: extractedDate })
          .eq('id', task.id)
          .eq('user_id', user!.id);
        if (updateErr) throw updateErr;
        task = { ...task, due_date: extractedDate };
      }
    } else {
      const inferredCategory = inferCategoryFromText(`${extractedTitle || ''} ${filename || ''}`);
      const payload = {
        title: extractedTitle || filename,
        due_date: extractedDate || null,
        category: inferredCategory,
        priority: 'medium',
        notes: null,
        source: 'document',
        user_id: user!.id,
      };

      let newTask: any = null;
      let taskErr: any = null;

      ({ data: newTask, error: taskErr } = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single());

      if (taskErr && String(taskErr.message || '').toLowerCase().includes('source')) {
        ({ data: newTask, error: taskErr } = await supabase
          .from('tasks')
          .insert({
            title: extractedTitle || filename,
            due_date: extractedDate || null,
            category: inferredCategory,
            priority: 'medium',
            notes: null,
            user_id: user!.id,
          })
          .select()
          .single());
      }

      if (taskErr || !newTask) throw taskErr || new Error('Failed to create task row.');
      task = newTask;
      created = true;
    }

    if (documentId) {
      const { error: docUpdateErr } = await supabase
        .from('documents')
        .update({ task_id: task.id, extracted_title: extractedTitle, extracted_due_date: extractedDate, extraction_confidence: 1 })
        .eq('id', documentId)
        .eq('user_id', user!.id);
      if (docUpdateErr) throw docUpdateErr;
    }

    return { task, created };
  };

  const cleanupCreatedTask = async (taskId: string) => {
    const documentId = location.state?.documentId;
    if (documentId) {
      await supabase
        .from('documents')
        .update({ task_id: null })
        .eq('id', documentId)
        .eq('user_id', user!.id);
    }

    await supabase
      .from('task_plans')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', user!.id);

    await supabase
      .from('subtasks')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', user!.id);

    await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user!.id);
  };

  const handleCreateTaskOnly = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const { task } = await createOrFindTask();
      navigate('/tasks/' + task.id);
    } catch (e) {
      console.error(e);
      setError('Failed to create task.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setActionLoading(true);
    setPlanLoading(true);
    setError(null);

    try {
      const { task, created } = await createOrFindTask();
      setCurrentTaskId(task.id);
      setTaskCreatedInFlow(created);
      const context = await buildTaskPlanningContext(task.id, user!.id);
      const preview = await generatePlan(context);
      const draft = await saveDraftPlan(task.id, user!.id, preview);
      setCurrentDraftPlanId(draft.id);
      setPlanPreview(preview.plan);
      setPlanModalOpen(true);
    } catch (e) {
      console.error(e);
      setError('Task created, but failed to generate a plan. You can generate a plan from the task details page.');
    } finally {
      setActionLoading(false);
      setPlanLoading(false);
    }
  };

  const handleEdit = () => {
    navigate('/tasks/new', { 
      state: { 
        prefillTitle: extractedTitle, 
        prefillDate: extractedDate,
        linkedDocument: filename 
      } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/documents')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Documents
        </button>

        {error ? (
          <div className="mb-4">
            <StatusMessage variant="error" message={error} />
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-full p-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AI Extraction Complete</h2>
                <p className="text-gray-600">We've extracted the following information from your document</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Document:</strong> {filename}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suggested Task Title
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={extractedTitle}
                  onChange={(e) => setExtractedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-900">{extractedTitle}</span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suggested Due Date
              </label>
              <input
                type="date"
                value={extractedDate}
                onChange={(e) => setExtractedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                💡 <strong>Tip:</strong> You can confirm these details to quickly create a task, or click "Edit Full Task" 
                to customize category, priority, and other details.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => navigate('/documents')}
                disabled={actionLoading}
                className={`px-4 py-2 border border-gray-300 text-gray-700 rounded-md transition-colors ${actionLoading ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={actionLoading}
                className={`px-4 py-2 border border-blue-600 text-blue-600 rounded-md transition-colors ${actionLoading ? 'opacity-50 pointer-events-none' : 'hover:bg-blue-50'}`}
              >
                Edit Full Task
              </button>
              <button
                onClick={handleGeneratePlan}
                disabled={actionLoading || planLoading}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md transition-colors ${actionLoading || planLoading ? 'opacity-50 pointer-events-none' : 'hover:bg-blue-700'}`}
              >
                {actionLoading || planLoading ? 'Generating…' : 'Generate Plan Preview'}
              </button>
              <button
                onClick={handleCreateTaskOnly}
                disabled={actionLoading}
                className={`px-4 py-2 border border-blue-600 text-blue-600 rounded-md transition-colors ${actionLoading ? 'opacity-50 pointer-events-none' : 'hover:bg-blue-50'}`}
              >
                {actionLoading ? 'Creating…' : 'Create Task Only'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <DocumentPlanModal
        open={planModalOpen}
        taskTitle={extractedTitle || filename}
        taskDue={extractedDate}
        extractedSummary={extractedSummary}
        highlights={documentHighlights}
        plan={planPreview}
        loading={planLoading}
        onCreateTaskAndPlan={async () => {
          if (!currentTaskId || !currentDraftPlanId) {
            setError('Unable to accept plan because the draft is missing. Please regenerate the preview.');
            return;
          }

          setPlanLoading(true);
          setError(null);
          try {
            await acceptDraftPlan(currentTaskId, user!.id, currentDraftPlanId);
            setPlanModalOpen(false);
            navigate('/tasks/' + currentTaskId);
          } catch (failure: any) {
            setError(`Failed to accept and create plan: ${failure?.message || 'unknown error'}`);
          } finally {
            setPlanLoading(false);
          }
        }}
        onCreateTaskOnly={async () => {
          if (!currentTaskId) {
            setError('Unable to create task because no task was generated yet.');
            return;
          }

          setPlanLoading(true);
          setError(null);
          try {
            if (currentDraftPlanId) {
              await skipDraftPlan(currentDraftPlanId, user!.id);
            }
            setPlanModalOpen(false);
            navigate('/tasks/' + currentTaskId);
          } catch (failure: any) {
            setError(`Failed to create task only: ${failure?.message || 'unknown error'}`);
          } finally {
            setPlanLoading(false);
          }
        }}
        onRegenerate={async () => {
          if (!currentTaskId) {
            setError('Unable to regenerate because task context is missing.');
            return;
          }

          setPlanLoading(true);
          setError(null);
          try {
            const context = await buildTaskPlanningContext(currentTaskId, user!.id);
            const preview = await regeneratePlan(context);
            const draft = await saveDraftPlan(currentTaskId, user!.id, preview);
            setCurrentDraftPlanId(draft.id);
            setPlanPreview(preview.plan);
          } catch (failure: any) {
            setError(`Failed to regenerate preview plan: ${failure?.message || 'unknown error'}`);
          } finally {
            setPlanLoading(false);
          }
        }}
        onCancel={async () => {
          setPlanLoading(true);
          setError(null);
          try {
            if (currentDraftPlanId) {
              await skipDraftPlan(currentDraftPlanId, user!.id);
            }
            if (currentTaskId && taskCreatedInFlow) {
              await cleanupCreatedTask(currentTaskId);
            }
            setPlanModalOpen(false);
            navigate('/documents');
          } catch (failure: any) {
            setError(`Failed to cancel preview flow cleanly: ${failure?.message || 'unknown error'}`);
          } finally {
            setPlanLoading(false);
          }
        }}
      />
    </div>
  );
}
