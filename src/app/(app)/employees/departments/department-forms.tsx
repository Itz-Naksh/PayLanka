"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { controlClasses, FormMessage } from "@/components/ui/field";
import { idleState } from "@/lib/forms/action-state";
import { useValidatedAction } from "@/lib/forms/use-validated-action";
import { departmentSchema } from "@/lib/validation/employee";
import { createDepartment, deleteDepartment, renameDepartment } from "@/server/employees/actions";

export function AddDepartmentForm() {
  const { state, pending, onSubmit, error } = useValidatedAction(departmentSchema, createDepartment);
  const formRef = useRef<HTMLFormElement>(null);
  const nameError = error("name");

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="space-y-2"
    >
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">New department name</span>
          <input
            name="name"
            placeholder="New department name"
            aria-invalid={nameError ? true : undefined}
            className={`${controlClasses(nameError)} h-10`}
          />
        </label>
        <Button type="submit" disabled={pending}>
          <Plus className="size-4" aria-hidden />
          Add
        </Button>
      </div>
      {nameError ? <p className="text-sm text-error">{nameError}</p> : null}
      {state.status === "success" ? <FormMessage status={state.status} message={state.message} /> : null}
    </form>
  );
}

export function DepartmentRow({ id, name, activeCount }: { id: string; name: string; activeCount: number }) {
  const rename = useValidatedAction(departmentSchema, renameDepartment);
  const [deleteState, deleteAction, deleting] = useActionState(deleteDepartment, idleState);
  const nameError = rename.error("name");

  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(`Delete the “${name}” department?`)) event.preventDefault();
  }

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={rename.onSubmit} noValidate className="flex flex-1 gap-2">
          <input type="hidden" name="id" value={id} />
          <label className="flex-1">
            <span className="sr-only">Department name</span>
            <input
              name="name"
              defaultValue={name}
              aria-invalid={nameError ? true : undefined}
              className={`${controlClasses(nameError)} h-9`}
            />
          </label>
          <Button type="submit" variant="secondary" size="sm" className="h-9" disabled={rename.pending}>
            Rename
          </Button>
        </form>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-sm whitespace-nowrap text-muted">
            {activeCount} active {activeCount === 1 ? "employee" : "employees"}
          </span>
          <form action={deleteAction} onSubmit={confirmDelete}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="ghost" size="sm" disabled={deleting} aria-label={`Delete ${name}`}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </form>
        </div>
      </div>
      {nameError ? <p className="text-sm text-error">{nameError}</p> : null}
      <FormMessage status={rename.state.status} message={rename.state.message} />
      <FormMessage status={deleteState.status} message={deleteState.message} />
    </li>
  );
}
