import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@paylanka.test" },
  { role: "HR / Accountant", email: "hr@paylanka.test" },
  { role: "Employee", email: "employee@paylanka.test" },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  const showDemo = process.env.SHOW_DEMO_LOGINS === "true";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-white">
            <Wallet className="size-6" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Sign in to PayLanka</h1>
          <p className="mt-1 text-sm text-muted">Payroll for Sri Lankan businesses</p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <LoginForm callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined} />
        </div>

        {showDemo ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-sm">
            <p className="font-medium text-foreground">Demo accounts (password: Demo@1234)</p>
            <ul className="mt-2 space-y-1 text-muted">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email} className="flex justify-between gap-4">
                  <span>{a.role}</span>
                  <code className="text-foreground">{a.email}</code>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  );
}
