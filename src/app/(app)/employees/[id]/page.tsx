import { ArrowLeft, CircleCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { formatDate, toDateInputValue } from "@/lib/format";
import { centsToDecimalString } from "@/lib/money";
import { getEmployee, listDepartments } from "@/server/employees/queries";
import { EmployeeForm } from "../employee-form";
import { StatusToggle } from "./status-toggle";

export const metadata = { title: "Employee" };

export default async function EmployeePage({ params, searchParams }: PageProps<"/employees/[id]">) {
  await requirePermission("employees:write");
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const [employee, departments] = await Promise.all([getEmployee(id), listDepartments()]);
  if (!employee) notFound();

  const name = `${employee.firstName} ${employee.lastName}`;
  const active = employee.status === "ACTIVE";

  return (
    <>
      <Link href="/employees" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Employees
      </Link>

      {query.created ? (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success-ink ring-1 ring-success/30">
          <CircleCheck className="size-4" aria-hidden /> Employee created.
        </p>
      ) : null}

      <PageHeader
        title={name}
        description={`${employee.employeeNo} · ${employee.designation} · ${employee.department.name}`}
        actions={<StatusToggle employeeId={employee.id} active={active} name={name} />}
      />

      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
        <Badge tone={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>
        {!active && employee.deactivatedAt ? <span>since {formatDate(employee.deactivatedAt)}</span> : null}
        {employee.user ? (
          <span>
            · Login: {employee.user.email} {employee.user.isActive ? "" : "(disabled)"}
          </span>
        ) : null}
      </div>

      <EmployeeForm
        departments={departments}
        defaults={{
          id: employee.id,
          employeeNo: employee.employeeNo,
          firstName: employee.firstName,
          lastName: employee.lastName,
          nic: employee.nic,
          epfNo: employee.epfNo ?? "",
          departmentId: employee.departmentId,
          designation: employee.designation,
          joinDate: toDateInputValue(employee.joinDate),
          bankName: employee.bankName,
          bankBranch: employee.bankBranch ?? "",
          accountNo: employee.accountNo,
          basicSalary: centsToDecimalString(employee.basicSalaryCents),
          allowances: employee.allowances.map((a) => ({
            name: a.name,
            amount: centsToDecimalString(a.amountCents),
            epfLiable: a.epfLiable,
          })),
        }}
      />
    </>
  );
}
