"use client";

import { CheckCheck, RefreshCw, Send, Trash2, Undo2 } from "lucide-react";
import { useActionState, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, TextareaField } from "@/components/ui/field";
import { idleState, type ActionState } from "@/lib/forms/action-state";
import { useValidatedAction } from "@/lib/forms/use-validated-action";
import { returnRunSchema } from "@/lib/validation/payroll";
import { approveRun, deleteDraft, refreshDraft, returnRun, submitRun } from "@/server/payroll/actions";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function ActionButton({
  runId,
  action,
  confirm,
  variant = "secondary",
  children,
  onResult,
}: {
  runId: string;
  action: Action;
  confirm: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  children: ReactNode;
  onResult: (state: ActionState) => void;
}) {
  const [, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const next = await action(prev, formData);
    onResult(next);
    return next;
  }, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="runId" value={runId} />
      <Button type="submit" variant={variant} disabled={pending} className="w-full sm:w-auto">
        {children}
      </Button>
    </form>
  );
}

export function RunActions({
  runId,
  period,
  status,
  canEdit,
  canSubmit,
  canApprove,
  approveBlockedReason,
}: {
  runId: string;
  period: string;
  status: "DRAFT" | "REVIEW" | "APPROVED";
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  approveBlockedReason: string | null;
}) {
  const [result, setResult] = useState<ActionState>(idleState);
  const [returning, setReturning] = useState(false);

  return (
    <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {status === "DRAFT" && canEdit ? (
          <>
            <ActionButton
              runId={runId}
              action={deleteDraft}
              variant="ghost"
              confirm={`Delete the ${period} draft? Everything entered for it will be lost.`}
              onResult={setResult}
            >
              <Trash2 className="size-4" aria-hidden /> Delete draft
            </ActionButton>
            <ActionButton
              runId={runId}
              action={refreshDraft}
              confirm="Refresh this draft with today's rates and employee details? Overtime, no-pay and other inputs you entered are kept."
              onResult={setResult}
            >
              <RefreshCw className="size-4" aria-hidden /> Refresh
            </ActionButton>
          </>
        ) : null}
        {status === "DRAFT" && canSubmit ? (
          <ActionButton
            runId={runId}
            action={submitRun}
            variant="primary"
            confirm={`Submit ${period} payroll for review? It can't be edited unless an Admin returns it.`}
            onResult={setResult}
          >
            <Send className="size-4" aria-hidden /> Submit for review
          </ActionButton>
        ) : null}
        {status === "REVIEW" && canApprove ? (
          <>
            <Button variant="secondary" onClick={() => setReturning((v) => !v)} aria-expanded={returning}>
              <Undo2 className="size-4" aria-hidden /> Return to draft
            </Button>
            {approveBlockedReason ? null : (
              <ActionButton
                runId={runId}
                action={approveRun}
                variant="primary"
                confirm={`Approve ${period} payroll? It will be locked permanently.`}
                onResult={setResult}
              >
                <CheckCheck className="size-4" aria-hidden /> Approve & lock
              </ActionButton>
            )}
          </>
        ) : null}
      </div>
      {status === "REVIEW" && canApprove && approveBlockedReason ? (
        <p className="max-w-sm text-sm text-muted sm:text-right">{approveBlockedReason}</p>
      ) : null}
      {/* Disappears by itself once the run is back in Draft. */}
      {status === "REVIEW" && returning ? <ReturnForm runId={runId} /> : null}
      <FormMessage status={result.status} message={result.message} />
    </div>
  );
}

function ReturnForm({ runId }: { runId: string }) {
  const { state, pending, onSubmit, error } = useValidatedAction(returnRunSchema, returnRun);

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-md space-y-3 rounded-lg bg-surface p-4 ring-1 ring-border">
      <input type="hidden" name="runId" value={runId} />
      <TextareaField
        label="What needs fixing?"
        name="note"
        error={error("note")}
        hint="The preparer will see this note on the draft."
      />
      <FormMessage status={state.status} message={state.message} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Returning…" : "Return with note"}
      </Button>
    </form>
  );
}
