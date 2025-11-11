import type {
  ChatMessage,
  ChatResponse,
  OpenRouterServiceOptions,
  ResponseFormat,
  SendChatOverrides,
  OpenRouterErrorResponse,
} from "../../types/openrouter.types";
import { OpenRouterApiError, OpenRouterNetworkError, OpenRouterValidationError } from "../errors/openrouter.errors";
import Ajv, { type ValidateFunction } from "ajv";

/**
 * OpenRouter API Service
 * Provides a thin wrapper around OpenRouter API for LLM-based chats
 * Handles configuration, message assembly, response validation, and error handling
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private defaultModel: string;
  private defaultParams: Record<string, any>;
  private readonly logger?: (level: string, message: string, data?: any) => void;
  private readonly ajv: InstanceType<typeof Ajv>;

  // Constants
  private static readonly DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
  private static readonly DEFAULT_MODEL = "gpt-4o-mini";
  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_RETRY_DELAY = 500; // milliseconds

  /**
   * Creates a new OpenRouterService instance
   * @param options Configuration options for the service
   */
  constructor(options: OpenRouterServiceOptions) {
    // Guard: Validate API key
    if (!options.apiKey || options.apiKey.trim() === "") {
      throw new Error("OpenRouter API key is required");
    }

    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || OpenRouterService.DEFAULT_BASE_URL;
    this.defaultModel = options.defaultModel || OpenRouterService.DEFAULT_MODEL;
    this.defaultParams = options.defaultParams || {};
    this.logger = options.logger;

    // Initialize JSON schema validator
    this.ajv = new Ajv({ allErrors: true });

    this.log("debug", "OpenRouterService initialized", {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
    });
  }

  /**
   * Send a chat request to OpenRouter API
   * @param messages Array of chat messages
   * @param responseFormat Optional JSON schema for structured response
   * @param overrides Optional per-call model or parameter overrides
   * @returns Promise resolving to chat response
   */
  public async sendChat(
    messages: ChatMessage[],
    responseFormat?: ResponseFormat,
    overrides?: SendChatOverrides
  ): Promise<ChatResponse> {
    // Guard: Validate messages
    if (!messages || messages.length === 0) {
      throw new Error("Messages array cannot be empty");
    }

    // Guard: Validate message structure
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        throw new Error("Each message must have a role and content");
      }
    }

    this.log("debug", "Sending chat request", { messageCount: messages.length });

    const payload = this.buildPayload(messages, responseFormat, overrides);
    const response = await this.request("/chat/completions", payload);

    // Validate response if format specified
    if (responseFormat) {
      this.validateResponse(response, responseFormat);
    }

    return response;
  }

  /**
   * Update the default model for subsequent requests
   * @param name Model name
   */
  public setDefaultModel(name: string): void {
    if (!name || name.trim() === "") {
      throw new Error("Model name cannot be empty");
    }
    this.defaultModel = name;
    this.log("debug", "Default model updated", { model: name });
  }

  /**
   * Merge parameters into default model parameters
   * @param params Parameters to merge
   */
  public setDefaultParams(params: Record<string, any>): void {
    this.defaultParams = { ...this.defaultParams, ...params };
    this.log("debug", "Default params updated", { params: this.defaultParams });
  }

  /**
   * Build request payload for OpenRouter API
   * @param messages Chat messages
   * @param responseFormat Optional response format
   * @param overrides Optional overrides
   * @returns Request payload
   */
  private buildPayload(
    messages: ChatMessage[],
    responseFormat?: ResponseFormat,
    overrides?: SendChatOverrides
  ): Record<string, any> {
    // Inject default system message if absent
    const hasSystemMessage = messages.some((msg) => msg.role === "system");
    const finalMessages = hasSystemMessage
      ? messages
      : [
          {
            role: "system" as const,
            content: "You are a helpful assistant.",
          },
          ...messages,
        ];

    // Merge model and params
    const model = overrides?.model || this.defaultModel;
    const params = { ...this.defaultParams, ...overrides?.params };

    const payload: Record<string, any> = {
      model,
      messages: finalMessages,
      ...params,
    };

    // Add response format if specified
    if (responseFormat) {
      payload.response_format = responseFormat;
    }

    return payload;
  }

  /**
   * Validate API response against JSON schema
   * @param response Chat response
   * @param responseFormat Expected format
   * @throws OpenRouterValidationError if validation fails
   */
  private validateResponse(response: ChatResponse, responseFormat: ResponseFormat): void {
    // Guard: Check if response has content
    if (!response.choices || response.choices.length === 0) {
      throw new OpenRouterValidationError("Response has no choices", []);
    }

    const content = response.choices[0].message.content;

    // Guard: Check if content exists
    if (!content) {
      throw new OpenRouterValidationError("Response content is empty", []);
    }

    // Parse JSON content
    let parsedContent: any;
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      throw new OpenRouterValidationError("Failed to parse response as JSON", [{ message: (error as Error).message }]);
    }

    // Validate against schema
    const schema = responseFormat.json_schema.schema;
    const validate = this.ajv.compile(schema);
    const valid = validate(parsedContent);

    if (!valid) {
      throw new OpenRouterValidationError("Response does not match expected schema", validate.errors || []);
    }

    // Attach parsed content to response
    response.parsedContent = parsedContent;

    this.log("debug", "Response validation successful");
  }

  /**
   * Make HTTP request to OpenRouter API with retry logic
   * @param endpoint API endpoint
   * @param payload Request payload
   * @returns Promise resolving to chat response
   */
  private async request(endpoint: string, payload: Record<string, any>): Promise<ChatResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < OpenRouterService.MAX_RETRIES; attempt++) {
      try {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://darterassistant.app", // Optional: for OpenRouter tracking
            "X-Title": "Darter Assistant", // Optional: for OpenRouter tracking
          },
          body: JSON.stringify(payload),
        });

        // Handle non-OK responses
        if (!response.ok) {
          await this.handleError(response, attempt);
          continue; // Retry on rate limit
        }

        const data = await response.json();
        this.log("debug", "Request successful", { responseId: data.id });
        return data as ChatResponse;
      } catch (error) {
        lastError = error as Error;

        // Check if it's a network error
        if (error instanceof OpenRouterNetworkError || error instanceof TypeError) {
          this.log("warn", "Network error, retrying", {
            attempt: attempt + 1,
            error: (error as Error).message,
          });

          // Wait before retry with exponential backoff
          if (attempt < OpenRouterService.MAX_RETRIES - 1) {
            await this.delay(OpenRouterService.INITIAL_RETRY_DELAY * Math.pow(2, attempt));
            continue;
          }
        }

        // Re-throw if not retryable or max retries reached
        throw error;
      }
    }

    // Max retries exceeded
    throw new OpenRouterNetworkError(`Max retries (${OpenRouterService.MAX_RETRIES}) exceeded`, lastError || undefined);
  }

  /**
   * Handle API error responses
   * @param response Fetch response
   * @param attempt Current attempt number
   * @throws OpenRouterApiError or OpenRouterNetworkError
   */
  private async handleError(response: Response, attempt: number): Promise<void> {
    const statusCode = response.status;

    // Try to parse error body
    let errorBody: OpenRouterErrorResponse | null = null;
    try {
      errorBody = await response.json();
    } catch {
      // Ignore JSON parse errors
    }

    const errorMessage = errorBody?.error?.message || response.statusText || "Unknown error";
    const errorType = errorBody?.error?.type;
    const errorCode = errorBody?.error?.code;

    // Handle rate limiting with retry
    if (statusCode === 429) {
      this.log("warn", "Rate limit exceeded, retrying", {
        attempt: attempt + 1,
      });

      // Wait before retry with exponential backoff
      if (attempt < OpenRouterService.MAX_RETRIES - 1) {
        await this.delay(OpenRouterService.INITIAL_RETRY_DELAY * Math.pow(2, attempt));
        return; // Continue retry loop
      }
    }

    // Throw appropriate error
    throw new OpenRouterApiError(errorMessage, statusCode, errorType, errorCode);
  }

  /**
   * Log message if logger is configured
   * @param level Log level
   * @param message Log message
   * @param data Optional data to log
   */
  private log(level: string, message: string, data?: any): void {
    if (this.logger) {
      this.logger(level, message, data);
    }
  }

  /**
   * Delay execution for specified milliseconds
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
