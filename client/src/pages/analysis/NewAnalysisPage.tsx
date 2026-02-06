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
  const [caseNumber, setCaseNumber] = useState('');
  const [tone, setTone] = useState<'aggressive' | 'professional' | 'simple'>('professional');
  const [depth, setDepth] = useState<'basic' | 'standard' | 'comprehensive'>('standard');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [caseType, setCaseType] = useState('');

  const focusAreaOptions = [
    'Contract Terms',
    'Liability',
    'Damages',
    'Evidence',
    'Witness Statements',
    'Legal Precedents',
    'Procedural Issues',
    'Timeline',
    'Financial Records',
    'Expert Opinions',
  ];

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
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 20,
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
      if (caseNumber) formData.append('caseNumber', caseNumber);
      formData.append(
        'configuration',
        JSON.stringify({
          tone,
          depth,
          focusAreas,
          caseType,
          language: 'en',
        })
      );

      files.forEach((file) => {
        formData.append('documents', file);
      });

      const response = await analysisApi.create(formData);
      const analysisId = response.data.data.analysis.id;

      // Start the analysis
      await analysisApi.start(analysisId);

      toast.success('Analysis started!');
      navigate(`/analysis/${analysisId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create analysis');
      toast.error('Failed to create analysis');
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
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        New Analysis
      </h1>

      {/* Progress Steps */}
      <div className="flex items-center mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-medium ${
                s <= step
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  s < step
                    ? 'bg-primary-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Step 1: Upload Documents */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Documents
            </span>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {isDragActive
                  ? 'Drop files here...'
                  : 'Drag & drop PDF files here, or click to select'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Maximum 20 files, 50MB each
              </p>
            </div>

            {files.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Uploaded Documents ({files.length})
                </h4>
                {files.map((file, index) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500 w-6">
                        {index + 1}.
                      </span>
                      <FileText className="w-5 h-5 text-primary-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-5 h-5" />
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
        <Card>
          <CardHeader>
            <span className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configure Analysis
            </span>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              label="Analysis Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this analysis"
              required
            />

            <Input
              label="Case Number (Optional)"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g., 2024-CV-12345"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Analysis Tone
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['aggressive', 'professional', 'simple'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      tone === t
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {t}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t === 'aggressive' && 'Critical, thorough'}
                      {t === 'professional' && 'Balanced, formal'}
                      {t === 'simple' && 'Clear, accessible'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Analysis Depth
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['basic', 'standard', 'comprehensive'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      depth === d
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {d}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {d === 'basic' && 'Quick overview'}
                      {d === 'standard' && 'Detailed analysis'}
                      {d === 'comprehensive' && 'Exhaustive review'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Focus Areas (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {focusAreaOptions.map((area) => (
                  <button
                    key={area}
                    onClick={() =>
                      setFocusAreas((prev) =>
                        prev.includes(area)
                          ? prev.filter((a) => a !== area)
                          : [...prev, area]
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      focusAreas.includes(area)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Case Type (Optional)"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              placeholder="e.g., Contract Dispute, Personal Injury"
            />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Start */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <span className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Review & Start Analysis
            </span>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Title
                </h4>
                <p className="text-gray-900 dark:text-white">{title}</p>
              </div>
              {caseNumber && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Case Number
                  </h4>
                  <p className="text-gray-900 dark:text-white">{caseNumber}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Documents
                </h4>
                <p className="text-gray-900 dark:text-white">{files.length} files</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Tone
                </h4>
                <p className="text-gray-900 dark:text-white capitalize">{tone}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Depth
                </h4>
                <p className="text-gray-900 dark:text-white capitalize">{depth}</p>
              </div>
              {focusAreas.length > 0 && (
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Focus Areas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {focusAreas.map((area) => (
                      <span
                        key={area}
                        className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-sm"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                The analysis may take several minutes depending on the number and size of documents.
                You will be able to track progress in real-time.
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
            leftIcon={<Play className="w-4 h-4" />}
          >
            Start Analysis
          </Button>
        )}
      </div>
    </div>
  );
};
