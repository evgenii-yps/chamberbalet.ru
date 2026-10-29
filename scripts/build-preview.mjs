/**
 * Превью-артефакт одним файлом: стили, шрифты (base64) и скрипт целиком внутри,
 * без import и внешних файлов. Нужен для просмотра в Artifact/на почте.
 *
 *   npm run build && npm run preview   → .build/preview.html
 *
 * Формат под артефакт: без doctype/html/head/body — только title, style, скрипты и разметка.
 * Реальные фото и видео из media/ в превью не встраиваются: там остаются заглушки.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { DIST, BUILD, bytes } from './config.mjs';

const read = (f) => fs.readFile(path.join(DIST, f));
const html = (await read('index.html')).toString('utf8');
const css0 = (await read(html.match(/href="(\/assets\/css\/[^"]+)"/)[1].slice(1))).toString('utf8');
let css = css0;
for (const m of new Set(css0.match(/url\(\/assets\/fonts\/[^)]+\)/g) || [])) {
  const file = m.slice(4, -1).slice(1);
  css = css.replaceAll(m, `url(data:font/woff2;base64,${(await read(file)).toString('base64')})`);
}
const js = (await read(html.match(/src="(\/assets\/js\/[^"]+)"/)[1].slice(1))).toString('utf8');
const title = html.match(/<title>([^<]*)<\/title>/)[1];
const headScript = html.match(/<script>\n\/\* Режим[\s\S]*?<\/script>/)[0];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/<script defer src="[^"]*"><\/script>/, '')
  .replace(/(<script type="application\/ld\+json">[\s\S]*?<\/script>)/, '');
if (/\/(media|assets\/photo)\//.test(body)) console.warn('⚠ в разметке есть ссылки на media/: в превью они не встроены');

const out = `<title>${title}</title>\n<style>${css}</style>\n${headScript}\n${body}\n<script>${js.replaceAll('</script', '<\\/script')}</script>\n`;
await fs.mkdir(BUILD, { recursive: true });
await fs.writeFile(path.join(BUILD, 'preview.html'), out);
console.log(`preview: .build/preview.html, ${bytes(Buffer.byteLength(out))}`);
