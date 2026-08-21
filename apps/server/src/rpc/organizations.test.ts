import { assert, describe, it } from "@effect/vitest";
import { Authorization } from "@effect-template/core/authorization";
import { OrganizationDirectory } from "@effect-template/core/organization-directory";
import { OrganizationProvider } from "@effect-template/core/organization-directory/provider";
import { EmailAddress } from "@effect-template/domain/email-address";
import {
  OrganizationId,
  OrganizationInvitationId,
  OrganizationName,
  OrganizationSlug,
} from "@effect-template/domain/organization";
import { OrganizationsRpc } from "@effect-template/rpc/organizations";
import { Effect, Layer } from "effect";
import { RpcTest } from "effect/unstable/rpc";
import { BetterAuthRpc } from "../auth/better-auth-rpc/index.ts";
import { group, organizationsHandlersLayer } from "./organizations.ts";

const organizationId = OrganizationId.make(
  "123e4567-e89b-42d3-a456-426614174001"
);
const invitationId = OrganizationInvitationId.make(
  "123e4567-e89b-42d3-a456-426614174002"
);
const organization = {
  id: organizationId,
  name: OrganizationName.make("Acme"),
  slug: OrganizationSlug.make("acme"),
};
const service = OrganizationDirectory.Service.of({
  acceptInvitation: () => Effect.void,
  create: (input) => Effect.succeed({ id: organizationId, ...input }),
  find: () => Effect.succeed({ organization, role: "owner" }),
  invite: () => Effect.void,
  list: Effect.succeed([organization]),
  listPeople: () => Effect.succeed({ invitations: [], members: [] }),
});

const provider = OrganizationProvider.Service.of({
  acceptInvitation: () => Effect.void,
  create: (input) => Effect.succeed({ id: organizationId, ...input }),
  find: () => Effect.succeed({ organization, role: "owner" as const }),
  invite: () => Effect.void,
  list: Effect.succeed([organization]),
  listInvitations: () => Effect.succeed([]),
  listMembers: () => Effect.succeed([]),
});

const requestMiddleware = Layer.succeed(
  BetterAuthRpc.Middleware,
  BetterAuthRpc.Middleware.of((effect) =>
    effect.pipe(
      Effect.provideService(Authorization.Service, Authorization.allowAll),
      Effect.provideService(OrganizationProvider.Service, provider)
    )
  )
);

const layer = (value: OrganizationDirectory.Interface) =>
  organizationsHandlersLayer.pipe(
    Layer.provide(
      Layer.succeed(
        OrganizationDirectory.Service,
        OrganizationDirectory.Service.of(value)
      )
    ),
    Layer.merge(requestMiddleware)
  );

describe("Organizations RPC", () => {
  it.layer(layer(service))("available Organization service", (test) => {
    test.effect(
      "round-trips Organization, Member, and Invitation operations",
      () =>
        Effect.scoped(
          Effect.gen(function* () {
            const client = yield* RpcTest.makeClient(group);
            assert.deepEqual(yield* client["Organizations.List"](), [
              organization,
            ]);
            assert.deepEqual(
              yield* client["Organizations.Get"]({ organizationId }),
              { organization, role: "owner" }
            );
            assert.deepEqual(
              yield* client["Organizations.Create"]({
                name: OrganizationName.make("New Organization"),
                slug: OrganizationSlug.make("new-organization"),
              }),
              {
                id: organizationId,
                name: "New Organization",
                slug: "new-organization",
              }
            );
            assert.deepEqual(
              yield* client["Members.List"]({ organizationId }),
              { invitations: [], members: [] }
            );
            yield* client["Members.Invite"]({
              email: EmailAddress.make("invitee@example.com"),
              organizationId,
              role: "member",
            });
            yield* client["Invitations.Accept"]({ invitationId });
          })
        )
    );
  });

  it.layer(
    layer({
      ...service,
      invite: () =>
        Effect.fail(
          new Authorization.PermissionDenied({
            organizationId,
            permission: "member:invite",
          })
        ),
    })
  )("denied Member", (test) => {
    test.effect("preserves the denied Permission", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(group);
          const failure = yield* client["Members.Invite"]({
            email: EmailAddress.make("invitee@example.com"),
            organizationId,
            role: "member",
          }).pipe(Effect.flip);
          assert.deepEqual(
            failure,
            new OrganizationsRpc.PermissionDenied({
              permission: "member:invite",
            })
          );
        })
      )
    );
  });

  it.layer(
    layer({
      ...service,
      find: () => Effect.fail(new Authorization.NotMember({ organizationId })),
    })
  )("inaccessible Organization", (test) => {
    test.effect("conceals non-membership", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(group);
          const failure = yield* client["Organizations.Get"]({
            organizationId,
          }).pipe(Effect.flip);
          assert.deepEqual(
            failure,
            new OrganizationsRpc.OrganizationNotFound()
          );
        })
      )
    );
  });

  it.layer(
    layer({
      ...service,
      invite: ({ role }) =>
        Effect.fail(new OrganizationDirectory.RoleNotAssignable({ role })),
    })
  )("Role escalation", (test) => {
    test.effect("preserves the rejected Role", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcTest.makeClient(group);
          const failure = yield* client["Members.Invite"]({
            email: EmailAddress.make("invitee@example.com"),
            organizationId,
            role: "owner",
          }).pipe(Effect.flip);
          assert.deepEqual(
            failure,
            new OrganizationsRpc.RoleNotAssignable({ role: "owner" })
          );
        })
      )
    );
  });
});
