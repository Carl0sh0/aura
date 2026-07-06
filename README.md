# Aura — your mind, cared for daily

A calm, private AI wellbeing companion. Check in on how you feel, talk things
through with an empathetic AI, journal with gentle reflections, get a small
kind daily routine, and look back on your history on a monthly calendar.

> **Aura is a supportive companion, not a therapist or crisis service.** It
> encourages professional help and surfaces crisis resources (with a
> locale-aware emergency number, not just a US one) when needed.

## What's inside

- **Today** — daily mood check-in with a two-week trend.
- **Talk** — a streaming, empathetic AI conversation (CBT / ACT / mindfulness-informed).
- **Journal** — write privately; Aura offers a short, warm reflection on each entry.
- **Plan** — an AI-generated gentle daily routine you can check off.
- **Calm Space** — guided breathing + 5-4-3-2-1 grounding, no AI, works instantly offline.
- **Historial** — a monthly calendar of logged moods, diary entries, and journal
  reflections, with text-to-speech on anything you wrote.
- **Settings** — companion/model picker, language, theme, an optional daily
  reminder notification, and an optional encrypted cross-device backup.

## AI: 100% on-device

Aura runs its AI **entirely in the browser** via [WebLLM](https://github.com/mlc-ai/web-llm)
and WebGPU — no Claude/OpenAI/cloud backend, no API key, no per-message network
call. Three selectable **Character Packs** (`calm`, `grounded`, `reflective`)
each pair a persona system prompt with their own small local model
(`src/lib/characterPacks.ts`); the model itself is also swappable per pack in
Settings (1B–4B parameter options, matched to the device's memory).

**Trade-off, honestly stated:** a 1–4B on-device model is nowhere near a
frontier cloud model's quality — it exists for zero-data-leaves-the-device and
offline use, not as a silent quality-equivalent swap. It also means a
multi-GB first-time download and requires a WebGPU-capable browser
(Chrome/Edge desktop + recent Android Chrome; Safari/Firefox support varies).

## Privacy

Moods, journal, routines, and conversations are stored **and processed**
only on-device — nothing about what you write ever reaches a server. The
only things that can leave your device, and only if you turn them on in
Settings:

- **Encrypted backup** — an AES-256-GCM blob, encrypted with a passphrase
  only you know, so the server (and Aura) can never read it. Losing the
  passphrase means losing the backup — there's no recovery path, by design.
- **Daily reminder** — a push subscription plus the time you chose. No name,
  no content, ever.
- **Anonymous aggregate analytics** — visit counts, which section gets
  opened, rough session length, country/device/browser buckets. No cookies,
  no per-visitor identity; see `api/analytics/`.

## Tech

- **Frontend:** Vite + React 18 + TypeScript + Tailwind (logic lives in
  `src/lib/` so it can be reused by a future mobile app). PWA-installable
  (`public/manifest.webmanifest`, `public/sw.js`).
- **Backend (optional, minimal):** Vercel serverless functions in `api/` —
  *not* for AI (that's 100% client-side), only for the three opt-in features
  above: `api/push/` (Web Push via a GitHub Actions cron, see
  `.github/workflows/push-reminders.yml`), `api/backup.ts` (encrypted blob
  storage, Google Sign-In verified server-side), and `api/analytics/` (a
  hidden `/admin` usage dashboard, gated by `ADMIN_SECRET`). Storage is
  Upstash Redis.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5190. The AI needs nothing else — first message
triggers the on-device model download (progress shown in-app).

**Optional features** need environment variables — copy `.env.example` to
`.env` and fill in what you want:

- Google Sign-In / email capture: `VITE_GOOGLE_CLIENT_ID`, `VITE_SUBSCRIBE_ENDPOINT`
- Daily reminder push: `VAPID_*` keys (`npx web-push generate-vapid-keys`), `UPSTASH_REDIS_REST_URL/TOKEN`
- Encrypted backup: same Upstash vars as above
- `/admin` usage dashboard: `ADMIN_SECRET`

None of these are required to use or develop the core app.
