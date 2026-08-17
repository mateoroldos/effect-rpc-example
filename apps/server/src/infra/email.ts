import { EmailSender } from "@effect-template/core/email";
import { CloudflareEmailSender } from "@effect-template/email/cloudflare";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

export type Options =
  | { readonly _tag: "Log" }
  | ({
      readonly _tag: "Cloudflare";
    } & CloudflareEmailSender.CloudflareEmailConfig);

/** Selects local logging or Cloudflare delivery from parsed server configuration. */
export const emailLayer = (configuration: Options) =>
  configuration._tag === "Cloudflare"
    ? CloudflareEmailSender.layer(configuration).pipe(
        Layer.provide(FetchHttpClient.layer)
      )
    : EmailSender.layerLog;
