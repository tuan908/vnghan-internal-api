import {
  type ICacheEntry,
  type ICacheOptions,
  decodeBody,
  defaultOptions,
  encodeBody,
  RedisCacheStore,
} from "@/lib/cache";
import { tryCatch } from "@/lib/utils";
import { type IEnvironment } from "@/types";
import type { Context, MiddlewareHandler, Next } from "hono";
import { env } from "hono/adapter";
import { ContentfulStatusCode } from "hono/utils/http-status";

let cacheStore: RedisCacheStore | null = null;

// Cache middleware factory
export const createCacheMiddlewareFactory = (
  options: ICacheOptions = {}
): MiddlewareHandler<{ Bindings: IEnvironment }> => {
  // Merge provided options with defaults
  const opts = { ...defaultOptions, ...options };

  return async (c: Context, next: Next) => {
    const { REDIS_URL, REDIS_TOKEN } = env(c);

    if (!cacheStore) {
      // Initialize Redis cache store
      cacheStore = new RedisCacheStore(REDIS_URL, REDIS_TOKEN, opts.namespace);
    }

    // Skip caching for non-cacheable methods
    if (!opts.methods?.includes(c.req.method)) {
      return await next();
    }

    // Generate cache key
    let cacheKey = opts.keyGenerator!(c);

    // Add vary headers to cache key if specified
    if (opts.varyByHeaders?.length) {
      const varyValues = opts.varyByHeaders
        .map((header) => c.req.header(header) || "")
        .join(":");
      cacheKey += `:${varyValues}`;
    }

    // Check if we have a valid cached response
    const cachedEntry = await cacheStore.get(cacheKey);

    if (cachedEntry) {
      // Return cached response
      c.header("X-Cache", "HIT");
      c.header("Cache-Control", opts.cacheControl!);

      // Set all original headers
      Object.entries(cachedEntry.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== "content-length") {
          // Avoid content-length mismatch
          c.header(key, value);
        }
      });

      return c.body(
        decodeBody(cachedEntry.body),
        cachedEntry.status as ContentfulStatusCode
      );
    }

    // Cache miss - proceed with request
    c.header("X-Cache", "MISS");
    await next();

    // Only cache successful responses
    if (c.res && c.res.status >= 200 && c.res.status < 400) {
      // Extract the response body
      const clonedRes = c.res.clone();
      const encodedBody = await encodeBody(clonedRes);

      // Extract headers to cache
      const headers: Record<string, string> = {};
      clonedRes.headers.forEach((value, key) => {
        // Skip certain headers
        if (
          !["set-cookie", "connection", "keep-alive"].includes(
            key.toLowerCase()
          )
        ) {
          headers[key] = value;
        }
      });

      // Store in cache
      const cacheEntry: ICacheEntry = {
        body: encodedBody,
        headers,
        status: clonedRes.status,
        createdAt: Date.now(),
      };

      const promise = cacheStore.set(cacheKey, cacheEntry, opts.ttl!);
      const { error } = await tryCatch(promise);
      if (error) throw error;
    }
  };
};
