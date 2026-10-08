import { describe, expect, it } from "vitest";
import { niceTicks } from "./payroll-cost-chart";

describe("niceTicks", () => {
  it("picks clean steps", () => {
    // Rs. 2.6M max -> 0, 1M, 2M, 3M (cents)
    expect(niceTicks(260_000_000)).toEqual([0, 100_000_000, 200_000_000, 300_000_000]);
    // Rs. 1.8M -> 500K steps
    expect(niceTicks(180_000_000)).toEqual([0, 50_000_000, 100_000_000, 150_000_000, 200_000_000]);
  });

  it("handles an empty chart", () => {
    expect(niceTicks(0)).toEqual([0]);
  });
});
