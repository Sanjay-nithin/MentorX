import { useState, useEffect } from 'react';
import Sidebar from '../../components/Dashboard/Sidebar/Sidebar';
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

  const handleDelete = async (resourceId, topic) => {
    // Show detailed confirmation dialog
    const confirmed = confirm(
      `⚠️ Delete "${topic}"?\n\n` +
      `This will permanently remove:\n` +
      `✓ PDF file from Cloudinary cloud storage\n` +
      `✓ Resource link from your MongoDB account\n\n` +
      `This action CANNOT be undone!`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(resourceId);
      const response = await deleteResource(resourceId);
      
      // Remove from local state
      setResources(resources.filter(r => r.resource_id !== resourceId));
      
      // Show detailed success message
      console.log('Delete response:', response);
      
      const cloudinaryStatus = response.cloudinary_deleted ? '✓ Removed' : '✗ Failed/Not Found';
      const mongodbStatus = response.mongodb_deleted ? '✓ Removed' : '✗ Failed';
      
      alert(
        `✅ Resource Deleted Successfully!\n\n` +
        `Topic: ${response.topic || topic}\n` +
        `Cloudinary Storage: ${cloudinaryStatus}\n` +
        `MongoDB Database: ${mongodbStatus}\n\n` +
        `The PDF and its link have been permanently removed.`
      );
    } catch (err) {
      console.error('Error deleting resource:', err);
      alert(
        `❌ Failed to Delete Resource\n\n` +
        `Error: ${err.message || 'Unknown error'}\n\n` +
        `The resource may still exist in cloud storage or database.\n` +
        `Please try again or contact support if the issue persists.`
      );
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
      <div className="flex min-h-screen bg-black">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <div className="min-h-screen p-6 pt-24 lg:pt-12">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <div className="min-h-screen p-6 pt-24 lg:pt-12">
          <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FileText className="w-10 h-10 text-white" />
            My Study Resources
          </h1>
          <p className="text-gray-400">
            Access your generated quiz notes and study materials
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-black border border-white/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-white" />
            <p className="text-white">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black border border-white/20 rounded-lg p-6 hover:border-white/40 transition-all duration-300">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-white" />
              <div>
                <p className="text-gray-400 text-sm">Total Resources</p>
                <p className="text-2xl font-bold text-white">{resources.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-black border border-white/20 rounded-lg p-6 hover:border-white/40 transition-all duration-300">
            <div className="flex items-center gap-3">
              <FileDown className="w-8 h-8 text-white" />
              <div>
                <p className="text-gray-400 text-sm">Total Size</p>
                <p className="text-2xl font-bold text-white">
                  {formatFileSize(resources.reduce((sum, r) => sum + (r.metadata?.file_size || 0), 0))}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-black border border-white/20 rounded-lg p-6 hover:border-white/40 transition-all duration-300">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-white" />
              <div>
                <p className="text-gray-400 text-sm">Latest Resource</p>
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
            <FileText className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">No Resources Yet</h2>
            <p className="text-gray-400 mb-6">
              Complete a quiz to generate your first study notes!
            </p>
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource, index) => (
              <div
                key={resource.resource_id}
                className="bg-black rounded-xl border border-white/20 overflow-hidden hover:border-white/40 transition-all duration-300"
              >
                {/* Card Header */}
                <div className="bg-black border-b border-white/20 p-6">
                  <div className="flex items-start justify-between">
                    <FileText className="w-12 h-12 text-white" />
                    <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs text-white font-medium">
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
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span>{formatDate(resource.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <FileDown className="w-4 h-4 text-gray-500" />
                      <span>{formatFileSize(resource.metadata?.file_size)}</span>
                      <span className="text-gray-600">•</span>
                      <span>{resource.metadata?.pages || 'N/A'} pages</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-white/10">
                    <button
                      onClick={() => handleView(resource.resource_url)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      title="View PDF"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>

                    <button
                      onClick={() => handleDownload(resource.resource_url, resource.topic)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>

                    <button
                      onClick={() => handleDelete(resource.resource_id, resource.topic)}
                      disabled={deletingId === resource.resource_id}
                      className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete PDF (removes from Cloudinary & MongoDB)"
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
      </div>
    </div>
  );
}
