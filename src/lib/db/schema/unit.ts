import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const screwUnits = pgTable("t_screw_unit", {
  id: serial("id").primaryKey(),
  name: text("name"),
  detail: text("detail"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),  isDeleted: boolean("is_deleted").default(false),
});
