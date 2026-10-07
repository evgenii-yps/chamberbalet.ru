"""Сборка: python3 build.py   (нужны playwright + chromium, pillow, numpy, poppler-utils)
Фото -> img/, HTML -> Гастрольное_предложение.pdf, превью страниц -> preview/, превью.jpg."""
import os, pathlib, subprocess, sys
from playwright.sync_api import sync_playwright
import photos

HERE = pathlib.Path(__file__).parent
PDF = HERE / "Гастрольное_предложение.pdf"
CHROME = os.environ.get("CHROME_PATH") or next(
    (p for p in ("/opt/pw-browsers/chromium", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome") if os.path.exists(p)), None)

photos.build_all()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
    pg = b.new_page()
    pg.goto((HERE / "offer.html").as_uri())
    pg.wait_for_load_state("networkidle")
    pg.evaluate("document.fonts.ready")
    # проверка переполнения: дочерние блоки не должны вылезать за нижнее поле
    over = pg.evaluate("""() => [...document.querySelectorAll('.page')].map((s, i) => {
        const r = s.getBoundingClientRect(); let m = 0, who = '';
        s.querySelectorAll('*').forEach(e => { if (e.closest('.foot,.run') || e.tagName === 'IMG' || e.classList.contains('in')) return;
          if (e.children.length || !e.textContent.trim()) return;
          const q = e.getBoundingClientRect(); if (q.bottom - r.top > m) { m = q.bottom - r.top; who = (e.className || e.tagName) + ':' + e.textContent.trim().slice(0, 24) } });
        return [i + 1, Math.round(m / 3.7795 * 10) / 10, who] })""")
    for n, mm, who in over:
        flag = "  <-- ПЕРЕПОЛНЕНИЕ" if mm > 287 else ""
        print(f"стр. {n}: низ контента {mm} мм ({who}){flag}")
    pg.pdf(path=str(PDF), width="210mm", height="297mm", print_background=True, prefer_css_page_size=True)
    b.close()

pv = HERE / "preview"
pv.mkdir(exist_ok=True)
for f in pv.glob("*.jpg"):
    f.unlink()
subprocess.run(["pdftoppm", "-r", "110", "-jpeg", "-jpegopt", "quality=88", str(PDF), str(pv / "p")], check=True)
from PIL import Image
fs = sorted(pv.glob("p-*.jpg"))
ims = [Image.open(f) for f in fs]
w, h = 420, int(420 * 297 / 210)
cols = 6
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w + (cols + 1) * 14, rows * h + (rows + 1) * 14), (32, 30, 28))
for i, im in enumerate(ims):
    sheet.paste(im.resize((w, h), Image.LANCZOS), (14 + (i % cols) * (w + 14), 14 + (i // cols) * (h + 14)))
sheet.save(HERE / "превью.jpg", quality=88)
print("PDF:", PDF.name, round(PDF.stat().st_size / 1e6, 2), "МБ, страниц:", len(ims))
