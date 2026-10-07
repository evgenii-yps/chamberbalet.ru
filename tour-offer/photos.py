"""Обработка фото для предложения: кадрирование, затемнение, плавный переход в грунт,
рваный бумажный край. Результат — JPEG, уже «запечённый» на цвет страницы (img/*.jpg)."""
import pathlib
import numpy as np
from PIL import Image, ImageFilter

HERE = pathlib.Path(__file__).parent
SRC = HERE / "photos"
OUT = HERE / "img"
DPI = 200

GROUND = (0x13, 0x11, 0x10)
PAPER = (0xED, 0xEB, 0xE5)
FIBER = (0xD8, 0xCD, 0xB2)  # светлая кромка бумаги на разрыве

# имя: файл, размер на странице (мм), центр кадра (x, y), увеличение,
#      затемнение, переходы в грунт «сторона:доля», рваные края, фон страницы
SPECS = {
    "cover":      dict(src="00_зал_свечи_сверху", mm=(210, 178), focus=(.50, .47), zoom=1.3, dim=1.0, fade="b:.55", bg=GROUND),
    "about":      dict(src="22_балерина_портрет_гапиенко", mm=(70, 102), focus=(.5, .45), zoom=1.0, dim=.95, torn="tblr", bg=GROUND),
    "swan":       dict(src="01_зал_туман_дуэт", mm=(210, 100), focus=(.5, .5), zoom=1.0, dim=.92, fade="b:.5", bg=GROUND),
    "swan2":      dict(src="08_зрители_свечи", mm=(210, 46), focus=(.5, .5), zoom=1.0, dim=.8, fade="t:.55,b:.3", bg=GROUND),
    "nut":        dict(src="12_щелкунчик_надпись_свечи", mm=(210, 90), focus=(.5, .5), zoom=1.0, dim=.95, fade="b:.45", bg=GROUND),
    "nut2":       dict(src="02_щелкунчик_состав", mm=(210, 62), focus=(.5, .4), zoom=1.0, dim=.9, fade="t:.4,b:.3", bg=GROUND),
    "gala":       dict(src="04_пачка_свечи", mm=(88, 100), focus=(.42, .5), zoom=1.0, dim=.92, torn="tblr", bg=GROUND),
    "gala2":      dict(src="06_костюм_деталь", mm=(84, 62), focus=(.5, .5), zoom=1.0, dim=.9, torn="tblr", bg=GROUND),
    "rep":        dict(src="14_ноты_свечи_2", mm=(210, 62), focus=(.5, .5), zoom=1.0, dim=.8, fade="b:.6", bg=GROUND),
    "group":      dict(src="07_репетиция", mm=(52, 78), focus=(.5, .45), zoom=1.0, dim=1.0, torn="tblr", bg=PAPER),
    "stage":      dict(src="08_зрители_свечи", mm=(178, 36), focus=(.5, .5), zoom=1.0, dim=.95, torn="tblr", bg=PAPER),
    "contact":    dict(src="10_ёлка_камин_рояль", mm=(210, 176), focus=(.5, .5), zoom=1.0, dim=.95, fade="b:.5", bg=GROUND),
}


def crop(im, mm, focus, zoom):
    w, h = im.size
    ar = mm[0] / mm[1]
    cw, ch = (h * ar, h) if w / h > ar else (w, w / ar)
    cw, ch = cw / zoom, ch / zoom
    cx = min(max(focus[0] * w, cw / 2), w - cw / 2)
    cy = min(max(focus[1] * h, ch / 2), h - ch / 2)
    return im.crop((int(cx - cw / 2), int(cy - ch / 2), int(cx + cw / 2), int(cy + ch / 2)))


def smooth_noise(n, rng, octaves=((90, .5), (30, .35), (9, .22))):
    """Одномерный шум для линии разрыва: сумма сглаженных случайных рядов."""
    out = np.zeros(n)
    for period, amp in octaves:
        pts = rng.random(n // period + 3)
        x = np.arange(n) / period
        i = x.astype(int)
        f = x - i
        f = f * f * (3 - 2 * f)
        out += amp * (pts[i] * (1 - f) + pts[i + 1] * f)
    out += rng.normal(0, .02, n)
    return out


def torn_alpha(w, h, edges, amp_px, rng):
    """Альфа-маска (1 внутри) и полоса кромки для рваных краёв выбранных сторон."""
    alpha = np.ones((h, w))
    rim = np.zeros((h, w))
    yy, xx = np.mgrid[0:h, 0:w]
    for e in edges:
        if e in "tb":
            d = amp_px * (.35 + smooth_noise(w, rng))
            dist = yy if e == "t" else (h - 1 - yy)
            dd = d[None, :]
        else:
            d = amp_px * (.35 + smooth_noise(h, rng))
            dist = xx if e == "l" else (w - 1 - xx)
            dd = d[:, None]
        a = np.clip((dist - dd) / 1.6 + .5, 0, 1)
        r = np.clip(1 - np.abs(dist - dd - 3.0) / 5.0, 0, 1)
        alpha = np.minimum(alpha, a)
        rim = np.maximum(rim, r * a)
    return alpha, rim


def fade_alpha(w, h, fade):
    alpha = np.ones((h, w))
    for part in fade.split(","):
        side, frac = part.split(":")
        n = int((h if side in "tb" else w) * float(frac))
        ramp = np.linspace(0, 1, n) ** 1.7
        total = h if side in "tb" else w
        line = np.concatenate([ramp, np.ones(total - n)]) if side in "tl" else np.concatenate([np.ones(total - n), ramp[::-1]])
        alpha *= line[:, None] if side in "tb" else line[None, :]
    return alpha


def make(name, spec, seed=7):
    rng = np.random.default_rng(seed + sum(map(ord, name)))
    im = Image.open(SRC / (spec["src"] + ".jpg")).convert("RGB")
    im = crop(im, spec["mm"], spec["focus"], spec.get("zoom", 1.0))
    w = round(spec["mm"][0] / 25.4 * DPI)
    h = round(spec["mm"][1] / 25.4 * DPI)
    im = im.resize((w, h), Image.LANCZOS)
    a = np.asarray(im).astype(float) * spec.get("dim", 1.0)
    bg = np.array(spec["bg"], float)
    alpha = np.ones((h, w))
    if spec.get("fade"):
        alpha *= fade_alpha(w, h, spec["fade"])
    rim = np.zeros((h, w))
    if spec.get("torn"):
        ta, rim = torn_alpha(w, h, spec["torn"], amp_px=min(w, h) * .05, rng=rng)
        alpha *= ta
    out = a * alpha[..., None] + bg * (1 - alpha[..., None])
    if spec.get("torn"):
        fib = np.array(FIBER, float)
        k = (rim * .22)[..., None]
        out = out * (1 - k) + fib * k
    Image.fromarray(np.clip(out, 0, 255).astype("uint8")).save(OUT / (name + ".jpg"), quality=84, optimize=True, progressive=True)


def build_all():
    OUT.mkdir(exist_ok=True)
    for name, spec in SPECS.items():
        make(name, spec)
    return list(SPECS)


if __name__ == "__main__":
    print(build_all())
