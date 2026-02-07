import { PDFParse } from 'pdf-parse';
import fs from 'fs/promises';
import { logger } from '../utils/logger.js';

interface PDFExtractionResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

export async function extractTextFromPDF(filePath: string): Promise<PDFExtractionResult> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const pdfParser = new PDFParse({ data: dataBuffer });

    // Get text content
    const textResult = await pdfParser.getText();
    const text = cleanExtractedText(textResult.text);

    // Get metadata
    const infoResult = await pdfParser.getInfo();
    const info = infoResult.info || {};
    const dateNode = infoResult.getDateNode();

    return {
      text,
      pageCount: textResult.total,
      metadata: {
        title: info.Title,
        author: info.Author,
        creationDate: dateNode.CreationDate || undefined,
      },
    };
  } catch (error) {
    logger.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${(error as Error).message}`);
  }
}

function cleanExtractedText(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove null characters
    .replace(/\0/g, '')
    // Fix common OCR issues
    .replace(/\ufffd/g, '')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim();
}

export function chunkText(text: string, chunkSize: number = 4000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    // Try to find a natural break point
    if (endIndex < text.length) {
      // Look for paragraph break
      const paragraphBreak = text.lastIndexOf('\n\n', endIndex);
      if (paragraphBreak > startIndex + chunkSize / 2) {
        endIndex = paragraphBreak;
      } else {
        // Look for sentence break
        const sentenceBreak = text.lastIndexOf('. ', endIndex);
        if (sentenceBreak > startIndex + chunkSize / 2) {
          endIndex = sentenceBreak + 1;
        }
      }
    }

    chunks.push(text.substring(startIndex, endIndex).trim());
    startIndex = endIndex - overlap;
  }

  return chunks;
}

export async function extractTextFromMultiplePDFs(
  filePaths: string[]
): Promise<Map<string, PDFExtractionResult>> {
  const results = new Map<string, PDFExtractionResult>();

  for (const filePath of filePaths) {
    try {
      const result = await extractTextFromPDF(filePath);
      results.set(filePath, result);
    } catch (error) {
      logger.error(`Failed to extract from ${filePath}:`, error);
      results.set(filePath, {
        text: '',
        pageCount: 0,
        metadata: {},
      });
    }
  }

  return results;
}

export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedLength = maxTokens * 4;
  if (text.length <= estimatedLength) {
    return text;
  }

  // Find a good break point
  let breakPoint = estimatedLength;
  const paragraphBreak = text.lastIndexOf('\n\n', breakPoint);
  if (paragraphBreak > estimatedLength * 0.8) {
    breakPoint = paragraphBreak;
  } else {
    const sentenceBreak = text.lastIndexOf('. ', breakPoint);
    if (sentenceBreak > estimatedLength * 0.8) {
      breakPoint = sentenceBreak + 1;
    }
  }

  return text.substring(0, breakPoint) + '\n\n[Content truncated...]';
}
