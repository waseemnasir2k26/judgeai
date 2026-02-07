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
  ArrowRight,
  BarChart3,
  Upload,
  Sparkles,
  Download,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Scale,
  FileSearch,
  MessageSquare,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    pending: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await analysisApi.list({ limit: 5 });
        // Handle both formats
        const data = response.data.data || response.data;
        setAnalyses(data.analyses || []);

        // Calculate stats from the list
        const all = data.analyses || [];
        setStats({
          total: all.length,
          completed: all.filter((a: Analysis) => a.status === 'completed').length,
          processing: all.filter((a: Analysis) => a.status === 'processing').length,
          pending: all.filter((a: Analysis) => a.status === 'pending').length,
        });
      } catch (error) {
        console.error('Failed to fetch analyses:', error);
        setAnalyses([]);
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
    <div className="animate-fade-in space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="mt-2 text-primary-100 text-sm md:text-base">
              Ready to analyze your legal documents with AI-powered insights
            </p>
          </div>
          <Link to="/analysis/new">
            <Button
              size="lg"
              className="bg-white text-primary-600 hover:bg-primary-50 shadow-md w-full md:w-auto"
              leftIcon={<PlusCircle className="w-5 h-5" />}
            >
              New Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* How to Use Guide */}
      <Card className="border-2 border-primary-100 dark:border-primary-900/50">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-4 md:p-6 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                How to Use JudgeAI
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Quick guide to get started
              </p>
            </div>
          </div>
          {showGuide ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showGuide && (
          <div className="px-4 md:px-6 pb-6 border-t border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-6">
              {/* Step 1 */}
              <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-5 md:p-6">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  1
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg">
                    <Upload className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Upload Documents
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload your legal PDF documents. You can upload multiple files at once.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-xl p-5 md:p-6">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  2
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-purple-600 flex items-center justify-center mb-4 shadow-lg">
                    <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    AI Analysis
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Our AI analyzes your documents and provides comprehensive legal insights.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-xl p-5 md:p-6">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  3
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-green-600 flex items-center justify-center mb-4 shadow-lg">
                    <Download className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Get Results
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Review the analysis, read summaries, and export your report.
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <Scale className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Legal Framework Analysis</span>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <FileSearch className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Cross-Document Insights</span>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <MessageSquare className="w-5 h-5 text-primary-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Adjustable Analysis Tone</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link to="/analysis/new">
                <Button leftIcon={<PlusCircle className="w-4 h-4" />}>
                  Start Your First Analysis
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 md:w-6 md:h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                Total Analyses
              </p>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.completed}
              </p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                Completed
              </p>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.processing + stats.pending}
              </p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                In Progress
              </p>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
              </p>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                Success Rate
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Analyses */}
      <Card padding="none" className="overflow-hidden">
        <CardHeader className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <span className="font-semibold">Recent Analyses</span>
          <Link
            to="/analysis"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {analyses.length === 0 ? (
            <div className="p-8 md:p-12 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No analyses yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Start by uploading your first legal document for AI-powered analysis
              </p>
              <Link to="/analysis/new">
                <Button size="lg" leftIcon={<PlusCircle className="w-5 h-5" />}>
                  Create Your First Analysis
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {analyses.map((analysis) => (
                <Link
                  key={analysis._id || analysis.id}
                  to={`/analysis/${analysis._id || analysis.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {analysis.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {analysis.documents?.length || 0} documents •{' '}
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                    <StatusBadge status={analysis.status} />
                    <ArrowRight className="w-5 h-5 text-gray-400 hidden md:block" />
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
