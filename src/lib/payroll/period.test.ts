import { describe, expect, it } from "vitest";
import { addMonths, currentPeriod, lastDayOfPeriod, parsePeriodKey, periodKey, periodLabel, taxYearOf } from "./period";

describe("periods", () => {
  it("formats and parses month keys", () => {
    expect(periodKey({ year: 2026, month: 3 })).toBe("2026-03");
    expect(parsePeriodKey("2026-03")).toEqual({ year: 2026, month: 3 });
    expect(parsePeriodKey("2026-13")).toBeNull();
    expect(parsePeriodKey("March")).toBeNull();
  });

  it("labels months for people", () => {
    expect(periodLabel({ year: 2026, month: 10 })).toBe("October 2026");
  });

  it("adds months across year boundaries", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 10 }, -11)).toEqual({ year: 2025, month: 11 });
  });

  it("finds the last day of the month, including leap years", () => {
    expect(lastDayOfPeriod({ year: 2028, month: 2 }).toISOString().slice(0, 10)).toBe("2028-02-29");
    expect(lastDayOfPeriod({ year: 2026, month: 4 }).toISOString().slice(0, 10)).toBe("2026-04-30");
  });

  it("uses Sri Lanka time for the current month", () => {
    // 31 Oct 2026 20:00 UTC is already 1 Nov 2026 01:30 in Colombo (UTC+5:30).
    expect(currentPeriod(new Date("2026-10-31T20:00:00Z"))).toEqual({ year: 2026, month: 11 });
  });

  it("finds the April–March tax year", () => {
    expect(taxYearOf({ year: 2026, month: 10 }).label).toBe("2026/27");
    expect(taxYearOf({ year: 2026, month: 3 }).label).toBe("2025/26");
    expect(taxYearOf({ year: 2026, month: 4 })).toMatchObject({ first: { year: 2026, month: 4 }, last: { year: 2027, month: 3 } });
    expect(taxYearOf({ year: 2099, month: 12 }).label).toBe("2099/00");
  });
});
