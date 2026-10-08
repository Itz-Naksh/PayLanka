import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, fromDateInputValue, toDateInputValue } from "./format";

describe("dates", () => {
  it("formats calendar dates with three-letter months", () => {
    expect(formatDate(new Date("2026-09-26T00:00:00Z"))).toBe("26 Sep 2026");
    expect(formatDate(new Date("2024-01-08T00:00:00Z"))).toBe("8 Jan 2024");
  });

  it("shows timestamps in Sri Lanka time (UTC+5:30)", () => {
    expect(formatDateTime(new Date("2026-09-26T07:00:00Z"))).toBe("26 Sep 2026, 12:30");
    expect(formatDateTime(new Date("2026-10-31T20:00:00Z"))).toBe("1 Nov 2026, 01:30");
  });

  it("round-trips date inputs", () => {
    expect(toDateInputValue(fromDateInputValue("2026-02-28"))).toBe("2026-02-28");
  });
});
