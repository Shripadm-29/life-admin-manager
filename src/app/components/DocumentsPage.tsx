import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/app/components/Navigation';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { StatusMessage } from '@/app/components/ui/status-message';
import { Document } from '@/app/types';
import { Upload, FileText, Link as LinkIcon, Calendar, Search, Trash2 } from 'lucide-react';

export function DocumentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [taskMap, setTaskMap] = useState<Record<string, string>>({}); // id -> title
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<'recently_viewed' | 'uploaded_desc' | 'uploaded_asc'>('uploaded_desc');
  const [recentlyViewedMap, setRecentlyViewedMap] = useState<Record<string, number>>({});

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

  useEffect(() => {
    if (!user) return;
    const key = `documents_recently_viewed_${user.id}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setRecentlyViewedMap(parsed);
        }
      }
    } catch {
      setRecentlyViewedMap({});
    }
  }, [user]);

  if (!user) return null;

  const filteredDocuments = documents.filter(doc => {
    const displayName = getDisplayFileName(doc.filePath).toLowerCase();
    const uploadedDateText = doc.createdAt ? formatDate(doc.createdAt).toLowerCase() : '';
    const uploadedDateIso = doc.createdAt ? new Date(doc.createdAt).toISOString().slice(0, 10) : '';
    const matchesSearch =
      displayName.includes(searchTerm.toLowerCase()) ||
      doc.filePath.toLowerCase().includes(searchTerm.toLowerCase()) ||
      uploadedDateText.includes(searchTerm.toLowerCase()) ||
      uploadedDateIso.includes(searchTerm.toLowerCase()) ||
      (doc.extractedTitle && doc.extractedTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.taskId && taskMap[doc.taskId]?.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const aUploaded = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bUploaded = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    if (sortOption === 'recently_viewed') {
      const aViewed = recentlyViewedMap[a.id] || 0;
      const bViewed = recentlyViewedMap[b.id] || 0;
      if (aViewed !== bViewed) return bViewed - aViewed;
      return bUploaded - aUploaded;
    }

    if (sortOption === 'uploaded_asc') {
      return aUploaded - bUploaded;
    }

    return bUploaded - aUploaded;
  });

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

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
        const filePath = `${user!.id}/${Date.now()}-${file.name}`;

        const { error: storageErr } = await supabase.storage
          .from('documents')
          .upload(filePath, file, { upsert: false });
        if (storageErr) throw storageErr;

        const { data: doc, error: docErr } = await supabase
          .from('documents')
          .insert({
            user_id: user!.id,
            file_path: filePath,
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

  const isExternalUrl = (path: string) =>
    path.startsWith('http://') || path.startsWith('https://');

  function getDisplayFileName(filePath: string) {
    if (!filePath) return 'document';

    const baseName = filePath.split('/').pop() || filePath;
    const timestampPattern = /^\d{10,}-(?:\d+-)?(.+)$/;
    const matched = baseName.match(timestampPattern);
    if (matched?.[1]) return matched[1];

    return baseName;
  }

  const canSignPath = async (candidatePath: string) => {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(candidatePath, 30);
    return !error && !!data?.signedUrl;
  };

  const resolveLegacyFilePath = async (rawFilePath: string) => {
    const cleanRaw = rawFilePath.trim();
    if (!cleanRaw) return rawFilePath;
    if (cleanRaw.includes('/')) return cleanRaw;

    const directCandidates = [
      cleanRaw,
      `${user!.id}/${cleanRaw}`,
      `user_${user!.id}/${cleanRaw}`,
    ];

    for (const candidate of directCandidates) {
      if (await canSignPath(candidate)) return candidate;
    }

    const listPrefixes = [user!.id, `user_${user!.id}`, ''];
    for (const prefix of listPrefixes) {
      const { data: listed, error: listErr } = await supabase.storage
        .from('documents')
        .list(prefix, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });

      if (listErr || !listed) continue;

      const fallbackMatch = listed.find(
        (entry) => entry.name === cleanRaw || entry.name.endsWith(cleanRaw),
      );

      if (fallbackMatch) {
        return prefix ? `${prefix}/${fallbackMatch.name}` : fallbackMatch.name;
      }
    }

    return cleanRaw;
  };

  const getSignedUrl = async (doc: Document, download = false) => {
    const filePath = doc.filePath;
    if (isExternalUrl(filePath)) return filePath;

    const resolvedPath = await resolveLegacyFilePath(filePath);

    if (resolvedPath !== filePath) {
      await supabase
        .from('documents')
        .update({ file_path: resolvedPath })
        .eq('id', doc.id)
        .eq('user_id', user!.id);

      setDocuments((prev) =>
        prev.map((currentDoc) =>
          currentDoc.id === doc.id ? { ...currentDoc, filePath: resolvedPath } : currentDoc,
        ),
      );
    }

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(resolvedPath, 60 * 60, { download });

    if (error || !data?.signedUrl) throw error || new Error('Could not create file URL.');
    return data.signedUrl;
  };

  const handleView = async (doc: Document) => {
    setActionLoadingId(`view-${doc.id}`);
    setError(null);
    try {
      const url = await getSignedUrl(doc, false);
      window.open(url, '_blank', 'noopener,noreferrer');
      const now = Date.now();
      setRecentlyViewedMap((prev) => {
        const next = { ...prev, [doc.id]: now };
        try {
          localStorage.setItem(`documents_recently_viewed_${user!.id}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (err) {
      console.error(err);
      setError(`Failed to open ${doc.filePath}. The file may be missing from storage. Please re-upload it.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownload = async (doc: Document) => {
    setActionLoadingId(`download-${doc.id}`);
    setError(null);
    try {
      const url = await getSignedUrl(doc, true);
      const a = document.createElement('a');
      a.href = url;
      a.download = getDisplayFileName(doc.filePath);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      setError(`Failed to download ${doc.filePath}. The file may be missing from storage. Please re-upload it.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    const confirmed = window.confirm(`Delete ${getDisplayFileName(doc.filePath)}? This cannot be undone.`);
    if (!confirmed) return;

    setActionLoadingId(`delete-${doc.id}`);
    setError(null);
    try {
      if (!isExternalUrl(doc.filePath)) {
        const resolvedPath = await resolveLegacyFilePath(doc.filePath);
        if (resolvedPath.includes('/')) {
          const { error: storageDeleteErr } = await supabase.storage
            .from('documents')
            .remove([resolvedPath]);
          if (storageDeleteErr) {
            console.warn('Could not delete file from storage, continuing to delete DB record.', storageDeleteErr);
          }
        }
      }

      const { error: dbDeleteErr } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)
        .eq('user_id', user!.id);

      if (dbDeleteErr) throw dbDeleteErr;

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      console.error(err);
      setError(`Failed to delete ${getDisplayFileName(doc.filePath)}.`);
    } finally {
      setActionLoadingId(null);
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
            <div className="flex items-center gap-2">
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

          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by filename, title, linked task, or uploaded date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as 'recently_viewed' | 'uploaded_desc' | 'uploaded_asc')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recently_viewed">Sort: Recently Viewed</option>
                <option value="uploaded_desc">Sort: Uploaded (Recent to Old)</option>
                <option value="uploaded_asc">Sort: Uploaded (Old to Recent)</option>
              </select>
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
          ) : sortedDocuments.length === 0 ? (
            <StatusMessage
              variant="empty"
              message={documents.length === 0 ? 'No documents uploaded yet.' : 'No documents match your search.'}
              icon={<FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />}
            />
          ) : (
            <div className="divide-y divide-gray-200">
              {sortedDocuments.map(doc => {
                const linkedTask = getLinkedTask(doc.taskId);
                return (
                  <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 rounded-lg p-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{getDisplayFileName(doc.filePath)}</h4>
                        
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
                            <button
                              onClick={() => navigate(`/tasks/${linkedTask.id}`)}
                              className="text-blue-600 font-medium hover:underline cursor-pointer"
                            >
                              {linkedTask.title}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(doc)}
                          disabled={!!actionLoadingId || loading}
                          className={`px-3 py-1 text-sm text-blue-600 rounded-md transition-colors ${actionLoadingId || loading ? 'opacity-50 pointer-events-none' : 'hover:bg-blue-50'}`}
                        >
                          {actionLoadingId === `view-${doc.id}` ? 'Opening...' : 'View'}
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={!!actionLoadingId || loading}
                          className={`px-3 py-1 text-sm text-gray-600 rounded-md transition-colors ${actionLoadingId || loading ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-100'}`}
                        >
                          {actionLoadingId === `download-${doc.id}` ? 'Downloading...' : 'Download'}
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          disabled={!!actionLoadingId || loading}
                          className={`inline-flex items-center gap-1 px-3 py-1 text-sm text-red-600 rounded-md transition-colors ${actionLoadingId || loading ? 'opacity-50 pointer-events-none' : 'hover:bg-red-50'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                          {actionLoadingId === `delete-${doc.id}` ? 'Deleting...' : 'Delete'}
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
