import { Response, NextFunction } from 'express';
import { Feedback } from '../models/Feedback.js';
import { Analysis } from '../models/Analysis.js';
import { AuthRequest } from '../types/index.js';
import { createAuditLog } from '../services/auditService.js';
import { logger } from '../utils/logger.js';

// Create or update feedback
export const submitFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { analysisId } = req.params;
    const {
      rating,
      npsScore,
      categories,
      comments,
      improvements,
      wouldRecommend,
    } = req.body;

    // Verify analysis exists and belongs to user
    const analysis = await Analysis.findOne({
      _id: analysisId,
      userId: req.user!._id,
      status: 'completed',
    });

    if (!analysis) {
      res.status(404).json({
        success: false,
        message: 'Analysis not found or not completed',
      });
      return;
    }

    // Check if feedback already exists
    let feedback = await Feedback.findOne({
      analysisId,
      userId: req.user!._id,
    });

    if (feedback) {
      // Update existing feedback
      feedback.rating = rating;
      feedback.npsScore = npsScore;
      feedback.categories = categories;
      feedback.comments = comments;
      feedback.improvements = improvements;
      feedback.wouldRecommend = wouldRecommend;
      await feedback.save();
    } else {
      // Create new feedback
      feedback = new Feedback({
        analysisId,
        userId: req.user!._id,
        rating,
        npsScore,
        categories,
        comments,
        improvements,
        wouldRecommend,
      });
      await feedback.save();
    }

    await createAuditLog({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'FEEDBACK_SUBMITTED',
      resource: 'Feedback',
      resourceId: feedback._id,
      details: { analysisId, rating, npsScore },
      req,
    });

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: { feedback },
    });
  } catch (error) {
    logger.error('Submit feedback error:', error);
    next(error);
  }
};

// Get feedback for an analysis
export const getFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { analysisId } = req.params;

    const feedback = await Feedback.findOne({
      analysisId,
      userId: req.user!._id,
    });

    res.json({
      success: true,
      data: { feedback },
    });
  } catch (error) {
    logger.error('Get feedback error:', error);
    next(error);
  }
};

// Get user's feedback history
export const getUserFeedback = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [feedbacks, total] = await Promise.all([
      Feedback.find({ userId: req.user!._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('analysisId', 'title'),
      Feedback.countDocuments({ userId: req.user!._id }),
    ]);

    res.json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get user feedback error:', error);
    next(error);
  }
};
