"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Shown inside the app shell when a page fails to load. No technical details leak to the user. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto mt-12 max-w-md p-8 text-center">
      <TriangleAlert className="mx-auto size-10 text-warning" aria-hidden />
      <h1 className="mt-4 text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        This page couldn&apos;t be loaded. Your data is safe — please try again.
        {error.digest ? <span className="mt-2 block text-xs">Reference: {error.digest}</span> : null}
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </Card>
  );
}
