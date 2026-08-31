/**
 * Снятие комментариев с того, что уходит браузеру.
 *
 * Зачем. Комментарии этого проекта — не украшение: в них записаны решения и
 * замеры, и вырезать их из ИСХОДНИКА нельзя. Но браузеру они не нужны, а
 * платит за них бюджет: замер на сборке правки 06 — 20,4 КиБ из 37,7 под
 * brotli, то есть больше половины гейта `code` уходило на текст, который
 * ни один браузер не читает.
 *
 * Отсюда разделение: в репозитории комментарии остаются целиком, в dist/ их
 * нет. Гейт при этом начинает мерить код, а не прозу, — и давление «сократи
 * комментарии, чтобы влезть в потолок» снимается совсем.
 *
 * Оставить их в сборке: BUILD_COMMENTS=keep npm run build
 *
 * Разбор посимвольный, с состояниями. Регулярное выражение здесь не годится:
 * в коде есть строки, шаблонные литералы и хотя бы один регулярный литерал
 * (/^(slow-)?2g$/ в hero-video.js), и наивный шаблон вырезал бы кусок из
 * любого из них молча. Молчаливая порча того, что уезжает на боевой сайт, —
 * ровно то, чего здесь быть не должно.
 */

/** Символы, после которых `/` начинает регулярный литерал, а не деление. */
const BEFORE_REGEX = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^', 'return', 'typeof', 'case', 'in', 'of', 'do', 'else']);

const isWord = (c) => /[A-Za-z0-9_$]/.test(c);

/** Последний значимый символ или слово перед позицией i. */
function prevToken(src, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j--;
  if (j < 0) return '';
  if (!isWord(src[j])) return src[j];
  let end = j + 1;
  while (j >= 0 && isWord(src[j])) j--;
  return src.slice(j + 1, end);
}

/**
 * @param src   исходный текст
 * @param lang  'js' или 'css' — в CSS нет ни // -комментариев, ни шаблонов
 */
export function stripComments(src, lang = 'js') {
  let out = '';
  let i = 0;
  const n = src.length;

  /**
   * Стек состояний. Шаблонный литерал и подстановка ${…} вложены друг в
   * друга произвольно глубоко: `a ${ `b ${c} d` } e` — законный код. Без
   * стека выход из первой же подстановки терял бы, что снаружи всё ещё
   * шаблон, и текст после неё разбирался бы как код. Тогда `/*` в хвосте
   * литерала съело бы всё до следующего звёздочка-слэш.
   *
   * 'code'     — обычный код (дно стека);
   * 'template' — внутри `…`;
   * { braces } — внутри ${…}, считаем вложенные фигурные скобки.
   */
  const stack = [{ mode: 'code' }];
  const top = () => stack[stack.length - 1];

  while (i < n) {
    const state = top();
    const c = src[i];
    const next = src[i + 1];

    /* --- внутри шаблонного литерала --- */
    if (state.mode === 'template') {
      if (c === '\\') { out += c + (next ?? ''); i += 2; continue; }
      if (c === '`') { out += c; i++; stack.pop(); continue; }
      if (c === '$' && next === '{') { out += '${'; i += 2; stack.push({ mode: 'code', braces: 0 }); continue; }
      out += c; i++;
      continue;
    }

    /* --- обычный код --- */

    // строки
    if (c === '"' || c === "'") {
      const quote = c;
      out += c; i++;
      while (i < n) {
        if (src[i] === '\\') { out += src[i] + (src[i + 1] ?? ''); i += 2; continue; }
        out += src[i];
        if (src[i] === quote) { i++; break; }
        i++;
      }
      continue;
    }

    // начало шаблонного литерала
    if (lang === 'js' && c === '`') { out += c; i++; stack.push({ mode: 'template' }); continue; }

    // конец подстановки ${…}: возвращаемся в шаблон
    if (lang === 'js' && state.braces !== undefined) {
      if (c === '{') { state.braces++; out += c; i++; continue; }
      if (c === '}') {
        if (state.braces === 0) { out += c; i++; stack.pop(); continue; }
        state.braces--; out += c; i++; continue;
      }
    }

    // регулярный литерал
    if (lang === 'js' && c === '/' && next !== '/' && next !== '*') {
      const prev = prevToken(src, i);
      if (BEFORE_REGEX.has(prev) || prev === '') {
        out += c; i++;
        let inClass = false;
        while (i < n) {
          if (src[i] === '\\') { out += src[i] + (src[i + 1] ?? ''); i += 2; continue; }
          if (src[i] === '[') inClass = true;
          else if (src[i] === ']') inClass = false;
          else if (src[i] === '/' && !inClass) { out += src[i]; i++; break; }
          else if (src[i] === '\n') break;              // не регулярка, страховка
          out += src[i]; i++;
        }
        while (i < n && /[gimsuyvd]/.test(src[i])) { out += src[i]; i++; }
        continue;
      }
    }

    // строчный комментарий
    if (lang === 'js' && c === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }

    // блочный комментарий
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      // Комментарий, занимавший строку целиком, уносит с собой и её отступ,
      // и перевод строки — иначе на его месте остаётся пустая строка.
      const lineStart = out.lastIndexOf('\n') + 1;
      if (!out.slice(lineStart).trim()) {
        out = out.slice(0, lineStart);
        while (i < n && (src[i] === ' ' || src[i] === '\t')) i++;
        if (src[i] === '\n') i++;
      }
      continue;
    }

    out += c; i++;
  }

  // Пустые строки, оставшиеся от снятых комментариев, схлопываем в одну.
  return out.replace(/\n[ \t]*(?=\n)/g, '').replace(/\n{3,}/g, '\n\n');
}
