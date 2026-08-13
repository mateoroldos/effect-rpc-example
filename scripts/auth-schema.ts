import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";

const checkedInSchema = "packages/database/src/auth/schema.ts";
const [, , mode] = process.argv;

if (mode !== "generate" && mode !== "check") {
  throw new Error("Usage: bun scripts/auth-schema.ts <generate|check>");
}

const generatedSchema = `packages/database/src/auth/.generated-${randomUUID()}.ts`;

try {
  run([
    "bunx",
    "auth@1.7.0-rc.5",
    "generate",
    "--config",
    "packages/auth-better/src/schema-config.ts",
    "--output",
    generatedSchema,
    "--yes",
  ]);

  await writeFile(
    generatedSchema,
    `/** @effect-diagnostics globalDate:skip-file */\n${await readFile(generatedSchema, "utf8")}`
  );
  run(["bunx", "ultracite", "fix", generatedSchema]);

  if (mode === "generate") {
    await writeFile(checkedInSchema, await readFile(generatedSchema));
  } else if (
    (await readFile(generatedSchema, "utf8")) !==
    (await readFile(checkedInSchema, "utf8"))
  ) {
    throw new Error(
      "Better Auth schema drifted. Run `bun run auth:schema:generate`, then generate an additive database migration."
    );
  }
} finally {
  await rm(generatedSchema, { force: true });
}

function run([executable, ...args]: readonly string[]) {
  if (!executable) {
    throw new Error("Command must include an executable");
  }
  const result = spawnSync(executable, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${[executable, ...args].join(" ")}`);
  }
}
