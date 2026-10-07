import { describe, expect, it } from "vitest";
import {
  applyRateBp,
  centsToDecimalString,
  divideRounded,
  formatLKR,
  formatRateBp,
  parseRupees,
  sumCents,
} from "./money";

describe("divideRounded", () => {
  it("divides exactly when there is no remainder", () => {
    expect(divideRounded(100, 4)).toBe(25);
  });

  it("rounds half up", () => {
    expect(divideRounded(5, 2)).toBe(3); // 2.5 -> 3
    expect(divideRounded(7, 4)).toBe(2); // 1.75 -> 2
    expect(divideRounded(5, 4)).toBe(1); // 1.25 -> 1
  });

  it("rounds half away from zero for negatives", () => {
    expect(divideRounded(-5, 2)).toBe(-3);
    expect(divideRounded(-5, 4)).toBe(-1);
  });

  it("rejects division by zero and non-integers", () => {
    expect(() => divideRounded(1, 0)).toThrow(RangeError);
    expect(() => divideRounded(1.5, 2)).toThrow(RangeError);
  });
});

describe("applyRateBp", () => {
  it("calculates EPF 8% of Rs. 125,000.00", () => {
    expect(applyRateBp(12_500_000, 800)).toBe(1_000_000);
  });

  it("rounds fractional cents to the nearest cent", () => {
    // 3% of Rs. 333.33 = Rs. 9.9999 -> Rs. 10.00
    expect(applyRateBp(33_333, 300)).toBe(1_000);
    // 8% of Rs. 0.06 = 0.48 cents -> 0 cents
    expect(applyRateBp(6, 800)).toBe(0);
    // 12% of Rs. 0.25 = 3 cents exactly
    expect(applyRateBp(25, 1200)).toBe(3);
  });

  it("returns zero for a zero amount or zero rate", () => {
    expect(applyRateBp(0, 800)).toBe(0);
    expect(applyRateBp(12_500_000, 0)).toBe(0);
  });
});

describe("parseRupees", () => {
  it.each([
    ["125000", 12_500_000],
    ["125,000.00", 12_500_000],
    ["Rs. 1,250.5", 125_050],
    ["0.05", 5],
    ["  42  ", 4_200],
    ["-100.10", -10_010],
  ])("parses %s", (input, expected) => {
    expect(parseRupees(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "1.2.3", "12a", "."])("rejects %s", (input) => {
    expect(parseRupees(input)).toBeNull();
  });

  it("avoids floating-point drift", () => {
    // 0.1 + 0.2 style inputs must stay exact.
    expect(sumCents([parseRupees("0.10")!, parseRupees("0.20")!])).toBe(30);
  });
});

describe("formatting", () => {
  it("formats LKR with grouping and two decimals", () => {
    expect(formatLKR(12_500_000)).toBe("Rs. 125,000.00");
    expect(formatLKR(5)).toBe("Rs. 0.05");
    expect(formatLKR(0)).toBe("Rs. 0.00");
    expect(formatLKR(123_456_789)).toBe("Rs. 1,234,567.89");
    expect(formatLKR(-150_000)).toBe("-Rs. 1,500.00");
  });

  it("formats plain decimal strings", () => {
    expect(centsToDecimalString(12_500_050)).toBe("125000.50");
    expect(centsToDecimalString(-7)).toBe("-0.07");
  });

  it("formats rates", () => {
    expect(formatRateBp(800)).toBe("8%");
    expect(formatRateBp(1250)).toBe("12.5%");
    expect(formatRateBp(15000)).toBe("150%");
  });
});
