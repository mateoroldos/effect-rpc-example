import { OrganizationId } from "@effect-template/domain/organization";
import { error } from "@sveltejs/kit";
import { Option, Schema } from "effect";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ params }) => ({
  organizationId: Option.getOrElse(
    Schema.decodeUnknownOption(OrganizationId)(params.organizationId),
    () => error(404, "Organization not found")
  ),
});
