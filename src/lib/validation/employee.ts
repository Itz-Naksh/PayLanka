import { z } from "zod";
import { checkbox, money, optionalText, requiredText } from "./fields";
import { checkNic } from "./nic";

export const allowanceSchema = z.object({
  name: requiredText("Allowance name", 60),
  amount: money("Amount", { allowZero: false }),
  epfLiable: checkbox,
});

export const employeeSchema = z.object({
  employeeNo: requiredText("Employee number", 20)
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes only")
    .transform((v) => v.toUpperCase()),
  firstName: requiredText("First name", 60),
  lastName: requiredText("Last name", 60),
  nic: z
    .string("NIC is required")
    .transform((value, ctx) => {
      const result = checkNic(value);
      if (!result.valid) {
        ctx.issues.push({ code: "custom", input: value, message: `Invalid NIC: ${result.reason}` });
        return z.NEVER;
      }
      return result.normalized;
    }),
  epfNo: optionalText("EPF number", 20),
  departmentId: z.string("Choose a department").min(1, "Choose a department"),
  designation: requiredText("Designation", 80),
  joinDate: z
    .iso.date("Enter a valid date")
    .refine((d) => d >= "1950-01-01", "Join date looks too early"),
  bankName: requiredText("Bank name", 80),
  bankBranch: optionalText("Branch", 80),
  accountNo: requiredText("Account number", 30).regex(
    /^[0-9A-Za-z -]+$/,
    "Use digits, letters, spaces or dashes only",
  ),
  basicSalary: money("Basic salary", { allowZero: false }),
  allowances: z.array(allowanceSchema).max(20, "Up to 20 allowances").default([]),
});

export type EmployeeInput = z.output<typeof employeeSchema>;

export const departmentSchema = z.object({
  name: requiredText("Department name", 60),
});
