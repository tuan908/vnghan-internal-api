import {
    boolean,
    jsonb,
    pgTable,
    serial,
    text,
    timestamp,
} from "drizzle-orm/pg-core";

export const screwInstructions = pgTable("t_screw_instruction", {
  id: serial("id").primaryKey(),
  name: text("name"),
  data: jsonb("data"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isDeleted: boolean("is_deleted").default(false),
});
