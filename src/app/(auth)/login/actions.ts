"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
};

/** Only allow redirects back into this app (blocks "open redirect" attacks). */
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // Validate again on the server — the client-side check can be bypassed.
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    // A wrong password surfaces as an AuthError. Anything else (including the
    // internal "redirect" signal on success) must be re-thrown.
    if (error instanceof AuthError) return { error: "Invalid email or password." };
    throw error;
  }
  return {};
}
