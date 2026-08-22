import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const railCases = [
  ['Лента', 'Лента'],
  ['Поиск', 'Поиск'],
  ['Уведомления', 'Уведомления'],
  ['Сообщения', ''],
  ['Сообщества', 'Сообщества'],
  ['Студия', 'Студия'],
  ['Подарки UnixGram', 'Подарки'],
  ['Профиль', 'Профиль'],
  ['Unix Premium', 'Unix Premium'],
] as const

async function unlockPreview(page: import('@playwright/test').Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Войти в аккаунт', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Открыть интерфейс', exact: true }).click()
  await expect(page.locator('.app-shell')).toBeVisible()
  await expect(page.locator('.startup-shell')).toHaveCount(0)
}

test('startup splash leads into mandatory auth gate', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'UnixGram Desktop', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Войти в аккаунт', exact: true })).toBeVisible()
  await expect(page.locator('.app-shell')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Открыть интерфейс', exact: true })).toBeVisible()
})

test('every official UnixGram rail destination is clickable', async ({ page }) => {
  await unlockPreview(page)
  await expect(page).toHaveTitle('UnixGram Desktop')
  const rail = page.locator('.app-rail')

  for (const [button, heading] of railCases) {
    await rail.getByRole('button', { name: button, exact: true }).click()
    if (button === 'Сообщения') await expect(page.locator('.chat-view')).toBeVisible()
    else await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }

  await rail.getByRole('button', { name: 'Сообщения', exact: true }).click()
  await page.getByRole('button', { name: 'Новое сообщение' }).click()
  await expect(page.locator('.chat-composer')).toBeVisible()
  await expect(page.locator('.chat-composer').getByRole('textbox')).toBeDisabled()
  await expect(page.locator('button a, a button')).toHaveCount(0)
})

