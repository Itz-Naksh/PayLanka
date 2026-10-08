import { centsToDecimalString } from "@/lib/money";
import type { Report, ReportColumn, ReportValue } from "@/lib/reports/types";

/**
 * Spreadsheet "formula injection": a cell starting with = + - @ (or a tab/CR)
 * is run as a formula when the CSV is opened in Excel. A malicious employee
 * name like "=HYPERLINK(...)" could do harm, so such text is prefixed with '.
 */
function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/** Quote a cell when it contains a comma, quote, newline or edge spaces. */
export function escapeCsvCell(text: string): string {
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatCell(column: ReportColumn, value: ReportValue): string {
  if (value === null || value === undefined || value === "") return "";
  switch (column.kind) {
    case "money":
      return centsToDecimalString(Number(value)); // 125000.50 — plain, so spreadsheets read it as a number
    case "percentBp":
      return (Number(value) / 100).toFixed(2);
    case "count":
      return String(value);
    case "text":
      return neutralizeFormula(String(value));
  }
}

/** UTF-8 with a BOM (so Excel shows Sinhala/Tamil names correctly) and CRLF line ends. */
export function reportToCsv(report: Report): string {
  const lines = [report.columns.map((c) => escapeCsvCell(c.label))];
  for (const row of [...report.rows, ...(report.totals ? [report.totals] : [])]) {
    lines.push(report.columns.map((c) => escapeCsvCell(formatCell(c, row[c.key] ?? null))));
  }
  return `﻿${lines.map((cells) => cells.join(",")).join("\r\n")}\r\n`;
}
