import { User } from "@effect-template/domain/identity";
import { Option, Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  requireAuthenticatedUser,
  requiresAuthentication,
} from "./protected-route.ts";

describe("requiresAuthentication", () => {
  it("protects application routes", () => {
    expect(requiresAuthentication("/(app)")).toBe(true);
    expect(requiresAuthentication("/(app)/org/[organizationId]/agents")).toBe(
      true
    );
  });

  it("leaves public and unmatched routes open", () => {
    expect(requiresAuthentication("/(public)/login")).toBe(false);
    expect(requiresAuthentication(null)).toBe(false);
  });
});

describe("requireAuthenticatedUser", () => {
  it("redirects anonymous callers to login", () => {
    expect(() => requireAuthenticatedUser(Option.none())).toThrow(
      expect.objectContaining({ location: "/login", status: 303 })
    );
  });

  it("returns authenticated callers", () => {
    const user = Schema.decodeUnknownSync(User)({
      email: "user@example.com",
      id: "71f376b5-52c9-4f70-95f2-5a5f4a7852ff",
      name: "Test User",
    });

    expect(requireAuthenticatedUser(Option.some(user))).toEqual(user);
  });
});
