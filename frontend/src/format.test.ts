import { describe, expect, it } from "vitest";
import { formatRuntime, prettyJson } from "./format";

describe("formatRuntime", () => {
  it("formats short runs", () => {
    expect(formatRuntime(65)).toBe("1m 5s");
  });

  it("formats very long runs", () => {
    expect(formatRuntime(540000)).toBe("6d 6h 0m 0s");
  });
});

describe("prettyJson", () => {
  it("renders runtime details as formatted JSON", () => {
    expect(prettyJson({ success: true, world: 307 })).toContain('"world": 307');
  });
});
