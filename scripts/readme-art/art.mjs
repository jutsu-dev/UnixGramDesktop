// README artwork drawn from the theme catalog: the cover, the theme strip,
// the feature tiles, the licence cards, the download button and the closing rule.

// Titles, notes and colours repeat src/shared/theme/themes.ts; keep the two in step.
// OLED uses its control accent: its swatch accent is pure black.
const T = [
  ['native', 'UnixGram', '#6e5fe4', 'без изменений', '#08090d', '#15151c', '#f4f5fa'],
  ['midnight', 'Midnight', '#a097ff', 'сине-чёрная', '#0a0e1a', '#151d30', '#edf0ff'],
  ['oled', 'OLED', '#a397ff', 'чистый чёрный', '#000000', '#0b0b0e', '#ffffff'],
  ['graphite', 'Graphite', '#b3bdce', 'серая', '#121416', '#202328', '#f4f5f7'],
  ['aurora', 'Aurora', '#71dab5', 'зелёная', '#091612', '#142820', '#effffb'],
  ['light', 'Daylight', '#5948c7', 'светлая', '#f1f2f5', '#ffffff', '#191b24'],
  ['lucifer', 'Lucifer', '#e78a9d', 'в честь @Lucifer', '#10080b', '#241018', '#fff1f3'],
  ['basaltes', 'by basaltes', '#bb97ff', 'фиолетово-чёрная', '#08050e', '#191023', '#f7efff'],
  ['honey', 'Soft Honey', '#dfc171', 'тёплая жёлтая', '#15120b', '#272115', '#fff8e6'],
  ['ocean', 'Ocean', '#79c8ec', 'морская синяя', '#08131c', '#112635', '#ecf8ff'],
  ['rose', 'Rose', '#e9a4c2', 'дымчатая розовая', '#180f17', '#2c1c29', '#fff1f8'],
  ['forest', 'Forest', '#b7cc8c', 'хвойная зелёная', '#11160f', '#212b1b', '#f1f7e9'],
  ['mexican-pink', 'Mexican Pink', '#e4007c', 'в честь @cekc', '#140911', '#28121f', '#fff3f9'],
].map(([id, title, accent, note, bg, panel, text]) => ({ id, title, accent, note, bg, panel, text }))
const byId = Object.fromEntries(T.map((t) => [t.id, t]))
const N = T.length

const FONT = "'Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif"
const MONO = "ui-monospace,'Cascadia Mono','SF Mono',Consolas,'Liberation Mono',Menlo,monospace"
const r = (n) => Math.round(n * 100) / 100
const tidy = (svg) => svg.replace(/\n\s*/g, '\n').trim() + '\n'

