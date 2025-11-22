export interface Student {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  xp: number;
  parentPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Quest {
  id: string;
  title: string;
  type: 'math' | 'reading';
  difficulty: 1 | 2 | 3;
  description?: string;
  maxScore: number;
  timeLimit: number;
  completionScore: number;
  levels: Level[];
  createdAt: Date;
  playMode?: QuestPlayMode;
  questions?: Question[];
}

export interface Level {
  level: number;
  scoreToLevelUp: number;
}

export interface Progress {
  id: string;
  studentId: string;
  questId: string;
  completed: boolean;
  score: number;
  attempts: number;
  completedAt?: Date;
}

export interface SMSLog {
  id: string;
  studentId: string;
  phoneNumber: string;
  message: string;
  type: 'welcome' | 'progress' | 'achievement' | 'weekly';
  sentAt: Date;
  status: 'pending' | 'sent' | 'failed';
}

export type QuestPlayMode = 'multiple-choice' | 'fraction-visual' | 'market-arithmetic';

export interface Question {
  id: string;
  questId: string;
  prompt: string;
  order: number;
  type: QuestionType;
  payload?: Record<string, unknown>;
  answers: Answer[];
}

export type QuestionType = 'text' | 'numeric' | 'fraction' | 'custom';

export interface Answer {
  id: string;
  questionId: string;
  label: string;
  value: string;
  isCorrect: boolean;
}

export interface Recommendation {
  questId: string;
  confidence: number;
  reasoning: string;
  suggestedOrder: number;
}

export interface LearningInsight {
  insight: string;
  type: 'strength' | 'weakness' | 'suggestion';
}

export interface RecommendationResponse {
  recommendedQuests: Recommendation[];
  learningInsights: LearningInsight[];
  nextFocusArea: 'math' | 'reading' | 'balanced';
}
