// README artwork: the architecture drawing, light and dark variants.

const MONO = "'Cascadia Mono','Cascadia Code',Consolas,'SF Mono',Menlo,'DejaVu Sans Mono','Liberation Mono',monospace"
const SANS = "'Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif"

// Paper colours come from the Daylight theme, blueprint colours from Midnight.
const palettes = {
  light: {
    bg: '#f1f2f5', panel: '#ffffff', ink: '#191b24', muted: '#5b6074', accent: '#5948c7', onAccent: '#ffffff',
    minor: 'rgba(25,27,36,.05)', major: 'rgba(25,27,36,.10)', edge: '#cfd3dd',
  },
  dark: {
    bg: '#0a0e1a', panel: '#151d30', ink: '#edf0ff', muted: '#8f99bd', accent: '#a097ff', onAccent: '#0a0e1a',
    minor: 'rgba(160,151,255,.06)', major: 'rgba(160,151,255,.13)', edge: '#2a3350',
  },
}

const r = (n) => Math.round(n * 100) / 100

function sheet({ w, h, title, desc, p, body, css, gx, gy, gw, gh }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
<title id="t">${title}</title>
<desc id="d">${desc}</desc>
<style>
.m{font-family:${MONO}}
.s{font-family:${SANS}}
.ink{fill:${p.ink}}
.mut{fill:${p.muted}}
.acc{fill:${p.accent}}
.l{fill:none;stroke:${p.ink};stroke-width:1;stroke-linecap:round;stroke-linejoin:round}
.lm{fill:none;stroke:${p.muted};stroke-width:1;stroke-linecap:round;stroke-linejoin:round}
.la{fill:none;stroke:${p.accent};stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}
.box{fill:${p.panel};stroke:${p.ink};stroke-width:1}
.cap{font-family:${MONO};font-size:8.5px;letter-spacing:1.3px;fill:${p.muted}}
.hd{font-family:${MONO};font-size:10.5px;font-weight:700;letter-spacing:1.2px;fill:${p.ink}}
${css}</style>
<defs>
<pattern id="g1" x="${gx}" y="${gy}" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="${p.minor}" stroke-width="1"/></pattern>
<pattern id="g5" x="${gx}" y="${gy}" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="${p.major}" stroke-width="1"/></pattern>
<marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 .8 7 4 0 7.2z" fill="${p.ink}"/></marker>
<marker id="arrow-accent" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 .8 7 4 0 7.2z" fill="${p.accent}"/></marker>
<clipPath id="clip"><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="12"/></clipPath>
</defs>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="12" fill="${p.bg}"/>
<g clip-path="url(#clip)"><rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="url(#g1)"/><rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="url(#g5)"/></g>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="12" fill="none" stroke="${p.edge}"/>
${body}
</svg>
`
}

function drawing(p) {
  const W = 830, H = 520
  const fx = 25, fy = 25, fw = 780, fh = 470
  let b = ''

  // Drawing frame with zone marks.
  b += `<rect x="9.5" y="9.5" width="811" height="501" rx="5" class="lm" opacity=".55"/>`
  b += `<rect x="${fx}.5" y="${fy}.5" width="${fw - 1}" height="${fh - 1}" class="l" stroke-width="1.2"/>`
  let zones = ''
  for (let i = 0; i < 8; i++) {
    const x = fx + (fw / 8) * i
    if (i) zones += `<path d="M${r(x)} 10V25M${r(x)} 495V510" class="lm" opacity=".55"/>`
    const cx = r(x + fw / 16)
    zones += `<text x="${cx}" y="20.5" text-anchor="middle">${i + 1}</text><text x="${cx}" y="505.5" text-anchor="middle">${i + 1}</text>`
  }
  'ABCDE'.split('').forEach((ch, i) => {
    const y = fy + (fh / 5) * i
    if (i) zones += `<path d="M10 ${r(y)}H25M805 ${r(y)}H820" class="lm" opacity=".55"/>`
    const cy = r(y + fh / 10 + 3)
    zones += `<text x="17" y="${cy}" text-anchor="middle">${ch}</text><text x="813" y="${cy}" text-anchor="middle">${ch}</text>`
  })
  b += `<g class="m mut" font-size="8">${zones}</g>`

  // Column captions.
  b += `<text x="40" y="53" class="cap">WINDOWS И СЕТЬ</text>`
  b += `<text x="560" y="53" class="cap">ОКНА WEBVIEW2</text>`

  // ---- native process (a wall with a door at the IPC gate)
  const bx = 215, by = 65, bw = 230, bh = 330
  const rowX = bx + 12, rowW = bw - 24, rowH = 28, rowY0 = 113, rowStep = 38
  const rows = [
    ['webview/', 'сценарии страниц'],
    ['navigation.rs', 'политика адресов'],
    ['commands.rs', '9 команд IPC'],
    ['tray.rs', 'значок и меню'],
    ['shortcuts.rs', '8 сочетаний'],
    ['discord.rs', 'Rich Presence'],
    ['connectivity.rs', 'монитор связи'],
  ]
  const cy = (i) => rowY0 + rowStep * i + rowH / 2
  const gateY = cy(2)
  b += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${p.panel}" opacity=".6"/>`
  b += `<path d="M${bx + bw} ${gateY - 10}V${by}H${bx}V${by + bh}H${bx + bw}V${gateY + 10}" class="l" stroke-width="2.2"/>`
  b += `<text x="${rowX}" y="87" class="hd">НАТИВНЫЙ ПРОЦЕСС</text>`
  b += `<text x="${rowX}" y="101" class="m mut" font-size="9.5">Rust · Tauri 2</text>`
  rows.forEach(([name, note], i) => {
    const y = rowY0 + rowStep * i
    const gate = i === 2
    b += `<rect x="${rowX}" y="${y}" width="${rowW}" height="${rowH}" rx="3" fill="${p.bg}" stroke="${gate ? p.accent : p.ink}" stroke-width="${gate ? 1.4 : 1}"${gate ? '' : ' stroke-opacity=".5"'}/>`
    b += `<text x="${rowX + 10}" y="${y + 18}" class="m ${gate ? 'acc' : 'ink'}" font-size="10.5"${gate ? ' font-weight="700"' : ''}>${name}</text>`
    b += `<text x="${rowX + rowW - 10}" y="${y + 18}" class="s mut" font-size="9.5" text-anchor="end">${note}</text>`
  })

  // ---- left column: tray, hotkeys, Discord, site
  b += `<text x="40" y="74" class="cap">ТРЕЙ</text>`
  b += `<rect x="40" y="80" width="125" height="34" rx="4" class="box"/>`
  b += `<path d="M52 100l4-5 4 5" class="lm"/>`
  b += `<rect x="70" y="91" width="12" height="12" rx="2.5" class="lm"/><rect x="90" y="91" width="12" height="12" rx="2.5" class="lm"/>`
  b += `<rect x="117" y="89" width="18" height="18" rx="4" class="l" stroke-width="1.2"/><path d="M117 95h18" class="l"/>`
  b += `<circle cx="133" cy="103" r="7.5" fill="${p.accent}" stroke="${p.panel}" stroke-width="1.5"/><text x="133" y="106.3" class="m" font-size="9" font-weight="700" text-anchor="middle" fill="${p.onAccent}">3</text>`
  b += `<text x="40" y="128" class="s mut" font-size="9.5">счётчик непрочитанных</text>`

  b += `<text x="40" y="160" class="cap">ГОРЯЧИЕ КЛАВИШИ</text>`
  const key = (x, y, w, label, accent) => `<rect x="${x}" y="${y}" width="${w}" height="26" rx="4" fill="${p.panel}" stroke="${accent ? p.accent : p.ink}" stroke-width="${accent ? 1.3 : 1}"/><rect x="${x + 3}" y="${y + 2.5}" width="${w - 6}" height="18" rx="2.5" fill="none" stroke="${accent ? p.accent : p.ink}" stroke-opacity=".4" stroke-width=".8"/><text x="${x + w / 2}" y="${y + 15}" class="m ${accent ? 'acc' : 'ink'}" font-size="9" text-anchor="middle">${label}</text>`
  b += key(40, 166, 40, 'Ctrl') + key(85, 166, 44, 'Shift') + key(134, 166, 24, '1', true)
  b += `<text x="40" y="206" class="s mut" font-size="9.5">8 глобальных сочетаний</text>`

  b += `<text x="40" y="250" class="cap">КЛИЕНТ DISCORD</text>`
  b += `<rect x="40" y="256" width="125" height="34" rx="4" class="box"/><text x="102.5" y="277" class="s ink" font-size="11" text-anchor="middle">Rich Presence</text>`
  b += `<text x="40" y="304" class="s mut" font-size="9.5">статус, отключается</text>`

  b += `<text x="40" y="332" class="cap">UNIXGRAM.COM</text>`
  b += `<rect x="40" y="338" width="125" height="34" rx="4" class="box"/><text x="102.5" y="358.5" class="m ink" font-size="10" text-anchor="middle">GET /api/health</text>`
  b += `<text x="40" y="386" class="s mut" font-size="9.5">раз в 15 секунд</text>`

  // Service lines run in nested channels, so they never cross.
  const svc = [
    [165, 97, 202, cy(3)],
    [162, 179, 191, cy(4)],
    [165, 273, 180, cy(5)],
  ]
  for (const [x0, y0, cx, y1] of svc) {
    b += `<path d="M${x0} ${y0}H${cx}V${y1}H${rowX}" class="l" opacity=".8"/><circle cx="${x0}" cy="${y0}" r="2" class="ink"/><circle cx="${rowX}" cy="${y1}" r="2" class="ink"/>`
  }
  b += `<path d="M165 ${cy(6)}H${rowX}" class="l" opacity=".8"/><circle cx="165" cy="${cy(6)}" r="2" class="ink"/><circle cx="${rowX}" cy="${cy(6)}" r="2" class="ink"/>`

  // ---- right column: windows
  const wx = 560, ww = 207
  const win = (x, y, w, h, label, accent) => {
    const s = accent ? p.accent : p.ink
    let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${p.panel}" stroke="${s}" stroke-width="${accent ? 1.5 : 1.1}"/>`
    g += `<path d="M${x} ${y + 18}H${x + w}" stroke="${s}" stroke-width="1" stroke-opacity=".6"/>`
    g += `<text x="${x + 9}" y="${y + 12.5}" class="m ${accent ? 'acc' : 'ink'}" font-size="9.5" font-weight="700">${label}</text>`
    const cxr = x + w - 12
    g += `<path d="M${cxr - 3} ${y + 6}l6 6m0-6l-6 6M${cxr - 19} ${y + 6}h6v6h-6zM${cxr - 35} ${y + 9}h6" fill="none" stroke="${s}" stroke-width=".9" stroke-opacity=".7"/>`
    return g
  }
  const tag = (x, y, text, on) => {
    const w = on ? 30 : 48
    return `<rect x="${x - w}" y="${y}" width="${w}" height="15" rx="3" fill="${on ? p.accent : 'none'}" stroke="${on ? p.accent : p.muted}" stroke-width="1"/><text x="${x - w / 2}" y="${y + 10.6}" class="m" font-size="8.5" font-weight="700" text-anchor="middle" fill="${on ? p.onAccent : p.muted}">${text}</text>`
  }
  // Accounts: a stack of three windows.
  b += `<path d="M${wx + 10} 75V65H${wx + ww + 10}V165H${wx + ww}" class="l" opacity=".4"/>`
  b += `<path d="M${wx + 5} 75V70H${wx + ww + 5}V170H${wx + ww}" class="l" opacity=".65"/>`
  b += win(wx, 75, ww, 100, 'main')
  b += `<text x="${wx + 12}" y="118" class="m ink" font-size="11">https://unixgram.com</text>`
  b += `<text x="${wx + 12}" y="136" class="s mut" font-size="9.5">до трёх аккаунтов,</text><text x="${wx + 12}" y="149" class="s mut" font-size="9.5">у каждого свой профиль</text>`
  b += tag(wx + ww - 9, 152, 'без IPC', false)
  // Dimensions of the account window (its initial size).
  const dimText = (x, y, text, rot) => `<g${rot ? ` transform="rotate(-90 ${x} ${y})"` : ''}><rect x="${x - 15}" y="${y - 6}" width="30" height="12" fill="${p.bg}"/><text x="${x}" y="${y + 3.2}" class="m mut" font-size="8.5" text-anchor="middle">${text}</text></g>`
  b += `<path d="M${wx} 179V192M${wx + ww} 179V192M${wx} 188H${wx + ww}M${wx - 3} 191l6-6M${wx + ww - 3} 191l6-6" class="lm"/>` + dimText(wx + ww / 2, 188, '1520')
  b += `<path d="M${wx + ww + 14} 75H${wx + ww + 28}M${wx + ww + 4} 175H${wx + ww + 28}M${wx + ww + 24} 75V175M${wx + ww + 21} 78l6-6M${wx + ww + 21} 178l6-6" class="lm"/>` + dimText(wx + ww + 24, 125, '960', true)
  // UnixPlace.
  b += win(wx, 205, ww, 80, 'unixplace')
  b += `<text x="${wx + 12}" y="246" class="m ink" font-size="11">https://place.unixgram.com</text>`
  b += tag(wx + ww - 9, 262, 'без IPC', false)
  // Settings.
  b += win(wx, 315, ww, 80, 'settings', true)
  b += `<text x="${wx + 12}" y="356" class="s ink" font-size="11">локальная страница React</text>`
  b += tag(wx + ww - 9, 372, 'IPC', true)

  // ---- data lines between the process and the windows
  const rx1 = rowX + rowW
  b += `<path d="M${rx1} ${cy(0)}H${wx - 2}" class="l" marker-end="url(#arrow)"/>`
  b += `<text x="${(bx + bw + wx) / 2}" y="${cy(0) - 6}" class="s mut" font-size="9.5" text-anchor="middle">CSS тем и сценарии</text>`
  b += `<path d="M${wx} ${cy(1)}H${rx1 + 2}" class="l" marker-end="url(#arrow)"/>`
  b += `<text x="${bx + bw + 8}" y="${cy(1) - 6}" class="s mut" font-size="9.5">заголовок, адреса</text>`
  b += `<path d="M${wx} 232H520V${cy(1)}" class="l"/><circle cx="520" cy="${cy(1)}" r="2.2" class="ink"/>`
  b += `<text x="540" y="226" class="s mut" font-size="9.5" text-anchor="middle">адреса</text>`

  // ---- the IPC path: settings window -> gate -> commands.rs
  const ipc = `M${wx} 355H478V${gateY}H${rx1 + 3}`
  b += `<path d="${ipc}" class="la" opacity=".28"/>`
  b += `<path d="${ipc}" class="la flow" stroke-dasharray="5 7" marker-end="url(#arrow-accent)"/>`
  // The door in the wall.
  b += `<path d="M${bx + bw} ${gateY - 10}H${bx + bw + 20}" class="la"/><path d="M${bx + bw + 20} ${gateY - 10}A20 20 0 0 1 ${bx + bw} ${gateY + 10}" class="la" stroke-width="1" stroke-dasharray="2 3"/>`
  b += `<circle cx="${bx + bw}" cy="${gateY - 10}" r="2.4" class="acc"/><circle cx="${bx + bw}" cy="${gateY + 10}" r="2.4" class="acc"/>`
  b += `<text x="${bx + bw + 6}" y="${gateY - 16}" class="m acc" font-size="8.5" font-weight="700" letter-spacing=".8">ШЛЮЗ IPC</text>`
  b += `<text x="487" y="292" class="m acc" font-size="10.5" font-weight="700">invoke</text>`
  b += `<text x="487" y="306" class="s mut" font-size="9.5">только окно</text><text x="487" y="318" class="s mut" font-size="9.5">settings</text>`

  // ---- notes and legend
  b += `<text x="40" y="427" class="cap">ПРИМЕЧАНИЯ</text>`
  b += `<g class="s ink" font-size="10.5"><text x="40" y="446">1. Команды IPC вызывает только окно settings.</text><text x="40" y="463">2. Ссылки на другие сайты уходят в системный браузер.</text><text x="40" y="480">3. Своего сервера и телеметрии нет.</text></g>`
  b += `<path d="M360 424H384" class="l"/><text x="390" y="427.5" class="s mut" font-size="9.5">данные</text>`
  b += `<path d="M440 424H464" class="la" stroke-dasharray="5 4"/><text x="470" y="427.5" class="s mut" font-size="9.5">invoke</text>`

  // ---- title block
  const tx = 545, ty = 425
  b += `<rect x="${tx}" y="${ty}" width="${805 - tx}" height="${495 - ty}" fill="${p.bg}"/>`
  b += `<path d="M${tx} 495V${ty}H805M${tx} ${ty + 28}H805M${tx} ${ty + 49}H805M700 ${ty + 28}V495" class="l" stroke-width="1.2"/>`
  b += `<text x="${tx + 12}" y="${ty + 19}" class="m ink" font-size="12" font-weight="700" letter-spacing="2">UNIXGRAM DESKTOP</text>`
  b += `<text x="${tx + 12}" y="${ty + 42.5}" class="s ink" font-size="10">Схема устройства</text>`
  b += `<text x="712" y="${ty + 42.5}" class="m mut" font-size="9">Лист 1 / 1</text>`
  b += `<text x="${tx + 12}" y="${ty + 63.5}" class="s ink" font-size="10">Rust · Tauri 2 · WebView2</text>`
  b += `<text x="712" y="${ty + 63.5}" class="m mut" font-size="9">Windows x64</text>`

  const css = `@keyframes flow{to{stroke-dashoffset:-24}}
@media (prefers-reduced-motion:no-preference){.flow{animation:flow 2.4s linear infinite}}
`
  return sheet({
    w: W, h: H, p, body: b, css, gx: fx, gy: fy, gw: fw, gh: fh,
    title: 'Схема устройства UnixGram Desktop',
    desc: 'Нативный процесс на Rust и Tauri 2 держит окна WebView2. Окна аккаунтов загружают unixgram.com, окна UnixPlace загружают place.unixgram.com. Команды IPC вызывает только локальное окно настроек. Процесс управляет треем, горячими клавишами, статусом Discord и монитором связи.',
  })
}

export const blueprint = () => ({
  'blueprint-light.svg': drawing(palettes.light),
  'blueprint-dark.svg': drawing(palettes.dark),
})
