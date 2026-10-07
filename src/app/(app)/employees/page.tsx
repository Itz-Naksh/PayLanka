import { Badge } from "@/components/ui/badge";
import { Card, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Money } from "@/components/ui/money";

export const metadata = { title: "Employees" };

// Read-only list for Phase 1 (proves the seed data). Add/edit/deactivate arrive in Phase 2.
export default async function EmployeesPage() {
  await requirePermission("employees:read");

  const employees = await prisma.employee.findMany({
    orderBy: { employeeNo: "asc" },
    include: { department: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader title="Employees" description={`${employees.length} employees on record.`} />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-background text-left text-xs font-semibold tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">Name</th>
                <th className="hidden px-4 py-3 md:table-cell">Department</th>
                <th className="hidden px-4 py-3 lg:table-cell">Designation</th>
                <th className="px-4 py-3 text-right">Basic salary</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-background">
                  <td className="px-4 py-3 font-mono text-xs text-muted">{e.employeeNo}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {e.firstName} {e.lastName}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">{e.department.name}</td>
                  <td className="hidden px-4 py-3 text-muted lg:table-cell">{e.designation}</td>
                  <td className="px-4 py-3 text-right">
                    <Money cents={e.basicSalaryCents} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={e.status === "ACTIVE" ? "success" : "neutral"}>
                      {e.status === "ACTIVE" ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
