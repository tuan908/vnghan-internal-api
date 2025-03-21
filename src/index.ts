import { drizzle } from "drizzle-orm/neon-serverless";
import { Hono } from "hono";
import { createDatabaseMiddleware } from "./middleware/database.middleware";
import fileRouterV1 from "./routes/v1/file.route";
import screwRouterV1 from "./routes/v1/screw.route";
import screwRouterV2 from "./routes/v2/screw.route";

declare module "hono" {
  interface ContextVariableMap {
    db: ReturnType<typeof drizzle>;
  }
}

const app = new Hono().basePath(`/api`);

app.use("*", createDatabaseMiddleware());

app.route("/v1/files", fileRouterV1);
app.route("/v1/screws", screwRouterV1);
app.route("/v2/screws", screwRouterV2);

export default app;