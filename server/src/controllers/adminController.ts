import { Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { AIConfig } from '../models/AIConfig.js';
import { Analysis } from '../models/Analysis.js';
import { Feedback } from '../models/Feedback.js';
import { AuthRequest } from '../types/index.js';
import { createAuditLog, getAuditLogs } from '../services/auditService.js';
import { testAIConfig } from '../services/openaiService.js';
import { sendApprovalEmail, sendRejectionEmail } from '../services/emailService.js';
import { logger } from '../utils/logger.js';

// Get dashboard stats
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalUsers,
      pendingApprovals,
      approvedUsers,
      totalAnalyses,
      completedAnalyses,
      averageRating,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ accountState: 'pending_approval' }),
      User.countDocuments({ accountState: 'approved' }),
      Analysis.countDocuments(),
      Analysis.countDocuments({ status: 'completed' }),
      Feedback.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
    ]);

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email firstName lastName accountState createdAt');

    const recentAnalyses = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'email firstName lastName')
      .select('title status createdAt completedAt');

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          pendingApprovals,
          approvedUsers,
          totalAnalyses,
          completedAnalyses,
          averageRating: averageRating[0]?.avgRating?.toFixed(1) || 0,
        },
        recentUsers,
        recentAnalyses,
      },
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    next(error);
  }
};

// Get all users
export const getUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      accountState,
      role,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: Record<string, unknown> = {};

    if (accountState) {
      query.accountState = accountState;
    }

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ [sortBy as string]: sortDirection })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get users error:', error);
    next(error);
  }
};

// Get pending approvals
export const getPendingApprovals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await User.find({ accountState: 'pending_approval' })
      .sort({ createdAt: 1 })
      .select('email firstName lastName createdAt');

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    logger.error('Get pending approvals error:', error);
    next(error);
  }
};

// Approve user
export const approveUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.accountState !== 'pending_approval') {
      res.status(400).json({
        success: false,
        message: 'User is not pending approval',
      });
      return;
    }

    user.accountState = 'approved';
    await user.save();

    await sendApprovalEmail(user.email, user.firstName);

    await createAuditLog({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'USER_APPROVED',
      resource: 'User',
      resourceId: user._id,
      details: { targetEmail: user.email },
      req,
    });

    res.json({
      success: true,
      message: 'User approved successfully',
      data: { user },
    });
  } catch (error) {
    logger.error('Approve user error:', error);
    next(error);
  }
};

// Reject user
export const rejectUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.accountState !== 'pending_approval') {
      res.status(400).json({
        success: false,
        message: 'User is not pending approval',
      });
      return;
    }

    user.accountState = 'rejected';
    await user.save();

    await sendRejectionEmail(user.email, user.firstName, reason);

    await createAuditLog({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'USER_REJECTED',
      resource: 'User',
      resourceId: user._id,
      details: { targetEmail: user.email, reason },
      req,
    });

    res.json({
      success: true,
      message: 'User rejected',
      data: { user },
    });
  } catch (error) {
    logger.error('Reject user error:', error);
    next(error);
  }
};

// Suspend user
export const suspendUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.role === 'superadmin') {
      res.status(403).json({
        success: false,
        message: 'Cannot suspend superadmin',
      });
      return;
    }

    user.accountState = 'suspended';
    user.refreshTokens = []; // Invalidate sessions
    await user.save();

    await createAuditLog({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'USER_SUSPENDED',
      resource: 'User',
      resourceId: user._id,
      details: { targetEmail: user.email, reason },
      req,
    });

    res.json({
      success: true,
      message: 'User suspended',
      data: { user },
    });
  } catch (error) {
    logger.error('Suspend user error:', error);
    next(error);
  }
};

// Reactivate user
export const reactivateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.accountState !== 'suspended') {
      res.status(400).json({
        success: false,
        message: 'User is not suspended',
      });
      return;
    }

    user.accountState = 'approved';
    await user.save();

    await createAuditLog({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'USER_REACTIVATED',
      resource: 'User',
      resourceId: user._id,
      details: { targetEmail: user.email },
      req,
    });

    res.json({
      success: true,
      message: 'User reactivated',
      data: { user },
    });
  } catch (error) {
    logger.error('Reactivate user error:', error);
    next(error);
  }
};

// Delete user
export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.role === 'superadmin') {
      res.status(403).json({
        success: false,
        message: 'Cannot delete superadmin',
      });
      return;
    }

    await User.deleteOne({ _id: userId });

    await createAuditLog({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'USER_DELETED',
      resource: 'User',
      resourceId: user._id,
      details: { targetEmail: user.email },
      req,
    });

    res.json({
      success: true,
      message: 'User deleted',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    next(error);
  }
};

