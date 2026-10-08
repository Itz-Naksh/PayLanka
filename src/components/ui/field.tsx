import { CircleAlert, CircleCheck } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type WrapperProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

/** Label + control + error/hint, wired up for screen readers. */
export function FormField({ label, htmlFor, error, hint, className, children }: WrapperProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="flex items-center gap-1.5 text-sm text-error">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function controlClasses(error?: string) {
  return cn(
    "block w-full rounded-lg border bg-surface px-3 text-sm text-foreground outline-none transition",
    "placeholder:text-muted/70 focus:ring-2 disabled:bg-background disabled:text-muted",
    error ? "border-error focus:ring-error/20" : "border-border focus:border-primary focus:ring-primary/15",
  );
}

function a11yProps(id: string, error?: string, hint?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

type Common = { label: string; name: string; error?: string; hint?: string; className?: string };

/** `inputSize="lg"` for prominent forms such as sign-in (48px tall, 16px text). */
export function Field({
  label,
  name,
  error,
  hint,
  className,
  id,
  inputSize = "md",
  ...props
}: Common & InputHTMLAttributes<HTMLInputElement> & { inputSize?: "md" | "lg" }) {
  const inputId = id ?? name;
  return (
    <FormField label={label} htmlFor={inputId} error={error} hint={hint} className={className}>
      <input
        id={inputId}
        name={name}
        className={cn(controlClasses(error), inputSize === "lg" ? "h-12 px-4 text-base" : "h-10")} {...a11yProps(inputId, error, hint)} {...props} />
    </FormField>
  );
}

export function SelectField({
  label,
  name,
  error,
  hint,
  className,
  id,
  children,
  ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const inputId = id ?? name;
  return (
    <FormField label={label} htmlFor={inputId} error={error} hint={hint} className={className}>
      <select id={inputId} name={name} className={cn(controlClasses(error), "h-10")} {...a11yProps(inputId, error, hint)} {...props}>
        {children}
      </select>
    </FormField>
  );
}

export function TextareaField({
  label,
  name,
  error,
  hint,
  className,
  id,
  ...props
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const inputId = id ?? name;
  return (
    <FormField label={label} htmlFor={inputId} error={error} hint={hint} className={className}>
      <textarea id={inputId} name={name} rows={3} className={cn(controlClasses(error), "py-2")} {...a11yProps(inputId, error, hint)} {...props} />
    </FormField>
  );
}

export function Checkbox({
  label,
  name,
  description,
  id,
  ...props
}: { label: string; name: string; description?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? name;
  return (
    <label htmlFor={inputId} className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input
        id={inputId}
        name={name}
        type="checkbox"
        className="mt-0.5 size-4 rounded border-border accent-primary"
        {...props}
      />
      <span>
        <span className="font-medium text-foreground">{label}</span>
        {description ? <span className="block text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

/** Banner for the overall result of a form submission. */
export function FormMessage({ status, message }: { status: "idle" | "success" | "error"; message?: string }) {
  if (status === "idle" || !message) return null;
  const success = status === "success";
  const Icon = success ? CircleCheck : CircleAlert;
  return (
    <p
      role={success ? "status" : "alert"}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1",
        success ? "bg-success-soft text-success-ink ring-success/30" : "bg-error-soft text-error ring-error/30",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
