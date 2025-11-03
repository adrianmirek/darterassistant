/**
 * Service for AI API interactions via OpenRouter
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * Calls OpenRouter AI API with a prompt
 */
export async function generateAIResponse(
  messages: AIMessage[],
  options: AIRequestOptions = {}
): Promise<{ response: string | null; error: any }> {
  try {
    const {
      model = 'meta-llama/llama-3.1-8b-instruct:free',
      temperature = 0.7,
      maxTokens = 500,
      timeout = 10000,
    } = options;

    // Get API key from environment
    const apiKey = import.meta.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return {
        response: null,
        error: new Error('OpenRouter API key not configured'),
      };
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://darterassistant.app', // Optional: for OpenRouter analytics
          'X-Title': 'Darter Assistant', // Optional: for OpenRouter analytics
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          response: null,
          error: new Error(
            `OpenRouter API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
          ),
        };
      }

      const data = await response.json();

      // Extract the AI response
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        return {
          response: null,
          error: new Error('No response from AI model'),
        };
      }

      return { response: aiResponse, error: null };
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          response: null,
          error: new Error('AI request timed out'),
        };
      }

      throw error;
    }
  } catch (error) {
    return { response: null, error };
  }
}

