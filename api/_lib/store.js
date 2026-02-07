import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.judgeaistore_KV_REST_API_URL || process.env.KV_REST_API_URL,
  token: process.env.judgeaistore_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN,
});

// Key prefixes for organization
const KEYS = {
  user: (id) => `user:${id}`,
  userEmail: (email) => `user:email:${email.toLowerCase()}`,
  analysis: (id) => `analysis:${id}`,
  userAnalyses: (userId) => `user:${userId}:analyses`,
  feedback: (id) => `feedback:${id}`,
  session: (token) => `session:${token}`,
  aiConfig: 'config:ai',
};

// Default AI Configuration
// gpt-4o supports up to 16384 output tokens and 128K context
const DEFAULT_AI_CONFIG = {
  model: process.env.OPENAI_MODEL || 'gpt-4o',
  temperature: 0.3,
  maxTokens: 4096,
  masterSystemPrompt: `You are an expert legal analyst assistant for judges and legal professionals. Your task is to:

1. DOCUMENT SUMMARY: Provide a concise summary of each uploaded document, identifying document type, key parties, core claims, relevant dates, and cited laws.

2. CROSS-DOCUMENT ANALYSIS: Identify connections between documents, note contradictions or inconsistencies, and highlight supporting evidence chains.

3. LEGAL FRAMEWORK: Identify applicable laws and jurisdictions, reference relevant precedents, and note constitutional considerations.

4. JUDGMENT RECOMMENDATION: Provide a balanced analysis of both sides, highlight strengths and weaknesses, suggest key questions the judge should consider. DO NOT make a definitive ruling.

5. FORMAT: Use clear headings, cite specific page numbers, flag areas requiring additional information, keep language professional and objective.

IMPORTANT: This is an analysis tool to assist human judgment, not replace it. Always note limitations and areas of uncertainty.`,
  tonePrompts: {
    aggressive: `TONE: Adopt a firm, authoritative, and direct analytical voice. Be assertive in identifying weaknesses. Use strong, decisive language like "clearly demonstrates", "fundamentally flawed", "compelling evidence establishes", "cannot be sustained". Do not hedge unnecessarily.`,
    professional: `TONE: Maintain formal legal register and professional objectivity. Use precise legal terminology. Balance both sides with measured analysis. Use language like "upon careful consideration", "the evidence suggests", "it is submitted that", "the tribunal may wish to consider".`,
    simple: `TONE: Explain in plain, accessible language that non-lawyers can understand. Avoid legal jargon or explain it when used. Use analogies and everyday examples. Write as if explaining to an intelligent non-lawyer. Use language like "in simple terms", "what this means is", "the key issue here is".`
  }
};

// Helper: Generate unique ID
export function generateId() {
  return crypto.randomUUID();
}

// Helper: Create user
export async function createUser({ firstName, lastName, email, password }) {
  const id = generateId();
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id,
    firstName,
    lastName,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: 'user',
    accountState: 'pending',  // Requires admin approval
    isEmailVerified: true,    // Skip email verification for now
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: null,
    stats: { totalAnalyses: 0, documentsProcessed: 0 }
  };

  // Store user and email index
  await redis.set(KEYS.user(id), JSON.stringify(user));
  await redis.set(KEYS.userEmail(email), id);

  return sanitizeUser(user);
}

// Helper: Find user by email
export async function findUserByEmail(email) {
  try {
    const userId = await redis.get(KEYS.userEmail(email));
    if (!userId) return null;

    const userData = await redis.get(KEYS.user(userId));
    if (!userData) return null;

    return typeof userData === 'string' ? JSON.parse(userData) : userData;
  } catch (error) {
    console.error('findUserByEmail error:', error);
    return null;
  }
}

// Helper: Find user by ID
export async function findUserById(id) {
  try {
    const userData = await redis.get(KEYS.user(id));
    if (!userData) return null;

    return typeof userData === 'string' ? JSON.parse(userData) : userData;
  } catch (error) {
    console.error('findUserById error:', error);
    return null;
  }
}

// Helper: Sanitize user (remove password)
export function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

// Helper: Verify password
export async function verifyPassword(user, candidatePassword) {
  return bcrypt.compare(candidatePassword, user.password);
}

// Helper: Update user
export async function updateUser(id, updates) {
  try {
    const userData = await redis.get(KEYS.user(id));
    if (!userData) return null;

    const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await redis.set(KEYS.user(id), JSON.stringify(updatedUser));
    return sanitizeUser(updatedUser);
  } catch (error) {
    console.error('updateUser error:', error);
    return null;
  }
}

// Helper: Get all users
export async function getAllUsers() {
  try {
    // Get all user keys
    const keys = await redis.keys('user:*');
    const userKeys = keys.filter(k =>
      k.startsWith('user:') &&
      !k.includes(':email:') &&
      !k.includes(':analyses')
    );

    const users = [];
    for (const key of userKeys) {
      const userData = await redis.get(key);
      if (userData) {
        const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
        users.push(sanitizeUser(user));
      }
    }

    return users;
  } catch (error) {
    console.error('getAllUsers error:', error);
    return [];
  }
}

// Helper: Save analysis
export async function saveAnalysis(analysis) {
  try {
    const id = analysis.id || generateId();
    const now = new Date().toISOString();
    const fullAnalysis = {
      ...analysis,
      id,
      createdAt: analysis.createdAt || now,
      updatedAt: now
    };

    await redis.set(KEYS.analysis(id), JSON.stringify(fullAnalysis));

    // Add to user's analysis list
    if (analysis.userId) {
      await redis.sadd(KEYS.userAnalyses(analysis.userId), id);
    }

    return fullAnalysis;
  } catch (error) {
    console.error('saveAnalysis error:', error);
    return null;
  }
}

