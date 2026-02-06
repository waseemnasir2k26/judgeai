import { AuditLog } from '../models/AuditLog.js';
import { Request } from 'express';
import { Types } from 'mongoose';
import { logger } from '../utils/logger.js';

export type AuditAction =
  | 'USER_REGISTERED'
  | 'USER_VERIFIED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_APPROVED'
  | 'USER_REJECTED'
  | 'USER_SUSPENDED'
  | 'USER_REACTIVATED'
  | 'USER_DELETED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'AI_CONFIG_UPDATED'
  | 'AI_CONFIG_TESTED'
  | 'ANALYSIS_CREATED'
  | 'ANALYSIS_COMPLETED'
  | 'ANALYSIS_FAILED'
  | 'ANALYSIS_DELETED'
  | 'FEEDBACK_SUBMITTED'
  | 'FEEDBACK_RESPONDED'
  | 'ADMIN_ACCESS';

interface AuditEntry {
  userId: Types.ObjectId | string;
  userEmail: string;
  action: AuditAction;
  resource: string;
  resourceId?: Types.ObjectId | string;
  details?: Record<string, unknown>;
  req?: Request;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const auditLog = new AuditLog({
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: entry.details,
      ipAddress: entry.req ? getClientIP(entry.req) : undefined,
      userAgent: entry.req?.headers['user-agent'],
    });

    await auditLog.save();
    logger.debug(`Audit log created: ${entry.action} by ${entry.userEmail}`);
  } catch (error) {
    logger.error('Failed to create audit log:', error);
    // Don't throw - audit logging shouldn't break the main flow
  }
}

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || '';
  }
  return req.socket.remoteAddress || '';
}

export async function getAuditLogs(options: {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const {
    userId,
    action,
    resource,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = options;

  const query: Record<string, unknown> = {};

  if (userId) {
    query.userId = new Types.ObjectId(userId);
  }

  if (action) {
    query.action = action;
  }

  if (resource) {
    query.resource = resource;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      (query.createdAt as Record<string, Date>).$gte = startDate;
    }
    if (endDate) {
      (query.createdAt as Record<string, Date>).$lte = endDate;
    }
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email firstName lastName')
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getUserActivity(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return AuditLog.find({
    userId: new Types.ObjectId(userId),
    createdAt: { $gte: startDate },
  })
    .sort({ createdAt: -1 })
    .lean();
}
