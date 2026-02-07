export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'superadmin';
  accountState: 'unverified' | 'pending' | 'pending_approval' | 'approved' | 'suspended' | 'rejected';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Analysis {
  id?: string;
  _id?: string;
  userId: string;
  title: string;
  caseNumber?: string;
  documents: Document[];
  config?: AnalysisConfig;
  configuration?: AnalysisConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  currentStep?: string;
  result?: AnalysisResult;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Document {
  id: string;
  filename: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  path?: string;
  extractedText?: string;
  pageCount?: number;
  order?: number;
}

export interface AnalysisConfig {
  tone: 'aggressive' | 'professional' | 'simple';
  depth: 'basic' | 'standard' | 'comprehensive';
  focusAreas: string[];
  caseType?: string;
  language: string;
}

export interface AnalysisResult {
  executiveSummary: string;
  documentSummaries: DocumentSummary[];
  crossAnalysis: string;
  legalFramework: string;
  judgmentAnalysis: string;
  timeline: TimelineEvent[];
  recommendations: string[];
  metadata: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}

export interface DocumentSummary {
  documentId?: string;
  filename: string;
  summary: string;
  keyPoints: string[];
  relevance?: string;
}

export interface TimelineEvent {
  date?: string;
  event: string;
  significance: string;
  source: string;
}

export interface Feedback {
  _id: string;
  analysisId: string;
  userId: string;
  rating: number;
  npsScore: number;
  categories: {
    accuracy: number;
    usefulness: number;
    clarity: number;
    speed: number;
  };
  comments?: string;
  improvements?: string;
  wouldRecommend: boolean;
  adminResponse?: string;
  adminRespondedAt?: string;
  createdAt: string;
}

export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  masterSystemPrompt: string;
  tonePrompts: {
    aggressive: string;
    professional: string;
    simple: string;
  };
  isConfigured: boolean;
  hasApiKey?: boolean;
  updatedAt?: string;
}

export interface AuditLog {
  _id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  pendingApprovals: number;
  approvedUsers: number;
  totalAnalyses: number;
  completedAnalyses: number;
  averageRating: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
