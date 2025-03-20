import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import SCHEMA from "..";

export const screwImages = pgTable("t_screw_images", {
  id: serial("id").primaryKey(),
  url: text("name"),
  note: text("note"),
  screwId: integer("screw_id").references(() => SCHEMA.SCREW.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),  isDeleted: boolean("is_deleted").default(false),
});
