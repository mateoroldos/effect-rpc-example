import { assert, describe, it } from "@effect/vitest";
import { Result, Schema } from "effect";
import { FastCheck } from "effect/testing";

import { AgentId, AgentName } from "./agent.ts";

const parseAgentId = Schema.decodeUnknownResult(AgentId);
const parseAgentName = Schema.decodeUnknownResult(AgentName);

describe("AgentName", () => {
  it("normalizes valid names", () => {
    const result = parseAgentName("  Ada  ");
    assert.strictEqual(Result.getOrThrow(result), "Ada");
  });

  it.prop(
    "normalizes surrounding whitespace",
    [
      FastCheck.string({ maxLength: 200, minLength: 1 }).filter(
        (name) => name === name.trim()
      ),
      FastCheck.constantFrom("", " ", "\t", "\n"),
      FastCheck.constantFrom("", " ", "\t", "\n"),
    ],
    ([name, prefix, suffix]) => {
      assert.strictEqual(
        Result.getOrThrow(parseAgentName(`${prefix}${name}${suffix}`)),
        name
      );
    }
  );

  it.each(["", "   ", "a".repeat(201)])("rejects illegal name %#", (input) => {
    assert.isTrue(Result.isFailure(parseAgentName(input)));
  });
});

describe("AgentId", () => {
  it("accepts UUID v4 identifiers", () => {
    assert.isTrue(
      Result.isSuccess(parseAgentId("123e4567-e89b-42d3-a456-426614174000"))
    );
  });

  it.each(["not-a-uuid", "123e4567-e89b-12d3-a456-426614174000"])(
    "rejects malformed or non-v4 identifier %#",
    (input) => {
      assert.isTrue(Result.isFailure(parseAgentId(input)));
    }
  );
});
