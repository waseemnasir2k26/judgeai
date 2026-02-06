import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { analysisApi, feedbackApi } from '../../services/api';
import { Analysis, Feedback } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { PageLoader, Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import {
  FileText,
  Download,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  FileJson,
  MessageSquare,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AnalysisDetailPage: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedDocs, setExpandedDocs] = useState<string[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<Feedback | null>(null);

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackNps, setFeedbackNps] = useState(8);
  const [feedbackCategories, setFeedbackCategories] = useState({
    accuracy: 4,
    usefulness: 4,
    clarity: 4,
    speed: 4,
  });
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackImprovements, setFeedbackImprovements] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const fetchAnalysis = async () => {
    try {
      const response = await analysisApi.get(analysisId!);
      setAnalysis(response.data.data.analysis);

      // Check for existing feedback
      try {
        const feedbackRes = await feedbackApi.get(analysisId!);
        if (feedbackRes.data.data.feedback) {
          setExistingFeedback(feedbackRes.data.data.feedback);
        }
      } catch {}
    } catch (error) {
      toast.error('Failed to load analysis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [analysisId]);

  // Poll for progress if processing
  useEffect(() => {
    if (!analysis || analysis.status !== 'processing') return;

    const interval = setInterval(async () => {
      try {
        const response = await analysisApi.getProgress(analysisId!);
        const progress = response.data.data;

        setAnalysis((prev) =>
          prev
            ? {
                ...prev,
                status: progress.status,
                progress: progress.progress,
                currentStep: progress.currentStep,
                error: progress.error,
              }
            : null
        );

        if (progress.status === 'completed' || progress.status === 'failed') {
          clearInterval(interval);
          fetchAnalysis();
        }
      } catch (error) {
        console.error('Progress poll error:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [analysis?.status, analysisId]);

  const handleDownloadPDF = async () => {
    try {
      const response = await analysisApi.downloadReport(analysisId!);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JudgeAI_Report_${analysis?.title || 'Analysis'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded!');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const handleExportJSON = async () => {
    try {
      const response = await analysisApi.exportJson(analysisId!);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JudgeAI_Export_${analysis?.title || 'Analysis'}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('JSON exported!');
    } catch (error) {
      toast.error('Failed to export JSON');
    }
  };

  const handleSubmitFeedback = async () => {
    setIsSubmittingFeedback(true);
    try {
      await feedbackApi.submit(analysisId!, {
        rating: feedbackRating,
        npsScore: feedbackNps,
        categories: feedbackCategories,
        comments: feedbackComments,
        improvements: feedbackImprovements,
        wouldRecommend,
      });
      toast.success('Feedback submitted!');
      setShowFeedbackModal(false);
      fetchAnalysis();
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading analysis..." />;
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
          Analysis not found
        </h2>
        <Link to="/analysis">
          <Button variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Analyses
          </Button>
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'summary', label: 'Executive Summary' },
    { id: 'documents', label: 'Document Summaries' },
    { id: 'cross', label: 'Cross-Analysis' },
    { id: 'legal', label: 'Legal Framework' },
    { id: 'judgment', label: 'Judgment Analysis' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'recommendations', label: 'Recommendations' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/analysis"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Analyses
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {analysis.title}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              {analysis.caseNumber && <span>Case: {analysis.caseNumber}</span>}
              <span>{analysis.documents.length} documents</span>
              <span>{new Date(analysis.createdAt).toLocaleDateString()}</span>
              <StatusBadge status={analysis.status} />
            </div>
          </div>
          {analysis.status === 'completed' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFeedbackModal(true)}
                leftIcon={<MessageSquare className="w-4 h-4" />}
              >
                {existingFeedback ? 'Edit Feedback' : 'Give Feedback'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                leftIcon={<FileJson className="w-4 h-4" />}
              >
                Export JSON
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPDF}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Processing State */}
      {(analysis.status === 'pending' || analysis.status === 'processing') && (
        <Card className="text-center py-12">
          <Spinner size="lg" className="mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            {analysis.status === 'pending' ? 'Waiting to Start' : 'Processing Analysis'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {analysis.currentStep || 'Preparing...'}
          </p>
          <div className="max-w-md mx-auto">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-500"
                style={{ width: `${analysis.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{analysis.progress}% complete</p>
          </div>
        </Card>
      )}

      {/* Failed State */}
      {analysis.status === 'failed' && (
        <Card className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
            Analysis Failed
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {analysis.error || 'An error occurred during processing'}
          </p>
        </Card>
      )}

      {/* Completed State - Results */}
      {analysis.status === 'completed' && analysis.result && (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <Card>
            {activeTab === 'summary' && (
              <div className="prose dark:prose-invert max-w-none">
                <h2 className="text-xl font-bold mb-4">Executive Summary</h2>
                <div className="whitespace-pre-wrap">{analysis.result.executiveSummary}</div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Document Summaries</h2>
                {analysis.result.documentSummaries.map((doc) => (
                  <div
                    key={doc.documentId}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <button
                      onClick={() =>
                        setExpandedDocs((prev) =>
                          prev.includes(doc.documentId)
                            ? prev.filter((id) => id !== doc.documentId)
                            : [...prev, doc.documentId]
                        )
                      }
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary-600" />
                        <span className="font-medium">{doc.filename}</span>
                      </div>
                      {expandedDocs.includes(doc.documentId) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    {expandedDocs.includes(doc.documentId) && (
                      <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                          {doc.summary}
                        </p>
                        {doc.keyPoints.length > 0 && (
                          <>
                            <h4 className="font-medium mb-2">Key Points:</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {doc.keyPoints.map((point, i) => (
                                <li key={i} className="text-sm text-gray-600 dark:text-gray-400">
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        {doc.relevance && (
                          <p className="mt-4 text-sm text-gray-500 italic">
                            Relevance: {doc.relevance}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'cross' && (
              <div className="prose dark:prose-invert max-w-none">
                <h2 className="text-xl font-bold mb-4">Cross-Document Analysis</h2>
                <div className="whitespace-pre-wrap">{analysis.result.crossAnalysis}</div>
              </div>
            )}

            {activeTab === 'legal' && (
              <div className="prose dark:prose-invert max-w-none">
                <h2 className="text-xl font-bold mb-4">Legal Framework</h2>
                <div className="whitespace-pre-wrap">{analysis.result.legalFramework}</div>
              </div>
            )}

            {activeTab === 'judgment' && (
              <div className="prose dark:prose-invert max-w-none">
                <h2 className="text-xl font-bold mb-4">Judgment Analysis</h2>
                <div className="whitespace-pre-wrap">{analysis.result.judgmentAnalysis}</div>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Timeline of Events</h2>
                {analysis.result.timeline.length === 0 ? (
                  <p className="text-gray-500">No timeline events extracted.</p>
                ) : (
                  <div className="space-y-4">
                    {analysis.result.timeline.map((event, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-primary-600" />
                          {index < analysis.result!.timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-primary-600 dark:text-primary-400">
                            {event.date || 'Date Unknown'}
                          </p>
                          <p className="text-gray-900 dark:text-white mt-1">
                            {event.event}
                          </p>
                          {event.significance && (
                            <p className="text-sm text-gray-500 mt-1">
                              Significance: {event.significance}
                            </p>
                          )}
                          {event.source && (
                            <p className="text-xs text-gray-400 mt-1">
                              Source: {event.source}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div>
                <h2 className="text-xl font-bold mb-4">Recommendations</h2>
                {analysis.result.recommendations.length === 0 ? (
                  <p className="text-gray-500">No recommendations generated.</p>
                ) : (
                  <ol className="space-y-4">
                    {analysis.result.recommendations.map((rec, index) => (
                      <li key={index} className="flex gap-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <p className="text-gray-700 dark:text-gray-300 pt-1">{rec}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </Card>

          {/* Metadata */}
          {analysis.result.metadata && (
            <div className="mt-6 flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Processing time: {Math.round(analysis.result.metadata.processingTime / 1000)}s
              </span>
              <span>Tokens used: {analysis.result.metadata.tokensUsed.toLocaleString()}</span>
              <span>Model: {analysis.result.metadata.model}</span>
            </div>
          )}
        </>
      )}

      {/* Feedback Modal */}
      <Modal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        title="Share Your Feedback"
        size="lg"
      >
        <div className="space-y-6">
          {/* Overall Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">Overall Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFeedbackRating(star)}
                  className={`p-1 ${
                    star <= feedbackRating ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                >
                  <Star className="w-8 h-8 fill-current" />
                </button>
              ))}
            </div>
          </div>

          {/* NPS Score */}
          <div>
            <label className="block text-sm font-medium mb-2">
              How likely are you to recommend JudgeAI? (0-10)
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={feedbackNps}
              onChange={(e) => setFeedbackNps(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Not likely</span>
              <span className="font-medium text-primary-600">{feedbackNps}</span>
              <span>Very likely</span>
            </div>
          </div>

          {/* Category Ratings */}
          <div className="grid grid-cols-2 gap-4">
            {(['accuracy', 'usefulness', 'clarity', 'speed'] as const).map((cat) => (
              <div key={cat}>
                <label className="block text-sm font-medium mb-1 capitalize">{cat}</label>
                <select
                  value={feedbackCategories[cat]}
                  onChange={(e) =>
                    setFeedbackCategories((prev) => ({
                      ...prev,
                      [cat]: Number(e.target.value),
                    }))
                  }
                  className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} - {n === 1 ? 'Poor' : n === 5 ? 'Excellent' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Would Recommend */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wouldRecommend}
                onChange={(e) => setWouldRecommend(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary-600"
              />
              <span className="text-sm">I would recommend JudgeAI to colleagues</span>
            </label>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium mb-1">Comments (Optional)</label>
            <textarea
              value={feedbackComments}
              onChange={(e) => setFeedbackComments(e.target.value)}
              rows={3}
              className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
              placeholder="Share your thoughts..."
            />
          </div>

          {/* Improvements */}
          <div>
            <label className="block text-sm font-medium mb-1">Suggestions for Improvement (Optional)</label>
            <textarea
              value={feedbackImprovements}
              onChange={(e) => setFeedbackImprovements(e.target.value)}
              rows={2}
              className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
              placeholder="How can we improve?"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowFeedbackModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitFeedback} isLoading={isSubmittingFeedback}>
              Submit Feedback
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
