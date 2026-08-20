import { assert, describe, it } from "@effect/vitest";
import { Result, Schema } from "effect";

import { UserId } from "./identity.ts";

const parseUserId = Schema.decodeUnknownResult(UserId);

describe("UserId", () => {
  it("accepts UUID v4 identifiers", () => {
    assert.isTrue(
      Result.isSuccess(parseUserId("123e4567-e89b-42d3-a456-426614174000"))
    );
  });

  it.each(["not-a-uuid", "123e4567-e89b-12d3-a456-426614174000"])(
    "rejects malformed or non-v4 identifier %#",
    (input) => {
      assert.isTrue(Result.isFailure(parseUserId(input)));
    }
  );
});
