import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { listDepartments, suggestEmployeeNo } from "@/server/employees/queries";
import { EmployeeForm } from "../employee-form";

export const metadata = { title: "Add employee" };

export default async function NewEmployeePage() {
  await requirePermission("employees:write");
  const [departments, employeeNo] = await Promise.all([listDepartments(), suggestEmployeeNo()]);

  return (
    <>
      <Link href="/employees" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Employees
      </Link>
      <PageHeader title="Add employee" description="All amounts are monthly, in Sri Lankan rupees." />
      <EmployeeForm
        departments={departments}
        defaults={{
          employeeNo,
          firstName: "",
          lastName: "",
          nic: "",
          epfNo: "",
          departmentId: "",
          designation: "",
          joinDate: "",
          bankName: "",
          bankBranch: "",
          accountNo: "",
          basicSalary: "",
          allowances: [],
        }}
      />
    </>
  );
}
