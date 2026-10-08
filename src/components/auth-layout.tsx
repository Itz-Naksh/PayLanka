import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  ChartColumn,
  FileText,
  Landmark,
  ReceiptText,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

// Decorative payroll symbols scattered over the brand panel (purely visual).
// Positions keep every symbol clear of the headline, the feature list and the footer note.
const SYMBOLS: { Icon: LucideIcon; className: string }[] = [
  { Icon: ReceiptText, className: "top-[10%] right-[10%] size-16 rotate-12" },
  { Icon: ChartColumn, className: "top-[20%] left-[46%] size-10 rotate-3" },
  { Icon: CalendarDays, className: "top-[31%] right-[8%] size-12 -rotate-6" },
  { Icon: Banknote, className: "top-[47%] right-[5%] size-20 -rotate-12" },
  { Icon: ShieldCheck, className: "top-[67%] right-[12%] size-9 -rotate-12" },
  { Icon: Landmark, className: "bottom-[15%] left-[42%] size-12 rotate-6" },
];

const FEATURES = [
  { Icon: Landmark, text: "EPF & ETF calculated automatically, with configurable rates" },
  { Icon: FileText, text: "Professional PDF payslips for every employee" },
  { Icon: BadgeCheck, text: "Draft → Review → Approved workflow with a full audit trail" },
];

/** `large` on the desktop brand panel; the compact mobile band keeps the smaller size. */
function Logo({ className = "", large = false }: { className?: string; large?: boolean }) {
  return (
    <div className={`flex items-center ${large ? "gap-3" : "gap-2.5"} ${className}`}>
      <span
        className={`flex items-center justify-center rounded-xl bg-accent text-primary-hover ${large ? "size-12" : "size-10"}`}
      >
        <Wallet className={large ? "size-6" : "size-5"} aria-hidden />
      </span>
      <span className={`font-bold tracking-tight ${large ? "text-2xl" : "text-xl"}`}>PayLanka</span>
    </div>
  );
}

/** Two-column page for sign-in style screens: brand panel + form. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Brand panel (desktop) */}
      <section
        aria-hidden
        className="relative hidden overflow-hidden bg-primary p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16"
      >
        <div className="auth-pattern absolute inset-0 opacity-60" />
        <div className="absolute -top-24 -left-24 size-80 rounded-full bg-primary-hover/70 blur-2xl" />
        <div className="absolute -right-20 -bottom-28 size-96 rounded-full bg-accent/15 blur-3xl" />
        {SYMBOLS.map(({ Icon, className }, i) => (
          <Icon key={i} strokeWidth={1.25} className={`absolute text-white/10 ${className}`} />
        ))}
        <span className="absolute right-[6%] bottom-[12%] text-8xl font-extrabold text-white/[0.07] select-none">
          Rs.
        </span>

        <Logo className="relative" large />

        <div className="relative max-w-lg">
          <p className="text-sm font-semibold tracking-widest text-accent uppercase xl:text-base">Smart payroll</p>
          <h2 className="mt-4 text-4xl leading-tight font-bold xl:text-5xl xl:leading-tight">Payroll made simple for Sri Lankan businesses.</h2>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-4 text-white/90">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="size-5 text-accent" />
                </span>
                <span className="pt-2 text-base leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/65">
          EPF/ETF rates are configurable — verify them against current regulations.
        </p>
      </section>

      {/* Form side */}
      <section className="relative flex flex-col">
        {/* Compact brand band (mobile / tablet) */}
        <div className="relative overflow-hidden bg-primary px-6 py-6 text-white lg:hidden">
          <div className="auth-pattern absolute inset-0 opacity-60" aria-hidden />
          <ReceiptText strokeWidth={1.25} className="absolute top-2 right-6 size-14 rotate-12 text-white/10" aria-hidden />
          <Banknote strokeWidth={1.25} className="absolute -bottom-3 right-24 size-12 -rotate-12 text-white/10" aria-hidden />
          <Logo className="relative" />
          <p className="relative mt-2 text-sm text-white/80">Payroll made simple for Sri Lankan businesses.</p>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md 2xl:max-w-lg">{children}</div>
        </div>
      </section>
    </main>
  );
}
