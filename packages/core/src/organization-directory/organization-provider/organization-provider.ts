import type {
  Organization,
  OrganizationId,
  OrganizationInvitation,
  OrganizationInvitationId,
  OrganizationMember,
} from "@effect-template/domain/organization";
import { Context, type Effect } from "effect";
import type { Authorization } from "../../authorization/index.ts";
import type {
  Conflict,
  CreateInput,
  InvitationNotFound,
  InviteInput,
  Malformed,
  Unavailable,
  VisibleOrganization,
} from "../organization-directory-contract.ts";

/** Request-bound Organization operations implemented by an external provider. */
export interface Interface {
  readonly acceptInvitation: (
    invitationId: OrganizationInvitationId
  ) => Effect.Effect<
    void,
    Authorization.Unauthenticated | InvitationNotFound | Unavailable
  >;
  readonly create: (
    input: CreateInput
  ) => Effect.Effect<
    Organization,
    Authorization.Unauthenticated | Conflict | Malformed | Unavailable
  >;
  readonly find: (
    organizationId: OrganizationId
  ) => Effect.Effect<
    VisibleOrganization,
    | Authorization.Unauthenticated
    | Authorization.NotMember
    | Malformed
    | Unavailable
  >;
  readonly invite: (
    input: InviteInput
  ) => Effect.Effect<
    void,
    | Authorization.Unauthenticated
    | Authorization.NotMember
    | Authorization.PermissionDenied
    | Unavailable
  >;
  readonly list: Effect.Effect<
    readonly Organization[],
    Authorization.Unauthenticated | Malformed | Unavailable
  >;
  readonly listInvitations: (
    organizationId: OrganizationId
  ) => Effect.Effect<
    readonly OrganizationInvitation[],
    | Authorization.Unauthenticated
    | Authorization.NotMember
    | Authorization.PermissionDenied
    | Malformed
    | Unavailable
  >;
  readonly listMembers: (
    organizationId: OrganizationId
  ) => Effect.Effect<
    readonly OrganizationMember[],
    | Authorization.Unauthenticated
    | Authorization.NotMember
    | Authorization.PermissionDenied
    | Malformed
    | Unavailable
  >;
}

/** External Organization provider bound to the current request. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-template/core/OrganizationDirectory/Provider"
) {}
