import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

type Fixture = { theme: string; compact: boolean; glass: boolean; mode: string; css: string }
const fixtures: Fixture[] = JSON.parse(readFileSync(new URL('../../diagnostics/native-theme-fixtures.json', import.meta.url), 'utf8'))

// S4 / R3: these fixtures test CSS compatibility, not live Unixgram Bot API.
for (const fixture of fixtures) {
  test(`native bot controls ${fixture.theme} compact=${fixture.compact} glass=${fixture.mode}`, async ({ page }) => {
    await page.setContent(`<!doctype html><html data-ugd-page="messages"><head><style>
      body { background: #080808; color: white; font: 16px system-ui; }
      html[data-theme=light] { --tg-surface: #fff; --tg-text: #191b24; --tg-bg: #f1f2f5; }
      button { min-height: 44px; padding: 12px 16px; background: rgb(37, 99, 235); color: rgb(255, 255, 255); border: 1px solid transparent; }
      a { color: rgb(90, 180, 255); } button:disabled { opacity: .5; }
    </style></head><body><header>UnixGram</header><main><article>
      <button type="submit">Открыть меню</button><button aria-pressed="true">Выбрано</button>
      <button disabled>Недоступно</button><a href="#help">Справка</a>
      <output aria-live="polite">Ожидание</output>
    </article></main></body></html>`)
    await page.addStyleTag({ content: fixture.css })
    expect(await page.locator('article').evaluate(el => getComputedStyle(el).backdropFilter)).toBe('none')
    if (fixture.mode === 'off' || fixture.mode === 'opaque') {
      expect(await page.locator('header').evaluate(el => getComputedStyle(el).backdropFilter)).toBe('none')
    }
    if (fixture.theme === 'light') {
      expect(await page.locator('article').evaluate(el => getComputedStyle(el).color)).toBe('rgb(25, 27, 36)')
      expect(await page.locator('article').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)')
    }
    const geometry = await page.getByRole('button', { name: 'Открыть меню', exact: true }).evaluate(element => {
      const style = getComputedStyle(element)
      return { background: style.backgroundColor, color: style.color, height: element.getBoundingClientRect().height }
    })
    expect(geometry.background).toBe('rgb(37, 99, 235)')
    expect(geometry.color).toBe('rgb(255, 255, 255)')
    expect(geometry.height).toBeGreaterThanOrEqual(44)
    await expect(page.getByRole('button', { name: 'Недоступно' })).toBeDisabled()
    expect(await page.getByRole('button', { name: 'Выбрано' }).evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(37, 99, 235)')
    await page.getByRole('button', { name: 'Открыть меню', exact: true }).evaluate(element => {
      element.addEventListener('click', () => { document.querySelector('output')!.textContent = 'Меню открыто' })
    })
    await page.getByRole('button', { name: 'Открыть меню', exact: true }).click()
    await expect(page.locator('output')).toHaveText('Меню открыто')
    await page.getByRole('link', { name: 'Справка' }).click()
    await expect(page).toHaveURL(/#help$/)
    if (fixture.theme === 'native' && (fixture.mode === 'clear' || fixture.mode === 'frosted')) {
      await page.locator('html').evaluate(el => el.setAttribute('data-theme', 'light'))
      expect(await page.locator('header').evaluate(el => getComputedStyle(el).color)).toBe('rgb(25, 27, 36)')
    }
  })
}
