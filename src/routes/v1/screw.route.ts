import {
  CACHE_NAME_SCREWS,
  DEFAULT_MATERIAL_ID,
  DEFAULT_SIZE_ID,
  DEFAULT_TYPE_ID,
  ErrorCodes,
} from "@/constants";
import json from "@/i18n/locales/vi.json";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { invalidateRedisCache } from "@/lib/cache";
import DbSchema from "@/lib/db";
import { nullsToUndefined, tryCatch } from "@/lib/utils";
import type { TScrewDto } from "@/lib/validations";
import { createCacheMiddlewareFactory } from "@/middleware/cache.middleware";
import type {
  IEnvironment,
  IScrewMaterialDto,
  IScrewTypeDto,
  TServerCreateScrewDto,
} from "@/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { env } from "hono/adapter";

const screwRouterV1 = new Hono<{ Bindings: IEnvironment }>();

const cacheMiddleware = createCacheMiddlewareFactory({
  ttl: 300, // 5 minutes
  varyByHeaders: ["Accept-Language"],
  cacheControl: "public, max-age=300",
  namespace: CACHE_NAME_SCREWS,
});

screwRouterV1
  .get("/", cacheMiddleware, async (c) => {
    const db = c.get("db");

    const screws = await db
      .select({
        id: DbSchema.Screw.id,
        name: DbSchema.Screw.name,
        quantity: DbSchema.Screw.quantity,
        componentType: DbSchema.ScrewType.name,
        material: DbSchema.ScrewMaterial.name,
        category: DbSchema.ScrewType.name,
        price: DbSchema.Screw.price,
        note: DbSchema.Screw.note,
      })
      .from(DbSchema.Screw)
      .innerJoin(
        DbSchema.ScrewMaterial,
        eq(DbSchema.Screw.materialId, DbSchema.ScrewMaterial.id)
      )
      .innerJoin(
        DbSchema.ScrewType,
        eq(DbSchema.Screw.componentTypeId, DbSchema.ScrewType.id)
      )
      .where(eq(DbSchema.Screw.isDeleted, false))
      .orderBy(DbSchema.Screw.id);

    return c.json(createSuccessResponse(nullsToUndefined(screws)), 200);
  })
  .post("/", async (c) => {
    const db = c.get("db");
    const { REDIS_TOKEN, REDIS_URL } = env(c);
    const newScrew = await c.req.json<TScrewDto>();

    const [screwType, screwMaterial] = await Promise.all([
      db
        .select({ id: DbSchema.Screw.id })
        .from(DbSchema.Screw)
        .where(eq(DbSchema.Screw.name, newScrew.name))
        .then((res) => res[0] || { id: DEFAULT_TYPE_ID }),

      db
        .select({ id: DbSchema.Screw.id })
        .from(DbSchema.Screw)
        .where(eq(DbSchema.Screw.name, newScrew.material))
        .then((res) => res[0] || { id: DEFAULT_MATERIAL_ID }),
    ]);

    const entity: TServerCreateScrewDto = {
      sizeId: DEFAULT_SIZE_ID,
      description: newScrew.category,
      name: newScrew.name,
      note: newScrew.note,
      price: newScrew.price.toString(),
      quantity: newScrew.quantity.toString(),
      componentTypeId: screwType.id,
      materialId: screwMaterial.id,
    };

    const result = await db.insert(DbSchema.Screw).values(entity).execute();
    const invalidateScrewsPromise = invalidateRedisCache(
      REDIS_URL,
      REDIS_TOKEN,
      `GET:/api/v1/screws`
    );
    const { error } = await tryCatch(invalidateScrewsPromise);
    if (error)
      return c.json(
        createErrorResponse({
          code: ErrorCodes.INTERNAL_SERVER_ERROR,
          message: json.error.internalServerError,
        })
      );
    return c.json(createSuccessResponse({ data: result }), 200);
  })
  .patch("/:id", async (c) => {
    const db = c.get("db");
    const { REDIS_TOKEN, REDIS_URL } = env(c);
    const body = await c.req.json<TScrewDto>();

    const [screw] = await db
      .select()
      .from(DbSchema.Screw)
      .where(eq(DbSchema.Screw.id, body.id!))
      .limit(1);

    if (!screw) {
      return c.json(
        createErrorResponse({
          code: ErrorCodes.NOT_FOUND,
          message: json.error.notFound,
          statusCode: 404,
        }),
        404
      );
    }

    screw.name = body.name!;
    screw.note = body.note!;
    screw.price = body.price!;
    screw.quantity = body.quantity!;

    const [material] = await db
      .select()
      .from(DbSchema.Screw)
      .where(eq(DbSchema.Screw.name, body.material!))
      .limit(1);

    if (!material) {
      return;
    }
    screw.materialId = material.id;

    const [result] = await db
      .update(DbSchema.Screw)
      .set(screw)
      .where(eq(DbSchema.Screw.id, screw.id))
      .returning();

    if (!result) {
      return c.json(
        createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
          message: json.error.operate,
          statusCode: 400,
        }),
        400
      );
    }

    const invalidateScrewPromise = invalidateRedisCache(
      REDIS_URL,
      REDIS_TOKEN,
      `GET:/api/v1/screws/${body.id!}`
    );
    const invalidateScrewsPromise = invalidateRedisCache(
      REDIS_URL,
      REDIS_TOKEN,
      `GET:/api/v1/screws`
    );
    await Promise.all([invalidateScrewPromise, invalidateScrewsPromise]);

    return c.json(createSuccessResponse({ data: result }), 200);
  })
  .delete("/:id", async (c) => {
    const { REDIS_TOKEN, REDIS_URL } = env(c);
    const db = c.get("db");
    const body = await c.req.json();

    const [screw] = await db
      .select()
      .from(DbSchema.Screw)
      .where(eq(DbSchema.Screw.name, body.name!))
      .limit(1);

    if (!screw) {
      return c.json(
        createErrorResponse({
          code: ErrorCodes.NOT_FOUND,
          message: json.error.notFound,
          statusCode: 404,
        }),
        404
      );
    }

    const result = await db
      .update(DbSchema.Screw)
      .set({ isDeleted: true })
      .where(eq(DbSchema.Screw.id, screw.id));

    if (!result) {
      return c.json(
        createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
          message: json.error.operate,
          statusCode: 400,
        }),
        400
      );
    }

    const invalidateScrewTask = invalidateRedisCache(
      REDIS_URL,
      REDIS_TOKEN,
      `GET:/api/v1/screws/${body.id!}`
    );
    const invalidateScrewsTask = invalidateRedisCache(
      REDIS_URL,
      REDIS_TOKEN,
      `GET:/api/v1/screws`
    );
    await Promise.all([invalidateScrewTask, invalidateScrewsTask]);
    return c.json(createSuccessResponse({ data: result }), 200);
  })
  .get("/types", cacheMiddleware, async (c) => {
    const db = c.get("db");
    const response = await db
      .select({ id: DbSchema.Screw.id, name: DbSchema.Screw.name })
      .from(DbSchema.Screw);
    return c.json(
      createSuccessResponse<IScrewTypeDto[]>(nullsToUndefined(response)),
      200
    );
  })
  .get("/materials", cacheMiddleware, async (c) => {
    const db = c.get("db");
    const response = await db
      .select({
        id: DbSchema.Screw.id,
        name: DbSchema.Screw.name,
      })
      .from(DbSchema.Screw);
    return c.json(
      createSuccessResponse<IScrewMaterialDto[]>(nullsToUndefined(response)),
      200
    );
  });

export default screwRouterV1;
