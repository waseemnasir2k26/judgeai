import mongoose, { Schema, Document } from 'mongoose';
import { IVerificationCode } from '../types/index.js';

export interface IVerificationCodeDocument extends Omit<IVerificationCode, '_id'>, Document {}

const verificationCodeSchema = new Schema<IVerificationCodeDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['email_verification', 'password_reset'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - automatically delete expired codes
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationCodeSchema.index({ email: 1, type: 1 });

export const VerificationCode = mongoose.model<IVerificationCodeDocument>(
  'VerificationCode',
  verificationCodeSchema
);
