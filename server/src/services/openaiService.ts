import OpenAI from 'openai';
import { AIConfig } from '../models/AIConfig.js';
import { logger } from '../utils/logger.js';
import { IAnalysisConfig, IAnalysisResult, IDocumentSummary, ITimelineEvent } from '../types/index.js';

interface DocumentInput {
  id: string;
  filename: string;
  text: string;
}

interface AnalysisProgress {
  progress: number;
  step: string;
}

type ProgressCallback = (progress: AnalysisProgress) => void;

export async function getActiveAIConfig() {
  const config = await AIConfig.findOne({ isActive: true });
  if (!config) {
    throw new Error('No active AI configuration found. Please configure OpenAI settings.');
  }
  return config;
}

function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

async function callOpenAI(
  client: OpenAI,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<{ content: string; tokensUsed: number }> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
  });

  const content = response.choices[0]?.message?.content || '';
  const tokensUsed = response.usage?.total_tokens || 0;

  return { content, tokensUsed };
}

export async function testAIConfig(apiKey: string, model: string): Promise<boolean> {
  try {
    const client = createOpenAIClient(apiKey);
    await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Hello, this is a test.' }],
      max_tokens: 10,
    });
    return true;
  } catch (error) {
    logger.error('AI config test failed:', error);
    return false;
  }
}

