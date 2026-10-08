import { describe, expect, it } from "vitest";
import { parseStoredBrackets, validateBrackets } from "./tax";

const valid = [
  { fromCents: 0, toCents: 10_000_000, rateBp: 0 },
  { fromCents: 10_000_000, toCents: 15_000_000, rateBp: 600 },
  { fromCents: 15_000_000, toCents: null, rateBp: 1200 },
];

describe("validateBrackets", () => {
  it("accepts a continuous ladder", () => {
    expect(validateBrackets(valid)).toEqual([]);
  });

  it("accepts a single open-ended bracket", () => {
    expect(validateBrackets([{ fromCents: 0, toCents: null, rateBp: 500 }])).toEqual([]);
  });

  it("rejects an empty list", () => {
    expect(validateBrackets([])).toHaveLength(1);
  });

  it("requires the first bracket to start at zero", () => {
    expect(validateBrackets([{ ...valid[0], fromCents: 100 }, ...valid.slice(1)])).toContain(
      "The first bracket must start at 0",
    );
  });

  it("rejects gaps and overlaps", () => {
    const gap = [valid[0], { ...valid[1], fromCents: 11_000_000 }, valid[2]];
    expect(validateBrackets(gap)).toContain("Bracket 2 must start where bracket 1 ends");
  });

  it("requires only the last bracket to be open-ended", () => {
    expect(validateBrackets([valid[0], { ...valid[1], toCents: null }, valid[2]])).toContain(
      "Bracket 2 needs an upper limit",
    );
    expect(validateBrackets([valid[0], valid[1], { ...valid[2], toCents: 20_000_000 }])).toContain(
      "Leave the last bracket's upper limit empty (no limit)",
    );
  });

  it("rejects rates above 100%", () => {
    expect(validateBrackets([{ fromCents: 0, toCents: null, rateBp: 10_001 }])).toContain(
      "Bracket 1's rate must be 0–100%",
    );
  });
});

describe("parseStoredBrackets", () => {
  it("round-trips valid JSON", () => {
    expect(parseStoredBrackets(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });

  it("returns null for anything malformed", () => {
    expect(parseStoredBrackets(null)).toBeNull();
    expect(parseStoredBrackets([{ fromCents: "0", toCents: null, rateBp: 1 }])).toBeNull();
  });
});
