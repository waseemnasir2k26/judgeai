import { getUserFromRequest } from '../_lib/auth.js';
import { getAnalysis, deleteAnalysis } from '../_lib/store.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Auth check
    const user = getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get analysis ID from URL
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Analysis ID required' });
    }

    // Get analysis (now async)
    const analysis = await getAnalysis(id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Check ownership (unless admin)
    if (analysis.userId !== user.id && !['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (req.method === 'GET') {
      return res.status(200).json({ analysis });
    }

    if (req.method === 'DELETE') {
      await deleteAnalysis(id);
      return res.status(200).json({ message: 'Analysis deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Analysis operation error:', error);
    return res.status(500).json({ error: 'Operation failed' });
  }
}
