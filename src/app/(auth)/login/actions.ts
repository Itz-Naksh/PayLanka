"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { homePathFor } from "@/lib/auth/permissions";
import { demoAccountFor, isDemoMode } from "@/lib/demo";
import { errorState, parseFormData, type ActionState } from "@/lib/forms/action-state";
import { loginSchema } from "@/lib/validation/auth";

/** Only allow redirects back into this app (blocks "open redirect" attacks). */
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Validate again on the server — the client-side check can be bypassed.
  const parsed = parseFormData(loginSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    // A wrong password surfaces as an AuthError. Anything else (including the
    // internal "redirect" signal on success) must be re-thrown.
    if (error instanceof AuthError) return errorState("Invalid email or password.");
    throw error;
  }
  return errorState("Something went wrong. Please try again.");
}

export async function demoLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isDemoMode()) return errorState("The demo is not available on this site.");
  const account = demoAccountFor(String(formData.get("role") ?? ""));
  if (!account) return errorState("Unknown demo account.");

  try {
    await signIn("demo", { role: account.role, redirectTo: homePathFor(account.role) });
  } catch (error) {
    if (error instanceof AuthError) {
      return errorState("The demo accounts aren't set up yet. Run `npm run db:seed`.");
    }
    throw error;
  }
  return errorState("Something went wrong. Please try again.");
}
