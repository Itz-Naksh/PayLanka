import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <SearchX className="mx-auto size-12 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-muted">
          The page you&apos;re looking for doesn&apos;t exist, or the record was removed.
        </p>
        <Link href="/" className={`${buttonClasses()} mt-6`}>
          Go to PayLanka
        </Link>
      </div>
    </main>
  );
}
