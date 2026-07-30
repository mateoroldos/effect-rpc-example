import { sql } from "drizzle-orm";
import { check, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

/** Drizzle table enforcing canonical persisted agent identities and names. */
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
  },
  (table) => [
    check("agents_name_not_blank", sql`length(btrim(${table.name})) > 0`),
  ]
);
