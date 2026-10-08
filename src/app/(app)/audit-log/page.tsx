import { ChevronLeft, ChevronRight, History, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { controlClasses } from "@/components/ui/field";
import {
  ACTION_LABELS,
  actionTone,
  AUDIT_CATEGORIES,
  describeChanges,
  describeEntry,
  entityHref,
  type AuditCategory,
} from "@/lib/audit-format";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { listAuditEntries } from "@/server/audit/queries";

export const metadata = { title: "Audit log" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function AuditLogPage({ searchParams }: PageProps<"/audit-log">) {
  const user = await requirePermission("audit:read");
  const params = await searchParams;

  const categoryParam = one(params.category);
  const category = categoryParam && categoryParam in AUDIT_CATEGORIES ? (categoryParam as AuditCategory) : undefined;
  const actor = one(params.actor)?.slice(0, 100) ?? "";
  const page = Math.max(1, Number.parseInt(one(params.page) ?? "1", 10) || 1);

  const { entries, total, pages } = await listAuditEntries({ category, actor: actor || undefined, page });
  const canOpenUsers = hasPermission(user.role, "users:manage");

  const pageHref = (n: number) => {
    const q = new URLSearchParams();
    if (category) q.set("category", category);
    if (actor) q.set("actor", actor);
    if (n > 1) q.set("page", String(n));
    const s = q.toString();
    return s ? `/audit-log?${s}` : "/audit-log";
  };

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change to payroll, employees, users and settings: who, what and when. Entries can't be edited."
      />

      <form className="mb-4 grid gap-3 sm:grid-cols-[14rem_1fr_auto]" role="search">
        <label>
          <span className="sr-only">Type of change</span>
          <select name="category" defaultValue={category ?? ""} className={`${controlClasses()} h-10`}>
            <option value="">All changes</option>
            {Object.entries(AUDIT_CATEGORIES).map(([key, c]) => (
              <option key={key} value={key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="relative">
          <span className="sr-only">Changed by (email)</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input name="actor" defaultValue={actor} placeholder="Changed by (email)…" className={`${controlClasses()} h-10 pl-9`} />
        </label>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {entries.length === 0 ? (
        <Card className="p-10 text-center">
          <History className="mx-auto size-10 text-primary" aria-hidden />
          <p className="mt-3 font-semibold">No matching entries</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ol className="divide-y divide-border">
            {entries.map((entry) => {
              const changes = describeChanges(entry.metadata);
              const summary = describeEntry(entry.action, entry.metadata);
              const href = entityHref(entry.entityType, entry.entityId, entry.action);
              const linkable = href && (entry.entityType !== "User" || canOpenUsers);
              return (
                <li key={entry.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:gap-6">
                  <div className="shrink-0 text-sm sm:w-44">
                    <time dateTime={entry.createdAt.toISOString()} className="money font-medium">
                      {formatDateTime(entry.createdAt)}
                    </time>
                    <p className="truncate text-muted" title={entry.actorEmail}>
                      {entry.actorName ?? entry.actorEmail}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={actionTone(entry.action)}>{ACTION_LABELS[entry.action] ?? entry.action}</Badge>
                      {summary ? (
                        linkable ? (
                          <Link href={href} className="font-medium text-foreground hover:text-primary hover:underline">
                            {summary}
                          </Link>
                        ) : (
                          <span className="font-medium">{summary}</span>
                        )
                      ) : null}
                    </div>
                    {changes.length > 0 ? (
                      <dl className="mt-2 grid gap-x-4 gap-y-1 text-muted sm:grid-cols-[10rem_1fr]">
                        {changes.map((c) => (
                          <div key={c.field} className="contents">
                            <dt className="font-medium text-foreground">{c.field}</dt>
                            <dd className="money break-words">
                              {c.from} <span aria-label="changed to">→</span> {c.to}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      )}

      <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          {total} {total === 1 ? "entry" : "entries"} · page {Math.min(page, pages)} of {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className={buttonClasses("secondary", "sm")}>
              <ChevronLeft className="size-4" aria-hidden /> Newer
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={pageHref(page + 1)} className={buttonClasses("secondary", "sm")}>
              Older <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </nav>
    </>
  );
}
