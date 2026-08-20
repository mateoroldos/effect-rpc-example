import { describe, expect, it } from "vitest";
import { forwardedRequestHeaders } from "./forwarded-request-headers.ts";

describe("forwardedRequestHeaders", () => {
  it("forwards the caller cookie with the configured origin", () => {
    const incoming = new Headers({
      authorization: "Bearer browser-controlled",
      cookie: "better-auth.session_token=session",
      origin: "https://attacker.example",
      "x-forwarded-host": "attacker.example",
    });

    expect(
      Object.fromEntries(
        forwardedRequestHeaders(incoming, "https://app.example.com").entries()
      )
    ).toEqual({
      cookie: "better-auth.session_token=session",
      origin: "https://app.example.com",
    });
  });

  it("omits credentials when the request has no cookie", () => {
    expect(
      Object.fromEntries(
        forwardedRequestHeaders(
          new Headers(),
          "https://app.example.com"
        ).entries()
      )
    ).toEqual({ origin: "https://app.example.com" });
  });
});
