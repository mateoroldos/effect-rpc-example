import { Principal, User } from "@effect-template/domain/identity";
import { error, type Handle, redirect, type ServerInit } from "@sveltejs/kit";
import { Option, Schema } from "effect";
import { authClient } from "$lib/auth-client.ts";
import { disposeRuntime } from "$lib/server/runtime";

const decodeUser = Schema.decodeUnknownOption(User);

/** Resolves authenticated request state before protected routes and remote functions run. */
export const handle: Handle = async ({ event, resolve }) => {
  event.locals.principal = undefined;
  event.locals.user = undefined;

  if (event.route.id?.startsWith("/(public)") ?? true) {
    return resolve(event);
  }

  const { data, error: sessionError } = await authClient.getSession({
    fetchOptions: {
      headers: sessionHeaders(event.request.headers, event.url.origin),
    },
  });
  if (sessionError) {
    error(503, "Authentication is unavailable. Try again later.");
  }
  if (!data) {
    redirect(303, "/login");
  }

  const user = Option.getOrElse(decodeUser(data.user), () =>
    error(503, "Authentication is unavailable. Try again later.")
  );
  event.locals.principal = Principal.make({ userId: user.id });
  event.locals.user = user;

  return resolve(event);
};

const sessionHeaders = (requestHeaders: Headers, webOrigin: string) => {
  const headers = new Headers({ origin: webOrigin });
  const cookie = requestHeaders.get("cookie");
  if (cookie !== null) {
    headers.set("cookie", cookie);
  }
  return headers;
};

/** Registers cleanup for resources owned by the web application's Effect runtime. */
export const init: ServerInit = () => {
  process.once("sveltekit:shutdown", async () => {
    await disposeRuntime();
  });
};
