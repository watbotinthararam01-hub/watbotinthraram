/**
 * Wat Bot Inthraram — Standalone Production Server
 *
 * Usage:
 *   npm install
 *   npm start
 *
 * Environment variables (copy .env.example → .env):
 *   PORT            — HTTP port (default: 3000)
 *   DATABASE_URL    — PostgreSQL connection string
 *   SESSION_SECRET  — Session signing secret (use a long random string)
 *   NODE_ENV        — Set to "production"
 */

import express from "express";
import session from "express-session";
import cors from "cors";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// ─── Database ─────────────────────────────────────────────────────────────────

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  console.error("Run 'npm run migrate' first to set up the database.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function query(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Ensure singleton rows exist for content tables
async function ensureDefaults() {
  await query(`INSERT INTO hero_content DEFAULT VALUES ON CONFLICT DO NOTHING`);
  await query(`INSERT INTO about_content DEFAULT VALUES ON CONFLICT DO NOTHING`);
  await query(`INSERT INTO meta_content DEFAULT VALUES ON CONFLICT DO NOTHING`);
  await query(`INSERT INTO donation_content DEFAULT VALUES ON CONFLICT DO NOTHING`);
  await query(`INSERT INTO stream_content DEFAULT VALUES ON CONFLICT DO NOTHING`);
}

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: isProduction ? false : true, credentials: true }));

const sessionSecret =
  process.env.SESSION_SECRET || "watbot-dev-secret-change-in-production";

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// ─── Auth Middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// ─── API Routes ───────────────────────────────────────────────────────────────

const api = express.Router();

// Health check
api.get("/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Auth ──────────────────────────────────────────────────────────────────────

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "watbot@123";

api.post("/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  req.session.authenticated = true;
  req.session.username = username;
  res.json({ authenticated: true, username });
});

api.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ authenticated: false, username: null });
  });
});

api.get("/auth/me", (req, res) => {
  if (req.session && req.session.authenticated) {
    res.json({ authenticated: true, username: req.session.username || null });
  } else {
    res.json({ authenticated: false, username: null });
  }
});

// ── Site Content ──────────────────────────────────────────────────────────────

