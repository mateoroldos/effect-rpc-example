import { assert, describe, it } from "@effect/vitest";
import { Result, Schema } from "effect";

import {
  OrganizationId,
  OrganizationName,
  OrganizationSlug,
  organizationRoleAllows,
  organizationRoleCanAssign,
  permissionsByOrganizationRole,
} from "./organization.ts";

const parseOrganizationId = Schema.decodeUnknownResult(OrganizationId);
const parseOrganizationName = Schema.decodeUnknownResult(OrganizationName);
const parseOrganizationSlug = Schema.decodeUnknownResult(OrganizationSlug);

describe("Organization", () => {
  it("accepts UUID v4 identifiers", () => {
    assert.isTrue(
      Result.isSuccess(
        parseOrganizationId("123e4567-e89b-42d3-a456-426614174000")
      )
    );
  });

  it("normalizes names", () => {
    assert.strictEqual(
      Result.getOrThrow(parseOrganizationName("  Acme  ")),
      "Acme"
    );
  });

  it("defines the complete Permission policy for every Role", () => {
    assert.deepStrictEqual(permissionsByOrganizationRole.member, [
      "agent:read",
      "member:read",
    ]);
    assert.isTrue(organizationRoleAllows("admin", "member:invite"));
    assert.isFalse(organizationRoleAllows("member", "agent:create"));
    assert.isFalse(organizationRoleAllows("member", "member:invite"));
  });

  it("prevents Invitation Role escalation", () => {
    assert.isTrue(organizationRoleCanAssign("owner", "admin"));
    assert.isTrue(organizationRoleCanAssign("admin", "member"));
    assert.isFalse(organizationRoleCanAssign("admin", "owner"));
    assert.isFalse(organizationRoleCanAssign("member", "member"));
  });

  it.each(["", "UPPER", "two words", "-leading", "trailing-"])(
    "rejects illegal slug %#",
    (input) => {
      assert.isTrue(Result.isFailure(parseOrganizationSlug(input)));
    }
  );
});
