import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { linkableEmployees } from "@/server/users/queries";
import { CreateUserForm } from "../user-forms";

export const metadata = { title: "Add user" };

export default async function NewUserPage() {
  await requirePermission("users:manage");
  const employees = await linkableEmployees();

  return (
    <>
      <Link href="/settings/users" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Users
      </Link>
      <h2 className="mb-4 text-lg font-semibold">Add user</h2>
      <CreateUserForm employees={employees} />
    </>
  );
}
