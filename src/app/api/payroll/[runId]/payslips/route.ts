import { periodKey } from "@/lib/payroll/period";
import { prisma } from "@/lib/db";
import { loadRunPayslips } from "@/server/payslips/load";
import { pdfResponse } from "@/server/payslips/respond";

/** All payslips of a payroll run in one PDF (one page per employee). */
export async function GET(request: Request, ctx: RouteContext<"/api/payroll/[runId]/payslips">) {
  const { runId } = await ctx.params;
  const result = await loadRunPayslips(runId);
  if (!result.ok) return Response.json({ error: result.message }, { status: result.status });

  const run = await prisma.payrollRun.findUnique({ where: { id: runId }, select: { year: true, month: true } });
  const name = run ? `Payslips-${periodKey(run)}.pdf` : "Payslips.pdf";
  return pdfResponse(request, result.payslips, result.generatedOn, name);
}
