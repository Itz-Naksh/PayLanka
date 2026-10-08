import type { TaxBracket } from "./types";

/**
 * Checks that APIT brackets form one continuous ladder:
 * the first starts at 0, each starts where the previous ended, and only the
 * last is open-ended. Returns a list of problems (empty = valid).
 */
export function validateBrackets(brackets: readonly TaxBracket[]): string[] {
  const problems: string[] = [];
  if (brackets.length === 0) return ["Add at least one bracket"];

  brackets.forEach((bracket, index) => {
    const row = index + 1;
    const isLast = index === brackets.length - 1;
    const expectedFrom = index === 0 ? 0 : brackets[index - 1].toCents;

    if (bracket.fromCents !== expectedFrom) {
      problems.push(
        index === 0 ? "The first bracket must start at 0" : `Bracket ${row} must start where bracket ${row - 1} ends`,
      );
    }
    if (isLast && bracket.toCents !== null) problems.push("Leave the last bracket's upper limit empty (no limit)");
    if (!isLast && bracket.toCents === null) problems.push(`Bracket ${row} needs an upper limit`);
    if (bracket.toCents !== null && bracket.toCents <= bracket.fromCents) {
      problems.push(`Bracket ${row}'s upper limit must be above its lower limit`);
    }
    if (bracket.rateBp < 0 || bracket.rateBp > 10_000) problems.push(`Bracket ${row}'s rate must be 0–100%`);
  });
  return problems;
}

/** Safely read brackets stored as JSON on a payroll run. */
export function parseStoredBrackets(value: unknown): TaxBracket[] | null {
  if (!Array.isArray(value)) return null;
  const brackets = value.filter(
    (b): b is TaxBracket =>
      typeof b === "object" &&
      b !== null &&
      Number.isSafeInteger(b.fromCents) &&
      (b.toCents === null || Number.isSafeInteger(b.toCents)) &&
      Number.isSafeInteger(b.rateBp),
  );
  return brackets.length === value.length ? brackets : null;
}
