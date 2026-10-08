import { loadItemPayslip } from "@/server/payslips/load";
import { pdfResponse } from "@/server/payslips/respond";

export async function GET(request: Request, ctx: RouteContext<"/api/payslips/[itemId]">) {
  const { itemId } = await ctx.params;
  const result = await loadItemPayslip(itemId);
  if (!result.ok) return Response.json({ error: result.message }, { status: result.status });

  const [payslip] = result.payslips;
  return pdfResponse(request, result.payslips, result.generatedOn, payslip.fileName);
}
