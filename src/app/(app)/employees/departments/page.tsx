import { Card, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { listDepartments } from "@/server/employees/queries";
import { EmployeeTabs } from "../tabs";
import { AddDepartmentForm, DepartmentRow } from "./department-forms";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  await requirePermission("employees:write");
  const departments = await listDepartments();

  return (
    <>
      <PageHeader title="Employees" description="Departments group employees for reports and cost analysis." />
      <EmployeeTabs />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <ul className="divide-y divide-border">
            {departments.map((d) => (
              <DepartmentRow key={d.id} id={d.id} name={d.name} activeCount={d._count.employees} />
            ))}
          </ul>
        </Card>
        <Card className="h-fit p-5">
          <h2 className="mb-1 text-base font-semibold">Add a department</h2>
          <p className="mb-4 text-sm text-muted">A department can only be deleted once it has no employees.</p>
          <AddDepartmentForm />
        </Card>
      </div>
    </>
  );
}
