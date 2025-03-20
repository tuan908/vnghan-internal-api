import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { screwMaterials } from "./material";
import { screwSizes } from "./size";
import { screwTypes } from "./type";

export const screws = pgTable("t_screw", {
  id: serial("id").primaryKey(),
  name: text("name"),
  description: text("description"),
  componentTypeId: integer("type_id")
    .notNull()
    .references(() => screwTypes.id),
  sizeId: integer("size_id")
    .notNull()
    .references(() => screwSizes.id),
  materialId: integer("material_id")
    .notNull()
    .references(() => screwMaterials.id),
  note: text("note"),
  price: text("price"),
  quantity: text("quantity"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isDeleted: boolean("is_deleted").default(false),
});

export const screwRelations = relations(screws, ({ one, many }) => ({
  type: one(screwTypes, {
    fields: [screws.componentTypeId],
    references: [screwTypes.id],
    relationName: "type",
  }),
  size: one(screwSizes, {
    fields: [screws.sizeId],
    references: [screwSizes.id],
    relationName: "size",
  }),
  material: one(screwMaterials, {
    fields: [screws.componentTypeId],
    references: [screwMaterials.id],
    relationName: "material",
  }),
}));