// Helper: Get analysis by ID
export async function getAnalysis(id) {
  try {
    const data = await redis.get(KEYS.analysis(id));
    if (!data) return null;

    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error('getAnalysis error:', error);
    return null;
  }
}

// Helper: Get analyses by user ID
export async function getUserAnalyses(userId) {
  try {
    const analysisIds = await redis.smembers(KEYS.userAnalyses(userId));

    const analyses = [];
    for (const id of analysisIds) {
      const data = await redis.get(KEYS.analysis(id));
      if (data) {
        const analysis = typeof data === 'string' ? JSON.parse(data) : data;
        analyses.push(analysis);
      }
    }

    // Sort by createdAt descending
    return analyses.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('getUserAnalyses error:', error);
    return [];
  }
}

// Helper: Update analysis
export async function updateAnalysis(id, updates) {
  try {
    const data = await redis.get(KEYS.analysis(id));
    if (!data) return null;

    const analysis = typeof data === 'string' ? JSON.parse(data) : data;
    const updatedAnalysis = {
      ...analysis,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await redis.set(KEYS.analysis(id), JSON.stringify(updatedAnalysis));
    return updatedAnalysis;
  } catch (error) {
    console.error('updateAnalysis error:', error);
    return null;
  }
}

// Helper: Delete analysis
export async function deleteAnalysis(id) {
  try {
    const data = await redis.get(KEYS.analysis(id));
    if (data) {
      const analysis = typeof data === 'string' ? JSON.parse(data) : data;
      if (analysis.userId) {
        await redis.srem(KEYS.userAnalyses(analysis.userId), id);
      }
    }

    await redis.del(KEYS.analysis(id));
    return true;
  } catch (error) {
    console.error('deleteAnalysis error:', error);
    return false;
  }
}

// Helper: Save feedback
export async function saveFeedback(feedback) {
  try {
    const id = generateId();
    const fullFeedback = {
      ...feedback,
      id,
      createdAt: new Date().toISOString()
    };

    await redis.set(KEYS.feedback(id), JSON.stringify(fullFeedback));
    await redis.sadd('feedback:all', id);

    return fullFeedback;
  } catch (error) {
    console.error('saveFeedback error:', error);
    return null;
  }
}

// Helper: Get all feedback
export async function getAllFeedback() {
  try {
    const feedbackIds = await redis.smembers('feedback:all');

    const feedbacks = [];
    for (const id of feedbackIds) {
      const data = await redis.get(KEYS.feedback(id));
      if (data) {
        const feedback = typeof data === 'string' ? JSON.parse(data) : data;
        feedbacks.push(feedback);
      }
    }

    return feedbacks;
  } catch (error) {
    console.error('getAllFeedback error:', error);
    return [];
  }
}

// Helper: Get/Update AI config
export async function getAIConfig() {
  try {
    const data = await redis.get(KEYS.aiConfig);
    if (!data) return { ...DEFAULT_AI_CONFIG };

    const config = typeof data === 'string' ? JSON.parse(data) : data;
    return { ...DEFAULT_AI_CONFIG, ...config };
  } catch (error) {
    console.error('getAIConfig error:', error);
    return { ...DEFAULT_AI_CONFIG };
  }
}

export async function updateAIConfig(updates) {
  try {
    const currentConfig = await getAIConfig();
    const newConfig = { ...currentConfig, ...updates };

    await redis.set(KEYS.aiConfig, JSON.stringify(newConfig));
    return newConfig;
  } catch (error) {
    console.error('updateAIConfig error:', error);
    return null;
  }
}

// Session management
export async function createSession(userId, token) {
  try {
    await redis.set(KEYS.session(token), JSON.stringify({
      userId,
      createdAt: new Date().toISOString()
    }));
    // Sessions expire in 24 hours
    await redis.expire(KEYS.session(token), 86400);
  } catch (error) {
    console.error('createSession error:', error);
  }
}

export async function getSession(token) {
  try {
    const data = await redis.get(KEYS.session(token));
    if (!data) return null;

    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error('getSession error:', error);
    return null;
  }
}

export async function deleteSession(token) {
  try {
    await redis.del(KEYS.session(token));
    return true;
  } catch (error) {
    console.error('deleteSession error:', error);
    return false;
  }
}

// Seed superadmin on first request
let superadminSeeded = false;

export async function ensureSuperadmin() {
  if (superadminSeeded) return;

  const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@gmail.com';
  const SUPERADMIN_PASS = process.env.SUPERADMIN_PASSWORD || 'Admin@123456';

  try {
    const existing = await findUserByEmail(SUPERADMIN_EMAIL);
    if (!existing) {
      const id = generateId();
      const hashedPassword = await bcrypt.hash(SUPERADMIN_PASS, 10);
      const admin = {
        id,
        firstName: 'Super',
        lastName: 'Admin',
        email: SUPERADMIN_EMAIL.toLowerCase(),
        password: hashedPassword,
        role: 'superadmin',
        accountState: 'approved',
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null,
        stats: { totalAnalyses: 0, documentsProcessed: 0 }
      };

      await redis.set(KEYS.user(id), JSON.stringify(admin));
      await redis.set(KEYS.userEmail(SUPERADMIN_EMAIL), id);
      console.log(`Superadmin seeded: ${SUPERADMIN_EMAIL}`);
    }
    superadminSeeded = true;
  } catch (error) {
    console.error('ensureSuperadmin error:', error);
  }
}

export default redis;
