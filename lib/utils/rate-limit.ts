import "server-only";
import { ANONYMOUS_LIMITS } from "@/lib/types/anonymous";

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
};

type RateLimitOptions = {
  identifier: string;
  limit: number;
  windowSize: number;
  redisClient: any;
  keyPrefix: string;
};

async function checkRateLimit({
  identifier,
  limit,
  windowSize,
  redisClient,
  keyPrefix,
}: RateLimitOptions): Promise<RateLimitResult> {
  if (!redisClient) {
    return {
      success: true,
      remaining: limit,
      resetTime: Date.now() + windowSize * 1000,
    };
  }

  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSize * 1000)) * windowSize * 1000;
  const resetTime = windowStart + windowSize * 1000;

  try {
    // Use individual commands instead of pipeline for compatibility
    const currentCount = await redisClient.get(key);
    const currentCountNum = currentCount
      ? Number.parseInt(currentCount, 10)
      : 0;

    // Increment the counter
    const newCount = await redisClient.incr(key);

    // Set expiry if this is the first increment
    if (currentCountNum === 0) {
      await redisClient.expire(key, windowSize);
    }

    if (newCount > limit) {
      return {
        success: false,
        remaining: 0,
        resetTime,
        error: "Rate limit exceeded",
      };
    }

    return {
      success: true,
      remaining: Math.max(0, limit - newCount),
      resetTime,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // Fail open - allow request if Redis is down
    return {
      success: true,
      remaining: limit,
      resetTime,
    };
  }
}

const WINDOW_SIZE_MINUTE = 60;
const WINDOW_SIZE_MONTH = 30 * 24 * 60 * 60;

export async function checkAnonymousRateLimit(
  ip: string,
  redisClient: any
): Promise<{
  success: boolean;
  error?: string;
  headers?: Record<string, string>;
}> {
  const { RATE_LIMIT } = ANONYMOUS_LIMITS;

  // Check per-minute limit
  const minuteResult = await checkRateLimit({
    identifier: ip,
    limit: RATE_LIMIT.REQUESTS_PER_MINUTE,
    windowSize: WINDOW_SIZE_MINUTE,
    redisClient,
    keyPrefix: "sparka-ai:rate-limit:minute",
  });

  if (!minuteResult.success) {
    return {
      success: false,
      error: `Rate limit exceeded. You can make ${RATE_LIMIT.REQUESTS_PER_MINUTE} requests per minute. You've made ${RATE_LIMIT.REQUESTS_PER_MINUTE - minuteResult.remaining} requests this minute. Try again in ${Math.ceil((minuteResult.resetTime - Date.now()) / 1000)} seconds.`,
      headers: {
        "X-RateLimit-Limit": RATE_LIMIT.REQUESTS_PER_MINUTE.toString(),
        "X-RateLimit-Remaining": minuteResult.remaining.toString(),
        "X-RateLimit-Reset": minuteResult.resetTime.toString(),
      },
    };
  }

  // Check per-month limit
  const monthResult = await checkRateLimit({
    identifier: ip,
    limit: RATE_LIMIT.REQUESTS_PER_MONTH,
    windowSize: WINDOW_SIZE_MONTH,
    redisClient,
    keyPrefix: "sparka-ai:rate-limit:month",
  });

  if (!monthResult.success) {
    const daysUntilReset = Math.ceil(
      (monthResult.resetTime - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return {
      success: false,
      error: `Monthly message limit exceeded. You can make ${RATE_LIMIT.REQUESTS_PER_MONTH} requests per month. You've made ${RATE_LIMIT.REQUESTS_PER_MONTH - monthResult.remaining} requests this month. Try again in ${daysUntilReset} day${daysUntilReset !== 1 ? "s" : ""}.`,
      headers: {
        "X-RateLimit-Limit": RATE_LIMIT.REQUESTS_PER_MONTH.toString(),
        "X-RateLimit-Remaining": monthResult.remaining.toString(),
        "X-RateLimit-Reset": monthResult.resetTime.toString(),
      },
    };
  }

  return {
    success: true,
    headers: {
      "X-RateLimit-Limit-Minute": RATE_LIMIT.REQUESTS_PER_MINUTE.toString(),
      "X-RateLimit-Remaining-Minute": minuteResult.remaining.toString(),
      "X-RateLimit-Reset-Minute": minuteResult.resetTime.toString(),
      "X-RateLimit-Limit-Month": RATE_LIMIT.REQUESTS_PER_MONTH.toString(),
      "X-RateLimit-Remaining-Month": monthResult.remaining.toString(),
      "X-RateLimit-Reset-Month": monthResult.resetTime.toString(),
    },
  };
}

export function getClientIP(request: Request): string {
  // Try to get the real IP from various headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default IP if no headers are present
  return "127.0.0.1";
}
