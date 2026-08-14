import { OrganizationAccess } from "@effect-template/core/organization-access";
import type { Principal } from "@effect-template/domain/identity";
import type { OrganizationId } from "@effect-template/domain/organization";
import { getOrgAdapter } from "better-auth/plugins/organization";
import { Effect, Layer } from "effect";

import { BetterAuthInstance } from "../better-auth-instance/index.ts";

/** Constructs OrganizationAccess through Better Auth's Organization adapter. */
const make = Effect.gen(function* makeOrganizationAccessBetterAuth() {
  const { auth } = yield* BetterAuthInstance.Service;

  const requireMember = Effect.fn("OrganizationAccessBetterAuth.requireMember")(
    function* (principal: Principal, organizationId: OrganizationId) {
      const context = yield* Effect.promise(() => auth.$context);
      // SAFETY: Better Auth's concrete plugin context is an AuthContext at runtime. Its exported getOrgAdapter signature loses the concrete options and is invariant in the adapter field.
      const organizationAdapter = getOrgAdapter(
        context as Parameters<typeof getOrgAdapter>[0]
      );
      const member = yield* Effect.tryPromise({
        catch: (cause) => new OrganizationAccess.Unavailable({ cause }),
        try: () =>
          organizationAdapter.findMemberByOrgId({
            organizationId,
            userId: principal.userId,
          }),
      });
      if (member === null) {
        return yield* new OrganizationAccess.NotMember({ organizationId });
      }
    }
  );

  return OrganizationAccess.Service.of({ requireMember });
});

/** Provides Better Auth-backed Organization membership authorization. */
export const layerWithoutDependencies = Layer.effect(
  OrganizationAccess.Service,
  make
);
