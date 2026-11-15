import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('native client settings expose themes, chat controls and window controls', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible()
  await expect(page.getByRole('button', { name: /UnixGram/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Midnight/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Lucifer/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /by basaltes/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Soft Honey/ })).toBeVisible()
  await expect(page.getByText('Liquid glass')).toBeVisible()
  await expect(page.getByText('Компактный текст')).toBeVisible()
  await expect(page.getByText('Полный экран')).toBeVisible()
  await expect(page.getByText('Масштаб')).toBeVisible()
  await expect(page.getByText('Счётчик в трее')).toBeVisible()
  await expect(page.getByText('Уведомления Windows')).toBeVisible()
  await expect(page.getByText('Переподключаться при обрыве')).toBeVisible()
  await expect(page.getByText('Глобальные сочетания')).toBeVisible()
  await expect(page.getByText('Центр безопасности')).toBeVisible()
  await expect(page.getByText('Разрешённые сайты')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Аккаунты' })).toBeVisible()
  await expect(page.getByText('До трёх аккаунтов')).toHaveCount(1)
  await expect(page.getByRole('checkbox', { name: /Счётчик в трее/ })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: /Уведомления Windows/ })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: /Переподключаться при обрыве/ })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: /Глобальные сочетания/ })).toBeChecked()
  const shortcuts = page.getByLabel('Сочетания клавиш')
  await expect(shortcuts).toContainText('UnixPlace')
  await expect(shortcuts).toContainText('CtrlShift1')
  await expect(shortcuts).toContainText('CtrlShift4')
  await expect(page.getByText(/Ctrl \+ Alt \+ U\/M\/G\/S сохранены/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Сменить основной аккаунт' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Читать @basaltes/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Добавить/ })).toBeDisabled()
  await expect(page.getByText('cookie и пароли не записываются')).toHaveCount(1)
  await expect(page.locator('.theme-card')).toHaveCount(13)
})

test('account settings expose the primary reset and the creator profile link', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Сменить основной аккаунт' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Читать @basaltes/ })).toBeVisible()
})

test('standalone settings page has named controls and no serious accessibility violations', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible()
  await expect(page.locator('header').getByRole('button', { name: 'Предпросмотр', exact: true })).toBeDisabled()
  await expect(page.locator('footer').getByRole('button', { name: 'Предпросмотр', exact: true })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: 'Liquid Glass', exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Компактный текст', exact: true })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Масштаб' })).toBeVisible()

  const result = await new AxeBuilder({ page }).analyze()
  const serious = result.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
  expect(serious, `standalone settings: ${serious.map((violation) => violation.id).join(', ')}`).toEqual([])
  expect(pageErrors).toEqual([])
})

test('standalone settings page should scroll to the footer on shorter viewports', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/')

  const footerButton = page.locator('footer').getByRole('button', { name: 'Предпросмотр', exact: true })
  await expect(footerButton).not.toBeInViewport()

  const scroller = page.locator('.settings-app')
  const before = await scroller.evaluate((element) => ({ top: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight }))
  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight)

  await page.keyboard.press('End')

  const afterTop = await scroller.evaluate((element) => element.scrollTop)
  expect(afterTop).toBeGreaterThan(before.top)
  await expect(footerButton).toBeInViewport()
})
