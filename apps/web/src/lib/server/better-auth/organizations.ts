import {
  Organization,
  type OrganizationId,
  OrganizationInvitation,
  type OrganizationInvitationId,
  OrganizationMember,
  type OrganizationName,
  type OrganizationRole,
  type OrganizationSlug,
} from "@effect-template/domain/organization";
import { ORGANIZATION_ERROR_CODES } from "better-auth/client/plugins";
import { Effect, Option, Schema } from "effect";
import { authClient } from "#lib/auth-client.ts";
import { forwardedHeaders } from "./forwarded-headers.ts";

const Operation = Schema.Literals([
  "list",
  "find",
  "create",
  "listPeople",
  "inviteMember",
  "acceptInvitation",
]);
type Operation = typeof Operation.Type;

/** Indicates that Better Auth could not complete an Organization operation. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "BetterAuthOrganizations.Unavailable",
  { cause: Schema.Defect(), operation: Operation }
) {}

/** Indicates that Better Auth returned an invalid Organization representation. */
export class Malformed extends Schema.TaggedErrorClass<Malformed>()(
  "BetterAuthOrganizations.Malformed",
  { operation: Operation }
) {}

/** Indicates that Better Auth could not identify the caller. */
export class Unauthenticated extends Schema.TaggedErrorClass<Unauthenticated>()(
  "BetterAuthOrganizations.Unauthenticated",
  {}
) {}

/** Hides Organizations that are missing or inaccessible to the caller. */
export class NotFound extends Schema.TaggedErrorClass<NotFound>()(
  "BetterAuthOrganizations.NotFound",
  {}
) {}

const decodeOrganization = Schema.decodeUnknownOption(Organization);
const decodeOrganizations = Schema.decodeUnknownOption(
  Schema.Array(Organization)
);
const decodeMembers = Schema.decodeUnknownOption(
  Schema.Struct({ members: Schema.Array(OrganizationMember) })
);
const decodeInvitations = Schema.decodeUnknownOption(
  Schema.Array(OrganizationInvitation)
);

/** Lists the Organizations visible to the caller represented by the request headers. */
export const list = Effect.fn("BetterAuthOrganizations.list")(function* (
  requestHeaders: Headers
) {
  const headers = yield* forwardedHeaders(requestHeaders);
  const { data, error } = yield* attempt("list", (signal) =>
    authClient.organization.list({ fetchOptions: { headers, signal } })
  );
  if (error) {
    return yield* new Unavailable({ cause: error, operation: "list" });
  }
  const organizations = decodeOrganizations(data ?? []);
  if (Option.isNone(organizations)) {
    return yield* new Malformed({ operation: "list" });
  }
  return organizations.value;
});

/** Finds one Organization without revealing whether an inaccessible Organization exists. */
export const find = Effect.fn("BetterAuthOrganizations.find")(function* (
  requestHeaders: Headers,
  organizationId: typeof OrganizationId.Type
) {
  const headers = yield* forwardedHeaders(requestHeaders);
  const { data, error } = yield* attempt("find", (signal) =>
    authClient.organization.getOrganization({
      fetchOptions: { headers, signal },
      query: { organizationId },
    })
  );
  if (error) {
    if (error.status === 401) {
      return yield* new Unauthenticated();
    }
    if (
      error.status === 403 ||
      error.status === 404 ||
      error.code === ORGANIZATION_ERROR_CODES.ORGANIZATION_NOT_FOUND.code
    ) {
      return yield* new NotFound();
    }
    return yield* new Unavailable({ cause: error, operation: "find" });
  }
  if (data === null) {
    return yield* new NotFound();
  }
  const organization = decodeOrganization(data);
  if (Option.isNone(organization)) {
    return yield* new Malformed({ operation: "find" });
  }
  return organization.value;
});

/** Creates an Organization through Better Auth. */
export const create = Effect.fn("BetterAuthOrganizations.create")(function* (
  requestHeaders: Headers,
  input: {
    readonly name: typeof OrganizationName.Type;
    readonly slug: typeof OrganizationSlug.Type;
  }
) {
  const headers = yield* forwardedHeaders(requestHeaders);
  const { data, error } = yield* attempt("create", (signal) =>
    authClient.organization.create({
      ...input,
      fetchOptions: { headers, signal },
    })
  );
  if (error) {
    return yield* new Unavailable({ cause: error, operation: "create" });
  }
  const organization = decodeOrganization(data);
  if (Option.isNone(organization)) {
    return yield* new Malformed({ operation: "create" });
  }
  return organization.value;
});

/** Lists the Members and pending invitations for an Organization. */
export const listPeople = Effect.fn("BetterAuthOrganizations.listPeople")(
  function* (
    requestHeaders: Headers,
    organizationId: typeof OrganizationId.Type
  ) {
    const headers = yield* forwardedHeaders(requestHeaders);
    const [membersResponse, invitationsResponse] = yield* Effect.all(
      [
        attempt("listPeople", (signal) =>
          authClient.organization.listMembers({
            fetchOptions: { headers, signal },
            query: { organizationId },
          })
        ),
        attempt("listPeople", (signal) =>
          authClient.organization.listInvitations({
            fetchOptions: { headers, signal },
            query: { organizationId },
          })
        ),
      ],
      { concurrency: "unbounded" }
    );
    if (membersResponse.error) {
      return yield* new Unavailable({
        cause: membersResponse.error,
        operation: "listPeople",
      });
    }
    if (invitationsResponse.error) {
      return yield* new Unavailable({
        cause: invitationsResponse.error,
        operation: "listPeople",
      });
    }
    const members = decodeMembers(membersResponse.data);
    const invitations = decodeInvitations(invitationsResponse.data);
    if (Option.isNone(members) || Option.isNone(invitations)) {
      return yield* new Malformed({ operation: "listPeople" });
    }
    return {
      invitations: invitations.value,
      members: members.value.members,
    };
  }
);

/** Invites an email address to become an Organization Member. */
export const inviteMember = Effect.fn("BetterAuthOrganizations.inviteMember")(
  function* (
    requestHeaders: Headers,
    input: {
      readonly email: string;
      readonly organizationId: typeof OrganizationId.Type;
      readonly role: typeof OrganizationRole.Type;
    }
  ) {
    const headers = yield* forwardedHeaders(requestHeaders);
    const { error } = yield* attempt("inviteMember", (signal) =>
      authClient.organization.inviteMember({
        ...input,
        fetchOptions: { headers, signal },
      })
    );
    if (error) {
      return yield* new Unavailable({
        cause: error,
        operation: "inviteMember",
      });
    }
  }
);

/** Accepts an Organization invitation for the caller. */
export const acceptInvitation = Effect.fn(
  "BetterAuthOrganizations.acceptInvitation"
)(function* (
  requestHeaders: Headers,
  invitationId: typeof OrganizationInvitationId.Type
) {
  const headers = yield* forwardedHeaders(requestHeaders);
  const { error } = yield* attempt("acceptInvitation", (signal) =>
    authClient.organization.acceptInvitation({
      fetchOptions: { headers, signal },
      invitationId,
    })
  );
  if (error) {
    return yield* new Unavailable({
      cause: error,
      operation: "acceptInvitation",
    });
  }
});

const attempt = <A>(
  operation: Operation,
  request: (signal: AbortSignal) => Promise<A>
): Effect.Effect<A, Unavailable> =>
  Effect.tryPromise({
    catch: (cause) => new Unavailable({ cause, operation }),
    try: request,
  }).pipe(Effect.withSpan("BetterAuthOrganizations.request"));
