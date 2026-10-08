"use client";

import { usePathname, useRouter } from "next/navigation";
import { controlClasses } from "@/components/ui/field";

export type RunOption = { id: string; label: string; status: "DRAFT" | "REVIEW" | "APPROVED" };

const SUFFIX = { DRAFT: " (draft)", REVIEW: " (in review)", APPROVED: "" } as const;

/** Month selector; the choice lives in the URL (?run=…) so it can be bookmarked. */
export function RunPicker({ runs, selectedId }: { runs: RunOption[]; selectedId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-muted">Month</span>
      <select
        value={selectedId}
        onChange={(e) => router.push(`${pathname}?run=${encodeURIComponent(e.target.value)}`)}
        className={`${controlClasses()} h-10 w-56`}
      >
        {runs.map((run) => (
          <option key={run.id} value={run.id}>
            {run.label}
            {SUFFIX[run.status]}
          </option>
        ))}
      </select>
    </label>
  );
}
