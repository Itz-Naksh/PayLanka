/**
 * Reusable Zod field builders. Every form field arrives as a string (that's how
 * HTML forms work), so each builder parses a string into the stored type.
 * The same schemas run in the browser (instant feedback) and on the server
 * (the real check — browser validation can always be bypassed).
 */
import { z } from "zod";
import { parseMultiplierToBp, parsePercentToBp, parseRupees, type Cents } from "@/lib/money";

/** Largest amount we accept: Rs. 20,000,000.00 (fits safely in a Postgres Int). */
export const MAX_MONEY_CENTS = 2_000_000_000;

export const requiredText = (label: string, max = 100) =>
  z
    .string(`${label} is required`)
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

/** Optional text: empty string becomes null so the database stores NULL. */
export const optionalText = (label: string, max = 100) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .transform((value) => value || null);

/** Checkbox: browsers send "on" when ticked and nothing at all when not. */
export const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

/** Rupee amount typed by a user ("125,000.50") -> cents. */
export const money = (label: string, { allowZero = true } = {}) =>
  z
    .string(`${label} is required`)
    .trim()
    .min(1, `${label} is required`)
    .transform((value, ctx): Cents => {
      const cents = parseRupees(value);
      if (cents === null) {
        ctx.issues.push({ code: "custom", input: value, message: "Enter an amount such as 125000 or 125,000.50" });
        return z.NEVER;
      }
      if (cents < 0 || (!allowZero && cents === 0)) {
        ctx.issues.push({
          code: "custom",
          input: value,
          message: allowZero ? `${label} cannot be negative` : `${label} must be more than zero`,
        });
        return z.NEVER;
      }
      if (cents > MAX_MONEY_CENTS) {
        ctx.issues.push({ code: "custom", input: value, message: `${label} is too large` });
        return z.NEVER;
      }
      return cents;
    });

/** Percentage ("8", "12.5") -> basis points. */
export const percent = (label: string, maxPercent = 100) =>
  z
    .string(`${label} is required`)
    .trim()
    .transform((value, ctx) => {
      const bp = parsePercentToBp(value);
      if (bp === null || bp > maxPercent * 100) {
        ctx.issues.push({
          code: "custom",
          input: value,
          message: `Enter a percentage between 0 and ${maxPercent} (up to 2 decimals)`,
        });
        return z.NEVER;
      }
      return bp;
    });

/** Multiplier ("1.5") -> basis points (15000). */
export const multiplier = (label: string, min = 1, max = 5) =>
  z
    .string(`${label} is required`)
    .trim()
    .transform((value, ctx) => {
      const bp = parseMultiplierToBp(value);
      if (bp === null || bp < min * 10_000 || bp > max * 10_000) {
        ctx.issues.push({ code: "custom", input: value, message: `Enter a number between ${min} and ${max}` });
        return z.NEVER;
      }
      return bp;
    });

export const wholeNumber = (label: string, min: number, max: number) =>
  z
    .string(`${label} is required`)
    .trim()
    .regex(/^\d+$/, `${label} must be a whole number`)
    .transform(Number)
    .pipe(z.number().min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`));
