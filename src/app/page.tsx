import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(user.mustChangePassword ? "/change-password" : homePathFor(user.role));
}
