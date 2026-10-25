# Happy Birthday — a little celebration

A cinematic, single-page birthday gift built with React, TypeScript, Tailwind CSS, and Vite. It opens as a private birthday celebration with floating polaroids, a handwritten birthday wish, a growing memory gallery, reasons to celebrate you, and one last surprise.

Everything is editable in the browser, and the site works in three ways:

- **Local mode** — zero setup, data stays in this browser. Ideal for viewing on one device.
- **Supabase shared mode** — photos, words, and the soundtrack are stored in your own Supabase project, so both people see the same gift on any device. Recommended for Vercel or any static host.
- **Optional self-hosted mode** — the bundled Node server stores the gift on disk for a single-server deployment.

## Features

- Cinematic black, warm dusk, sunset-orange, and soft-pink theme with glowing details, gentle floating hearts, cursive display type, and smooth section reveals.
- Full-width cover photo with adjustable focal point, darkness, and optional parallax — plus an elegant placeholder until a real photo is uploaded.
- Four floating polaroids with upload, replace, remove, reorder, rotation, and caption controls.
- A glass-and-paper "My Birthday Wish for You" letter with an editable message and signature.
- Memory gallery with multi-photo upload, previews, captions, dates, fullscreen lightbox, edit/replace/delete, and a friendly empty state.
- Customizable reasons-to-celebrate cards, an animated final birthday wish, and confetti.
- Optional background music with play/pause, mute, and volume. No autoplay.
- Safe photo processing in the browser (JPEG/PNG/WebP, up to 15 MB each) with validation and clear error messages.
- Keyboard-accessible dialogs, skip link, reduced-motion support, responsive layouts, and a private-key gate for shared mode.
- Original royalty-free birthday music-box soundtrack generated for this project.

## Requirements

- Node.js `20.19+`, `22.12+`, or newer (Node 24 LTS recommended)
- npm 10+
- A free Supabase project for shared mode

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Without Supabase variables this is **local mode**: names, wishes, photos, and music are saved in `localStorage` and IndexedDB on that browser. Refreshing keeps everything, but another device or a different browser starts fresh.

To preview a production build locally without cloud storage:

```bash
npm run build
npm run preview
```

## Shared mode with Supabase (recommended)

This is the mode to use when you want photos uploaded on your phone to appear on the recipient's device. The app talks directly to Supabase using the public anon key plus one private Supabase Auth account. The account password is the gift key.

### 1. Create the Supabase project and schema

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it.
3. In the SQL file, replace `birthday-gift@example.com` with the email you will use for the gift account. You can also run this afterward:

```sql
update public.gift_access set email = 'you@example.com' where id = 'gift';
```

The script creates the gift tables, grants access only to that one account, and creates two **private** storage buckets: `gift-photos` and `gift-audio`.

### 2. Create the one gift account

In **Authentication → Users → Add user**, create:

- **Email:** the same address you put in `gift_access` (for example `birthday-gift@yourdomain.com`)
- **Password:** your long private gift key
- **Auto Confirm User:** enabled

The email never needs a real inbox and is not a secret. The **password is the private key** the recipient enters at the gate. Use at least 10 characters; a generated 24-byte key is best:

```bash
node -e "console.log(require('node:crypto').randomBytes(24).toString('base64url'))"
```

Keep public sign-ups disabled in **Authentication → Sign In / Providers → Email** if this project is only for the gift. The SQL already restricts data to the one account, even if sign-up is enabled.

### 3. Connect the site

Copy the values from **Project Settings → API** into `.env` (or `.env.local` for Vite):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
VITE_GIFT_EMAIL=birthday-gift@yourdomain.com
```

Restart `npm run dev`. The access gate appears. Enter the gift key, then upload a photo and open the site in a private window or on another device with the same key.

Use the **anon / publishable** key only. Never put a Supabase **service-role** key in a `VITE_` variable or any browser code. Vite embeds `VITE_` values into the client bundle.

### 4. Share the gift

Share the key itself, or a link that unlocks automatically:

```text
https://your-domain.example/#key=YOUR_KEY
```

The `#key=` form is preferred because the fragment is not sent to servers or analytics. The app removes the key from the address bar after signing in. Use **Lock this gift** in the footer to sign out on that browser.

