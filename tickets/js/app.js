/* ═══════════════════════════════════════════════════════════════════
   Камерный театр балета — весь клиентский код прототипа.
   Один файл, без модулей, без сборки, без зависимостей.
   Роутера, стейт-менеджера, шаблонизатора и аналитики здесь нет
   и быть не должно (ТЗ, раздел 6).
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ═════════ ДАННЫЕ ═════════
     Основной источник — data/events.json. При открытии страницы
     двойным щелчком (протокол file://) браузер блокирует fetch к
     локальному файлу как cross-origin, поэтому здесь лежит точная
     копия того же JSON. Копия используется ТОЛЬКО если fetch не
     удался. Значения — заглушки пакета, менять их нельзя. */

  var FALLBACK = {
    events: [
      {
        id: "chopiniana-2026-11-14",
        date: "2026-11-14",
        title: "Шопениана при свечах",
        venue: {
          name: "Особняк Кочубея, Белый зал",
          address: "Фурштатская, 24",
          capacity: 120,
          entrance: "Двор проходной, вход в правое крыло, второй этаж"
        },
        durationMin: 70,
        interval: false,
        programme: [
          { title: "«Сильфиды»: Ноктюрн, соч. 32 № 2", durationMin: 8 },
          { title: "Вальс, соч. 70 № 1 · па-де-де", durationMin: 6 },
          { title: "«Умирающий лебедь», Сен-Санс", durationMin: 3 },
          { title: "Мазурка, соч. 33 № 2 · финал", durationMin: 11 }
        ],
        seatings: [
          { time: "19:00", priceFrom: 2400, status: "on", seatsLeft: 43, ticketUrl: "https://example.invalid/widget/chopiniana-1900" },
          { time: "21:00", priceFrom: 3000, status: "low", seatsLeft: 6, ticketUrl: "https://example.invalid/widget/chopiniana-2100" }
        ]
      },
      {
        id: "modern-2026-11-21",
        date: "2026-11-21",
        title: "Вечер современной хореографии",
        venue: {
          name: "Оранжерея Таврического сада",
          address: "Потёмкинская, 2",
          capacity: 180,
          entrance: "Главный вход с Потёмкинской, гардероб слева"
        },
        durationMin: 80,
        interval: false,
        programme: [
          { title: "Первое отделение · три миниатюры", durationMin: 34 },
          { title: "Второе отделение · одноактный балет", durationMin: 46 }
        ],
        seatings: [
          { time: "19:00", priceFrom: 2800, status: "sold", seatsLeft: 0, ticketUrl: null },
          { time: "21:00", priceFrom: 2800, status: "on", seatsLeft: 96, ticketUrl: "https://example.invalid/widget/modern-2100" }
        ]
      }
    ]
  };

  function loadEvents(done) {
    var fail = function () { done(FALLBACK.events, "встроенная копия"); };
    if (typeof window.fetch !== "function") { fail(); return; }
    var p;
    try { p = window.fetch("data/events.json", { cache: "no-store" }); }
    catch (e) { fail(); return; }
    if (!p || typeof p.then !== "function") { fail(); return; }
    p.then(function (r) {
      if (!r.ok) { throw new Error("HTTP " + r.status); }
      return r.json();
    }).then(function (json) {
      if (!json || !json.events || !json.events.length) { throw new Error("пустой JSON"); }
      done(json.events, "data/events.json");
    })["catch"](function () { fail(); });
  }

  /* ═════════ ФОРМАТ ═════════
     Даты — через Intl, не таблицей строк. Русский набор обязателен:
     неразрывный пробел перед ₽, тире в диапазонах. */

  var NBSP = " ";
  var MDASH = "—";

  var fmtDayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
  var fmtWeekday = new Intl.DateTimeFormat("ru-RU", { weekday: "long" });
  var fmtNumber = new Intl.NumberFormat("ru-RU");
  var pluralRu = new Intl.PluralRules("ru-RU");

  /* Дата вечера в местном часовом поясе, без сдвига через UTC. */
  function parseDate(iso) {
    var p = String(iso).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  /* «14» и «ноября» отдельно: месяц нужен в родительном падеже,
     а он появляется только рядом с числом. Отсюда formatToParts. */
  function dayMonth(d) {
    var out = { day: "", month: "" };
    fmtDayMonth.formatToParts(d).forEach(function (part) {
      if (part.type === "day") { out.day = part.value; }
      if (part.type === "month") { out.month = part.value; }
    });
    return out;
  }

  function weekday(d) { return fmtWeekday.format(d); }

  function plural(n, one, few, many) {
    var f = pluralRu.select(n);
    if (f === "one") { return one; }
    if (f === "few") { return few; }
    return many;
  }

  function money(rub) { return fmtNumber.format(rub) + NBSP + "₽"; }

  function minutes(n) { return n + NBSP + plural(n, "минута", "минуты", "минут"); }

  function seats(n) { return n + NBSP + plural(n, "место", "места", "мест"); }

  /* 19:00 + 70 минут → «19:00—20:10». Тире, не дефис. */
  function timeRange(start, durationMin) {
    var p = start.split(":");
    var total = Number(p[0]) * 60 + Number(p[1]) + durationMin;
    var hh = Math.floor(total / 60) % 24;
    var mm = total % 60;
    return start + MDASH + (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined && text !== null) { n.textContent = text; }
    return n;
  }

  /* ═════════ ОБЩЕЕ ДЛЯ АФИШИ И СТРАНИЦЫ ВЕЧЕРА ═════════ */

  function isPast(ev) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return parseDate(ev.date) < today;
  }

  function byDate(a, b) { return parseDate(a.date) - parseDate(b.date); }

  function venueLine(ev) {
    var bits = [ev.venue.name];
    if (ev.venue.address) { bits.push(ev.venue.address); }
    bits.push(seats(ev.venue.capacity));
    bits.push(minutes(ev.durationMin) + (ev.interval ? ", с антрактом" : " без антракта"));
    return bits.join(" · ");
  }

  /* Строка сеанса. Три состояния, три вида — ТЗ 5.2.
     «Продано» не окрашивается: аншлаг не авария. */
  function buildSeating(seat, opts) {
    var row = el("div", "seating");
    var gone = seat.status === "sold";
    if (gone) { row.className += " seating--gone"; }

    var time = el("div", "seating__time");
    time.appendChild(document.createTextNode(seat.time));
    row.appendChild(time);

    var meta = el("div", "seating__meta");
    var price = el("span", "seating__price", (gone ? "" : "от ") + money(seat.priceFrom));
    meta.appendChild(price);

    if (gone) {
      meta.appendChild(el("span", "note", "Все билеты проданы"));
    } else if (seat.seatsLeft === null || seat.seatsLeft === undefined) {
      meta.appendChild(el("span", "note", "Оператор не отдаёт число мест"));
    } else if (seat.status === "low") {
      meta.appendChild(el("span", "pill pill--low", "осталось " + seat.seatsLeft));
    } else {
      meta.appendChild(el("span", "pill pill--ok", "свободно " + seat.seatsLeft));
    }
    row.appendChild(meta);

    if (gone || !seat.ticketUrl) {
      var off = el("button", "btn btn--outline", "Продано");
      off.type = "button";
      off.disabled = true;
      row.appendChild(off);
    } else {
      var buy = el("a", "btn btn--ticket", "Купить билет");
      buy.href = seat.ticketUrl;
      buy.setAttribute("aria-label", "Купить билет на " + (opts && opts.label ? opts.label + ", " : "") + "сеанс " + seat.time + ", цена от " + money(seat.priceFrom));
      row.appendChild(buy);
    }
    return row;
  }

  function buildSeatings(ev) {
    var box = el("div", "seatings");
    var dm = dayMonth(parseDate(ev.date));
    ev.seatings.forEach(function (s) {
      box.appendChild(buildSeating(s, { label: dm.day + " " + dm.month }));
    });
    return box;
  }

  function buildProgramme(ev, withTotal) {
    var list = el("ul", "programme");
    ev.programme.forEach(function (num) {
      var li = document.createElement("li");
      li.appendChild(el("span", null, num.title));
      li.appendChild(el("span", null, num.durationMin + NBSP + "мин"));
      list.appendChild(li);
    });
    if (!withTotal) { return list; }
    var wrapper = document.createDocumentFragment();
    wrapper.appendChild(list);
    var sum = ev.programme.reduce(function (acc, n) { return acc + n.durationMin; }, 0);
    var total = el("div", "programme__total");
    total.appendChild(el("span", null, "Чистое время номеров"));
    total.appendChild(el("span", null, sum + NBSP + "мин"));
    wrapper.appendChild(total);
    return wrapper;
  }

  /* Залы в футере — из тех же данных, чтобы не держать второй список. */
  function renderFootVenues(events) {
    var host = document.getElementById("foot-venues");
    if (!host) { return; }
    var seen = {};
    var rows = [];
    events.slice().sort(byDate).forEach(function (ev) {
      if (seen[ev.venue.name]) { return; }
      seen[ev.venue.name] = true;
      rows.push(ev.venue);
    });
    if (!rows.length) { return; }
    host.textContent = "";
    rows.forEach(function (v) {
      var li = el("li", "foot-venue");
      li.appendChild(el("b", "foot-venue__name", v.name));
      li.appendChild(document.createTextNode(v.address + " · Санкт\u2011Петербург · " + seats(v.capacity)));
      host.appendChild(li);
    });
    var note = el("li", "note");
    note.textContent = "Адреса и вместимость — заглушки: договоры с площадками не подписаны.";
    host.appendChild(note);
  }

  /* ═════════ АФИША ═════════ */

  function renderAfisha(events) {
    var host = document.getElementById("events");
    if (!host) { return; }
    host.textContent = "";

    var list = events.filter(function (e) { return !isPast(e); }).sort(byDate);

    if (!list.length) {
      host.appendChild(el("p", "empty", "Ближайшие даты ещё не объявлены. Афиша на квартал появляется здесь за месяц до первого вечера."));
      return;
    }

    list.forEach(function (ev) {
      var d = parseDate(ev.date);
      var dm = dayMonth(d);

      var card = el("article", "event");

      var rail = el("div", "event__rail");
      var col = document.createElement("div");
      col.appendChild(el("div", "event__day", dm.day));
      col.appendChild(el("div", "event__mon", dm.month));
      rail.appendChild(col);
      rail.appendChild(el("div", "event__wd", weekday(d)));
      card.appendChild(rail);

      var body = el("div", "event__body");

      var head = document.createElement("div");
      var h3 = el("h3", "event__title");
      var link = el("a", null, ev.title);
      link.href = "event.html?id=" + encodeURIComponent(ev.id);
      h3.appendChild(link);
      head.appendChild(h3);
      head.appendChild(el("div", "event__where", venueLine(ev)));
      body.appendChild(head);

      body.appendChild(buildProgramme(ev, false));
      body.appendChild(buildSeatings(ev));

      var more = el("a", "btn btn--outline start", "Программа, зал и как войти");
      more.href = "event.html?id=" + encodeURIComponent(ev.id);
      body.appendChild(more);

      card.appendChild(body);
      host.appendChild(card);
    });
  }

  /* ═════════ СТРАНИЦА ВЕЧЕРА ═════════ */

  function currentId() {
    var q = window.location.search;
    if (!q) { return ""; }
    var pairs = q.replace(/^\?/, "").split("&");
    for (var i = 0; i < pairs.length; i += 1) {
      var kv = pairs[i].split("=");
      if (decodeURIComponent(kv[0]) === "id") {
        return decodeURIComponent((kv[1] || "").replace(/\+/g, " "));
      }
    }
    return "";
  }

  function renderNotFound(id) {
    var host = document.getElementById("event-page");
    var miss = document.getElementById("event-missing");
    /* Блок удаляется, а не прячется: иначе на странице оказывается два h1. */
    if (host && host.parentNode) { host.parentNode.removeChild(host); }
    if (!miss) { return; }
    miss.hidden = false;
    var line = document.getElementById("event-missing-id");
    if (line) {
      line.textContent = id
        ? "Вечера с адресом «" + id + "» в афише нет: дата прошла или ссылка набрана с опечаткой."
        : "В адресе страницы не указан вечер.";
    }
    document.title = "Вечер не найден — Камерный театр балета";
  }

  function renderEventPage(events) {
    var id = currentId();
    var ev = null;
    events.forEach(function (e) { if (e.id === id) { ev = e; } });
    if (!ev) { renderNotFound(id); return; }

    var miss = document.getElementById("event-missing");
    if (miss && miss.parentNode) { miss.parentNode.removeChild(miss); }

    var d = parseDate(ev.date);
    var dm = dayMonth(d);

    document.title = ev.title + ", " + dm.day + " " + dm.month + " — Камерный театр балета";

    document.getElementById("evt-date").textContent = dm.day + " " + dm.month;
    document.getElementById("evt-wd").textContent = weekday(d);
    document.getElementById("evt-title").textContent = ev.title;

    /* Зал, адрес, вместимость, хронометраж, антракт, как войти. */
    var facts = document.getElementById("evt-facts");
    var rows = [
      ["Зал", ev.venue.name],
      ["Адрес", ev.venue.address + " · Санкт‑Петербург"],
      ["Вместимость", seats(ev.venue.capacity)],
      ["Хронометраж", minutes(ev.durationMin) + (ev.interval ? ", с антрактом" : " без антракта")],
      ["Сеансы", ev.seatings.map(function (s) { return timeRange(s.time, ev.durationMin); }).join(" и ")]
    ];
    rows.forEach(function (r) {
      var row = el("div", "facts__row");
      row.appendChild(el("dt", "facts__k", r[0]));
      row.appendChild(el("dd", "facts__v", r[1]));
      facts.appendChild(row);
    });

    document.getElementById("evt-entrance").textContent = ev.venue.entrance;

    var prog = document.getElementById("evt-programme");
    prog.appendChild(buildProgramme(ev, true));

    document.getElementById("evt-seatings").appendChild(buildSeatings(ev));

    var stubCap = document.getElementById("evt-photo-cap");
    if (stubCap) { stubCap.textContent = "здесь фотография зала: " + ev.venue.name; }

    buildSticky(ev, dm);
  }

  /* Липкая кнопка ведёт на ближайший доступный сеанс.
     На десктопе она перестаёт быть липкой — правило в components.css. */
  function buildSticky(ev, dm) {
    var host = document.getElementById("sticky");
    if (!host) { return; }
    var next = null;
    ev.seatings.forEach(function (s) {
      if (!next && s.status !== "sold" && s.ticketUrl) { next = s; }
    });

    var inner = el("div", "btn-sticky__in");
    var meta = el("div", "btn-sticky__meta");

    if (!next) {
      meta.appendChild(el("span", "btn-sticky__time", dm.day + " " + dm.month));
      meta.appendChild(el("span", "btn-sticky__price", "оба сеанса распроданы"));
      inner.appendChild(meta);
      var off = el("button", "btn btn--outline", "Продано");
      off.type = "button";
      off.disabled = true;
      inner.appendChild(off);
    } else {
      meta.appendChild(el("span", "btn-sticky__time", next.time));
      meta.appendChild(el("span", "btn-sticky__price", "от " + money(next.priceFrom)));
      inner.appendChild(meta);
      var buy = el("a", "btn btn--ticket", "Купить билет");
      buy.href = next.ticketUrl;
      buy.setAttribute("aria-label", "Купить билет на сеанс " + next.time + ", " + dm.day + " " + dm.month + ", цена от " + money(next.priceFrom));
      inner.appendChild(buy);
    }
    host.appendChild(inner);
    host.hidden = false;
  }

  /* ═════════ ВИТРИНА ДИЗАЙН-СИСТЕМЫ ═════════ */

  var ROLES = [
    ["--ground-0", "Основной грунт страницы"],
    ["--ground-1", "Панель, вложенный блок"],
    ["--ground-2", "Приподнятая поверхность, hover"],
    ["--rule", "Волосяная линейка внутри блока"],
    ["--rule-hi", "Рамка интерактивного элемента"],
    ["--ink-0", "Основной текст, заливка CTA"],
    ["--ink-1", "Вторичный текст, описания"],
    ["--ink-2", "Подписи, «продано», плейсхолдеры"],
    ["--patina", "Акцент: линейки, метки, приводка"],
    ["--patina-soft", "Тихая заливка акцента"],
    ["--ochre", "Мало мест, ошибка поля"],
    ["--focus", "Кольцо фокуса, 2 px + offset 3"]
  ];

  var SCALE = [
    ["--t-100", 12, "Метки, счётчик мест"],
    ["--t-200", 13, "Подписи, хронометраж, служебное"],
    ["--t-300", 15, "Интерфейс, кнопки, программа"],
    ["--t-400", 17, "Основной текст"],
    ["--t-500", 20, "Лид, подзаголовок блока"],
    ["--t-600", 24, "Заголовок панели"],
    ["--t-700", 29, "Время сеанса, заголовок секции"],
    ["--t-800", 36, "Название программы"],
    ["--t-900", 45, "Крупная дата"],
    ["--t-1000", 58, "Число дня в афише"],
    ["--t-afisha", 0, "Первый экран, fluid clamp"]
  ];

  var SPACERS = [
    ["--s-1", 2], ["--s-2", 4], ["--s-3", 8], ["--s-4", 12], ["--s-5", 18],
    ["--s-6", 28], ["--s-7", 44], ["--s-8", 72], ["--s-9", 116]
  ];

  var MOTION = [
    ["110 мс · --ease-tap", "Наведение, нажатие, смена цвета", "var(--dur-tap) var(--ease-tap)"],
    ["240 мс · --ease-enter", "Появление: раскрытие программы, тост", "var(--dur-enter) var(--ease-enter)"],
    ["160 мс · --ease-exit", "Уход: закрытие, скрытие тоста", "var(--dur-exit) var(--ease-exit)"]
  ];

  var BUTTON_GROUPS = [
    ["Билет · основное действие", [
      ["ticket-lg", "rest → hover → active"],
      ["ticket-loading", "loading"],
      ["ticket-disabled", "disabled"]
    ]],
    ["Контур · второстепенное", [
      ["outline", "rest → hover"],
      ["outline-sm", "small 36 px"],
      ["outline-disabled", "disabled"]
    ]],
    ["Тихая · третьестепенное", [
      ["quiet", "подчёркивание 1 → 3 px"]
    ]]
  ];

  function makeDemoButton(kind) {
    var b = document.createElement("button");
    b.type = "button";
    if (kind === "ticket-lg") { b.className = "btn btn--ticket btn--lg"; b.textContent = "Купить билет · 19:00"; }
    if (kind === "ticket-loading") { b.className = "btn btn--ticket"; b.textContent = "Купить билет"; b.setAttribute("data-loading", "true"); }
    if (kind === "ticket-disabled") { b.className = "btn btn--ticket"; b.textContent = "Купить билет"; b.disabled = true; }
    if (kind === "outline") { b.className = "btn btn--outline"; b.textContent = "Программа вечера"; }
    if (kind === "outline-sm") { b.className = "btn btn--outline btn--sm"; b.textContent = "Как пройти"; }
    if (kind === "outline-disabled") { b.className = "btn btn--outline"; b.textContent = "Продано"; b.disabled = true; }
    if (kind === "quiet") { b.className = "btn btn--quiet"; b.textContent = "Все вечера ноября"; }
    return b;
  }

  function initSystem() {
    /* образцы цвета */
    Array.prototype.forEach.call(document.querySelectorAll("[data-swatches]"), function (host) {
      var frag = document.createDocumentFragment();
      ROLES.forEach(function (r) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sw";
        b.setAttribute("data-var", r[0]);
        var chip = el("div", "sw__chip");
        chip.style.background = "var(" + r[0] + ")";
        var meta = el("div", "sw__meta");
        meta.appendChild(el("span", "sw__name", r[0]));
        meta.appendChild(el("span", "sw__use", r[1]));
        b.appendChild(chip);
        b.appendChild(meta);
        frag.appendChild(b);
      });
      host.appendChild(frag);
    });

    /* шкала кегля */
    var ts = document.getElementById("typescale");
    if (ts) {
      SCALE.forEach(function (s) {
        var row = el("div", "scale-row");
        row.appendChild(el("code", null, s[0]));
        row.appendChild(el("span", "px", s[1] ? s[1] + " px" : "44—104"));
        var spec = el("div", "spec afisha", "Балет 19:00");
        spec.style.fontSize = s[0] === "--t-afisha" ? "clamp(2rem, 1rem + 4vw, 3.5rem)" : "var(" + s[0] + ")";
        row.appendChild(spec);
        row.appendChild(el("span", "px", s[2]));
        ts.appendChild(row);
      });
    }

    /* отступы */
    var sph = document.getElementById("spacers");
    if (sph) {
      SPACERS.forEach(function (s) {
        var row = el("div", "spacer-row");
        row.appendChild(el("code", null, s[0]));
        row.appendChild(el("span", "note tab", s[1] + " px"));
        var bar = el("div", "spacer-bar");
        bar.style.width = Math.min(s[1], 116) + "px";
        row.appendChild(bar);
        sph.appendChild(row);
      });
    }

    /* кнопки: все состояния, на обоих грунтах */
    Array.prototype.forEach.call(document.querySelectorAll("[data-buttons]"), function (host) {
      BUTTON_GROUPS.forEach(function (g) {
        var cell = el("div", "state-cell");
        cell.appendChild(el("div", "state-label", g[0]));
        var row = el("div", "row gap-5");
        row.style.rowGap = "var(--s-4)";
        g[1].forEach(function (item) {
          var one = el("div", "stack gap-3 start");
          one.appendChild(makeDemoButton(item[0]));
          one.appendChild(el("span", "note", item[1]));
          row.appendChild(one);
        });
        cell.appendChild(row);
        host.appendChild(cell);
      });
    });

    /* движение */
    var mh = document.getElementById("motion-demos");
    var tracks = [];
    if (mh) {
      MOTION.forEach(function (m) {
        var block = el("div", "stack gap-3");
        block.appendChild(el("div", "state-label", m[0] + " — " + m[1]));
        var track = el("div", "motion-track");
        var dot = el("div", "motion-dot");
        dot.style.transition = "transform " + m[2];
        track.appendChild(dot);
        block.appendChild(track);
        mh.appendChild(block);
        tracks.push(track);
      });
    }
    var runBtn = document.getElementById("motion-run");
    if (runBtn) {
      runBtn.addEventListener("click", function () {
        tracks.forEach(function (t) {
          t.style.setProperty("--travel", Math.max(40, t.clientWidth - 44) + "px");
          t.setAttribute("data-run", "true");
        });
        window.setTimeout(function () {
          tracks.forEach(function (t) { t.removeAttribute("data-run"); });
        }, 900);
      });
    }

    /* демонстрационная карточка вечера на витрине — из тех же данных */
    loadEvents(function (events) {
      Array.prototype.forEach.call(document.querySelectorAll("[data-system-events]"), function (host) {
        events.slice().sort(byDate).forEach(function (ev) {
          var d = parseDate(ev.date);
          var dm = dayMonth(d);
          var card = el("article", "event");
          var rail = el("div", "event__rail");
          var col = document.createElement("div");
          col.appendChild(el("div", "event__day", dm.day));
          col.appendChild(el("div", "event__mon", dm.month));
          rail.appendChild(col);
          rail.appendChild(el("div", "event__wd", weekday(d)));
          card.appendChild(rail);
          var body = el("div", "event__body");
          var head = document.createElement("div");
          head.appendChild(el("h3", "event__title", ev.title));
          head.appendChild(el("div", "event__where", venueLine(ev)));
          body.appendChild(head);
          if (ev.programme.length > 2) { body.appendChild(buildProgramme(ev, false)); }
          body.appendChild(buildSeatings(ev));
          card.appendChild(body);
          host.appendChild(card);
        });
      });
      var versus = document.getElementById("versus-event");
      if (versus && events.length) {
        var ev0 = events[0];
        var d0 = parseDate(ev0.date);
        var dm0 = dayMonth(d0);
        var card0 = el("article", "event");
        var rail0 = el("div", "event__rail");
        var col0 = document.createElement("div");
        col0.appendChild(el("div", "event__day", dm0.day));
        col0.appendChild(el("div", "event__mon", dm0.month));
        rail0.appendChild(col0);
        rail0.appendChild(el("div", "event__wd", weekday(d0)));
        card0.appendChild(rail0);
        var body0 = el("div", "event__body");
        body0.appendChild(el("h3", "event__title", ev0.title));
        body0.appendChild(el("div", "event__where", ev0.venue.name + " · " + seats(ev0.venue.capacity) + " · " + minutes(ev0.durationMin)));
        var box0 = el("div", "seatings");
        box0.appendChild(buildSeating(ev0.seatings[0], { label: dm0.day + " " + dm0.month }));
        body0.appendChild(box0);
        card0.appendChild(body0);
        versus.appendChild(card0);
      }
    });

    initToast();
  }

  /* копирование имени токена по щелчку на образце */
  function initToast() {
    var toast = document.getElementById("toast");
    if (!toast) { return; }
    var timer = null;
    function show(msg) {
      toast.textContent = msg;
      toast.setAttribute("data-show", "true");
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { toast.removeAttribute("data-show"); }, 1600);
    }
    function fallbackCopy(text) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        show("Скопировано: " + text);
      } catch (e) { show(text); }
    }
    document.addEventListener("click", function (ev) {
      var sw = ev.target.closest ? ev.target.closest(".sw") : null;
      if (!sw) { return; }
      var text = "var(" + sw.getAttribute("data-var") + ")";
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { show("Скопировано: " + text); }, function () { fallbackCopy(text); });
          return;
        }
      } catch (e) { /* нет доступа к буферу — уходим в запасной путь */ }
      fallbackCopy(text);
    });
  }

  /* ═════════ ЗАПУСК ═════════ */

  function start() {
    var page = document.body.getAttribute("data-page");
    if (page === "system") { initSystem(); return; }
    loadEvents(function (events, source) {
      if (page === "afisha") { renderAfisha(events); }
      if (page === "event") { renderEventPage(events); }
      renderFootVenues(events);
      var src = document.getElementById("data-source");
      if (src) { src.textContent = source; }
      document.documentElement.setAttribute("data-ready", "true");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
