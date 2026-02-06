import mongoose, { Schema, Document } from 'mongoose';
import { IAuditLog } from '../types/index.js';

export interface IAuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_REGISTERED',
        'USER_VERIFIED',
        'USER_LOGIN',
        'USER_LOGOUT',
        'USER_APPROVED',
        'USER_REJECTED',
        'USER_SUSPENDED',
        'USER_REACTIVATED',
        'USER_DELETED',
        'PASSWORD_RESET_REQUESTED',
        'PASSWORD_RESET_COMPLETED',
        'AI_CONFIG_UPDATED',
        'AI_CONFIG_TESTED',
        'ANALYSIS_CREATED',
        'ANALYSIS_COMPLETED',
        'ANALYSIS_FAILED',
        'ANALYSIS_DELETED',
        'FEEDBACK_SUBMITTED',
        'FEEDBACK_RESPONDED',
        'ADMIN_ACCESS',
      ],
    },
    resource: {
      type: String,
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

// Auto-delete logs older than 90 days
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
