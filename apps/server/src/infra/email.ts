import { EmailSender } from "@effect-template/core/email";
import { CloudflareEmailSender } from "@effect-template/email/cloudflare";
import { Config, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

/**
 * EmailSender for the server: the real Cloudflare adapter when an API token is
 * configured, a logging double otherwise (local dev needs no email creds).
 */
export const emailLayer = Layer.unwrap(
  Config.option(Config.redacted("CLOUDFLARE_EMAIL_API_TOKEN")).pipe(
    Effect.map((token) =>
      Option.isSome(token)
        ? CloudflareEmailSender.layer.pipe(Layer.provide(FetchHttpClient.layer))
        : EmailSender.layerLog
    )
  )
);
