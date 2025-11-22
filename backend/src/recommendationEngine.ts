import { AIModelConfig, RecommendationRequest, RecommendationResponse, getAIConfig } from './aiConfig';
import { getProgressForStudent, getStudent, getAllQuests } from './database';

export class RecommendationEngine {
  private config: AIModelConfig;

  constructor(config?: AIModelConfig) {
    this.config = config || getAIConfig();
    console.log('RecommendationEngine initialized with config:', this.config);
  }

  async generateRecommendations(studentId: string): Promise<RecommendationResponse> {
    try {
      // Get student data
      const student = getStudent(studentId);
      if (!student) {
        throw new Error(`Student not found: ${studentId}`);
      }

      // Get progress history
      const progressHistory = getProgressForStudent(studentId);
      
      // Get available quests
      const availableQuests = getAllQuests();

      // Prepare request data
      const request: RecommendationRequest = {
        studentId: student.id,
        studentName: student.name,
        studentLevel: student.level,
        studentXP: student.xp,
        progressHistory: progressHistory.map(p => {
          const quest = availableQuests.find(q => q.id === p.questId);
          return {
            questId: p.questId,
            questTitle: quest?.title || 'Unknown Quest',
            questType: quest?.type || 'math',
            questDifficulty: quest?.difficulty || 1,
            score: p.score,
            completed: p.completed,
            attempts: p.attempts,
            completedAt: p.completedAt?.toISOString()
          };
        }),
        availableQuests: availableQuests.map(q => ({
          id: q.id,
          title: q.title,
          type: q.type,
          difficulty: q.difficulty,
          description: q.description,
          playMode: q.playMode
        }))
      };

      // Generate recommendations using AI
      const recommendations = await this.callAIForRecommendations(request);
      
      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Fallback to basic recommendations if AI fails
      return this.generateFallbackRecommendations(studentId);
    }
  }

  private async callAIForRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    const { provider, model, baseUrl, apiKey, maxTokens, temperature } = this.config;

    if (!apiKey) {
      throw new Error('AI API key not configured');
    }

    const prompt = this.buildRecommendationPrompt(request);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://learnquest.africa',
        'X-Title': 'LearnQuest Africa'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an educational AI assistant that provides personalized learning recommendations for students. Analyze their progress and suggest the best next quests to help them learn effectively.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from AI');
    }

    return this.parseAIResponse(content, request.availableQuests);
  }

  private buildRecommendationPrompt(request: RecommendationRequest): string {
    const { studentName, studentLevel, studentXP, progressHistory, availableQuests } = request;

    return `
Student: ${studentName}
Level: ${studentLevel}
XP: ${studentXP}

Progress History:
${progressHistory.map(p => `- ${p.questTitle} (${p.questType}, Difficulty ${p.questDifficulty}): Score ${p.score}%, Completed: ${p.completed}, Attempts: ${p.attempts}`).join('\n')}

Available Quests:
${availableQuests.map(q => `- ${q.title} (${q.type}, Difficulty ${q.difficulty})${q.description ? `: ${q.description}` : ''}`).join('\n')}

Please analyze this student's learning journey and provide:
1. 3-5 recommended quests with confidence scores (0-1)
2. Learning insights about their strengths and areas for improvement
3. Suggested focus area (math, reading, or balanced)

Format your response as JSON:
{
  "recommendedQuests": [
    {
      "questId": "quest-id",
      "confidence": 0.85,
      "reasoning": "Brief explanation",
      "suggestedOrder": 1
    }
  ],
  "learningInsights": [
    {
      "insight": "Specific insight about learning",
      "type": "strength|weakness|suggestion"
    }
  ],
  "nextFocusArea": "math|reading|balanced"
}
`;
  }

  private parseAIResponse(content: string, availableQuests: any[]): RecommendationResponse {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and filter quests to ensure they exist
      const validRecommendedQuests = parsed.recommendedQuests
        ?.filter((rec: any) => availableQuests.some(q => q.id === rec.questId))
        ?.slice(0, 5) || [];

      return {
        recommendedQuests: validRecommendedQuests,
        learningInsights: parsed.learningInsights || [],
        nextFocusArea: parsed.nextFocusArea || 'balanced'
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  private generateFallbackRecommendations(studentId: string): RecommendationResponse {
    const student = getStudent(studentId);
    const progressHistory = getProgressForStudent(studentId);
    const availableQuests = getAllQuests();

    // Simple fallback logic
    const completedQuestIds = new Set(progressHistory.filter(p => p.completed).map(p => p.questId));
    const availableQuestsToRecommend = availableQuests.filter(q => !completedQuestIds.has(q.id));

    // Sort by difficulty and type
    const sortedQuests = availableQuestsToRecommend.sort((a, b) => {
      // Prefer quests with difficulty matching student level
      const aDiffMatch = Math.abs(a.difficulty - (student?.level || 1));
      const bDiffMatch = Math.abs(b.difficulty - (student?.level || 1));
      
      if (aDiffMatch !== bDiffMatch) {
        return aDiffMatch - bDiffMatch;
      }
      
      // Alternate between math and reading
      return a.type === 'math' ? -1 : 1;
    });

    const recommendedQuests = sortedQuests.slice(0, 3).map((quest, index) => ({
      questId: quest.id,
      confidence: 0.7 - (index * 0.1),
      reasoning: `Difficulty ${quest.difficulty} ${quest.type} quest that matches your current level`,
      suggestedOrder: index + 1
    }));

    return {
      recommendedQuests,
      learningInsights: [
        {
          insight: "Try different types of quests to build well-rounded skills",
          type: "suggestion"
        }
      ],
      nextFocusArea: 'balanced'
    };
  }

  // Method to update AI configuration dynamically
  updateConfig(newConfig: Partial<AIModelConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}