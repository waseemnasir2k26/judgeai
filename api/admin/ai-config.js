import { getUserFromRequest } from '../_lib/auth.js';
import { getAIConfig, updateAIConfig } from '../_lib/store.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Auth check - admin only
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      const config = getAIConfig();
      return res.status(200).json({ config });
    }

    if (req.method === 'PUT') {
      const updates = req.body;

      // Validate updates
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

      const config = updateAIConfig(updates);
      return res.status(200).json({
        message: 'AI configuration updated',
        config
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('AI config error:', error);
    return res.status(500).json({ error: 'Operation failed' });
  }
}
