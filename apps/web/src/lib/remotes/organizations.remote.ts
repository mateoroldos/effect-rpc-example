import {
  Organization,
  OrganizationId,
  OrganizationName,
  OrganizationSlug,
} from "@effect-template/domain/organization";
import { error } from "@sveltejs/kit";
import { ORGANIZATION_ERROR_CODES } from "better-auth/client/plugins";
import { Effect, Match, Option, Schema } from "effect";
import { form, getRequestEvent, query, requested } from "$app/server";
import { authClient } from "../auth-client.ts";
import { forwardedHeaders } from "../server/better-auth/forwarded-headers.ts";
import { run } from "../server/runtime.ts";

const CreateOrganizationInput = Schema.Struct({
  name: OrganizationName,
  slug: OrganizationSlug,
});

class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "Organizations.Unavailable",
  { cause: Schema.Defect() }
) {}

class Malformed extends Schema.TaggedErrorClass<Malformed>()(
  "Organizations.Malformed",
  {}
) {}

class Unauthenticated extends Schema.TaggedErrorClass<Unauthenticated>()(
  "Organizations.Unauthenticated",
  {}
) {}

class NotFound extends Schema.TaggedErrorClass<NotFound>()(
  "Organizations.NotFound",
  {}
) {}

const decodeOrganization = Schema.decodeUnknownOption(Organization);
const decodeOrganizations = Schema.decodeUnknownOption(
  Schema.Array(Organization)
);

/** Lists the Organizations visible to the current User. */
export const getOrganizations = query(() => {
  const { request } = getRequestEvent();
  return run(
    listOrganizations(request.headers),
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
      findOrganization(request.headers, organizationId),
      Match.type<Unavailable | Malformed | Unauthenticated | NotFound>().pipe(
        Match.tagsExhaustive({
          "Organizations.Malformed": () => error(500),
          "Organizations.NotFound": () => error(404, "Organization not found"),
          "Organizations.Unauthenticated": () =>
            error(401, "Sign in to continue."),
          "Organizations.Unavailable": () =>
            error(
              503,
              "The Organization could not be loaded. Try again later."
            ),
        })
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
      createOrganization(request.headers, input),
      organizationFailure(
        "The Organization could not be created. Try again later."
      ),
      { signal: request.signal }
    );
    await requested(getOrganizations, 1).refreshAll();
  }
);

const listOrganizations = Effect.fn("Organizations.list")(function* (
  requestHeaders: Headers
) {
  const headers = yield* forwardedHeaders(requestHeaders);
  const { data, error: providerError } = yield* Effect.tryPromise({
    catch: (cause) => new Unavailable({ cause }),
    try: (signal) =>
      authClient.organization.list({ fetchOptions: { headers, signal } }),
  });
  if (providerError) {
    return yield* new Unavailable({ cause: providerError });
  }
  const organizations = decodeOrganizations(data ?? []);
  if (Option.isNone(organizations)) {
    return yield* new Malformed();
  }
  return organizations.value;
});

const findOrganization = Effect.fn("Organizations.get")(function* (
  requestHeaders: Headers,
  organizationId: typeof OrganizationId.Type
) {
  const headers = yield* forwardedHeaders(requestHeaders);
  const { data, error: providerError } = yield* Effect.tryPromise({
    catch: (cause) => new Unavailable({ cause }),
    try: (signal) =>
      authClient.organization.getOrganization({
        fetchOptions: { headers, signal },
        query: { organizationId },
      }),
  });
  if (providerError) {
    if (providerError.status === 401) {
      return yield* new Unauthenticated();
    }
    if (
      providerError.status === 403 ||
      providerError.status === 404 ||
      providerError.code ===
        ORGANIZATION_ERROR_CODES.ORGANIZATION_NOT_FOUND.code
    ) {
      return yield* new NotFound();
    }
    return yield* new Unavailable({ cause: providerError });
  }
  if (data === null) {
    return yield* new NotFound();
  }
  const organization = decodeOrganization(data);
  if (Option.isNone(organization)) {
    return yield* new Malformed();
  }
  return organization.value;
});

const createOrganization = Effect.fn("Organizations.create")(function* (
  requestHeaders: Headers,
  input: typeof CreateOrganizationInput.Type
) {
  const headers = yield* forwardedHeaders(requestHeaders);
  const { data, error: providerError } = yield* Effect.tryPromise({
    catch: (cause) => new Unavailable({ cause }),
    try: (signal) =>
      authClient.organization.create({
        ...input,
        fetchOptions: { headers, signal },
      }),
  });
  if (providerError) {
    return yield* new Unavailable({ cause: providerError });
  }
  const organization = decodeOrganization(data);
  if (Option.isNone(organization)) {
    return yield* new Malformed();
  }
  return organization.value;
});

const organizationFailure = (unavailableMessage: string) =>
  Match.type<Unavailable | Malformed>().pipe(
    Match.tagsExhaustive({
      "Organizations.Malformed": () => error(500),
      "Organizations.Unavailable": () => error(503, unavailableMessage),
    })
  );
