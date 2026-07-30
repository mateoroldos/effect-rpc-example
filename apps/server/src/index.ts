import { BunRuntime } from "@effect/platform-bun";
import { Layer } from "effect";

import { appLayer } from "./app-layer.ts";

BunRuntime.runMain(Layer.launch(appLayer));
