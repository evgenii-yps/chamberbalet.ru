/**
 * Деплой-архив: то, что уходит в корень сайта, и ничего больше.
 *
 *     ROBOTS=deny npm run build && npm run check && npm run pack
 *
 * Архив собирается ИЗ СОДЕРЖИМОГО dist/, а не из самой папки: при
 * распаковке в public_html файлы обязаны лечь сразу, без промежуточного
 * dist/. Проверяется здесь же — index.html должен оказаться на верхнем
 * уровне архива.
 *
 * Имя несёт хэш коммита: перепутать два архива на хостинге стоит дороже,
 * чем набрать восемь знаков.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, DIST, bytes } from './config.mjs';

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim();

const commit = sh('git', ['rev-parse', '--short=7', 'HEAD'], { cwd: ROOT });
const dirty = sh('git', ['status', '--porcelain'], { cwd: ROOT });
const name = `chamberbalet-06-${commit}-deploy.zip`;
const out = path.join(ROOT, name);

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/index.html не найден — сначала npm run build');
  process.exit(1);
}

/* robots.txt читаем, а не помним: сайт закрыт, и это надо видеть. */
const robots = fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8');

fs.rmSync(out, { force: true });
// -X: без метаданных платформы, чтобы архив был воспроизводим побайтно
sh('zip', ['-r', '-q', '-X', out, '.'], { cwd: DIST });

const listing = sh('unzip', ['-Z1', out]).split('\n');
const files = listing.filter((f) => !f.endsWith('/'));
const unpacked = files.reduce((s, f) => s + fs.statSync(path.join(DIST, f)).size, 0);
const buf = fs.readFileSync(out);
const sha = crypto.createHash('sha256').update(buf).digest('hex');

/* Обёртки быть не должно: index.html на верхнем уровне. */
const roots = new Set(listing.map((f) => f.split('/')[0]));
const problems = [];
if (!listing.includes('index.html')) problems.push('index.html не на верхнем уровне архива');
for (const bad of ['node_modules', 'src', 'scripts', 'media', 'package.json', 'package-lock.json', '.git', '.build'])
  if (roots.has(bad)) problems.push(`в архив попало: ${bad}`);

console.log(`\nАрхив для заливки — ${name}`);
console.log('   коммит          ', commit, dirty ? '(рабочее дерево грязное!)' : '(рабочее дерево чистое)');
console.log('   вес zip         ', `${buf.length} Б (${bytes(buf.length)})`);
console.log('   распакованный   ', `${unpacked} Б (${bytes(unpacked)})`);
console.log('   файлов          ', files.length, `в ${listing.length - files.length} каталогах`);
console.log('   robots.txt      ', JSON.stringify(robots));
console.log('   sha256          ', sha);
console.log('   верхний уровень ', [...roots].sort().join(', '));

if (problems.length) {
  console.error('\n   архив собран неправильно:');
  problems.forEach((p) => console.error('    ×', p));
  process.exit(1);
}
if (dirty) {
  console.error('\n   × рабочее дерево грязное: имя архива ссылается на коммит, которого нет.');
  process.exit(1);
}
console.log('\n   архив готов\n');
