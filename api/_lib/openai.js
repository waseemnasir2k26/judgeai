import OpenAI from 'openai';
import { getAIConfig, getOpenAIApiKey } from './store.js';

// Cache for the client - will be invalidated when API key changes
let openaiClient = null;
let cachedApiKey = null;

async function getClient() {
  // Get API key (checks dashboard first, then env variable)
  const apiKey = await getOpenAIApiKey();

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set it in the Admin Dashboard or Vercel environment variables.');
  }

  // Create new client if key changed or not initialized
  if (!openaiClient || cachedApiKey !== apiKey) {
    console.log('[OpenAI] Initializing client with', cachedApiKey !== apiKey ? 'new' : 'cached', 'API key');
    openaiClient = new OpenAI({ apiKey });
    cachedApiKey = apiKey;
  }

  return openaiClient;
}

// Test a specific API key without affecting the cached client
export async function testApiKey(apiKey) {
  try {
    console.log('[OpenAI] Testing API key...');
    const testClient = new OpenAI({ apiKey });

    const response = await testClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });

    console.log('[OpenAI] API key test successful, model:', response.model);
    return {
      success: true,
      model: response.model,
      message: 'API key is valid'
    };
  } catch (error) {
    console.error('[OpenAI] API key test failed:', error.message);

    let errorMessage = error.message;
    if (error.status === 401) {
      errorMessage = 'Invalid API key. Please check your OpenAI API key.';
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded or quota exhausted. Check your OpenAI billing.';
    } else if (error.status === 403) {
      errorMessage = 'API key does not have access to this model.';
    }

    return {
      success: false,
      error: errorMessage,
      status: error.status
    };
  }
}

// Invalidate the cached client (call when API key is updated)
export function invalidateClient() {
  console.log('[OpenAI] Invalidating cached client');
  openaiClient = null;
  cachedApiKey = null;
}

export async function analyzeDocuments(documents, config = {}) {
  const client = await getClient();
  const aiConfig = await getAIConfig();

  // Cap maxTokens based on model limits to prevent API errors
  // Note: Some API tiers have lower limits than model maximums
  // Using conservative limits that work across all tiers
  const modelTokenLimits = {
    'gpt-4o': 4096,        // Model supports 16384, but some tiers cap at 4096
    'gpt-4o-mini': 4096,   // Model supports 16384, but some tiers cap at 4096
    'gpt-4-turbo': 4096,
    'gpt-4-turbo-preview': 4096,
    'gpt-4': 4096,         // Model supports 8192, but using safe limit
    'gpt-3.5-turbo': 4096
  };
  const maxAllowed = modelTokenLimits[aiConfig.model] || 4096;
  const safeMaxTokens = Math.min(aiConfig.maxTokens, maxAllowed);

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
    max_tokens: safeMaxTokens,
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
    const client = await getClient();
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
