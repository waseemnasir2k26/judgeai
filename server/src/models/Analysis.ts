import mongoose, { Schema, Document } from 'mongoose';
import { IAnalysis, IDocument, IAnalysisConfig, IAnalysisResult } from '../types/index.js';

export interface IAnalysisDocument extends Omit<IAnalysis, '_id'>, Document {}

const documentSchema = new Schema<IDocument>(
  {
    id: { type: String, required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    extractedText: { type: String },
    pageCount: { type: Number },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const configurationSchema = new Schema<IAnalysisConfig>(
  {
    tone: {
      type: String,
      enum: ['aggressive', 'professional', 'simple'],
      default: 'professional',
    },
    depth: {
      type: String,
      enum: ['basic', 'standard', 'comprehensive'],
      default: 'standard',
    },
    focusAreas: [{ type: String }],
    caseType: { type: String },
    language: { type: String, default: 'en' },
  },
  { _id: false }
);

const documentSummarySchema = new Schema(
  {
    documentId: { type: String, required: true },
    filename: { type: String, required: true },
    summary: { type: String, required: true },
    keyPoints: [{ type: String }],
    relevance: { type: String },
  },
  { _id: false }
);

const timelineEventSchema = new Schema(
  {
    date: { type: String },
    event: { type: String, required: true },
    significance: { type: String },
    source: { type: String },
  },
  { _id: false }
);

const resultSchema = new Schema<IAnalysisResult>(
  {
    executiveSummary: { type: String },
    documentSummaries: [documentSummarySchema],
    crossAnalysis: { type: String },
    legalFramework: { type: String },
    judgmentAnalysis: { type: String },
    timeline: [timelineEventSchema],
    recommendations: [{ type: String }],
    metadata: {
      processingTime: { type: Number },
      tokensUsed: { type: Number },
      model: { type: String },
    },
  },
  { _id: false }
);

const analysisSchema = new Schema<IAnalysisDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    caseNumber: {
      type: String,
      trim: true,
    },
    documents: [documentSchema],
    configuration: {
      type: configurationSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    currentStep: {
      type: String,
    },
    result: resultSchema,
    error: {
      type: String,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

analysisSchema.index({ userId: 1, createdAt: -1 });
analysisSchema.index({ status: 1 });

export const Analysis = mongoose.model<IAnalysisDocument>('Analysis', analysisSchema);
