import { NodeHttpClient } from "@effect/platform-node";
import { makeServerLayer } from "@effect-template/observability";
import { Effect, Layer, ManagedRuntime, Result, type Scope } from "effect";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import {
  APP_ENV,
  DEV_INSTANCE,
  LOG_LEVEL,
  OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_EXPORTER_OTLP_HEADERS_JSON,
  OTEL_SERVICE_VERSION,
} from "$app/env/private";
import { apiOrigin } from "../public-origins.ts";
import { AppRpcClient } from "./rpc/client.ts";

const serviceName = DEV_INSTANCE
  ? `${DEV_INSTANCE}-web`
  : "effect-template-web";

const protocolLayer = RpcClient.layerProtocolHttp({
  url: `${apiOrigin}/rpc`,
}).pipe(
  Layer.provide(NodeHttpClient.layerUndici),
  Layer.provide(RpcSerialization.layerNdjson)
);

const telemetryLayer = makeServerLayer({
  environment: APP_ENV,
  logLevel: LOG_LEVEL,
  otlpEndpoint: OTEL_EXPORTER_OTLP_ENDPOINT,
  otlpHeaders: OTEL_EXPORTER_OTLP_HEADERS_JSON,
  serviceName,
  serviceVersion: OTEL_SERVICE_VERSION,
});

const rpcClientLayer = AppRpcClient.layer.pipe(Layer.provide(protocolLayer));

const runtime = ManagedRuntime.make(
  Layer.merge(rpcClientLayer, telemetryLayer)
);

/**
 * Runs a request-scoped Effect on the shared runtime and projects its typed
 * failures at the SvelteKit boundary. Defects and interruptions stay rejected.
 */
export const run = async <A, E>(
  effect: Effect.Effect<A, E, AppRpcClient | Scope.Scope>,
  onFailure: (error: NoInfer<E>) => never,
  options?: { readonly signal?: AbortSignal }
): Promise<A> =>
  Result.match(
    await runtime.runPromise(Effect.result(Effect.scoped(effect)), options),
    { onFailure, onSuccess: (value) => value }
  );

/** Releases resources owned by the web application's shared runtime. */
export const disposeRuntime = () => runtime.dispose();
