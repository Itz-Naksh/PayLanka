"use client";

import { UserCheck, UserX } from "lucide-react";
import { useActionState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { idleState } from "@/lib/forms/action-state";
import { setEmployeeStatus } from "@/server/employees/actions";

export function StatusToggle({ employeeId, active, name }: { employeeId: string; active: boolean; name: string }) {
  const [state, action, pending] = useActionState(setEmployeeStatus, idleState);

  function confirmChange(event: FormEvent<HTMLFormElement>) {
    const message = active
      ? `Deactivate ${name}? They will be left out of new payroll runs and lose system access.`
      : `Reactivate ${name}? They will be included in the next payroll run.`;
    if (!window.confirm(message)) event.preventDefault();
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <form action={action} onSubmit={confirmChange}>
        <input type="hidden" name="id" value={employeeId} />
        <input type="hidden" name="status" value={active ? "INACTIVE" : "ACTIVE"} />
        <Button type="submit" variant={active ? "secondary" : "primary"} disabled={pending}>
          {active ? <UserX className="size-4" aria-hidden /> : <UserCheck className="size-4" aria-hidden />}
          {active ? "Deactivate" : "Reactivate"}
        </Button>
      </form>
      <FormMessage status={state.status} message={state.message} />
    </div>
  );
}
