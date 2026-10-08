import type { Metadata } from "next";
import { Info } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { DEMO_ACCOUNTS, isDemoMode } from "@/lib/demo";
import { DemoButtons } from "./demo-buttons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  const demo = isDemoMode();

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in with the account your administrator gave you.</p>

      <div className="mt-8">
        <LoginForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} />
      </div>

      {demo ? (
        <div className="mt-10">
          <div className="flex items-center gap-3 text-xs font-semibold tracking-wider text-muted uppercase">
            <span className="h-px flex-1 bg-border" />
            Just looking? Try the demo
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="mt-4">
            <DemoButtons
              options={DEMO_ACCOUNTS.map(({ role, label, description }) => ({ role, label, description }))}
            />
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            The demo uses fictional sample data that is reset regularly. No sign-up needed.
          </p>
        </div>
      ) : (
        <p className="mt-8 text-center text-xs text-muted">
          No account? Ask your PayLanka administrator to create one for you.
        </p>
      )}
    </AuthLayout>
  );
}
