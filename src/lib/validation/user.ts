import { z } from "zod";
import { checkbox, requiredText } from "./fields";

const ROLES = ["ADMIN", "HR", "EMPLOYEE"] as const;

export const passwordField = z
  .string("Password is required")
  .min(8, "Use at least 8 characters")
  .max(100, "Password is too long")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

const userFields = {
  name: requiredText("Name", 80),
  role: z.enum(ROLES, "Choose a role"),
  employeeId: z
    .string()
    .optional()
    .transform((v) => v || null),
};

/** An EMPLOYEE login must be linked to an employee record (to see their payslips). */
function requireEmployeeLink(data: { role: string; employeeId: string | null }, ctx: z.RefinementCtx) {
  if (data.role === "EMPLOYEE" && !data.employeeId) {
    ctx.addIssue({ code: "custom", path: ["employeeId"], message: "Link this login to an employee" });
  }
}

export const createUserSchema = z
  .object({
    ...userFields,
    email: z.email("Enter a valid email address").trim().toLowerCase(),
    password: passwordField,
  })
  .superRefine(requireEmployeeLink);

export const updateUserSchema = z
  .object({ ...userFields, isActive: checkbox })
  .superRefine(requireEmployeeLink);

export const resetPasswordSchema = z.object({ password: passwordField });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string("Enter your current password").min(1, "Enter your current password"),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the current one",
  });
