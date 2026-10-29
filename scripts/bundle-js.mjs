/**
 * Сборка JS в один классический скрипт без import/export: модули src/js
 * заворачиваются в функции, импорты превращаются в деструктуризацию.
 * Один файл — один запрос, и тот же код целиком лезет в превью-артефакт.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { SRC } from './config.mjs';
import { stripComments } from './strip-comments.mjs';

const IMPORT = /^import\s+\{([^}]*)\}\s+from\s+'\.\/([\w.-]+)\.js';?[ \t]*\n/gm;
const EXPORT = /^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;

export async function bundleJs({ keepComments = false } = {}) {
  const dir = path.join(SRC, 'js');
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.js'));
  const mods = new Map();
  for (const f of files) {
    let code = await fs.readFile(path.join(dir, f), 'utf8');
    if (!keepComments) code = stripComments(code, 'js');
    const name = f.replace(/\.js$/, '');
    const imports = [...code.matchAll(IMPORT)].map((m) => ({ names: m[1].split(',').map((x) => x.trim()).filter(Boolean), from: m[2] }));
    const exports = [...code.matchAll(EXPORT)].map((m) => m[1]);
    code = code.replace(IMPORT, '').replace(/^export\s+/gm, '');
    mods.set(name, { code, imports, exports });
  }
  const order = [];
  const seen = new Set();
  const visit = (n, stack = []) => {
    if (seen.has(n)) return;
    if (stack.includes(n)) throw new Error(`циклический импорт: ${[...stack, n].join(' → ')}`);
    const m = mods.get(n);
    if (!m) throw new Error(`нет модуля ${n}`);
    for (const i of m.imports) visit(i.from, [...stack, n]);
    seen.add(n); order.push(n);
  };
  for (const n of mods.keys()) if (n !== 'main') visit(n);
  visit('main');

  let out = "(function(){'use strict';\nconst __m={};\n";
  for (const n of order) {
    const m = mods.get(n);
    const pre = m.imports.map((i) => `const {${i.names.join(',')}}=__m['${i.from}'];`).join('\n');
    out += `__m['${n}']=(function(){\n${pre}\n${m.code}\nreturn {${m.exports.join(',')}};\n})();\n`;
  }
  return out + '})();\n';
}
