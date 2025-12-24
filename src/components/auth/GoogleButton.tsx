import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getGoogleCredential } from "@/lib/googleAuth";

type Props = {
  label?: string;
  onSuccess: (payload: { accessToken: string }) => Promise<void> | void;
};

export function GoogleButton({
  label = "Continue with Google",
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new Error("Google client ID is not configured");
      }
      const payload = await getGoogleCredential(clientId);
      await onSuccess({
        accessToken: payload.accessToken,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <Button
        type="button"
        variant="secondary"
        block
        onClick={handleClick}
        disabled={loading}
        className="flex items-center justify-center gap-2"
      >
        <span className="text-lg">G</span>
        <span>{loading ? "Connecting..." : label}</span>
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
