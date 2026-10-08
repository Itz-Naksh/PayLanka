/**
 * Sri Lankan National Identity Card (NIC) number validation.
 *
 * Old format (issued before 2016): 9 digits + V or X   e.g. 851234567V
 *   digits 1-2 = birth year (19xx), digits 3-5 = day of the year
 * New format: 12 digits                                 e.g. 198512345678
 *   digits 1-4 = birth year,         digits 5-7 = day of the year
 *
 * For women 500 is added to the day, so valid day values are 1-366 or 501-866.
 */

export type NicCheck = { valid: true; normalized: string } | { valid: false; reason: string };

function validDay(day: number): boolean {
  return (day >= 1 && day <= 366) || (day >= 501 && day <= 866);
}

export function checkNic(input: string): NicCheck {
  const nic = input.trim().toUpperCase().replace(/\s+/g, "");

  if (/^\d{9}[VX]$/.test(nic)) {
    return validDay(Number(nic.slice(2, 5)))
      ? { valid: true, normalized: nic }
      : { valid: false, reason: "The birth-day digits (3rd–5th) are not valid" };
  }

  if (/^\d{12}$/.test(nic)) {
    const year = Number(nic.slice(0, 4));
    if (year < 1900 || year > new Date().getFullYear()) {
      return { valid: false, reason: "The birth-year digits (1st–4th) are not valid" };
    }
    return validDay(Number(nic.slice(4, 7)))
      ? { valid: true, normalized: nic }
      : { valid: false, reason: "The birth-day digits (5th–7th) are not valid" };
  }

  return { valid: false, reason: "Use 9 digits + V/X (old) or 12 digits (new)" };
}
