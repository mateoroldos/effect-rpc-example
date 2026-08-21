import { OrganizationDirectory } from "@effect-template/core/organization-directory";
import { OrganizationsRpc } from "@effect-template/rpc/organizations";
import { Effect } from "effect";
import { BetterAuthRpc } from "../auth/better-auth-rpc/index.ts";

/** Organization RPC contract decorated with request-scoped application capabilities. */
export const group = OrganizationsRpc.group.middleware(
  BetterAuthRpc.Middleware
);

/** Organization RPC handlers: project application outcomes into wire responses. */
export const organizationsHandlersLayer = group.toLayer(
  Effect.gen(function* makeOrganizationsRpcHandlers() {
    const organization = yield* OrganizationDirectory.Service;

    return group.of({
      "Invitations.Accept": Effect.fn("OrganizationsRpc.acceptInvitation")(
        function* ({ invitationId }) {
          return yield* organization.acceptInvitation(invitationId).pipe(
            Effect.catchTags({
              "Authorization.Unauthenticated": () =>
                new OrganizationsRpc.Unauthenticated(),
              "OrganizationDirectory.InvitationNotFound": () =>
                new OrganizationsRpc.InvitationNotFound(),
              "OrganizationDirectory.Unavailable": () =>
                new OrganizationsRpc.Unavailable(),
            })
          );
        }
      ),
      "Members.Invite": Effect.fn("OrganizationsRpc.inviteMember")(
        function* (input) {
          return yield* organization.invite(input).pipe(
            Effect.catchTags({
              "Authorization.NotMember": () =>
                new OrganizationsRpc.OrganizationNotFound(),
              "Authorization.PermissionDenied": ({ permission }) =>
                new OrganizationsRpc.PermissionDenied({ permission }),
              "Authorization.Unauthenticated": () =>
                new OrganizationsRpc.Unauthenticated(),
              "Authorization.Unavailable": () =>
                new OrganizationsRpc.Unavailable(),
              "OrganizationDirectory.RoleNotAssignable": ({ role }) =>
                new OrganizationsRpc.RoleNotAssignable({ role }),
              "OrganizationDirectory.Unavailable": () =>
                new OrganizationsRpc.Unavailable(),
            })
          );
        }
      ),
      "Members.List": Effect.fn("OrganizationsRpc.listPeople")(function* ({
        organizationId,
      }) {
        return yield* organization.listPeople(organizationId).pipe(
          Effect.catchTags({
            "Authorization.NotMember": () =>
              new OrganizationsRpc.OrganizationNotFound(),
            "Authorization.PermissionDenied": ({ permission }) =>
              new OrganizationsRpc.PermissionDenied({ permission }),
            "Authorization.Unauthenticated": () =>
              new OrganizationsRpc.Unauthenticated(),
            "Authorization.Unavailable": () =>
              new OrganizationsRpc.Unavailable(),
            "OrganizationDirectory.Malformed": () =>
              new OrganizationsRpc.Unavailable(),
            "OrganizationDirectory.Unavailable": () =>
              new OrganizationsRpc.Unavailable(),
          })
        );
      }),
      "Organizations.Create": Effect.fn("OrganizationsRpc.create")(
        function* (input) {
          return yield* organization.create(input).pipe(
            Effect.catchTags({
              "Authorization.Unauthenticated": () =>
                new OrganizationsRpc.Unauthenticated(),
              "OrganizationDirectory.Conflict": ({ field }) =>
                new OrganizationsRpc.OrganizationConflict({ field }),
              "OrganizationDirectory.Malformed": () =>
                new OrganizationsRpc.Unavailable(),
              "OrganizationDirectory.Unavailable": () =>
                new OrganizationsRpc.Unavailable(),
            })
          );
        }
      ),
      "Organizations.Get": Effect.fn("OrganizationsRpc.get")(function* ({
        organizationId,
      }) {
        return yield* organization.find(organizationId).pipe(
          Effect.catchTags({
            "Authorization.NotMember": () =>
              new OrganizationsRpc.OrganizationNotFound(),
            "Authorization.Unauthenticated": () =>
              new OrganizationsRpc.Unauthenticated(),
            "OrganizationDirectory.Malformed": () =>
              new OrganizationsRpc.Unavailable(),
            "OrganizationDirectory.Unavailable": () =>
              new OrganizationsRpc.Unavailable(),
          })
        );
      }),
      "Organizations.List": Effect.fn("OrganizationsRpc.list")(function* () {
        return yield* organization.list.pipe(
          Effect.catchTags({
            "Authorization.Unauthenticated": () =>
              new OrganizationsRpc.Unauthenticated(),
            "OrganizationDirectory.Malformed": () =>
              new OrganizationsRpc.Unavailable(),
            "OrganizationDirectory.Unavailable": () =>
              new OrganizationsRpc.Unavailable(),
          })
        );
      }),
    });
  })
);
