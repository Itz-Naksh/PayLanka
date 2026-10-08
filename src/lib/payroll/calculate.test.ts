import { describe, expect, it } from "vitest";
import { calculatePayroll, noPayDeduction, overtimePay, progressiveTax } from "./calculate";
import type { PayrollInput, PayrollRates, TaxBracket } from "./types";

// All amounts are cents: 8_500_000 = Rs. 85,000.00
const DEFAULT_RATES: PayrollRates = {
  epfEmployeeRateBp: 800,
  epfEmployerRateBp: 1200,
  etfEmployerRateBp: 300,
  otHourlyDivisor: 240,
  otMultiplierBp: 15_000,
  noPayDayDivisor: 30,
};

/** An accounts executive: basic 85,000 + COLA 5,000 (EPF-liable) + BRA 3,500 (not liable). */
function employee(overrides: Partial<PayrollInput> = {}): PayrollInput {
  return {
    basicCents: 8_500_000,
    fixedAllowances: [
      { label: "Cost of Living Allowance", amountCents: 500_000, epfLiable: true },
      { label: "Budgetary Relief Allowance", amountCents: 350_000, epfLiable: false },
    ],
    extraAllowances: [],
    overtimeHundredths: 0,
    noPayDaysHundredths: 0,
    otherDeductions: [],
    ...overrides,
  };
}

const calc = (input: PayrollInput, rates = DEFAULT_RATES, apitBrackets?: TaxBracket[] | null) =>
  calculatePayroll(input, { rates, apitBrackets });

describe("a normal month (no overtime, no leave)", () => {
  const r = calc(employee());

  it("adds basic and fixed allowances into gross pay", () => {
    expect(r.fixedAllowancesCents).toBe(850_000);
    expect(r.grossCents).toBe(9_350_000); // 85,000 + 8,500
  });

  it("only counts EPF-liable allowances towards EPF/ETF", () => {
    expect(r.epfLiableCents).toBe(9_000_000); // 85,000 + 5,000 COLA (BRA excluded)
  });

  it("applies EPF 8% / 12% and ETF 3% to EPF-liable earnings", () => {
    expect(r.epfEmployeeCents).toBe(720_000); // 7,200.00
    expect(r.epfEmployerCents).toBe(1_080_000); // 10,800.00
    expect(r.etfEmployerCents).toBe(270_000); // 2,700.00
  });

  it("deducts only the employee's EPF share from pay", () => {
    expect(r.totalDeductionsCents).toBe(720_000);
    expect(r.netCents).toBe(8_630_000); // 93,500 - 7,200
  });

  it("reports the employer's total cost", () => {
    expect(r.employerCostCents).toBe(10_700_000); // 93,500 + 10,800 + 2,700
  });

  it("has no warnings and no tax", () => {
    expect(r.warnings).toEqual([]);
    expect(r.apitCents).toBe(0);
  });
});

describe("overtime", () => {
  it("pays basic ÷ 240 × 1.5 per hour", () => {
    // 85,000 / 240 × 1.5 × 10 = 5,312.50
    expect(overtimePay(8_500_000, 1_000, DEFAULT_RATES)).toBe(531_250);
  });

  it("rounds fractional hours to the nearest cent (half up)", () => {
    // 85,000 / 240 × 1.5 × 2.5 = 1,328.125 -> 1,328.13
    expect(overtimePay(8_500_000, 250, DEFAULT_RATES)).toBe(132_813);
  });

  it("is added to gross pay but is NOT EPF/ETF liable", () => {
    const r = calc(employee({ overtimeHundredths: 1_000 }));
    expect(r.overtimeCents).toBe(531_250);
    expect(r.grossCents).toBe(9_350_000 + 531_250);
    expect(r.epfLiableCents).toBe(9_000_000); // unchanged by overtime
    expect(r.epfEmployeeCents).toBe(720_000);
  });

  it("follows a custom divisor and multiplier", () => {
    const rates = { ...DEFAULT_RATES, otHourlyDivisor: 200, otMultiplierBp: 20_000 };
    // 100,000 / 200 × 2 × 3 = 3,000
    expect(overtimePay(10_000_000, 300, rates)).toBe(300_000);
  });

  it("handles large salaries without overflowing", () => {
    // Rs. 20,000,000 basic, 300 OT hours: 20,000,000 / 240 × 1.5 × 300 = 37,500,000
    expect(overtimePay(2_000_000_000, 30_000, DEFAULT_RATES)).toBe(3_750_000_000);
  });
});

