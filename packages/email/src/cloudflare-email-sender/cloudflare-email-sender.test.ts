import { assert, describe, it } from "@effect/vitest";
import { EmailSender } from "@effect-template/core/email";
import { Redacted, Schema } from "effect";

import {
  buildPayload,
  type CloudflareEmailConfig,
} from "./cloudflare-email-sender.ts";

const config: CloudflareEmailConfig = {
  accountId: "acc_123",
  apiToken: Redacted.make("secret"),
  fromAddress: EmailSender.EmailAddress.make("notifications@example.com"),
  fromName: "Example",
};

const parseMessage = Schema.decodeUnknownSync(EmailSender.EmailMessage);

describe("buildPayload", () => {
  it("maps to the REST field names", () => {
    const payload = buildPayload(
      config,
      parseMessage({
        html: "<p>hi</p>",
        subject: "hello",
        text: "hi",
        to: "ada@example.com",
      })
    );
    assert.deepStrictEqual(payload as Record<string, unknown>, {
      from: { address: "notifications@example.com", name: "Example" },
      html: "<p>hi</p>",
      subject: "hello",
      text: "hi",
      to: "ada@example.com",
    });
  });

  it("includes reply_to only when present", () => {
    const withReplyTo = buildPayload(
      config,
      parseMessage({
        html: "<p>hi</p>",
        replyTo: "support@example.com",
        subject: "hello",
        text: "hi",
        to: "ada@example.com",
      })
    );
    assert.strictEqual(
      (withReplyTo as { reply_to?: string }).reply_to,
      "support@example.com"
    );
  });
});
