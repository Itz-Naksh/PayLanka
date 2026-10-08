"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/** Report tabs that carry the selected month (?run=…) across tabs. */
export function ReportTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const run = useSearchParams().get("run");
  const query = run ? `?run=${encodeURIComponent(run)}` : "";

  return (
    <nav aria-label="Reports" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={`${tab.href}${query}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
              active ? "border-primary text-primary" : "border-transparent text-muted hover:border-border hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
