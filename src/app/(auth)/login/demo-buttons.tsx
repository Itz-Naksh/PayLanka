"use client";

import { ArrowRight, Calculator, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import { useActionState } from "react";
import { FormMessage } from "@/components/ui/field";
import { idleState } from "@/lib/forms/action-state";
import { demoLoginAction } from "./actions";

const ICONS: Record<string, LucideIcon> = { ADMIN: ShieldCheck, HR: Calculator, EMPLOYEE: UserRound };

export type DemoOption = { role: string; label: string; description: string };

/** One click = signed in as that demo role. The server re-checks DEMO_MODE. */
export function DemoButtons({ options }: { options: DemoOption[] }) {
  const [state, action, pending] = useActionState(demoLoginAction, idleState);

  return (
    <form action={action} className="space-y-2.5">
      {options.map((option) => {
        const Icon = ICONS[option.role] ?? UserRound;
        return (
          <button
            key={option.role}
            type="submit"
            name="role"
            value={option.role}
            disabled={pending}
            className="group flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition hover:border-primary/40 hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">Try as {option.label}</span>
              <span className="block truncate text-xs text-muted">{option.description}</span>
            </span>
            <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
          </button>
        );
      })}
      {pending ? <p className="text-center text-sm text-muted" role="status">Opening the demo…</p> : null}
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}
