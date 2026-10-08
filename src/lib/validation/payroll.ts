import { z } from "zod";
import { parseScaledDecimal, parseRupees } from "@/lib/money";
import { parsePeriodKey } from "@/lib/payroll/period";
import { validateBrackets } from "@/lib/payroll/tax";
import { checkbox, money, percent, requiredText } from "./fields";

/** Hours or days such as "2.5" -> hundredths (250). Empty means 0. */
const quantity = (label: string, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((value, ctx) => {
      if (!value) return 0;
      const hundredths = parseScaledDecimal(value, 2);
      if (hundredths === null || hundredths > max * 100) {
        ctx.issues.push({
          code: "custom",
          input: value,
          message: `Enter ${label.toLowerCase()} between 0 and ${max} (up to 2 decimals)`,
        });
        return z.NEVER;
      }
      return hundredths;
    });

export const createRunSchema = z.object({
  period: z
    .string("Choose a month")
    .transform((value, ctx) => {
      const period = parsePeriodKey(value);
      if (!period) {
        ctx.issues.push({ code: "custom", input: value, message: "Choose a month" });
        return z.NEVER;
      }
      return period;
    }),
});

export const itemInputsSchema = z.object({
  overtimeHours: quantity("Overtime hours", 300),
  noPayDays: quantity("No-pay days", 31),
  extraAllowances: z
    .array(
      z.object({
        label: requiredText("Description", 60),
        amount: money("Amount", { allowZero: false }),
        epfLiable: checkbox,
      }),
    )
    .max(10, "Up to 10 extra allowances")
    .default([]),
  otherDeductions: z
    .array(
      z.object({
        label: requiredText("Description", 60),
        amount: money("Amount", { allowZero: false }),
      }),
    )
    .max(10, "Up to 10 deductions")
    .default([]),
});

export type ItemInputs = z.output<typeof itemInputsSchema>;

export const returnRunSchema = z.object({
  note: requiredText("Reason", 500).min(5, "Tell the preparer what needs fixing"),
});

/** Optional rupee amount: empty -> null (used for an open-ended upper limit). */
const optionalMoney = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const cents = parseRupees(value);
    if (cents === null || cents < 0) {
      ctx.issues.push({ code: "custom", input: value, message: "Enter an amount or leave empty" });
      return z.NEVER;
    }
    return cents;
  });

export const taxTableSchema = z
  .object({
    apitEnabled: checkbox,
    name: requiredText("Table name", 80),
    effectiveFrom: z.iso.date("Enter a valid date"),
    brackets: z
      .array(
        z.object({
          fromCents: money("From"),
          toCents: optionalMoney,
          rateBp: percent("Rate"),
        }),
      )
      .max(20, "Up to 20 brackets")
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (!data.apitEnabled && data.brackets.length === 0) return;
    for (const message of validateBrackets(data.brackets)) {
      ctx.addIssue({ code: "custom", path: ["brackets"], message });
    }
  });
