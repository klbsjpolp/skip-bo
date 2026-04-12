import { describe, expect, it } from "vitest";

import { getSentryTracePropagationTargets } from "../tracePropagation";

const urlMatchesTracePropagationTarget = (
  targets: Array<string | RegExp>,
  url: string,
): boolean =>
  targets.some((target) => (typeof target === "string" ? url.includes(target) : target.test(url)));

describe("getSentryTracePropagationTargets", () => {
  it("matches local dev HTTP API URLs", () => {
    const targets = getSentryTracePropagationTargets();

    expect(urlMatchesTracePropagationTarget(targets, "http://127.0.0.1:8787/rooms")).toBe(true);
    expect(urlMatchesTracePropagationTarget(targets, "http://localhost:3000/health")).toBe(true);
  });

  it("matches deployed API Gateway URLs", () => {
    const targets = getSentryTracePropagationTargets();

    expect(
      urlMatchesTracePropagationTarget(
        targets,
        "https://abc123.execute-api.ca-central-1.amazonaws.com/rooms",
      ),
    ).toBe(true);
  });

  it("adds a custom API origin when the build config uses a non-AWS domain", () => {
    const targets = getSentryTracePropagationTargets("https://api.skipbo.example.com/v1");

    expect(targets).toContain("https://api.skipbo.example.com");
    expect(
      urlMatchesTracePropagationTarget(targets, "https://api.skipbo.example.com/rooms/join"),
    ).toBe(true);
  });
});
