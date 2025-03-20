import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const screwSizes = pgTable("t_screw_size", {
  id: serial("id").primaryKey(),
  name: text("name"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),  isDeleted: boolean("is_deleted").default(false),
});
