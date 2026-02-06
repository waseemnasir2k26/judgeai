import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { DashboardStats, User, Analysis } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import {
  Users,
  FileText,
  Star,
  Clock,
  CheckCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await adminApi.getDashboard();
        const data = response.data.data;
        setStats(data.stats);
        setRecentUsers(data.recentUsers);
        setRecentAnalyses(data.recentAnalyses);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return <PageLoader message="Loading dashboard..." />;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Admin Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalUsers || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Users
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.pendingApprovals || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pending Approvals
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalAnalyses || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Analyses
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.averageRating || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Average Rating
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <Card padding="none">
          <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Pending Approvals
            </span>
            <Link
              to="/admin/users?status=pending_approval"
              className="text-sm text-primary-600 hover:underline"
            >
              View All
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentUsers.filter((u) => u.accountState === 'pending_approval').length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No pending approvals
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentUsers
                  .filter((u) => u.accountState === 'pending_approval')
                  .slice(0, 5)
                  .map((user) => (
                    <div key={user.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <Link to={`/admin/users`}>
                        <Button size="sm">Review</Button>
                      </Link>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Analyses */}
        <Card padding="none">
          <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Recent Analyses
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {recentAnalyses.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No analyses yet
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentAnalyses.slice(0, 5).map((analysis) => (
                  <div key={analysis._id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {analysis.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        by {analysis.userId?.email}
                      </p>
                    </div>
                    <StatusBadge status={analysis.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card padding="none">
          <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Recent Users
            </span>
            <Link
              to="/admin/users"
              className="text-sm text-primary-600 hover:underline"
            >
              View All
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between">
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
                  <StatusBadge status={user.accountState} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>Quick Actions</CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/users?status=pending_approval" className="block">
              <Button variant="outline" className="w-full justify-between">
                Review Pending Users
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/admin/ai-config" className="block">
              <Button variant="outline" className="w-full justify-between">
                Configure AI Settings
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/admin/feedback" className="block">
              <Button variant="outline" className="w-full justify-between">
                View Feedback
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/admin/audit-logs" className="block">
              <Button variant="outline" className="w-full justify-between">
                View Audit Logs
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
