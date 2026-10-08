import { describe, expect, it } from "vitest";
import { buildPayslipData, maskAccount } from "./data";

describe("maskAccount", () => {
  it("keeps only the last four characters", () => {
    expect(maskAccount("DEMO-80021993")).toBe("****1993");
    expect(maskAccount("1234 5678 9012")).toBe("****9012");
  });

  it("leaves very short numbers alone", () => {
    expect(maskAccount("123")).toBe("123");
  });
});

describe("buildPayslipData", () => {
  const run = {
    year: 2026,
    month: 10,
    status: "APPROVED" as const,
    approvedAt: new Date("2026-10-26T06:00:00Z"),
    epfEmployeeRateBp: 800,
    epfEmployerRateBp: 1200,
    etfEmployerRateBp: 300,
  };
  const item = {
    employeeNo: "EMP003",
    employeeName: "Mohamed Rizwan",
    nic: "199803400003",
    epfNo: "1003",
    departmentName: "Finance",
    designation: "Accounts Executive",
    bankName: "Hatton National Bank",
    bankBranch: "Dehiwala",
    accountNo: "DEMO-80021993",
    basicCents: 8_500_000,
    overtimeHours: "10.00",
    noPayDays: "2.00",
    overtimeCents: 531_250,
    noPayCents: 566_667,
    grossCents: 9_814_583,
    epfLiableCents: 8_433_333,
    epfEmployeeCents: 674_667,
    epfEmployerCents: 1_012_000,
    etfEmployerCents: 253_000,
    apitCents: 0,
    totalDeductionsCents: 1_674_667,
    netCents: 8_139_916,
    lines: [
      { source: "FIXED_ALLOWANCE", label: "Cost of Living Allowance", amountCents: 500_000, epfLiable: true },
      { source: "FIXED_ALLOWANCE", label: "Budgetary Relief Allowance", amountCents: 350_000, epfLiable: false },
      { source: "EXTRA_ALLOWANCE", label: "Bonus", amountCents: 500_000, epfLiable: false },
      { source: "OTHER_DEDUCTION", label: "Salary advance", amountCents: 1_000_000, epfLiable: false },
    ],
  };
  const company = { name: "Demo Ltd", address: "Colombo", epfRegNo: "E/1", etfRegNo: "T/1" };
  const data = buildPayslipData(run, item, company, "Anura Admin", () => "26 Oct 2026");

  it("names the file after the employee and month", () => {
    expect(data.fileName).toBe("Payslip-EMP003-2026-10.pdf");
    expect(data.periodLabel).toBe("October 2026");
  });

  it("lists earnings with no-pay as a negative line", () => {
    expect(data.earnings.map((e) => [e.label, e.amountCents])).toEqual([
      ["Basic salary", 8_500_000],
      ["Cost of Living Allowance", 500_000],
      ["Budgetary Relief Allowance", 350_000],
      ["Bonus", 500_000],
      ["Overtime", 531_250],
      ["No-pay leave", -566_667],
    ]);
  });

  it("balances: earnings lines sum to gross, deductions to the total", () => {
    expect(data.earnings.reduce((s, e) => s + e.amountCents, 0)).toBe(data.grossCents);
    expect(data.deductions.reduce((s, e) => s + e.amountCents, 0)).toBe(data.totalDeductionsCents);
    expect(data.grossCents - data.totalDeductionsCents).toBe(data.netCents);
  });

  it("masks the bank account and writes net pay in words", () => {
    expect(data.employee.account).toBe("****1993");
    expect(data.netInWords).toBe("Rupees Eighty-one thousand three hundred and ninety-nine and sixteen cents only");
  });

  it("is final only when approved", () => {
    expect(data.final).toBe(true);
    expect(data.approval).toBe("Approved by Anura Admin on 26 Oct 2026");
    const draft = buildPayslipData({ ...run, status: "DRAFT", approvedAt: null }, item, company, null, () => "");
    expect(draft.final).toBe(false);
    expect(draft.approval).toBeNull();
  });
});
