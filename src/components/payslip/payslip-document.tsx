import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatLKR } from "@/lib/money";
import type { PayslipData, PayslipLine } from "@/lib/payslip/data";

// Brand colours (same tokens as the web app). PDFs use the built-in Helvetica,
// whose digits are equal-width, so amounts line up like tabular numbers.
const C = {
  primary: "#7A1F2B",
  primarySoft: "#F5E9EA",
  accent: "#D9A440",
  text: "#2A2324",
  muted: "#6E6464",
  border: "#E8E1DC",
  background: "#FAF7F4",
  error: "#B3261E",
};

const s = StyleSheet.create({
  page: { paddingBottom: 56, fontFamily: "Helvetica", fontSize: 9.5, color: C.text },
  header: { backgroundColor: C.primary, color: "#FFFFFF", paddingHorizontal: 36, paddingVertical: 22, flexDirection: "row", justifyContent: "space-between" },
  company: { fontFamily: "Helvetica-Bold", fontSize: 15 },
  headerSmall: { fontSize: 8.5, color: "#F1DEE0", marginTop: 3, maxWidth: 300 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 18, textAlign: "right", letterSpacing: 2 },
  period: { fontSize: 10, textAlign: "right", marginTop: 4, color: "#F1DEE0" },
  accentBar: { height: 4, backgroundColor: C.accent },
  body: { paddingHorizontal: 36, paddingTop: 20 },
  details: { flexDirection: "row", borderWidth: 1, borderColor: C.border, borderRadius: 4, backgroundColor: C.background, padding: 12 },
  detailCol: { flex: 1 },
  detailRow: { flexDirection: "row", marginBottom: 4 },
  detailLabel: { width: 82, color: C.muted },
  detailValue: { flex: 1, fontFamily: "Helvetica-Bold" },
  columns: { flexDirection: "row", marginTop: 18, gap: 16 },
  column: { flex: 1 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: C.primary, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.border },
  rowLabel: { flex: 1, paddingRight: 8 },
  note: { color: C.muted, fontSize: 8 },
  amount: { textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, marginTop: 2, borderTopWidth: 1, borderTopColor: C.text, fontFamily: "Helvetica-Bold" },
  netBox: { marginTop: 18, borderWidth: 1.5, borderColor: C.primary, borderRadius: 4, backgroundColor: C.primarySoft, padding: 12 },
  netRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  netLabel: { fontFamily: "Helvetica-Bold", fontSize: 11, color: C.primary, letterSpacing: 1 },
  netAmount: { fontFamily: "Helvetica-Bold", fontSize: 16, color: C.primary },
  netWords: { marginTop: 5, fontSize: 8.5, color: C.text },
  employer: { marginTop: 18, width: "50%" },
  employerNote: { marginTop: 4, fontSize: 7.5, color: C.muted },
  approval: { marginTop: 16, fontSize: 8.5, color: C.muted },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.muted, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 6 },
  watermark: { position: "absolute", top: 330, left: 0, right: 0, textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 64, color: C.error, opacity: 0.12, transform: "rotate(-30deg)" },
});

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value || "-"}</Text>
    </View>
  );
}

function Lines({ title, lines, totalLabel, totalCents }: { title: string; lines: PayslipLine[]; totalLabel: string; totalCents: number }) {
  return (
    <View>
      <Text style={s.sectionTitle}>{title}</Text>
      {lines.map((line, i) => (
        <View key={`${line.label}-${i}`} style={s.row} wrap={false}>
          <Text style={s.rowLabel}>
            {line.label}
            {line.note ? <Text style={s.note}> ({line.note})</Text> : null}
          </Text>
          <Text style={[s.amount, line.amountCents < 0 ? { color: C.error } : {}]}>{formatLKR(line.amountCents)}</Text>
        </View>
      ))}
      <View style={s.totalRow}>
        <Text>{totalLabel}</Text>
        <Text>{formatLKR(totalCents)}</Text>
      </View>
    </View>
  );
}

function PayslipPage({ data, generatedOn }: { data: PayslipData; generatedOn: string }) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.company}>{data.company.name}</Text>
          <Text style={s.headerSmall}>{data.company.address}</Text>
          <Text style={s.headerSmall}>
            EPF reg. {data.company.epfRegNo}   |   ETF reg. {data.company.etfRegNo}
          </Text>
        </View>
        <View>
          <Text style={s.title}>PAYSLIP</Text>
          <Text style={s.period}>{data.periodLabel}</Text>
        </View>
      </View>
      <View style={s.accentBar} />

      <View style={s.body}>
        <View style={s.details}>
          <View style={s.detailCol}>
            <Detail label="Employee" value={data.employee.name} />
            <Detail label="Employee no." value={data.employee.employeeNo} />
            <Detail label="NIC" value={data.employee.nic} />
            <Detail label="EPF no." value={data.employee.epfNo} />
          </View>
          <View style={s.detailCol}>
            <Detail label="Department" value={data.employee.department} />
            <Detail label="Designation" value={data.employee.designation} />
            <Detail label="Bank" value={[data.employee.bank, data.employee.branch].filter(Boolean).join(", ")} />
            <Detail label="Account" value={data.employee.account} />
          </View>
        </View>

        <View style={s.columns}>
          <View style={s.column}>
            <Lines title="Earnings" lines={data.earnings} totalLabel="Gross pay" totalCents={data.grossCents} />
          </View>
          <View style={s.column}>
            <Lines title="Deductions" lines={data.deductions} totalLabel="Total deductions" totalCents={data.totalDeductionsCents} />
          </View>
        </View>

        <View style={s.netBox} wrap={false}>
          <View style={s.netRow}>
            <Text style={s.netLabel}>NET PAY</Text>
            <Text style={s.netAmount}>{formatLKR(data.netCents)}</Text>
          </View>
          <Text style={s.netWords}>{data.netInWords}</Text>
        </View>

        <View style={s.employer} wrap={false}>
          <Lines title="Employer contributions" lines={data.employer} totalLabel="Total cost to employer" totalCents={data.employerCostCents} />
          <Text style={s.employerNote}>Paid by the company in addition to your salary; not deducted from your pay.</Text>
        </View>

        {data.approval ? <Text style={s.approval}>{data.approval}</Text> : null}
      </View>

      {/* Drawn last so it sits on top of the boxes and stays fully readable. */}
      {!data.final ? <Text style={s.watermark} fixed>DRAFT - NOT FINAL</Text> : null}

      <View style={s.footer} fixed>
        <Text>Computer-generated payslip. No signature required. Generated by PayLanka on {generatedOn}.</Text>
        <Text>{data.employee.employeeNo}</Text>
      </View>
    </Page>
  );
}

/** One PDF with one A4 page per payslip. */
export async function renderPayslipsPdf(payslips: PayslipData[], generatedOn: string): Promise<Buffer> {
  return renderToBuffer(
    <Document title={payslips.length === 1 ? payslips[0].fileName : "Payslips"} author="PayLanka" creator="PayLanka">
      {payslips.map((data) => (
        <PayslipPage key={data.fileName} data={data} generatedOn={generatedOn} />
      ))}
    </Document>,
  );
}
