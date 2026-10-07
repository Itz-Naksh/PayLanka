import { formatLKR, type Cents } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Display an amount in LKR with tabular digits so columns line up. */
export function Money({ cents, className }: { cents: Cents; className?: string }) {
  return <span className={cn("money", className)}>{formatLKR(cents)}</span>;
}
