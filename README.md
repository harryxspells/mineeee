# For My Love — a birthday scrapbook

A cinematic, single-page birthday gift built with React, TypeScript, Tailwind CSS, and Vite. It opens as a private love letter with floating polaroids, a handwritten wish, a growing memory gallery, reasons I love you, and one last surprise.

Everything is editable in the browser, and the site works in two modes:

- **Local mode** — zero setup, data stays in this browser. Ideal for viewing on one device.
- **Cloud mode** — the bundled secure Node server stores the gift on disk so the same memories, photos, and soundtrack appear on another device.

## Features

- Cinematic black, warm dusk, sunset-orange, and soft-pink theme with glowing details, gentle floating hearts, cursive display type, and smooth section reveals.
- Full-width cover photo with adjustable focal point, darkness, and optional parallax — plus an elegant placeholder until a real photo is uploaded.
- Four floating polaroids with upload, replace, remove, reorder, rotation, and caption controls.
- A glass-and-paper "My Wish for You" letter with an editable message and signature.
- Memory gallery with multi-photo upload, previews, captions, dates, fullscreen lightbox, edit/replace/delete, and a friendly empty state.
- Customizable reasons cards, an animated final surprise, and birthday confetti.
- Optional background music with play/pause, mute, and volume. No autoplay.
- Safe photo processing in the browser (JPEG/PNG/WebP, up to 15 MB each) with validation and clear error messages.
- Keyboard-accessible dialogs, skip link, reduced-motion support, responsive layouts, and a private-key gate for cloud mode.
- Original royalty-free music-box soundtrack generated for this project.

## Requirements

- Node.js `20.19+`, `22.12+`, or newer (Node 24 LTS recommended)
- npm 10+

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

This is **local mode**: names, wishes, photos, and music are saved in `localStorage` and IndexedDB on that browser. Refreshing keeps everything, but another device or a different browser starts fresh. Clearing site data removes the gift.

To preview a production build locally without cloud storage:

```bash
npm run build
npm run preview
```

## Secure shared mode (cloud storage)

Use this when the gift will be opened on another device. The included server adds a private-key gate, an HttpOnly session cookie, persistent storage on disk, and authenticated media routes.

### 1. Create your private key and environment file

```bash
node -e "console.log(require('node:crypto').randomBytes(24).toString('base64url'))"
```

Copy `.env.example` to `.env` and paste the generated value:

```env
GIFT_ACCESS_KEY=your-long-unique-key
PORT=4174
GIFT_DATA_DIR=./server/data
```

`GIFT_ACCESS_KEY` is required and must be at least 10 characters. A long, unique phrase or generated key is strongly recommended.

### 2. Build and start

```bash
npm run serve
```

`npm run serve` builds the client and starts the Node server. If the build already exists, `npm start` starts only the server.

Open `http://localhost:4174` and enter the key. Your edits, photos, and song are now saved to `GIFT_DATA_DIR` and are available after refreshing or opening the site in another browser.

### 3. Share the gift

Share the key itself, or a link that unlocks automatically:

```text
https://your-domain.example/#key=YOUR_KEY
```

The `#key=` form is preferred because the fragment is not sent to the server in request logs. The app immediately removes the key from the address bar after unlocking. Query links (`?key=YOUR_KEY`) also work, but URLs can be recorded by proxies and analytics.

The unlocked session lasts 30 days on that browser. Use **Lock this gift** in the footer to sign out immediately.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `GIFT_ACCESS_KEY` | — (required) | Private key that protects the gift. Minimum 10 characters. |
| `PORT` | `4174` | Port for the Node server. |
| `HOST` | `0.0.0.0` | Optional bind address. |
| `GIFT_DATA_DIR` | `./server/data` | Folder for `gift.json`, photos, audio, and the session secret. Use a persistent volume in production. |
| `GIFT_TRUST_PROXY` | unset | Set to `1` behind one HTTPS reverse proxy so client IP rate limiting and secure cookies work correctly. |
| `GIFT_COOKIE_SECURE` | unset | Set to `1` to force Secure cookies when TLS terminates at a proxy. |

`npm start` and `npm run serve` load `.env` automatically if it exists. Environment variables provided by your hosting platform take precedence over the file.

## Storage and limits

| Item | Limit |
| --- | --- |
| Photo type | JPG, PNG, WebP |
| Photo size | 15 MB per source file |
| Photos per batch | 20 |
| Memories total | 60 |
| Audio size | 20 MB |
| Audio type | MP3, M4A, WAV, OGG, WebM, AAC |

