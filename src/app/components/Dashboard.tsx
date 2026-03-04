import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { StatusMessage } from '@/app/components/ui/status-message';
import { Task } from '@/app/types';
import { Plus, AlertCircle, Clock, Calendar } from 'lucide-react';

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
    (async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user!.id)
        .order('due_date', { ascending: true });
      if (error) {
        setError('Failed to load dashboard data.');
      } else {
        const normalized = (data || []).map((d: {
          id: string;
          title: string;
          category: string;
          priority: 'low' | 'medium' | 'high';
          due_at?: string;
          due_date?: string;
          notes?: string;
          status?: string;
        }) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          priority: d.priority,
          dueDate: (d.due_at || d.due_date) as string,
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
    .filter(t => !t.completed && new Date(t.dueDate) < new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navigation />

      <div className="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Dashboard</h2>
          <p className="text-gray-600 mt-1">Welcome back! Here&apos;s an overview of your tasks.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="relative overflow-hidden bg-white rounded-xl shadow-lg border border-indigo-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{tasks.length}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-4 shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-xl shadow-lg border border-green-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{upcomingTasks.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-4 shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white rounded-xl shadow-lg border border-red-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">{overdueTasks.length}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl p-4 shadow-lg">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>
        </div>

        {overdueTasks.length > 0 && (
          <div className="mb-8 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-6 shadow-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <h3 className="font-semibold text-red-900">
                You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
              </h3>
            </div>
            <div className="mt-3 space-y-2">
              {overdueTasks.map(task => (
                <div key={task.id} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
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

        <div className="bg-white rounded-xl shadow-xl border border-gray-100">
          {error ? (
            <StatusMessage variant="error" message={error} />
          ) : loading ? (
            <StatusMessage variant="loading" message="Loading dashboard..." />
          ) : (
            <>
              <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-xl">
                <h3 className="text-xl font-semibold text-gray-900">Upcoming Tasks</h3>
                <button
                  onClick={() => navigate('/tasks/new')}
                  className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </button>
              </div>

              {upcomingTasks.length === 0 ? (
                <StatusMessage variant="empty" message="No upcoming tasks. You&apos;re all caught up!" />
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingTasks.map(task => (
                    <div key={task.id} className="p-6 hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/30 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900 text-lg">{task.title}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{task.notes}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="bg-gray-100 px-3 py-1 rounded-lg font-medium">{task.category}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(task.dueDate)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-gradient-to-r from-gray-50 to-indigo-50 border-t border-gray-200 rounded-b-xl">
                <button
                  onClick={() => navigate('/tasks')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
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
