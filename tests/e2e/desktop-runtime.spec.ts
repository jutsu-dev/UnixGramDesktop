import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const runtime = readFileSync(new URL('../../src-tauri/src/desktop-runtime.js', import.meta.url), 'utf8')
async function fixture(page: Page, payload: unknown = { success: true, data: { unreadChats: 4 } }, status = 200, headers = {}) {
  let requests = 0
  await page.route('https://unixgram.com/**', async route => {
    if (route.request().url().includes('/api/social/messages/unread-count')) {
      requests++
      await route.fulfill({ status, headers, json: payload })
    } else await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><title>UnixGram</title></head><body><textarea aria-label="Сообщение"></textarea><button>Оплатить</button></body></html>' })
  })
  await page.addInitScript(runtime)
  await page.goto('https://unixgram.com/dashboard/messages')
  return () => requests
}

test('server unread count follows title changes without losing section', async ({ page }) => {
  await fixture(page)
  await expect(page).toHaveTitle('(4) UnixGram')
  await page.evaluate(() => { document.title = 'Подарки' })
  await expect(page).toHaveTitle('(4) Подарки')
})
test('profile navigation keeps the server unread badge', async ({ page }) => {
  await fixture(page)
  await expect(page).toHaveTitle('(4) UnixGram')
  await page.evaluate(() => { history.pushState({}, '', '/u/example'); document.title = 'Профиль' })
  await expect(page).toHaveTitle('(4) Профиль')
  await page.waitForTimeout(1200)
  await expect(page).toHaveTitle('(4) Профиль')
})
for (const payload of [{ success: true, data: {} }, { success: false, data: { unreadChats: 4 } }, { success: true, data: { unreadChats: -1 } }, { success: true, data: { unreadChats: '8' } }]) {
  test(`unknown count preserves website fallback ${JSON.stringify(payload)}`, async ({ page }) => {
    const requests = await fixture(page, payload)
    await expect.poll(requests).toBe(1)
    await expect(page).toHaveTitle('UnixGram')
  })
}
test('429 backs off and does not clear unread state', async ({ page }) => {
  const requests = await fixture(page, {}, 429, { 'Retry-After': '120' })
  await expect.poll(requests).toBe(1)
  await page.evaluate(() => { for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('online')) })
  await expect(page).toHaveTitle('UnixGram')
  expect(requests()).toBe(1)
})
test('401 pauses polling rather than repeatedly requesting login', async ({ page }) => {
  const requests = await fixture(page, { success: false }, 401)
  await expect.poll(requests).toBe(1)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  expect(requests()).toBe(1)
})
test('recovery never reloads draft or activates invoice', async ({ page }) => {
  await fixture(page)
  await page.getByRole('textbox').fill('Несохранённый текст')
  await page.evaluate(() => {
    document.querySelector('button')!.onclick = () => { document.title = 'PAID' }
    window.dispatchEvent(new Event('online'))
  })
  await expect(page.getByRole('textbox')).toHaveValue('Несохранённый текст')
  await expect(page.getByRole('status')).toContainText('Связь восстановлена')
  await expect(page.getByRole('status')).toHaveCount(1)
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: 'Обновить', exact: true }).click()
  await expect(page.getByRole('textbox')).toHaveValue('Несохранённый текст')
  await expect(page).not.toHaveTitle(/PAID/)
})
test('runtime stays out of external miniapps and has no native IPC', async ({ page }) => {
  await page.route('https://example.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Miniapp</title>' }))
  await page.addInitScript(runtime)
  await page.goto('https://example.com/')
  expect(await page.evaluate(() => '__ugdRuntime' in window)).toBe(false)
  expect(runtime).not.toContain('__TAURI')
  expect(runtime).not.toContain('localStorage')
})
test('reinjection is single instance', async ({ page }) => {
  const requests = await fixture(page)
  await expect(page).toHaveTitle('(4) UnixGram')
  await page.evaluate(runtime)
  expect(requests()).toBe(1)
})
test('no authenticated polling on login page', async ({ page }) => {
  const requests = await fixture(page)
  await expect.poll(requests).toBe(1)
  await page.goto('https://unixgram.com/auth/login')
  await expect(page).toHaveTitle('UnixGram')
  expect(requests()).toBe(1)
})

test('settings glass and daylight preview are interactive', async ({ page }) => {
  await page.goto('/?desktop-settings=1')
  await page.getByRole('button', { name: /Daylight/ }).click()
  await page.getByText('Liquid Glass', { exact: true }).click()
  await page.getByRole('button', { name: 'Прозрачное', exact: true }).click()
  await expect(page.locator('.settings-app')).toHaveAttribute('data-glass', 'clear')
  expect(await page.locator('.settings-app').evaluate(el => getComputedStyle(el).color)).toBe('rgb(25, 27, 36)')
  await page.getByText('Без прозрачности', { exact: true }).click()
  await expect(page.locator('.settings-app')).toHaveAttribute('data-glass', 'off')
  await page.screenshot({ path: 'artifacts/settings-daylight-refresh.png', fullPage: true })
})
