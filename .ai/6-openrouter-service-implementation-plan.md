# OpenRouterService Implementation Plan

## 1. Service Description
The `OpenRouterService` provides a thin, reusable TypeScript wrapper around the OpenRouter API for LLM-based chats. It handles configuration, message assembly (system/user), response formatting/validation, error handling, retries, and exposes a simple interface for client code.

## 2. Constructor Description
```ts
constructor(options: {
  apiKey: string;
  baseUrl?: string;          // Defaults to OpenRouter’s public API URL
  defaultModel?: string;     // e.g. "gpt-4o-mini"
  defaultParams?: Record<string, any>;
})
```
- Loads and freezes config  
- Instantiates HTTP client with auth header  
- Sets defaults for `model`, `params`, and `baseUrl`.

## 3. Public Methods and Fields
### 3.1 sendChat
```ts
async sendChat(messages: ChatMessage[],
               responseFormat?: ResponseFormat,
               overrides?: {
                 model?: string;
                 params?: Record<string, any>;
               }): Promise<ChatResponse>
```
- **messages**: sequence of `{ role: 'system'|'user'|'assistant', content: string }`  
- **responseFormat**: optional JSON‐schema spec  
- **overrides**: per-call model or param adjustments  
- Returns parsed & validated JSON or raw text

### 3.2 setDefaultModel(name: string): void
- Update default model for subsequent calls.

### 3.3 setDefaultParams(params: Record<string, any>): void
- Merge into default model parameters.

## 4. Private Methods and Fields
### 4.1 buildPayload
- Assembles `{ model, messages, response_format, ...params }`  
- Injects default system message if absent.

### 4.2 validateResponse
- Uses lightweight JSON‐schema validator (e.g. `ajv`)  
- Ensures `strict: true` mode when required.

### 4.3 request
- Low‐level HTTP invoker with retries & exponential backoff  
- Handles 429s and network timeouts.

### 4.4 handleError
- Parses HTTP error body, wraps into custom error types:
  - `OpenRouterApiError`
  - `OpenRouterValidationError`
  - `OpenRouterNetworkError`

### 4.5 logger
- Optional request/response logging hook for observability.

## 5. Error Handling
1. **Invalid API Key**: 401 Unauthorized  
2. **Rate Limit Exceeded**: 429 Too Many Requests  
3. **Network Timeout/Offline**: request aborted  
4. **Schema Validation Failure**: response does not match format  
5. **Unexpected HTTP Codes**: 5xx or non‐JSON payload  
6. **Payload Size Limits**: request exceeds token limits  

_For each scenario, the service should throw a descriptive custom error and optionally retry (for 429/network)._  

## 6. Security Considerations
- Securely store API key (env var, not in code)  
- Do **not** log sensitive message content by default  
- Enforce HTTPS + strict TLS verification  
- Rate‐limit client calls to avoid API overuse  
- Sanitize and escape any dynamic user content if embedded in system messages

## 7. Step-by-Step Implementation Plan
1. **Scaffold Service Class**  
   - Create `src/lib/services/openrouter.service.ts`  
   - Define `OpenRouterService` class and constructor signature.
2. **Config & HTTP Client**  
   - Read `apiKey` from ctor, default `baseUrl` const.  
   - Use `fetch` or lightweight HTTP lib; attach auth header.
3. **Message Types & Interfaces**  
   - Define `ChatMessage`, `ResponseFormat`, `ChatResponse`, and error types in `src/types.ts`.
4. **buildPayload()**  
   - Implement merging of default vs. override props.  
   - Example response format spec:
     ```ts
     const responseFormat: ResponseFormat = {
       type: 'json_schema',
       json_schema: {
         name: 'MyChatSchema',
         strict: true,
         schema: {
           type: 'object',
           properties: {
             answer: { type: 'string' },
             sources: {
               type: 'array',
               items: { type: 'string' }
             }
           },
           required: ['answer']
         }
       }
     }
     ```
5. **sendChat()**  
   - Validate inputs; guard clauses for empty messages.  
   - Call `buildPayload()`, then `request()`.  
   - Pass HTTP response into `validateResponse()` if `responseFormat` present.
6. **validateResponse()**  
   - Integrate `ajv` or similar to compile and validate schema.  
   - Throw `OpenRouterValidationError` on failure.
7. **request() & Retries**  
   - Wrap `fetch()` in try/catch.  
   - On 429 or network error, apply exponential backoff (e.g. 500ms → 2s → 4s).  
   - Respect a max retry count (e.g. 3).
8. **Error Types & handleError()**  
   - Create custom error classes in `src/lib/errors/openrouter.errors.ts`.  
   - Map HTTP status codes to error classes.
9. **Logging Hook**  
   - Allow optional logger injection via ctor.  
   - Log requests/responses at DEBUG level only.
12. **Example Usage Snippet**
    ```ts
    const svc = new OpenRouterService({ apiKey: process.env.OPENROUTER_KEY! });
    const messages = [
      { role: 'system', content: 'You are an expert assistant.' },
      { role: 'user', content: 'Summarize the latest sales report.' }
    ];
    const fmt = {
      type: 'json_schema',
      json_schema: {
        name: 'SalesSummary',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            totalSales: { type: 'number' }
          },
          required: ['summary', 'totalSales']
        }
      }
    };
    const result = await svc.sendChat(messages, fmt, {
      model: 'gpt-4o-mini',
      params: { temperature: 0.2, max_tokens: 500 }
    });
    console.log(result.summary);
    ```
