import json from "@/i18n/locales/vi.json";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Hono } from "hono";
import { ErrorCodes } from "./constants";
import { createErrorResponse } from "./lib/api-response";
import { createDatabaseMiddlewareFactory as createDbMiddlewareFactory } from "./middleware/database.middleware";
import fileRouterV1 from "./routes/v1/file.route";
import screwRouterV1 from "./routes/v1/screw.route";
import screwRouterV2 from "./routes/v2/screw.route";

declare module "hono" {
  interface ContextVariableMap {
    db: ReturnType<typeof drizzle>;
  }
}

const app = new Hono().basePath(`/api`);

app.use("*", createDbMiddlewareFactory());
app.onError((error, c) => {
  console.error(error.message);
  return c.json(
    createErrorResponse({
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: json.error.internalServerError,
    }),
    500
  );
});

app.route("/v1/files", fileRouterV1)
app.route("/v1/screws", screwRouterV1);
app.route("/v2/screws", screwRouterV2);

export default app;