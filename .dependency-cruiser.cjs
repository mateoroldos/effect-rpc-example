"use strict";
// Architecture fitness rules: the dependency arrows in AGENTS.md, enforced.
//
// The arrow graph is data (LAYERS). Each entry lists the *only* workspace
// packages that layer may import. External npm deps are always allowed — these
// rules constrain intra-repo (@effect-template/*) edges. Change an arrow here
// and in AGENTS.md/README.md in the same edit.
//
// Run: `bun run check-arch` (wrapper feeds per-package `src` globs; see
// scripts/check-arch.sh for why bare dirs and `**` globs are avoided).

/** package dir -> workspace packages it may depend on (besides itself). */
const LAYERS = {
  "apps/server": [
    "core",
    "database",
    "domain",
    "email",
    "observability",
    "rpc",
  ], // composition root
  "apps/web": ["rpc", "domain", "observability"], // + web server runtime telemetry
  "packages/core": ["domain"],
  "packages/database": ["core", "domain"],
  "packages/domain": [], // pure sink — depends on nothing intra-repo
  "packages/email": ["core", "domain"],
  "packages/infra": [], // standalone IaC config (consumed only by alchemy.run.ts)
  "packages/observability": [], // standalone telemetry adapter
  "packages/rpc": ["domain"],
};

const layerRules = Object.entries(LAYERS).map(([dir, allowed]) => {
  const allowList = [dir, ...allowed.map((a) => `packages/${a}`)];
  return {
    comment: `${dir} may only depend on: ${allowed.join(", ") || "(nothing intra-repo)"}. Depending elsewhere reverses or short-circuits the architecture's one-way arrows.`,
    from: { path: `^${dir}/` },
    name: `layer:${dir.split("/").pop()}`,
    severity: "error",
    to: {
      path: "^(packages|apps)/",
      pathNot: `^(${allowList.map((p) => `${p}/`).join("|")})`,
    },
  };
});

module.exports = {
  forbidden: [
    ...layerRules,

    {
      comment:
        "Concrete adapters (database, email) may only be imported by apps/server, the composition root. Depend on the port, never the technology; only the root names implementations.",
      from: { pathNot: "^(apps/server/|packages/(database|email)/)" },
      name: "adapter-only-in-composition-root",
      severity: "error",
      to: { path: "^packages/(database|email)/" },
    },

    {
      comment: "The API composition root must not import the web app.",
      from: { path: "^apps/server/" },
      name: "server-not-to-web",
      severity: "error",
      to: { path: "^apps/web/" },
    },

    {
      comment:
        "Cyclic dependencies break layering and defeat incremental builds.",
      // Capture the source path; `to.pathNot: "^$1$"` back-references it to drop
      // the `export * as Foo from "./foo.ts"` module-identity idiom (a file
      // re-exporting itself — a length-1 self cycle) while still catching real
      // value cycles between distinct modules.
      from: { path: "^(.+)$" },
      name: "no-circular",
      severity: "error",
      to: { circular: true, pathNot: "^$1$" },
    },

    {
      comment: "Production modules must not import test files.",
      from: { pathNot: "\\.test\\.ts$" },
      name: "no-import-of-test",
      severity: "error",
      to: { path: "\\.test\\.ts$" },
    },
  ],

  options: {
    // No tsConfig / tsPreCompilationDeps: building a TS program walks bun's
    // self-referential workspace symlinks (core -> database -> core ...) and
    // OOMs. enhanced-resolve reads each package's `exports` map directly.
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: {
      conditionNames: ["import", "types", "default"],
      exportsFields: ["exports"],
      extensions: [".ts", ".tsx", ".js", ".mjs"],
    },
    exclude: {
      path: "node_modules|drizzle|\\.svelte$|\\.svelte-kit|dist|\\.turbo|\\.alchemy",
    },
  },
};
