import { Hono } from "hono";
import { getDb } from "../utils/db";
import { requireAuth } from "../middleware/auth";

type Env = { DB: D1Database; JWT_SECRET: string; [k: string]: unknown };
const r = new Hono<{ Bindings: Env }>();
r.use("/*", requireAuth());

// mandiri family deleted — route stub to avoid 404 break for old clients
r.all("/*", async (c) => c.json({ error: "Gone — mandiri family removed, DB rebuilt from scratch" }, 410));

export default r;

