/**
 * Public demo support. When DEMO_MODE="true", visitors can try PayLanka with
 * one click (no email/password needed) using the seeded demo accounts, and
 * those accounts are blocked from actions that would spoil the demo for the
 * next visitor (changing passwords, managing users).
 *
 * Never enable DEMO_MODE for a real company: anyone could sign in as Admin.
 */
import type { Role } from "../generated/prisma/enums";

export const DEMO_PASSWORD = "Demo@1234";

export const DEMO_ACCOUNTS = [
  {
    role: "ADMIN",
    email: "admin@paylanka.test",
    name: "Anura Admin (demo)",
    label: "Admin",
    description: "Settings, users, approvals — everything",
  },
  {
    role: "HR",
    email: "hr@paylanka.test",
    name: "Harini HR (demo)",
    label: "HR / Accountant",
    description: "Employees, payroll runs and reports",
  },
  {
    role: "EMPLOYEE",
    email: "employee@paylanka.test",
    name: "",
    label: "Employee",
    description: "Your own payslips only",
  },
] as const satisfies ReadonlyArray<{ role: Role; email: string; name: string; label: string; description: string }>;

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export function isDemoAccount(email: string): boolean {
  return DEMO_ACCOUNTS.some((account) => account.email === email.toLowerCase());
}

export function demoAccountFor(role: string) {
  return DEMO_ACCOUNTS.find((account) => account.role === role);
}
