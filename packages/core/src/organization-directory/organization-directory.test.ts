import { assert, describe, it } from "@effect/vitest";
import { EmailAddress } from "@effect-template/domain/email-address";
import {
  OrganizationId,
  OrganizationInvitationId,
  OrganizationName,
  OrganizationSlug,
} from "@effect-template/domain/organization";
import { Context, Effect, Layer, Ref } from "effect";
import { Authorization } from "../authorization/index.ts";
import { OrganizationDirectory } from "./index.ts";
import { OrganizationProvider } from "./organization-provider/index.ts";

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

interface ProviderProbeInterface {
  readonly invitationListCalls: Effect.Effect<number>;
  readonly inviteCalls: Effect.Effect<number>;
}

class ProviderProbe extends Context.Service<
  ProviderProbe,
  ProviderProbeInterface
>()("@effect-template/core/OrganizationDirectory/ProviderProbe") {}

const providerLayer = Layer.effectContext(
  Effect.gen(function* makeOrganizationProviderTest() {
    const invitationListCalls = yield* Ref.make(0);
    const inviteCalls = yield* Ref.make(0);
    const provider = OrganizationProvider.Service.of({
      acceptInvitation: () => Effect.void,
      create: (input) => Effect.succeed({ id: organizationId, ...input }),
      find: () => Effect.succeed({ organization, role: "owner" as const }),
      invite: () => Ref.update(inviteCalls, (calls) => calls + 1),
      list: Effect.succeed([organization]),
      listInvitations: () =>
        Ref.update(invitationListCalls, (calls) => calls + 1).pipe(
          Effect.as([
            {
              email: EmailAddress.make("invitee@example.com"),
              id: invitationId,
              role: "member" as const,
              status: "pending" as const,
            },
          ])
        ),
      listMembers: () => Effect.succeed([]),
    });
    const probe = ProviderProbe.of({
      invitationListCalls: Ref.get(invitationListCalls),
      inviteCalls: Ref.get(inviteCalls),
    });
    return Context.empty().pipe(
      Context.add(OrganizationProvider.Service, provider),
      Context.add(ProviderProbe, probe)
    );
  })
);

const layer = (authorization: Authorization.Interface) =>
  Layer.mergeAll(
    OrganizationDirectory.layer,
    providerLayer,
    Layer.succeed(
      Authorization.Service,
      Authorization.Service.of(authorization)
    )
  );

const authorizedAs = (role: "owner" | "admin" | "member") =>
  Authorization.Service.of({
    require: (requestedOrganizationId) =>
      Effect.succeed({ organizationId: requestedOrganizationId, role }),
  });

const denied = Authorization.Service.of({
  require: (requestedOrganizationId, permission) =>
    Effect.fail(
      new Authorization.PermissionDenied({
        organizationId: requestedOrganizationId,
        permission,
      })
    ),
});

describe("OrganizationDirectory", () => {
  it.layer(layer(authorizedAs("owner")))("owner", (test) => {
    test.effect("invites an admin", () =>
      Effect.gen(function* () {
        const service = yield* OrganizationDirectory.Service;
        yield* service.invite({
          email: EmailAddress.make("invitee@example.com"),
          organizationId,
          role: "admin",
        });
      })
    );
  });

  it.layer(layer(authorizedAs("owner")))("Role escalation", (test) => {
    test.effect("rejects the owner Role before provider I/O", () =>
      Effect.gen(function* () {
        const service = yield* OrganizationDirectory.Service;
        const probe = yield* ProviderProbe;
        const result = yield* Effect.flip(
          service.invite({
            email: EmailAddress.make("invitee@example.com"),
            organizationId,
            role: "owner",
          })
        );

        assert.strictEqual(
          result._tag,
          "OrganizationDirectory.RoleNotAssignable"
        );
        assert.strictEqual(yield* probe.inviteCalls, 0);
      })
    );
  });

  it.layer(layer(authorizedAs("member")))("Member", (test) => {
    test.effect("lists Members without requesting Invitations", () =>
      Effect.gen(function* () {
        const service = yield* OrganizationDirectory.Service;
        const probe = yield* ProviderProbe;
        const people = yield* service.listPeople(organizationId);

        assert.deepEqual(people, { invitations: [], members: [] });
        assert.strictEqual(yield* probe.invitationListCalls, 0);
      })
    );
  });

  it.layer(layer(denied))("denied Member", (test) => {
    test.effect("cannot list Organization people", () =>
      Effect.gen(function* () {
        const service = yield* OrganizationDirectory.Service;
        const result = yield* Effect.flip(service.listPeople(organizationId));

        assert.strictEqual(result._tag, "Authorization.PermissionDenied");
        if (result._tag === "Authorization.PermissionDenied") {
          assert.strictEqual(result.permission, "member:read");
        }
      })
    );
  });
});
