import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { StatusMessage } from '@/app/components/ui/status-message';
import { Task } from '@/app/types';
import { Plus, AlertCircle, Clock } from 'lucide-react';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError('Failed to load dashboard data.');
      } else {
        const normalized = (data || []).map((d: any) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          priority: d.priority,
          dueDate: d.due_date,
          notes: d.notes || '',
          completed: d.status === 'completed',
        }));
        setTasks(normalized);
      }
      setLoading(false);
    })();
  }, [user, navigate]);

  if (!user) return null;

  const upcomingTasks = tasks
    .filter(t => !t.completed && new Date(t.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const overdueTasks = tasks
    .filter(t => !t.completed && new Date(t.dueDate) < new Date());

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Welcome back! Here's an overview of your tasks.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-3xl font-bold text-gray-900">{upcomingTasks.length}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-gray-900">{overdueTasks.length}</p>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {overdueTasks.length > 0 && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="font-semibold text-red-900">
                You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
              </h3>
            </div>
            <div className="mt-3 space-y-2">
              {overdueTasks.map(task => (
                <div key={task.id} className="bg-white rounded p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-600">Due: {formatDate(task.dueDate)}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {error ? (
            <StatusMessage variant="error" message={error} />
          ) : loading ? (
            <StatusMessage variant="loading" message="Loading dashboard..." />
          ) : (
            <>
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h3>
                <button
                  onClick={() => navigate('/tasks/new')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </button>
              </div>

              {upcomingTasks.length === 0 ? (
                <StatusMessage variant="empty" message="No upcoming tasks. You're all caught up!" />
              ) : (
                <div className="divide-y divide-gray-200">
              {upcomingTasks.map(task => (
                <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{task.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{task.notes}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Category: {task.category}</span>
                        <span>•</span>
                        <span>Due: {formatDate(task.dueDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={() => navigate('/tasks')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all tasks →
            </button>
          </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