### 5. Deploy to Vercel or another static host

Static hosting is enough in Supabase mode because Supabase stores the shared data.

1. Add the three `VITE_` variables above to the Vercel project for **Production** and **Preview**.
2. Redeploy. Vite reads them at build time, so changing an environment variable requires a new deployment.
3. Open the deployed site, unlock it, upload a photo, and reload it in another browser to confirm the shared storage.

Do not add the gift password to Vercel. It is only stored as the Supabase Auth user's password and sent directly to Supabase when someone unlocks the gift.

### Rotating the key

Change the password for the gift user in **Authentication → Users**. Existing signed-in browsers may stay signed in until their token refreshes; use **Revoke sessions** if you need to sign everyone out immediately. Then share the new key.

### Existing browser-only photos

Photos you uploaded before enabling Supabase live in IndexedDB in that browser. They are not imported automatically. Unlock the Supabase-backed site on the device that has them and upload them again once; after that they will be shared.

## Optional: self-hosted Node server

If you do not configure Supabase, the bundled Express server can store the gift on disk. This requires a Node host with a persistent disk and is not compatible with plain static hosting.

```bash
node -e "console.log(require('node:crypto').randomBytes(24).toString('base64url'))"
```

Copy `.env.example` to `.env` and set:

```env
GIFT_ACCESS_KEY=your-long-unique-key
PORT=4174
GIFT_DATA_DIR=./server/data
```

Then run:

```bash
npm run serve
```

Open `http://localhost:4174`, enter the key, and share either the key or a `#key=...` link. The unlocked session lasts 30 days and uses an HttpOnly, same-site cookie. Back up the entire `GIFT_DATA_DIR` folder; it contains the gift text, photos, song, and session secret.

If either Supabase variable is present, the app uses Supabase instead of the Node API.

## Configuration

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase | Project URL from Supabase → Project Settings → API. |
| `VITE_SUPABASE_ANON_KEY` | Supabase | Public anon/publishable key. Safe in the browser; never use the service-role key. |
| `VITE_GIFT_EMAIL` | Supabase | Email of the single Auth account allowed to open the gift. |
| `GIFT_ACCESS_KEY` | Node server | Private key for the optional self-hosted server. Minimum 10 characters. |
| `PORT` | Node server | Port for the Node server. Default `4174`. |
| `HOST` | Node server | Optional bind address. Default `0.0.0.0`. |
| `GIFT_DATA_DIR` | Node server | Folder for the server's gift data and session secret. |
| `GIFT_TRUST_PROXY` | Node server | Set to `1` behind one HTTPS reverse proxy. |
| `GIFT_COOKIE_SECURE` | Node server | Set to `1` to force Secure cookies behind a proxy. |

`VITE_` values are compiled into the client at build time. They are not secrets. `.env` is ignored by git.

## Storage and limits

| Item | Limit |
| --- | --- |
| Photo type | JPG, PNG, WebP |
| Photo size | 15 MB per source file |
| Photos per batch | 20 |
| Memories total | 60 |
| Audio size | 20 MB |
| Audio type | MP3, M4A, WAV, OGG, WebM, AAC |

Photos are resized and compressed to WebP in the browser before upload. Memory captions are limited to 140 characters.

In Supabase mode, image and audio files live in private buckets. The app requests short-lived signed URLs when it loads, so anonymous visitors cannot list the bucket or link directly to a file. Replaced and deleted photos are removed from storage when they are no longer used by the cover, a polaroid, or a memory.

In Node mode, replaced and deleted photos are removed from disk after checking that no part of the gift still references them.

### Backups

