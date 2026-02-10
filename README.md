# Oblivion/2 Web BBS (Backend Edition)

A 1990s BBS-inspired web app with ANSI-styled UI and a real backend.

Features:
- Splash/login flow with retro keyboard shortcuts
- New user application questionnaire (blue box + PBX prompts)
- Sysop approval workflow
- Message board
- BBS directory
- File board upload/download
- Profile editing
- Session-based authentication
- ANSI pack loader with color parsing and animated draw-in (`public/ansi/*.ans`)
- Sysop-managed message topics and file categories

## Tech Stack

- Node.js + Express
- PostgreSQL (`pg`)
- `express-session` + `connect-pg-simple`
- `multer` for uploads
- Vanilla JS frontend served from `public/`

## Local Run (without containers)

1. Create PostgreSQL database/user or reuse containerized DB.
2. Copy `.env.example` to `.env` and update values.
3. Install deps and start:

```powershell
cd C:\Users\micha\Documents\Projects\BBS_90s
npm install
npm start
```

App: `http://localhost:8080`

Default sysop credentials (seeded on first run):
- Handle: `SYSOP`
- Password: `oblivion2` (or `SYSOP_PASSWORD` env var)

## Docker

```powershell
docker compose up --build
```

This starts:
- App on `http://localhost:8080`
- PostgreSQL on `localhost:5432`

## Podman

Preferred:

```powershell
podman compose up --build
```

Alternative:

```powershell
podman build -t bbs-oblivion2 -f Containerfile .
```

## Notes

- Uploaded files are stored in `uploads/` and mounted via volume in `compose.yaml`.
- For production, set a strong `SESSION_SECRET` and do not use default DB credentials.
- For local HTTP (`localhost`), keep `SESSION_COOKIE_SECURE=false`.
- For HTTPS deployments, set `SESSION_COOKIE_SECURE=true`.
- The original static MVP files are preserved, but runtime frontend is now `public/` with backend APIs.