test('unified search, messages and gift modes have real behavior', async ({ page }) => {
  await unlockPreview(page)
  await page.locator('.app-rail').getByRole('button', { name: 'Поиск', exact: true }).click()
  const search = page.locator('.hero-search').getByRole('textbox')
  await search.fill('Crown')
  await page.getByRole('tab', { name: /Подарки/ }).click()
  await expect(page.locator('.search-results').getByRole('heading', { name: 'Профили' })).toHaveCount(0)
  const crownGift = page.locator('.search-results section').filter({ has: page.getByRole('heading', { name: 'Подарки' }) }).getByRole('button', { name: /Crown #002/ })
  await expect(crownGift).toBeVisible()
  await expect(page.getByRole('button', { name: /Astral #104/ })).toHaveCount(0)

  await crownGift.click()
  await expect(page.getByRole('heading', { name: 'Подарки', exact: true })).toBeVisible()
  const accountCount = await page.locator('.gift-card').count()
  await page.getByRole('tab', { name: 'По рынку' }).click()
  await expect(page.getByRole('tab', { name: 'По рынку' })).toHaveAttribute('aria-selected', 'true')
  expect(await page.locator('.gift-card').count()).toBeGreaterThan(accountCount)
  await page.getByPlaceholder('название, коллекция или владелец').fill('Crown')
  await expect(page.locator('.gift-card')).toHaveCount(1)
  await expect(page.locator('.gift-card').first()).toContainText('Crown #002')
  await page.getByLabel('Сортировка подарков').selectOption('price-desc')

  await page.locator('.app-rail').getByRole('button', { name: 'Сообщения', exact: true }).click()
  await page.getByRole('button', { name: 'Новое сообщение' }).click()
  await expect(page.locator('.chat-composer')).toBeVisible()
  await expect(page.locator('.chat-composer').getByRole('button', { name: 'Отправить' })).toBeDisabled()
})

test('full client settings and all nine themes persist', async ({ page }) => {
  await unlockPreview(page)
  await page.getByRole('button', { name: 'Настройки клиента' }).click()
  await expect(page.getByRole('heading', { name: 'Настройки', exact: true })).toBeVisible()
  await expect(page.locator('.message-pane')).toHaveCount(0)
  await expect(page.locator('.context-pane')).toHaveCount(0)

  const settingsNav = page.getByLabel('Разделы настроек')
  for (const section of ['Сессия UnixGram', 'Внешний вид', 'Интерфейс', 'Уведомления', 'Обновление данных', 'Окно и ссылки', 'Возможности', 'Discord', 'О приложении']) {
    await settingsNav.getByRole('button', { name: section, exact: true }).click()
    await expect(page.locator('.settings-panel')).not.toBeEmpty()
  }

  await settingsNav.getByRole('button', { name: 'Внешний вид', exact: true }).click()
  await expect(page.locator('.theme-card')).toHaveCount(9)
  await page.getByRole('button', { name: /aurora/i }).click()
  await page.getByRole('radio', { name: '116%' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'aurora')
  await expect(page.locator('html')).toHaveAttribute('data-scale', 'xlarge')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'aurora')
  await expect(page.locator('html')).toHaveAttribute('data-scale', 'xlarge')
})

test('auth gate exposes password, browser and official QR entry modes', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Пароль' }).click()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await page.getByRole('tab', { name: 'Браузер' }).click()
  await expect(page.getByRole('button', { name: 'Продолжить в браузере' })).toBeVisible()
  await page.getByRole('tab', { name: 'QR-код' }).click()
  await expect(page.getByRole('button', { name: 'Показать QR' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/unixgram-login.png', fullPage: true })
})

test('keyboard navigation covers auth tabs and the skip link', async ({ page }) => {
  await page.goto('/')
  const qrTab = page.getByRole('tab', { name: 'QR-код' })
  await qrTab.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Браузер' })).toBeFocused()
  await expect(page.getByRole('tab', { name: 'Браузер' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Пароль' })).toBeFocused()
  await expect(page.locator('input[type="password"]')).toBeVisible()

  await page.getByRole('button', { name: 'Открыть интерфейс', exact: true }).click()
  const skipLink = page.getByRole('link', { name: 'к содержимому' })
  await skipLink.focus()
  await expect(skipLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main#workspace')).toBeFocused()
})

test('mobile layout keeps core navigation usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await unlockPreview(page)
  await page.getByLabel('Подарки').click()
  await expect(page.getByRole('heading', { name: 'Подарки', exact: true })).toBeVisible()
  await page.getByLabel('Настройки клиента').click()
  await expect(page.getByRole('heading', { name: 'Настройки', exact: true })).toBeVisible()
})

test('visible controls have accessible names and integration UI fits the desktop shell', async ({ page }) => {
  await page.setViewportSize({ width: 1520, height: 960 })
  await unlockPreview(page)
  await page.getByRole('button', { name: 'Настройки клиента' }).click()
  await page.getByLabel('Разделы настроек').getByRole('button', { name: 'Discord' }).click()
  await expect(page.getByText('1540399183276539904')).toBeVisible()

  const unnamed = await page.locator('button:visible, a:visible').evaluateAll((elements) =>
    elements.filter((element) => !(element.getAttribute('aria-label') || element.textContent?.trim() || element.querySelector('img[alt]'))).length,
  )
  expect(unnamed).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: 'artifacts/unixgram-desktop-integrations.png', fullPage: true })
})

test('client settings change real interface behavior', async ({ page }) => {
  await unlockPreview(page)
  await page.getByRole('button', { name: 'Настройки клиента' }).click()
  const settingsNav = page.getByLabel('Разделы настроек')

  await settingsNav.getByRole('button', { name: 'Внешний вид' }).click()
  await page.getByRole('radio', { name: 'Системный' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-titlebar', 'system')

  await settingsNav.getByRole('button', { name: 'Интерфейс' }).click()
  await page.getByRole('radio', { name: '7 дней' }).click()
  await page.locator('.app-rail').getByRole('button', { name: 'Уведомления' }).click()
  await expect(page.locator('.section-title').getByText('7 дней')).toBeVisible()

  await page.getByRole('button', { name: 'Настройки клиента' }).click()
  await settingsNav.getByRole('button', { name: 'Обновление данных' }).click()
  await page.getByRole('switch', { name: /Экономия трафика/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-saver', 'on')

  await settingsNav.getByRole('button', { name: 'Возможности' }).click()
  await page.locator('.settings-panel').getByRole('switch', { name: /Единый поиск/ }).click()
  await page.locator('.app-rail').getByRole('button', { name: 'Поиск' }).click()
  await expect(page.locator('.search-results').getByRole('heading', { name: 'Профили', exact: true })).toBeVisible()
  await expect(page.locator('.search-results').getByRole('heading', { name: 'Подарки', exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Настройки клиента' }).click()
  await settingsNav.getByRole('button', { name: 'Окно и ссылки' }).click()
  await page.locator('.settings-panel').getByRole('switch', { name: /Ссылки профилей/ }).click()
  await page.locator('.app-rail').getByRole('button', { name: 'Уведомления' }).click()
  await expect(page.locator('.context-pane a[href^="https://unixgram.com"]')).toHaveCount(0)
  await expect(page.locator('.context-pane [aria-disabled="true"]')).not.toHaveCount(0)
})

test('feed behaves like a social client instead of a dashboard', async ({ page }) => {
  await unlockPreview(page)
  await expect(page.locator('.message-pane')).toHaveCount(0)
  await expect(page.locator('.unix-post')).toHaveCount(3)
  await expect(page.locator('.verified-mark')).toHaveCount(0)
  await expect(page.getByText('Актуальное', { exact: true })).toBeVisible()
  await expect(page.getByText('гость', { exact: true })).toBeVisible()

  const firstPost = page.locator('.unix-post').first()
  const author = firstPost.getByRole('button', { name: /mummy @mummy/ })
  await expect(author).toBeVisible()
  await expect(firstPost.getByRole('link', { name: 'Комментарии' })).toHaveAttribute('href', /\/post\//)
  await expect(page.getByRole('button', { name: 'Новая публикация' })).toBeVisible()
  const composer = page.locator('.feed-composer-card')
  await expect(composer).toHaveCount(1)
  await expect(composer).toHaveJSProperty('tagName', 'FORM')
  await expect(composer.getByRole('textbox', { name: 'Текст новой публикации' })).toBeVisible()
  await expect(composer.getByRole('button', { name: 'Добавить фото' })).toBeDisabled()
  await expect(composer.getByRole('button', { name: 'Опубликовать' })).toBeDisabled()
  await page.screenshot({ path: 'artifacts/unixgram-feed-v08.png', fullPage: true })
  await author.click()
  await expect(page.getByRole('heading', { name: 'mummy', exact: true }).first()).toBeVisible()
  await expect(page.locator('.profile-post')).toHaveCount(1)
  const profilePost = page.locator('.profile-post')
  const profileAuthor = profilePost.getByRole('button', { name: /mummy @mummy/ })
  const profileTime = profilePost.locator('.unix-post__head > div:first-child > span')
  await expect(profileAuthor).toBeVisible()
  await expect(profileTime).toBeVisible()
  const authorBox = await profileAuthor.boundingBox()
  const timeBox = await profileTime.boundingBox()
  expect(authorBox).not.toBeNull()
  expect(timeBox).not.toBeNull()
  expect(authorBox!.x + authorBox!.width).toBeLessThanOrEqual(timeBox!.x + 1)
  await page.screenshot({ path: 'artifacts/unixgram-social-feed.png', fullPage: true })
})

test('native shell switches to the compact Messenger Dark workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 960 })
  await unlockPreview(page)

  const shell = page.locator('.app-shell')
  await expect(shell).toHaveClass(/is-content/)
  const nativeGrid = await shell.evaluate((element) => getComputedStyle(element).gridTemplateColumns)
  const nativeColumns = nativeGrid.split(' ').map(Number.parseFloat)
  expect(nativeColumns[0]).toBeCloseTo(72, 0)
  expect(nativeColumns.at(-1)).toBeCloseTo(312, 0)

  for (const icon of ['house', 'search', 'bell', 'mail', 'users', 'chart-column', 'gift', 'user-round', 'star']) {
    await expect(page.locator(`.app-rail .lucide-${icon}`).first()).toBeVisible()
  }

  await page.locator('.app-rail').getByRole('button', { name: 'Сообщения', exact: true }).click()
  await expect(shell).toHaveClass(/is-messages/)
  await expect(page.locator('.message-pane')).toBeVisible()
  await expect(page.locator('.chat-view')).toBeVisible()
  await expect(page.locator('.context-pane')).toBeVisible()
  const messengerGrid = await shell.evaluate((element) => getComputedStyle(element).gridTemplateColumns)
  const messengerColumns = messengerGrid.split(' ').map(Number.parseFloat)
  expect(messengerColumns[0]).toBeCloseTo(72, 0)
  expect(messengerColumns[1]).toBeCloseTo(336, 0)
  await page.screenshot({ path: 'artifacts/unixgram-native-messenger-dark.png', fullPage: true })
})

test('desktop panels resize with keyboard and the profile media tab is interactive', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 960 })
  await unlockPreview(page)

  await page.getByRole('button', { name: 'Развернуть навигацию' }).click()
  const railHandle = page.getByRole('separator', { name: 'Изменить ширину навигации' })
  await railHandle.focus()
  await page.keyboard.press('ArrowRight')
  await expect(railHandle).toHaveAttribute('aria-valuenow', '228')
  await page.reload()
  await expect(page.getByRole('separator', { name: 'Изменить ширину навигации' })).toHaveAttribute('aria-valuenow', '228')

  await page.locator('.app-rail').getByRole('button', { name: 'Лента', exact: true }).click()
  await page.locator('.unix-post').first().getByRole('button', { name: /Профиль/ }).first().click()
  await expect(page.getByRole('tab', { name: 'Медиа', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Медиа', exact: true }).click()
  await expect(page.getByRole('tabpanel', { name: /Медиа/ })).toBeVisible()
  await expect(page.getByRole('separator', { name: 'Изменить ширину правой панели' })).toHaveCount(0)
})

test('offline mode keeps the shell open and explains cached data', async ({ page, context }) => {
  await unlockPreview(page)
  await context.setOffline(true)
  await expect(page.locator('.connection-banner')).toContainText('нет сети')
  await expect(page.locator('.app-shell')).toBeVisible()
  await expect(page.locator('.unix-post')).not.toHaveCount(0)
  await context.setOffline(false)
  await expect(page.locator('.connection-banner')).toHaveCount(0)
})

test('main desktop destinations have no serious automated accessibility violations', async ({ page }) => {
  test.setTimeout(90_000)
  await unlockPreview(page)
  for (const destination of ['Лента', 'Поиск', 'Сообщения', 'Подарки UnixGram', 'Профиль']) {
    await page.locator('.app-rail').getByRole('button', { name: destination, exact: true }).click()
    const result = await new AxeBuilder({ page }).analyze()
    const serious = result.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
    expect(serious, `${destination}: ${serious.map((violation) => violation.id).join(', ')}`).toEqual([])
  }
})

test('native client settings expose themes, chat controls and window controls', async ({ page }) => {
  await page.goto('/?desktop-settings=1')
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible()
  await expect(page.getByRole('button', { name: /UnixGram/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Midnight/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Lucifer/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /by basaltes/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Soft Honey/ })).toBeVisible()
  await expect(page.getByText('Liquid glass')).toBeVisible()
  await expect(page.getByText('Компактный список')).toBeVisible()
  await expect(page.getByText('Полный экран')).toBeVisible()
  await expect(page.getByText('Масштаб')).toBeVisible()
})

test('standalone settings page has named controls and no serious accessibility violations', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/?desktop-settings=1')
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Применить', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Сохранить и применить' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Liquid Glass прозрачные панели и размытие' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Компактный список строки диалогов ниже' })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Масштаб' })).toBeVisible()

  const result = await new AxeBuilder({ page }).analyze()
  const serious = result.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
  expect(serious, `standalone settings: ${serious.map((violation) => violation.id).join(', ')}`).toEqual([])
})

test('standalone settings page should scroll to the footer on shorter viewports', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/?desktop-settings=1')

  const footerButton = page.getByRole('button', { name: 'Сохранить и применить' })
  await expect(footerButton).not.toBeInViewport()

  const before = await page.evaluate(() => {
    const scroller = document.scrollingElement
    return { top: scroller?.scrollTop ?? 0, scrollHeight: scroller?.scrollHeight ?? 0, clientHeight: scroller?.clientHeight ?? 0 }
  })
  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight)

  await footerButton.evaluate((element) => element.scrollIntoView({ block: 'end' }))

  const afterTop = await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)
  expect(afterTop).toBeGreaterThan(before.top)
  await expect(footerButton).toBeInViewport()
})
