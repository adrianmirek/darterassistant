/**
 * OpenRouterService Usage Examples
 *
 * This file demonstrates various ways to use the OpenRouterService
 * including basic chat, structured responses, error handling, and more.
 */

import { OpenRouterService } from "./openrouter.service";
import { OpenRouterApiError, OpenRouterValidationError, OpenRouterNetworkError } from "../errors/openrouter.errors";
import type { ChatMessage, ResponseFormat } from "../../types/openrouter.types";

// ============================================
// Example 1: Basic Chat
// ============================================
export async function basicChatExample() {
  // Initialize service with API key from environment
  const service = new OpenRouterService({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultModel: "openai/gpt-4o-mini", // Optional: specify default model
  });

  // Simple user message (system message will be auto-injected)
  const messages: ChatMessage[] = [{ role: "user", content: "What is the capital of France?" }];

  try {
    const response = await service.sendChat(messages);
    console.log("Assistant:", response.choices[0].message.content);
    console.log("Tokens used:", response.usage?.total_tokens);
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================
// Example 2: Chat with Custom System Message
// ============================================
export async function chatWithSystemMessageExample() {
  const service = new OpenRouterService({
    apiKey: process.env.OPENROUTER_API_KEY || "",
  });

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "You are a professional darts coach providing expert advice.",
    },
    {
      role: "user",
      content: "How can I improve my checkout percentage?",
    },
  ];

  try {
    const response = await service.sendChat(messages);
    console.log("Coach advice:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================
// Example 3: Structured JSON Response
// ============================================
export async function structuredResponseExample() {
  const service = new OpenRouterService({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultModel: "openai/gpt-4o-mini",
  });

  // Define the JSON schema for the response
  const responseFormat: ResponseFormat = {
    type: "json_schema",
    json_schema: {
      name: "DartsSummary",
      strict: true,
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          key_metrics: {
            type: "array",
            items: { type: "string" },
          },
          recommendation: { type: "string" },
        },
        required: ["summary", "key_metrics", "recommendation"],
        additionalProperties: false,
      },
    },
  };

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: "Analyze this tournament: Average 85, Checkout 35%, 3x 180s, Best leg 12 darts",
    },
  ];

  try {
    const response = await service.sendChat(messages, responseFormat);

    // Access the parsed JSON directly
    console.log("Summary:", response.parsedContent.summary);
    console.log("Key Metrics:", response.parsedContent.key_metrics);
    console.log("Recommendation:", response.parsedContent.recommendation);
  } catch (error) {
    if (error instanceof OpenRouterValidationError) {
      console.error("Validation failed:", error.validationErrors);
    } else {
      console.error("Error:", error);
    }
  }
}

// ============================================
// Example 4: Tournament Feedback Generation
// ============================================
export async function generateTournamentFeedbackExample() {
  const service = new OpenRouterService({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultModel: "openai/gpt-4o-mini",
  });

  // Define feedback response schema
  const responseFormat: ResponseFormat = {
    type: "json_schema",
    json_schema: {
      name: "TournamentFeedback",
      strict: true,
      schema: {
        type: "object",
        properties: {
          message: { type: "string" },
          tone: {
            type: "string",
            enum: ["encouraging", "motivational", "analytical", "celebratory"],
          },
          highlights: {
            type: "array",
            items: { type: "string" },
          },
          areas_for_improvement: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["message", "tone", "highlights", "areas_for_improvement"],
        additionalProperties: false,
      },
    },
  };

  const tournamentData = {
    average_score: 78.5,
    checkout_percentage: 32,
    score_180_count: 2,
    high_finish: 121,
  };

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "You are a supportive darts coach providing constructive feedback.",
    },
    {
      role: "user",
      content: `Generate motivational feedback for this tournament performance: ${JSON.stringify(tournamentData)}`,
    },
  ];

  try {
    const response = await service.sendChat(messages, responseFormat);
    const feedback = response.parsedContent;

    console.log("Feedback Message:", feedback.message);
    console.log("Tone:", feedback.tone);
    console.log("Highlights:", feedback.highlights);
    console.log("Areas for Improvement:", feedback.areas_for_improvement);

    return feedback;
  } catch (error) {
    console.error("Failed to generate feedback:", error);
    throw error;
  }
}

