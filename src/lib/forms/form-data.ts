import type { z } from "zod";

/**
 * Turn FormData into a plain object that a Zod schema can parse.
 * Supports bracket names for lists: `allowances[0][name]` becomes
 * `{ allowances: [{ name: ... }] }`.
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue; // file uploads aren't used in these forms
    const path = key.replace(/\]/g, "").split("[");
    let node: Record<string, unknown> | unknown[] = result;

    path.forEach((segment, index) => {
      const isLast = index === path.length - 1;
      const nextIsIndex = !isLast && /^\d+$/.test(path[index + 1]);
      const target = node as Record<string, unknown>;
      if (isLast) {
        target[segment] = value;
      } else {
        target[segment] ??= nextIsIndex ? [] : {};
        node = target[segment] as Record<string, unknown>;
      }
    });
  }

  // Remove gaps left by deleted list rows (e.g. indexes 0 and 2 only).
  for (const [key, value] of Object.entries(result)) {
    if (Array.isArray(value)) result[key] = value.filter((item) => item !== undefined);
  }
  return result;
}

export type FieldErrors = Record<string, string[]>;

/** Zod issues keyed by dotted path: "basicSalary", "allowances.0.amount". */
export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}
