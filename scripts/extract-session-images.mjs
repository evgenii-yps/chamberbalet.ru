// Извлекает изображения, переданные в чат, из транскрипта сессии Claude Code.
// Транскрипт хранит их как base64 в блоках {"type":"image","source":{"data":...}}.
// Имя файла — порядковый номер появления + sha1 содержимого (дедупликация).
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const TRANSCRIPT = process.argv[2];
const OUT = process.argv[3] || 'media/originals/incoming';
if (!TRANSCRIPT) { console.error('usage: node scripts/extract-session-images.mjs <transcript.jsonl> [outdir]'); process.exit(1); }

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

function* walk(node) {
  if (Array.isArray(node)) { for (const v of node) yield* walk(v); return; }
  if (node && typeof node === 'object') {
    if (node.type === 'image' && node.source?.data) yield node.source;
    for (const v of Object.values(node)) yield* walk(v);
  }
}

await mkdir(OUT, { recursive: true });
const seen = new Map();
let n = 0, written = 0;

const rl = createInterface({ input: createReadStream(TRANSCRIPT), crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.trim()) continue;
  let rec; try { rec = JSON.parse(line); } catch { continue; }
  for (const src of walk(rec)) {
    n++;
    const buf = Buffer.from(src.data, 'base64');
    const sha = createHash('sha1').update(buf).digest('hex').slice(0, 12);
    if (seen.has(sha)) { console.log(`  дубль #${String(n).padStart(3)} = ${seen.get(sha)}`); continue; }
    const name = `chat-${String(seen.size + 1).padStart(3, '0')}-${sha}${EXT[src.media_type] || '.bin'}`;
    seen.set(sha, name);
    await writeFile(join(OUT, name), buf);
    written++;
    console.log(`  #${String(n).padStart(3)} → ${name}  ${(buf.length / 1024 / 1024).toFixed(2)} МБ  ${src.media_type}`);
  }
}
console.log(`\nвсего блоков: ${n}, уникальных: ${seen.size}, записано: ${written} → ${OUT}`);
