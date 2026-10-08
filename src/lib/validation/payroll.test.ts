import { describe, expect, it } from "vitest";
import { createRunSchema, itemInputsSchema, taxTableSchema } from "./payroll";

describe("itemInputsSchema", () => {
  it("converts hours and days to hundredths and amounts to cents", () => {
    const result = itemInputsSchema.parse({
      overtimeHours: "12.5",
      noPayDays: "0.5",
      extraAllowances: [{ label: "Bonus", amount: "5,000", epfLiable: "on" }],
      otherDeductions: [{ label: "Advance", amount: "2500.50" }],
    });
    expect(result).toEqual({
      overtimeHours: 1250,
      noPayDays: 50,
      extraAllowances: [{ label: "Bonus", amount: 500_000, epfLiable: true }],
      otherDeductions: [{ label: "Advance", amount: 250_050 }],
    });
  });

  it("treats empty fields as zero / none", () => {
    expect(itemInputsSchema.parse({ overtimeHours: "", noPayDays: "" })).toEqual({
      overtimeHours: 0,
      noPayDays: 0,
      extraAllowances: [],
      otherDeductions: [],
    });
  });

  it.each([
    ["overtimeHours", "301"],
    ["overtimeHours", "1.234"],
    ["overtimeHours", "-2"],
    ["noPayDays", "32"],
  ])("rejects %s = %s", (field, value) => {
    expect(itemInputsSchema.safeParse({ [field]: value }).success).toBe(false);
  });
});

describe("createRunSchema", () => {
  it("parses a month", () => {
    expect(createRunSchema.parse({ period: "2026-10" }).period).toEqual({ year: 2026, month: 10 });
  });

  it("rejects a bad month", () => {
    expect(createRunSchema.safeParse({ period: "2026-00" }).success).toBe(false);
  });
});

describe("taxTableSchema", () => {
  const base = { name: "Example", effectiveFrom: "2026-04-01" };

  it("accepts a valid ladder and converts units", () => {
    const result = taxTableSchema.parse({
      ...base,
      apitEnabled: "on",
      brackets: [
        { fromCents: "0", toCents: "100,000", rateBp: "0" },
        { fromCents: "100000", toCents: "", rateBp: "6" },
      ],
    });
    expect(result.brackets).toEqual([
      { fromCents: 0, toCents: 10_000_000, rateBp: 0 },
      { fromCents: 10_000_000, toCents: null, rateBp: 600 },
    ]);
  });

  it("rejects a broken ladder", () => {
    const result = taxTableSchema.safeParse({
      ...base,
      apitEnabled: "on",
      brackets: [
        { fromCents: "0", toCents: "100000", rateBp: "0" },
        { fromCents: "90000", toCents: "", rateBp: "6" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("requires brackets when APIT is switched on", () => {
    expect(taxTableSchema.safeParse({ ...base, apitEnabled: "on" }).success).toBe(false);
    expect(taxTableSchema.safeParse({ ...base }).success).toBe(true);
  });
});
