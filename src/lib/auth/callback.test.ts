import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "./callback";

describe("safeCallbackPath", () => {
  it("keeps the page from a full same-site URL", () => {
    expect(safeCallbackPath("http://localhost:3000/reports/epf-etf")).toBe("/reports/epf-etf");
    expect(safeCallbackPath("https://paylanka.vercel.app/payroll/abc?x=1")).toBe("/payroll/abc?x=1");
  });

  it("keeps plain paths", () => {
    expect(safeCallbackPath("/employees")).toBe("/employees");
  });

  it.each([
    "https://evil.example/login",
    "//evil.example",
    "/\\evil.example",
    "///evil.example/path",
    "javascript:alert(1)",
  ])("never leaves the site for %s", (attack) => {
    const result = safeCallbackPath(attack);
    expect(result.startsWith("/")).toBe(true);
    expect(result.startsWith("//")).toBe(false);
    expect(result).not.toContain("evil.example/");
  });

  it("falls back to home for junk, the login page itself or API routes", () => {
    expect(safeCallbackPath(undefined)).toBe("/");
    expect(safeCallbackPath("")).toBe("/");
    expect(safeCallbackPath("/login")).toBe("/");
    expect(safeCallbackPath("/api/payslips/x")).toBe("/");
  });
});
