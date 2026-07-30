import { Effect } from "effect";

/**
 * Server entrypoint. Empty on purpose — no HTTP framework, services, or
 * layers yet. Just proves the Effect runtime boots.
 */
const main = Effect.log("effect-template server — nothing here yet");

Effect.runPromise(main);
