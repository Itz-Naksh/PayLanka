import { ArrowLeft, CircleCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { getUser, linkableEmployees } from "@/server/users/queries";
import { EditUserForm, ResetPasswordForm } from "../user-forms";

export const metadata = { title: "Edit user" };

export default async function EditUserPage({ params, searchParams }: PageProps<"/settings/users/[id]">) {
  const actor = await requirePermission("users:manage");
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const user = await getUser(id);
  if (!user) notFound();
  const employees = await linkableEmployees(user.employeeId);

  return (
    <>
      <Link href="/settings/users" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="size-4" aria-hidden /> Users
      </Link>
      {query.created ? (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success-ink ring-1 ring-success/30">
          <CircleCheck className="size-4" aria-hidden /> User created. Share the temporary password privately — they will be asked to choose their own when they first sign in.
        </p>
      ) : null}
      <h2 className="text-lg font-semibold">{user.name}</h2>
      <p className="mb-4 text-sm text-muted">
        {user.email} · added {formatDate(user.createdAt)}
      </p>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <EditUserForm user={user} employees={employees} isSelf={user.id === actor.id} />
        <ResetPasswordForm userId={user.id} />
      </div>
    </>
  );
}
