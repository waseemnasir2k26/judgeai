import PDFDocument from 'pdfkit';
import { IAnalysisResult, IAnalysis } from '../types/index.js';
import { PassThrough } from 'stream';

interface ReportOptions {
  analysis: IAnalysis;
  result: IAnalysisResult;
  includeWatermark?: boolean;
}

const COLORS = {
  primary: '#1a1f2e',
  secondary: '#2952e3',
  gold: '#d4af37',
  text: '#333333',
  lightText: '#666666',
  border: '#e0e0e0',
  background: '#f8f9fa',
};

const FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  italic: 'Helvetica-Oblique',
};

export async function generatePDFReport(options: ReportOptions): Promise<Buffer> {
  const { analysis, result, includeWatermark = true } = options;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = new PassThrough();

    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      bufferPages: true,
      info: {
        Title: `Legal Analysis Report - ${analysis.title}`,
        Author: 'JudgeAI',
        Subject: 'Legal Case Analysis',
        Creator: 'JudgeAI Legal Intelligence Platform',
      },
    });

    doc.pipe(stream);

    // Cover Page
    addCoverPage(doc, analysis);

    // Table of Contents
    doc.addPage();
    const tocPage = doc.bufferedPageRange().count;
    addTableOfContents(doc);

    // Executive Summary
    doc.addPage();
    const execSummaryPage = doc.bufferedPageRange().count;
    addSection(doc, 'Executive Summary', result.executiveSummary, 1);

    // Document Summaries
    doc.addPage();
    const docSummariesPage = doc.bufferedPageRange().count;
    addDocumentSummaries(doc, result.documentSummaries);

    // Cross-Analysis
    doc.addPage();
    const crossAnalysisPage = doc.bufferedPageRange().count;
    addSection(doc, 'Cross-Document Analysis', result.crossAnalysis, 3);

    // Legal Framework
    doc.addPage();
    const legalFrameworkPage = doc.bufferedPageRange().count;
    addSection(doc, 'Legal Framework', result.legalFramework, 4);

    // Judgment Analysis
    doc.addPage();
    const judgmentPage = doc.bufferedPageRange().count;
    addSection(doc, 'Judgment Analysis', result.judgmentAnalysis, 5);

    // Timeline
    if (result.timeline && result.timeline.length > 0) {
      doc.addPage();
      const timelinePage = doc.bufferedPageRange().count;
      addTimeline(doc, result.timeline);
    }

    // Recommendations
    if (result.recommendations && result.recommendations.length > 0) {
      doc.addPage();
      addRecommendations(doc, result.recommendations);
    }

    // Add headers, footers, and watermarks
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(i);

      // Skip cover page for headers/footers
      if (i > 0) {
        addHeader(doc, analysis.title);
        addFooter(doc, i + 1, pageRange.count);
      }

      if (includeWatermark && i > 0) {
        addWatermark(doc);
      }
    }

    doc.end();
  });
}

