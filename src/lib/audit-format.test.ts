import { describe, expect, it } from "vitest";
import { actionTone, describeChanges, describeEntry, entityHref, formatValue } from "./audit-format";

describe("formatValue", () => {
  it("formats by field name", () => {
    expect(formatValue("basicSalaryCents", 8_500_000)).toBe("Rs. 85,000.00");
    expect(formatValue("etfEmployerRateBp", 350)).toBe("3.5%");
    expect(formatValue("otMultiplierBp", 15_000)).toBe("1.5×");
    expect(formatValue("isActive", false)).toBe("No");
    expect(formatValue("bankBranch", null)).toBe("—");
    expect(formatValue("departmentId", "cuid123")).toBe("changed");
  });

  it("summarises an allowance list", () => {
    expect(
      formatValue("allowances", [
        { name: "COLA", amountCents: 500_000, epfLiable: true },
        { name: "Transport", amountCents: 250_000, epfLiable: false },
      ]),
    ).toBe("COLA Rs. 5,000.00 (EPF), Transport Rs. 2,500.00");
    expect(formatValue("allowances", [])).toBe("none");
  });
});

describe("describeChanges", () => {
  it("lists before → after per field", () => {
    expect(
      describeChanges({
        employeeNo: "EMP003",
        changes: { basicSalaryCents: { from: 8_500_000, to: 9_000_000 }, designation: { from: "Clerk", to: "Officer" } },
      }),
    ).toEqual([
      { field: "Basic salary", from: "Rs. 85,000.00", to: "Rs. 90,000.00" },
      { field: "Designation", from: "Clerk", to: "Officer" },
    ]);
  });

  it("ignores entries without changes or with odd shapes", () => {
    expect(describeChanges(null)).toEqual([]);
    expect(describeChanges({ changes: "nope" })).toEqual([]);
    expect(describeChanges({ changes: { x: 5 } })).toEqual([]);
  });
});

describe("describeEntry", () => {
  it("summarises payroll events", () => {
    expect(describeEntry("PAYROLL_APPROVED", { period: "October 2026", employees: 14, grossCents: 100, netCents: 90 })).toBe(
      "October 2026 · 14 employees · gross Rs. 1.00 · net Rs. 0.90",
    );
    expect(
      describeEntry("PAYROLL_UPDATED", { employeeNo: "EMP003", overtimeHours: 10, noPayDays: 0, netCents: 9_161_250 }),
    ).toBe("EMP003 · OT 10 h · net Rs. 91,612.50");
    expect(describeEntry("PAYROLL_RETURNED", { period: "Oct", note: "Check OT" })).toBe("Oct · “Check OT”");
  });

  it("never throws on unexpected metadata", () => {
    expect(() => describeEntry("PAYROLL_CREATED", null)).not.toThrow();
    expect(() => describeEntry("PAYROLL_UPDATED", [1, 2])).not.toThrow();
    expect(describeEntry("SOMETHING_NEW", { a: 1 })).toBe("");
  });
});

describe("tones and links", () => {
  it("highlights approvals, returns and deletions", () => {
    expect(actionTone("PAYROLL_APPROVED")).toBe("success");
    expect(actionTone("PAYROLL_RETURNED")).toBe("warning");
    expect(actionTone("DEPARTMENT_DELETED")).toBe("error");
    expect(actionTone("EMPLOYEE_CREATED")).toBe("neutral");
  });

  it("links to the subject unless it was deleted", () => {
    expect(entityHref("PayrollRun", "r1", "PAYROLL_APPROVED")).toBe("/payroll/r1");
    expect(entityHref("PayrollRun", "r1", "PAYROLL_DELETED")).toBeNull();
    expect(entityHref("Mystery", "x", "X")).toBeNull();
  });
});
