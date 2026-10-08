"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, FormMessage, SelectField } from "@/components/ui/field";
import { useValidatedAction } from "@/lib/forms/use-validated-action";
import { createUserSchema, resetPasswordSchema, updateUserSchema } from "@/lib/validation/user";
import { createUser, resetUserPassword, updateUser } from "@/server/users/actions";

export type EmployeeOption = { id: string; label: string };

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin — everything, including settings and approvals" },
  { value: "HR", label: "HR / Accountant — employees, payroll, reports" },
  { value: "EMPLOYEE", label: "Employee — own payslips only" },
];

function RoleAndLink({
  role,
  employeeId,
  employees,
  error,
  disabledRole,
}: {
  role: string;
  employeeId: string;
  employees: EmployeeOption[];
  error: (path: string) => string | undefined;
  disabledRole?: boolean;
}) {
  return (
    <>
      <SelectField
        label="Role"
        name="role"
        defaultValue={role}
        error={error("role")}
        disabled={disabledRole}
        hint={disabledRole ? "You can't change your own role." : undefined}
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </SelectField>
      {/* A disabled select isn't submitted, so send the value separately. */}
      {disabledRole ? <input type="hidden" name="role" value={role} /> : null}
      <SelectField
        label="Linked employee"
        name="employeeId"
        defaultValue={employeeId}
        error={error("employeeId")}
        hint="Required for Employee logins (to show their payslips)."
      >
        <option value="">Not linked</option>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.label}
          </option>
        ))}
      </SelectField>
    </>
  );
}

export function CreateUserForm({ employees }: { employees: EmployeeOption[] }) {
  const { state, pending, onSubmit, error } = useValidatedAction(createUserSchema, createUser);

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="name" error={error("name")} autoComplete="off" />
        <Field label="Email" name="email" type="email" error={error("email")} autoComplete="off" />
        <RoleAndLink role="HR" employeeId="" employees={employees} error={error} />
        <Field
          label="Temporary password"
          name="password"
          type="password"
          autoComplete="new-password"
          error={error("password")}
          hint="At least 8 characters with a letter and a number."
        />
        <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:items-center">
          <FormMessage status={state.status} message={state.message} />
          <Button type="submit" disabled={pending} className="sm:ml-auto">
            {pending ? "Creating…" : "Create user"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function EditUserForm({
  user,
  employees,
  isSelf,
}: {
  user: { id: string; name: string; role: string; isActive: boolean; employeeId: string | null };
  employees: EmployeeOption[];
  isSelf: boolean;
}) {
  const { state, pending, onSubmit, error } = useValidatedAction(updateUserSchema, updateUser);

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold">Account</h2>
      <form onSubmit={onSubmit} noValidate className="mt-5 grid gap-5 sm:grid-cols-2">
        <input type="hidden" name="id" value={user.id} />
        <Field label="Full name" name="name" defaultValue={user.name} error={error("name")} className="sm:col-span-2" />
        <RoleAndLink
          role={user.role}
          employeeId={user.employeeId ?? ""}
          employees={employees}
          error={error}
          disabledRole={isSelf}
        />
        <div className="sm:col-span-2">
          {isSelf ? (
            <>
              <input type="hidden" name="isActive" value="on" />
              <p className="text-sm text-muted">This is your account, so it can&apos;t be deactivated here.</p>
            </>
          ) : (
            <Checkbox
              label="Account active"
              name="isActive"
              defaultChecked={user.isActive}
              description="Untick to block this person from signing in. Their history is kept."
            />
          )}
        </div>
        <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:items-center">
          <FormMessage status={state.status} message={state.message} />
          <Button type="submit" disabled={pending} className="sm:ml-auto">
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const { state, pending, onSubmit, error } = useValidatedAction(resetPasswordSchema, resetUserPassword);

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold">Reset password</h2>
      <p className="mt-1 text-sm text-muted">Set a temporary password and share it privately. The user must change it at their next sign-in.</p>
      <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start">
        <input type="hidden" name="id" value={userId} />
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          error={error("password")}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" disabled={pending} className="sm:mt-7">
          {pending ? "Resetting…" : "Reset password"}
        </Button>
      </form>
      <div className="mt-3">
        <FormMessage status={state.status} message={state.message} />
      </div>
    </Card>
  );
}
