import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

      // 1. Backend query optimization & Sorting (Ascending date)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }); 

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task:', error);
      fetchTasks(); // Revert UI if database fails
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return; 
    try {
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

  // Date formatting utility
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    // Add timezone offset to prevent day-shifting bugs
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Logic to separate tasks into Arrays
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = filteredTasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    const dueDate = new Date(t.due_date);
    const userTimezoneOffset = dueDate.getTimezoneOffset() * 60000;
    const adjustedDueDate = new Date(dueDate.getTime() + userTimezoneOffset);
    return adjustedDueDate < today;
  });

  const upcomingTasks = filteredTasks.filter(t => {
    if (t.status === 'completed') return false;
    if (!t.due_date) return true; // Tasks without dates go to upcoming
    const dueDate = new Date(t.due_date);
    const userTimezoneOffset = dueDate.getTimezoneOffset() * 60000;
    const adjustedDueDate = new Date(dueDate.getTime() + userTimezoneOffset);
    return adjustedDueDate >= today;
  });

  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  // Reusable Component for Task Cards
  const renderTaskCard = (task: any, isOverdue: boolean = false) => (
    <div key={task.id} className={`p-5 rounded-lg shadow-sm border flex items-start gap-4 transition-opacity ${task.status === 'completed' ? 'opacity-60 bg-gray-50' : 'bg-white'} ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}>
      
      <input 
        type="checkbox" 
        checked={task.status === 'completed'}
        onChange={() => handleToggleComplete(task.id, task.status)}
        className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
      />
      
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h3 className={`text-lg font-medium ${isOverdue ? 'text-red-900' : 'text-gray-900'} ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
            {task.title}
          </h3>
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority || 'none'}
          </span>
        </div>
        
        {task.notes && <p className="text-gray-600 text-sm mb-2">{task.notes}</p>}
        
        <div className={`text-xs flex items-center gap-2 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
          <span>Category: {task.category || 'misc'}</span>
          <span>•</span>
          <span>Due: {formatDate(task.due_date)}</span>
          {isOverdue && <span>(Overdue)</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2 items-end">
        <button 
          onClick={() => handleDelete(task.id)}
          className="text-sm text-red-600 hover:underline font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );

  if (loading) return <div className="p-8 text-center">Loading Tasks...</div>;

  return (
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
        
        {/* Overdue Section */}
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

        {/* Upcoming Section */}
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

        {/* Completed Section */}
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
  );
}