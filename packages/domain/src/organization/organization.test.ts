import { assert, describe, it } from "@effect/vitest";
import { Result, Schema } from "effect";

import {
  OrganizationId,
  OrganizationName,
  OrganizationSlug,
  organizationRoleAllows,
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

  it.each(["", "UPPER", "two words", "-leading", "trailing-"])(
    "rejects illegal slug %#",
    (input) => {
      assert.isTrue(Result.isFailure(parseOrganizationSlug(input)));
    }
  );

  it("grants every administrative Organization permission", () => {
    assert.deepStrictEqual(
      permissionsByOrganizationRole.admin,
      permissionsByOrganizationRole.owner
    );
  });

  it("limits Members to read permissions", () => {
    assert.isTrue(organizationRoleAllows("member", "agent:read"));
    assert.isTrue(organizationRoleAllows("member", "member:read"));
    assert.isFalse(organizationRoleAllows("member", "agent:create"));
    assert.isFalse(organizationRoleAllows("member", "member:invite"));
  });
});
