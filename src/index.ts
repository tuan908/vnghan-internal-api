import { drizzle } from "drizzle-orm/neon-serverless";
import { Hono } from "hono";
import { createDatabaseMiddleware } from "./middleware";
import fileRouter from "./routes/file";
import screwRouter from "./routes/screw";

declare module 'hono' {
  interface ContextVariableMap {
    db: ReturnType<typeof drizzle>;
  }
}

const app = new Hono().basePath("/api/v1");

app.use("*", createDatabaseMiddleware())

app.route("/files", fileRouter)
app.route("/screws", screwRouter)

export default app;