"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import type { z } from "zod";
import { idleState, type ActionState } from "./action-state";
import { formDataToObject, zodFieldErrors, type FieldErrors } from "./form-data";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Wires a form to a server action with the same Zod schema on both sides.
 *
 * - Validates in the browser first, so the user sees errors instantly.
 * - Only then calls the server action, which validates AGAIN (the real check).
 * - Submits via onSubmit rather than <form action>, because React resets
 *   uncontrolled form fields after an action runs — a user would lose
 *   everything they typed just because one field was wrong.
 */
export function useValidatedAction<S extends z.ZodType>(schema: S, action: FormAction) {
  const [state, dispatch, pending] = useActionState(action, idleState);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = schema.safeParse(formDataToObject(formData));
    if (!result.success) {
      setClientErrors(zodFieldErrors(result.error));
      return;
    }
    setClientErrors(null);
    startTransition(() => dispatch(formData));
  }

  const fieldErrors = clientErrors ?? state.fieldErrors ?? {};
  const showClientSummary = clientErrors !== null;

  return {
    state: showClientSummary ? { status: "error" as const, message: "Please fix the highlighted fields." } : state,
    pending,
    onSubmit,
    /** First error message for a field, by dotted path ("allowances.0.amount"). */
    error: (path: string) => fieldErrors[path]?.[0],
  };
}
