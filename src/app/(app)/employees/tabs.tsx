import { TabNav } from "@/components/ui/tab-nav";

export function EmployeeTabs() {
  return (
    <TabNav
      label="Employee sections"
      tabs={[
        { href: "/employees", label: "Employees" },
        { href: "/employees/departments", label: "Departments" },
      ]}
    />
  );
}
