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
  console.log('=== DEBUG: Analysis Create Endpoint Hit ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Content-Length:', req.headers['content-length']);

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
    console.log('DEBUG: Checking auth...');
    const user = getUserFromRequest(req);
    if (!user) {
      console.log('DEBUG: Auth failed - no user');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log('DEBUG: Auth success, user:', user.email, 'state:', user.accountState);

    if (user.accountState !== 'approved') {
      console.log('DEBUG: Account not approved:', user.accountState);
      return res.status(403).json({ error: 'Account not approved', accountState: user.accountState });
    }

    // Check if content-type is multipart
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      console.error('DEBUG: Invalid content-type:', contentType);
      return res.status(400).json({
        error: 'Invalid content type',
        details: 'Expected multipart/form-data',
        received: contentType
      });
    }

    // Parse form data
    console.log('DEBUG: Creating formidable form...');
    const form = new IncomingForm({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: true,
      allowEmptyFiles: false,
      minFileSize: 1,
    });

    console.log('DEBUG: Parsing form data...');
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('DEBUG: Form parse error:', err.message);
          console.error('DEBUG: Error code:', err.code);
          reject(err);
        } else {
          console.log('DEBUG: Form parsed successfully');
          console.log('DEBUG: Field keys:', Object.keys(fields));
          console.log('DEBUG: File keys:', Object.keys(files));

          // Log each file key's content
          for (const key of Object.keys(files)) {
            const fileData = files[key];
            console.log(`DEBUG: files.${key} type:`, Array.isArray(fileData) ? 'array' : typeof fileData);
            if (Array.isArray(fileData)) {
              console.log(`DEBUG: files.${key} length:`, fileData.length);
              fileData.forEach((f, i) => {
                console.log(`DEBUG: files.${key}[${i}]:`, {
                  originalFilename: f?.originalFilename,
                  filepath: f?.filepath,
                  size: f?.size,
                  mimetype: f?.mimetype
                });
              });
            } else if (fileData) {
              console.log(`DEBUG: files.${key}:`, {
                originalFilename: fileData.originalFilename,
                filepath: fileData.filepath,
                size: fileData.size,
                mimetype: fileData.mimetype
              });
            }
          }
          resolve([fields, files]);
        }
      });
    });

    // Get uploaded files - formidable v3 uses array format
    console.log('DEBUG: Extracting uploaded files...');
    let uploadedFiles = files.documents || files.files || files.file || [];
    console.log('DEBUG: uploadedFiles before normalization:', uploadedFiles ? (Array.isArray(uploadedFiles) ? `array(${uploadedFiles.length})` : 'single object') : 'empty');

    // Handle single file case
    if (!Array.isArray(uploadedFiles)) {
      uploadedFiles = uploadedFiles ? [uploadedFiles] : [];
    }

    // Filter out any null/undefined entries
    const fileList = uploadedFiles.filter(f => f && f.filepath);

    console.log('DEBUG: Final fileList length:', fileList.length);
    fileList.forEach((f, i) => {
      console.log(`DEBUG: fileList[${i}]:`, {
        name: f.originalFilename,
        path: f.filepath,
        size: f.size,
        exists: fs.existsSync(f.filepath)
      });
    });

    if (fileList.length === 0) {
      console.error('DEBUG: No files found! Full files object keys:', Object.keys(files));
      return res.status(400).json({
        error: 'No files uploaded',
        debug: {
          contentType: req.headers['content-type'],
          contentLength: req.headers['content-length'],
          fileKeys: Object.keys(files),
          fieldKeys: Object.keys(fields),
          hasDocuments: !!files.documents,
          hasFiles: !!files.files,
          documentsType: files.documents ? (Array.isArray(files.documents) ? 'array' : typeof files.documents) : 'undefined'
        }
      });
    }

    // Extract text from PDFs
    console.log('DEBUG: Starting PDF extraction...');
    const documents = [];
    for (const file of fileList) {
      if (!file || !file.filepath) {
        console.log('DEBUG: Skipping file - no filepath');
        continue;
      }

      try {
        console.log(`DEBUG: Reading file: ${file.originalFilename} from ${file.filepath}`);
        const buffer = fs.readFileSync(file.filepath);
        console.log(`DEBUG: File buffer size: ${buffer.length} bytes`);

        console.log('DEBUG: Extracting text from PDF...');
        const pdfData = await extractTextFromPDF(buffer);
        console.log(`DEBUG: Extracted ${pdfData.pageCount} pages, ${pdfData.text?.length || 0} chars`);

        documents.push({
          id: generateId(),
          filename: file.originalFilename || 'document.pdf',
          text: pdfData.text,
          pageCount: pdfData.pageCount,
          metadata: pdfData.metadata
        });

        // Clean up temp file
        fs.unlinkSync(file.filepath);
        console.log('DEBUG: Temp file cleaned up');
      } catch (error) {
        console.error(`DEBUG: Error processing file ${file.originalFilename}:`, error.message);
        console.error('DEBUG: Error stack:', error.stack);
      }
    }

    console.log(`DEBUG: Successfully processed ${documents.length} documents`);

    if (documents.length === 0) {
      return res.status(400).json({
        error: 'No valid PDF files could be processed',
        debug: { fileListLength: fileList.length }
      });
    }

    // Get analysis config from form fields
    const tone = fields.tone?.[0] || fields.tone || 'professional';
    const depth = fields.depth?.[0] || fields.depth || 'standard';
    const title = fields.title?.[0] || fields.title || `Analysis - ${new Date().toLocaleDateString()}`;
    console.log('DEBUG: Config:', { tone, depth, title });

    // Create analysis record
    console.log('DEBUG: Creating analysis record...');
    const analysisId = generateId();
    const analysis = await saveAnalysis({
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
    console.log('DEBUG: Analysis record created:', analysisId);

    // Check if OpenAI API key is configured
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    console.log('DEBUG: OpenAI API key configured:', hasApiKey);

    if (!hasApiKey) {
      await saveAnalysis({
        ...analysis,
        status: 'failed',
        error: 'OpenAI API key not configured'
      });

      return res.status(500).json({
        error: 'AI service not configured',
        details: 'Please ask the administrator to add the OpenAI API key in Vercel environment variables.',
        analysisId
      });
    }

    // Run AI analysis
    try {
      console.log('DEBUG: Starting AI analysis...');
      const startTime = Date.now();
      const result = await analyzeDocuments(documents, { tone, depth });
      const duration = Date.now() - startTime;
      console.log(`DEBUG: AI analysis completed in ${duration}ms`);
      console.log('DEBUG: Result keys:', Object.keys(result));

      // Update analysis with results
      console.log('DEBUG: Saving completed analysis...');
      await saveAnalysis({
        ...analysis,
        status: 'completed',
        result,
        completedAt: new Date().toISOString()
      });

      // Update user stats
      const currentUser = await findUserById(user.id);
      if (currentUser) {
        await updateUser(user.id, {
          stats: {
            totalAnalyses: (currentUser.stats?.totalAnalyses || 0) + 1,
            documentsProcessed: (currentUser.stats?.documentsProcessed || 0) + documents.length
          }
        });
      }

      console.log('DEBUG: Analysis complete, returning result');
      return res.status(201).json({
        message: 'Analysis completed',
        analysisId,
        result
      });
    } catch (aiError) {
      console.error('DEBUG: AI analysis error:', aiError.message);
      console.error('DEBUG: AI error stack:', aiError.stack);

      // More helpful error messages
      let errorMessage = aiError.message;
      if (errorMessage.includes('API key')) {
        errorMessage = 'OpenAI API key is invalid or not configured properly.';
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'OpenAI rate limit reached. Please try again in a few minutes.';
      } else if (errorMessage.includes('quota')) {
        errorMessage = 'OpenAI quota exceeded. Please check your OpenAI account billing.';
      }

      // Update analysis with error
      await saveAnalysis({
        ...analysis,
        status: 'failed',
        error: errorMessage
      });

      return res.status(500).json({
        error: 'AI analysis failed',
        details: errorMessage,
        analysisId,
        debug: { originalError: aiError.message }
      });
    }
  } catch (error) {
    console.error('DEBUG: Unhandled error:', error.message);
    console.error('DEBUG: Error stack:', error.stack);
    return res.status(500).json({
      error: 'Failed to create analysis',
      debug: { message: error.message }
    });
  }
}
