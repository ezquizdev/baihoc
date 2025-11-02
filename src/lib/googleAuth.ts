type GoogleJwtPayload = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

function decodeJwt(token: string): GoogleJwtPayload | null {
  try {
    const [, payload] = token.split(".");
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded) as GoogleJwtPayload;
  } catch {
    return null;
  }
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export type GoogleAuthResult = GoogleJwtPayload;

export async function loadGoogleScript() {
  if (typeof window === "undefined") return;
  if (window.google?.accounts?.id) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });
}

export async function getGoogleCredential(
  clientId: string,
): Promise<GoogleAuthResult> {
  await loadGoogleScript();
  return new Promise<GoogleAuthResult>((resolve, reject) => {
    if (!window.google?.accounts?.id) {
      reject(new Error("Google Identity Services not available"));
      return;
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        const payload = decodeJwt(response.credential);
        if (!payload) {
          reject(new Error("Unable to decode Google credential"));
          return;
        }
        resolve(payload);
      },
    });
    window.google.accounts.id.prompt();
  });
}
