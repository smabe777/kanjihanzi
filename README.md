# 漢字 · 汉字 Trainer

A local web app for learning the **2000 most frequently used Japanese kanji** and the **2000 most frequently used simplified Chinese hanzi** — including how to write them — with Anki-style spaced repetition.

## Features

- **Two decks**: Kanji (Japanese, KANJIDIC newspaper frequency) and Hanzi (simplified Chinese, Jun Da frequency list), studied in frequency order.
- **Two card types per character**:
  - *Recognition*: see the character, recall meaning + reading, self-grade (Again / Hard / Good / Easy).
  - *Drawing*: see the meaning + reading, draw the character stroke by stroke on screen (powered by [Hanzi Writer](https://hanziwriter.org)). Wrong strokes are rejected; mistakes suggest a grade. First exposure shows the outline so you trace it; later reviews are from memory, with optional hint.
- **SM-2 spaced repetition** (the Anki algorithm) with short learning steps (1 min, 10 min) before cards graduate to daily intervals.
- **Daily new-card limit** (default 10 characters/day = 20 cards, configurable in Settings).
- **Character browser** showing your progress across all 2000 characters per deck.
- **Progress stored locally** in your browser (`localStorage`), with export/import for backup or moving devices.
- Keyboard shortcuts: `space`/`enter` to reveal, `1`–`4` to grade, `space` for the suggested grade.

## Hosting

Live at **https://kanjihanzi.netlify.app** (Netlify project `kanjihanzi`, GitHub repo `smabe777/kanjihanzi`).

- **Account & sync**: optional email/password account (Settings → Account & sync) stores progress in MongoDB Atlas (database `kanjihanzi` on `cluster0.edcskbz`), so it follows you across devices. Without an account, progress stays in the browser.
- **Backend**: a single Netlify Function ([netlify/functions/api.mjs](netlify/functions/api.mjs)) — JWT auth (bcrypt-hashed passwords), `GET/PUT /api/progress` with last-write-wins conflict handling.
- **Env vars** (set on Netlify): `MONGODB_URI`, `JWT_SECRET`.
- **Deploy**: `netlify deploy --prod` from this folder (builds locally and uploads). To deploy automatically on `git push`, connect the GitHub repo in the Netlify UI (Project configuration → Build & deploy → Link repository).
- **Local dev with backend**: `netlify dev` (port 8888) — pulls env vars from the linked Netlify project. Plain `npm run dev` works too but without the API.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
```

Production build: `npm run build` then serve the `dist/` folder (it's fully static — any static host works).

> Progress lives in the browser profile for the URL you use. Stick to one browser/URL, and use **Settings → Export progress** for backups.

## Data

Generated files (`src/data/*.json`, `public/strokes/`) are already built. To regenerate from sources:

1. Download to `/tmp`:
   - `kanji-data.json` — https://github.com/davidluzgouveia/kanji-data (KANJIDIC2-derived)
   - `hanzidb.csv` — https://github.com/ruddfawcett/hanziDB.csv (Jun Da frequency + CEDICT definitions)
   - `hanzi-writer-data-jp-master/` — https://github.com/chanind/hanzi-writer-data-jp (Japanese stroke data)
2. `npm install` (provides `hanzi-writer-data` for Chinese strokes)
3. `node scripts/build-data.mjs`

Stroke data is derived from Make Me a Hanzi / AnimCJK (Arphic-style licenses); dictionary data from KANJIDIC2 (CC BY-SA) and CC-CEDICT (CC BY-SA).
