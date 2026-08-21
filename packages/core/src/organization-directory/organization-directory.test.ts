import { assert, describe, it } from "@effect/vitest";
import {
  OrganizationId,
  OrganizationInvitationId,
  OrganizationName,
  OrganizationSlug,
} from "@effect-template/domain/organization";
import { Effect, Layer } from "effect";
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

const providerLayer = Layer.succeed(
  OrganizationProvider.Service,
  OrganizationProvider.Service.of({
    acceptInvitation: () => Effect.void,
    create: (input) => Effect.succeed({ id: organizationId, ...input }),
    find: () => Effect.succeed({ organization, role: "owner" as const }),
    invite: () => Effect.void,
    list: Effect.succeed([organization]),
    listPeople: () =>
      Effect.succeed({
        invitations: [
          {
            email: "invitee@example.com",
            id: invitationId,
            role: "member" as const,
            status: "pending" as const,
          },
        ],
        members: [],
      }),
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
          email: "invitee@example.com",
          organizationId,
          role: "admin",
        });
      })
    );
  });

  it.layer(layer(authorizedAs("admin")))("admin", (test) => {
    test.effect("cannot assign the admin Role", () =>
      Effect.gen(function* () {
        const service = yield* OrganizationDirectory.Service;
        const result = yield* Effect.flip(
          service.invite({
            email: "invitee@example.com",
            organizationId,
            role: "admin",
          })
        );

        assert.strictEqual(
          result._tag,
          "OrganizationDirectory.RoleNotAssignable"
        );
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
