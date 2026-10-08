import { hasPermission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { reportToCsv } from "@/lib/csv";
import { periodKey } from "@/lib/payroll/period";
import { buildReport, isReportType } from "@/lib/reports/build";
import { reportData } from "@/server/reports/queries";

export async function GET(request: Request, ctx: RouteContext<"/api/reports/[type]/csv">) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!hasPermission(user.role, "reports:read")) {
    return Response.json({ error: "You do not have permission to do that." }, { status: 403 });
  }

  const { type } = await ctx.params;
  const runId = new URL(request.url).searchParams.get("run");
  if (!isReportType(type) || !runId) return Response.json({ error: "Unknown report." }, { status: 404 });

  const data = await reportData(runId);
  if (!data) return Response.json({ error: "Payroll run not found." }, { status: 404 });
  if (type === "bank-transfer" && data.status !== "APPROVED") {
    return Response.json({ error: "Bank transfer lists are only available for approved payroll." }, { status: 409 });
  }

  const csv = reportToCsv(buildReport(type, data.items, data));
  const draft = data.status === "APPROVED" ? "" : "-DRAFT";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="PayLanka-${type}-${periodKey(data)}${draft}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
