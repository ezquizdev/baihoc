import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";

export default async function RootRedirect() {
  const session = await requireAuthenticatedPage({ next: "/" });
  redirect(session.role === "staff" ? "/staff/dashboard" : "/dashboard");
}
