import { sql } from "drizzle-orm";
import { check, index, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

import { organization } from "../auth/schema.ts";

/** Drizzle table enforcing Organization-scoped Agent identities and names. */
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
  },
  (table) => [
    check("agents_name_not_blank", sql`length(btrim(${table.name})) > 0`),
    index("agents_organization_id_idx").on(table.organizationId),
  ]
);
