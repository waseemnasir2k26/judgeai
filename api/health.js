import { getUserFromRequest } from './_lib/auth.js';
import { hasOpenAIApiKey } from './_lib/store.js';
import { getDebugInfo } from './_lib/debug.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const basicInfo = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  // Check if user is admin for extended debug info
  try {
    const user = getUserFromRequest(req);
    if (user && ['admin', 'superadmin'].includes(user.role)) {
      const apiKeyStatus = await hasOpenAIApiKey();
      const debugInfo = getDebugInfo();

      return res.status(200).json({
        ...basicInfo,
        debug: {
          ...debugInfo,
          openaiApiKey: {
            configured: apiKeyStatus.hasKey,
            source: apiKeyStatus.source
          }
        }
      });
    }
  } catch (e) {
    // Not authenticated or error - just return basic info
  }

  return res.status(200).json(basicInfo);
}
