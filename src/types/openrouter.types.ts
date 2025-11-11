/**
 * OpenRouter Service Types
 * Type definitions for the OpenRouter API integration
 */

/**
 * Chat message role
 */
export type ChatMessageRole = "system" | "user" | "assistant";

/**
 * Individual chat message
 */
export interface ChatMessage {
  role: ChatMessageRole;
  content: string;
}

/**
 * JSON schema definition for response format
 */
export interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
  additionalProperties?: boolean;
  [key: string]: unknown;
}

/**
 * Response format specification for structured outputs
 */
export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: JsonSchema;
  };
}

/**
 * Chat response from OpenRouter API
 */
export interface ChatResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  parsedContent?: unknown; // Parsed JSON content when responseFormat is provided
}

/**
 * OpenRouter API error response
 */
export interface OpenRouterErrorResponse {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

/**
 * Constructor options for OpenRouterService
 */
export interface OpenRouterServiceOptions {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultParams?: Record<string, unknown>;
  logger?: (level: string, message: string, data?: unknown) => void;
}

/**
 * Method override options for sendChat
 */
export interface SendChatOverrides {
  model?: string;
  params?: Record<string, unknown>;
}
