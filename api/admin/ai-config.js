import { getUserFromRequest } from '../_lib/auth.js';
import { getAIConfig, updateAIConfig, resetAIConfig, hasOpenAIApiKey, setOpenAIApiKey, deleteOpenAIApiKey } from '../_lib/store.js';
import { testApiKey, invalidateClient } from '../_lib/openai.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
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

    if (req.method === 'GET') {
      const config = await getAIConfig();
      const apiKeyStatus = await hasOpenAIApiKey();

      return res.status(200).json({
        config: {
          ...config,
          hasApiKey: apiKeyStatus.hasKey,
          apiKeySource: apiKeyStatus.source
        }
      });
    }

    if (req.method === 'PUT') {
      const updates = req.body;
      console.log('[AI Config] Update request:', Object.keys(updates));

      // Handle API key update separately (stored encrypted)
      if (updates.openaiApiKey) {
        console.log('[AI Config] Processing API key update...');

        // Validate the API key before saving
        const testResult = await testApiKey(updates.openaiApiKey);
        if (!testResult.success) {
          console.log('[AI Config] API key validation failed:', testResult.error);
          return res.status(400).json({
            error: 'Invalid API key',
            details: testResult.error
          });
        }

        // Save the API key
        const saved = await setOpenAIApiKey(updates.openaiApiKey);
        if (!saved) {
          console.error('[AI Config] Failed to save API key');
          return res.status(500).json({ error: 'Failed to save API key' });
        }

        // Invalidate the cached OpenAI client
        invalidateClient();
        console.log('[AI Config] API key updated and validated successfully');

        // Remove from updates to not store in regular config
        delete updates.openaiApiKey;
      }

      // Validate other updates
      if (updates.temperature !== undefined) {
        if (updates.temperature < 0 || updates.temperature > 2) {
          return res.status(400).json({ error: 'Temperature must be between 0 and 2' });
        }
      }

      if (updates.maxTokens !== undefined) {
        if (updates.maxTokens < 100 || updates.maxTokens > 128000) {
          return res.status(400).json({ error: 'Max tokens must be between 100 and 128000' });
        }
      }

      // Update the rest of the config
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

    if (req.method === 'DELETE') {
      // Reset config to defaults
      const config = await resetAIConfig();

      // Optionally delete stored API key (falls back to env)
      // await deleteOpenAIApiKey();

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
