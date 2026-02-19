import { getUserFromRequest } from '../_lib/auth.js';
import { getOpenAIApiKey } from '../_lib/store.js';
import { testApiKey } from '../_lib/openai.js';

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
    // Auth check - admin only
    const user = getUserFromRequest(req);
    if (!user) {
      console.log('[AI Config Test] Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['admin', 'superadmin'].includes(user.role)) {
      console.log('[AI Config Test] Non-admin access attempt by:', user.email);
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log(`[AI Config Test] Test request by ${user.email}`);

    const { apiKey } = req.body || {};

    // If a specific API key is provided, test that one
    // Otherwise, test the currently configured key
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
      console.log('[AI Config Test] Testing currently configured key');
    } else {
      console.log('[AI Config Test] Testing provided key');
    }

    // Test the API key
    const result = await testApiKey(keyToTest);

    if (result.success) {
      console.log('[AI Config Test] Test passed');
      return res.status(200).json({
        success: true,
        message: 'API key is valid',
        model: result.model
      });
    } else {
      console.log('[AI Config Test] Test failed:', result.error);
      return res.status(400).json({
        success: false,
        error: result.error,
        details: 'The API key test failed. Please check that the key is valid and has sufficient quota.'
      });
    }
  } catch (error) {
    console.error('[AI Config Test] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.message
    });
  }
}
