/**
 * Amount in words for payslips and cheques, e.g.
 *   9_161_250 cents -> "Rupees Ninety-one thousand six hundred and twelve and fifty cents only"
 * Writing the amount in words makes it harder to alter a printed figure.
 */
import { assertCents, type Cents } from "./money";

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES = ["", "thousand", "million", "billion"];

/** 0–999 */
function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (rest) {
    const words = rest < 20 ? ONES[rest] : TENS[Math.floor(rest / 10)] + (rest % 10 ? `-${ONES[rest % 10]}` : "");
    parts.push(hundreds ? `and ${words}` : words);
  }
  return parts.join(" ");
}

export function numberToWords(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError("Expected a non-negative whole number");
  if (n === 0) return "zero";

  const groups: string[] = [];
  let scale = 0;
  let remaining = n;
  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk) groups.unshift(`${belowThousand(chunk)}${SCALES[scale] ? ` ${SCALES[scale]}` : ""}`);
    remaining = Math.floor(remaining / 1000);
    scale++;
  }
  // "one thousand and five" — British usage puts "and" before a final number under 100.
  const lastChunk = n % 1000;
  if (n >= 1000 && lastChunk > 0 && lastChunk < 100) groups[groups.length - 1] = `and ${groups.at(-1)}`;
  return groups.join(" ");
}

export function rupeesInWords(cents: Cents): string {
  assertCents(cents);
  if (cents < 0) return `Minus ${rupeesInWords(-cents).replace(/^Rupees/, "rupees")}`;
  const rupees = Math.floor(cents / 100);
  const remainder = cents % 100;
  const words = `${numberToWords(rupees)}${remainder ? ` and ${numberToWords(remainder)} cents` : ""}`;
  return `Rupees ${words.charAt(0).toUpperCase()}${words.slice(1)} only`;
}
