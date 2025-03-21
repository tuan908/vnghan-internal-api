import DbSchema from "@/lib/db";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { MiddlewareHandler } from "hono";
import type { IEnvironment } from "../types";

/**
 * Create a Hono middleware for database access using Neon's HTTP client
 * which is better suited for serverless environments like Cloudflare Workers
 */
export const createDatabaseMiddleware = (
  connectionStringOverride?: string
): MiddlewareHandler<{
  Bindings: IEnvironment;
  Variables: { db: ReturnType<typeof drizzle> };
}> => {
  return async (c, next) => {
    const start = Date.now();

    try {
      // Get connection string from env or override
      const connectionString = connectionStringOverride || c.env.DATABASE_URL;

      if (!connectionString) {
        throw new Error("Database connection string is required");
      }

      // Create a new SQL client for this request using HTTP mode
      // HTTP mode is better for serverless environments as it doesn't maintain persistent connections
      const sql = neon(connectionString);

      // Create a Drizzle instance
      const db = drizzle({ client: sql, schema: DbSchema, logger: true });

      // Add to context
      c.set("db", db);

      // Continue to next middleware/handler
      await next();

      // Log slow operations
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.warn(
          `Slow database operation: ${duration}ms for ${c.req.path}`
        );
      }
    } catch (error: any) {
      console.error("Database middleware error:", error?.message);

      // Return appropriate error response
      return c.json(
        {
          error: "Database connection error",
          message: "Unable to connect to the database",
          statusCode: 503,
        },
        503
      );
    }
  };
};

/**
 * Simple health check function that creates a one-time connection
 */
export const checkDatabaseHealth = async (
  connectionString: string
): Promise<{ healthy: boolean; latency: number }> => {
  const startTime = Date.now();

  try {
    // Create a one-time client
    const sql = neon(connectionString);

    // Test the connection
    await sql`SELECT 1`;

    return { healthy: true, latency: Date.now() - startTime };
  } catch (error) {
    console.error("Database health check failed:", error);
    return { healthy: false, latency: Date.now() - startTime };
  }
};
