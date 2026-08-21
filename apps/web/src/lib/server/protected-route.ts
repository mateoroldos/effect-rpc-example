import type { User } from "@effect-template/domain/identity";
import { redirect } from "@sveltejs/kit";
import { Option } from "effect";

/** Identifies routes that require an authenticated User before rendering. */
export const requiresAuthentication = (routeId: string | null) =>
  routeId?.startsWith("/(app)") === true;

/** Returns the authenticated User or redirects an anonymous caller to login. */
export const requireAuthenticatedUser = (user: Option.Option<User>) => {
  if (Option.isNone(user)) {
    redirect(303, "/login");
  }
  return user.value;
};
