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
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            ux_mode?: "popup" | "redirect";
            prompt?: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export type GoogleAuthResult = {
  accessToken: string;
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

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
    const oauth = window.google?.accounts?.oauth2;
    if (!oauth) {
      reject(new Error("Google Identity Services không khả dụng"));
      return;
    }
    const tokenClient = oauth.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      ux_mode: "popup",
      prompt: "select_account",
      callback: async (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                "Google sign-in bị hủy hoặc lỗi.",
            ),
          );
          return;
        }
        try {
          const userinfo = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: {
                Authorization: `Bearer ${response.access_token}`,
              },
            },
          ).then((r) => r.json());
          if (!userinfo?.sub || !userinfo?.email) {
            throw new Error("Không lấy được thông tin tài khoản Google");
          }
          resolve({
            accessToken: response.access_token,
            sub: userinfo.sub,
            email: userinfo.email,
            name: userinfo.name,
            picture: userinfo.picture,
          });
        } catch (err) {
          reject(
            err instanceof Error
              ? err
              : new Error("Không lấy được thông tin tài khoản Google"),
          );
        }
      },
    });
    tokenClient.requestAccessToken();
  });
}
