"use client";

import { useRef } from "react";

/**
 * Keys for editable lists (allowances, deductions, tax brackets).
 *
 * Rows that come from the server use their index, so the server-rendered HTML
 * and the browser agree (a module-level counter would keep counting on the
 * server across requests and break hydration). Rows the user adds later get a
 * fresh key from a per-form counter.
 */
export const initialRowKey = (prefix: string, index: number) => `${prefix}-${index}`;

export function useNewRowKey(prefix: string): () => string {
  const next = useRef(0);
  return () => `${prefix}-new-${next.current++}`;
}
