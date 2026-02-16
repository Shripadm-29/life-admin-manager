import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { mockDocuments, mockTasks } from '@/app/data/mockData';
import { StatusMessage } from '@/app/components/ui/status-message';
import { Document } from '@/app/types';
import { Upload, FileText, Link as LinkIcon, Calendar } from 'lucide-react';

export function DocumentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      try {
        setDocuments(mockDocuments);
      } catch (e) {
        setError('Failed to load documents.');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [user, navigate]);

  if (!user) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getLinkedTask = (taskId?: string) => {
    if (!taskId) return null;
    return mockTasks.find(t => t.id === taskId);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      setError(null);
      // Simulate upload + AI extraction
      const t = setTimeout(() => {
        try {
          navigate('/documents/extract', { state: { filename: file.name } });
        } catch (err) {
          setError('Failed to upload document.');
        } finally {
          setUploading(false);
        }
      }, 400);

      return () => clearTimeout(t);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
              <p className="text-gray-600">Upload and manage your documents</p>
            </div>
            <label className={`inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md transition-colors cursor-pointer ${loading || uploading ? 'opacity-50 pointer-events-none' : 'hover:bg-blue-700'}`}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                disabled={loading || uploading}
              />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          {error ? (
            <StatusMessage variant="error" message={error} />
          ) : loading ? (
            <StatusMessage
              variant="loading"
              message="Loading documents..."
              icon={<FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />}
            />
          ) : documents.length === 0 ? (
            <StatusMessage
              variant="empty"
              message="No documents uploaded yet."
              icon={<FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />}
            />
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map(doc => {
                const linkedTask = getLinkedTask(doc.linkedTaskId);
                return (
                  <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 rounded-lg p-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{doc.filename}</h4>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Uploaded: {formatDate(doc.uploadDate)}</span>
                          </div>
                        </div>

                        {linkedTask && (
                          <div className="flex items-center gap-2 text-sm">
                            <LinkIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-gray-600">Linked to:</span>
                            <span className="text-blue-600 font-medium">{linkedTask.title}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          View
                        </button>
                        <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 AI Document Extraction</h3>
          <p className="text-sm text-blue-800">
            Upload documents like syllabi, assignment sheets, or bills, and our AI will automatically 
            extract important dates and create tasks for you.
          </p>
        </div>
      </div>
    </div>
  );
}
