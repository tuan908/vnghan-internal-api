import {
    boolean,
    jsonb,
    pgTable,
    serial,
    text,
    timestamp,
} from "drizzle-orm/pg-core";

export const screwQuestions = pgTable("t_screw_question", {
  id: serial("id").primaryKey(),
  name: text("name"),
  data: jsonb("data"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isDeleted: boolean("is_deleted").default(false),
});
