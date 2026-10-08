import type { z } from "zod";
import { formDataToObject, zodFieldErrors, type FieldErrors } from "./form-data";

/** What every form server action returns to its form. */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors;
};

export const idleState: ActionState = { status: "idle" };

export function errorState(message: string, fieldErrors?: FieldErrors): ActionState {
  return { status: "error", message, fieldErrors };
}

export function successState(message: string): ActionState {
  return { status: "success", message };
}

/** Server-side: FormData -> validated data, or an error state for the form. */
export function parseFormData<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { ok: true; data: z.output<S> } | { ok: false; state: ActionState } {
  const result = schema.safeParse(formDataToObject(formData));
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    state: errorState("Please fix the highlighted fields.", zodFieldErrors(result.error)),
  };
}
