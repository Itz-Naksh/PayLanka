import { describe, expect, it } from "vitest";
import { reportToCsv, escapeCsvCell } from "@/lib/csv";
import { bankTotals, bankTransferList, departmentCost, epfEtfReport, payrollSummary } from "./build";
import type { ReportItem } from "./types";

const RATES = { epfEmployeeRateBp: 800, epfEmployerRateBp: 1200, etfEmployerRateBp: 300 };

function item(overrides: Partial<ReportItem>): ReportItem {
  return {
    employeeNo: "EMP001",
    employeeName: "Nimal Perera",
    nic: "198512300001",
    epfNo: "1001",
    departmentName: "Finance",
    designation: "Manager",
    bankName: "Commercial Bank",
    bankBranch: "Colombo 03",
    accountNo: "8000123",
    basicCents: 10_000_000,
    fixedAllowancesCents: 500_000,
    extraAllowancesCents: 0,
    overtimeCents: 0,
    noPayCents: 0,
    grossCents: 10_500_000,
    epfLiableCents: 10_000_000,
    epfEmployeeCents: 800_000,
    epfEmployerCents: 1_200_000,
    etfEmployerCents: 300_000,
    apitCents: 0,
    otherDeductionsCents: 0,
    totalDeductionsCents: 800_000,
    netCents: 9_700_000,
    ...overrides,
  };
}

const ITEMS = [
  item({}),
  item({
    employeeNo: "EMP002",
    employeeName: "Kasun Silva",
    epfNo: "1002",
    departmentName: "Sales",
    bankName: "Bank of Ceylon",
    grossCents: 5_000_000,
    epfLiableCents: 5_000_000,
    epfEmployeeCents: 400_000,
    epfEmployerCents: 600_000,
    etfEmployerCents: 150_000,
    netCents: 4_600_000,
  }),
  item({ employeeNo: "EMP003", employeeName: "Ama Fernando", epfNo: "1010", bankName: "Bank of Ceylon" }),
];

describe("payrollSummary", () => {
  const report = payrollSummary(ITEMS, RATES);

  it("shows no-pay as a negative amount and totals every money column", () => {
    expect(report.totals?.employeeNo).toBe("Total");
    expect(report.totals?.gross).toBe(10_500_000 * 2 + 5_000_000);
    expect(report.totals?.net).toBe(9_700_000 * 2 + 4_600_000);
  });

  it("labels columns with the run's own rates", () => {
    expect(report.columns.map((c) => c.label)).toContain("EPF 8%");
  });

  it("computes employer cost per row", () => {
    expect(report.rows[0].employerCost).toBe(10_500_000 + 1_200_000 + 300_000);
  });
});

describe("epfEtfReport", () => {
  const report = epfEtfReport(ITEMS, RATES);

  it("sorts members by EPF number numerically", () => {
    expect(report.rows.map((r) => r.epfNo)).toEqual(["1001", "1002", "1010"]);
  });

  it("adds employee and employer EPF into the total EPF payable", () => {
    expect(report.rows[0].epfTotal).toBe(2_000_000);
    expect(report.totals?.epfTotal).toBe(2_000_000 * 2 + 1_000_000);
    expect(report.totals?.etf).toBe(300_000 * 2 + 150_000);
  });
});

describe("departmentCost", () => {
  const report = departmentCost(ITEMS);

  it("groups by department, biggest cost first", () => {
    expect(report.rows.map((r) => [r.department, r.employees])).toEqual([
      ["Finance", 2],
      ["Sales", 1],
    ]);
  });

  it("gives each department's share in basis points, summing to 100%", () => {
    const finance = 2 * (10_500_000 + 1_500_000);
    const sales = 5_000_000 + 750_000;
    expect(report.rows[0].share).toBe(Math.round((finance * 10_000) / (finance + sales)));
    expect(report.totals?.share).toBe(10_000);
    expect(report.totals?.employees).toBe(3);
  });
});

describe("bank transfer list", () => {
  it("groups rows by bank and keeps full account numbers for the bank", () => {
    const report = bankTransferList(ITEMS);
    expect(report.rows.map((r) => r.bank)).toEqual(["Bank of Ceylon", "Bank of Ceylon", "Commercial Bank"]);
    expect(report.rows[2].accountNo).toBe("8000123");
    expect(report.totals?.net).toBe(9_700_000 * 2 + 4_600_000);
  });

  it("subtotals per bank", () => {
    expect(bankTotals(ITEMS)).toEqual([
      { bank: "Bank of Ceylon", transfers: 2, amountCents: 14_300_000 },
      { bank: "Commercial Bank", transfers: 1, amountCents: 9_700_000 },
    ]);
  });
});

describe("CSV export", () => {
  it("escapes commas, quotes and newlines", () => {
    expect(escapeCsvCell("plain")).toBe("plain");
    expect(escapeCsvCell("Colombo, 03")).toBe('"Colombo, 03"');
    expect(escapeCsvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(escapeCsvCell("two\nlines")).toBe('"two\nlines"');
  });

  it("writes amounts as plain decimals with a BOM and CRLF", () => {
    const csv = reportToCsv(bankTransferList([ITEMS[0]]));
    expect(csv.startsWith("﻿Bank,Branch,Account no.,Employee no.,Account holder,Amount\r\n")).toBe(true);
    expect(csv).toContain("Commercial Bank,Colombo 03,8000123,EMP001,Nimal Perera,97000.00\r\n");
    expect(csv.trimEnd().split("\r\n").at(-1)).toBe("Total,,,,,97000.00");
  });

  it("neutralises spreadsheet formulas in text cells", () => {
    const csv = reportToCsv(bankTransferList([item({ employeeName: "=HYPERLINK(\"http://x\")" })]));
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
  });

  it("keeps negative money as a number (no formula prefix)", () => {
    const csv = reportToCsv(payrollSummary([item({ noPayCents: 12_345 })], RATES));
    expect(csv).toContain(",-123.45,");
  });
});