describe("no-pay leave", () => {
  it("deducts basic ÷ 30 per day, rounded to the cent", () => {
    // 85,000 / 30 × 2 = 5,666.666… -> 5,666.67
    expect(noPayDeduction(8_500_000, 200, DEFAULT_RATES)).toBe(566_667);
  });

  it("supports half days", () => {
    // 85,000 / 30 × 0.5 = 1,416.666… -> 1,416.67
    expect(noPayDeduction(8_500_000, 50, DEFAULT_RATES)).toBe(141_667);
  });

  it("reduces both gross pay and EPF-liable earnings", () => {
    const r = calc(employee({ noPayDaysHundredths: 200 }));
    expect(r.noPayCents).toBe(566_667);
    expect(r.grossCents).toBe(9_350_000 - 566_667); // 87,833.33
    expect(r.epfLiableCents).toBe(9_000_000 - 566_667); // 84,333.33
    expect(r.epfEmployeeCents).toBe(674_667); // 6,746.6664 -> 6,746.67
    expect(r.epfEmployerCents).toBe(1_012_000); // 10,119.9996 -> 10,120.00
    expect(r.etfEmployerCents).toBe(253_000); // 2,529.9999 -> 2,530.00
  });

  it("follows a working-days divisor (26)", () => {
    // 52,000 / 26 × 1 = 2,000
    expect(noPayDeduction(5_200_000, 100, { ...DEFAULT_RATES, noPayDayDivisor: 26 })).toBe(200_000);
  });

  it("never deducts more than the basic salary", () => {
    const r = calc(employee({ noPayDaysHundredths: 3_100 })); // 31 days with a 30-day divisor
    expect(r.noPayCents).toBe(8_500_000);
    expect(r.warnings).toContain("NO_PAY_EXCEEDS_BASIC");
    expect(r.grossCents).toBe(850_000); // allowances only
    expect(r.epfLiableCents).toBe(500_000); // only the EPF-liable COLA remains
  });
});

describe("allowances and deductions", () => {
  it("works with zero allowances", () => {
    const r = calc(employee({ basicCents: 5_000_000, fixedAllowances: [] }));
    expect(r.grossCents).toBe(5_000_000);
    expect(r.epfLiableCents).toBe(5_000_000);
    expect(r.epfEmployeeCents).toBe(400_000);
    expect(r.netCents).toBe(4_600_000);
  });

  it("adds extra allowances, respecting their EPF-liable flag", () => {
    const r = calc(
      employee({
        extraAllowances: [
          { label: "Attendance incentive", amountCents: 200_000, epfLiable: true },
          { label: "Festival bonus", amountCents: 1_000_000, epfLiable: false },
        ],
      }),
    );
    expect(r.extraAllowancesCents).toBe(1_200_000);
    expect(r.grossCents).toBe(9_350_000 + 1_200_000);
    expect(r.epfLiableCents).toBe(9_000_000 + 200_000);
  });

  it("subtracts other deductions (advance, loan) from net pay only", () => {
    const r = calc(
      employee({
        otherDeductions: [
          { label: "Salary advance", amountCents: 1_000_000 },
          { label: "Staff loan", amountCents: 250_050 },
        ],
      }),
    );
    expect(r.otherDeductionsCents).toBe(1_250_050);
    expect(r.epfEmployeeCents).toBe(720_000); // EPF unaffected
    expect(r.totalDeductionsCents).toBe(720_000 + 1_250_050);
    expect(r.netCents).toBe(9_350_000 - 720_000 - 1_250_050);
  });

  it("flags negative net pay instead of hiding it", () => {
    const r = calc(employee({ otherDeductions: [{ label: "Loan", amountCents: 10_000_000 }] }));
    expect(r.netCents).toBeLessThan(0);
    expect(r.warnings).toContain("NET_PAY_NEGATIVE");
  });

  it("returns all zeros for a zero salary", () => {
    const r = calc(employee({ basicCents: 0, fixedAllowances: [] }));
    expect(r.grossCents).toBe(0);
    expect(r.epfEmployeeCents).toBe(0);
    expect(r.netCents).toBe(0);
  });
});

