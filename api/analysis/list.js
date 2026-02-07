import { getUserFromRequest } from '../_lib/auth.js';
import { getUserAnalyses } from '../_lib/store.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Auth check
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's analyses (now async)
    const analyses = await getUserAnalyses(user.id);

    // Return summary (without full result to reduce payload)
    const summaries = analyses.map(a => ({
      id: a.id,
      title: a.title,
      status: a.status,
      config: a.config,
      documents: a.documents,
      createdAt: a.createdAt,
      completedAt: a.completedAt,
      // Include just the executive summary from result
      executiveSummary: a.result?.executiveSummary?.substring(0, 200) + '...' || null
    }));

    return res.status(200).json({
      analyses: summaries,
      total: summaries.length
    });
  } catch (error) {
    console.error('List analyses error:', error);
    return res.status(500).json({ error: 'Failed to get analyses' });
  }
}
