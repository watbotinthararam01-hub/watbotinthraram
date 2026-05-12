#!/usr/bin/env node
/**
 * Database migration + seed script
 * Run once after first deployment: npm run migrate
 */
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required");
  process.exit(1);
}

const ssl = process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl });

async function run() {
  const client = await pool.connect();
  try {
    console.log("Creating tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_content (
        id SERIAL PRIMARY KEY,
        title_th TEXT NOT NULL DEFAULT 'วัดโบสถ์อินทราราม',
        title_en TEXT NOT NULL DEFAULT 'Wat Bot Inthraram',
        subtitle_th TEXT NOT NULL DEFAULT 'ศูนย์กลางแห่งสติและปัญญา',
        subtitle_en TEXT NOT NULL DEFAULT 'Center of Mindfulness and Wisdom',
        welcome_th TEXT NOT NULL DEFAULT 'ยินดีต้อนรับสู่วัดโบสถ์อินทราราม',
        welcome_en TEXT NOT NULL DEFAULT 'Welcome to Wat Bot Inthraram',
        header_image_url TEXT
      );
      CREATE TABLE IF NOT EXISTS about_content (
        id SERIAL PRIMARY KEY,
        history_th TEXT NOT NULL DEFAULT 'วัดโบสถ์อินทรารามเป็นวัดเก่าแก่ที่มีประวัติศาสตร์ยาวนาน',
        history_en TEXT NOT NULL DEFAULT 'Wat Bot Inthraram is an ancient temple with a long history.',
        mission_th TEXT NOT NULL DEFAULT 'เผยแผ่พระพุทธศาสนาและส่งเสริมจริยธรรม',
        mission_en TEXT NOT NULL DEFAULT 'To propagate Buddhism and promote ethics in the community.',
        abbot_name_th TEXT NOT NULL DEFAULT 'พระอาจารย์',
        abbot_name_en TEXT NOT NULL DEFAULT 'The Abbot',
        abbot_bio_th TEXT NOT NULL DEFAULT 'เจ้าอาวาสผู้ทรงศีลและปัญญา',
        abbot_bio_en TEXT NOT NULL DEFAULT 'A revered abbot of great virtue and wisdom.',
        abbot_image_url TEXT
      );
      CREATE TABLE IF NOT EXISTS meta_content (
        id SERIAL PRIMARY KEY,
        page_title_th TEXT NOT NULL DEFAULT 'วัดโบสถ์อินทราราม',
        page_title_en TEXT NOT NULL DEFAULT 'Wat Bot Inthraram',
        meta_description_th TEXT NOT NULL DEFAULT 'วัดโบสถ์อินทราราม ศูนย์กลางแห่งการปฏิบัติธรรม',
        meta_description_en TEXT NOT NULL DEFAULT 'Wat Bot Inthraram, a Buddhist temple in Bangkok.',
        google_maps_iframe_url TEXT
      );
      CREATE TABLE IF NOT EXISTS donation_content (
        id SERIAL PRIMARY KEY,
        description_th TEXT NOT NULL DEFAULT 'ร่วมทำบุญสนับสนุนวัดโบสถ์อินทราราม',
        description_en TEXT NOT NULL DEFAULT 'Support Wat Bot Inthraram through your generous donation.',
        prompt_pay_qr_url TEXT,
        causes JSONB NOT NULL DEFAULT '[{"nameTh":"บำรุงวัด","nameEn":"Temple Maintenance"},{"nameTh":"การศึกษา","nameEn":"Education Fund"}]'::jsonb
      );
      CREATE TABLE IF NOT EXISTS stream_content (
        id SERIAL PRIMARY KEY,
        stream_url TEXT,
        is_live BOOLEAN NOT NULL DEFAULT false
      );
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title_th TEXT NOT NULL,
        title_en TEXT NOT NULL,
        summary_th TEXT NOT NULL,
        summary_en TEXT NOT NULL,
        image_url TEXT,
        event_date TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        time TEXT NOT NULL,
        activity_th TEXT NOT NULL,
        activity_en TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS gallery (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        caption_th TEXT,
        caption_en TEXT,
        type TEXT NOT NULL DEFAULT 'image',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS guidelines (
        id SERIAL PRIMARY KEY,
        icon TEXT NOT NULL,
        label_th TEXT NOT NULL,
        label_en TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
    `);

    console.log("Seeding default content...");
    await client.query(`INSERT INTO hero_content DEFAULT VALUES ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO about_content DEFAULT VALUES ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO meta_content DEFAULT VALUES ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO donation_content DEFAULT VALUES ON CONFLICT DO NOTHING`);
    await client.query(`INSERT INTO stream_content DEFAULT VALUES ON CONFLICT DO NOTHING`);

    const { rows: sched } = await client.query("SELECT COUNT(*) FROM schedule");
    if (parseInt(sched[0].count) === 0) {
      await client.query(`
        INSERT INTO schedule (time, activity_th, activity_en, sort_order) VALUES
          ('05:00', 'สวดมนต์เช้า', 'Morning Chanting', 1),
          ('06:00', 'ตักบาตร', 'Alms Round', 2),
          ('07:00', 'แสดงธรรม', 'Dhamma Talk', 3),
          ('18:00', 'สวดมนต์เย็น', 'Evening Chanting', 4)
      `);
    }

    const { rows: guide } = await client.query("SELECT COUNT(*) FROM guidelines");
    if (parseInt(guide[0].count) === 0) {
      await client.query(`
        INSERT INTO guidelines (icon, label_th, label_en, enabled, sort_order) VALUES
          ('Footprints', 'ถอดรองเท้า', 'Remove Shoes', true, 1),
          ('Shirt', 'แต่งกายสุภาพ', 'Dress Modestly', true, 2),
          ('Volume2', 'รักษาความสงบ', 'Maintain Silence', true, 3)
      `);
    }

    console.log("\n✓ Migration complete! Your database is ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
