import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterService } from "./openrouter.service";
import { OpenRouterApiError, OpenRouterNetworkError, OpenRouterValidationError } from "../errors/openrouter.errors";
import type { ChatMessage, ChatResponse, ResponseFormat } from "../../types/openrouter.types";

describe("OpenRouterService", () => {
  let service: OpenRouterService;
  const mockApiKey = "test-api-key-123";
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock global fetch
    mockFetch = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = mockFetch as any;

    // Create service instance
    service = new OpenRouterService({
      apiKey: mockApiKey,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with required apiKey", () => {
      expect(service).toBeInstanceOf(OpenRouterService);
    });

    it("should throw error when apiKey is missing", () => {
      expect(() => new OpenRouterService({ apiKey: "" })).toThrow("OpenRouter API key is required");
    });

    it("should throw error when apiKey is only whitespace", () => {
      expect(() => new OpenRouterService({ apiKey: "   " })).toThrow("OpenRouter API key is required");
    });

    it("should initialize with custom baseUrl", () => {
      const customService = new OpenRouterService({
        apiKey: mockApiKey,
        baseUrl: "https://custom.api.com",
      });
      expect(customService).toBeInstanceOf(OpenRouterService);
    });

    it("should initialize with custom defaultModel", () => {
      const customService = new OpenRouterService({
        apiKey: mockApiKey,
        defaultModel: "gpt-4",
      });
      expect(customService).toBeInstanceOf(OpenRouterService);
    });

    it("should initialize with defaultParams", () => {
      const customService = new OpenRouterService({
        apiKey: mockApiKey,
        defaultParams: { temperature: 0.7, max_tokens: 1000 },
      });
      expect(customService).toBeInstanceOf(OpenRouterService);
    });

    it("should initialize with logger", () => {
      const mockLogger = vi.fn();
      const customService = new OpenRouterService({
        apiKey: mockApiKey,
        logger: mockLogger,
      });
      expect(customService).toBeInstanceOf(OpenRouterService);
      expect(mockLogger).toHaveBeenCalled();
    });
  });

  describe("sendChat", () => {
    const mockMessages: ChatMessage[] = [{ role: "user", content: "Hello, world!" }];

    const mockResponse = {
      id: "chatcmpl-123",
      object: "chat.completion",
      created: 1234567890,
      model: "gpt-4o-mini",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Hello! How can I help you?",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    } as ChatResponse;

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
    });

    it("should send chat request successfully", async () => {
      const response = await service.sendChat(mockMessages);

      expect(response).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/chat/completions"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
            "Content-Type": "application/json",
          }),
          body: expect.any(String),
        })
      );
    });

    it("should throw error when messages array is empty", async () => {
      await expect(service.sendChat([])).rejects.toThrow("Messages array cannot be empty");
    });

    it("should throw error when messages is undefined", async () => {
      await expect(service.sendChat(undefined as unknown as ChatMessage[])).rejects.toThrow(
        "Messages array cannot be empty"
      );
    });

    it("should throw error when message has no role", async () => {
      const invalidMessages = [{ content: "Hello" } as ChatMessage];

      await expect(service.sendChat(invalidMessages)).rejects.toThrow("Each message must have a role and content");
    });

    it("should throw error when message has no content", async () => {
      const invalidMessages = [{ role: "user" } as ChatMessage];

      await expect(service.sendChat(invalidMessages)).rejects.toThrow("Each message must have a role and content");
    });

    it("should inject default system message when absent", async () => {
      await service.sendChat(mockMessages);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[0]).toEqual({
        role: "system",
        content: "You are a helpful assistant.",
      });
      expect(callBody.messages[1]).toEqual(mockMessages[0]);
    });

    it("should not inject system message when already present", async () => {
      const messagesWithSystem: ChatMessage[] = [
        { role: "system", content: "Custom system message" },
        { role: "user", content: "Hello" },
      ];

      await service.sendChat(messagesWithSystem);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages).toHaveLength(2);
      expect(callBody.messages[0].content).toBe("Custom system message");
    });

    it("should use overrides for model", async () => {
      await service.sendChat(mockMessages, undefined, { model: "gpt-4" });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe("gpt-4");
    });

    it("should use overrides for params", async () => {
      await service.sendChat(mockMessages, undefined, {
        params: { temperature: 0.9 },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.temperature).toBe(0.9);
    });

    it("should include response_format when provided", async () => {
      const responseFormat: ResponseFormat = {
        type: "json_schema",
        json_schema: {
          name: "test_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      };

      const mockResponseWithJson: ChatResponse = {
        ...mockResponse,
        choices: [
          {
            ...mockResponse.choices[0],
            message: {
              role: "assistant",
              content: '{"name":"John"}',
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponseWithJson,
      });

      await service.sendChat(mockMessages, responseFormat);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.response_format).toEqual(responseFormat);
    });

    it("should validate response when responseFormat is provided", async () => {
      const responseFormat: ResponseFormat = {
        type: "json_schema",
        json_schema: {
          name: "test_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      };

      const mockResponseWithJson: ChatResponse = {
        ...mockResponse,
        choices: [
          {
            ...mockResponse.choices[0],
            message: {
              role: "assistant",
              content: '{"name":"John"}',
            },
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponseWithJson,
      });

      const response = await service.sendChat(mockMessages, responseFormat);

      expect(response.parsedContent).toEqual({ name: "John" });
    });

    it("should throw validation error when response has no choices", async () => {
      const responseFormat: ResponseFormat = {
        type: "json_schema",
        json_schema: {
          name: "test_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ...mockResponse, choices: [] }),
      });

      await expect(service.sendChat(mockMessages, responseFormat)).rejects.toThrow(OpenRouterValidationError);
    });

    it("should throw validation error when content is empty", async () => {
      const responseFormat: ResponseFormat = {
        type: "json_schema",
        json_schema: {
          name: "test_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockResponse,
          choices: [
            {
              ...mockResponse.choices[0],
              message: { role: "assistant", content: "" },
            },
          ],
        }),
      });

      await expect(service.sendChat(mockMessages, responseFormat)).rejects.toThrow(OpenRouterValidationError);
    });

    it("should throw validation error when content is not valid JSON", async () => {
      const responseFormat: ResponseFormat = {
        type: "json_schema",
        json_schema: {
          name: "test_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockResponse,
          choices: [
            {
              ...mockResponse.choices[0],
              message: { role: "assistant", content: "not valid json" },
            },
          ],
        }),
      });

      await expect(service.sendChat(mockMessages, responseFormat)).rejects.toThrow(OpenRouterValidationError);
    });

    it("should throw validation error when JSON doesn't match schema", async () => {
      const responseFormat: ResponseFormat = {
        type: "json_schema",
        json_schema: {
          name: "test_schema",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockResponse,
          choices: [
            {
              ...mockResponse.choices[0],
              message: { role: "assistant", content: '{"age":25}' },
            },
          ],
        }),
      });

      await expect(service.sendChat(mockMessages, responseFormat)).rejects.toThrow(OpenRouterValidationError);
    });
  });

  describe("setDefaultModel", () => {
    it("should update default model", () => {
      service.setDefaultModel("gpt-4");
      // No direct way to test this, but it should not throw
      expect(() => service.setDefaultModel("gpt-4")).not.toThrow();
    });

    it("should throw error when model name is empty", () => {
      expect(() => service.setDefaultModel("")).toThrow("Model name cannot be empty");
    });

    it("should throw error when model name is only whitespace", () => {
      expect(() => service.setDefaultModel("   ")).toThrow("Model name cannot be empty");
    });
  });

  describe("setDefaultParams", () => {
    it("should update default params", () => {
      service.setDefaultParams({ temperature: 0.8 });
      // No direct way to test this, but it should not throw
      expect(() => service.setDefaultParams({ temperature: 0.8 })).not.toThrow();
    });

    it("should merge params", () => {
      service.setDefaultParams({ temperature: 0.8 });
      service.setDefaultParams({ max_tokens: 1000 });
      // Params should be merged, not replaced
      expect(() => service.setDefaultParams({ top_p: 0.9 })).not.toThrow();
    });
  });

  describe("error handling", () => {
    const mockMessages: ChatMessage[] = [{ role: "user", content: "Hello" }];

    it("should throw OpenRouterApiError on 400 error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          error: {
            message: "Invalid request",
            type: "invalid_request_error",
            code: "INVALID_REQUEST",
          },
        }),
      });

      await expect(service.sendChat(mockMessages)).rejects.toThrow(OpenRouterApiError);
    });

    it("should throw OpenRouterApiError on 401 error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: {
            message: "Invalid API key",
          },
        }),
      });

      await expect(service.sendChat(mockMessages)).rejects.toThrow(OpenRouterApiError);
    });

    it("should handle 429 rate limit with retry", async () => {
      const mockResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "gpt-4o-mini",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Success after retry",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      } as ChatResponse;

      // First call returns 429, second call succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          json: async () => ({
            error: {
              message: "Rate limit exceeded",
              type: "rate_limit_exceeded",
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const response = await service.sendChat(mockMessages);

      expect(response).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should throw after max retries on 429", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: async () => ({
          error: {
            message: "Rate limit exceeded",
          },
        }),
      });

      await expect(service.sendChat(mockMessages)).rejects.toThrow(OpenRouterApiError);
      expect(mockFetch).toHaveBeenCalledTimes(3); // MAX_RETRIES
    });

    it("should handle network errors with retry", async () => {
      const mockResponse = {
        id: "chatcmpl-123",
        object: "chat.completion",
        created: 1234567890,
        model: "gpt-4o-mini",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Success after retry",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      } as ChatResponse;

      // First call throws network error, second succeeds
      mockFetch.mockRejectedValueOnce(new TypeError("Network error")).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await service.sendChat(mockMessages);

      expect(response).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should throw OpenRouterNetworkError after max retries", async () => {
      mockFetch.mockRejectedValue(new TypeError("Network error"));

      await expect(service.sendChat(mockMessages)).rejects.toThrow(OpenRouterNetworkError);
      expect(mockFetch).toHaveBeenCalledTimes(3); // MAX_RETRIES
    });

    it("should handle error response without JSON body", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      await expect(service.sendChat(mockMessages)).rejects.toThrow(OpenRouterApiError);
    });
  });
});
