import type { ServerInit } from "@sveltejs/kit";
import { disposeRuntime } from "$lib/server/runtime";

/** Registers cleanup for resources owned by the web application's Effect runtime. */
export const init: ServerInit = () => {
  process.once("sveltekit:shutdown", async () => {
    await disposeRuntime();
  });
};
