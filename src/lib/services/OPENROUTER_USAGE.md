# OpenRouter Service Usage Guide

## Overview

The `OpenRouterService` provides a robust wrapper around the OpenRouter API for LLM-based chat interactions. It includes automatic retries, error handling, JSON schema validation, and optional logging.

## Installation

The required dependencies are already installed:
- `ajv` - JSON schema validation

## Setup

### 1. Configure API Key

Add your OpenRouter API key to your environment variables:

```bash
# .env
OPENROUTER_API_KEY=your_api_key_here
```

You can get an API key from [OpenRouter](https://openrouter.ai/).

### 2. Import the Service

```typescript
import { OpenRouterService } from './lib/services/openrouter.service';
```

## Basic Usage

### Simple Chat

```typescript
const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
});

const messages = [
  { role: 'user', content: 'Hello, how are you?' }
];

const response = await service.sendChat(messages);
console.log(response.choices[0].message.content);
```

### With Custom System Message

```typescript
const messages = [
  { 
    role: 'system', 
    content: 'You are a professional darts coach.' 
  },
  { 
    role: 'user', 
    content: 'How can I improve my game?' 
  }
];

const response = await service.sendChat(messages);
```

## Structured Responses

Use JSON schemas to get structured, validated responses:

```typescript
const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'FeedbackResponse',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        score: { type: 'number' },
        recommendations: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['message', 'score', 'recommendations'],
      additionalProperties: false
    }
  }
};

const response = await service.sendChat(messages, responseFormat);
// Access parsed JSON directly
console.log(response.parsedContent.message);
```

## Configuration Options

### Constructor Options

```typescript
const service = new OpenRouterService({
  apiKey: 'your-api-key',           // Required
  baseUrl: 'custom-url',            // Optional, defaults to OpenRouter API
  defaultModel: 'openai/gpt-4o-mini', // Optional, defaults to gpt-4o-mini
  defaultParams: {                  // Optional default parameters
    temperature: 0.7,
    max_tokens: 1000
  },
  logger: (level, msg, data) => {   // Optional logger function
    console.log(`[${level}] ${msg}`, data);
  }
});
```

### Update Settings

```typescript
// Change default model
service.setDefaultModel('anthropic/claude-3.5-sonnet');

// Update default parameters
service.setDefaultParams({
  temperature: 0.5,
  max_tokens: 2000
});
```

### Per-Request Overrides

```typescript
const response = await service.sendChat(
  messages,
  responseFormat,
  {
    model: 'anthropic/claude-3.5-sonnet',  // Override model
    params: {
      temperature: 0.9,                     // Override params
      max_tokens: 500
    }
  }
);
```

## Error Handling

The service provides specific error types for different failure scenarios:

```typescript
import {
  OpenRouterApiError,
  OpenRouterValidationError,
  OpenRouterNetworkError
} from './lib/errors/openrouter.errors';

try {
  const response = await service.sendChat(messages);
} catch (error) {
  if (error instanceof OpenRouterApiError) {
    // API errors (401, 429, 500, etc.)
    console.error('API Error:', error.statusCode, error.message);
    
    if (error.statusCode === 401) {
      // Invalid API key
    } else if (error.statusCode === 429) {
      // Rate limit (already retried 3 times)
    }
  } else if (error instanceof OpenRouterValidationError) {
    // Response doesn't match expected schema
    console.error('Validation Error:', error.validationErrors);
  } else if (error instanceof OpenRouterNetworkError) {
    // Network/connectivity issues
    console.error('Network Error:', error.message);
  }
}
```

## Retry Behavior

The service automatically retries failed requests:

- **Rate Limits (429)**: Retries up to 3 times with exponential backoff
- **Network Errors**: Retries up to 3 times with exponential backoff
- **Other Errors**: No retry, throws immediately

Retry delays: 500ms → 1s → 2s → 4s (exponential backoff)

## Available Models

Popular models on OpenRouter:

- `openai/gpt-4o-mini` - Fast and affordable (default)
- `openai/gpt-4o` - Most capable OpenAI model
- `anthropic/claude-3.5-sonnet` - Excellent for complex tasks
- `anthropic/claude-3-haiku` - Fast and affordable
- `meta-llama/llama-3.1-70b-instruct` - Open source, capable
- `google/gemini-pro-1.5` - Google's latest

See [OpenRouter Models](https://openrouter.ai/models) for the full list.

## Best Practices

### 1. Secure API Keys
```typescript
// ✅ Good: Use environment variables
apiKey: import.meta.env.OPENROUTER_API_KEY

// ❌ Bad: Hardcode keys
apiKey: 'sk-or-v1-...'
```

### 2. Use Structured Responses
When you need consistent output format, always use `responseFormat` with JSON schemas.

### 3. Handle Errors Gracefully
Always wrap API calls in try-catch and handle specific error types.

### 4. Set Appropriate Timeouts
Use `max_tokens` to control response length and cost:
```typescript
defaultParams: {
  max_tokens: 500  // Limit response length
}
```

### 5. Monitor Token Usage
```typescript
const response = await service.sendChat(messages);
console.log('Tokens used:', response.usage?.total_tokens);
```

### 6. Use Logging in Development
```typescript
const service = new OpenRouterService({
  apiKey: apiKey,
  logger: (level, msg, data) => {
    if (import.meta.env.DEV) {
      console.log(`[${level}] ${msg}`, data);
    }
  }
});
```

## Examples

Comprehensive examples are available in:
- `src/lib/services/openrouter.service.example.ts` - 10 different usage examples
- `src/pages/api/feedback/generate.example.ts` - Astro API endpoint example

## Troubleshooting

### "OpenRouter API key is required"
Make sure `OPENROUTER_API_KEY` is set in your `.env` file.

### "Rate limit exceeded"
The service already retries automatically. If you still see this error, you've exceeded your rate limit. Wait and try again or upgrade your OpenRouter plan.

### "Response does not match expected schema"
Your JSON schema might be too strict or the model can't produce the expected format. Try:
- Simplifying the schema
- Using a more capable model
- Adding examples in your prompt

### Network timeouts
Check your internet connection. The service retries automatically but will fail after 3 attempts.

## Support

For issues with the OpenRouter API itself, check:
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Discord](https://discord.gg/openrouter)

For issues with this service implementation, check the code comments and examples.

