import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("openai.retry");

/**
 * Exponential backoff retry wrapper for OpenAI API calls
 *
 * Retries transient errors (rate limits, server errors) with exponential backoff.
 * Does not retry client errors (400, 403, 404).
 *
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Result of the function call
 * @throws Error if max retries exceeded or non-retryable error occurs
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable based on status code
      const isRetryable = isRetryableError(error);

      if (!isRetryable || attempt === maxRetries) {
        log.error(
          {
            attempt,
            maxRetries,
            isRetryable,
            error: {
              name: lastError.name,
              message: lastError.message,
            },
          },
          "withRetry: non-retryable error or max retries exceeded"
        );
        throw lastError;
      }

      // Calculate exponential backoff delay: 2^attempt * 1000ms
      const delayMs = 2 ** attempt * 1000;

      log.warn(
        {
          attempt,
          maxRetries,
          delayMs,
          error: {
            name: lastError.name,
            message: lastError.message,
          },
        },
        "withRetry: retrying after error"
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Should never reach here, but TypeScript doesn't know that
  throw lastError || new Error("Unknown error in withRetry");
}

/**
 * Checks if an error is retryable based on HTTP status code
 *
 * Retryable errors:
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 * - 503: Service unavailable
 *
 * Non-retryable errors:
 * - 400: Bad request (client error)
 * - 403: Forbidden (client error)
 * - 404: Not found (client error)
 * - All other errors
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  // Check for OpenAI API error with status code
  const apiError = error as {
    status?: number;
    statusCode?: number;
  };

  const statusCode = apiError.status || apiError.statusCode;

  if (!statusCode) {
    return false;
  }

  // Retry on rate limits and server errors
  return statusCode === 429 || statusCode === 500 || statusCode === 503;
}
