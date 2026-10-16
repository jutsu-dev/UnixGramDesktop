import { expect, test } from '@playwright/test'

for (const theme of ['UnixGram', 'Midnight', 'OLED', 'Graphite', 'Aurora', 'Daylight', 'Lucifer', 'By Basaltes', 'Soft Honey', 'Ocean', 'Rose', 'Forest']) {
  test(`settings controls stay readable: ${theme}`, async ({ page }) => {
    await page.goto('/?desktop-settings=1')
    await page.locator('.theme-card').filter({ hasText: theme }).click()
    const contrast = await page.locator('.account-avatar').evaluate(el => {
      const style = getComputedStyle(el)
      const luminance = (color: string) => {
        const c = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
        return c[0] * .2126 + c[1] * .7152 + c[2] * .0722
      }
      const a = luminance(style.color), b = luminance(style.backgroundColor)
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
    })
    expect(contrast).toBeGreaterThanOrEqual(4.5)
    await page.locator('.theme-card.active').focus()
    await expect(page.locator('.theme-card.active')).toBeFocused()
    if (theme === 'Daylight' || theme === 'Lucifer') {
      await page.screenshot({ path: `artifacts/settings-${theme.toLowerCase()}-1.3.3.png` })
    }
  })
}
