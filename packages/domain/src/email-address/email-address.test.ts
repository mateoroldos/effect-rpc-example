import { assert, describe, it } from "@effect/vitest";
import { Result, Schema } from "effect";
import { EmailAddress } from "./email-address.ts";

const parseEmailAddress = Schema.decodeUnknownResult(EmailAddress);

describe("EmailAddress", () => {
  it.each(["a@b.co", "user.name+tag@example.com"])("accepts %s", (input) => {
    assert.isTrue(Result.isSuccess(parseEmailAddress(input)));
  });

  it.each(["", "no-at", "a@b", "two@@b.co", "spa ce@b.co"])(
    "rejects %s",
    (input) => {
      assert.isTrue(Result.isFailure(parseEmailAddress(input)));
    }
  );
});