export async function analyzeDocuments(
  documents: DocumentInput[],
  config: IAnalysisConfig,
  onProgress?: ProgressCallback
): Promise<IAnalysisResult> {
  const startTime = Date.now();
  let totalTokensUsed = 0;

  const aiConfig = await getActiveAIConfig();
  const apiKey = aiConfig.getDecryptedApiKey();
  const client = createOpenAIClient(apiKey);

  const tonePrompt = aiConfig.tonePrompts[config.tone];
  const systemPrompt = `${aiConfig.masterSystemPrompt}\n\n${tonePrompt}`;

  const depthInstructions = {
    basic: 'Provide a concise, high-level analysis focusing on the most critical points.',
    standard: 'Provide a thorough analysis covering all significant aspects of the case.',
    comprehensive: 'Provide an exhaustive, detailed analysis examining every aspect of the case with supporting citations and extensive reasoning.',
  };

  const focusAreasText = config.focusAreas.length > 0
    ? `Pay special attention to: ${config.focusAreas.join(', ')}.`
    : '';

  // Step 1: Document Summaries (30%)
  onProgress?.({ progress: 5, step: 'Analyzing individual documents...' });

  const documentSummaries: IDocumentSummary[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    if (!doc) continue;

    const progress = 5 + (25 * (i + 1)) / documents.length;
    onProgress?.({ progress: Math.round(progress), step: `Analyzing document ${i + 1} of ${documents.length}...` });

    const prompt = `Analyze the following legal document and provide:
1. A comprehensive summary (2-3 paragraphs)
2. Key points (5-10 bullet points)
3. Relevance assessment (how this document relates to the overall case)

Document filename: ${doc.filename}
Document content:
${doc.text.substring(0, 15000)}
${doc.text.length > 15000 ? '\n[Document truncated for analysis]' : ''}

${depthInstructions[config.depth]}
${focusAreasText}

Respond in JSON format:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "relevance": "..."
}`;

    try {
      const { content, tokensUsed } = await callOpenAI(
        client,
        aiConfig.aiModel,
        systemPrompt,
        prompt,
        aiConfig.temperature,
        2000
      );
      totalTokensUsed += tokensUsed;

      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
      documentSummaries.push({
        documentId: doc.id,
        filename: doc.filename,
        summary: parsed.summary,
        keyPoints: parsed.keyPoints,
        relevance: parsed.relevance,
      });
    } catch (error) {
      logger.error(`Error analyzing document ${doc.filename}:`, error);
      documentSummaries.push({
        documentId: doc.id,
        filename: doc.filename,
        summary: 'Error analyzing this document.',
        keyPoints: [],
        relevance: 'Unable to determine relevance.',
      });
    }
  }

  // Step 2: Cross-Analysis (45%)
  onProgress?.({ progress: 35, step: 'Performing cross-document analysis...' });

  const allDocumentContext = documents
    .map((d) => `=== ${d.filename} ===\n${d.text.substring(0, 5000)}`)
    .join('\n\n');

  const crossAnalysisPrompt = `Based on all the documents provided, perform a cross-document analysis:
1. Identify connections and contradictions between documents
2. Highlight corroborating evidence
3. Note any gaps or missing information
4. Analyze the chronological relationship between events

Documents:
${allDocumentContext}

${depthInstructions[config.depth]}
${focusAreasText}

Provide a detailed cross-analysis in prose format (3-5 paragraphs).`;

  const { content: crossAnalysis, tokensUsed: crossTokens } = await callOpenAI(
    client,
    aiConfig.aiModel,
    systemPrompt,
    crossAnalysisPrompt,
    aiConfig.temperature,
    3000
  );
  totalTokensUsed += crossTokens;

  // Step 3: Legal Framework (55%)
  onProgress?.({ progress: 50, step: 'Analyzing legal framework...' });

  const legalFrameworkPrompt = `Based on the documents, identify and analyze:
1. Applicable laws, statutes, and regulations
2. Relevant legal precedents and case law
3. Jurisdictional considerations
4. Procedural requirements and compliance
5. Standard of proof requirements

Documents context:
${allDocumentContext.substring(0, 10000)}

${depthInstructions[config.depth]}
${focusAreasText}
${config.caseType ? `Case type: ${config.caseType}` : ''}

Provide a structured legal framework analysis.`;

  const { content: legalFramework, tokensUsed: legalTokens } = await callOpenAI(
    client,
    aiConfig.aiModel,
    systemPrompt,
    legalFrameworkPrompt,
    aiConfig.temperature,
    3000
  );
  totalTokensUsed += legalTokens;

  // Step 4: Judgment Analysis (70%)
  onProgress?.({ progress: 65, step: 'Performing judgment analysis...' });

  const judgmentPrompt = `Based on all available documents and analysis, provide a judgment analysis:
1. Evaluate the merits of each party's position
2. Assess the strength of evidence presented
3. Identify key issues that require determination
4. Consider potential outcomes and their implications
5. Note any procedural or substantive concerns

Documents context:
${allDocumentContext.substring(0, 10000)}

${depthInstructions[config.depth]}
${focusAreasText}

Provide a balanced, objective judgment analysis.`;

  const { content: judgmentAnalysis, tokensUsed: judgmentTokens } = await callOpenAI(
    client,
    aiConfig.aiModel,
    systemPrompt,
    judgmentPrompt,
    aiConfig.temperature,
    3000
  );
  totalTokensUsed += judgmentTokens;

  // Step 5: Timeline (80%)
  onProgress?.({ progress: 75, step: 'Constructing timeline...' });

  const timelinePrompt = `Extract and organize a chronological timeline of events from all documents:
- Include dates where available
- Note the significance of each event
- Indicate the source document

Documents:
${allDocumentContext.substring(0, 10000)}

Respond in JSON format:
{
  "timeline": [
    {"date": "YYYY-MM-DD or descriptive date", "event": "...", "significance": "...", "source": "filename"}
  ]
}`;

  let timeline: ITimelineEvent[] = [];
  try {
    const { content: timelineContent, tokensUsed: timelineTokens } = await callOpenAI(
      client,
      aiConfig.aiModel,
      systemPrompt,
      timelinePrompt,
      aiConfig.temperature,
      2000
    );
    totalTokensUsed += timelineTokens;

    const parsed = JSON.parse(timelineContent.replace(/```json\n?|\n?```/g, ''));
    timeline = parsed.timeline;
  } catch (error) {
    logger.error('Error generating timeline:', error);
  }

  // Step 6: Executive Summary (90%)
  onProgress?.({ progress: 85, step: 'Generating executive summary...' });

  const summaryPrompt = `Create an executive summary of the entire case analysis:
1. Brief overview of the case
2. Key findings from document analysis
3. Main legal issues identified
4. Critical observations
5. Overall assessment

Based on the following analysis results:
- Document summaries: ${JSON.stringify(documentSummaries.map((d) => ({ name: d.filename, summary: d.summary.substring(0, 200) })))}
- Cross-analysis highlights: ${crossAnalysis.substring(0, 500)}
- Legal framework: ${legalFramework.substring(0, 500)}
- Judgment analysis: ${judgmentAnalysis.substring(0, 500)}

${depthInstructions[config.depth]}
Provide a professional executive summary (2-4 paragraphs).`;

  const { content: executiveSummary, tokensUsed: summaryTokens } = await callOpenAI(
    client,
    aiConfig.aiModel,
    systemPrompt,
    summaryPrompt,
    aiConfig.temperature,
    2000
  );
  totalTokensUsed += summaryTokens;

  // Step 7: Recommendations (100%)
  onProgress?.({ progress: 95, step: 'Generating recommendations...' });

  const recommendationsPrompt = `Based on the complete analysis, provide recommendations:
1. Suggested next steps
2. Areas requiring further investigation
3. Strategic considerations
4. Risk factors to consider
5. Procedural recommendations

Context:
${executiveSummary}
${judgmentAnalysis.substring(0, 1000)}

Respond in JSON format:
{
  "recommendations": ["...", "...", "..."]
}`;

  let recommendations: string[] = [];
  try {
    const { content: recContent, tokensUsed: recTokens } = await callOpenAI(
      client,
      aiConfig.aiModel,
      systemPrompt,
      recommendationsPrompt,
      aiConfig.temperature,
      1500
    );
    totalTokensUsed += recTokens;

    const parsed = JSON.parse(recContent.replace(/```json\n?|\n?```/g, ''));
    recommendations = parsed.recommendations;
  } catch (error) {
    logger.error('Error generating recommendations:', error);
  }

  onProgress?.({ progress: 100, step: 'Analysis complete!' });

  const processingTime = Date.now() - startTime;

  return {
    executiveSummary,
    documentSummaries,
    crossAnalysis,
    legalFramework,
    judgmentAnalysis,
    timeline,
    recommendations,
    metadata: {
      processingTime,
      tokensUsed: totalTokensUsed,
      model: aiConfig.aiModel,
    },
  };
}
