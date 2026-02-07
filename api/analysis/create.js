import { IncomingForm } from 'formidable';
import fs from 'fs';
import { getUserFromRequest } from '../_lib/auth.js';
import { saveAnalysis, generateId, updateUser, findUserById } from '../_lib/store.js';
import { extractTextFromPDF } from '../_lib/pdf-parse.js';
import { analyzeDocuments } from '../_lib/openai.js';

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Auth check
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.accountState !== 'approved') {
      return res.status(403).json({ error: 'Account not approved' });
    }

    // Parse form data
    const form = new IncomingForm({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Get uploaded files
    const uploadedFiles = files.documents || files.files || [];
    const fileList = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];

    if (fileList.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Extract text from PDFs
    const documents = [];
    for (const file of fileList) {
      if (!file || !file.filepath) continue;

      try {
        const buffer = fs.readFileSync(file.filepath);
        const pdfData = await extractTextFromPDF(buffer);

        documents.push({
          id: generateId(),
          filename: file.originalFilename || 'document.pdf',
          text: pdfData.text,
          pageCount: pdfData.pageCount,
          metadata: pdfData.metadata
        });

        // Clean up temp file
        fs.unlinkSync(file.filepath);
      } catch (error) {
        console.error(`Error processing file ${file.originalFilename}:`, error);
      }
    }

    if (documents.length === 0) {
      return res.status(400).json({ error: 'No valid PDF files could be processed' });
    }

    // Get analysis config from form fields
    const tone = fields.tone?.[0] || fields.tone || 'professional';
    const depth = fields.depth?.[0] || fields.depth || 'standard';
    const title = fields.title?.[0] || fields.title || `Analysis - ${new Date().toLocaleDateString()}`;

    // Create analysis record
    const analysisId = generateId();
    const analysis = saveAnalysis({
      id: analysisId,
      userId: user.id,
      title,
      status: 'processing',
      config: { tone, depth },
      documents: documents.map(d => ({
        id: d.id,
        filename: d.filename,
        pageCount: d.pageCount
      })),
      result: null
    });

    // Run AI analysis
    try {
      const result = await analyzeDocuments(documents, { tone, depth });

      // Update analysis with results
      saveAnalysis({
        ...analysis,
        status: 'completed',
        result,
        completedAt: new Date().toISOString()
      });

      // Update user stats
      const currentUser = findUserById(user.id);
      if (currentUser) {
        updateUser(user.id, {
          stats: {
            totalAnalyses: (currentUser.stats?.totalAnalyses || 0) + 1,
            documentsProcessed: (currentUser.stats?.documentsProcessed || 0) + documents.length
          }
        });
      }

      return res.status(201).json({
        message: 'Analysis completed',
        analysisId,
        result
      });
    } catch (aiError) {
      console.error('AI analysis error:', aiError);

      // Update analysis with error
      saveAnalysis({
        ...analysis,
        status: 'failed',
        error: aiError.message
      });

      return res.status(500).json({
        error: 'AI analysis failed',
        details: aiError.message,
        analysisId
      });
    }
  } catch (error) {
    console.error('Analysis creation error:', error);
    return res.status(500).json({ error: 'Failed to create analysis' });
  }
}
