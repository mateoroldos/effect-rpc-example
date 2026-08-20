import {
  OrganizationId,
  OrganizationInvitationId,
  OrganizationName,
  OrganizationRole,
  OrganizationSlug,
} from "@effect-template/domain/organization";
import { error } from "@sveltejs/kit";
import { Match, Schema } from "effect";
import { form, getRequestEvent, query, requested } from "$app/server";
import {
  acceptInvitation,
  create,
  find,
  inviteMember,
  list,
  listPeople,
  type Malformed,
  type NotFound,
  type PermissionDenied,
  type Unauthenticated,
  type Unavailable,
} from "../server/better-auth/organizations.ts";
import { run } from "../server/runtime.ts";

const CreateOrganizationInput = Schema.Struct({
  name: OrganizationName,
  slug: OrganizationSlug,
});

const InviteMemberInput = Schema.Struct({
  email: Schema.String.pipe(
    Schema.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
  ),
  organizationId: OrganizationId,
  role: OrganizationRole,
});

const AcceptInvitationInput = Schema.Struct({
  invitationId: OrganizationInvitationId,
});

/** Lists the Organizations visible to the current User. */
export const getOrganizations = query(() => {
  const { request } = getRequestEvent();
  return run(
    list(request.headers),
    organizationFailure("Organizations could not be loaded. Try again later."),
    { signal: request.signal }
  );
});

/** Resolves a URL-scoped Organization visible to the current User. */
export const getOrganization = query(
  Schema.toStandardSchemaV1(Schema.Struct({ organizationId: OrganizationId })),
  ({ organizationId }) => {
    const { request } = getRequestEvent();
    return run(
      find(request.headers, organizationId),
      scopedOrganizationFailure(
        "The Organization could not be loaded. Try again later."
      ),
      { signal: request.signal }
    );
  }
);

/** Lists Members and invitations for a URL-scoped Organization. */
export const getOrganizationPeople = query(
  Schema.toStandardSchemaV1(Schema.Struct({ organizationId: OrganizationId })),
  ({ organizationId }) => {
    const { request } = getRequestEvent();
    return run(
      listPeople(request.headers, organizationId),
      scopedOrganizationFailure(
        "Organization Members could not be loaded. Try again later."
      ),
      { signal: request.signal }
    );
  }
);

/** Invites a User to become an Organization Member. */
export const inviteMemberForm = form(
  Schema.toStandardSchemaV1(InviteMemberInput),
  async (input) => {
    const { request } = getRequestEvent();
    await run(
      inviteMember(request.headers, input),
      Match.type<
        Unavailable | Malformed | Unauthenticated | NotFound | PermissionDenied
      >().pipe(
        Match.tagsExhaustive({
          "BetterAuthOrganizations.Malformed": () => error(500),
          "BetterAuthOrganizations.NotFound": () =>
            error(404, "Organization not found"),
          "BetterAuthOrganizations.PermissionDenied": () =>
            error(403, "You do not have permission to invite Members."),
          "BetterAuthOrganizations.Unauthenticated": () =>
            error(401, "Sign in to continue."),
          "BetterAuthOrganizations.Unavailable": () =>
            error(503, "The invitation could not be sent. Try again later."),
        })
      ),
      { signal: request.signal }
    );
    await requested(getOrganizationPeople, 1).refreshAll();
  }
);

/** Accepts an Organization invitation for the current User. */
export const acceptInvitationForm = form(
  Schema.toStandardSchemaV1(AcceptInvitationInput),
  async ({ invitationId }) => {
    const { request } = getRequestEvent();
    await run(
      acceptInvitation(request.headers, invitationId),
      organizationFailure(
        "The invitation could not be accepted. Sign in with the invited email and try again."
      ),
      { signal: request.signal }
    );
  }
);

/** Creates an Organization owned by the current User. */
export const createOrganizationForm = form(
  Schema.toStandardSchemaV1(CreateOrganizationInput),
  async (input) => {
    const { request } = getRequestEvent();
    await run(
      create(request.headers, input),
      organizationFailure(
        "The Organization could not be created. Try again later."
      ),
      { signal: request.signal }
    );
    await requested(getOrganizations, 1).refreshAll();
  }
);

const scopedOrganizationFailure = (unavailableMessage: string) =>
  Match.type<Unavailable | Malformed | Unauthenticated | NotFound>().pipe(
    Match.tagsExhaustive({
      "BetterAuthOrganizations.Malformed": () => error(500),
      "BetterAuthOrganizations.NotFound": () =>
        error(404, "Organization not found"),
      "BetterAuthOrganizations.Unauthenticated": () =>
        error(401, "Sign in to continue."),
      "BetterAuthOrganizations.Unavailable": () =>
        error(503, unavailableMessage),
    })
  );

const organizationFailure = (unavailableMessage: string) =>
  Match.type<Unavailable | Malformed>().pipe(
    Match.tagsExhaustive({
      "BetterAuthOrganizations.Malformed": () => error(500),
      "BetterAuthOrganizations.Unavailable": () =>
        error(503, unavailableMessage),
    })
  );
