import { expect, test } from '@playwright/test'

// SETTINGS-UPDATE-PLAN R1/S1, R2/S2: new controls are interactive in preview.
test('new themes and reading preferences can be selected', async ({ page }) => {
  await page.goto('/?desktop-settings=1')
  await expect(page.locator('.theme-card')).toHaveCount(12)
  for (const name of ['Ocean', 'Rose', 'Forest']) {
    const theme = page.getByRole('button', { name: new RegExp(name) })
    await theme.click()
    await expect(theme).toHaveClass(/active/)
    await expect(page.locator('.theme-card.active')).toHaveCount(1)
  }
  for (const name of ['Плавная прокрутка', 'Подчёркивать ссылки']) {
    const control = page.getByRole('checkbox', { name, exact: true })
    await page.getByText(name, { exact: true }).click()
    await expect(control).toBeChecked()
    await page.getByText(name, { exact: true }).click()
    await expect(control).not.toBeChecked()
  }
  await expect(page.getByRole('checkbox', { name: 'Показывать в Discord', exact: true })).toBeChecked()
})

// R1/S1: real settings page, not the legacy desktop preview.
for (const [width, height] of [[360, 480], [640, 360], [768, 512], [1024, 768], [1920, 1080], [2560, 1440]]) {
  test(`settings remain usable at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/?desktop-settings=1')
    const app = page.locator('.settings-app')
    await expect(app).toBeVisible()
    const overflow = await app.evaluate(el => ({ content: el.scrollWidth - el.clientWidth, document: document.documentElement.scrollWidth - innerWidth }))
    expect(overflow.content).toBeLessThanOrEqual(1)
    expect(overflow.document).toBeLessThanOrEqual(1)
    await expect(app.locator('header button')).toBeVisible()
    const theme = app.getByRole('button', { name: /Midnight/ })
    await theme.click()
    await expect(theme).toHaveClass(/active/)
    const footer = app.locator('footer button')
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeInViewport()
    await expect(footer).toBeDisabled() // preview must not save real preferences
    await page.setViewportSize({ width: 400, height: 320 })
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeInViewport()
    expect(await app.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1)
  })
}

// R3/S3: both OS preference and the client's switch suppress transitions.
for (const mode of ['normal', 'system', 'client'] as const) {
  test(`settings motion: ${mode}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: mode === 'system' ? 'reduce' : 'no-preference' })
    await page.goto('/?desktop-settings=1')
    if (mode === 'client') await page.getByText('Меньше анимаций', { exact: true }).click()
    const theme = page.getByRole('button', { name: /Midnight/ })
    await theme.click()
    await expect(theme).toHaveClass(/active/)
    const durations = await theme.evaluate(el => getComputedStyle(el).transitionDuration.split(',').map(value => parseFloat(value)))
    expect(Math.max(...durations)).toBeLessThanOrEqual(mode === 'normal' ? 0.25 : 0.001)
    if (mode === 'normal') expect(Math.max(...durations)).toBeGreaterThan(0)
  })
}
