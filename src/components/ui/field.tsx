import { CircleAlert } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
};

/** Labelled input with an accessible error message. */
export function Field({ label, name, error, hint, className, id, ...props }: FieldProps) {
  const inputId = id ?? name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "block h-10 w-full rounded-lg border bg-surface px-3 text-sm text-foreground outline-none transition",
          "placeholder:text-muted/70 focus:ring-2",
          error
            ? "border-error focus:ring-error/20"
            : "border-border focus:border-primary focus:ring-primary/15",
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="flex items-center gap-1.5 text-sm text-error">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
