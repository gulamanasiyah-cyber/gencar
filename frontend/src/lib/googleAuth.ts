export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "441676595228-btkqquphatrf1u7ftussc728vk4f8v71.apps.googleusercontent.com";

export function requestGoogleAuth({
  onSuccess,
  onError,
}: {
  onSuccess: (data: { email: string; accessToken: string }) => void;
  onError: (errMsg: string) => void;
}) {
  const google = (window as unknown as {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (res: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  })?.google;

  if (!google?.accounts?.oauth2) {
    onError("Layanan Google sedang disiapkan. Silakan coba klik sekali lagi.");
    return;
  }

  try {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "email profile openid",
      callback: async (res) => {
        if (res.error) {
          onError("Pilihan akun Google dibatalkan atau terjadi kendala koneksi.");
          return;
        }
        if (res.access_token) {
          try {
            const uRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${res.access_token}` },
            });
            if (!uRes.ok) throw new Error("Gagal mengambil info akun");
            const info = await uRes.json();
            if (info?.email) {
              onSuccess({ email: String(info.email).toLowerCase().trim(), accessToken: res.access_token });
            } else {
              onError("Alamat email tidak ditemukan pada akun Google ini.");
            }
          } catch {
            onError("Gagal mengambil informasi email dari Google.");
          }
        }
      },
    });
    client.requestAccessToken();
  } catch {
    onError("Tidak dapat membuka dialog login Google.");
  }
}
