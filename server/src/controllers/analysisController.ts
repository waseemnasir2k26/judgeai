import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Analysis } from '../models/Analysis.js';
import { AuthRequest, IDocument } from '../types/index.js';
import { extractTextFromPDF } from '../services/pdfService.js';
import { analyzeDocuments } from '../services/openaiService.js';
import { generatePDFReport, generateFilename } from '../services/pdfReportService.js';
import { createAuditLog } from '../services/auditService.js';
import { cleanupFiles } from '../middleware/upload.js';
import { logger } from '../utils/logger.js';
import path from 'path';

// Create new analysis
export const createAnalysis = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, caseNumber, configuration } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'At least one PDF document is required',
      });
      return;
    }

    // Parse configuration if it's a string
    let config = configuration;
    if (typeof configuration === 'string') {
      try {
        config = JSON.parse(configuration);
      } catch {
        res.status(400).json({
          success: false,
          message: 'Invalid configuration format',
        });
        return;
      }
    }

    // Prepare documents
    const documents: IDocument[] = files.map((file, index) => ({
      id: uuidv4(),
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      order: index,
    }));

    // Create analysis record
    const analysis = new Analysis({
      userId: req.user!._id,
      title,
      caseNumber,
      documents,
      configuration: {
        tone: config?.tone || 'professional',
        depth: config?.depth || 'standard',
        focusAreas: config?.focusAreas || [],
        caseType: config?.caseType,
        language: config?.language || 'en',
      },
      status: 'pending',
    });

    await analysis.save();

    await createAuditLog({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'ANALYSIS_CREATED',
      resource: 'Analysis',
      resourceId: analysis._id,
      details: { title, documentCount: files.length },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Analysis created successfully',
      data: {
        analysis: {
          id: analysis._id,
          title: analysis.title,
          status: analysis.status,
          documentCount: documents.length,
        },
      },
    });
  } catch (error) {
    logger.error('Create analysis error:', error);
    // Cleanup uploaded files on error
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      await cleanupFiles(files.map((f) => f.path));
    }
    next(error);
  }
};

// Start processing analysis
export const startAnalysis = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { analysisId } = req.params;

    const analysis = await Analysis.findOne({
      _id: analysisId,
      userId: req.user!._id,
    });

    if (!analysis) {
      res.status(404).json({
        success: false,
        message: 'Analysis not found',
      });
      return;
    }

    if (analysis.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'Analysis has already been started or completed',
      });
      return;
    }

    // Start processing in background
    processAnalysis(analysis._id.toString()).catch((error) => {
      logger.error('Background analysis processing error:', error);
    });

    res.json({
      success: true,
      message: 'Analysis processing started',
      data: {
        analysisId: analysis._id,
        status: 'processing',
      },
    });
  } catch (error) {
    logger.error('Start analysis error:', error);
    next(error);
  }
};

// Background processing function
async function processAnalysis(analysisId: string): Promise<void> {
  const analysis = await Analysis.findById(analysisId);
  if (!analysis) return;

  try {
    analysis.status = 'processing';
    analysis.startedAt = new Date();
    analysis.progress = 0;
    analysis.currentStep = 'Extracting text from documents...';
    await analysis.save();

    // Extract text from all documents
    const documentInputs = [];

    for (let i = 0; i < analysis.documents.length; i++) {
      const doc = analysis.documents[i];
      if (!doc) continue;

      analysis.progress = Math.round((i / analysis.documents.length) * 20);
      analysis.currentStep = `Extracting text from ${doc.originalName}...`;
      await analysis.save();

      try {
        const extracted = await extractTextFromPDF(doc.path);
        doc.extractedText = extracted.text;
        doc.pageCount = extracted.pageCount;

        documentInputs.push({
          id: doc.id,
          filename: doc.originalName,
          text: extracted.text,
        });
      } catch (error) {
        logger.error(`Failed to extract text from ${doc.originalName}:`, error);
        doc.extractedText = '';
      }
    }

    await analysis.save();

    if (documentInputs.length === 0) {
      throw new Error('Failed to extract text from any documents');
    }

    // Analyze documents with AI
    const result = await analyzeDocuments(
      documentInputs,
      analysis.configuration,
      (progress) => {
        // Update progress in database
        Analysis.updateOne(
          { _id: analysisId },
          {
            progress: 20 + Math.round(progress.progress * 0.8),
            currentStep: progress.step,
          }
        ).catch((err) => logger.error('Progress update error:', err));
      }
    );

    // Save results
    analysis.result = result;
    analysis.status = 'completed';
    analysis.progress = 100;
    analysis.currentStep = 'Complete';
    analysis.completedAt = new Date();
    await analysis.save();

    // Create audit log
    await createAuditLog({
      userId: analysis.userId,
      userEmail: 'system',
      action: 'ANALYSIS_COMPLETED',
      resource: 'Analysis',
      resourceId: analysis._id,
      details: {
        processingTime: result.metadata.processingTime,
        tokensUsed: result.metadata.tokensUsed,
      },
    });
  } catch (error) {
    logger.error('Analysis processing error:', error);

    analysis.status = 'failed';
    analysis.error = (error as Error).message;
    analysis.currentStep = 'Failed';
    await analysis.save();

    await createAuditLog({
      userId: analysis.userId,
      userEmail: 'system',
      action: 'ANALYSIS_FAILED',
      resource: 'Analysis',
      resourceId: analysis._id,
      details: { error: (error as Error).message },
    });
  }
}

