import { EmailSender } from "@effect-template/core/email";
import { Config, Effect, Layer, Redacted } from "effect";
import { HttpClient, HttpClientRequest } from "effect/unstable/http";

/** Sender identity + credentials for one Cloudflare account's Email Sending. */
export interface CloudflareEmailConfig {
  readonly accountId: string;
  readonly apiToken: Redacted.Redacted<string>;
  /** Address on a domain onboarded via `wrangler email sending enable`. */
  readonly fromAddress: string;
  /** Display name shown to recipients. */
  readonly fromName: string;
}

const endpointFor = (accountId: string) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`;

/**
 * The Email Sending REST body. Pure and exported so the wire format can be
 * asserted in tests. Note the REST field names differ from the Workers binding:
 * `from.address` (not `email`) and `reply_to` (not `replyTo`).
 */
export const buildPayload = (
  config: CloudflareEmailConfig,
  message: EmailSender.EmailMessage
) => ({
  from: { address: config.fromAddress, name: config.fromName },
  html: message.html,
  subject: message.subject,
  text: message.text,
  to: message.to,
  ...(message.replyTo === undefined ? {} : { reply_to: message.replyTo }),
});

const buildRequest = (
  config: CloudflareEmailConfig,
  message: EmailSender.EmailMessage
): HttpClientRequest.HttpClientRequest =>
  HttpClientRequest.post(endpointFor(config.accountId)).pipe(
    HttpClientRequest.bearerToken(Redacted.value(config.apiToken)),
    HttpClientRequest.bodyText(
      JSON.stringify(buildPayload(config, message)),
      "application/json"
    )
  );

const make = (
  config: CloudflareEmailConfig,
  client: HttpClient.HttpClient
): EmailSender.Interface => {
  // A non-2xx response becomes a typed HttpClientError, projected to SendError.
  const okClient = HttpClient.filterStatusOk(client);
  const send = Effect.fn("CloudflareEmailSender.send")(function* (
    message: EmailSender.EmailMessage
  ) {
    yield* okClient.execute(buildRequest(config, message)).pipe(
      Effect.mapError((cause) => new EmailSender.SendError({ cause })),
      Effect.asVoid
    );
  });
  return { send };
};

/**
 * Cloudflare Email Sending adapter. Requires an `HttpClient` in context (the
 * server provides `FetchHttpClient.layer`). Reads its sender identity and the
 * account-scoped API token from configuration.
 */
export const layer = Layer.effect(
  EmailSender.Service,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const config: CloudflareEmailConfig = {
      accountId: yield* Config.string("CLOUDFLARE_ACCOUNT_ID"),
      apiToken: yield* Config.redacted("CLOUDFLARE_EMAIL_API_TOKEN"),
      fromAddress: yield* Config.string("EMAIL_FROM_ADDRESS"),
      fromName: yield* Config.string("EMAIL_FROM_NAME").pipe(
        Config.withDefault("effect-template")
      ),
    };
    return EmailSender.Service.of(make(config, client));
  })
);
