import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { listUsers } from "@/server/users/queries";

export const metadata = { title: "Users" };

const ROLE_LABELS = { ADMIN: "Admin", HR: "HR / Accountant", EMPLOYEE: "Employee" } as const;

export default async function UsersPage() {
  await requirePermission("users:manage");
  const users = await listUsers();

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted">People who can sign in to PayLanka.</p>
        <Link href="/settings/users/new" className={buttonClasses()}>
          <Plus className="size-4" aria-hidden />
          Add user
        </Link>
      </div>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {users.map((u) => (
            <li key={u.id} className="relative flex items-center gap-4 px-4 py-3 hover:bg-background">
              <div className="min-w-0 flex-1">
                <Link href={`/settings/users/${u.id}`} className="font-semibold after:absolute after:inset-0">
                  {u.name}
                </Link>
                <p className="truncate text-sm text-muted">
                  {u.email}
                  {u.employee ? ` · ${u.employee.employeeNo}` : ""}
                </p>
              </div>
              <Badge tone="primary">{ROLE_LABELS[u.role]}</Badge>
              {u.isActive && u.mustChangePassword ? <Badge tone="warning">Temporary password</Badge> : null}
              {u.isActive ? null : <Badge tone="error">Disabled</Badge>}
              <ChevronRight className="size-4 text-muted" aria-hidden />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
