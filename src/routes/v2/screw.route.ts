import {
    DEFAULT_MATERIAL_ID,
    DEFAULT_SIZE_ID,
    DEFAULT_TYPE_ID,
    ErrorCodes,
    PAGE_SIZE,
} from "@/constants";
import json from "@/i18n/locales/vi.json";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { invalidateCache } from "@/lib/cache";
import DbSchema from "@/lib/db";
import { nullsToUndefined } from "@/lib/utils";
import type { TScrewDto } from "@/lib/validations";
import type {
    IEnvironment,
    IScrewMaterialDto,
    IScrewTypeDto,
    TServerCreateScrewDto,
} from "@/types";
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { env } from "hono/adapter";

const screwRouterV2 = new Hono<{ Bindings: IEnvironment }>();

screwRouterV2
  .get("/", async (c) => {
    const db = c.get("db");
    const { page = "0" } = c.req.query();
    const pageNumber = parseInt(page, 10) || 0;

    const totalCountResult = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(DbSchema.Screw)
      .where(eq(DbSchema.Screw.isDeleted, false));

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
      .orderBy(DbSchema.Screw.id)
      .limit(PAGE_SIZE)
      .offset(pageNumber * PAGE_SIZE);

    return c.json(
      createSuccessResponse(nullsToUndefined(screws), {
        pagination: {
          page: pageNumber,
          totalPages,
          totalItems: totalCount,
          pageSize: PAGE_SIZE,
          hasNextPage: pageNumber < totalPages - 1,
          hasPreviousPage: pageNumber > 0,
        },
      }),
      200
    );
  })
  .post("/", async (c) => {
    const { REDIS_TOKEN, REDIS_URL } = env(c);
    const db = c.get("db");
    const newScrew = await c.req.json<TScrewDto>();

    const [screwType, screwMaterial] = await Promise.all([
      db
        .select({ id: DbSchema.ScrewType.id })
        .from(DbSchema.ScrewType)
        .where(eq(DbSchema.ScrewType.name, newScrew.name))
        .then((res) => res[0] || { id: DEFAULT_TYPE_ID }),

      db
        .select({ id: DbSchema.ScrewMaterial.id })
        .from(DbSchema.ScrewMaterial)
        .where(eq(DbSchema.ScrewMaterial.name, newScrew.material))
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

    await invalidateCache(REDIS_URL, REDIS_TOKEN, `GET:/api/v2/screws`);
    const result = await db.insert(DbSchema.Screw).values(entity).execute();
    return c.json(createSuccessResponse({ data: result }), 200);
  })
  .patch("/:id", async (c) => {
    const { REDIS_TOKEN, REDIS_URL } = env(c);
    const db = c.get("db");
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
      .from(DbSchema.ScrewMaterial)
      .where(eq(DbSchema.ScrewMaterial.name, body.material!))
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

    await invalidateCache(
      REDIS_URL,
      REDIS_TOKEN,
      `GET:/api/v2/screws/${body.id!}`
    );
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

    await invalidateCache(
      REDIS_URL,
      REDIS_TOKEN,
      `GET:/api/v2/screws/${body.id!}`
    );
    return c.json(createSuccessResponse({ data: result }), 200);
  })
  .get("/types", async (c) => {
    const db = c.get("db");
    const response = await db
      .select({ id: DbSchema.ScrewType.id, name: DbSchema.ScrewType.name })
      .from(DbSchema.ScrewType);
    return c.json(
      createSuccessResponse<IScrewTypeDto[]>(nullsToUndefined(response)),
      200
    );
  })
  .get("/materials", async (c) => {
    const db = c.get("db");
    const response = await db
      .select({
        id: DbSchema.ScrewMaterial.id,
        name: DbSchema.ScrewMaterial.name,
      })
      .from(DbSchema.ScrewMaterial);
    return c.json(
      createSuccessResponse<IScrewMaterialDto[]>(nullsToUndefined(response)),
      200
    );
  });

export default screwRouterV2;
