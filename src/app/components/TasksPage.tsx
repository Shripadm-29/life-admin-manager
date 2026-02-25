import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Paperclip, Download, Eye, XCircle, Edit2 } from 'lucide-react';
import { Navigation } from '@/app/components/Navigation'; 

export function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- NEW: Edit Task State ---
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: '', notes: '', due_date: '', priority: 'medium' });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }); 

      if (tasksError) throw tasksError;

      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id);

      if (docsError) throw docsError;

      const mergedTasks = (tasksData || []).map(task => ({
        ...task,
        document: (docsData || []).find(doc => doc.task_id === task.id) || null
      }));

      setTasks(mergedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Handle Edit Actions ---
  const openEditModal = (task: any) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      notes: task.notes || '',
      due_date: task.due_date || '',
      priority: task.priority || 'medium'
    });
  };

  const saveEditTask = async () => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editForm.title,
          notes: editForm.notes,
          due_date: editForm.due_date,
          priority: editForm.priority
        })
        .eq('id', editingTask.id);

      if (error) throw error;

      // Update UI instantly
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...editForm } : t));
      setEditingTask(null); // Close modal
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Could not update task.');
    }
  };

  const handleViewDocument = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error opening document:', error);
      alert('Could not open the document.');
    }
  };

  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from('documents').download(filePath);
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Could not download document.');
    }
  };

  const handleDeleteDocument = async (taskId: string, docId: string, filePath: string) => {
    if (!window.confirm('Are you sure you want to remove this file?')) return;
    try {
      const { error: storageError } = await supabase.storage.from('documents').remove([filePath]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from('documents').delete().eq('id', docId);
      if (dbError) throw dbError;

      setTasks(tasks.map(t => t.id === taskId ? { ...t, document: null } : t));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Could not delete document.');
    }
  };

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating task:', error);
      fetchTasks(); 
    }
  };

  const handleDelete = async (taskId: string, document?: any) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return; 
    try {
      if (document && document.file_path) {
        await supabase.storage.from('documents').remove([document.file_path]);
      }
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      alert('Error deleting task.');
      console.error(error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = filteredTasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    const dueDate = new Date(t.due_date);
    const userTimezoneOffset = dueDate.getTimezoneOffset() * 60000;
    return new Date(dueDate.getTime() + userTimezoneOffset) < today;
  });

  const upcomingTasks = filteredTasks.filter(t => {
    if (t.status === 'completed') return false;
    if (!t.due_date) return true; 
    const dueDate = new Date(t.due_date);
    const userTimezoneOffset = dueDate.getTimezoneOffset() * 60000;
    return new Date(dueDate.getTime() + userTimezoneOffset) >= today;
  });

  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const renderTaskCard = (task: any, isOverdue: boolean = false) => (
    <div key={task.id} className={`p-5 rounded-lg shadow-sm border flex items-start gap-4 transition-opacity ${task.status === 'completed' ? 'opacity-60 bg-gray-50' : 'bg-white'} ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}>
      
      <input 
        type="checkbox" 
        checked={task.status === 'completed'}
        onChange={() => handleToggleComplete(task.id, task.status)}
        className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className={`text-lg font-medium truncate ${isOverdue ? 'text-red-900' : 'text-gray-900'} ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
            {task.title}
          </h3>
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority || 'none'}
          </span>
        </div>
        
        {task.notes && <p className="text-gray-600 text-sm mb-2">{task.notes}</p>}
        
        <div className={`text-xs flex items-center gap-2 mb-3 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
          <span>Category: {task.category || 'misc'}</span>
          <span>•</span>
          <span>Due: {formatDate(task.due_date)}</span>
          {isOverdue && <span>(Overdue)</span>}
        </div>

        {task.document && (
          <div className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md max-w-sm mt-3">
            <div className="flex items-center gap-2 text-sm text-gray-700 overflow-hidden">
              <Paperclip className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="truncate font-medium">{task.document.file_path.split('/').pop()}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button 
                onClick={() => handleViewDocument(task.document.file_path)}
                className="inline-flex items-center justify-center gap-1 text-xs bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-100 font-medium text-gray-700 transition-colors"
              >
                <Eye className="w-3 h-3" /> View
              </button>
              <button 
                onClick={() => handleDownloadDocument(task.document.file_path, task.document.file_path.split('/').pop())}
                className="inline-flex items-center justify-center gap-1 text-xs bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-100 font-medium text-gray-700 transition-colors"
              >
                <Download className="w-3 h-3" /> Download
              </button>
              <div className="flex-1"></div>
              <button 
                onClick={() => handleDeleteDocument(task.id, task.document.id, task.document.file_path)}
                className="inline-flex items-center justify-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                title="Remove Document"
              >
                <XCircle className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 items-end">
        {/* NEW: Edit Button */}
        <button 
          onClick={() => openEditModal(task)}
          className="text-sm text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
        >
          <Edit2 className="w-3 h-3" /> Edit
        </button>
        <button 
          onClick={() => handleDelete(task.id, task.document)}
          className="text-sm text-red-600 hover:underline font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );

  if (loading) return <div className="p-8 text-center">Loading Tasks...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* SPRINT 4/Polish: Added the Missing Navbar here! */}
      <Navigation />

      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600">Manage all your tasks and deadlines</p>
          </div>
          <Link to="/tasks/new" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">
            + Add Task
          </Link>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex gap-4 mb-8">
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="space-y-8">
          {overdueTasks.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
                ⚠️ Overdue ({overdueTasks.length})
              </h2>
              <div className="space-y-4">
                {overdueTasks.map(t => renderTaskCard(t, true))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Upcoming ({upcomingTasks.length})
            </h2>
            <div className="space-y-4">
              {upcomingTasks.length === 0 && overdueTasks.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-lg shadow-sm border text-gray-500">
                  No upcoming tasks. You're all caught up!
                </div>
              ) : (
                upcomingTasks.map(t => renderTaskCard(t, false))
              )}
            </div>
          </section>

          {completedTasks.length > 0 && (
            <section className="pt-8 border-t">
              <h2 className="text-xl font-bold text-gray-500 mb-4">
                Completed ({completedTasks.length})
              </h2>
              <div className="space-y-4">
                {completedTasks.map(t => renderTaskCard(t, false))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* --- NEW: Edit Modal Overlay --- */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input 
                  type="text" 
                  value={editForm.title} 
                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                  className="mt-1 w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea 
                  value={editForm.notes} 
                  onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  rows={3} 
                  className="mt-1 w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input 
                    type="date" 
                    value={editForm.due_date} 
                    onChange={e => setEditForm({...editForm, due_date: e.target.value})}
                    className="mt-1 w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select 
                    value={editForm.priority} 
                    onChange={e => setEditForm({...editForm, priority: e.target.value})}
                    className="mt-1 w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={saveEditTask}
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium transition-colors"
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => setEditingTask(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}