// ---------------------------------------------------------------- hero
function hero(mode) {
  const dark = mode === 'dark'
  const W = 880
  const H = 420
  const bg = dark ? '#08090d' : '#f1f2f5'
  const fg = dark ? '#f4f5fa' : '#191b24'
  const glow = dark ? '#6e5fe4' : '#5948c7'
  const edge = dark ? '#ffffff' : '#191b24'
  const PX = 440
  const PY = 800
  const R = 582
  const step = 6
  const name = 'UnixGram Desktop: неофициальный клиент для Windows 10 и 11'
  const cards = T.map((t, i) => {
    const a = (i - (N - 1) / 2) * step
    const top = -R
    const light = t.id === 'light'
    const stroke = light ? '#191b24' : '#ffffff'
    return `<g class="card" style="--a:${a}deg" transform="rotate(${a})" filter="url(#s)">
      <rect x="-37" y="${top}" width="74" height="270" rx="13" fill="${t.bg}" stroke="${stroke}" stroke-opacity="${light ? 0.16 : 0.14}"/>
      <circle cx="0" cy="${top + 25}" r="9" fill="${t.accent}"/>
      <rect x="-28" y="${top + 46}" width="56" height="230" rx="9" fill="${t.panel}"/>
      <rect x="-20" y="${top + 60}" width="26" height="5" rx="2.5" fill="${t.text}" fill-opacity=".85"/>
      <rect x="-20" y="${top + 72}" width="40" height="5" rx="2.5" fill="${t.text}" fill-opacity=".3"/>
      <rect x="-20" y="${top + 84}" width="33" height="5" rx="2.5" fill="${t.text}" fill-opacity=".3"/>
      <rect x="-20" y="${top + 100}" width="26" height="11" rx="5.5" fill="${t.accent}"/>
    </g>`
  }).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${name}">
  <title>${name}</title>
  <style>
    .t{font-family:${FONT}}
    @media (prefers-reduced-motion:no-preference){
      .card{animation:open 1.6s cubic-bezier(.2,.75,.2,1) both}
      @keyframes open{from{transform:rotate(calc(var(--a)*.5))}to{transform:rotate(var(--a))}}
    }
  </style>
  <defs>
    <clipPath id="c"><rect width="${W}" height="${H}" rx="28"/></clipPath>
    <pattern id="d" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="1" fill="${fg}" fill-opacity="${dark ? 0.1 : 0.12}"/></pattern>
    <radialGradient id="g" cx="50%" cy="100%" r="62%"><stop offset="0" stop-color="${glow}" stop-opacity="${dark ? 0.42 : 0.2}"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg}" stop-opacity="0"/><stop offset="1" stop-color="${bg}" stop-opacity="${dark ? 0.5 : 0.35}"/></linearGradient>
    <filter id="s" x="-40%" y="-10%" width="180%" height="130%"><feDropShadow dx="-4" dy="2" stdDeviation="6" flood-color="${dark ? '#000' : '#191b24'}" flood-opacity="${dark ? 0.5 : 0.2}"/></filter>
  </defs>
  <g clip-path="url(#c)">
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <rect width="${W}" height="${H}" fill="url(#d)"/>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <g transform="translate(${PX} ${PY})">
      ${cards}
    </g>
    <rect y="${H - 70}" width="${W}" height="70" fill="url(#f)"/>
    <text class="t" x="440" y="62" text-anchor="middle" font-size="12.5" font-weight="600" letter-spacing="3.2" fill="${fg}" fill-opacity=".62">НЕОФИЦИАЛЬНЫЙ КЛИЕНТ · WINDOWS 10 / 11</text>
    <text class="t" x="440" y="146" text-anchor="middle" font-size="80" fill="${fg}"><tspan font-weight="800" letter-spacing="-1.5">UnixGram</tspan><tspan font-weight="300" dx="20" fill-opacity=".62">Desktop</tspan></text>
    ${T.map((t, i) => `<rect x="${440 - (N * 21 - 5) / 2 + i * 21}" y="176" width="16" height="4" rx="2" fill="${t.accent}"/>`).join('')}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="27.5" fill="none" stroke="${edge}" stroke-opacity="${dark ? 0.12 : 0.1}"/>
</svg>`
}

// ---------------------------------------------------------------- palette strip
function palette() {
  const W = 880
  const H = 276
  const sw = 58
  const gap = (W - N * sw) / (N - 1)
  const spines = T.map((t, i) => {
    const x = r(i * (sw + gap))
    const light = t.id === 'light'
    const n = String(i + 1).padStart(2, '0')
    return `<g transform="translate(${x} 2)">
      <rect x=".5" y=".5" width="${sw - 1}" height="271" rx="15" fill="${t.bg}" stroke="${light ? '#191b24' : '#8b90a0'}" stroke-opacity="${light ? 0.22 : 0.34}"/>
      <circle class="ring" style="animation-delay:${r(i * 0.45)}s" cx="${sw / 2}" cy="30" r="11" fill="none" stroke="${t.accent}" stroke-width="2" opacity="0"/>
      <circle cx="${sw / 2}" cy="30" r="11" fill="${t.accent}"/>
      <rect x="5" y="56" width="${sw - 10}" height="211" rx="11" fill="${t.panel}"/>
      <text class="m" x="${sw / 2}" y="78" text-anchor="middle" font-size="10.5" fill="${t.accent}">${n}</text>
      <rect x="14" y="92" width="20" height="4" rx="2" fill="${t.text}" fill-opacity=".8"/>
      <rect x="14" y="101" width="30" height="4" rx="2" fill="${t.text}" fill-opacity=".28"/>
      <rect x="14" y="110" width="25" height="4" rx="2" fill="${t.text}" fill-opacity=".28"/>
      <rect x="14" y="121" width="20" height="9" rx="4.500" fill="${t.accent}"/>
      <text class="t" transform="translate(26 254) rotate(-90)" font-size="16" font-weight="700" fill="${t.text}">${t.title}</text>
      <text class="t" transform="translate(44 254) rotate(-90)" font-size="11.5" fill="${t.text}" fill-opacity=".7">${t.note}</text>
    </g>`
  }).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${N} тем UnixGram Desktop">
  <title>${N} тем UnixGram Desktop</title>
  <style>
    .t{font-family:${FONT}}
    .m{font-family:${MONO}}
    text{text-rendering:geometricPrecision}
    @media (prefers-reduced-motion:no-preference){
      .ring{transform-box:fill-box;transform-origin:center;animation:ring ${r(N * 0.45)}s ease-out infinite}
      @keyframes ring{0%{transform:scale(1);opacity:.75}16%{transform:scale(1.55);opacity:0}100%{transform:scale(1.55);opacity:0}}
    }
  </style>
  ${spines}
</svg>`
}

