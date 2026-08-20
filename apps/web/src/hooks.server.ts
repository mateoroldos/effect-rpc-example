import { error } from "@sveltejs/kit";
import type { Handle, ServerInit } from "@sveltejs/kit/hooks";
import { Match } from "effect";
import { resolveAuthentication } from "#lib/server/authentication.ts";
import {
  requireAuthenticatedUser,
  requiresAuthentication,
} from "#lib/server/protected-route.ts";
import { disposeRuntime, run } from "#lib/server/runtime.js";

/** Resolves authenticated request state before protected routes and remote functions run. */
export const handle: Handle = async ({ event, resolve }) => {
  if (!requiresAuthentication(event.route.id)) {
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
  event.locals.user = requireAuthenticatedUser(user);
  return resolve(event);
};

/** Registers cleanup for resources owned by the web application's Effect runtime. */
export const init: ServerInit = () => {
  process.once("sveltekit:shutdown", async () => {
    await disposeRuntime();
  });
};
