/** The theme catalog of the settings UI. Ids match the theme ids understood by the Rust process. */

export type Theme = {
  id: string
  title: string
  /** Swatch colour of the theme card and, with one exception, the accent of the controls. */
  accent: string
  note: string
}

export type ThemeSurface = {
  background: string
  panel: string
  text: string
}

export const DEFAULT_THEME_ID = 'native'

export const themes: readonly Theme[] = [
  { id: 'native', title: 'UnixGram', accent: '#6e5fe4', note: 'без изменений' },
  { id: 'midnight', title: 'Midnight', accent: '#a097ff', note: 'сине-чёрная' },
  { id: 'oled', title: 'OLED', accent: '#000000', note: 'чистый чёрный' },
  { id: 'graphite', title: 'Graphite', accent: '#b3bdce', note: 'серая' },
  { id: 'aurora', title: 'Aurora', accent: '#71dab5', note: 'зелёная' },
  { id: 'light', title: 'Daylight', accent: '#5948c7', note: 'светлая' },
  { id: 'lucifer', title: 'Lucifer', accent: '#e78a9d', note: 'в честь @Lucifer' },
  { id: 'basaltes', title: 'by basaltes', accent: '#bb97ff', note: 'фиолетово-чёрная' },
  { id: 'honey', title: 'Soft Honey', accent: '#dfc171', note: 'тёплая жёлтая' },
  { id: 'ocean', title: 'Ocean', accent: '#79c8ec', note: 'морская синяя' },
  { id: 'rose', title: 'Rose', accent: '#e9a4c2', note: 'дымчатая розовая' },
  { id: 'forest', title: 'Forest', accent: '#b7cc8c', note: 'хвойная зелёная' },
  { id: 'mexican-pink', title: 'Mexican Pink', accent: '#e4007c', note: 'в честь @cekc' },
]

export const surfaces: Readonly<Record<string, ThemeSurface>> = {
  native: { background: '#08090d', panel: '#15151c', text: '#f4f5fa' },
  midnight: { background: '#0a0e1a', panel: '#151d30', text: '#edf0ff' },
  oled: { background: '#000000', panel: '#0b0b0e', text: '#ffffff' },
  graphite: { background: '#121416', panel: '#202328', text: '#f4f5f7' },
  aurora: { background: '#091612', panel: '#142820', text: '#effffb' },
  light: { background: '#f1f2f5', panel: '#ffffff', text: '#191b24' },
  lucifer: { background: '#10080b', panel: '#241018', text: '#fff1f3' },
  basaltes: { background: '#08050e', panel: '#191023', text: '#f7efff' },
  honey: { background: '#15120b', panel: '#272115', text: '#fff8e6' },
  ocean: { background: '#08131c', panel: '#112635', text: '#ecf8ff' },
  rose: { background: '#180f17', panel: '#2c1c29', text: '#fff1f8' },
  forest: { background: '#11160f', panel: '#212b1b', text: '#f1f7e9' },
  'mexican-pink': { background: '#140911', panel: '#28121f', text: '#fff3f9' },
}

/** A pure black accent is invisible on OLED's black panels, so its controls use a lilac instead. */
const CONTROL_ACCENT_OVERRIDES: Readonly<Record<string, string>> = {
  oled: '#a397ff',
}

/** Surface colours of a theme; an unknown id falls back to the default theme. */
export function surfaceFor(themeId: string): ThemeSurface {
  return surfaces[themeId] ?? surfaces[DEFAULT_THEME_ID]
}

/** Accent colour for buttons, toggles and highlights; an unknown id falls back to the default theme. */
export function controlAccentFor(themeId: string): string {
  return CONTROL_ACCENT_OVERRIDES[themeId]
    ?? themes.find(theme => theme.id === themeId)?.accent
    ?? themes[0].accent
}
