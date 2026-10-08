import { describe, expect, it } from "vitest";
import { reviewChecks, type ReviewLine } from "./review";

const line = (overrides: Partial<ReviewLine>): ReviewLine => ({
  employeeId: "e1",
  employeeNo: "EMP001",
  employeeName: "Nimal Perera",
  grossCents: 10_000_000,
  netCents: 9_000_000,
  otherDeductionsCents: 0,
  overtimeHundredths: 0,
  noPayDaysHundredths: 0,
  ...overrides,
});

describe("reviewChecks", () => {
  it("is quiet when nothing unusual happened", () => {
    expect(reviewChecks([line({})], [line({ netCents: 8_800_000 })], "September 2026")).toEqual([]);
  });

  it("flags a net pay change of 20% or more, either way", () => {
    const up = reviewChecks([line({ netCents: 11_000_000 })], [line({ netCents: 9_000_000 })], "September 2026");
    expect(up[0]).toMatchObject({ severity: "warning" });
    expect(up[0].message).toBe("Net pay up 22% vs September 2026 (Rs. 90,000.00 → Rs. 110,000.00)");

    const down = reviewChecks([line({ netCents: 7_000_000 })], [line({ netCents: 9_000_000 })], "September 2026");
    expect(down[0].message).toContain("Net pay down 22%");
  });

  it("does not flag a change just under the threshold", () => {
    expect(reviewChecks([line({ netCents: 10_790_000 })], [line({ netCents: 9_000_000 })], "Sep")).toEqual([]);
  });

  it("notes joiners and leavers", () => {
    const flags = reviewChecks(
      [line({ employeeId: "new", employeeNo: "EMP016", employeeName: "New Person" })],
      [line({ employeeId: "gone", employeeNo: "EMP012", employeeName: "Left Person" })],
      "September 2026",
    );
    expect(flags.map((f) => [f.employeeNo, f.severity])).toEqual([
      ["EMP012", "info"],
      ["EMP016", "info"],
    ]);
    expect(flags[0].message).toBe("Paid in September 2026 but not in this run");
  });

  it("flags negative pay and very large deductions as warnings, first", () => {
    const flags = reviewChecks(
      [line({ netCents: -100, otherDeductionsCents: 6_000_000, overtimeHundredths: 4_500 })],
      null,
      null,
    );
    expect(flags.map((f) => f.severity)).toEqual(["warning", "warning", "info"]);
    expect(flags[2].message).toBe("45 overtime hours");
  });

  it("mentions no-pay leave", () => {
    expect(reviewChecks([line({ noPayDaysHundredths: 150 })], null, null)[0].message).toBe("1.5 no-pay days");
    expect(reviewChecks([line({ noPayDaysHundredths: 100 })], null, null)[0].message).toBe("1 no-pay day");
  });

  it("skips month-on-month checks when there is no previous run", () => {
    expect(reviewChecks([line({ netCents: 1 })], null, null)).toEqual([]);
  });
});
