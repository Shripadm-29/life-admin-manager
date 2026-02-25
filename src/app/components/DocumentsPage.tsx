import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { StatusMessage } from '@/app/components/ui/status-message';
import { Document } from '@/app/types';
import { Upload, FileText, Link as LinkIcon, Calendar, Search } from 'lucide-react';

export function DocumentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [taskMap, setTaskMap] = useState<Record<string, string>>({}); // id -> title
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      const [{ data: docs, error: docsErr }, { data: tasks, error: tasksErr }] = await Promise.all([
        supabase
          .from('documents')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('tasks')
          .select('id,title')
          .eq('user_id', user!.id),
      ] as any);
      if (docsErr) {
        setError('Failed to load documents.');
      } else {
        // Normalize snake_case from database to camelCase.
        const normalized = (docs || []).map((d: any) => ({
          id: d.id,
          filePath: d.file_path,
          taskId: d.task_id,
          extractedTitle: d.extracted_title,
          extractedDueDate: d.extracted_due_date,
          extractionConfidence: d.extraction_confidence,
          createdAt: d.created_at,
        }));
        setDocuments(normalized);
      }
      if (!tasksErr && tasks) {
        const map: Record<string,string> = {};
        tasks.forEach((t: any) => (map[t.id] = t.title));
        setTaskMap(map);
      }
      setLoading(false);
    })();
  }, [user, navigate]);

  if (!user) return null;

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.filePath.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.extractedTitle && doc.extractedTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.taskId && taskMap[doc.taskId]?.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getLinkedTask = (taskId?: string) => {
    if (!taskId) return null;
    const title = taskMap[taskId];
    return title ? { id: taskId, title } : null;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      setError(null);
      try {
        // upload file to Supabase storage (optional)
        // const { data: storageData, error: storageErr } = await supabase.storage
        //   .from('documents')
        //   .upload(`user_${user!.id}/${file.name}`, file);
        // if (storageErr) throw storageErr;

        // insert document record (without file_path for now)
        const { data: doc, error: docErr } = await supabase
          .from('documents')
          .insert({
            user_id: user!.id,
            file_path: file.name,
            extracted_title: null,
            extracted_due_date: null,
            extraction_confidence: null,
          })
          .select()
          .single();
        if (docErr) throw docErr;

        navigate('/documents/extract', { state: { filename: file.name, documentId: doc?.id } });
      } catch (err) {
        console.error(err);
        setError('Failed to upload document.');
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 AI Document Extraction</h3>
          <p className="text-sm text-blue-800">
            Upload documents like syllabi, assignment sheets, or bills, and our AI will automatically 
            extract important dates and create tasks for you.
          </p>
        </div>

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

          <div className="bg-white rounded-lg shadow p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents by filename, title, or linked task..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
          ) : filteredDocuments.length === 0 ? (
            <StatusMessage
              variant="empty"
              message={documents.length === 0 ? 'No documents uploaded yet.' : 'No documents match your search.'}
              icon={<FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />}
            />
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredDocuments.map(doc => {
                const linkedTask = getLinkedTask(doc.taskId);
                return (
                  <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 rounded-lg p-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{doc.filePath}</h4>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Uploaded: {formatDate(doc.createdAt)}</span>
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
      </div>
    </div>
  );
}
