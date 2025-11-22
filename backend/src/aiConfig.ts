export interface AIModelConfig {
  provider: 'openrouter' | 'openai' | 'anthropic' | 'local';
  model: string;
  baseUrl?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface RecommendationRequest {
  studentId: string;
  studentName: string;
  studentLevel: number;
  studentXP: number;
  progressHistory: Array<{
    questId: string;
    questTitle: string;
    questType: 'math' | 'reading';
    questDifficulty: 1 | 2 | 3;
    score: number;
    completed: boolean;
    attempts: number;
    completedAt?: string;
  }>;
  availableQuests: Array<{
    id: string;
    title: string;
    type: 'math' | 'reading';
    difficulty: 1 | 2 | 3;
    description?: string;
    playMode?: string;
  }>;
}

export interface RecommendationResponse {
  recommendedQuests: Array<{
    questId: string;
    confidence: number;
    reasoning: string;
    suggestedOrder: number;
  }>;
  learningInsights: Array<{
    insight: string;
    type: 'strength' | 'weakness' | 'suggestion';
  }>;
  nextFocusArea: 'math' | 'reading' | 'balanced';
}

// Default configuration for OpenRouter
export const DEFAULT_AI_CONFIG: AIModelConfig = {
  provider: 'openrouter',
  model: 'anthropic/claude-3-haiku',
  baseUrl: 'https://openrouter.ai/api/v1',
  maxTokens: 1000,
  temperature: 0.7
};

// Environment-based configuration
export function getAIConfig(): AIModelConfig {
  const config: AIModelConfig = {
    ...DEFAULT_AI_CONFIG,
    apiKey: process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY
  };
  
  // Override with environment variables if present
  if (process.env.AI_PROVIDER) {
    config.provider = process.env.AI_PROVIDER as AIModelConfig['provider'];
  }
  if (process.env.AI_MODEL) {
    config.model = process.env.AI_MODEL;
  }
  if (process.env.AI_BASE_URL) {
    config.baseUrl = process.env.AI_BASE_URL;
  }
  if (process.env.AI_MAX_TOKENS) {
    config.maxTokens = parseInt(process.env.AI_MAX_TOKENS);
  }
  if (process.env.AI_TEMPERATURE) {
    config.temperature = parseFloat(process.env.AI_TEMPERATURE);
  }
  
  return config;
}