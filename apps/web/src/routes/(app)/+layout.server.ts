import { error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals }) => {
  if (!locals.user) {
    error(500, "Authenticated request state is missing");
  }
  return { user: locals.user };
};
