import { createClient } from "@libsql/client/web";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  try {
    const email = "timjepret@jb2.id";
    const name = "Tim Jepret";
    const password = "gencar313";
    const role = "tim_jepret";

    console.log(`Checking if user ${email} already exists...`);
    const checkRes = await client.execute({
      sql: "SELECT id FROM users WHERE email = ? LIMIT 1;",
      args: [email]
    });

    if (checkRes.rows.length > 0) {
      console.log("User already exists. Updating password and role...");
      const passwordHash = bcrypt.hashSync(password, 12);
      await client.execute({
        sql: "UPDATE users SET name = ?, password_hash = ?, password_plain = ?, role = ? WHERE email = ?;",
        args: [name, passwordHash, password, role, email]
      });
      console.log("User updated successfully!");
    } else {
      console.log("User does not exist. Creating new user...");
      const id = uuidv4();
      const passwordHash = bcrypt.hashSync(password, 12);
      await client.execute({
        sql: "INSERT INTO users (id, name, email, password_hash, password_plain, role, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'));",
        args: [id, name, email, passwordHash, password, role]
      });
      console.log("User created successfully!");
    }
  } catch (error) {
    console.error("Database operation failed:", error);
  } finally {
    client.close();
  }
}

main();
