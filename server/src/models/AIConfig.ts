import mongoose, { Schema, Document } from 'mongoose';
import { IAIConfig } from '../types/index.js';
import { encrypt, decrypt } from '../utils/encryption.js';

export interface IAIConfigDocument extends Omit<IAIConfig, '_id'>, Document {
  getDecryptedApiKey(): string;
}

const aiConfigSchema = new Schema<IAIConfigDocument>(
  {
    openaiApiKey: {
      type: String,
      required: true,
      set: (value: string) => {
        if (value && !value.includes(':')) {
          return encrypt(value);
        }
        return value;
      },
    },
    model: {
      type: String,
      required: true,
      default: 'gpt-4-turbo-preview',
      enum: [
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-4-32k',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k',
      ],
    },
    temperature: {
      type: Number,
      required: true,
      default: 0.7,
      min: 0,
      max: 2,
    },
    maxTokens: {
      type: Number,
      required: true,
      default: 4096,
      min: 100,
      max: 128000,
    },
    masterSystemPrompt: {
      type: String,
      required: true,
      default: `You are JudgeAI, an advanced legal analysis assistant designed to help judges and legal professionals analyze case documents.

Your role is to:
1. Carefully read and understand all provided documents
2. Identify key legal issues, facts, and arguments
3. Analyze the strengths and weaknesses of each party's position
4. Provide balanced, objective analysis
5. Reference relevant legal principles and precedents
6. Help identify potential areas of concern or further investigation

Always maintain:
- Professional and formal tone
- Objective and balanced perspective
- Clear and structured analysis
- Proper legal terminology
- Confidentiality and discretion

You are not providing legal advice, but rather assisting with legal analysis and document review.`,
    },
    tonePrompts: {
      aggressive: {
        type: String,
        default: `Adopt a rigorous and incisive analytical approach. Challenge assumptions, identify weaknesses in arguments, and highlight potential issues with particular emphasis. Be direct and thorough in your critique while remaining professional.`,
      },
      professional: {
        type: String,
        default: `Maintain a balanced, professional tone. Provide comprehensive analysis with measured language. Present both strengths and weaknesses fairly, using standard legal terminology and formal structure.`,
      },
      simple: {
        type: String,
        default: `Use clear, accessible language that can be easily understood by non-specialists. Avoid excessive legal jargon. Explain complex concepts in straightforward terms while maintaining accuracy.`,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

aiConfigSchema.methods.getDecryptedApiKey = function (): string {
  try {
    return decrypt(this.openaiApiKey);
  } catch {
    return this.openaiApiKey;
  }
};

// Ensure only one active config exists
aiConfigSchema.index({ isActive: 1 });

export const AIConfig = mongoose.model<IAIConfigDocument>('AIConfig', aiConfigSchema);
