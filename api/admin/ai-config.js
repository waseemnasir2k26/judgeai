import { getUserFromRequest } from '../_lib/auth.js';
import { getAIConfig, updateAIConfig, resetAIConfig, hasOpenAIApiKey, setOpenAIApiKey, getOpenAIApiKey } from '../_lib/store.js';
import { testApiKey, invalidateClient } from '../_lib/openai.js';

// Model token limits - conservative values that work across all API tiers
const MODEL_TOKEN_LIMITS = {
  'gpt-4o': 4096,
  'gpt-4o-mini': 4096,
  'gpt-4-turbo': 4096,
  'gpt-4-turbo-preview': 4096,
  'gpt-4': 4096,
  'gpt-3.5-turbo': 4096,
  'gpt-3.5-turbo-16k': 4096
};

const DEFAULT_MAX_TOKENS = 4096;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Auth check - admin only
    const user = getUserFromRequest(req);
    if (!user) {
      console.log('[AI Config] Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['admin', 'superadmin'].includes(user.role)) {
      console.log('[AI Config] Non-admin access attempt by:', user.email);
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log(`[AI Config] ${req.method} request by ${user.email}`);

    // GET - Retrieve AI config
    if (req.method === 'GET') {
      const config = await getAIConfig();
      const apiKeyStatus = await hasOpenAIApiKey();

      // Ensure maxTokens doesn't exceed model limit
      const maxAllowed = MODEL_TOKEN_LIMITS[config.model] || DEFAULT_MAX_TOKENS;
      const safeMaxTokens = Math.min(config.maxTokens || DEFAULT_MAX_TOKENS, maxAllowed);

      return res.status(200).json({
        config: {
          ...config,
          maxTokens: safeMaxTokens,
          hasApiKey: apiKeyStatus.hasKey,
          apiKeySource: apiKeyStatus.source
        }
      });
    }

    // POST - Test API key (merged from ai-config-test.js)
    if (req.method === 'POST') {
      console.log('[AI Config] Test request');
      const { apiKey } = req.body || {};

      let keyToTest = apiKey;

      if (!keyToTest) {
        keyToTest = await getOpenAIApiKey();
        if (!keyToTest) {
          return res.status(400).json({
            success: false,
            error: 'No API key configured',
            details: 'Please provide an API key to test, or configure one in the dashboard or Vercel environment variables.'
          });
        }
        console.log('[AI Config] Testing currently configured key');
      } else {
        console.log('[AI Config] Testing provided key');
      }

      const result = await testApiKey(keyToTest);

      if (result.success) {
        console.log('[AI Config] Test passed');
        return res.status(200).json({
          success: true,
          message: 'API key is valid',
          model: result.model
        });
      } else {
        console.log('[AI Config] Test failed:', result.error);
        return res.status(400).json({
          success: false,
          error: result.error,
          details: 'The API key test failed. Please check that the key is valid and has sufficient quota.'
        });
      }
    }

    // PUT - Update AI config
    if (req.method === 'PUT') {
      const updates = req.body;
      console.log('[AI Config] Update request:', Object.keys(updates));

      // Handle API key update separately (stored encrypted)
      if (updates.openaiApiKey) {
        console.log('[AI Config] Processing API key update...');

        const testResult = await testApiKey(updates.openaiApiKey);
        if (!testResult.success) {
          console.log('[AI Config] API key validation failed:', testResult.error);
          return res.status(400).json({
            error: 'Invalid API key',
            details: testResult.error
          });
        }

        const saved = await setOpenAIApiKey(updates.openaiApiKey);
        if (!saved) {
          console.error('[AI Config] Failed to save API key');
          return res.status(500).json({ error: 'Failed to save API key' });
        }

        invalidateClient();
        console.log('[AI Config] API key updated and validated successfully');
        delete updates.openaiApiKey;
      }

      // Validate temperature
      if (updates.temperature !== undefined) {
        if (updates.temperature < 0 || updates.temperature > 2) {
          return res.status(400).json({ error: 'Temperature must be between 0 and 2' });
        }
      }

      // Validate and cap maxTokens based on model
      if (updates.maxTokens !== undefined) {
        const model = updates.model || (await getAIConfig()).model || 'gpt-4o';
        const maxAllowed = MODEL_TOKEN_LIMITS[model] || DEFAULT_MAX_TOKENS;

        if (updates.maxTokens < 100) {
          return res.status(400).json({ error: 'Max tokens must be at least 100' });
        }

        // Cap at model limit instead of rejecting
        if (updates.maxTokens > maxAllowed) {
          console.log(`[AI Config] Capping maxTokens from ${updates.maxTokens} to ${maxAllowed} for model ${model}`);
          updates.maxTokens = maxAllowed;
        }
      }

      // Validate model and adjust maxTokens if model changed
      if (updates.model) {
        const maxAllowed = MODEL_TOKEN_LIMITS[updates.model] || DEFAULT_MAX_TOKENS;
        const currentConfig = await getAIConfig();

        // If current maxTokens exceeds new model's limit, cap it
        if ((updates.maxTokens || currentConfig.maxTokens) > maxAllowed) {
          updates.maxTokens = maxAllowed;
          console.log(`[AI Config] Adjusted maxTokens to ${maxAllowed} for model ${updates.model}`);
        }
      }

      const config = await updateAIConfig(updates);
      const apiKeyStatus = await hasOpenAIApiKey();

      return res.status(200).json({
        message: 'AI configuration updated',
        config: {
          ...config,
          hasApiKey: apiKeyStatus.hasKey,
          apiKeySource: apiKeyStatus.source
        }
      });
    }

    // DELETE - Reset config to defaults
    if (req.method === 'DELETE') {
      const config = await resetAIConfig();
      const apiKeyStatus = await hasOpenAIApiKey();

      return res.status(200).json({
        message: 'AI configuration reset to defaults',
        config: {
          ...config,
          hasApiKey: apiKeyStatus.hasKey,
          apiKeySource: apiKeyStatus.source
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[AI Config] Error:', error);
    return res.status(500).json({ error: 'Operation failed', details: error.message });
  }
}