// Get AI config
export const getAIConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let config = await AIConfig.findOne({ isActive: true });

    if (!config) {
      // Return default config structure without API key
      res.json({
        success: true,
        data: {
          config: {
            model: 'gpt-4-turbo-preview',
            temperature: 0.7,
            maxTokens: 4096,
            masterSystemPrompt: '',
            tonePrompts: {
              aggressive: '',
              professional: '',
              simple: '',
            },
            isConfigured: false,
          },
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        config: {
          model: config.aiModel,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          masterSystemPrompt: config.masterSystemPrompt,
          tonePrompts: config.tonePrompts,
          isConfigured: true,
          hasApiKey: !!config.openaiApiKey,
          updatedAt: config.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get AI config error:', error);
    next(error);
  }
};

// Update AI config
export const updateAIConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      openaiApiKey,
      model,
      temperature,
      maxTokens,
      masterSystemPrompt,
      tonePrompts,
    } = req.body;

    let config = await AIConfig.findOne({ isActive: true });

    if (!config) {
      config = new AIConfig({
        openaiApiKey: openaiApiKey || 'placeholder',
        lastUpdatedBy: req.user!._id,
      });
    }

    if (openaiApiKey) {
      config.openaiApiKey = openaiApiKey;
    }
    if (model) config.aiModel = model;
    if (temperature !== undefined) config.temperature = temperature;
    if (maxTokens) config.maxTokens = maxTokens;
    if (masterSystemPrompt) config.masterSystemPrompt = masterSystemPrompt;
    if (tonePrompts) {
      if (tonePrompts.aggressive) config.tonePrompts.aggressive = tonePrompts.aggressive;
      if (tonePrompts.professional) config.tonePrompts.professional = tonePrompts.professional;
      if (tonePrompts.simple) config.tonePrompts.simple = tonePrompts.simple;
    }
    config.lastUpdatedBy = req.user!._id;

    await config.save();

    await createAuditLog({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'AI_CONFIG_UPDATED',
      resource: 'AIConfig',
      resourceId: config._id,
      details: { changedFields: Object.keys(req.body) },
      req,
    });

    res.json({
      success: true,
      message: 'AI configuration updated',
      data: {
        config: {
          model: config.aiModel,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          hasApiKey: !!config.openaiApiKey,
        },
      },
    });
  } catch (error) {
    logger.error('Update AI config error:', error);
    next(error);
  }
};

// Test AI config
export const testAIConfiguration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { apiKey, model } = req.body;

    let testKey = apiKey;
    let testModel = model || 'gpt-4-turbo-preview';

    if (!testKey) {
      const config = await AIConfig.findOne({ isActive: true });
      if (!config) {
        res.status(400).json({
          success: false,
          message: 'No API key provided and no existing configuration found',
        });
        return;
      }
      testKey = config.getDecryptedApiKey();
      testModel = model || config.aiModel;
    }

    const isValid = await testAIConfig(testKey, testModel);

    await createAuditLog({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'AI_CONFIG_TESTED',
      resource: 'AIConfig',
      details: { success: isValid, model: testModel },
      req,
    });

    if (isValid) {
      res.json({
        success: true,
        message: 'AI configuration is valid',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'AI configuration test failed. Please check your API key and model.',
      });
    }
  } catch (error) {
    logger.error('Test AI config error:', error);
    next(error);
  }
};

// Get audit logs
export const getAuditLogsController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const result = await getAuditLogs({
      userId: userId as string,
      action: action as any,
      resource: resource as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    next(error);
  }
};

// Get feedback list
export const getFeedbackList = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [feedbacks, total] = await Promise.all([
      Feedback.find()
        .sort({ [sortBy as string]: sortDirection })
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'email firstName lastName')
        .populate('analysisId', 'title'),
      Feedback.countDocuments(),
    ]);

    // Get analytics
    const analytics = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          avgNps: { $avg: '$npsScore' },
          avgAccuracy: { $avg: '$categories.accuracy' },
          avgUsefulness: { $avg: '$categories.usefulness' },
          avgClarity: { $avg: '$categories.clarity' },
          avgSpeed: { $avg: '$categories.speed' },
          wouldRecommendCount: { $sum: { $cond: ['$wouldRecommend', 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        feedbacks,
        analytics: analytics[0] || {},
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get feedback list error:', error);
    next(error);
  }
};

// Respond to feedback
export const respondToFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { feedbackId } = req.params;
    const { response } = req.body;

    const feedback = await Feedback.findByIdAndUpdate(
      feedbackId,
      {
        adminResponse: response,
        adminRespondedAt: new Date(),
      },
      { new: true }
    );

    if (!feedback) {
      res.status(404).json({
        success: false,
        message: 'Feedback not found',
      });
      return;
    }

    await createAuditLog({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'FEEDBACK_RESPONDED',
      resource: 'Feedback',
      resourceId: feedback._id,
      req,
    });

    res.json({
      success: true,
      message: 'Response saved',
      data: { feedback },
    });
  } catch (error) {
    logger.error('Respond to feedback error:', error);
    next(error);
  }
};
