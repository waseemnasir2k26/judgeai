import OpenAI from 'openai';
import { getAIConfig } from './store.js';

let openaiClient = null;

function getClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export async function analyzeDocuments(documents, config = {}) {
  const client = getClient();
  const aiConfig = await getAIConfig();

  const tone = config.tone || 'professional';
  const depth = config.depth || 'standard';

  const systemPrompt = `${aiConfig.masterSystemPrompt}\n\n${aiConfig.tonePrompts[tone] || aiConfig.tonePrompts.professional}`;

  const depthInstructions = {
    basic: 'Provide a concise, high-level analysis focusing on the most critical points.',
    standard: 'Provide a thorough analysis covering all significant aspects of the case.',
    comprehensive: 'Provide an exhaustive, detailed analysis examining every aspect with supporting citations and extensive reasoning.'
  };

  // Combine all document texts
  const combinedText = documents.map((doc, i) =>
    `=== DOCUMENT ${i + 1}: ${doc.filename} ===\n${doc.text.substring(0, 10000)}`
  ).join('\n\n');

  // Build the analysis prompt
  const userPrompt = `Analyze the following legal documents and provide:

1. EXECUTIVE SUMMARY (2-3 paragraphs)
2. DOCUMENT SUMMARIES (for each document: summary, key points, relevance)
3. CROSS-DOCUMENT ANALYSIS (connections, contradictions, evidence chains)
4. LEGAL FRAMEWORK (applicable laws, precedents, jurisdictional considerations)
5. JUDGMENT ANALYSIS (merits of each party's position, strength of evidence, key issues)
6. TIMELINE OF EVENTS (chronological list with dates and significance)
7. RECOMMENDATIONS (next steps, areas for further investigation, strategic considerations)

${depthInstructions[depth]}

DOCUMENTS:
${combinedText}

Provide your response in the following JSON format:
{
  "executiveSummary": "...",
  "documentSummaries": [
    {
      "filename": "...",
      "summary": "...",
      "keyPoints": ["...", "..."],
      "relevance": "..."
    }
  ],
  "crossAnalysis": "...",
  "legalFramework": "...",
  "judgmentAnalysis": "...",
  "timeline": [
    {
      "date": "...",
      "event": "...",
      "significance": "...",
      "source": "..."
    }
  ],
  "recommendations": ["...", "..."]
}`;

  const startTime = Date.now();

  const response = await client.chat.completions.create({
    model: aiConfig.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: aiConfig.temperature,
    max_tokens: aiConfig.maxTokens,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0]?.message?.content || '{}';
  const tokensUsed = response.usage?.total_tokens || 0;
  const processingTime = Date.now() - startTime;

  let result;
  try {
    result = JSON.parse(content);
  } catch {
    // If JSON parsing fails, create a structured response
    result = {
      executiveSummary: content,
      documentSummaries: documents.map(d => ({
        filename: d.filename,
        summary: 'Analysis included in executive summary',
        keyPoints: [],
        relevance: 'See executive summary'
      })),
      crossAnalysis: 'See executive summary for cross-document analysis.',
      legalFramework: 'See executive summary for legal framework.',
      judgmentAnalysis: 'See executive summary for judgment analysis.',
      timeline: [],
      recommendations: []
    };
  }

  return {
    ...result,
    metadata: {
      processingTime,
      tokensUsed,
      model: aiConfig.model
    }
  };
}

export async function testConnection() {
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    return { success: true, model: response.model };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
