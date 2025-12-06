import { useState, useEffect } from 'react';
import { getMyResources, deleteResource } from '../../services/service';
import { FileText, Download, Trash2, Eye, Calendar, FileDown, AlertCircle } from 'lucide-react';

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMyResources();
      setResources(data.resources || []);
    } catch (err) {
      setError(err.message || 'Failed to load resources');
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resourceId) => {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(resourceId);
      await deleteResource(resourceId);
      // Remove from local state
      setResources(resources.filter(r => r.resource_id !== resourceId));
    } catch (err) {
      alert('Failed to delete resource: ' + err.message);
      console.error('Error deleting resource:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async (url, topic) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${topic.replace(/[^a-z0-9]/gi, '_')}_notes.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert('Failed to download: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FileText className="w-10 h-10 text-blue-400" />
            My Study Resources
          </h1>
          <p className="text-gray-300">
            Access your generated quiz notes and study materials
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-gray-300 text-sm">Total Resources</p>
                <p className="text-2xl font-bold text-white">{resources.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="flex items-center gap-3">
              <FileDown className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-gray-300 text-sm">Total Size</p>
                <p className="text-2xl font-bold text-white">
                  {formatFileSize(resources.reduce((sum, r) => sum + (r.metadata?.file_size || 0), 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-gray-300 text-sm">Latest Resource</p>
                <p className="text-lg font-bold text-white">
                  {resources.length > 0
                    ? formatDate(resources[resources.length - 1]?.created_at).split(',')[0]
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        {resources.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-20 h-20 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-300 mb-2">No Resources Yet</h2>
            <p className="text-gray-400 mb-6">
              Complete a quiz to generate your first study notes!
            </p>
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <div
                key={resource.resource_id}
                className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                  <div className="flex items-start justify-between">
                    <FileText className="w-12 h-12 text-white" />
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs text-white font-medium">
                      PDF
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-4 line-clamp-2">
                    {resource.topic}
                  </h3>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4">
                  {/* Metadata */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(resource.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <FileDown className="w-4 h-4 text-gray-400" />
                      <span>{formatFileSize(resource.metadata?.file_size)}</span>
                      <span className="text-gray-500">•</span>
                      <span>{resource.metadata?.pages || 'N/A'} pages</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-white/10">
                    <button
                      onClick={() => handleView(resource.resource_url)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      title="View PDF"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>

                    <button
                      onClick={() => handleDownload(resource.resource_url, resource.topic)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>

                    <button
                      onClick={() => handleDelete(resource.resource_id)}
                      disabled={deletingId === resource.resource_id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete PDF"
                    >
                      {deletingId === resource.resource_id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
