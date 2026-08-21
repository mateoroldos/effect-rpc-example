import { describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { EmailSender } from "./index.ts";

const parseMessage = Schema.decodeUnknownSync(EmailSender.EmailMessage);

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
