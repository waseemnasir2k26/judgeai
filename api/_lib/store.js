import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// In-memory data store - resets on cold start (fine for testing/demo)
const store = {
  users: new Map(),
  analyses: new Map(),
  feedback: new Map(),
  sessions: new Map(),

  // AI Configuration (admin-controlled)
  aiConfig: {
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    temperature: 0.3,
    maxTokens: 8000,
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
  store.users.set(id, user);
  store.users.set(`email:${email.toLowerCase()}`, id); // email index
  return sanitizeUser(user);
}

// Helper: Find user by email
export function findUserByEmail(email) {
  const userId = store.users.get(`email:${email.toLowerCase()}`);
  if (!userId || typeof userId !== 'string') return null;
  return store.users.get(userId) || null;
}

// Helper: Find user by ID
export function findUserById(id) {
  const user = store.users.get(id);
  if (!user || typeof user !== 'object') return null;
  return user;
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
export function updateUser(id, updates) {
  const user = store.users.get(id);
  if (!user) return null;
  Object.assign(user, updates, { updatedAt: new Date().toISOString() });
  store.users.set(id, user);
  return sanitizeUser(user);
}

// Helper: Get all users
export function getAllUsers() {
  const users = [];
  for (const [key, value] of store.users) {
    if (!key.startsWith('email:') && typeof value === 'object') {
      users.push(sanitizeUser(value));
    }
  }
  return users;
}

// Helper: Save analysis
export function saveAnalysis(analysis) {
  const id = analysis.id || generateId();
  const now = new Date().toISOString();
  const fullAnalysis = {
    ...analysis,
    id,
    createdAt: analysis.createdAt || now,
    updatedAt: now
  };
  store.analyses.set(id, fullAnalysis);
  return fullAnalysis;
}

// Helper: Get analysis by ID
export function getAnalysis(id) {
  return store.analyses.get(id) || null;
}

// Helper: Get analyses by user ID
export function getUserAnalyses(userId) {
  const analyses = [];
  for (const [, analysis] of store.analyses) {
    if (analysis.userId === userId) {
      analyses.push(analysis);
    }
  }
  return analyses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Helper: Update analysis
export function updateAnalysis(id, updates) {
  const analysis = store.analyses.get(id);
  if (!analysis) return null;
  Object.assign(analysis, updates, { updatedAt: new Date().toISOString() });
  store.analyses.set(id, analysis);
  return analysis;
}

// Helper: Delete analysis
export function deleteAnalysis(id) {
  return store.analyses.delete(id);
}

// Helper: Save feedback
export function saveFeedback(feedback) {
  const id = generateId();
  const fullFeedback = {
    ...feedback,
    id,
    createdAt: new Date().toISOString()
  };
  store.feedback.set(id, fullFeedback);
  return fullFeedback;
}

// Helper: Get all feedback
export function getAllFeedback() {
  return Array.from(store.feedback.values());
}

// Helper: Get/Update AI config
export function getAIConfig() {
  return { ...store.aiConfig };
}

export function updateAIConfig(updates) {
  Object.assign(store.aiConfig, updates);
  return { ...store.aiConfig };
}

// Session management
export function createSession(userId, token) {
  store.sessions.set(token, { userId, createdAt: new Date().toISOString() });
}

export function getSession(token) {
  return store.sessions.get(token) || null;
}

export function deleteSession(token) {
  return store.sessions.delete(token);
}

// Seed superadmin on module load
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@gmail.com';
const SUPERADMIN_PASS = process.env.SUPERADMIN_PASSWORD || 'Admin@123456';

async function seedSuperadmin() {
  if (!findUserByEmail(SUPERADMIN_EMAIL)) {
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
    store.users.set(id, admin);
    store.users.set(`email:${SUPERADMIN_EMAIL.toLowerCase()}`, id);
    console.log(`Superadmin seeded: ${SUPERADMIN_EMAIL}`);
  }
}

// Run seed
seedSuperadmin().catch(console.error);

export default store;
