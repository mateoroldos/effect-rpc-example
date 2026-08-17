import { type BetterAuthOptions, betterAuth } from "better-auth";
import { type OrganizationOptions, organization } from "better-auth/plugins";

import { accessControl, roles } from "./organization-access-control.ts";

type Options = Omit<BetterAuthOptions, "advanced" | "plugins"> & {
  readonly organization?: OrganizationOptions;
};

/** Constructs Better Auth with the application's fixed database and Organization policy. */
export const makeBetterAuth = ({
  organization: organizationOptions = {},
  ...options
}: Options) =>
  betterAuth({
    ...options,
    advanced: { database: { generateId: "uuid" } },
    plugins: [
      organization({ ...organizationOptions, ac: accessControl, roles }),
    ],
  });