// ============================================
// Example 5: Multi-turn Conversation
// ============================================
export async function conversationExample() {
  const service = new OpenRouterService({
    apiKey: process.env.OPENROUTER_API_KEY || "",
  });

  // Start with conversation history
  const messages: ChatMessage[] = [
    { role: "system", content: "You are a helpful darts training assistant." },
    { role: "user", content: "What should I practice today?" },
    {
      role: "assistant",
      content: "I recommend practicing your checkout finishes, especially doubles.",
    },
    { role: "user", content: "Which doubles should I focus on?" },
  ];

  try {
    const response = await service.sendChat(messages);
    console.log("Assistant:", response.choices[0].message.content);

    // Continue the conversation
    messages.push({
      role: "assistant",
      content: response.choices[0].message.content,
    });
    messages.push({
      role: "user",
      content: "How many attempts should I do?",
    });

    const followUp = await service.sendChat(messages);
    console.log("Follow-up:", followUp.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================
// Example 6: Error Handling
// ============================================
export async function errorHandlingExample() {
  const service = new OpenRouterService({
    apiKey: process.env.OPENROUTER_API_KEY || "",
  });

  const messages: ChatMessage[] = [{ role: "user", content: "Test message" }];

  try {
    const response = await service.sendChat(messages);
    console.log("Success:", response.choices[0].message.content);
  } catch (error) {
    // Handle different error types
    if (error instanceof OpenRouterApiError) {
      console.error("API Error:", {
        message: error.message,
        statusCode: error.statusCode,
        errorType: error.errorType,
        errorCode: error.errorCode,
      });

      // Handle specific status codes
      if (error.statusCode === 401) {
        console.error("Invalid API key");
      } else if (error.statusCode === 429) {
        console.error("Rate limit exceeded - service already retried");
      } else if (error.statusCode === 402) {
        console.error("Insufficient credits");
      }
    } else if (error instanceof OpenRouterValidationError) {
      console.error("Validation Error:", {
        message: error.message,
        errors: error.validationErrors,
      });
    } else if (error instanceof OpenRouterNetworkError) {
      console.error("Network Error:", {
        message: error.message,
        originalError: error.originalError,
      });
    } else {
      console.error("Unknown error:", error);
    }
  }
}

// ============================================
// Example 7: Model Override and Custom Parameters
// ============================================
export async function modelOverrideExample() {
  const service = new OpenRouterService({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultModel: "openai/gpt-4o-mini",
    defaultParams: {
      temperature: 0.7,
      max_tokens: 500,
    },
  });

  const messages: ChatMessage[] = [{ role: "user", content: "Write a creative darts tournament name." }];

  try {
    // Override model and params for this specific call
    const response = await service.sendChat(messages, undefined, {
      model: "anthropic/claude-3.5-sonnet", // Use a different model
      params: {
        temperature: 0.9, // More creative
        max_tokens: 100,
      },
    });

    console.log("Creative name:", response.choices[0].message.content);
    console.log("Model used:", response.model);
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================
// Example 8: With Logging
// ============================================
export async function withLoggingExample() {
  // Custom logger function
  const logger = (level: string, message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`, data || "");
  };

  const service = new OpenRouterService({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    logger, // Inject logger
  });

  const messages: ChatMessage[] = [{ role: "user", content: "Hello!" }];

  try {
    const response = await service.sendChat(messages);
    console.log("Response:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================
// Example 9: Update Default Settings
// ============================================
export async function updateDefaultsExample() {
  const service = new OpenRouterService({
    apiKey: process.env.OPENROUTER_API_KEY || "",
  });

  // Change default model
  service.setDefaultModel("anthropic/claude-3.5-sonnet");

  // Update default parameters
  service.setDefaultParams({
    temperature: 0.5,
    max_tokens: 1000,
  });

  const messages: ChatMessage[] = [{ role: "user", content: "Analyze my darts game." }];

  try {
    const response = await service.sendChat(messages);
    console.log("Analysis:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

// ============================================
// Example 10: Goal Progress Analysis
// ============================================
export async function goalProgressAnalysisExample() {
  const service = new OpenRouterService({
    apiKey: process.env.OPENROUTER_API_KEY || "",
  });

  const responseFormat: ResponseFormat = {
    type: "json_schema",
    json_schema: {
      name: "GoalAnalysis",
      strict: true,
      schema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["on_track", "behind", "ahead", "achieved"],
          },
          progress_percentage: { type: "number" },
          analysis: { type: "string" },
          next_steps: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["status", "progress_percentage", "analysis", "next_steps"],
        additionalProperties: false,
      },
    },
  };

  const goalData = {
    target_avg: 85,
    current_avg: 78.5,
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    tournaments_played: 15,
  };

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "You are a data analyst specializing in darts performance tracking.",
    },
    {
      role: "user",
      content: `Analyze progress toward this goal: ${JSON.stringify(goalData)}`,
    },
  ];

  try {
    const response = await service.sendChat(messages, responseFormat);
    const analysis = response.parsedContent;

    console.log("Goal Status:", analysis.status);
    console.log("Progress:", `${analysis.progress_percentage}%`);
    console.log("Analysis:", analysis.analysis);
    console.log("Next Steps:", analysis.next_steps);

    return analysis;
  } catch (error) {
    console.error("Failed to analyze goal progress:", error);
    throw error;
  }
}

// ============================================
// Run Examples (Uncomment to test)
// ============================================
/*
(async () => {
  console.log('=== Example 1: Basic Chat ===');
  await basicChatExample();

  console.log('\n=== Example 2: Chat with System Message ===');
  await chatWithSystemMessageExample();

  console.log('\n=== Example 3: Structured Response ===');
  await structuredResponseExample();

  console.log('\n=== Example 4: Tournament Feedback ===');
  await generateTournamentFeedbackExample();

  console.log('\n=== Example 5: Multi-turn Conversation ===');
  await conversationExample();

  console.log('\n=== Example 6: Error Handling ===');
  await errorHandlingExample();

  console.log('\n=== Example 7: Model Override ===');
  await modelOverrideExample();

  console.log('\n=== Example 8: With Logging ===');
  await withLoggingExample();

  console.log('\n=== Example 9: Update Defaults ===');
  await updateDefaultsExample();

  console.log('\n=== Example 10: Goal Progress Analysis ===');
  await goalProgressAnalysisExample();
})();
*/
