import { EmailSender } from "@effect-template/core/email";
import { Config, Context, Effect, Layer, Schema } from "effect";

const parseEmailAddress = Schema.decodeUnknownEffect(EmailSender.EmailAddress);

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/** Better Auth email callbacks expressed as typed Effects. */
export interface Interface {
  readonly sendInvitation: (
    email: string,
    invitationId: string
  ) => Effect.Effect<void, EmailSender.SendError>;
  readonly sendPasswordReset: (
    email: string,
    url: string
  ) => Effect.Effect<void, EmailSender.SendError>;
  readonly sendVerification: (
    email: string,
    url: string
  ) => Effect.Effect<void, EmailSender.SendError>;
}

/** Context service owning Better Auth email parsing, content, and links. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/auth-better/BetterAuthEmail"
) {}

const make = Effect.gen(function* makeBetterAuthEmail() {
  const emailSender = yield* EmailSender.Service;
  const webBaseUrl = yield* Config.url("WEB_URL").pipe(
    Config.withDefault(new URL("http://localhost:5173"))
  );

  const sendLink = Effect.fn("BetterAuthEmail.sendLink")(function* (
    email: string,
    subject: string,
    introduction: string,
    url: string
  ) {
    const to = yield* parseEmailAddress(email).pipe(
      Effect.mapError((cause) => new EmailSender.SendError({ cause }))
    );
    yield* emailSender.send(
      EmailSender.EmailMessage.make({
        html: `<p>${escapeHtml(introduction)}</p><p><a href="${escapeHtml(url)}">Continue</a></p>`,
        subject,
        text: `${introduction}\n\n${url}`,
        to,
      })
    );
  });

  const sendInvitation = Effect.fn("BetterAuthEmail.sendInvitation")(
    (email: string, invitationId: string) =>
      sendLink(
        email,
        "Organization invitation",
        "You were invited to join an Organization.",
        new URL(
          `/accept-invitation/${encodeURIComponent(invitationId)}`,
          webBaseUrl
        ).toString()
      )
  );

  const sendPasswordReset = Effect.fn("BetterAuthEmail.sendPasswordReset")(
    (email: string, url: string) =>
      sendLink(
        email,
        "Reset your password",
        "Use this link to reset your password.",
        url
      )
  );

  const sendVerification = Effect.fn("BetterAuthEmail.sendVerification")(
    (email: string, url: string) =>
      sendLink(
        email,
        "Verify your email",
        "Use this link to verify your email address.",
        url
      )
  );

  return Service.of({ sendInvitation, sendPasswordReset, sendVerification });
});

/** Provides BetterAuthEmail while preserving its EmailSender requirement. */
export const layerWithoutDependencies = Layer.effect(Service, make);