// ---------------------------------------------------------------- bento
function bento() {
  const W = 880
  const gap = 12
  const cw = (W - 3 * gap) / 4
  const rows = [208, 212, 204]
  const H = rows[0] + rows[1] + rows[2] + 2 * gap
  const col = (c) => c * (cw + gap)
  const rowY = [0, rows[0] + gap, rows[0] + rows[1] + 2 * gap]
  const span = (n) => n * cw + (n - 1) * gap

  const tile = (c, rw, n, id, title, lines, art) => {
    const t = byId[id]
    const x = col(c)
    const y = rowY[rw]
    const w = span(n)
    const h = rows[rw]
    const light = id === 'light'
    const fill = light ? t.bg : t.panel
    const inset = light ? '#ffffff' : t.bg
    const last = y + h - 20
    const body = lines.map((line, k) => `<text class="t" x="${x + 20}" y="${last - (lines.length - 1 - k) * 18}" font-size="13" fill="${t.text}" fill-opacity=".74">${line}</text>`).join('\n')
    const titleY = last - (lines.length - 1) * 18 - 24
    return `<g>
      <rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="20" fill="${fill}" stroke="${light ? '#191b24' : t.accent}" stroke-opacity="${light ? 0.18 : 0.3}"/>
      <circle cx="${x + w - 22}" cy="${y + 23}" r="3.5" fill="${t.accent}"/>
      <text class="t" x="${x + w - 32}" y="${y + 27}" text-anchor="end" font-size="10.5" fill="${t.text}" fill-opacity="${light ? '.7' : '.55'}">${t.title}</text>
      ${art({ t, x, y, w, h, inset, fill })}
      <text class="t" x="${x + 20}" y="${titleY}" font-size="18" font-weight="700" fill="${t.text}">${title}</text>
      ${body}
    </g>`
  }

  const themesArt = ({ t, x, y, fill }) => {
    const discs = T.map((th, i) => `<circle cx="${r(x + 212 + i * 15.5)}" cy="${y + 86}" r="15" fill="${th.accent}" stroke="${fill}" stroke-width="2.5"/>`).join('\n')
    return `<text class="t" x="${x + 15}" y="${y + 126}" font-size="112" font-weight="800" letter-spacing="-4" fill="${t.accent}">${N}</text>
      ${discs}
      <rect x="${x + 292}" y="${y + 60}" width="124" height="52" rx="26" fill="#ffffff" fill-opacity=".13" stroke="#ffffff" stroke-opacity=".42"/>
      <path d="M${x + 316} ${y + 66.5}h76" stroke="#ffffff" stroke-opacity=".5" stroke-width="1.5" stroke-linecap="round"/>`
  }

  const accountsArt = ({ t, x, y, fill, inset }) => [0, 1, 2].map((i) => {
    const cx = x + 44 + i * 38
    const cy = y + 68
    const op = [1, 0.66, 0.38][i]
    return `<circle cx="${cx}" cy="${cy}" r="26" fill="${fill}"/>
      <circle cx="${cx}" cy="${cy}" r="23" fill="${t.accent}" fill-opacity="${op}"/>
      <text class="t" x="${cx}" y="${cy + 6.5}" text-anchor="middle" font-size="18" font-weight="700" fill="${i === 2 ? t.text : inset}">${i + 1}</text>`
  }).join('\n')

  const trayArt = ({ t, x, y, inset }) => `<rect x="${x + 20}" y="${y + 46}" width="${cw - 40}" height="46" rx="13" fill="${inset}" stroke="${t.text}" stroke-opacity=".1"/>
      <path d="M${x + 36} ${y + 72}l6 -6 6 6" fill="none" stroke="${t.text}" stroke-opacity=".5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${x + 72}" cy="${y + 69}" r="7" fill="none" stroke="${t.text}" stroke-opacity=".4" stroke-width="1.8"/>
      <rect x="${x + 93}" y="${y + 62}" width="14" height="14" rx="3.5" fill="none" stroke="${t.text}" stroke-opacity=".4" stroke-width="1.8"/>
      <rect x="${x + 126}" y="${y + 56}" width="26" height="26" rx="8" fill="${t.accent}" fill-opacity=".22" stroke="${t.accent}"/>
      <circle cx="${x + 139}" cy="${y + 69}" r="5" fill="${t.text}"/>
      <circle cx="${x + 150}" cy="${y + 80}" r="10.5" fill="${t.accent}" stroke="${inset}" stroke-width="2.5"/>
      <text class="t" x="${x + 150}" y="${y + 84}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffffff">3</text>`

  const key = (t, inset, kx, ky, kw, label) => `<rect x="${kx}" y="${ky + 3}" width="${kw}" height="36" rx="9" fill="#000000" fill-opacity=".45"/>
      <rect x="${kx + 0.5}" y="${ky + 0.5}" width="${kw - 1}" height="35" rx="9" fill="${inset}" stroke="${t.accent}" stroke-opacity=".5"/>
      <text class="t" x="${kx + kw / 2}" y="${ky + 23}" text-anchor="middle" font-size="13.5" font-weight="600" fill="${t.text}">${label}</text>`
  const plus = (t, px, py) => `<text class="t" x="${px}" y="${py + 23}" text-anchor="middle" font-size="14" fill="${t.text}" fill-opacity=".5">+</text>`
  const keysArt = ({ t, x, y, inset }) => {
    const rowOf = (ky, mod, keys) => [
      key(t, inset, x + 20, ky, 60, 'Ctrl'),
      plus(t, x + 91, ky),
      key(t, inset, x + 102, ky, 68, mod),
      plus(t, x + 181, ky),
      ...keys.map((k, i) => key(t, inset, x + 192 + i * 54, ky, 48, k)),
    ].join('\n')
    return `${rowOf(y + 38, 'Shift', ['1', '2', '3', '4'])}
      ${rowOf(y + 84, 'Alt', ['U', 'M', 'G', 'S'])}`
  }

  const win = (t, inset, wx, wy, front) => `<rect x="${wx + 0.5}" y="${wy + 0.5}" width="87" height="51" rx="9" fill="${inset}" stroke="${t.accent}" stroke-opacity="${front ? 0.9 : 0.4}"/>
      <path d="M${wx + 1} ${wy + 14.5}h86" stroke="${t.accent}" stroke-opacity="${front ? 0.6 : 0.3}"/>
      <circle cx="${wx + 11}" cy="${wy + 7.5}" r="2.2" fill="${t.accent}" fill-opacity="${front ? 1 : 0.5}"/>
      <rect x="${wx + 10}" y="${wy + 23}" width="${front ? 40 : 30}" height="5" rx="2.5" fill="${t.text}" fill-opacity="${front ? 0.75 : 0.3}"/>
      <rect x="${wx + 10}" y="${wy + 34}" width="${front ? 58 : 46}" height="5" rx="2.5" fill="${t.text}" fill-opacity="${front ? 0.3 : 0.18}"/>`
  const windowsArt = ({ t, x, y, inset }) => `${win(t, inset, x + 20, y + 36, false)}
      ${win(t, inset, x + 58, y + 50, true)}`

  const toastArt = ({ t, x, y: y0, inset }, y = y0 + 6) => `<rect x="${x + 32}" y="${y + 38}" width="${cw - 64}" height="40" rx="11" fill="${inset}" fill-opacity=".6"/>
      <rect x="${x + 20.5}" y="${y + 48.5}" width="${cw - 41}" height="43" rx="11" fill="${inset}" stroke="${t.accent}" stroke-opacity=".5"/>
      <circle cx="${x + 42}" cy="${y + 70}" r="9" fill="${t.accent}"/>
      <rect x="${x + 60}" y="${y + 61}" width="74" height="6" rx="3" fill="${t.text}" fill-opacity=".8"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${x + 63 + i * 10}" cy="${y + 78}" r="2.4" fill="${t.text}" fill-opacity=".38"/>`).join('')}`

  const readingArt = ({ t, x, y }) => `<text class="t" x="${x + 20}" y="${y + 90}" font-weight="700" fill="${t.accent}"><tspan font-size="24" fill-opacity=".5">A</tspan><tspan font-size="40" dx="5" fill-opacity=".75">A</tspan><tspan font-size="60" dx="5">A</tspan></text>`

  const zoomArt = ({ t, x, y, inset }) => {
    const x0 = x + 22
    const x1 = x + 300
    const knob = r(x0 + (x1 - x0) / 3)
    return `<text class="t" x="${knob}" y="${y + 62}" text-anchor="middle" font-size="24" font-weight="700" fill="${t.text}">100 %</text>
      <rect x="${x0}" y="${y + 80}" width="${x1 - x0}" height="6" rx="3" fill="${inset}"/>
      <rect x="${x0}" y="${y + 80}" width="${r(knob - x0)}" height="6" rx="3" fill="${t.accent}"/>
      <circle cx="${knob}" cy="${y + 83}" r="10" fill="${t.accent}" stroke="${t.panel}" stroke-width="3"/>
      <text class="t" x="${x0}" y="${y + 108}" font-size="11" fill="${t.text}" fill-opacity=".6">80 %</text>
      <text class="t" x="${x1}" y="${y + 108}" text-anchor="end" font-size="11" fill="${t.text}" fill-opacity=".6">140 %</text>
      <rect x="${x + 330.5}" y="${y + 60.5}" width="37" height="37" rx="10" fill="${inset}" stroke="${t.accent}" stroke-opacity=".4"/>
      <path d="M${x + 341} ${y + 76}v-5h5M${x + 352} ${y + 71}h5v5M${x + 357} ${y + 82}v5h-5M${x + 346} ${y + 87}h-5v-5" fill="none" stroke="${t.accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="${x + 376.5}" y="${y + 60.5}" width="37" height="37" rx="10" fill="${inset}" stroke="${t.accent}" stroke-opacity=".4"/>
      <rect x="${x + 386}" y="${y + 70}" width="13" height="11" rx="2.5" fill="none" stroke="${t.accent}" stroke-opacity=".5" stroke-width="1.8"/>
      <rect x="${x + 391}" y="${y + 76}" width="13" height="11" rx="2.5" fill="${t.accent}" stroke="${t.accent}" stroke-width="1.8"/>`
  }

  const presenceArt = ({ t, x, y, inset }) => `<rect x="${x + 20.5}" y="${y + 42.5}" width="${cw - 41}" height="49" rx="12" fill="${inset}" stroke="${t.accent}" stroke-opacity=".5"/>
      <circle cx="${x + 46}" cy="${y + 67}" r="14" fill="${t.accent}" fill-opacity=".35"/>
      <circle cx="${x + 56}" cy="${y + 77}" r="5.5" fill="${t.accent}" stroke="${inset}" stroke-width="2.5"/>
      <rect x="${x + 70}" y="${y + 58}" width="62" height="6" rx="3" fill="${t.text}" fill-opacity=".8"/>
      <rect x="${x + 70}" y="${y + 71}" width="86" height="5" rx="2.5" fill="${t.text}" fill-opacity=".32"/>`

  const tiles = [
    tile(0, 0, 2, 'native', 'Темы', [`${N} тем и режим Liquid Glass.`], themesArt),
    tile(2, 0, 1, 'ocean', 'Аккаунты', ['До трёх аккаунтов.', 'У каждого свой', 'профиль WebView2.'], accountsArt),
    tile(3, 0, 1, 'mexican-pink', 'Трей', ['Быстрые переходы', 'и счётчик', 'непрочитанных чатов.'], trayArt),
    tile(0, 1, 2, 'graphite', 'Горячие клавиши', ['UnixGram, сообщения, UnixPlace и настройки.', 'Работают глобально.'], keysArt),
    tile(2, 1, 1, 'midnight', 'Окна', ['UnixGram и UnixPlace.', 'Закрытие сворачивает', 'приложение в трей.'], windowsArt),
    tile(3, 1, 1, 'honey', 'Уведомления', ['Непрочитанные, файл,', 'связь. Без текста', 'сообщений и имён.'], toastArt),
    tile(0, 2, 1, 'light', 'Чтение', ['Размер текста в чатах,', 'меньше анимаций,', 'плавная прокрутка.'], readingArt),
    tile(1, 2, 2, 'aurora', 'Окно', ['Полный экран и «поверх остальных окон».', 'Масштаб 80–140 %.'], zoomArt),
    tile(3, 2, 1, 'basaltes', 'Discord', ['Статус Rich Presence,', 'по желанию с разделом.', 'Отключается.'], presenceArt),
  ].join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Возможности UnixGram Desktop">
  <title>Возможности UnixGram Desktop</title>
  <style>.t{font-family:${FONT}}</style>
  ${tiles}
</svg>`
}