api.get("/site-content", async (_req, res) => {
  try {
    await ensureDefaults();
    const [hero] = await query("SELECT * FROM hero_content LIMIT 1");
    const [about] = await query("SELECT * FROM about_content LIMIT 1");
    const [meta] = await query("SELECT * FROM meta_content LIMIT 1");
    const [donation] = await query("SELECT * FROM donation_content LIMIT 1");
    const [stream] = await query("SELECT * FROM stream_content LIMIT 1");
    res.json({ hero: toCamel(hero), about: toCamel(about), meta: toCamel(meta), donation: toCamel(donation), stream: toCamel(stream) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

api.put("/site-content/hero", requireAuth, async (req, res) => {
  try {
    await ensureDefaults();
    const { titleTh, titleEn, subtitleTh, subtitleEn, welcomeTh, welcomeEn, headerImageUrl } = req.body;
    const [row] = await query(`UPDATE hero_content SET
      title_th=$1,title_en=$2,subtitle_th=$3,subtitle_en=$4,
      welcome_th=$5,welcome_en=$6,header_image_url=$7
      RETURNING *`,
      [titleTh, titleEn, subtitleTh, subtitleEn, welcomeTh, welcomeEn, headerImageUrl ?? null]);
    res.json(toCamel(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.put("/site-content/about", requireAuth, async (req, res) => {
  try {
    await ensureDefaults();
    const { historyTh, historyEn, missionTh, missionEn, abbotNameTh, abbotNameEn, abbotBioTh, abbotBioEn, abbotImageUrl } = req.body;
    const [row] = await query(`UPDATE about_content SET
      history_th=$1,history_en=$2,mission_th=$3,mission_en=$4,
      abbot_name_th=$5,abbot_name_en=$6,abbot_bio_th=$7,abbot_bio_en=$8,abbot_image_url=$9
      RETURNING *`,
      [historyTh, historyEn, missionTh, missionEn, abbotNameTh, abbotNameEn, abbotBioTh, abbotBioEn, abbotImageUrl ?? null]);
    res.json(toCamel(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.put("/site-content/meta", requireAuth, async (req, res) => {
  try {
    await ensureDefaults();
    const { pageTitleTh, pageTitleEn, metaDescriptionTh, metaDescriptionEn, googleMapsIframeUrl } = req.body;
    const [row] = await query(`UPDATE meta_content SET
      page_title_th=$1,page_title_en=$2,meta_description_th=$3,meta_description_en=$4,google_maps_iframe_url=$5
      RETURNING *`,
      [pageTitleTh, pageTitleEn, metaDescriptionTh, metaDescriptionEn, googleMapsIframeUrl ?? null]);
    res.json(toCamel(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.put("/site-content/donation", requireAuth, async (req, res) => {
  try {
    await ensureDefaults();
    const { descriptionTh, descriptionEn, promptPayQrUrl, causes } = req.body;
    const [row] = await query(`UPDATE donation_content SET
      description_th=$1,description_en=$2,prompt_pay_qr_url=$3,causes=$4
      RETURNING *`,
      [descriptionTh, descriptionEn, promptPayQrUrl ?? null, JSON.stringify(causes ?? [])]);
    res.json(toCamel(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.put("/site-content/stream", requireAuth, async (req, res) => {
  try {
    await ensureDefaults();
    const { streamUrl, isLive } = req.body;
    const [row] = await query(`UPDATE stream_content SET stream_url=$1,is_live=$2 RETURNING *`,
      [streamUrl ?? null, isLive ?? false]);
    res.json(toCamel(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

// ── News ──────────────────────────────────────────────────────────────────────

api.get("/news", async (_req, res) => {
  try {
    const rows = await query("SELECT * FROM news ORDER BY created_at DESC");
    res.json(rows.map(toCamel));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.post("/news", requireAuth, async (req, res) => {
  try {
    const { titleTh, titleEn, summaryTh, summaryEn, imageUrl, eventDate } = req.body;
    if (!titleTh || !titleEn || !summaryTh || !summaryEn) {
      return res.status(400).json({ error: "titleTh, titleEn, summaryTh, summaryEn are required" });
    }
    const [row] = await query(
      "INSERT INTO news(title_th,title_en,summary_th,summary_en,image_url,event_date) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [titleTh, titleEn, summaryTh, summaryEn, imageUrl ?? null, eventDate ?? null]
    );
    res.status(201).json(toCamel(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.get("/news/:id", async (req, res) => {
  try {
    const [row] = await query("SELECT * FROM news WHERE id=$1", [req.params.id]);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(toCamel(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.put("/news/:id", requireAuth, async (req, res) => {
  try {
    const { titleTh, titleEn, summaryTh, summaryEn, imageUrl, eventDate } = req.body;
    const [row] = await query(
      "UPDATE news SET title_th=$1,title_en=$2,summary_th=$3,summary_en=$4,image_url=$5,event_date=$6 WHERE id=$7 RETURNING *",
      [titleTh, titleEn, summaryTh, summaryEn, imageUrl ?? null, eventDate ?? null, req.params.id]
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(toCamel(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.delete("/news/:id", requireAuth, async (req, res) => {
  try {
    const [row] = await query("DELETE FROM news WHERE id=$1 RETURNING id", [req.params.id]);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.sendStatus(204);
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

// ── Schedule ──────────────────────────────────────────────────────────────────

api.get("/schedule", async (_req, res) => {
  try {
    const rows = await query("SELECT * FROM schedule ORDER BY sort_order ASC");
    res.json(rows.map(toCamel));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.put("/schedule", requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "items array required" });
    await query("DELETE FROM schedule");
    if (items.length === 0) return res.json([]);
    const inserted = await Promise.all(
      items.map((item, i) =>
        query(
          "INSERT INTO schedule(time,activity_th,activity_en,sort_order) VALUES($1,$2,$3,$4) RETURNING *",
          [item.time, item.activityTh, item.activityEn, i]
        ).then((r) => toCamel(r[0]))
      )
    );
    res.json(inserted);
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

// ── Gallery ──────────────────────────────────────────────────────────────────

api.get("/gallery", async (_req, res) => {
  try {
    const rows = await query("SELECT * FROM gallery ORDER BY sort_order ASC");
    res.json(rows.map(toCamel));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.post("/gallery", requireAuth, async (req, res) => {
  try {
    const { imageUrl, captionTh, captionEn, type, sortOrder } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "imageUrl is required" });
    const [row] = await query(
      "INSERT INTO gallery(image_url,caption_th,caption_en,type,sort_order) VALUES($1,$2,$3,$4,$5) RETURNING *",
      [imageUrl, captionTh ?? null, captionEn ?? null, type ?? "image", sortOrder ?? 0]
    );
    res.status(201).json(toCamel(row));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.delete("/gallery/:id", requireAuth, async (req, res) => {
  try {
    const [row] = await query("DELETE FROM gallery WHERE id=$1 RETURNING id", [req.params.id]);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.sendStatus(204);
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

// ── Guidelines ───────────────────────────────────────────────────────────────

api.get("/guidelines", async (_req, res) => {
  try {
    const rows = await query("SELECT * FROM guidelines ORDER BY sort_order ASC");
    res.json(rows.map(toCamel));
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

api.put("/guidelines", requireAuth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: "items array required" });
    await query("DELETE FROM guidelines");
    if (items.length === 0) return res.json([]);
    const inserted = await Promise.all(
      items.map((item, i) =>
        query(
          "INSERT INTO guidelines(icon,label_th,label_en,enabled,sort_order) VALUES($1,$2,$3,$4,$5) RETURNING *",
          [item.icon, item.labelTh, item.labelEn, item.enabled ?? true, i]
        ).then((r) => toCamel(r[0]))
      )
    );
    res.json(inserted);
  } catch (err) { console.error(err); res.status(500).json({ error: "Database error" }); }
});

// ─── Mount API ────────────────────────────────────────────────────────────────

app.use("/api", api);

// ─── Static Frontend ──────────────────────────────────────────────────────────

const publicDir = path.join(__dirname, "public");

if (existsSync(publicDir)) {
  app.use(express.static(publicDir, { maxAge: "1y", etag: true }));
  // SPA fallback — React Router handles client-side routes
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
  console.log(`Serving frontend from: ${publicDir}`);
} else {
  console.warn(`Warning: public/ directory not found at ${publicDir}`);
  console.warn("The API is running, but no frontend will be served.");
  app.get("/", (_req, res) => {
    res.json({ status: "ok", api: "/api/healthz", docs: "See README.md" });
  });
}

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  วัดโบสถ์อินทราราม — Wat Bot Inthraram  ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  Server running on port ${PORT.toString().padEnd(18)}║`);
  console.log(`║  Environment: ${(process.env.NODE_ENV || "development").padEnd(27)}║`);
  console.log("╚══════════════════════════════════════════╝");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert snake_case DB column names to camelCase */
function toCamel(row) {
  if (!row) return row;
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = value;
  }
  return result;
}
