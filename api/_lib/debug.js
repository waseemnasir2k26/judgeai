// Debug utility for JudgeAI API
// Logs are stored in Vercel Runtime Logs and can be viewed in the Vercel Dashboard

const LOG_PREFIX = '[JudgeAI]';

export function log(category, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    category,
    message,
    ...(data && { data })
  };

  console.log(`${LOG_PREFIX} [${category}] ${message}`, data ? JSON.stringify(data) : '');

  return logEntry;
}

export function logError(category, message, error = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    category,
    message,
    error: error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : null
  };

  console.error(`${LOG_PREFIX} [${category}] ERROR: ${message}`, error ? error.message : '');
  if (error?.stack) {
    console.error(`${LOG_PREFIX} [${category}] Stack:`, error.stack);
  }

  return logEntry;
}

export function logApiKeyOperation(operation, success, details = null) {
  const category = 'API_KEY';
  if (success) {
    log(category, `${operation} - SUCCESS`, details);
  } else {
    logError(category, `${operation} - FAILED`, details);
  }
}

export function logAnalysis(analysisId, step, data = null) {
  log('ANALYSIS', `[${analysisId}] ${step}`, data);
}

export function logAuth(userId, action, success = true) {
  const category = 'AUTH';
  if (success) {
    log(category, `User ${userId}: ${action}`);
  } else {
    logError(category, `User ${userId}: ${action} - FAILED`);
  }
}

// Export a summary function for debugging
export function getDebugInfo() {
  return {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasRedisUrl: !!process.env.KV_REST_API_URL,
      hasRedisToken: !!process.env.KV_REST_API_TOKEN,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasSuperadminEmail: !!process.env.SUPERADMIN_EMAIL,
    }
  };
}

export default {
  log,
  logError,
  logApiKeyOperation,
  logAnalysis,
  logAuth,
  getDebugInfo
};
