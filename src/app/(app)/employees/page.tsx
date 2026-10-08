import { ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { controlClasses } from "@/components/ui/field";
import { Money } from "@/components/ui/money";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { sumCents } from "@/lib/money";
import { listDepartments, listEmployees, type EmployeeStatusFilter } from "@/server/employees/queries";
import { EmployeeTabs } from "./tabs";

export const metadata = { title: "Employees" };

const STATUSES: { value: EmployeeStatusFilter; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ALL", label: "All" },
];

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function EmployeesPage({ searchParams }: PageProps<"/employees">) {
  const user = await requirePermission("employees:read");
  const params = await searchParams;

  const q = one(params.q)?.slice(0, 100) ?? "";
  const departmentId = one(params.department) ?? "";
  const statusParam = one(params.status);
  const status = STATUSES.some((s) => s.value === statusParam) ? (statusParam as EmployeeStatusFilter) : "ACTIVE";

  const [employees, departments] = await Promise.all([
    listEmployees({ q, departmentId, status }),
    listDepartments(),
  ]);
  const canEdit = hasPermission(user.role, "employees:write");

  return (
    <>
      <PageHeader
        title="Employees"
        description="Employee records used for payroll, payslips and bank transfers."
        actions={
          canEdit ? (
            <Link href="/employees/new" className={buttonClasses()}>
              <Plus className="size-4" aria-hidden />
              Add employee
            </Link>
          ) : null
        }
      />
      <EmployeeTabs />

      {/* A plain GET form: filters live in the URL, so they survive refresh and can be bookmarked. */}
      <form className="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem_9rem_auto]" role="search">
        <label className="relative">
          <span className="sr-only">Search employees</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, number, NIC…"
            className={`${controlClasses()} h-10 pl-9`}
          />
        </label>
        <label>
          <span className="sr-only">Department</span>
          <select name="department" defaultValue={departmentId} className={`${controlClasses()} h-10`}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select name="status" defaultValue={status} className={`${controlClasses()} h-10`}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <Card className="overflow-hidden">
        {employees.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">No employees match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-background text-left text-xs font-semibold tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">No.</th>
                  <th scope="col" className="px-4 py-3">Name</th>
                  <th scope="col" className="hidden px-4 py-3 md:table-cell">Department</th>
                  <th scope="col" className="hidden px-4 py-3 text-right lg:table-cell">Basic salary</th>
                  <th scope="col" className="px-4 py-3 text-right">Fixed monthly pay</th>
                  <th scope="col" className="hidden px-4 py-3 sm:table-cell">Status</th>
                  <th scope="col" className="w-8 px-2 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((e) => (
                  <tr key={e.id} className="group relative hover:bg-background">
                    <td className="px-4 py-3 font-mono text-xs text-muted">{e.employeeNo}</td>
                    <td className="px-4 py-3">
                      <Link href={`/employees/${e.id}`} className="font-semibold text-foreground after:absolute after:inset-0">
                        {e.firstName} {e.lastName}
                      </Link>
                      <p className="text-xs text-muted">{e.designation}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-muted md:table-cell">{e.department.name}</td>
                    <td className="hidden px-4 py-3 text-right lg:table-cell">
                      <Money cents={e.basicSalaryCents} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money
                        cents={e.basicSalaryCents + sumCents(e.allowances.map((a) => a.amountCents))}
                        className="font-medium"
                      />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Badge tone={e.status === "ACTIVE" ? "success" : "neutral"}>
                        {e.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-muted group-hover:text-primary">
                      <ChevronRight className="size-4" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-sm text-muted">
        Showing {employees.length} {employees.length === 1 ? "employee" : "employees"}.
      </p>
    </>
  );
}
