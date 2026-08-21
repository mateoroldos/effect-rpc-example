import { Effect, Option } from "effect";
import { Headers as HttpHeaders } from "effect/unstable/http";
import { RpcClient } from "effect/unstable/rpc";
import { describe, expect, it } from "vitest";
import { withRequestHeaders } from "./request-headers.ts";

describe("withRequestHeaders", () => {
  it("scopes the caller cookie and trusted origin to the RPC operation", async () => {
    const incoming = new Headers({
      authorization: "Bearer browser-controlled",
      cookie: "better-auth.session_token=session",
      origin: "https://attacker.example",
    });
    const currentHeaders = Effect.gen(function* () {
      return yield* RpcClient.CurrentHeaders;
    });

    const headers = await Effect.runPromise(
      withRequestHeaders(currentHeaders, incoming, "https://app.example.com")
    );

    expect(HttpHeaders.get(headers, "cookie")).toEqual(
      Option.some("better-auth.session_token=session")
    );
    expect(HttpHeaders.get(headers, "origin")).toEqual(
      Option.some("https://app.example.com")
    );
    expect(HttpHeaders.get(headers, "authorization")).toEqual(Option.none());
  });

  it("does not leak request headers outside the RPC operation", async () => {
    const headers = await Effect.runPromise(
      Effect.flatMap(
        withRequestHeaders(
          Effect.void,
          new Headers({ cookie: "better-auth.session_token=session" }),
          "https://app.example.com"
        ),
        () => RpcClient.CurrentHeaders
      )
    );

    expect(HttpHeaders.get(headers, "cookie")).toEqual(Option.none());
  });
});
