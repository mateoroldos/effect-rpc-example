import type { Principal } from "@effect-template/domain/identity";
import { Context, Schema } from "effect";
import { RpcMiddleware } from "effect/unstable/rpc";

/** Request-scoped authenticated Principal supplied to RPC handlers. */
export class CurrentPrincipal extends Context.Service<
  CurrentPrincipal,
  Principal
>()("@effect-template/rpc/CurrentPrincipal") {}

/** Indicates that an RPC request has no authenticated session. */
export class Unauthenticated extends Schema.TaggedErrorClass<Unauthenticated>()(
  "AuthenticationRpc.Unauthenticated",
  {}
) {}

/** Indicates that the authentication dependency could not resolve identity. */
export class Unavailable extends Schema.TaggedErrorClass<Unavailable>()(
  "AuthenticationRpc.Unavailable",
  {}
) {}

/** Requires server-side authentication and provides CurrentPrincipal to handlers. */
export class AuthenticationMiddleware extends RpcMiddleware.Service<
  AuthenticationMiddleware,
  { provides: CurrentPrincipal }
>()("@effect-template/rpc/AuthenticationMiddleware", {
  error: Schema.Union([Unauthenticated, Unavailable]),
  requiredForClient: false,
}) {}
