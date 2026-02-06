import { Router } from 'express';
import {
  getDashboardStats,
  getUsers,
  getPendingApprovals,
  approveUser,
  rejectUser,
  suspendUser,
  reactivateUser,
  deleteUser,
  getAIConfig,
  updateAIConfig,
  testAIConfiguration,
  getAuditLogsController,
  getFeedbackList,
  respondToFeedback,
} from '../controllers/adminController.js';
import { authenticate, adminGuard, approvedGuard } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication, approval, and admin role
router.use(authenticate, approvedGuard, adminGuard);

// Dashboard
router.get('/dashboard', getDashboardStats);

// User management
router.get('/users', getUsers);
router.get('/users/pending', getPendingApprovals);
router.post('/users/:userId/approve', approveUser);
router.post('/users/:userId/reject', rejectUser);
router.post('/users/:userId/suspend', suspendUser);
router.post('/users/:userId/reactivate', reactivateUser);
router.delete('/users/:userId', deleteUser);

// AI Configuration
router.get('/ai-config', getAIConfig);
router.put('/ai-config', updateAIConfig);
router.post('/ai-config/test', testAIConfiguration);

// Audit logs
router.get('/audit-logs', getAuditLogsController);

// Feedback
router.get('/feedback', getFeedbackList);
router.post('/feedback/:feedbackId/respond', respondToFeedback);

export default router;
