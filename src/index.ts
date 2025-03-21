import { drizzle } from "drizzle-orm/neon-serverless";
import { Hono } from "hono";
import { createDatabaseMiddleware } from "./middleware";
import fileRouter from "./routes/file";
import screwRouter from "./routes/screw";
import screwRouterV2 from "./routes/screw-v2";

declare module 'hono' {
  interface ContextVariableMap {
    db: ReturnType<typeof drizzle>;
  }
}

const app = new Hono().basePath(`/api`);

app.use("*", createDatabaseMiddleware())

app.route("/v1/files", fileRouter)
app.route("/v1/screws", screwRouter)
app.route("/v2/screws", screwRouterV2)

export default app;