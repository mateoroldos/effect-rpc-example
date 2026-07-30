import { fileURLToPath } from "node:url";

/** Locates generated migrations shared by PostgreSQL-compatible Layers. */
export const migrationConfig = {
  migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
} as const;
