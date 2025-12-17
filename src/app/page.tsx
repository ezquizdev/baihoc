import { redirect } from "next/navigation";
import { getSession } from "@/application/infra/auth/session";

export default async function RootRedirect() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }
  redirect("/dashboard");
}
