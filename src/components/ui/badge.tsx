import { CircleAlert, CircleCheck, CircleX, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Status colours always come with an icon as well as a text label, so the
// meaning never relies on colour alone (colour-blind users, greyscale prints).
const tones: Record<string, { className: string; icon?: LucideIcon }> = {
  neutral: { className: "bg-background text-muted ring-border" },
  primary: { className: "bg-primary-soft text-primary ring-primary/20" },
  success: { className: "bg-success-soft text-success-ink ring-success/30", icon: CircleCheck },
  warning: { className: "bg-warning-soft text-warning-ink ring-warning/30", icon: CircleAlert },
  error: { className: "bg-error-soft text-error ring-error/30", icon: CircleX },
};

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "error";

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  const { className, icon: Icon } = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}
