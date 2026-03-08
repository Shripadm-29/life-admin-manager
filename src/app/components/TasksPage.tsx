import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { StatusMessage } from '@/app/components/ui/status-message';
import { Task } from '@/app/types';
import { Plus, Search, Filter, Trash2, Calendar } from 'lucide-react';

export function TasksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user!.id)
        .order('due_date', { ascending: true });
      if (error) {
        setError('Failed to load tasks.');
      } else {
        const normalized = (data || []).map((d: any) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          priority: d.priority,
          dueDate: d.due_at || d.due_date,
          notes: d.notes || '',
          completed: d.status === 'completed',
        }));
        setTasks(normalized);
      }
      setLoading(false);
    })();
    return;  }, [user, navigate]);

  if (!user) return null;

  const categories = ['all', ...Array.from(new Set(tasks.map(t => t.category)))];
  const priorities = ['all', 'high', 'medium', 'low'];

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesCategory && matchesPriority;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const toggleComplete = async (taskId: string, current: boolean) => {
    // optimistic update
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !current } : task
    ));
    // also persist to supabase
    const newStatus = current ? 'todo' : 'completed';
    await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)
      .eq('user_id', user!.id);
  };

  const deleteTask = async (taskId: string) => {
    const confirmed = window.confirm('Delete this task? This cannot be undone.');
    if (!confirmed) return;

    setDeleteLoadingId(taskId);
    setError(null);

    try {
      await supabase
        .from('documents')
        .update({ task_id: null })
        .eq('task_id', taskId)
        .eq('user_id', user!.id);

      const { error: planItemsError } = await supabase
        .from('task_plan_items')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', user!.id);
      if (planItemsError) {
        console.warn('Failed to delete task plan items before task delete', planItemsError);
      }

      const { error: subtasksError } = await supabase
        .from('subtasks')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', user!.id);
      if (subtasksError) {
        console.warn('Failed to delete subtasks before task delete', subtasksError);
      }

      const { error: plansError } = await supabase
        .from('task_plans')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', user!.id);
      if (plansError) {
        console.warn('Failed to delete task_plans before task delete', plansError);
      }

      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user!.id);

      if (deleteError) throw deleteError;
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error(err);
      setError('Failed to delete task.');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />
      
      <div className="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Tasks</h2>
              <p className="text-gray-600 mt-1">Manage all your tasks and deadlines</p>
            </div>
            <button
              onClick={() => navigate('/tasks/new')}
              className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-pink-400" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
                >
                  {priorities.map(pri => (
                    <option key={pri} value={pri}>
                      {pri === 'all' ? 'All Priorities' : pri.charAt(0).toUpperCase() + pri.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xl border border-gray-100">
          <div aria-live="polite" className="sr-only" />
          {error ? (
            <StatusMessage variant="error" message={error} />
          ) : loading ? (
            <StatusMessage variant="loading" message="Loading tasks..." />
          ) : tasks.length === 0 ? (
            <StatusMessage variant="empty" message={'No tasks yet. Click "Add Task" to create your first task.'} />
          ) : filteredTasks.length === 0 ? (
            <StatusMessage variant="filtered" message="No tasks match your search or filters. Try clearing filters." />
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTasks.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className={`cursor-pointer p-6 hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/30 transition-all ${task.completed ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => {
                        if (loading || actionLoading) return;
                        setActionLoading(task.id);
                        setTimeout(() => {
                          toggleComplete(task.id, task.completed);
                          setActionLoading(null);
                        }, 200);
                      }}
                      disabled={!!actionLoading || loading}
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className={`font-semibold text-gray-900 text-lg ${task.completed ? 'line-through' : ''}`}>
                          {task.title}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.completed && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
                            Completed
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{task.notes}</p>
                      
                      <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-500 flex-wrap">
                        <span className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 px-3 py-1 rounded-lg font-medium border border-indigo-100">{task.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Due: {formatDate(task.dueDate)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${task.id}/edit`); }}
                        disabled={loading || !!actionLoading || !!deleteLoadingId}
                        className={`px-4 py-2 text-sm text-indigo-600 rounded-xl transition-all border border-indigo-200 ${loading || actionLoading || deleteLoadingId ? 'opacity-50 pointer-events-none' : 'hover:bg-indigo-50 hover:border-indigo-300'}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                        disabled={loading || !!actionLoading || !!deleteLoadingId}
                        className={`inline-flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 rounded-md transition-colors ${loading || actionLoading || deleteLoadingId ? 'opacity-50 pointer-events-none' : 'hover:bg-red-50'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleteLoadingId === task.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
