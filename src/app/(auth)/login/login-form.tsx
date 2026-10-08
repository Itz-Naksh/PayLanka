"use client";

import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { useValidatedAction } from "@/lib/forms/use-validated-action";
import { loginSchema } from "@/lib/validation/auth";
import { loginAction } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  // Same Zod schema as the server: instant feedback without a round trip.
  const { state, pending, onSubmit, error } = useValidatedAction(loginSchema, loginAction);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.lk"
        error={error("email")}
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={error("password")}
        required
      />
      {state.status === "error" && state.message !== "Please fix the highlighted fields." ? (
        <FormMessage status="error" message={state.message} />
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
