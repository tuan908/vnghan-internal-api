import { Redis } from "@upstash/redis"; // Lightweight Redis client that works in edge environments
import type { Context } from "hono";
import { tryCatch } from "./utils";

// Define cache options interface
export interface ICacheOptions {
  ttl?: number; // Time to live in seconds (default: 60 = 1 minute)
  methods?: string[]; // HTTP methods to cache (default: ['GET'])
  keyGenerator?: (c: Context) => string; // Function to generate cache keys
  varyByHeaders?: string[]; // Headers that should vary the cache key
  cacheControl?: string; // Cache-Control header value
  namespace?: string; // Redis key namespace
}

// Define cache entry structure
export interface ICacheEntry {
  body: string; // Base64 encoded body
  headers: Record<string, string>;
  status: number;
  createdAt: number;
}

// Cache store interface
export interface ICacheStore {
  get(key: string): Promise<ICacheEntry | null>;
  set(key: string, value: ICacheEntry, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
}

// Redis implementation of CacheStore
export class RedisCacheStore implements ICacheStore {
  private redis: Redis;
  private namespace: string;

  constructor(
    redisUrl: string,
    redisToken: string,
    namespace: string = "hono-cache:"
  ) {
    this.redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    this.namespace = namespace;
  }

  private getNamespacedKey(key: string): string {
    return `${this.namespace}${key}`;
  }

  async get(key: string): Promise<ICacheEntry | null> {
    const promise = this.redis.get<string>(this.getNamespacedKey(key));
    const { data } = await tryCatch(promise);
    if (!data) return null;

    if (typeof data === "object") {
      return data as ICacheEntry;
    }
    return JSON.parse(data) as ICacheEntry;
  }

  async set(key: string, value: ICacheEntry, ttl: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const promise = this.redis.set(this.getNamespacedKey(key), serialized, {
      ex: ttl,
    });
    const { error } = await tryCatch(promise);
    if (error) throw error;
  }

  async delete(key: string): Promise<void> {
    const promise = this.redis.del(this.getNamespacedKey(key));
    const { error } = await tryCatch(promise);
    if (error) throw error;
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        const keys = await this.redis.keys(`${this.namespace}${pattern}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        const keys = await this.redis.keys(`${this.namespace}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      console.error("Redis cache clear error:", error);
    }
  }
}

// Default options
export const defaultOptions: ICacheOptions = {
  ttl: 60, // 60 seconds default
  methods: ["GET"],
  keyGenerator: (c: Context) => {
    return `${c.req.method}:${c.req.url}`;
  },
  varyByHeaders: [],
  cacheControl: "public, max-age=60",
  namespace: "hono-cache:",
};

// Helper to encode response body to string
export async function encodeBody(response: Response): Promise<string> {
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

// Helper to decode body from string
export function decodeBody(bodyString: string): ArrayBuffer {
  return Buffer.from(bodyString, "base64").buffer;
}

// Cache invalidation helper
export const invalidateRedisCache = (
  redisUrl: string,
  redisToken: string,
  pattern?: string,
  namespace: string = "hono-cache:"
): Promise<void> => {
  const cacheStore = new RedisCacheStore(redisUrl, redisToken, namespace);
  return cacheStore.clear(pattern);
};
