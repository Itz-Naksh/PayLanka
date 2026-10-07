import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? homePathFor(user.role) : "/login");
}