- **Supabase:** use the project's Database and Storage backups, or copy the three `gift_*` tables and the two storage buckets. Supabase's free plan has limited backup retention; keep your own copy of irreplaceable photos.
- **Node server:** back up `GIFT_DATA_DIR` and keep it private.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Vite with HMR (local or Supabase mode, depending on env). |
| `npm run build` | Type-check and build the production client into `dist/`. |
| `npm run preview` | Preview the production client. |
| `npm run lint` | Run Oxlint. |
| `npm start` | Start the optional secure Node server for an existing build. |
| `npm run serve` | Build, then start the optional Node server. |

## Project structure

```text
src/
  components/       UI sections, customizer, access gate, dialogs
  hooks/            cloud access, content saving, photo/audio libraries, soundtrack
  lib/              content defaults, Supabase/Node cloud adapter, image processing
  assets/           placeholder cover
  index.css         design system and responsive styles
  access-gate.css   private gate and loading screens
supabase/schema.sql Supabase tables, RLS policies, and private buckets
server/index.mjs    Optional Express server with on-disk storage
scripts/            optional Python source for the original soundtrack
public/audio/       built-in music-box loop
```

## Security notes

**Supabase mode**

- Row Level Security restricts every table and storage bucket to the single email in `gift_access`, even if someone else creates an account in the same Supabase project.
- Buckets are private. The app creates signed URLs that expire after seven days and refreshes them on page load.
- The account password is the gift key; it is sent only to Supabase Auth over HTTPS and is not embedded in the build.
- The public anon key can be seen by anyone, which is expected. The service-role key never belongs in the client.
- This is access control for one private gift, not end-to-end encryption. The Supabase project owner and Supabase itself can access stored data.
- Supabase applies its own auth rate limits. Enable email confirmation and keep sign-ups disabled if the project is only used for this gift.

**Node mode**

- Sessions are HMAC-signed, stored in an HttpOnly `SameSite=Strict` cookie, and expire after 30 days.
- Seven failed unlock attempts within 15 minutes block that IP for 10 minutes. Rate limiting is in memory.
- Uploads are checked by file signature, size limited, renamed with random UUIDs, and served only to authenticated sessions.
- The server sends a restrictive Content Security Policy, `nosniff`, frame denial, and same-origin resource headers.

## Music credits

The built-in "A little birthday melody" loop is an original, royalty-free music-box composition created for this gift. To regenerate it, install Python 3 with `numpy` and `lameenc`, then run:

```bash
python scripts/generate_soundtrack.py
```

The site never autoplays music; playback begins only after a visitor taps play. Volume and mute preferences are remembered per browser.

## Troubleshooting

- **Photos still stay on one device** — the deployed build was made without Supabase variables. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_GIFT_EMAIL` to Vercel, then redeploy. A local `npm run dev` needs a restart after changing `.env`.
- **"That key does not open this gift"** — the password does not match the Supabase Auth user, or the account is not confirmed. Check **Authentication → Users**.
- **"The shared gift tables are missing"** — run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.
- **"This Supabase account is not allowed…"** — the signed-in account's email does not match `gift_access`. Update the row, sign out, and enter the key again.
- **Photos or song are missing after upload** — confirm both private buckets exist and the storage policies from `supabase/schema.sql` were applied. Signed URLs also expire after seven days; reload the page.
- **Vercel still shows the old design or local mode** — check that the deployment built the current commit, then redeploy. Build-time `VITE_` values are not read from `.env` files that are not committed unless they are set in Vercel.
- **"GIFT_ACCESS_KEY is missing or too short"** — only applies to the optional Node server. Set a key of at least 10 characters and restart.
- **A shared link shows the gate** — the key in the link may be wrong or incomplete. Share the exact `#key=...` link, or enter the key manually.
- **Music did not start automatically** — intentional; browsers block autoplay. Tap play in the music dock.
- **My local-mode gift disappeared** — local mode lives in that browser's storage. Use Supabase shared mode for cross-device persistence.
