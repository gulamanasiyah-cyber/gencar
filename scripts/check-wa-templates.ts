import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const token = process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token) { console.error("WHATSAPP_API_KEY tidak ditemukan"); process.exit(1); }

  const API = "https://graph.facebook.com/v19.0";
  const userId = "122105396109376039";

  // Coba beberapa endpoint untuk mencari WABA
  const attempts = [
    `${API}/${userId}/whatsapp_business_accounts`,
    `${API}/${userId}/businesses`,
    `${API}/${phoneNumberId}/whatsapp_business_account`,
    `${API}/me/businesses`,
    `${API}/me/whatsapp_business_accounts`,
  ];

  for (const url of attempts) {
    console.log(`\n🔍 GET ${url}`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    console.log(`  => ${JSON.stringify(data).slice(0, 500)}`);
  }
}

main().catch(console.error);
