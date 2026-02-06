import mongoose, { Schema, Document } from 'mongoose';
import { IFeedback } from '../types/index.js';

export interface IFeedbackDocument extends Omit<IFeedback, '_id'>, Document {}

const feedbackSchema = new Schema<IFeedbackDocument>(
  {
    analysisId: {
      type: Schema.Types.ObjectId,
      ref: 'Analysis',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    npsScore: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    categories: {
      accuracy: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      usefulness: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      clarity: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      speed: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
    },
    comments: {
      type: String,
      maxlength: 2000,
    },
    improvements: {
      type: String,
      maxlength: 2000,
    },
    wouldRecommend: {
      type: Boolean,
      required: true,
    },
    adminResponse: {
      type: String,
      maxlength: 2000,
    },
    adminRespondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ analysisId: 1 }, { unique: true });
feedbackSchema.index({ userId: 1 });
feedbackSchema.index({ rating: 1 });
feedbackSchema.index({ createdAt: -1 });

export const Feedback = mongoose.model<IFeedbackDocument>('Feedback', feedbackSchema);
