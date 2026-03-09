import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft } from 'lucide-react';

export function TaskForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Academic');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'completed'>('todo');
  const [dueDate, setDueDate] = useState('');
  const [dueHour, setDueHour] = useState('12');
  const [dueMinute, setDueMinute] = useState('00');
  const [dueAmPm, setDueAmPm] = useState<'AM' | 'PM'>('PM');
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toLocalDueFields = (value?: string | null) => {
    if (!value) {
      return { date: '', hour: '12', minute: '00', ampm: 'PM' as const };
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { date: value, hour: '12', minute: '00', ampm: 'PM' as const };
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return { date: '', hour: '12', minute: '00', ampm: 'PM' as const };
    }

    const date = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    const hour24 = parsed.getHours();
    const minute = String(parsed.getMinutes()).padStart(2, '0');
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

    return { date, hour: String(hour12), minute, ampm: ampm as 'AM' | 'PM' };
  };

  const buildDueIso = () => {
    const hourNum = Math.max(1, Math.min(12, Number(dueHour) || 12));
    const minuteNum = Math.max(0, Math.min(59, Number(dueMinute) || 0));
    const hour24 = dueAmPm === 'PM' ? (hourNum === 12 ? 12 : hourNum + 12) : hourNum === 12 ? 0 : hourNum;

    const local = new Date(`${dueDate}T00:00:00`);
    local.setHours(hour24, minuteNum, 0, 0);
    return local.toISOString();
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isEdit && id) {
      (async () => {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .eq('user_id', user!.id)
          .single();
        if (data) {
          setTitle(data.title);
          setCategory(data.category);
          setPriority(data.priority);
          setStatus((data.status || 'todo') as 'todo' | 'in_progress' | 'completed');
          const dueFields = toLocalDueFields(data.due_at || data.due_date);
          setDueDate(dueFields.date);
          setDueHour(dueFields.hour);
          setDueMinute(dueFields.minute);
          setDueAmPm(dueFields.ampm);
          setNotes(data.notes || '');
        }
      })();
    } else if (!isEdit) {
      // check if navigation state provided defaults (from document extraction etc)
      const state = location.state as { prefillTitle?: string; prefillDate?: string };
      if (state?.prefillTitle) setTitle(state.prefillTitle);
      if (state?.prefillDate) {
        const dueFields = toLocalDueFields(state.prefillDate);
        setDueDate(dueFields.date);
        setDueHour(dueFields.hour);
        setDueMinute(dueFields.minute);
        setDueAmPm(dueFields.ampm);
      }
      // we could store linkedDocument in notes or somewhere but skipping for now
    }
  }, [user, navigate, isEdit, id, location.state]);

  if (!user) return null;

  const categories = [
    'Academic',
    'Homework',
    'Project',
    'Exam',
    'Finance',
    'Bills',
    'Career',
    'Internship',
    'Interview',
    'Health',
    'Fitness',
    'Personal',
    'Family',
    'Administrative',
    'Travel',
    'Other',
  ];

  const uploadDocumentsForTask = async (taskId: string) => {
    if (selectedFiles.length === 0) return;

    for (const [index, file] of selectedFiles.entries()) {
      const filePath = `${user!.id}/${Date.now()}-${index}-${file.name}`;

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: false });

      if (storageError) throw storageError;

      const { error: documentError } = await supabase
        .from('documents')
        .insert({
          user_id: user!.id,
          task_id: taskId,
          file_path: filePath,
          extracted_title: null,
          extracted_due_date: null,
          extraction_confidence: null,
        });

      if (documentError) throw documentError;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title || !dueDate) {
      setError('Please fill in all required fields');
      return;
    }

    const normalizedMinute = String(Math.max(0, Math.min(59, Number(dueMinute) || 0))).padStart(2, '0');
    setDueMinute(normalizedMinute);
    const dueDateIso = buildDueIso();

    try {
      setSaving(true);
      if (isEdit && id) {
        const payloadWithDueAt = {
          title,
          category,
          priority,
          status,
          due_date: dueDate,
          due_at: dueDateIso,
          notes,
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from('tasks')
          .update(payloadWithDueAt as Record<string, string>)
          .eq('id', id)
          .eq('user_id', user!.id);

        if (updateErr && String(updateErr.message || '').toLowerCase().includes('due_at')) {
          const fallbackPayload = {
            title,
            category,
            priority,
            status,
            due_date: dueDate,
            notes,
          };

          const { error: fallbackErr } = await supabase
            .from('tasks')
            .update(fallbackPayload)
            .eq('id', id)
            .eq('user_id', user!.id);

          if (fallbackErr) throw fallbackErr;
        } else if (updateErr) {
          throw updateErr;
        }

        await uploadDocumentsForTask(id);

        navigate(`/tasks/${id}`);
      } else {
        const payloadWithDueAt = {
          title,
          category,
          priority,
          status,
          due_date: dueDate,
          due_at: dueDateIso,
          notes,
          source: 'manual',
          user_id: user!.id,
        };

        let insertData: { id: string } | null = null;
        const { data: insertedWithDueAt, error: insertErr } = await supabase
          .from('tasks')
          .insert(payloadWithDueAt as Record<string, string>)
          .select()
          .single();

        if (
          insertErr &&
          (
            String(insertErr.message || '').toLowerCase().includes('due_at') ||
            String(insertErr.message || '').toLowerCase().includes('source')
          )
        ) {
          const fallbackPayload = {
            title,
            category,
            priority,
            status,
            due_date: dueDate,
            notes,
            user_id: user!.id,
          };

          const { data: insertedFallback, error: fallbackErr } = await supabase
            .from('tasks')
            .insert(fallbackPayload)
            .select()
            .single();

          if (fallbackErr) throw fallbackErr;
          insertData = insertedFallback;
        } else if (insertErr) {
          throw insertErr;
        } else {
          insertData = insertedWithDueAt;
        }

        if (insertData) {
          await uploadDocumentsForTask(insertData.id);
          navigate(`/tasks/${insertData.id}`);
        } else {
          navigate('/tasks');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save task or upload documents.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/tasks')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tasks
        </button>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Task' : 'Create New Task'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter task title"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'todo' | 'in_progress' | 'completed')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="md:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="md:col-span-2 flex items-center gap-2">
                  <select
                    value={dueHour}
                    onChange={(e) => setDueHour(e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, idx) => {
                      const h = String(idx + 1);
                      return (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      );
                    })}
                  </select>
                  <span className="text-gray-500 font-medium">:</span>
                  <input
                    type="text"
                    value={dueMinute}
                    onChange={(e) => setDueMinute(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
                    list="minute-options"
                    placeholder="00"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="minute-options">
                    <option value="00" />
                    <option value="15" />
                    <option value="30" />
                    <option value="45" />
                  </datalist>
                  <select
                    value={dueAmPm}
                    onChange={(e) => setDueAmPm(e.target.value as 'AM' | 'PM')}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any additional details..."
              />
            </div>

            <div>
              <label htmlFor="taskDocuments" className="block text-sm font-medium text-gray-700 mb-1">
                Upload Documents
              </label>
              <input
                id="taskDocuments"
                type="file"
                multiple
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedFiles.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {saving ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
