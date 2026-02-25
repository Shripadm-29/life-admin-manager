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
      // 1. Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in.');

      // 2. Extract form data safely
      const formElement = e.target as HTMLFormElement;
      const formData = new FormData(formElement);
      
      const title = formData.get('title') as string;
      const descriptionText = formData.get('description') as string;
      const due_date = formData.get('dueDate') as string;
      const priority = formData.get('priority') as string;
      const file = formData.get('document') as File; // <-- NEW: Get the file

      if (!title || !due_date) throw new Error('Title and Due Date are required.');

      // 3. Insert Task AND GET THE ID BACK (.select().single())
      const { data: taskData, error: taskError } = await supabase
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
        ])
        .select() // Tells Supabase to return the newly created row
        .single(); // We only expect one row back

      if (taskError) throw taskError;

      // 4. Handle File Upload (If a file was actually selected)
      if (file && file.size > 0) {
        // Create a unique, safe file path: user_id/random_number.extension
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Math.random()}.${fileExt}`;

        // A. Upload physical file to Storage Bucket
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // B. Save record to the 'documents' database table so we can track it
        const { error: docError } = await supabase
          .from('documents')
          .insert([
            {
              user_id: user.id,
              task_id: taskData.id, 
              file_path: filePath
            }
          ]);

        if (docError) throw docError;
      }

      // 5. Navigate back when successful
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
            <label className="block text-sm font-medium text-gray-700">Notes/Description</label>
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

          {/* NEW: Document Upload Field */}
          <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">Attach a Document (Optional)</label>
            <input 
              name="document" 
              type="file" 
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Create Task'}
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