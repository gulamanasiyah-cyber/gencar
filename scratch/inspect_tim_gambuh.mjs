import { createClient } from "@libsql/client/web";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    const tim = await client.execute("SELECT * FROM tim_gambuh;");
    console.log("=== TIM GAMBUH ===");
    console.log(JSON.stringify(tim.rows, null, 2));
  } catch (error) {
    console.error("Error inspecting database:", error);
  } finally {
    client.close();
  }
}

main();
