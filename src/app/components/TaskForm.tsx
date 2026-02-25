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
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isEdit && id) {
      (async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .eq('user_id', user!.id)
          .single();
        if (data) {
          setTitle(data.title);
          setCategory(data.category);
          setPriority(data.priority);
          setDueDate(data.due_date);
          setNotes(data.notes || '');
        }
      })();
    } else if (!isEdit) {
      // check if navigation state provided defaults (from document extraction etc)
      const state = location.state as any;
      if (state?.prefillTitle) setTitle(state.prefillTitle);
      if (state?.prefillDate) setDueDate(state.prefillDate);
      // we could store linkedDocument in notes or somewhere but skipping for now
    }
  }, [user, navigate, isEdit, id]);

  if (!user) return null;

  const categories = ['Academic', 'Finance', 'Career', 'Health', 'Personal', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title || !dueDate) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      if (isEdit && id) {
        await supabase
          .from('tasks')
          .update({ title, category, priority, due_date: dueDate, notes })
          .eq('id', id)
          .eq('user_id', user!.id);
        navigate(`/tasks/${id}`);
      } else {
        const { data } = await supabase
          .from('tasks')
          .insert({
            title,
            category,
            priority,
            due_date: dueDate,
            notes,
            user_id: user!.id,
          })
          .select()
          .single();
        if (data) {
          navigate(`/tasks/${data.id}`);
        } else {
          navigate('/tasks');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save task.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {isEdit ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
