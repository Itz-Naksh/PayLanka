"use client";

import { CircleX } from "lucide-react";
import { useActionState, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { loginSchema } from "@/lib/validation/auth";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [clientErrors, setClientErrors] = useState<LoginState["fieldErrors"]>();

  // Same Zod schema as the server: instant feedback without a round trip.
  function validate(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({ email: data.get("email"), password: data.get("password") });
    if (!result.success) {
      event.preventDefault();
      setClientErrors(z.flattenError(result.error).fieldErrors);
    } else {
      setClientErrors(undefined);
    }
  }

  const errors = clientErrors ?? state.fieldErrors;

  return (
    <form action={formAction} onSubmit={validate} noValidate className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.lk"
        error={errors?.email?.[0]}
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        error={errors?.password?.[0]}
        required
      />
      {state.error ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-error-soft px-3 py-2 text-sm text-error ring-1 ring-error/30"
        >
          <CircleX className="size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