// ---------------------------------------------------------------- licence cards
function licence(id, name, scope, icon) {
  const t = byId[id]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="208" height="124" viewBox="0 0 208 124" role="img" aria-label="${name}: ${scope}">
  <title>${name}: ${scope}</title>
  <style>.t{font-family:${FONT}}</style>
  <rect x=".5" y=".5" width="207" height="123" rx="18" fill="${t.panel}" stroke="${t.accent}" stroke-opacity=".34"/>
  <circle cx="186" cy="22" r="3.5" fill="${t.accent}"/>
  <g transform="translate(18 16)" fill="none" stroke="${t.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
  <text class="t" x="18" y="86" font-size="25" font-weight="800" letter-spacing="-.3" fill="${t.text}">${name}</text>
  <text class="t" x="18" y="106" font-size="11.5" fill="${t.text}" fill-opacity=".68">${scope}</text>
</svg>`
}
const ICONS = {
  code: '<path d="M9 6l-8 8 8 8M19 6l8 8-8 8M16 3l-4 22"/>',
  doc: '<path d="M5 2h12l6 6v18H5zM17 2v6h6M9 14h10M9 19h10"/>',
  lock: '<path d="M5 12h18v14H5zM9 12V8a5 5 0 0 1 10 0v4M14 17.500v3.500"/>',
  layers: '<path d="M14 3l12 6-12 6L2 9zM2 14.500l12 6 12-6M2 20l12 6 12-6"/>',
}

// ---------------------------------------------------------------- download button
function download() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="64" viewBox="0 0 320 64" role="img" aria-label="Скачать для Windows">
  <title>Скачать для Windows</title>
  <style>
    .t{font-family:${FONT}}
    @media (prefers-reduced-motion:no-preference){
      .a{animation:nudge 2.8s ease-in-out infinite}
      @keyframes nudge{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(3px)}}
    }
  </style>
  <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a6bf0"/><stop offset="1" stop-color="#5948c7"/></linearGradient></defs>
  <rect x="1" y="1" width="318" height="62" rx="31" fill="url(#b)"/>
  <rect x="1.500" y="1.500" width="317" height="61" rx="30.500" fill="none" stroke="#ffffff" stroke-opacity=".22"/>
  <g fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path class="a" d="M46 21v17M38.500 31l7.500 7.500 7.500-7.500"/>
    <path d="M36 45h20"/>
  </g>
  <text class="t" x="72" y="38.500" font-size="19" font-weight="700" fill="#ffffff">Скачать для Windows</text>
</svg>`
}

// ---------------------------------------------------------------- spectrum rule
function rule() {
  const W = 880
  const gap = 6
  const w = (W - (N - 1) * gap) / N
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="8" viewBox="0 0 ${W} 8" role="img" aria-label="">
  ${T.map((t, i) => `<rect x="${r(i * (w + gap))}" y="1" width="${r(w)}" height="6" rx="3" fill="${t.accent}"/>`).join('\n')}
</svg>`
}

export const art = () => ({
  'hero-dark.svg': tidy(hero('dark')),
  'hero-light.svg': tidy(hero('light')),
  'palette.svg': tidy(palette()),
  'bento.svg': tidy(bento()),
  'license-mit.svg': tidy(licence('midnight', 'MIT', 'исходный код', ICONS.code)),
  'license-cc-by.svg': tidy(licence('aurora', 'CC BY 4.0', 'документация и графика', ICONS.doc)),
  'license-marks.svg': tidy(licence('lucifer', 'Знаки', 'имя и логотип UnixGram', ICONS.lock)),
  'license-third-party.svg': tidy(licence('honey', 'Сторонние', 'компоненты и их лицензии', ICONS.layers)),
  'download.svg': tidy(download()),
  'rule.svg': tidy(rule()),
})