describe("rounding", () => {
  it("rounds each contribution to the nearest cent", () => {
    // EPF-liable Rs. 33,333.33
    const r = calc(employee({ basicCents: 3_333_333, fixedAllowances: [] }));
    expect(r.epfEmployeeCents).toBe(266_667); // 2,666.6664
    expect(r.epfEmployerCents).toBe(400_000); // 3,999.9996
    expect(r.etfEmployerCents).toBe(100_000); // 999.9999
  });

  it("keeps the payslip arithmetic exact: gross − deductions = net", () => {
    const r = calc(
      employee({
        overtimeHundredths: 733,
        noPayDaysHundredths: 150,
        extraAllowances: [{ label: "Bonus", amountCents: 123_457, epfLiable: true }],
        otherDeductions: [{ label: "Advance", amountCents: 99_999 }],
      }),
    );
    expect(r.basicCents + r.fixedAllowancesCents + r.extraAllowancesCents + r.overtimeCents - r.noPayCents).toBe(
      r.grossCents,
    );
    expect(r.epfEmployeeCents + r.apitCents + r.otherDeductionsCents).toBe(r.totalDeductionsCents);
    expect(r.grossCents - r.totalDeductionsCents).toBe(r.netCents);
    for (const value of Object.values(r).filter((v) => typeof v === "number")) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe("configurable rates", () => {
  it("uses whatever EPF/ETF rates the run was created with", () => {
    const rates = { ...DEFAULT_RATES, epfEmployeeRateBp: 1000, epfEmployerRateBp: 1500, etfEmployerRateBp: 350 };
    const r = calc(employee(), rates);
    expect(r.epfEmployeeCents).toBe(900_000); // 10% of 90,000
    expect(r.epfEmployerCents).toBe(1_350_000); // 15%
    expect(r.etfEmployerCents).toBe(315_000); // 3.5%
  });
});

describe("APIT hook (example brackets only — not real tax rates)", () => {
  const EXAMPLE_BRACKETS: TaxBracket[] = [
    { fromCents: 0, toCents: 10_000_000, rateBp: 0 },
    { fromCents: 10_000_000, toCents: 15_000_000, rateBp: 1000 },
    { fromCents: 15_000_000, toCents: null, rateBp: 2000 },
  ];

  it("taxes each slice of income at its own rate", () => {
    // 0 on the first 100k, 10% of the next 50k, 20% of the remaining 50k
    expect(progressiveTax(20_000_000, EXAMPLE_BRACKETS)).toBe(1_500_000);
  });

  it("charges nothing below the first taxable bracket", () => {
    expect(progressiveTax(9_999_999, EXAMPLE_BRACKETS)).toBe(0);
  });

  it("rounds the tax to the nearest cent", () => {
    // 10% of 5 cents = 0.5 cent -> 1 cent
    expect(progressiveTax(10_000_005, EXAMPLE_BRACKETS)).toBe(1);
  });

  it("does not depend on the order brackets are listed in", () => {
    expect(progressiveTax(20_000_000, [...EXAMPLE_BRACKETS].reverse())).toBe(1_500_000);
  });

  it("is deducted from net pay when brackets are supplied", () => {
    const r = calc(employee({ basicCents: 19_150_000 }), DEFAULT_RATES, EXAMPLE_BRACKETS);
    expect(r.grossCents).toBe(20_000_000);
    expect(r.apitCents).toBe(1_500_000);
    expect(r.totalDeductionsCents).toBe(r.epfEmployeeCents + 1_500_000);
  });

  it("is skipped entirely when no brackets are configured", () => {
    expect(calc(employee({ basicCents: 19_150_000 }), DEFAULT_RATES, null).apitCents).toBe(0);
    expect(calc(employee({ basicCents: 19_150_000 }), DEFAULT_RATES, []).apitCents).toBe(0);
  });
});

describe("input validation", () => {
  it.each([
    ["negative basic", employee({ basicCents: -1 })],
    ["fractional cents", employee({ basicCents: 100.5 })],
    ["negative overtime", employee({ overtimeHundredths: -100 })],
    ["negative allowance", employee({ extraAllowances: [{ label: "X", amountCents: -5, epfLiable: false }] })],
  ])("rejects %s", (_, input) => {
    expect(() => calc(input)).toThrow(RangeError);
  });

  it("rejects a zero divisor", () => {
    expect(() => calc(employee(), { ...DEFAULT_RATES, otHourlyDivisor: 0 })).toThrow(RangeError);
    expect(() => calc(employee(), { ...DEFAULT_RATES, noPayDayDivisor: 0 })).toThrow(RangeError);
  });
});
