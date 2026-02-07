import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { User } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Ban,
  RefreshCw,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const UsersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'reject' | 'suspend' | 'reactivate' | 'delete' | null;
    user: User | null;
  }>({ type: null, user: null });
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await adminApi.getUsers({
        page,
        limit: 20,
        accountState: statusFilter || undefined,
        search: searchTerm || undefined,
        sortOrder: 'desc',
      });
      setUsers(response.data.data.users);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleAction = async () => {
    if (!actionModal.type || !actionModal.user) return;

    setIsProcessing(true);
    try {
      switch (actionModal.type) {
        case 'approve':
          await adminApi.approveUser(actionModal.user.id);
          toast.success('User approved');
          break;
        case 'reject':
          await adminApi.rejectUser(actionModal.user.id, reason);
          toast.success('User rejected');
          break;
        case 'suspend':
          await adminApi.suspendUser(actionModal.user.id, reason);
          toast.success('User suspended');
          break;
        case 'reactivate':
          await adminApi.reactivateUser(actionModal.user.id);
          toast.success('User reactivated');
          break;
        case 'delete':
          await adminApi.deleteUser(actionModal.user.id);
          toast.success('User deleted');
          break;
      }
      setActionModal({ type: null, user: null });
      setReason('');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading users..." />;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        User Management
      </h1>

      {/* Filters */}
      <Card className="mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="unverified">Unverified</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
            <Button type="submit">Search</Button>
          </div>
        </form>
      </Card>

      {/* Users Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                        {user.firstName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={user.accountState} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize text-gray-700 dark:text-gray-300">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.accountState === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => setActionModal({ type: 'approve', user })}
                            leftIcon={<CheckCircle className="w-4 h-4" />}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setActionModal({ type: 'reject', user })}
                            leftIcon={<XCircle className="w-4 h-4" />}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {user.accountState === 'approved' && user.role === 'user' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActionModal({ type: 'suspend', user })}
                          leftIcon={<Ban className="w-4 h-4" />}
                        >
                          Suspend
                        </Button>
                      )}
                      {user.accountState === 'suspended' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActionModal({ type: 'reactivate', user })}
                          leftIcon={<RefreshCw className="w-4 h-4" />}
                        >
                          Reactivate
                        </Button>
                      )}
                      {user.role !== 'superadmin' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setActionModal({ type: 'delete', user })}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No users found
          </div>
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

      {/* Action Modal */}
      <Modal
        isOpen={actionModal.type !== null}
        onClose={() => {
          setActionModal({ type: null, user: null });
          setReason('');
        }}
        title={`${actionModal.type?.charAt(0).toUpperCase()}${actionModal.type?.slice(1)} User`}
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to {actionModal.type}{' '}
            <strong>{actionModal.user?.firstName} {actionModal.user?.lastName}</strong>?
          </p>

          {(actionModal.type === 'reject' || actionModal.type === 'suspend') && (
            <div>
              <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                placeholder="Provide a reason..."
              />
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setActionModal({ type: null, user: null });
                setReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant={actionModal.type === 'approve' || actionModal.type === 'reactivate' ? 'success' : 'danger'}
              onClick={handleAction}
              isLoading={isProcessing}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
