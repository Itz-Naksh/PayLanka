import { Badge } from "@/components/ui/badge";

export type RunStatus = "DRAFT" | "REVIEW" | "APPROVED";

export const STATUS_LABELS: Record<RunStatus, string> = {
  DRAFT: "Draft",
  REVIEW: "In review",
  APPROVED: "Approved",
};

const TONES = { DRAFT: "neutral", REVIEW: "warning", APPROVED: "success" } as const;

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return <Badge tone={TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}
