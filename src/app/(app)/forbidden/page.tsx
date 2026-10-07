import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Access denied" };

export default function ForbiddenPage() {
  return (
    <Card className="mx-auto mt-12 max-w-md p-8 text-center">
      <ShieldAlert className="mx-auto size-10 text-warning" aria-hidden />
      <h1 className="mt-4 text-lg font-semibold">You don&apos;t have access to that page</h1>
      <p className="mt-2 text-sm text-muted">
        Your role doesn&apos;t allow this action. Ask an administrator if you think this is a mistake.
      </p>
      <Link href="/" className={`${buttonClasses("secondary")} mt-6`}>
        Go to my home page
      </Link>
    </Card>
  );
}
