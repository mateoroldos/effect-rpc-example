import { Authorization } from "@effect-template/core/authorization";
import { OrganizationProvider } from "@effect-template/core/organization-directory/provider";
import {
  Organization,
  type OrganizationId,
  OrganizationInvitation,
  type OrganizationInvitationId,
  OrganizationMember,
  OrganizationRole,
  organizationRoleAllows,
} from "@effect-template/domain/organization";
import { isAPIError } from "better-auth/api";
import { ORGANIZATION_ERROR_CODES } from "better-auth/client/plugins";
import { Context, Effect, Layer, Schema } from "effect";
import { BetterAuthInstance } from "../better-auth-instance/index.ts";

/** Better Auth Organization capabilities bound to one request. */
export interface RequestCapabilities {
  readonly authorization: Authorization.Interface;
  readonly organizations: OrganizationProvider.Interface;
}

/** Better Auth factory for request-scoped Organization capabilities. */
export interface Interface {
  readonly forHeaders: (headers: Headers) => RequestCapabilities;
}

/** Adapts Better Auth Organization APIs to application-owned ports. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/auth-better/OrganizationBetterAuth"
) {}

const decodeOrganization = Schema.decodeUnknownEffect(Organization);
const decodeOrganizations = Schema.decodeUnknownEffect(
  Schema.Array(Organization)
);
const decodeMembers = Schema.decodeUnknownEffect(
  Schema.Struct({ members: Schema.Array(OrganizationMember) })
);
const decodeInvitations = Schema.decodeUnknownEffect(
  Schema.Array(OrganizationInvitation)
);
const decodeRole = Schema.decodeUnknownEffect(OrganizationRole);

const make = Effect.gen(function* makeOrganizationBetterAuth() {
  const { auth } = yield* BetterAuthInstance.Service;

  const forHeaders = (headers: Headers): RequestCapabilities => {
    const roleFor = Effect.fn("OrganizationBetterAuth.roleFor")(function* (
      organizationId: OrganizationId
    ) {
      const value = yield* Effect.tryPromise({
        catch: (cause) => classifyAuthorizationFailure(cause, organizationId),
        try: () =>
          auth.api.getActiveMemberRole({
            headers,
            query: { organizationId },
          }),
      });
      return yield* decodeRole(value.role).pipe(
        Effect.mapError((cause) => new Authorization.Unavailable({ cause }))
      );
    });

    const authorization = Authorization.Service.of({
      require: Effect.fn("OrganizationBetterAuth.require")(
        function* (organizationId, permission) {
          const role = yield* roleFor(organizationId);
          if (!organizationRoleAllows(role, permission)) {
            return yield* new Authorization.PermissionDenied({
              organizationId,
              permission,
            });
          }
          return { organizationId, role };
        }
      ),
    });

    const organizations = OrganizationProvider.Service.of({
      acceptInvitation: Effect.fn("OrganizationBetterAuth.acceptInvitation")(
        function* (invitationId: OrganizationInvitationId) {
          yield* Effect.tryPromise({
            catch: (cause) => classifyInvitationFailure(cause, invitationId),
            try: () =>
              auth.api.acceptInvitation({ body: { invitationId }, headers }),
          });
        }
      ),
      create: Effect.fn("OrganizationBetterAuth.create")(function* (input) {
        const value = yield* Effect.tryPromise({
          catch: classifyCreateFailure,
          try: () => auth.api.createOrganization({ body: input, headers }),
        });
        return yield* decodeOrganization(value).pipe(
          Effect.mapError(
            () => new OrganizationProvider.Malformed({ operation: "create" })
          )
        );
      }),
      find: Effect.fn("OrganizationBetterAuth.find")(function* (
        organizationId: OrganizationId
      ) {
        const [value, role] = yield* Effect.all(
          [
            Effect.tryPromise({
              catch: (cause) =>
                classifyMembershipFailure(cause, organizationId, "find"),
              try: () =>
                auth.api.getOrganization({
                  headers,
                  query: { organizationId },
                }),
            }),
            roleFor(organizationId).pipe(
              Effect.mapError((error) =>
                error._tag === "Authorization.Unavailable"
                  ? new OrganizationProvider.Unavailable({
                      cause: error.cause,
                      operation: "find",
                    })
                  : error
              )
            ),
          ],
          { concurrency: "unbounded" }
        );
        if (value === null) {
          return yield* new Authorization.NotMember({ organizationId });
        }
        const organization = yield* decodeOrganization(value).pipe(
          Effect.mapError(
            () => new OrganizationProvider.Malformed({ operation: "find" })
          )
        );
        return { organization, role };
      }),
      invite: Effect.fn("OrganizationBetterAuth.invite")(function* (input) {
        yield* Effect.tryPromise({
          catch: (cause) =>
            classifyScopedFailure(
              cause,
              input.organizationId,
              "member:invite",
              "invite"
            ),
          try: () =>
            auth.api.createInvitation({
              body: {
                email: input.email,
                organizationId: input.organizationId,
                role: input.role,
              },
              headers,
            }),
        });
      }),
      list: Effect.tryPromise({
        catch: (cause) => classifyUnscopedFailure(cause, "list"),
        try: () => auth.api.listOrganizations({ headers }),
      }).pipe(
        Effect.flatMap((value) =>
          decodeOrganizations(value).pipe(
            Effect.mapError(
              () => new OrganizationProvider.Malformed({ operation: "list" })
            )
          )
        ),
        Effect.withSpan("OrganizationBetterAuth.list")
      ),
      listInvitations: Effect.fn("OrganizationBetterAuth.listInvitations")(
        function* (organizationId: OrganizationId) {
          const value = yield* Effect.tryPromise({
            catch: (cause) =>
              classifyScopedFailure(
                cause,
                organizationId,
                "member:invite",
                "listPeople"
              ),
            try: () =>
              auth.api.listInvitations({ headers, query: { organizationId } }),
          });
          return yield* decodeInvitations(value).pipe(
            Effect.mapError(
              () =>
                new OrganizationProvider.Malformed({ operation: "listPeople" })
            )
          );
        }
      ),
      listMembers: Effect.fn("OrganizationBetterAuth.listMembers")(function* (
        organizationId: OrganizationId
      ) {
        const value = yield* Effect.tryPromise({
          catch: (cause) =>
            classifyScopedFailure(
              cause,
              organizationId,
              "member:read",
              "listPeople"
            ),
          try: () =>
            auth.api.listMembers({
              headers,
              query: { limit: 100, offset: 0, organizationId },
            }),
        });
        const members = yield* decodeMembers(value).pipe(
          Effect.mapError(
            () =>
              new OrganizationProvider.Malformed({ operation: "listPeople" })
          )
        );
        return members.members;
      }),
    });

    return { authorization, organizations };
  };

  return Service.of({ forHeaders });
});

/** Provides the Better Auth Organization adapter with its dependency open. */
export const layerWithoutDependencies = Layer.effect(Service, make);

