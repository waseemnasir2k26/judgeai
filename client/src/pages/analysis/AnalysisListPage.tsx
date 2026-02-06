import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analysisApi } from '../../services/api';
import { Analysis } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import {
  PlusCircle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AnalysisListPage: React.FC = () => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAnalyses = async () => {
    try {
      const response = await analysisApi.list({
        page,
        limit: 10,
        status: statusFilter || undefined,
        sortOrder: 'desc',
      });
      setAnalyses(response.data.data.analyses);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
      toast.error('Failed to load analyses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [page, statusFilter]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this analysis?')) {
      return;
    }

    try {
      await analysisApi.delete(id);
      toast.success('Analysis deleted');
      fetchAnalyses();
    } catch (error) {
      toast.error('Failed to delete analysis');
    }
  };

  const filteredAnalyses = analyses.filter((analysis) =>
    analysis.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <PageLoader message="Loading analyses..." />;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Analyses
        </h1>
        <Link to="/analysis/new">
          <Button leftIcon={<PlusCircle className="w-4 h-4" />}>
            New Analysis
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search analyses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Analysis List */}
      {filteredAnalyses.length === 0 ? (
        <Card className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No analyses found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm || statusFilter
              ? 'Try adjusting your filters'
              : 'Start by creating your first analysis'}
          </p>
          <Link to="/analysis/new">
            <Button leftIcon={<PlusCircle className="w-4 h-4" />}>
              New Analysis
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnalyses.map((analysis) => (
            <Link key={analysis._id} to={`/analysis/${analysis._id}`}>
              <Card hover className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {analysis.title}
                    </h3>
                    <StatusBadge status={analysis.status} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{analysis.documents.length} documents</span>
                    <span>•</span>
                    <span>
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </span>
                    {analysis.caseNumber && (
                      <>
                        <span>•</span>
                        <span>{analysis.caseNumber}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(analysis._id, e)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
