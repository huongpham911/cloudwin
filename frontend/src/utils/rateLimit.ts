/**
 * Rate limiting utilities for WinCloud Builder frontend
 * Provides client-side rate limiting and request throttling
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

export const RateLimitConfigs = {
  default: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests, please try again later.'
  },
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts, please try again later.'
  },
  api: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minute
    message: 'API rate limit exceeded, please slow down.'
  }
};

class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old requests outside the time window
    this.requests = this.requests.filter(timestamp => timestamp > windowStart);

    // Check if we've exceeded the limit
    if (this.requests.length >= this.config.maxRequests) {
      return false;
    }

    // Add current request
    this.requests.push(now);
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemainingRequests(): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const validRequests = this.requests.filter(timestamp => timestamp > windowStart);
    return Math.max(0, this.config.maxRequests - validRequests.length);
  }

  /**
   * Get time until window resets (in ms)
   */
  getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    const windowEnd = oldestRequest + this.config.windowMs;
    return Math.max(0, windowEnd - Date.now());
  }
}

// Rate limiter instances
const rateLimiters = new Map<string, RateLimiter>();

/**
 * Get or create a rate limiter for a specific key
 */
export const getRateLimiter = (key: string, config: RateLimitConfig = RateLimitConfigs.default): RateLimiter => {
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, new RateLimiter(config));
  }
  return rateLimiters.get(key)!;
};

/**
 * Check if request is rate limited
 */
export const isRateLimited = (key: string, config?: RateLimitConfig): boolean => {
  const limiter = getRateLimiter(key, config);
  return !limiter.isAllowed();
};

/**
 * Rate limit decorator for functions
 */
export const rateLimit = (key: string, config?: RateLimitConfig) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const limiter = getRateLimiter(key, config);
      if (!limiter.isAllowed()) {
        throw new Error(config?.message || RateLimitConfigs.default.message);
      }
      return method.apply(this, args);
    };
  };
};

export default RateLimiter;
