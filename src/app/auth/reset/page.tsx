import { verifyResetToken } from "@/application/services/authService";
import { ResetForm } from "./ResetForm";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token || "";
  let tokenValid = false;
  try {
    if (token) {
      await verifyResetToken(token);
      tokenValid = true;
    }
  } catch {
    tokenValid = false;
  }

  return <ResetForm token={token} tokenValid={tokenValid} />;
}
