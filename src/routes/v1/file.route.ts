import { DEFAULT_MATERIAL_ID, DEFAULT_SIZE_ID, ErrorCodes } from "@/constants";
import json from "@/i18n/locales/vi.json";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { invalidateRedisCache } from "@/lib/cache";
import DbSchema from "@/lib/db";
import type { IEnvironment, IImportResult, TScrewEntity } from "@/types";
import { inArray } from "drizzle-orm";
import { type Row, Workbook } from "exceljs";
import { Hono } from "hono";
import { env } from "hono/adapter";

const fileRouterV1 = new Hono<{ Bindings: IEnvironment }>();

fileRouterV1
  .post("/excel", async (c) => {
    const db = c.get("db");

    const file = new Workbook();

    return c.json(createSuccessResponse({ data: file }), 200);
  })
  .post("/pdf", async (c) => {})
  .post("/importExcel", async (c) => {
    const { REDIS_TOKEN, REDIS_URL } = env(c);
    const db = c.get("db");

    try {
      const formData = await c.req.parseBody();
      const file = formData["file"] as File | undefined;

      if (!file || !/\.(xlsx|xls)$/i.test(file.name)) {
        return c.json(
          createErrorResponse({
            code: ErrorCodes.BAD_REQUEST,
            message: !file
              ? json.error.invalidFile
              : json.error.invalidFileExtension,
          }),
          400
        );
      }

      // Read file into memory
      const fileBuffer = await file.arrayBuffer();
      const workbook = new Workbook();
      await workbook.xlsx.load(fileBuffer);

      const rows: TScrewEntity[] = [];
      const errors: string[] = [];

      // Fetch all screw types & materials beforehand for fast lookups
      const worksheetNames = workbook.worksheets.map((ws) => ws.name);

      const [screwTypes, materials] = await Promise.all([
        db
          .select({ name: DbSchema.ScrewType.name, id: DbSchema.ScrewType.id })
          .from(DbSchema.ScrewType)
          .where(inArray(DbSchema.ScrewType.name, worksheetNames)),

        db
          .select({
            name: DbSchema.ScrewMaterial.name,
            id: DbSchema.ScrewMaterial.id,
          })
          .from(DbSchema.ScrewMaterial),
      ]);

      // Convert DB data into maps for quick lookup
      const screwTypeCache = new Map(screwTypes.map((t) => [t.name, t.id]));
      const materialCache = new Map(materials.map((m) => [m.name, m.id]));

      for (const worksheet of workbook.worksheets) {
        const typeId = screwTypeCache.get(worksheet.name);
        if (!typeId) {
          errors.push(`Unknown screw type: ${worksheet.name}`);
          continue;
        }

        const startRow = 8;
        const usedRowCount = Math.min(
          worksheet.actualRowCount || worksheet.rowCount,
          1000
        ); // Limit processing

        const worksheetRows: TScrewEntity[] = [];

        for (let i = startRow; i <= usedRowCount; i++) {
          const row = worksheet.getRow(i);
          if (row.cellCount === 0) continue;

          const name = getCellValue(row, 1);
          if (!name) continue;

          const quantity = getCellValue(row, 4);
          const price = getCellValue(row, 6);
          if (!quantity || !price) {
            errors.push(
              `Row ${i} in "${worksheet.name}": missing required data`
            );
            continue;
          }

          const materialName = getCellValue(row, 3);
          const materialId =
            materialCache.get(materialName!) || DEFAULT_MATERIAL_ID;

          const images = [];
          const url = getCellValue(row, 7);
          if (url) images.push({ id: i.toString(), url });

          worksheetRows.push({
            sizeId: DEFAULT_SIZE_ID,
            name,
            description: getCellValue(row, 2) || "",
            componentTypeId: typeId,
            materialId,
            quantity,
            price,
            note: getCellValue(row, 5) || "",
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
          });
        }

        rows.push(...worksheetRows);
      }

      if (rows.length === 0) {
        return c.json(
          createErrorResponse({
            code: ErrorCodes.BAD_REQUEST,
            message:
              errors.length > 0
                ? `Import failed: ${errors.slice(0, 5).join("; ")}${
                    errors.length > 5 ? "..." : ""
                  }`
                : json.error.noValidRows,
          }),
          400
        );
      }

      // **Optimized Bulk Insert** (Uses ON CONFLICT DO NOTHING)
      const insertQuery = db
        .insert(DbSchema.Screw)
        .values(rows)
        .onConflictDoNothing()
        .returning();

      const result = await insertQuery;

      await invalidateRedisCache(REDIS_URL, REDIS_TOKEN, `GET:/api/v1/screws`);

      return c.json(
        createSuccessResponse<IImportResult>({
          rowsCount: result.length || rows.length,
        }),
        200
      );
    } catch (error: any) {
      console.error("Excel import error:", error);
      return c.json(
        createErrorResponse({
          code: ErrorCodes.INTERNAL_SERVER_ERROR,
          message: `Import error: ${
            error.message?.substring(0, 200) || "Unknown error"
          }`,
        }),
        500
      );
    }
  });

function getCellValue(row: Row, cellIndex: number): string | undefined {
  const cell = row.getCell(cellIndex);
  const value = cell.value;

  if (value === null || value === undefined) return undefined;

  if (cell.isHyperlink) return cell.hyperlink;

  return value.toString().trim();
}

export default fileRouterV1;
