/**
 * Base error class for OpenRouter API errors
 */
export class OpenRouterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterError";
    Object.setPrototypeOf(this, OpenRouterError.prototype);
  }
}

/**
 * Error thrown when OpenRouter API returns an error response
 */
export class OpenRouterApiError extends OpenRouterError {
  public readonly statusCode: number;
  public readonly errorType?: string;
  public readonly errorCode?: string;

  constructor(message: string, statusCode: number, errorType?: string, errorCode?: string) {
    super(message);
    this.name = "OpenRouterApiError";
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, OpenRouterApiError.prototype);
  }
}

/**
 * Error thrown when response validation fails
 */
export class OpenRouterValidationError extends OpenRouterError {
  public readonly validationErrors: any[];

  constructor(message: string, validationErrors: any[] = []) {
    super(message);
    this.name = "OpenRouterValidationError";
    this.validationErrors = validationErrors;
    Object.setPrototypeOf(this, OpenRouterValidationError.prototype);
  }
}

/**
 * Error thrown when network issues occur
 */
export class OpenRouterNetworkError extends OpenRouterError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = "OpenRouterNetworkError";
    this.originalError = originalError;
    Object.setPrototypeOf(this, OpenRouterNetworkError.prototype);
  }
}
