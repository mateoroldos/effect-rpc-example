import type { Organization } from "@effect-template/domain/organization";
import { createContext } from "svelte";

/** The active URL-scoped Organization available to nested feature components. */
export interface OrganizationContext {
  readonly organization: Organization;
}

/** Provides and consumes the active URL-scoped Organization context. */
export const [getOrganizationContext, setOrganizationContext] =
  createContext<OrganizationContext>();
