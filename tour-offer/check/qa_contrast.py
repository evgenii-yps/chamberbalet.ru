"""Контроль читаемости: для каждого текстового блока берём цвет текста и самый неблагоприятный
пиксель фона под ним (фон рендерится без текста). Порог: 4.5:1, для крупного (≥24 px) — 3:1.
Также: кегль не меньше 7 pt.  Запуск: python3 check/qa_contrast.py   (из папки tour-offer)"""
import io, os, pathlib, re, sys
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent.parent
CHROME = os.environ.get("CHROME_PATH") or next((p for p in ("/opt/pw-browsers/chromium", "/usr/bin/chromium", "/usr/bin/google-chrome") if os.path.exists(p)), None)

def lin(c):
    c = c / 255.0
    return np.where(c <= .03928, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def lum(rgb):
    r, g, b = lin(rgb[..., 0]), lin(rgb[..., 1]), lin(rgb[..., 2])
    return .2126 * r + .7152 * g + .0722 * b

JS = """() => {
  const out = [];
  document.querySelectorAll('.page').forEach((pg, pi) => {
    const pr = pg.getBoundingClientRect();
    const w = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (w.nextNode()) {
      const n = w.currentNode; if (!n.textContent.trim()) continue;
      const e = n.parentElement; if (seen.has(e)) continue; seen.add(e);
      const cs = getComputedStyle(e);
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) { if (q.width < 2) continue;
        out.push({page: pi + 1, x: q.left - pr.left, y: q.top - pr.top + pi * pr.height, w: q.width, h: q.height,
          color: cs.color, size: parseFloat(cs.fontSize), weight: +cs.fontWeight, text: n.textContent.trim().slice(0, 40)}); }
    }
  });
  return out;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
    pg = b.new_page(viewport={"width": 794, "height": 1123}, device_scale_factor=1)
    pg.goto((HERE / "offer.html").as_uri()); pg.wait_for_load_state("networkidle")
    pg.add_style_tag(content="@media screen{.page{page-break-after:auto}}")
    items = pg.evaluate(JS)
    pg.add_style_tag(content="*{color:transparent!important;text-decoration-color:transparent!important}")
    shot = Image.open(io.BytesIO(pg.screenshot(full_page=True))).convert("RGB")
    b.close()

arr = np.asarray(shot).astype(float)
bad = 0; worst = {}
for it in items:
    m = re.match(r"rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)", it["color"])
    fg = np.array([int(m[1]), int(m[2]), int(m[3])], float)
    if m[4] and float(m[4]) == 0: continue
    x0, y0 = max(int(it["x"]), 0), max(int(it["y"]), 0)
    crop = arr[y0:int(it["y"] + it["h"]) + 1, x0:int(it["x"] + it["w"]) + 1]
    if crop.size == 0: continue
    lf = float(lum(fg[None, None, :])[0, 0]); lb = lum(crop).ravel()
    # самый неблагоприятный фон: для светлого текста — самый светлый пиксель (99-й перцентиль), для тёмного — самый тёмный
    lbg = np.percentile(lb, 99) if lf > .3 else np.percentile(lb, 1)
    ratio = (max(lf, lbg) + .05) / (min(lf, lbg) + .05)
    need = 3.0 if (it["size"] >= 24 or (it["size"] >= 18.66 and it["weight"] >= 700)) else 4.5
    pt = it["size"] * .75
    if ratio < need or pt < 7:
        bad += 1
        print(f"стр. {it['page']:>2}  контраст {ratio:4.2f} (нужно {need})  {pt:4.1f} pt  «{it['text']}»")
    worst[it["page"]] = min(worst.get(it["page"], 99), ratio)
print("минимальный контраст по страницам:", {k: round(v, 1) for k, v in worst.items()})
print("ПРОБЛЕМ:", bad)
sys.exit(1 if bad else 0)
