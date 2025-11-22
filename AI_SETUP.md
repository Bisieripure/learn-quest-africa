# AI Integration Setup for LearnQuest

## Overview
LearnQuest now includes AI-powered personalized learning recommendations using dynamic model configuration. The system supports multiple AI providers including OpenRouter, OpenAI, Anthropic, and local models.

## Quick Setup

### 1. Environment Configuration

Create a `.env` file in the `backend` directory:

```bash
# Required: Get your API key from https://openrouter.ai/
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: Override defaults
AI_PROVIDER=openrouter
AI_MODEL=anthropic/claude-3-haiku
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7
```

### 2. Supported Providers

#### OpenRouter (Recommended)
- **Provider**: `openrouter`
- **Base URL**: `https://openrouter.ai/api/v1`
- **Models**: Any model supported by OpenRouter
- **Example**: `anthropic/claude-3-haiku`, `google/gemini-flash-1.5`

#### OpenAI
- **Provider**: `openai`
- **Base URL**: `https://api.openai.com/v1`
- **Models**: `gpt-4o`, `gpt-3.5-turbo`

#### Anthropic
- **Provider**: `anthropic`
- **Base URL**: `https://api.anthropic.com`
- **Models**: `claude-3-haiku-20240307`

#### Local Models
- **Provider**: `local`
- **Base URL**: Your local API endpoint
- **Models**: Any local model

## API Endpoints

### Get Recommendations
```http
GET /api/recommendations/:studentId
```

**Response:**
```json
{
  "recommendedQuests": [
    {
      "questId": "quest-123",
      "confidence": 0.85,
      "reasoning": "Matches your current math level",
      "suggestedOrder": 1
    }
  ],
  "learningInsights": [
    {
      "insight": "You excel at math problems",
      "type": "strength"
    }
  ],
  "nextFocusArea": "math"
}
```

### Update AI Configuration
```http
POST /api/ai/config
```

**Body:**
```json
{
  "provider": "openrouter",
  "model": "anthropic/claude-3-sonnet",
  "baseUrl": "https://openrouter.ai/api/v1",
  "apiKey": "your_new_key",
  "maxTokens": 1500,
  "temperature": 0.5
}
```

## Features

### 1. Dynamic Model Configuration
- Switch between AI providers without code changes
- Support for multiple model endpoints
- Environment-based configuration

### 2. Smart Fallbacks
- Graceful degradation when AI is unavailable
- Basic recommendation algorithm as backup
- Cached recommendations for offline use

### 3. Personalized Learning
- AI analyzes student progress patterns
- Recommends quests based on skill gaps
- Provides learning insights and suggestions

## Testing

1. Set up your `.env` file with an OpenRouter API key
2. Start the backend server: `cd backend && npm run dev`
3. Navigate to the Game page with a student profile
4. You should see "Recommended for You" section with AI suggestions

## Troubleshooting

### No Recommendations Showing
- Check that your API key is valid
- Verify the student has progress data
- Check browser console for errors

### API Errors
- Ensure your provider URL is correct
- Check API rate limits
- Verify model name is supported

### Offline Mode
- System falls back to basic recommendations
- Previous recommendations are cached locally
- AI features require internet connection

## Cost Optimization

- Use smaller models like `claude-3-haiku` for development
- Implement caching to reduce API calls
- Set appropriate `maxTokens` limits
- Monitor usage through provider dashboard