function addCoverPage(doc: PDFKit.PDFDocument, analysis: IAnalysis): void {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Background header
  doc.rect(0, 0, pageWidth, 200).fill(COLORS.primary);

  // Logo/Title
  doc.font(FONTS.bold)
    .fontSize(36)
    .fillColor(COLORS.gold)
    .text('JudgeAI', 72, 80, { width: pageWidth - 144, align: 'center' });

  doc.font(FONTS.regular)
    .fontSize(14)
    .fillColor('#a0a0a0')
    .text('Legal Intelligence Platform', 72, 125, { width: pageWidth - 144, align: 'center' });

  // Main Title
  doc.font(FONTS.bold)
    .fontSize(28)
    .fillColor(COLORS.primary)
    .text('LEGAL ANALYSIS REPORT', 72, 280, { width: pageWidth - 144, align: 'center' });

  // Case Title
  doc.font(FONTS.bold)
    .fontSize(20)
    .fillColor(COLORS.text)
    .text(analysis.title, 72, 340, { width: pageWidth - 144, align: 'center' });

  // Case Number
  if (analysis.caseNumber) {
    doc.font(FONTS.regular)
      .fontSize(14)
      .fillColor(COLORS.lightText)
      .text(`Case Number: ${analysis.caseNumber}`, 72, 380, { width: pageWidth - 144, align: 'center' });
  }

  // Divider
  doc.moveTo(150, 440).lineTo(pageWidth - 150, 440).stroke(COLORS.border);

  // Metadata
  doc.font(FONTS.regular).fontSize(12).fillColor(COLORS.lightText);

  const metadata = [
    `Analysis Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    `Documents Analyzed: ${analysis.documents.length}`,
    `Analysis Depth: ${analysis.configuration.depth.charAt(0).toUpperCase() + analysis.configuration.depth.slice(1)}`,
    `Tone: ${analysis.configuration.tone.charAt(0).toUpperCase() + analysis.configuration.tone.slice(1)}`,
  ];

  let yPos = 480;
  metadata.forEach((item) => {
    doc.text(item, 72, yPos, { width: pageWidth - 144, align: 'center' });
    yPos += 25;
  });

  // Footer
  doc.font(FONTS.italic)
    .fontSize(10)
    .fillColor(COLORS.lightText)
    .text(
      'This report is generated by JudgeAI for analytical purposes only.',
      72,
      pageHeight - 100,
      { width: pageWidth - 144, align: 'center' }
    )
    .text(
      'It does not constitute legal advice.',
      72,
      pageHeight - 85,
      { width: pageWidth - 144, align: 'center' }
    );
}

function addTableOfContents(doc: PDFKit.PDFDocument): void {
  doc.font(FONTS.bold)
    .fontSize(24)
    .fillColor(COLORS.primary)
    .text('Table of Contents', { underline: false });

  doc.moveDown(2);

  const tocItems = [
    { title: 'Executive Summary', page: 3 },
    { title: 'Document Summaries', page: 4 },
    { title: 'Cross-Document Analysis', page: 5 },
    { title: 'Legal Framework', page: 6 },
    { title: 'Judgment Analysis', page: 7 },
    { title: 'Timeline of Events', page: 8 },
    { title: 'Recommendations', page: 9 },
  ];

  tocItems.forEach((item, index) => {
    const pageWidth = doc.page.width - 144;
    const y = doc.y;

    doc.font(FONTS.regular)
      .fontSize(12)
      .fillColor(COLORS.text)
      .text(`${index + 1}. ${item.title}`, 72, y, { continued: true });

    // Dots
    const textWidth = doc.widthOfString(`${index + 1}. ${item.title}`);
    const pageNumWidth = doc.widthOfString(String(item.page));
    const dotsWidth = pageWidth - textWidth - pageNumWidth - 20;
    const numDots = Math.floor(dotsWidth / doc.widthOfString('.'));

    doc.fillColor(COLORS.border)
      .text(' ' + '.'.repeat(numDots) + ' ', { continued: true })
      .fillColor(COLORS.text)
      .text(String(item.page));

    doc.moveDown(0.5);
  });
}

function addSection(doc: PDFKit.PDFDocument, title: string, content: string, sectionNum: number): void {
  doc.font(FONTS.bold)
    .fontSize(20)
    .fillColor(COLORS.primary)
    .text(`${sectionNum}. ${title}`);

  doc.moveDown();

  // Add numbered paragraphs (legal style)
  const paragraphs = content.split('\n\n').filter((p) => p.trim());

  paragraphs.forEach((paragraph, index) => {
    const paraNum = `${sectionNum}.${index + 1}`;

    doc.font(FONTS.regular)
      .fontSize(11)
      .fillColor(COLORS.text);

    const lines = paragraph.split('\n');
    lines.forEach((line, lineIndex) => {
      if (lineIndex === 0) {
        doc.text(`[${paraNum}] ${line.trim()}`, {
          align: 'justify',
          lineGap: 4,
        });
      } else {
        doc.text(line.trim(), {
          align: 'justify',
          lineGap: 4,
        });
      }
    });

    doc.moveDown(0.8);
  });
}

function addDocumentSummaries(doc: PDFKit.PDFDocument, summaries: IAnalysisResult['documentSummaries']): void {
  doc.font(FONTS.bold)
    .fontSize(20)
    .fillColor(COLORS.primary)
    .text('2. Document Summaries');

  doc.moveDown();

  summaries.forEach((summary, index) => {
    // Document header
    doc.font(FONTS.bold)
      .fontSize(14)
      .fillColor(COLORS.secondary)
      .text(`2.${index + 1} ${summary.filename}`);

    doc.moveDown(0.5);

    // Summary
    doc.font(FONTS.regular)
      .fontSize(11)
      .fillColor(COLORS.text)
      .text(summary.summary, { align: 'justify', lineGap: 4 });

    doc.moveDown(0.5);

    // Key Points
    if (summary.keyPoints && summary.keyPoints.length > 0) {
      doc.font(FONTS.bold)
        .fontSize(11)
        .fillColor(COLORS.text)
        .text('Key Points:');

      doc.font(FONTS.regular);
      summary.keyPoints.forEach((point) => {
        doc.text(`• ${point}`, { indent: 20 });
      });
    }

    doc.moveDown(0.5);

    // Relevance
    if (summary.relevance) {
      doc.font(FONTS.italic)
        .fontSize(10)
        .fillColor(COLORS.lightText)
        .text(`Relevance: ${summary.relevance}`);
    }

    doc.moveDown(1.5);

    // Check for page break
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }
  });
}

function addTimeline(doc: PDFKit.PDFDocument, timeline: IAnalysisResult['timeline']): void {
  doc.font(FONTS.bold)
    .fontSize(20)
    .fillColor(COLORS.primary)
    .text('6. Timeline of Events');

  doc.moveDown();

  timeline.forEach((event, index) => {
    const y = doc.y;

    // Timeline marker
    doc.circle(85, y + 6, 4).fill(COLORS.secondary);
    if (index < timeline.length - 1) {
      doc.moveTo(85, y + 12).lineTo(85, y + 60).stroke(COLORS.border);
    }

    // Date
    doc.font(FONTS.bold)
      .fontSize(11)
      .fillColor(COLORS.secondary)
      .text(event.date || 'Date Unknown', 100, y);

    // Event
    doc.font(FONTS.regular)
      .fontSize(11)
      .fillColor(COLORS.text)
      .text(event.event, 100, doc.y, { width: 400 });

    // Significance
    if (event.significance) {
      doc.font(FONTS.italic)
        .fontSize(10)
        .fillColor(COLORS.lightText)
        .text(`Significance: ${event.significance}`, 100);
    }

    // Source
    if (event.source) {
      doc.font(FONTS.italic)
        .fontSize(9)
        .fillColor(COLORS.lightText)
        .text(`Source: ${event.source}`, 100);
    }

    doc.moveDown(1);
  });
}

function addRecommendations(doc: PDFKit.PDFDocument, recommendations: string[]): void {
  doc.font(FONTS.bold)
    .fontSize(20)
    .fillColor(COLORS.primary)
    .text('7. Recommendations');

  doc.moveDown();

  recommendations.forEach((rec, index) => {
    doc.font(FONTS.bold)
      .fontSize(12)
      .fillColor(COLORS.secondary)
      .text(`${index + 1}.`, { continued: true })
      .font(FONTS.regular)
      .fillColor(COLORS.text)
      .text(` ${rec}`, { align: 'justify' });

    doc.moveDown(0.8);
  });
}

function addHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc.save();

  doc.font(FONTS.regular)
    .fontSize(9)
    .fillColor(COLORS.lightText)
    .text(title, 72, 40, { width: doc.page.width - 144, align: 'left' });

  doc.moveTo(72, 55)
    .lineTo(doc.page.width - 72, 55)
    .stroke(COLORS.border);

  doc.restore();
}

function addFooter(doc: PDFKit.PDFDocument, currentPage: number, totalPages: number): void {
  doc.save();

  const y = doc.page.height - 50;

  doc.moveTo(72, y - 10)
    .lineTo(doc.page.width - 72, y - 10)
    .stroke(COLORS.border);

  doc.font(FONTS.regular)
    .fontSize(9)
    .fillColor(COLORS.lightText)
    .text('JudgeAI Legal Intelligence Platform', 72, y, { width: 200 })
    .text(`Page ${currentPage} of ${totalPages}`, doc.page.width - 172, y, { width: 100, align: 'right' });

  doc.restore();
}

function addWatermark(doc: PDFKit.PDFDocument): void {
  doc.save();

  doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] })
    .font(FONTS.bold)
    .fontSize(60)
    .fillColor('#f0f0f0')
    .opacity(0.3)
    .text('CONFIDENTIAL', 100, doc.page.height / 2 - 30, {
      width: doc.page.width,
      align: 'center',
    });

  doc.restore();
}

export function generateFilename(analysis: IAnalysis): string {
  const date = new Date().toISOString().split('T')[0];
  const title = analysis.title
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30);
  return `JudgeAI_Report_${title}_${date}.pdf`;
}
