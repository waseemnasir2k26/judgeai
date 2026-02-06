import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageLoader } from '../../components/ui/Spinner';
import {
  Search,
  Filter,
  Clock,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AuditLog {
  _id: string;
  action: string;
  userId: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  targetType: string;
  targetId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const response = await adminApi.getAuditLogs({
        page,
        limit: 20,
        action: actionFilter || undefined,
        userId: searchTerm || undefined,
      });
      setLogs(response.data.data.logs);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('reject') || action.includes('suspend')) {
      return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    }
    if (action.includes('approve') || action.includes('create') || action.includes('reactivate')) {
      return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    }
    if (action.includes('update') || action.includes('edit')) {
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    }
    return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return <PageLoader message="Loading audit logs..." />;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Audit Logs
      </h1>

      {/* Filters */}
      <Card className="mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Actions</option>
              <option value="user_approve">User Approve</option>
              <option value="user_reject">User Reject</option>
              <option value="user_suspend">User Suspend</option>
              <option value="user_reactivate">User Reactivate</option>
              <option value="user_delete">User Delete</option>
              <option value="ai_config_update">AI Config Update</option>
              <option value="analysis_create">Analysis Create</option>
              <option value="analysis_delete">Analysis Delete</option>
            </select>
            <Button type="submit">Search</Button>
          </div>
        </form>
      </Card>

      {/* Logs List */}
      <Card padding="none">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {logs.map((log) => (
            <div
              key={log._id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(
                          log.action
                        )}`}
                      >
                        {formatAction(log.action)}
                      </span>
                      {log.targetType && (
                        <span className="text-sm text-gray-500">
                          on {log.targetType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <User className="w-4 h-4" />
                      {log.userId ? (
                        <span>
                          {log.userId.firstName} {log.userId.lastName} ({log.userId.email})
                        </span>
                      ) : (
                        <span>System</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">{log.ipAddress}</div>
                  </div>
                  {expandedLog === log._id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedLog === log._id && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Target ID:</span>
                      <span className="ml-2 font-mono text-gray-900 dark:text-white">
                        {log.targetId || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">User Agent:</span>
                      <span className="ml-2 text-gray-900 dark:text-white truncate block">
                        {log.userAgent || 'N/A'}
                      </span>
                    </div>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-3">
                      <span className="text-gray-500">Additional Data:</span>
                      <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {logs.length === 0 && (
          <div className="p-12 text-center text-gray-500">No audit logs found</div>
        )}
      </Card>

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
