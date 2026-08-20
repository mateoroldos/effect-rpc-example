import { assert, describe, it } from "@effect/vitest";
import { EmailSender } from "@effect-template/core/email";
import { Effect, Layer } from "effect";

import { BetterAuthEmail } from "./index.ts";

const sent: EmailSender.EmailMessage[] = [];
const testLayer = BetterAuthEmail.layerWithoutDependencies({
  webBaseUrl: new URL("https://app.example.com"),
}).pipe(
  Layer.provide(
    Layer.succeed(
      EmailSender.Service,
      EmailSender.Service.of({
        send: (message) =>
          Effect.sync(() => {
            sent.push(message);
          }),
      })
    )
  )
);

describe("BetterAuthEmail", () => {
  it.layer(testLayer)("configured sender", (test) => {
    test.effect("sends escaped HTML and text for a verification link", () =>
      Effect.gen(function* () {
        sent.length = 0;
        const email = yield* BetterAuthEmail.Service;

        yield* email.sendVerification(
          "ada@example.com",
          'https://app.example.com/verify?a=1&next="profile"'
        );

        assert.lengthOf(sent, 1);
        assert.include(sent[0]?.html ?? "", "&amp;");
        assert.notInclude(sent[0]?.html ?? "", 'next="profile"');
        assert.include(sent[0]?.text ?? "", "https://app.example.com/verify");
      })
    );

    test.effect("targets the configured invitation route", () =>
      Effect.gen(function* () {
        sent.length = 0;
        const email = yield* BetterAuthEmail.Service;

        yield* email.sendInvitation(
          "ada@example.com",
          "123e4567-e89b-42d3-a456-426614174000"
        );

        assert.include(
          sent[0]?.text ?? "",
          "https://app.example.com/accept-invitation/123e4567-e89b-42d3-a456-426614174000"
        );
      })
    );

    test.effect("rejects a malformed vendor email address", () =>
      Effect.gen(function* () {
        const email = yield* BetterAuthEmail.Service;
        const error = yield* email
          .sendPasswordReset("invalid", "https://safe.example.com")
          .pipe(Effect.flip);

        assert.strictEqual(error._tag, "EmailSender.SendError");
      })
    );
  });
});
