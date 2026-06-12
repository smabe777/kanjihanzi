// Builds the app's character data from raw sources downloaded to /tmp:
//   /tmp/kanji-data.json  - davidluzgouveia/kanji-data (KANJIDIC2-derived)
//   /tmp/hanzidb.csv      - ruddfawcett/hanziDB.csv (Jun Da frequency + CEDICT defs)
//   /tmp/hanzi-writer-data-jp-master/data - Japanese stroke data (chanind)
//   node_modules/hanzi-writer-data        - Chinese stroke data
// Outputs src/data/{kanji,hanzi}.json and public/strokes/{ja,zh}/<char>.json
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const JP_STROKES = '/tmp/hanzi-writer-data-jp-master/data';
const ZH_STROKES = path.join(ROOT, 'node_modules/hanzi-writer-data');
const N = 2000;

fs.mkdirSync(path.join(ROOT, 'src/data'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'public/strokes/ja'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'public/strokes/zh'), { recursive: true });

// ---- Kanji ----
const kanjiRaw = JSON.parse(fs.readFileSync('/tmp/kanji-data.json', 'utf8'));
const kanjiList = Object.entries(kanjiRaw)
  .filter(([, v]) => v.freq)
  .sort((a, b) => a[1].freq - b[1].freq)
  .slice(0, N + 100); // headroom in case some lack stroke data

const kanji = [];
const kanjiMissing = [];
for (const [char, v] of kanjiList) {
  if (kanji.length >= N) break;
  let src = path.join(JP_STROKES, `${char}.json`);
  if (!fs.existsSync(src)) {
    src = path.join(ZH_STROKES, `${char}.json`); // fallback: Chinese stroke style
    if (!fs.existsSync(src)) {
      kanjiMissing.push(char);
      continue;
    }
  }
  fs.copyFileSync(src, path.join(ROOT, 'public/strokes/ja', `${char}.json`));
  kanji.push({
    char,
    rank: kanji.length + 1,
    meanings: v.meanings.slice(0, 5),
    on: v.readings_on.slice(0, 4),
    kun: v.readings_kun.slice(0, 4),
    strokes: v.strokes,
    jlpt: v.jlpt_new ?? null,
  });
}
fs.writeFileSync(path.join(ROOT, 'src/data/kanji.json'), JSON.stringify(kanji));
console.log(`kanji: ${kanji.length} written, no stroke data for: ${kanjiMissing.join(' ') || 'none'}`);

// ---- Hanzi ----
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const csv = parseCSV(fs.readFileSync('/tmp/hanzidb.csv', 'utf8'));
const header = csv[0];
const col = (name) => header.indexOf(name);
const hanzi = [];
const hanziMissing = [];
for (const r of csv.slice(1)) {
  if (hanzi.length >= N) break;
  const char = r[col('charcter')]; // sic: typo in source CSV header
  if (!char) continue;
  const src = path.join(ZH_STROKES, `${char}.json`);
  if (!fs.existsSync(src)) {
    hanziMissing.push(char);
    continue;
  }
  fs.copyFileSync(src, path.join(ROOT, 'public/strokes/zh', `${char}.json`));
  hanzi.push({
    char,
    rank: hanzi.length + 1,
    pinyin: r[col('pinyin')],
    definition: r[col('definition')],
    strokes: Number(r[col('stroke_count')]) || null,
    hsk: Number(r[col('hsk_level')]) || null,
  });
}
fs.writeFileSync(path.join(ROOT, 'src/data/hanzi.json'), JSON.stringify(hanzi));
console.log(`hanzi: ${hanzi.length} written, no stroke data for: ${hanziMissing.join(' ') || 'none'}`);
