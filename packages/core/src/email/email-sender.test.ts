import { assert, describe, it } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";

import { EmailSender } from "./email-sender.ts";

const parseEmail = Schema.decodeUnknownResult(EmailSender.EmailAddress);
const parseMessage = Schema.decodeUnknownSync(EmailSender.EmailMessage);

describe("EmailAddress", () => {
  it.each(["a@b.co", "user.name+tag@example.com"])("accepts %s", (input) => {
    assert.isTrue(Result.isSuccess(parseEmail(input)));
  });

  it.each(["", "no-at", "a@b", "two@@b.co", "spa ce@b.co"])(
    "rejects %s",
    (input) => {
      assert.isTrue(Result.isFailure(parseEmail(input)));
    }
  );
});

describe("EmailSender.layerLog", () => {
  it.layer(EmailSender.layerLog)("logs instead of sending", (test) => {
    test.effect("accepts a message", () =>
      Effect.gen(function* () {
        const sender = yield* EmailSender.Service;
        yield* sender.send(
          parseMessage({
            html: "<p>hi</p>",
            subject: "hello",
            text: "hi",
            to: "ada@example.com",
          })
        );
      })
    );
  });
});
