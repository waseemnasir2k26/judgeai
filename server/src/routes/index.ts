import { Router } from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import analysisRoutes from './analysisRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/analysis', analysisRoutes);
router.use('/feedback', feedbackRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'JudgeAI API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
