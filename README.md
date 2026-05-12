# วัดโบสถ์อินทราราม — Deployment Guide

A bilingual (Thai/English) Buddhist Temple CMS — public site + admin dashboard.

## What's Inside

```
server.mjs      ← Main server (start here!)
migrate.mjs     ← Database setup (run once)
public/         ← Built React frontend (static files)
package.json    ← npm scripts
.env.example    ← Copy to .env and fill in values
render.yaml     ← Render.com one-click config
railway.json    ← Railway.app config
```

---

## Quick Start (Any Server / VPS)

```bash
# 1. Copy and edit environment variables
cp .env.example .env
nano .env   # fill in DATABASE_URL and SESSION_SECRET

# 2. Install dependencies
npm install

# 3. Set up the database (run ONCE after first deploy)
npm run migrate

# 4. Start the server
npm start
```

App runs at → `http://localhost:3000`
Admin panel → `http://localhost:3000/admin`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port (default: **3000**) |
| `NODE_ENV` | Yes | Set to **production** |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Random secret (32+ characters) |
| `ADMIN_USERNAME` | No | Admin login username (default: admin) |
| `ADMIN_PASSWORD` | No | Admin login password (default: watbot@123) |

---

## Deploy FREE on Render.com ⭐ Recommended

1. **Push this folder to GitHub** (or just the files in it)
2. Go to **render.com** → New → **Blueprint**
3. Connect your GitHub repo — Render reads `render.yaml` automatically
4. Render creates:
   - A **Web Service** running `npm start`
   - A **PostgreSQL database** (free tier)
5. Click **Apply** — deployment happens automatically
6. After first deploy: go to your service → **Shell** tab → run `npm run migrate`

**Manual Render setup:**
- New → Web Service → connect GitHub repo
- Build Command: `npm install`
- Start Command: `npm start`
- Add environment variables from the table above

---

## Deploy FREE on Railway.app

1. Push to GitHub
2. Go to **railway.app** → New Project → Deploy from GitHub
3. Add a **PostgreSQL plugin**: click + New → Database → PostgreSQL
4. Copy `DATABASE_URL` from the PostgreSQL service to your web service variables
5. Add: `NODE_ENV=production`, `SESSION_SECRET=<random>`, `PORT=3000`
6. Railway detects `npm start` automatically
7. After deploy: open **Shell** → `npm run migrate`

---

## Deploy on Vercel (frontend-only alternative)

> For best results, deploy the full stack on Render or Railway instead.
> Vercel works best for static sites — this app needs a database.

---

## Deploy on Any Linux VPS

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Upload your files (scp, FileZilla, or git)
scp -r ./deploy/* user@yourserver:/var/www/watbot/

# On the server
cd /var/www/watbot
npm install
cp .env.example .env && nano .env   # fill in DATABASE_URL, SESSION_SECRET
npm run migrate
npm start

# Optional: use PM2 to keep it running
npm install -g pm2
pm2 start server.mjs --name "watbot"
pm2 save && pm2 startup
```

---

## Admin Dashboard

- URL: `/admin`
- Default username: `admin`
- Default password: `watbot@123`

**Change credentials** via environment variables `ADMIN_USERNAME` and `ADMIN_PASSWORD` before going live.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/healthz | Health check |
| POST | /api/auth/login | Admin login |
| POST | /api/auth/logout | Admin logout |
| GET | /api/auth/me | Auth status |
| GET | /api/site-content | Hero, About, Meta, Donation, Stream |
| PUT | /api/site-content/hero | Update hero (auth required) |
| PUT | /api/site-content/about | Update about (auth required) |
| PUT | /api/site-content/meta | Update meta (auth required) |
| PUT | /api/site-content/donation | Update donation (auth required) |
| PUT | /api/site-content/stream | Update stream (auth required) |
| GET | /api/news | List news |
| POST | /api/news | Create news (auth required) |
| GET | /api/news/:id | Get news item |
| PUT | /api/news/:id | Update news (auth required) |
| DELETE | /api/news/:id | Delete news (auth required) |
| GET | /api/schedule | List schedule |
| PUT | /api/schedule | Replace schedule (auth required) |
| GET | /api/gallery | List gallery |
| POST | /api/gallery | Add gallery item (auth required) |
| DELETE | /api/gallery/:id | Delete gallery item (auth required) |
| GET | /api/guidelines | List guidelines |
| PUT | /api/guidelines | Replace guidelines (auth required) |

---

## Security Checklist Before Going Live

- [ ] Change `SESSION_SECRET` to a random 32+ character string
- [ ] Change `ADMIN_PASSWORD` via environment variable
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS (provided free by Render/Railway)
- [ ] Set up a custom domain

---

## Support

Check server logs in your hosting platform's dashboard for errors.
Run `npm run migrate` again if you see "relation does not exist" errors.
