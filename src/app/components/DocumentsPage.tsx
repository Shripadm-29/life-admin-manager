import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient' // Make sure this path matches where you put supabaseClient.ts

// Define the shape of a file object from Supabase
interface FileObject {
  name: string;
  id: string;
  created_at: string;
  metadata: {
    mimetype: string;
    size: number;
  };
}

export function DocumentsPage() {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState<FileObject[]>([])
  const [message, setMessage] = useState('')

  // 1. Fetch the user's files when the component loads
  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // List files in the folder named after the user's ID
    const { data, error } = await supabase
      .storage
      .from('documents')
      .list(user.id + '/', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error) {
      console.error('Error fetching files:', error)
    } else {
      setFiles(data || [])
    }
  }

  // 2. Handle File Upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setMessage('')

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('User not logged in')

      // File path: <user_id>/<filename>
      const filePath = `${user.id}/${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          upsert: true // Overwrite if exists
        })

      if (uploadError) {
        throw uploadError
      }

      setMessage('Upload successful!')
      fetchFiles() // Refresh list
    } catch (error: any) {
      setMessage('Error uploading file: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // 3. Handle Delete
  const handleDelete = async (fileName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const filePath = `${user.id}/${fileName}`

      const { error } = await supabase.storage
        .from('documents')
        .remove([filePath])

      if (error) throw error

      fetchFiles() // Refresh list
    } catch (error: any) {
      alert('Error deleting file: ' + error.message)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Documents</h1>

      {/* Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload New Document</h2>
        <div className="flex gap-4 items-center">
          <input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          {uploading && <span className="text-blue-600">Uploading...</span>}
        </div>
        {message && <p className="mt-2 text-green-600 text-sm">{message}</p>}
      </div>

      {/* File List Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {files.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No documents found.</td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{file.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(file.metadata?.size / 1024).toFixed(2)} KB</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(file.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(file.name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}