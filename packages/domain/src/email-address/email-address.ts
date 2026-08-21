import { Schema } from "effect";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parses syntactically valid email addresses into a shared domain value. */
export const EmailAddress = Schema.String.pipe(
  Schema.check(Schema.isPattern(EMAIL_PATTERN)),
  Schema.brand("EmailAddress")
);

/** A syntactically valid address used to identify or contact a User. */
export type EmailAddress = typeof EmailAddress.Type;
