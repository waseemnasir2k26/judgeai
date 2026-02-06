import { Router } from 'express';
import {
  submitFeedback,
  getFeedback,
  getUserFeedback,
} from '../controllers/feedbackController.js';
import { authenticate, approvedGuard } from '../middleware/auth.js';

const router = Router();

// All feedback routes require authentication and approval
router.use(authenticate, approvedGuard);

// Submit feedback for an analysis
router.post('/analysis/:analysisId', submitFeedback);

// Get feedback for an analysis
router.get('/analysis/:analysisId', getFeedback);

// Get user's feedback history
router.get('/my-feedback', getUserFeedback);

export default router;
