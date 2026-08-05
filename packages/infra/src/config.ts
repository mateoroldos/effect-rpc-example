/**
 * Deployment target the stack provisions for.
 *
 * `prod` is the single deployed environment (see `.agent/plan.md`); `dev` covers
 * Alchemy's default `dev_${USER}` stage used for throwaway local experiments.
 */
export type Stage = "prod" | "dev";

const PROD_ALIASES = new Set(["prd", "prod", "production"]);

/** Maps an Alchemy stage string to our two-value {@link Stage}. */
export const parseStage = (raw: string): Stage =>
  PROD_ALIASES.has(raw.trim().toLowerCase()) ? "prod" : "dev";

/**
 * Public hostnames for the Railway-deployed apps. Empty on non-prod stages, and
 * on prod only when a root domain is supplied — the stack then also provisions
 * the matching Cloudflare DNS records that point at Railway.
 */
export interface Domains {
  readonly api?: string;
  readonly web?: string;
}

/** Derives `api.<root>` / `app.<root>` for prod; nothing otherwise. */
export const resolveDomains = (
  stage: Stage,
  rootDomain: string | undefined
): Domains =>
  stage === "prod" && rootDomain
    ? { api: `api.${rootDomain}`, web: `app.${rootDomain}` }
    : {};

/**
 * Stable resource name for a logical resource. Prod uses the bare name; dev
 * stages get a `-dev` suffix so throwaway runs never collide with prod state.
 */
export const resourceName = (base: string, stage: Stage): string =>
  stage === "prod" ? base : `${base}-dev`;
