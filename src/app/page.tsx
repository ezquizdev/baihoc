import { redirect } from "next/navigation";
import { requireAuthenticatedPage } from "@/application/infra/auth/guards";

export default async function RootRedirect() {
  await requireAuthenticatedPage({ next: "/" });
  redirect("/dashboard");
}
