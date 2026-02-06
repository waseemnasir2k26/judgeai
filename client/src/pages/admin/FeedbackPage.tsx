import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import {
  Star,
  MessageSquare,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  FileText,
  Reply,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Feedback {
  _id: string;
  analysisId: {
    _id: string;
    title: string;
  };
  userId: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  rating: number;
  npsScore: number;
  categories: {
    accuracy: number;
    speed: number;
    usability: number;
    quality: number;
  };
  liked: string[];
  disliked: string[];
  suggestions: string;
  wouldRecommend: boolean;
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
}

interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  averageNps: number;
  categoryAverages: {
    accuracy: number;
    speed: number;
    usability: number;
    quality: number;
  };
  recommendationRate: number;
}

export const FeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const fetchFeedback = async () => {
    try {
      const [feedbackRes, statsRes] = await Promise.all([
        adminApi.getFeedback({ page, limit: 10 }),
        adminApi.getFeedbackStats(),
      ]);
      setFeedbacks(feedbackRes.data.data.feedback);
      setTotalPages(feedbackRes.data.data.pagination.pages);
      setStats(statsRes.data.data.stats);
    } catch (error) {
      toast.error('Failed to load feedback');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [page]);

  const handleRespond = async () => {
    if (!selectedFeedback || !responseText.trim()) return;

    setIsResponding(true);
    try {
      await adminApi.respondToFeedback(selectedFeedback._id, responseText);
      toast.success('Response sent');
      setSelectedFeedback(null);
      setResponseText('');
      fetchFeedback();
    } catch (error) {
      toast.error('Failed to send response');
    } finally {
      setIsResponding(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const getNpsColor = (score: number) => {
    if (score >= 9) return 'text-green-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return <PageLoader message="Loading feedback..." />;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Feedback Dashboard
      </h1>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalFeedback}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Feedback
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.averageRating.toFixed(1)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Rating
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.averageNps.toFixed(1)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg NPS</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ThumbsUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(stats.recommendationRate * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Would Recommend
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Category Averages */}
      {stats && (
        <Card className="mb-6">
          <CardHeader>Category Breakdown</CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Object.entries(stats.categoryAverages).map(([category, value]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
                      {category}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {value.toFixed(1)}/5
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${(value / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback List */}
      <Card padding="none">
        <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
          Recent Feedback
        </CardHeader>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {feedbacks.map((feedback) => (
            <div
              key={feedback._id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    {renderStars(feedback.rating)}
                    <span className={`font-bold ${getNpsColor(feedback.npsScore)}`}>
                      NPS: {feedback.npsScore}
                    </span>
                    {feedback.wouldRecommend ? (
                      <ThumbsUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <ThumbsDown className="w-4 h-4 text-red-500" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <User className="w-4 h-4" />
                    <span>
                      {feedback.userId.firstName} {feedback.userId.lastName}
                    </span>
                    <span>-</span>
                    <FileText className="w-4 h-4" />
                    <span>{feedback.analysisId?.title || 'Unknown Analysis'}</span>
                  </div>

                  {feedback.liked.length > 0 && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-green-600">Liked: </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {feedback.liked.join(', ')}
                      </span>
                    </div>
                  )}

                  {feedback.disliked.length > 0 && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-red-600">Disliked: </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {feedback.disliked.join(', ')}
                      </span>
                    </div>
                  )}

                  {feedback.suggestions && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                      "{feedback.suggestions}"
                    </p>
                  )}

                  {feedback.adminResponse && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                        <Reply className="w-4 h-4" />
                        Admin Response
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {feedback.adminResponse}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </div>
                  {!feedback.adminResponse && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedFeedback(feedback)}
                      leftIcon={<Reply className="w-4 h-4" />}
                    >
                      Respond
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {feedbacks.length === 0 && (
          <div className="p-12 text-center text-gray-500">No feedback yet</div>
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

      {/* Response Modal */}
      <Modal
        isOpen={selectedFeedback !== null}
        onClose={() => {
          setSelectedFeedback(null);
          setResponseText('');
        }}
        title="Respond to Feedback"
      >
        <div className="space-y-4">
          {selectedFeedback && (
            <>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedFeedback.rating)}
                  <span className="text-sm text-gray-500">
                    by {selectedFeedback.userId.firstName} {selectedFeedback.userId.lastName}
                  </span>
                </div>
                {selectedFeedback.suggestions && (
                  <p className="text-sm italic text-gray-600 dark:text-gray-400">
                    "{selectedFeedback.suggestions}"
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Your Response</label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Thank the user and address their feedback..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFeedback(null);
                    setResponseText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRespond}
                  isLoading={isResponding}
                  disabled={!responseText.trim()}
                >
                  Send Response
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
