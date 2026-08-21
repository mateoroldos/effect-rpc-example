import { OrganizationsRpc } from "@effect-template/rpc/organizations";
import { error } from "@sveltejs/kit";
import { Match, Schema } from "effect";
import { form, query, requested } from "$app/server";
import { runRpc } from "../server/rpc/run.ts";

/** Lists the Organizations visible to the current User. */
export const getOrganizations = query(() =>
  runRpc(
    (client) => client["Organizations.List"](),
    (failure) =>
      Match.value(failure).pipe(
        Match.tagsExhaustive({
          "OrganizationsRpc.Unauthenticated": () =>
            error(401, "Sign in to continue."),
          "OrganizationsRpc.Unavailable": () =>
            error(503, "Organizations could not be loaded. Try again later."),
        })
      )
  )
);

/** Resolves a URL-scoped Organization visible to the current User. */
export const getOrganization = query(
  Schema.toStandardSchemaV1(OrganizationsRpc.GetOrganizationInput),
  ({ organizationId }) =>
    runRpc(
      (client) => client["Organizations.Get"]({ organizationId }),
      (failure) =>
        Match.value(failure).pipe(
          Match.tagsExhaustive({
            "OrganizationsRpc.OrganizationNotFound": () =>
              error(404, "Organization not found"),
            "OrganizationsRpc.Unauthenticated": () =>
              error(401, "Sign in to continue."),
            "OrganizationsRpc.Unavailable": () =>
              error(
                503,
                "The Organization could not be loaded. Try again later."
              ),
          })
        )
    )
);

/** Lists Members and Invitations for a URL-scoped Organization. */
export const getOrganizationPeople = query(
  Schema.toStandardSchemaV1(OrganizationsRpc.ListOrganizationPeopleInput),
  ({ organizationId }) =>
    runRpc(
      (client) => client["Members.List"]({ organizationId }),
      (failure) =>
        Match.value(failure).pipe(
          Match.tagsExhaustive({
            "OrganizationsRpc.OrganizationNotFound": () =>
              error(404, "Organization not found"),
            "OrganizationsRpc.PermissionDenied": () =>
              error(403, "You do not have permission to view Members."),
            "OrganizationsRpc.Unauthenticated": () =>
              error(401, "Sign in to continue."),
            "OrganizationsRpc.Unavailable": () =>
              error(
                503,
                "Organization Members could not be loaded. Try again later."
              ),
          })
        )
    )
);

/** Invites a User to become an Organization Member. */
export const inviteMemberForm = form(
  Schema.toStandardSchemaV1(OrganizationsRpc.InviteMemberInput),
  async (input) => {
    await runRpc(
      (client) => client["Members.Invite"](input),
      (failure) =>
        Match.value(failure).pipe(
          Match.tagsExhaustive({
            "OrganizationsRpc.OrganizationNotFound": () =>
              error(404, "Organization not found"),
            "OrganizationsRpc.PermissionDenied": () =>
              error(403, "You do not have permission to invite Members."),
            "OrganizationsRpc.RoleNotAssignable": () =>
              error(403, "You cannot assign that Organization Role."),
            "OrganizationsRpc.Unauthenticated": () =>
              error(401, "Sign in to continue."),
            "OrganizationsRpc.Unavailable": () =>
              error(503, "The invitation could not be sent. Try again later."),
          })
        )
    );
    await requested(getOrganizationPeople, 1).refreshAll();
  }
);

/** Accepts an Organization Invitation for the current User. */
export const acceptInvitationForm = form(
  Schema.toStandardSchemaV1(OrganizationsRpc.AcceptInvitationInput),
  async ({ invitationId }) => {
    await runRpc(
      (client) => client["Invitations.Accept"]({ invitationId }),
      (failure) =>
        Match.value(failure).pipe(
          Match.tagsExhaustive({
            "OrganizationsRpc.InvitationNotFound": () =>
              error(404, "Invitation not found"),
            "OrganizationsRpc.Unauthenticated": () =>
              error(401, "Sign in to continue."),
            "OrganizationsRpc.Unavailable": () =>
              error(
                503,
                "The invitation could not be accepted. Sign in with the invited email and try again."
              ),
          })
        )
    );
  }
);

/** Creates an Organization owned by the current User. */
export const createOrganizationForm = form(
  Schema.toStandardSchemaV1(OrganizationsRpc.CreateOrganizationInput),
  async (input) => {
    await runRpc(
      (client) => client["Organizations.Create"](input),
      (failure) =>
        Match.value(failure).pipe(
          Match.tagsExhaustive({
            "OrganizationsRpc.OrganizationConflict": () =>
              error(409, "This Organization slug is already in use."),
            "OrganizationsRpc.Unauthenticated": () =>
              error(401, "Sign in to continue."),
            "OrganizationsRpc.Unavailable": () =>
              error(
                503,
                "The Organization could not be created. Try again later."
              ),
          })
        )
    );
    await requested(getOrganizations, 1).refreshAll();
  }
);
