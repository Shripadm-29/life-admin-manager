import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export function TaskForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Get the logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to create a task.');

      // 2. Extract form data safely
      const formElement = e.target as HTMLFormElement;
      const formData = new FormData(formElement);
      
      // Grab the text from the form
      const title = formData.get('title') as string;
      const descriptionText = formData.get('description') as string;
      const due_date = formData.get('dueDate') as string;
      const priority = formData.get('priority') as string;

      // Basic Validation
      if (!title || !due_date) {
        throw new Error('Title and Due Date are required.');
      }

      // 3. Insert into Supabase
      const { error: supabaseError } = await supabase
        .from('tasks')
        .insert([
          {
            user_id: user.id,
            title,
            notes: descriptionText,
            due_date,
            priority,
            status: 'pending' 
          }
        ]);

      if (supabaseError) throw supabaseError;

      // 4. Go back to tasks page when successful!
      navigate('/tasks');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Task</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Task Title *</label>
            <input name="title" type="text" required className="mt-1 w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea name="description" rows={3} className="mt-1 w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date *</label>
              <input name="dueDate" type="date" required className="mt-1 w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select name="priority" className="mt-1 w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Task'}
            </button>
            <button type="button" onClick={() => navigate('/tasks')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}