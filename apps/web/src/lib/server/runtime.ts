import { NodeHttpClient } from "@effect/platform-node";
import { makeServerLayer } from "@effect-template/observability";
import { Effect, Layer, ManagedRuntime, type Scope } from "effect";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import {
  API_URL,
  APP_ENV,
  DEV_INSTANCE,
  LOG_LEVEL,
  OTEL_EXPORTER_OTLP_ENDPOINT,
  OTEL_EXPORTER_OTLP_HEADERS_JSON,
  OTEL_SERVICE_VERSION,
} from "$app/env/private";
import { AppRpcClient } from "./rpc/client.ts";

const serviceName = DEV_INSTANCE
  ? `${DEV_INSTANCE}-web`
  : "effect-template-web";

// Dev: the API is this workspace's portless URL (mirrors the server's --name).
// Prod sets API_URL explicitly. Assumes default portless (https/443).
const apiUrl =
  API_URL ?? `https://${DEV_INSTANCE}.api.effect-template.localhost`;

const protocolLayer = RpcClient.layerProtocolHttp({
  url: `${apiUrl}/rpc`,
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

/** Runs a request-scoped Effect using the web application's shared runtime. */
export const run = <A, E>(
  effect: Effect.Effect<A, E, AppRpcClient | Scope.Scope>,
  options?: { readonly signal?: AbortSignal }
) => runtime.runPromise(Effect.scoped(effect), options);

/** Releases resources owned by the web application's shared runtime. */
export const disposeRuntime = () => runtime.dispose();