const classifyAuthorizationFailure = (
  cause: unknown,
  organizationId: OrganizationId
):
  | Authorization.Unauthenticated
  | Authorization.NotMember
  | Authorization.Unavailable => {
  if (isUnauthenticated(cause)) {
    return new Authorization.Unauthenticated();
  }
  if (isNotMember(cause)) {
    return new Authorization.NotMember({ organizationId });
  }
  return new Authorization.Unavailable({ cause });
};

const classifyUnscopedFailure = (
  cause: unknown,
  operation: OrganizationProvider.Operation
): Authorization.Unauthenticated | OrganizationProvider.Unavailable =>
  isUnauthenticated(cause)
    ? new Authorization.Unauthenticated()
    : new OrganizationProvider.Unavailable({ cause, operation });

const classifyMembershipFailure = (
  cause: unknown,
  organizationId: OrganizationId,
  operation: OrganizationProvider.Operation
):
  | Authorization.Unauthenticated
  | Authorization.NotMember
  | OrganizationProvider.Unavailable => {
  if (isUnauthenticated(cause)) {
    return new Authorization.Unauthenticated();
  }
  if (isNotMember(cause)) {
    return new Authorization.NotMember({ organizationId });
  }
  return new OrganizationProvider.Unavailable({ cause, operation });
};

const classifyCreateFailure = (
  cause: unknown
):
  | Authorization.Unauthenticated
  | OrganizationProvider.Conflict
  | OrganizationProvider.Unavailable => {
  if (isUnauthenticated(cause)) {
    return new Authorization.Unauthenticated();
  }
  if (
    hasCode(cause, ORGANIZATION_ERROR_CODES.ORGANIZATION_ALREADY_EXISTS.code) ||
    hasCode(
      cause,
      ORGANIZATION_ERROR_CODES.ORGANIZATION_SLUG_ALREADY_TAKEN.code
    )
  ) {
    return new OrganizationProvider.Conflict({ field: "slug" });
  }
  return new OrganizationProvider.Unavailable({ cause, operation: "create" });
};

const classifyScopedFailure = (
  cause: unknown,
  organizationId: OrganizationId,
  permission: "member:invite" | "member:read",
  operation: OrganizationProvider.Operation
):
  | Authorization.Unauthenticated
  | Authorization.NotMember
  | Authorization.PermissionDenied
  | OrganizationProvider.Unavailable => {
  if (isUnauthenticated(cause)) {
    return new Authorization.Unauthenticated();
  }
  if (isNotMember(cause)) {
    return new Authorization.NotMember({ organizationId });
  }
  if (isAPIError(cause) && cause.status === "FORBIDDEN") {
    return new Authorization.PermissionDenied({ organizationId, permission });
  }
  return new OrganizationProvider.Unavailable({ cause, operation });
};

const classifyInvitationFailure = (
  cause: unknown,
  invitationId: OrganizationInvitationId
):
  | Authorization.Unauthenticated
  | OrganizationProvider.InvitationNotFound
  | OrganizationProvider.Unavailable => {
  if (isUnauthenticated(cause)) {
    return new Authorization.Unauthenticated();
  }
  if (
    hasCode(cause, ORGANIZATION_ERROR_CODES.INVITATION_NOT_FOUND.code) ||
    hasCode(
      cause,
      ORGANIZATION_ERROR_CODES.YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION.code
    )
  ) {
    return new OrganizationProvider.InvitationNotFound({ invitationId });
  }
  return new OrganizationProvider.Unavailable({
    cause,
    operation: "acceptInvitation",
  });
};

const isUnauthenticated = (cause: unknown) =>
  isAPIError(cause) && cause.status === "UNAUTHORIZED";

const isNotMember = (cause: unknown) =>
  hasCode(
    cause,
    ORGANIZATION_ERROR_CODES.USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION.code
  ) ||
  hasCode(
    cause,
    ORGANIZATION_ERROR_CODES.YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION.code
  ) ||
  hasCode(cause, ORGANIZATION_ERROR_CODES.ORGANIZATION_NOT_FOUND.code);

const hasCode = (cause: unknown, code: string) =>
  isAPIError(cause) && cause.body?.code === code;
