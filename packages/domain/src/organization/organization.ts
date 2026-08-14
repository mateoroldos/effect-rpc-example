import { Schema } from "effect";

/** Decodes UUID-v4 strings into branded Organization identities. */
export const OrganizationId = Schema.String.pipe(
  Schema.check(Schema.isUUID(4)),
  Schema.brand("OrganizationId")
);

/** A UUID-v4 identity assigned to an Organization by Better Auth. */
export type OrganizationId = typeof OrganizationId.Type;

/** Trims Organization names and accepts values containing 1–200 characters. */
export const OrganizationName = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(200)
).pipe(Schema.brand("OrganizationName"));

/** A trimmed, nonblank Organization name of at most 200 characters. */
export type OrganizationName = typeof OrganizationName.Type;

/** Accepts lowercase URL-safe Organization slugs without leading or trailing separators. */
export const OrganizationSlug = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(255),
  Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
).pipe(Schema.brand("OrganizationSlug"));

/** A lowercase URL-safe Organization navigation slug. */
export type OrganizationSlug = typeof OrganizationSlug.Type;

/** Validates Organization records and their domain values. */
export const Organization = Schema.Struct({
  id: OrganizationId,
  name: OrganizationName,
  slug: OrganizationSlug,
});

/** An Organization with a stable identity, canonical name, and navigation slug. */
export interface Organization extends Schema.Schema.Type<typeof Organization> {}
