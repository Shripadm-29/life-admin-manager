import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ArrowLeft, CheckCircle, Edit2 } from 'lucide-react';
import { StatusMessage } from '@/app/components/ui/status-message';

export function AIExtraction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const filename = location.state?.filename || 'document.pdf';

  const [extractedTitle, setExtractedTitle] = useState('');
  const [extractedDate, setExtractedDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Simulate AI extraction
    setLoading(true);
    const t = setTimeout(() => {
      // Mock extracted data based on filename
      if (filename.toLowerCase().includes('assignment')) {
        setExtractedTitle('Complete Assignment 3 - Data Structures');
        setExtractedDate('2026-02-15');
      } else if (filename.toLowerCase().includes('bill') || filename.toLowerCase().includes('invoice')) {
        setExtractedTitle('Pay Utility Bill');
        setExtractedDate('2026-02-10');
      } else if (filename.toLowerCase().includes('syllabus')) {
        setExtractedTitle('Midterm Exam - CS 201');
        setExtractedDate('2026-03-15');
      } else {
        setExtractedTitle('Review Document: ' + filename);
        setExtractedDate('2026-02-20');
      }
      setLoading(false);
    }, 1000);

    return () => clearTimeout(t);
  }, [user, navigate, filename]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow">
            <div className="p-8 text-center text-gray-500">
              <p className="animate-pulse">Extracting information from the document...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleConfirm = () => {
    setActionLoading(true);
    setError(null);
    // Simulate API call
    const t = setTimeout(() => {
      try {
        console.log('Creating task:', { title: extractedTitle, dueDate: extractedDate });
        navigate('/documents');
      } catch (e) {
        setError('Failed to create task.');
      } finally {
        setActionLoading(false);
      }
    }, 400);

    return () => clearTimeout(t);
  };

  const handleEdit = () => {
    navigate('/tasks/new', { 
      state: { 
        prefillTitle: extractedTitle, 
        prefillDate: extractedDate,
        linkedDocument: filename 
      } 
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StatusMessage variant="error" message={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/documents')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Documents
        </button>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 rounded-full p-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">AI Extraction Complete</h2>
                <p className="text-gray-600">We've extracted the following information from your document</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Document:</strong> {filename}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suggested Task Title
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={extractedTitle}
                  onChange={(e) => setExtractedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span className="text-gray-900">{extractedTitle}</span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suggested Due Date
              </label>
              <input
                type="date"
                value={extractedDate}
                onChange={(e) => setExtractedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                💡 <strong>Tip:</strong> You can confirm these details to quickly create a task, or click "Edit Full Task" 
                to customize category, priority, and other details.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => navigate('/documents')}
                disabled={actionLoading}
                className={`px-4 py-2 border border-gray-300 text-gray-700 rounded-md transition-colors ${actionLoading ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={actionLoading}
                className={`px-4 py-2 border border-blue-600 text-blue-600 rounded-md transition-colors ${actionLoading ? 'opacity-50 pointer-events-none' : 'hover:bg-blue-50'}`}
              >
                Edit Full Task
              </button>
              <button
                onClick={handleConfirm}
                disabled={actionLoading}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md transition-colors ${actionLoading ? 'opacity-50 pointer-events-none' : 'hover:bg-blue-700'}`}
              >
                {actionLoading ? 'Creating…' : 'Confirm & Create Task'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
