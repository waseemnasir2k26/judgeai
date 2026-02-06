import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analysisApi } from '../services/api';
import { Analysis } from '../types';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { PageLoader } from '../components/ui/Spinner';
import {
  PlusCircle,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  BarChart3,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    pending: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await analysisApi.list({ limit: 5, sortOrder: 'desc' });
        const data = response.data.data;
        setAnalyses(data.analyses);

        // Calculate stats
        const allAnalyses = await analysisApi.list({ limit: 1000 });
        const all = allAnalyses.data.data.analyses;
        setStats({
          total: all.length,
          completed: all.filter((a: Analysis) => a.status === 'completed').length,
          processing: all.filter((a: Analysis) => a.status === 'processing').length,
          pending: all.filter((a: Analysis) => a.status === 'pending').length,
        });
      } catch (error) {
        console.error('Failed to fetch analyses:', error);
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Here's an overview of your legal analysis activities
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <Link to="/analysis/new">
          <Button size="lg" leftIcon={<PlusCircle className="w-5 h-5" />}>
            New Analysis
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Analyses
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.completed}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Completed
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
                {stats.processing + stats.pending}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                In Progress
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Completion Rate
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Analyses */}
      <Card padding="none">
        <CardHeader className="p-6 border-b border-gray-200 dark:border-gray-700">
          <span>Recent Analyses</span>
          <Link
            to="/analysis"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No analyses yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start by creating your first legal analysis
              </p>
              <Link to="/analysis/new">
                <Button leftIcon={<PlusCircle className="w-4 h-4" />}>
                  New Analysis
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {analyses.map((analysis) => (
                <Link
                  key={analysis._id}
                  to={`/analysis/${analysis._id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {analysis.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {analysis.documents.length} documents •{' '}
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={analysis.status} />
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
