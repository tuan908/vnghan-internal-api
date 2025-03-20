import {
  DEFAULT_MATERIAL_ID,
  DEFAULT_SIZE_ID,
  DEFAULT_TYPE_ID,
  ErrorCodes
} from "@/constants";
import json from "@/i18n/locales/vi.json";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import SCHEMA from "@/lib/db";
import { nullsToUndefined } from "@/lib/utils";
import { ScrewDto } from "@/lib/validations";
import { ScrewTypeDto, ServerCreateScrewDto } from "@/types";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

const screwRouter = new Hono();

screwRouter
  .get("/", async (c) => {
    const db = c.get("db");
    // const { page = "0" } = c.req.query();
    // const pageNumber = parseInt(page, 10) || 0;

    // const totalCountResult = await db
    //   .select({ count: sql`count(*)`.mapWith(Number) })
    //   .from(SCHEMA.SCREW)
    //   .where(eq(SCHEMA.SCREW.isDeleted, false));

    // const totalCount = totalCountResult[0]?.count || 0;
    // const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const screws = await db
      .select({
        id: SCHEMA.SCREW.id,
        name: SCHEMA.SCREW.name,
        quantity: SCHEMA.SCREW.quantity,
        componentType: SCHEMA.SCREW_TYPE.name,
        material: SCHEMA.SCREW_MATERIAL.name,
        category: SCHEMA.SCREW_TYPE.name,
        price: SCHEMA.SCREW.price,
        note: SCHEMA.SCREW.note,
      })
      .from(SCHEMA.SCREW)
      .innerJoin(
        SCHEMA.SCREW_MATERIAL,
        eq(SCHEMA.SCREW.materialId, SCHEMA.SCREW_MATERIAL.id)
      )
      .innerJoin(
        SCHEMA.SCREW_TYPE,
        eq(SCHEMA.SCREW.componentTypeId, SCHEMA.SCREW_TYPE.id)
      )
      .where(eq(SCHEMA.SCREW.isDeleted, false))
      .orderBy(SCHEMA.SCREW.id);
    // .limit(PAGE_SIZE)
    // .offset(pageNumber * PAGE_SIZE);

    // return c.json(
    //   createSuccessResponse(nullsToUndefined(screws), {
    //     pagination: {
    //       page: pageNumber,
    //       totalPages,
    //       totalItems: totalCount,
    //       pageSize: PAGE_SIZE,
    //       hasNextPage: pageNumber < totalPages - 1,
    //       hasPreviousPage: pageNumber > 0,
    //     },
    //   }),
    //   200
    // );

    return c.json(createSuccessResponse(nullsToUndefined(screws)), 200);
  })
  .post("/", async (c) => {
    const db = c.get("db");
    const newScrew = await c.req.json<ScrewDto>();

    const [screwType, screwMaterial] = await Promise.all([
      db
        .select({ id: SCHEMA.SCREW_TYPE.id })
        .from(SCHEMA.SCREW_TYPE)
        .where(eq(SCHEMA.SCREW_TYPE.name, newScrew.name))
        .then((res) => res[0] || { id: DEFAULT_TYPE_ID }),

      db
        .select({ id: SCHEMA.SCREW_MATERIAL.id })
        .from(SCHEMA.SCREW_MATERIAL)
        .where(eq(SCHEMA.SCREW_MATERIAL.name, newScrew.material))
        .then((res) => res[0] || { id: DEFAULT_MATERIAL_ID }),
    ]);

    const entity: ServerCreateScrewDto = {
      sizeId: DEFAULT_SIZE_ID,
      description: newScrew.category,
      name: newScrew.name,
      note: newScrew.note,
      price: newScrew.price.toString(),
      quantity: newScrew.quantity.toString(),
      componentTypeId: screwType.id,
      materialId: screwMaterial.id,
    };

    const result = await db.insert(SCHEMA.SCREW).values(entity).execute();
    return c.json(createSuccessResponse({ data: result }), 200);
  })
  .patch("/:id", async (c) => {
    const db = c.get("db");
    const body = await c.req.json<ScrewDto>();

    const [screw] = await db
      .select()
      .from(SCHEMA.SCREW)
      .where(eq(SCHEMA.SCREW.id, body.id!))
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
      .from(SCHEMA.SCREW_MATERIAL)
      .where(eq(SCHEMA.SCREW_MATERIAL.name, body.material!))
      .limit(1);

    if (!material) {
      return;
    }
    screw.materialId = material.id;

    const [result] = await db
      .update(SCHEMA.SCREW)
      .set(screw)
      .where(eq(SCHEMA.SCREW.id, screw.id))
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

    return c.json(createSuccessResponse({ data: result }), 200);
  })
  .get("/types", async (c) => {
    const db = c.get("db");
    const response = await db
      .select({ id: SCHEMA.SCREW_TYPE.id, name: SCHEMA.SCREW_TYPE.name })
      .from(SCHEMA.SCREW_TYPE);
    return c.json(
      createSuccessResponse<ScrewTypeDto[]>(nullsToUndefined(response)),
      200
    );
  })
  .get("/materials", async (c) => {
    const db = c.get("db");
    const response = await db
      .select({
        id: SCHEMA.SCREW_MATERIAL.id,
        name: SCHEMA.SCREW_MATERIAL.name,
      })
      .from(SCHEMA.SCREW_MATERIAL);
    return c.json(
      createSuccessResponse<ScrewTypeDto[]>(nullsToUndefined(response)),
      200
    );
  });

export default screwRouter;
