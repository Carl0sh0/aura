# Aura — your mind, cared for daily

A calm, private AI wellbeing companion. Check in on how you feel, talk things
through with an empathetic AI, journal with gentle reflections, and get a small,
kind daily routine.

> **Aura is a supportive companion, not a therapist or crisis service.** It
> encourages professional help and surfaces crisis resources when needed. In an
> emergency, call your local emergency number.

## What's inside

- **Today** — daily mood check-in with a two-week trend.
- **Talk** — a streaming, empathetic AI conversation (CBT / ACT / mindfulness-informed).
- **Journal** — write privately; Aura offers a short, warm reflection on each entry.
- **Plan** — an AI-generated gentle daily routine you can check off.

## Privacy

Your moods, journal entries, and routines are stored **only in your browser**
(localStorage) — they never touch a server. Only the text you actively send to
the AI is forwarded to Claude, through a small local backend that holds the API
key (so the key is never exposed to the browser).

## Tech

- **Frontend:** Vite + React 18 + TypeScript + Tailwind (logic lives in `src/lib/`
  so it can be reused by a future mobile app).
- **Backend:** Express proxy to the **Claude API** (`@anthropic-ai/sdk`, model
  `claude-opus-4-8`), containing the safety layer (crisis detection + system prompts).

## Run it

```bash
npm install
cp .env.example .env      # optional: add your ANTHROPIC_API_KEY to go live
npm run dev
```

Then open http://localhost:5190. The frontend (5190) proxies `/api` to the
backend (8787), both started by `npm run dev`.

**No API key?** Aura runs in a realistic **demo mode** with mock replies so you
can explore the whole app. Add `ANTHROPIC_API_KEY` to `.env` to switch to the
real Claude — no code changes needed. Get a key at https://console.anthropic.com/
