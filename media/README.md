# Медиа

Один файл `media.json` связывает слоты страницы с файлами. Пути — от корня
репозитория. Нет записи или нет файла — слот остаётся красивой заглушкой.

```json
{
  "hero-chamber": { "type": "bg",     "src": "media/hero-chamber.mp4", "poster": "media/hero-chamber.webp" },
  "hero-big":     { "type": "bg",     "src": "media/hero-big.mp4",     "poster": "media/hero-big.webp" },
  "video-main":   { "type": "inline", "src": "media/main.mp4", "preview": "media/main-preview.mp4",
                    "poster": "media/main.webp", "caption": "«Щелкунчик», Дом Архитектора" },
  "scale-1":      { "type": "img",    "src": "media/scale-1.jpg", "alt": "Кордебалет лебедей" },
  "clients-video":{ "type": "bg",     "src": "media/clients-loop.mp4", "full": "media/clients-full.mp4", "poster": "media/clients.webp" },
  "qr-rider":     { "type": "qr",     "url": "https://…/techrider.pdf" }
}
```

| Тип | Что делает |
|---|---|
| `bg` | фон: `muted loop playsinline`, грузится при приближении, пауза вне экрана; при `prefers-reduced-motion` и `Save-Data` — только постер. Файл ≤ 3 МБ, постер ≤ 120 КБ |
| `inline` | постер + превью-петля (hover / центр экрана) + кнопка Play → полноэкранный плеер |
| `img` | webp + jpg, `srcset` 640 / 1280 / 1920, `loading="lazy"`; источник от 2400 px |
| `qr` | QR при сборке из `url` (без внешних сервисов) |

## Слоты

| id | Где | Тип |
|---|---|---|
| `hero-chamber`, `hero-big` | первый экран, левая и правая половины | bg |
| `scale-1`, `scale-2`, `scale-gala` | «Один спектакль — два масштаба» | img |
| `ch-1`, `ch-3`, `ch-5` / `ch-2`, `ch-4` | главы вечера (фото / видео) | img / inline |
| `video-main`, `video-v1`…`video-v4` | видеозал | inline |
| `poster-1`…`poster-4` | афиши репертуара (3:4) | img |
| `director`, `face-1`…`face-8`, `person-1`…`person-3` | портреты | img |
| `clients-video` | «Заказчикам», во всю ширину (`full` — полная версия по Play) | bg |
| `step-1`…`step-6` | компетенции | img |
| `tour-1`, `tour-2` | варианты оформления | img |
| `gal-1`…`gal-7` | мозаика «Кадры» | img |
| `qr-rider`, `qr-archive`, `qr-tg` | QR | qr |

`media/originals/` — исходники прежней съёмки, в сборку не входят.
