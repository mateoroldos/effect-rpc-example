import { error, redirect } from "@sveltejs/kit";
import type { Handle, ServerInit } from "@sveltejs/kit/hooks";
import { Match, Option } from "effect";
import { resolveAuthentication } from "#lib/server/authentication.ts";
import { disposeRuntime, run } from "#lib/server/runtime.js";

/** Resolves authenticated request state before protected routes and remote functions run. */
export const handle: Handle = async ({ event, resolve }) => {
  if (event.route.id?.startsWith("/(app)") !== true) {
    return resolve(event);
  }

  const user = await run(
    resolveAuthentication(event.request),
    (failure) =>
      Match.value(failure).pipe(
        Match.tagsExhaustive({
          "Authentication.MalformedIdentity": () =>
            error(500, "The stored identity is invalid."),
          "Authentication.Unreachable": () =>
            error(503, "Authentication is unavailable. Try again later."),
        })
      ),
    { signal: event.request.signal }
  );
  if (Option.isNone(user)) {
    redirect(303, "/login");
  }

  event.locals.user = user.value;
  return resolve(event);
};

/** Registers cleanup for resources owned by the web application's Effect runtime. */
export const init: ServerInit = () => {
  process.once("sveltekit:shutdown", async () => {
    await disposeRuntime();
  });
};
