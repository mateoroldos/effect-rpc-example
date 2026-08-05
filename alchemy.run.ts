// biome-ignore-all lint/performance/noNamespaceImport: alchemy exposes a namespace API (nested R2/ApiToken sub-namespaces, and providers()/state() collide across providers)
import {
  parseStage,
  resolveDomains,
  resourceName,
} from "@effect-template/infra/config";
import * as Alchemy from "alchemy";
import * as Axiom from "alchemy/Axiom";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Neon from "alchemy/Neon";
import { Config, Effect, Layer } from "effect";

const AXIOM_OTLP_ENDPOINT = "https://api.axiom.co";

export default Alchemy.Stack(
  "effect-template",
  {
    providers: Layer.mergeAll(
      Cloudflare.providers(),
      Neon.providers(),
      Axiom.providers()
    ),

    // Shared account-wide state (Cloudflare DO SQLite) so local + CI diff against
    // one source of truth. ALCHEMY_LOCAL_STATE=1 opts into throwaway file state
    // (`.alchemy/`) for local experiments that must not touch the shared ledger.
    state: process.env.ALCHEMY_LOCAL_STATE
      ? Alchemy.localState()
      : Cloudflare.state(),
  },
  Effect.gen(function* () {
    const stage = parseStage(yield* Alchemy.Stage);
    // Root domain for prod custom domains (e.g. `example.com`); absent → no DNS.
    const appDomain = yield* Config.string("APP_DOMAIN").pipe(
      Config.withDefault("")
    );
    const rootDomain = appDomain.trim() || undefined;
    const domains = resolveDomains(stage, rootDomain);
    const accountId = yield* Config.string("CLOUDFLARE_ACCOUNT_ID");

    // Neon serverless Postgres. Provisions the default `main` branch, a role, a
    // database, and a read-write endpoint. Consume the *pooled* connection URI
    // as DATABASE_URL (pgbouncer); migrations use the direct URI.
    const db = yield* Neon.Project(
      resourceName("effect-template-db", stage),
      {}
    );

    // One Axiom dataset receives all OTLP signals (logs/traces/metrics), routed
    // by the `X-Axiom-Dataset` header; the ingest token is scoped to just it.
    const datasetName = resourceName("effect-template", stage);
    yield* Axiom.Dataset("telemetry", { name: datasetName });
    const ingest = yield* Axiom.ApiToken("telemetry-ingest", {
      datasetCapabilities: { [datasetName]: { ingest: ["create"] } },
      description: "OTLP ingest for effect-template",
      name: resourceName("effect-template-ingest", stage),
    });

    // Private object storage. Empty for now (no domain/CORS); scoped S3 access
    // keys get added when a concrete use appears.
    const bucketName = resourceName("effect-template", stage);
    yield* Cloudflare.R2.Bucket("storage", { name: bucketName });

    // Account-owned token for Cloudflare Email Sending over REST (the server is
    // a Railway container, not a Worker, so it can't use the send_email binding).
    const emailToken = yield* Cloudflare.ApiToken.AccountApiToken("email", {
      name: resourceName("effect-template-email", stage),
      policies: [
        {
          effect: "allow",
          permissionGroups: ["Email Sending Write"],
          resources: { [`com.cloudflare.api.account.${accountId}`]: "*" },
        },
      ],
    });

    // Safe summary shown post-apply. Secrets (Neon URI, Axiom/email tokens) are
    // redacted here by design — retrieve them from each provider console for the
    // one-time paste into Railway. See the deploy runbook.
    return {
      accountId,
      apiDomain: domains.api ?? "(none — set APP_DOMAIN)",
      axiomDataset: datasetName,
      axiomIngestTokenId: ingest.id,
      emailTokenId: emailToken.tokenId,
      neonProjectId: db.projectId,
      otlpEndpoint: AXIOM_OTLP_ENDPOINT,
      r2Bucket: bucketName,
      stage,
      webDomain: domains.web ?? "(none — set APP_DOMAIN)",
    };
  })
);
