// import { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router';
// import { Navigation } from '@/app/components/Navigation';
// import { useAuth } from '@/app/context/AuthContext';
// import { mockTasks } from '@/app/data/mockData';
// import { Task } from '@/app/types';
// import { Plus, AlertCircle, Clock } from 'lucide-react';
// import { supabase } from '../../lib/supabaseClient';

// export function Dashboard() {
//   const { user } = useAuth();
//   const navigate = useNavigate();
//   const [tasks, setTasks] = useState<Task[]>([]);

//   useEffect(() => {
//     if (!user) {
//       navigate('/login');
//       return;
//     }
//     setTasks(mockTasks);
//   }, [user, navigate]);

//   if (!user) return null;

//   const upcomingTasks = tasks
//     .filter(t => !t.completed && new Date(t.dueDate) >= new Date())
//     .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
//     .slice(0, 5);

//   const overdueTasks = tasks
//     .filter(t => !t.completed && new Date(t.dueDate) < new Date());

//   const getPriorityColor = (priority: string) => {
//     switch (priority) {
//       case 'high': return 'text-red-600 bg-red-50';
//       case 'medium': return 'text-yellow-600 bg-yellow-50';
//       case 'low': return 'text-green-600 bg-green-50';
//       default: return 'text-gray-600 bg-gray-50';
//     }
//   };

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <Navigation />
      
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="mb-8">
//           <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
//           <p className="text-gray-600">Welcome back! Here's an overview of your tasks.</p>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Total Tasks</p>
//                 <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
//               </div>
//               <div className="bg-blue-100 rounded-full p-3">
//                 <Clock className="w-6 h-6 text-blue-600" />
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Upcoming</p>
//                 <p className="text-3xl font-bold text-gray-900">{upcomingTasks.length}</p>
//               </div>
//               <div className="bg-green-100 rounded-full p-3">
//                 <Clock className="w-6 h-6 text-green-600" />
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600">Overdue</p>
//                 <p className="text-3xl font-bold text-gray-900">{overdueTasks.length}</p>
//               </div>
//               <div className="bg-red-100 rounded-full p-3">
//                 <AlertCircle className="w-6 h-6 text-red-600" />
//               </div>
//             </div>
//           </div>
//         </div>

//         {overdueTasks.length > 0 && (
//           <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
//             <div className="flex items-center">
//               <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
//               <h3 className="font-semibold text-red-900">
//                 You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
//               </h3>
//             </div>
//             <div className="mt-3 space-y-2">
//               {overdueTasks.map(task => (
//                 <div key={task.id} className="bg-white rounded p-3 flex items-center justify-between">
//                   <div>
//                     <p className="font-medium text-gray-900">{task.title}</p>
//                     <p className="text-sm text-gray-600">Due: {formatDate(task.dueDate)}</p>
//                   </div>
//                   <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
//                     {task.priority}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         <div className="bg-white rounded-lg shadow">
//           <div className="p-6 border-b border-gray-200 flex items-center justify-between">
//             <h3 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h3>
//             <button
//               onClick={() => navigate('/tasks/new')}
//               className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
//             >
//               <Plus className="w-4 h-4 mr-2" />
//               Add Task
//             </button>
//           </div>

//           {upcomingTasks.length === 0 ? (
//             <div className="p-8 text-center text-gray-500">
//               <p>No upcoming tasks. You're all caught up!</p>
//             </div>
//           ) : (
//             <div className="divide-y divide-gray-200">
//               {upcomingTasks.map(task => (
//                 <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
//                   <div className="flex items-start justify-between">
//                     <div className="flex-1">
//                       <div className="flex items-center gap-3 mb-2">
//                         <h4 className="font-semibold text-gray-900">{task.title}</h4>
//                         <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
//                           {task.priority}
//                         </span>
//                       </div>
//                       <p className="text-sm text-gray-600 mb-1">{task.notes}</p>
//                       <div className="flex items-center gap-4 text-sm text-gray-500">
//                         <span>Category: {task.category}</span>
//                         <span>•</span>
//                         <span>Due: {formatDate(task.dueDate)}</span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}

//           <div className="p-4 bg-gray-50 border-t border-gray-200">
//             <button
//               onClick={() => navigate('/tasks')}
//               className="text-sm text-blue-600 hover:text-blue-700 font-medium"
//             >
//               View all tasks →
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }







import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient'; // Adjusted path to match your structure

export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      // 1. Ask Supabase directly: "Who is logged in?"
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // 2. If nobody is logged in, kick them to the login page
        navigate('/login');
      } else {
        // 3. If they are logged in, save their info to display
        setUser(user);
      }
    } catch (error) {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Life Admin Manager</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-900 font-medium border border-red-200 px-3 py-1 rounded"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600">Select a tool to get started.</p>
        </div>
        
        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Documents Card (Your Sprint 3 Feature) */}
          <Link to="/documents" className="block group">
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow h-full border-l-4 border-blue-500 p-6">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                Documents
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Securely upload, store, and manage your important files.
              </p>
              <div className="mt-4 text-blue-600 text-sm font-medium group-hover:underline">
                Go to Documents &rarr;
              </div>
            </div>
          </Link>

          {/* Tasks Card (Placeholder for future) */}
          <Link to="/tasks" className="block group">
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow h-full border-l-4 border-green-500 p-6">
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-green-600">
                Tasks
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                View upcoming to-dos and manage deadlines.
              </p>
              <div className="mt-4 text-green-600 text-sm font-medium group-hover:underline">
                View Tasks &rarr;
              </div>
            </div>
          </Link>

          {/* Profile Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg h-full border-l-4 border-purple-500 p-6 opacity-75">
            <h3 className="text-lg font-medium text-gray-900">
              Profile
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Manage your account settings (Coming soon).
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}