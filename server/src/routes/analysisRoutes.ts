import { Router } from 'express';
import {
  createAnalysis,
  startAnalysis,
  getAnalysis,
  getAnalysisProgress,
  listAnalyses,
  deleteAnalysis,
  downloadReport,
  exportAnalysisJson,
} from '../controllers/analysisController.js';
import { authenticate, approvedGuard } from '../middleware/auth.js';
import { uploadDocuments, handleUploadError } from '../middleware/upload.js';
import { analysisLimiter, uploadLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All analysis routes require authentication and approval
router.use(authenticate, approvedGuard);

// Create analysis with file upload
router.post(
  '/',
  uploadLimiter,
  uploadDocuments.array('documents', 20),
  handleUploadError,
  createAnalysis
);

// Start processing
router.post('/:analysisId/start', analysisLimiter, startAnalysis);

// Get analysis details
router.get('/:analysisId', getAnalysis);

// Get progress
router.get('/:analysisId/progress', getAnalysisProgress);

// List analyses
router.get('/', listAnalyses);

// Delete analysis
router.delete('/:analysisId', deleteAnalysis);

// Download PDF report
router.get('/:analysisId/report', downloadReport);

// Export as JSON
router.get('/:analysisId/export', exportAnalysisJson);

export default router;
