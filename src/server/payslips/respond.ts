import "server-only";
import { renderPayslipsPdf } from "@/components/payslip/payslip-document";
import type { PayslipData } from "@/lib/payslip/data";

/** Stream a PDF back: opens in the browser, or downloads with ?download=1. */
export async function pdfResponse(
  request: Request,
  payslips: PayslipData[],
  generatedOn: string,
  fileName: string,
): Promise<Response> {
  const pdf = await renderPayslipsPdf(payslips, generatedOn);
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
      // Payslips are personal data: never let a shared cache keep a copy.
      "Cache-Control": "private, no-store",
    },
  });
}
