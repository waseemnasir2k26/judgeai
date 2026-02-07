import pdf from 'pdf-parse/lib/pdf-parse.js';

export async function extractTextFromPDF(buffer) {
  try {
    const data = await pdf(buffer);

    return {
      text: cleanText(data.text),
      pageCount: data.numpages,
      metadata: {
        title: data.info?.Title || null,
        author: data.info?.Author || null,
        creationDate: data.info?.CreationDate || null
      }
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

function cleanText(text) {
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

export function estimateTokenCount(text) {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}