// Get analysis by ID
export const getAnalysis = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { analysisId } = req.params;

    const analysis = await Analysis.findOne({
      _id: analysisId,
      userId: req.user!._id,
    });

    if (!analysis) {
      res.status(404).json({
        success: false,
        message: 'Analysis not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { analysis },
    });
  } catch (error) {
    logger.error('Get analysis error:', error);
    next(error);
  }
};

// Get analysis progress
export const getAnalysisProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { analysisId } = req.params;

    const analysis = await Analysis.findOne(
      { _id: analysisId, userId: req.user!._id },
      'status progress currentStep error'
    );

    if (!analysis) {
      res.status(404).json({
        success: false,
        message: 'Analysis not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        status: analysis.status,
        progress: analysis.progress,
        currentStep: analysis.currentStep,
        error: analysis.error,
      },
    });
  } catch (error) {
    logger.error('Get analysis progress error:', error);
    next(error);
  }
};

// List user's analyses
export const listAnalyses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: Record<string, unknown> = { userId: req.user!._id };

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [analyses, total] = await Promise.all([
      Analysis.find(query)
        .sort({ [sortBy as string]: sortDirection })
        .skip(skip)
        .limit(Number(limit))
        .select('-result -documents.extractedText'),
      Analysis.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        analyses,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('List analyses error:', error);
    next(error);
  }
};

// Delete analysis
export const deleteAnalysis = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { analysisId } = req.params;

    const analysis = await Analysis.findOne({
      _id: analysisId,
      userId: req.user!._id,
    });

    if (!analysis) {
      res.status(404).json({
        success: false,
        message: 'Analysis not found',
      });
      return;
    }

    // Cleanup files
    const filePaths = analysis.documents.map((d) => d.path);
    await cleanupFiles(filePaths);

    await Analysis.deleteOne({ _id: analysisId });

    await createAuditLog({
      userId: req.user!._id,
      userEmail: req.user!.email,
      action: 'ANALYSIS_DELETED',
      resource: 'Analysis',
      resourceId: analysis._id,
      details: { title: analysis.title },
      req,
    });

    res.json({
      success: true,
      message: 'Analysis deleted',
    });
  } catch (error) {
    logger.error('Delete analysis error:', error);
    next(error);
  }
};

// Download PDF report
export const downloadReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { analysisId } = req.params;

    const analysis = await Analysis.findOne({
      _id: analysisId,
      userId: req.user!._id,
    });

    if (!analysis) {
      res.status(404).json({
        success: false,
        message: 'Analysis not found',
      });
      return;
    }

    if (analysis.status !== 'completed' || !analysis.result) {
      res.status(400).json({
        success: false,
        message: 'Analysis is not completed',
      });
      return;
    }

    const pdfBuffer = await generatePDFReport({
      analysis: analysis.toObject(),
      result: analysis.result,
    });

    const filename = generateFilename(analysis.toObject());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Download report error:', error);
    next(error);
  }
};

// Export analysis as JSON
export const exportAnalysisJson = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { analysisId } = req.params;

    const analysis = await Analysis.findOne({
      _id: analysisId,
      userId: req.user!._id,
    });

    if (!analysis) {
      res.status(404).json({
        success: false,
        message: 'Analysis not found',
      });
      return;
    }

    if (analysis.status !== 'completed' || !analysis.result) {
      res.status(400).json({
        success: false,
        message: 'Analysis is not completed',
      });
      return;
    }

    const exportData = {
      title: analysis.title,
      caseNumber: analysis.caseNumber,
      configuration: analysis.configuration,
      result: analysis.result,
      metadata: {
        createdAt: analysis.createdAt,
        completedAt: analysis.completedAt,
        documentCount: analysis.documents.length,
      },
    };

    const filename = `JudgeAI_Export_${analysis.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json(exportData);
  } catch (error) {
    logger.error('Export analysis JSON error:', error);
    next(error);
  }
};
