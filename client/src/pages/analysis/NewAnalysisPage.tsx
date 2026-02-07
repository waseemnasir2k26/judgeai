import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { analysisApi } from '../../services/api';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Upload,
  FileText,
  X,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Settings,
  Play,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FileWithPreview extends File {
  id: string;
  preview?: string;
}

export const NewAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Documents
  const [files, setFiles] = useState<FileWithPreview[]>([]);

  // Step 2: Configuration
  const [title, setTitle] = useState('');
  const [tone, setTone] = useState<'aggressive' | 'professional' | 'simple'>('professional');
  const [depth, setDepth] = useState<'basic' | 'standard' | 'comprehensive'>('standard');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      ...file,
      id: Math.random().toString(36).substr(2, 9),
    })) as FileWithPreview[];

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB per file
    maxFiles: 10,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Please upload at least one document');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title for the analysis');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('tone', tone);
      formData.append('depth', depth);

      files.forEach((file) => {
        formData.append('documents', file);
      });

      const response = await analysisApi.create(formData);

      // Handle our API response format
      const analysisId = response.data?.analysisId || response.data?.data?.analysisId || response.data?.id;

      if (analysisId) {
        toast.success('Analysis completed!');
        navigate(`/analysis/${analysisId}`);
      } else {
        // If no ID but we have a result, show success
        toast.success('Analysis completed!');
        navigate('/analysis');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.response?.data?.message || 'Failed to create analysis';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return files.length > 0;
    if (step === 2) return title.trim().length > 0;
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary-600" />
          New Analysis
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Upload your legal documents and let AI analyze them
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center mb-8">
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Configure' },
          { num: 3, label: 'Review' },
        ].map((s, i) => (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-medium transition-colors ${
                  s.num <= step
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {s.num}
              </div>
              <span className={`text-xs mt-1 ${s.num <= step ? 'text-primary-600' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div
                className={`flex-1 h-1 mx-3 rounded ${
                  s.num < step
                    ? 'bg-primary-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Step 1: Upload Documents */}
      {step === 1 && (
        <Card className="shadow-lg">
          <CardHeader>
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary-600" />
              Upload PDF Documents
            </span>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 md:p-12 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-[1.02]'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary-600" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {isDragActive ? 'Drop files here...' : 'Drag & drop PDF files'}
              </p>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                or click to browse
              </p>
              <p className="text-sm text-gray-400">
                Maximum 10 files, 10MB each
              </p>
            </div>

            {files.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Uploaded Documents ({files.length})
                </h4>
                {files.map((file, index) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-gray-400 w-6 flex-shrink-0">
                        {index + 1}.
                      </span>
                      <FileText className="w-5 h-5 text-primary-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure Analysis */}
      {step === 2 && (
        <Card className="shadow-lg">
          <CardHeader>
            <span className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-600" />
              Configure Analysis
            </span>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              label="Analysis Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Contract Review - Smith vs Johnson"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Analysis Tone
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: 'aggressive', label: 'Aggressive', desc: 'Critical, thorough analysis' },
                  { value: 'professional', label: 'Professional', desc: 'Balanced, formal tone' },
                  { value: 'simple', label: 'Simple', desc: 'Clear, easy to understand' },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value as any)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      tone === t.value
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Analysis Depth
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: 'basic', label: 'Basic', desc: 'Quick overview' },
                  { value: 'standard', label: 'Standard', desc: 'Detailed analysis' },
                  { value: 'comprehensive', label: 'Comprehensive', desc: 'Exhaustive review' },
                ].map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDepth(d.value as any)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      depth === d.value
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {d.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {d.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Start */}
      {step === 3 && (
        <Card className="shadow-lg">
          <CardHeader>
            <span className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary-600" />
              Review & Start Analysis
            </span>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Title
                </h4>
                <p className="text-gray-900 dark:text-white font-medium">{title}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Documents
                </h4>
                <p className="text-gray-900 dark:text-white font-medium">{files.length} PDF files</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Tone
                </h4>
                <p className="text-gray-900 dark:text-white font-medium capitalize">{tone}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Depth
                </h4>
                <p className="text-gray-900 dark:text-white font-medium capitalize">{depth}</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> The analysis may take 1-2 minutes depending on the number and size of documents.
                Please wait while our AI processes your files.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Previous
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            isLoading={isSubmitting}
            leftIcon={<Sparkles className="w-4 h-4" />}
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
          >
            {isSubmitting ? 'Analyzing...' : 'Start Analysis'}
          </Button>
        )}
      </div>
    </div>
  );
};
