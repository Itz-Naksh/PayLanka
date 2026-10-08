"use client";

import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { useValidatedAction } from "@/lib/forms/use-validated-action";
import { changePasswordSchema } from "@/lib/validation/user";
import { changeOwnPassword } from "@/server/account/actions";

export function ChangePasswordForm() {
  const { state, pending, onSubmit, error } = useValidatedAction(changePasswordSchema, changeOwnPassword);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        error={error("currentPassword")}
      />
      <Field
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        error={error("newPassword")}
        hint="At least 8 characters with a letter and a number."
      />
      <Field
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        error={error("confirmPassword")}
      />
      <FormMessage status={state.status} message={state.message} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
