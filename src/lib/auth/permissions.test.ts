import { describe, expect, it } from "vitest";
import { canAccessPath, hasPermission, homePathFor, navItemsFor } from "./permissions";

describe("permissions", () => {
  it("only lets ADMIN approve payroll", () => {
    expect(hasPermission("ADMIN", "payroll:approve")).toBe(true);
    expect(hasPermission("HR", "payroll:approve")).toBe(false);
    expect(hasPermission("EMPLOYEE", "payroll:approve")).toBe(false);
  });

  it("guards routes by prefix", () => {
    expect(canAccessPath("HR", "/payroll/abc")).toBe(true);
    expect(canAccessPath("HR", "/settings/company")).toBe(false);
    expect(canAccessPath("EMPLOYEE", "/employees")).toBe(false);
    expect(canAccessPath("EMPLOYEE", "/my/payslips")).toBe(true);
    expect(canAccessPath("ADMIN", "/my/payslips")).toBe(false);
  });

  it("does not treat a similar-looking path as a match", () => {
    // "/payrollx" must not be governed by the "/payroll" rule.
    expect(canAccessPath("EMPLOYEE", "/payrollx")).toBe(true);
    expect(canAccessPath("EMPLOYEE", "/payroll")).toBe(false);
  });

  it("allows unlisted paths for any logged-in user", () => {
    expect(canAccessPath("EMPLOYEE", "/forbidden")).toBe(true);
  });

  it("sends each role to a sensible home page", () => {
    expect(homePathFor("ADMIN")).toBe("/dashboard");
    expect(homePathFor("EMPLOYEE")).toBe("/my/payslips");
  });

  it("filters navigation by role", () => {
    expect(navItemsFor("HR").map((i) => i.href)).not.toContain("/settings");
    expect(navItemsFor("EMPLOYEE").map((i) => i.href)).toEqual(["/my/payslips"]);
  });
});
