import { Request } from 'express';
import { Types } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'superadmin';
  accountState: 'unverified' | 'pending_approval' | 'approved' | 'suspended' | 'rejected';
  isEmailVerified: boolean;
  refreshTokens: string[];
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVerificationCode {
  _id: Types.ObjectId;
  email: string;
  code: string;
  type: 'email_verification' | 'password_reset';
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

export interface IAIConfig {
  _id: Types.ObjectId;
  openaiApiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  masterSystemPrompt: string;
  tonePrompts: {
    aggressive: string;
    professional: string;
    simple: string;
  };
  isActive: boolean;
  lastUpdatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalysis {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  caseNumber?: string;
  documents: IDocument[];
  configuration: IAnalysisConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
  result?: IAnalysisResult;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocument {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  extractedText?: string;
  pageCount?: number;
  order: number;
}

export interface IAnalysisConfig {
  tone: 'aggressive' | 'professional' | 'simple';
  depth: 'basic' | 'standard' | 'comprehensive';
  focusAreas: string[];
  caseType?: string;
  language: string;
}

export interface IAnalysisResult {
  executiveSummary: string;
  documentSummaries: IDocumentSummary[];
  crossAnalysis: string;
  legalFramework: string;
  judgmentAnalysis: string;
  timeline: ITimelineEvent[];
  recommendations: string[];
  metadata: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}

export interface IDocumentSummary {
  documentId: string;
  filename: string;
  summary: string;
  keyPoints: string[];
  relevance: string;
}

export interface ITimelineEvent {
  date?: string;
  event: string;
  significance: string;
  source: string;
}

export interface IFeedback {
  _id: Types.ObjectId;
  analysisId: Types.ObjectId;
  userId: Types.ObjectId;
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
  adminRespondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuditLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: Types.ObjectId;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  accountState: string;
}