Photos are resized and compressed in the browser before storage. Memory captions are limited to 140 characters. In cloud mode, replaced and deleted photos are removed from disk after checking that no cover, polaroid, or memory still references them.

### Backups

In cloud mode, back up the entire `GIFT_DATA_DIR` folder. It contains the gift text, photos, soundtrack, and the secret that signs sessions. Keep the folder private and outside the web root. Restoring it restores the gift.

## Deploying

Cloud mode needs a Node host with a **persistent disk** — for example a small VPS, Render, Railway, Fly.io, or a container platform. Static hosting (GitHub Pages, plain Netlify/S3, etc.) can serve only local mode.

Typical deployment:

1. Run `npm ci && npm run build`.
2. Set `GIFT_ACCESS_KEY` and `GIFT_DATA_DIR` in the host's environment. Point the data directory at the mounted persistent volume (an absolute path is safest).
3. Start the app with `npm start` (or `node server/index.mjs`) after the build exists.
4. Terminate HTTPS at the host or reverse proxy. If a proxy forwards requests, set `GIFT_TRUST_PROXY=1`; set `GIFT_COOKIE_SECURE=1` if the Node process itself sees plain HTTP.
5. Visit `/api/health` — it should return `{"ok":true,"cloud":true}`.

The server serves the built `dist/` folder, API routes, and private media. It must not be replaced by a plain static file server, or the gate and shared storage will stop working.

### Changing or rotating the key

Update `GIFT_ACCESS_KEY` and restart. Existing sessions are invalidated because session signatures are derived from the key. The content and uploads remain intact. Anyone with the old link loses access until you share the new one.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Vite with HMR (local mode). |
| `npm run build` | Type-check and build the production client into `dist/`. |
| `npm run preview` | Preview the production client without the API (local mode). |
| `npm run lint` | Run Oxlint. |
| `npm start` | Start the secure Node server for an existing build. |
| `npm run serve` | Build, then start the secure Node server. |

## Project structure

```text
src/
  components/       UI sections, customizer, access gate, dialogs
  hooks/            cloud access, content saving, photo/audio libraries, soundtrack
  lib/              content defaults & normalization, cloud API, image processing
  assets/           placeholder cover
  index.css         design system and responsive styles
  access-gate.css   private gate and loading screens
server/index.mjs    Express server, auth, uploads, persistent storage
scripts/            optional Python source for the original soundtrack
public/audio/       built-in music-box loop
```

## Security notes

- The gate is access control for one private gift, not multi-user authentication and not encryption at rest. Disk access on the server still exposes the files.
- Sessions are HMAC-signed, stored in an HttpOnly `SameSite=Strict` cookie, and expire after 30 days.
- Seven failed unlock attempts within 15 minutes block that IP for 10 minutes. Rate limiting is in memory and is intended for a single server instance.
- Uploads are checked by file signature, size limited, renamed with random UUIDs, and served only to authenticated sessions with private cache headers.
- The server sets a restrictive Content Security Policy, `nosniff`, frame denial, and same-origin resource headers. Mutating API calls are same-origin protected.
- Serve production traffic over HTTPS. Do not commit `.env` or the data directory; both are ignored by git.

## Music credits

The built-in "A love like this" loop is an original, royalty-free music-box composition created for this gift. To regenerate it, install Python 3 with `numpy` and `lameenc`, then run:

```bash
python scripts/generate_soundtrack.py
```

The site never autoplays music; playback begins only after a visitor taps play. Volume and mute preferences are remembered per browser.

## Troubleshooting

- **"GIFT_ACCESS_KEY is missing or too short"** — set a key of at least 10 characters in `.env` or the host environment, then restart.
- **"The production build is missing"** — run `npm run build`, or use `npm run serve`.
- **The gate accepts the key but content is empty** — in cloud mode, make sure the browser is talking to the Node server (check `/api/health`), not a static preview server.
- **A shared link shows the gate** — the key in the link may be wrong or incomplete. Share the exact `#key=...` link, or enter the key manually.
- **Music did not start automatically** — this is intentional; browsers block autoplay. Tap the play button in the music dock.
- **My local-mode gift disappeared** — local mode lives in that browser's storage. Clearing site data or using a different browser/device removes access; use cloud mode for cross-device persistence.
