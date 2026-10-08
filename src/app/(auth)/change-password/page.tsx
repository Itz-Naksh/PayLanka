import { ArrowLeft, Info, KeyRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { homePathFor } from "@/lib/auth/permissions";
import { signOutAction } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { isDemoAccount, isDemoMode } from "@/lib/demo";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/session-ended");
  const forced = user.mustChangePassword;
  const lockedDemo = isDemoMode() && isDemoAccount(user.email);

  return (
    <AuthLayout>
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <KeyRound className="size-5" aria-hidden />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {forced ? "Choose your own password" : "Change password"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {forced
          ? `Welcome, ${user.name.split(" ")[0]}. You signed in with a temporary password — please replace it to continue.`
          : `Signed in as ${user.email}`}
      </p>

      <div className="mt-8">
        {lockedDemo ? (
          <p className="flex gap-2 rounded-lg bg-accent-soft p-4 text-sm ring-1 ring-accent/40">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            Demo accounts are shared by every visitor, so their passwords can&apos;t be changed.
          </p>
        ) : (
          <ChangePasswordForm />
        )}
      </div>

      <div className="mt-8 text-center text-sm">
        {forced ? (
          <form action={signOutAction}>
            <button type="submit" className="font-medium text-muted hover:text-primary">
              Sign out instead
            </button>
          </form>
        ) : (
          <Link href={homePathFor(user.role)} className="inline-flex items-center gap-1 font-medium text-muted hover:text-primary">
            <ArrowLeft className="size-4" aria-hidden /> Back to PayLanka
          </Link>
        )}
      </div>
    </AuthLayout>
  );
}
