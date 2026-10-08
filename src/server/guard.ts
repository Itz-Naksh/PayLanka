import "server-only";
import { errorState, type ActionState } from "@/lib/forms/action-state";
import type { Permission } from "@/lib/auth/permissions";
import { assertPermission, AuthorizationError, type CurrentUser } from "@/lib/auth/session";
import { isDemoAccount, isDemoMode } from "@/lib/demo";

export const DEMO_BLOCKED_MESSAGE =
  "This action is turned off in the public demo so it stays usable for the next visitor.";

/** True when a shared demo account is signed in on a demo deployment. */
export function isLockedDemoUser(user: { email: string }): boolean {
  return isDemoMode() && isDemoAccount(user.email);
}

/**
 * Run a form action only if the current user has `permission`.
 * Every server action goes through this: server actions are public HTTP
 * endpoints, so hiding a button in the UI is never enough on its own.
 *
 * `blockDemo`: refuse for shared demo accounts (e.g. managing users), because
 * one visitor could otherwise lock every later visitor out.
 */
export async function withPermission(
  permission: Permission,
  run: (user: CurrentUser) => Promise<ActionState>,
  { blockDemo = false }: { blockDemo?: boolean } = {},
): Promise<ActionState> {
  let user: CurrentUser;
  try {
    user = await assertPermission(permission);
  } catch (error) {
    if (error instanceof AuthorizationError) return errorState(error.message);
    throw error;
  }
  if (blockDemo && isLockedDemoUser(user)) return errorState(DEMO_BLOCKED_MESSAGE);
  return run(user);
}
