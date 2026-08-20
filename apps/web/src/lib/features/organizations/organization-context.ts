import type {
  Organization,
  OrganizationRole,
} from "@effect-template/domain/organization";
import { createContext } from "svelte";

/** The active URL-scoped Organization available to nested feature components. */
export interface OrganizationContext {
  /** The Organization selected by the current URL. */
  readonly organization: Organization;
  /** The current Member's Role in the selected Organization. */
  readonly role: OrganizationRole;
}

/** Provides and consumes the active URL-scoped Organization context. */
export const [getOrganizationContext, setOrganizationContext] =
  createContext<OrganizationContext>();
