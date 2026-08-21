import { EmailAddress } from "@effect-template/domain/email-address";
import { Context, Effect, Layer, Schema } from "effect";

/** A transactional message to deliver to a single recipient. */
export const EmailMessage = Schema.Struct({
  html: Schema.String,
  replyTo: Schema.optional(EmailAddress),
  subject: Schema.String.pipe(Schema.check(Schema.isMinLength(1))),
  text: Schema.String,
  to: EmailAddress,
});

/** A validated transactional email ready to send. */
export interface EmailMessage extends Schema.Schema.Type<typeof EmailMessage> {}

/** Delivery authority required by features that send transactional email. */
export interface Interface {
  /** Delivers one message, failing when the transport rejects it. */
  readonly send: (message: EmailMessage) => Effect.Effect<void, SendError>;
}

/** Context service for transactional email delivery. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/EmailSender"
) {}

/** Indicates that the transport failed to accept a message. */
export class SendError extends Schema.TaggedErrorClass<SendError>()(
  "EmailSender.SendError",
  { cause: Schema.Defect() }
) {}

/**
 * Logs each message instead of sending it. Used in tests and in local dev,
 * where no email provider is configured.
 */
export const layerLog = Layer.succeed(
  Service,
  Service.of({
    send: Effect.fn("EmailSenderLog.send")(function* (message: EmailMessage) {
      yield* Effect.log("EmailSender (log): message not sent").pipe(
        Effect.annotateLogs({
          subject: message.subject,
          text: message.text,
          to: message.to,
        })
      );
    }),
  })
);
