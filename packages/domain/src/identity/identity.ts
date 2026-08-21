import { Schema } from "effect";
import { EmailAddress } from "../email-address/email-address.ts";

/** Decodes UUID-v4 strings into branded User identities. */
export const UserId = Schema.String.pipe(
  Schema.check(Schema.isUUID(4)),
  Schema.brand("UserId")
);

/** A UUID-v4 identity assigned to a User by Better Auth. */
export type UserId = typeof UserId.Type;

/** Identifies the authenticated User executing an application operation. */
export const Principal = Schema.Struct({ userId: UserId });

/** Authenticated identity used for application authorization. */
export interface Principal extends Schema.Schema.Type<typeof Principal> {}

/** Safe User fields exposed beyond the authentication adapter. */
export const User = Schema.Struct({
  email: EmailAddress,
  id: UserId,
  name: Schema.String,
});

/** A safe authenticated User projection without credentials. */
export interface User extends Schema.Schema.Type<typeof User> {}
