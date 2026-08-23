import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const themes = ['official-night', 'official-light', 'signal-ice', 'ember', 'aurora', 'midnight-plum', 'graphite', 'mint-terminal', 'sunset'] as const
const viewports = [{ width: 900, height: 640 }, { width: 1280, height: 720 }, { width: 1520, height: 960 }, { width: 1920, height: 1080 }] as const
const scales = ['normal', 'large', 'xlarge'] as const
type MatrixState = {
  theme: typeof themes[number]
  viewport: typeof viewports[number]
  fontScale: typeof scales[number]
  launchTo: 'feed' | 'history' | 'gifts' | 'profile'
  compact?: boolean
  largeText?: boolean
  reducedMotion?: boolean
  dataSaver?: boolean
  keepRightPanel?: boolean
  titlebarStyle?: 'clean' | 'system'
  unifiedSearchBeta?: boolean
  openLinksExternally?: boolean
  discordPresence?: boolean
  discordShowSection?: boolean
  timelineRange?: '24h' | '7d' | '30d'
  navigateToMessages?: boolean
}

const baseline: MatrixState[] = themes.flatMap((theme) => viewports.flatMap((viewport) => scales.map((fontScale) => ({
  theme, viewport, fontScale, launchTo: 'feed' as const, reducedMotion: true, keepRightPanel: true,
}))))
const targeted: MatrixState[] = [
  { theme: 'official-night', viewport: viewports[0], fontScale: 'xlarge', launchTo: 'feed', compact: true, largeText: true, titlebarStyle: 'clean' },
  { theme: 'official-light', viewport: viewports[0], fontScale: 'xlarge', launchTo: 'feed', compact: true, largeText: true, titlebarStyle: 'system' },
  { theme: 'signal-ice', viewport: viewports[1], fontScale: 'large', launchTo: 'history', compact: true, timelineRange: '7d' },
  { theme: 'ember', viewport: viewports[1], fontScale: 'xlarge', launchTo: 'history', largeText: true, timelineRange: '30d' },
  { theme: 'aurora', viewport: viewports[2], fontScale: 'normal', launchTo: 'gifts', dataSaver: true, unifiedSearchBeta: true },
  { theme: 'midnight-plum', viewport: viewports[2], fontScale: 'large', launchTo: 'gifts', dataSaver: true, unifiedSearchBeta: false },
  { theme: 'graphite', viewport: viewports[3], fontScale: 'normal', launchTo: 'profile', reducedMotion: false, openLinksExternally: true },
  { theme: 'mint-terminal', viewport: viewports[3], fontScale: 'large', launchTo: 'profile', reducedMotion: true, openLinksExternally: false },
  { theme: 'sunset', viewport: viewports[0], fontScale: 'normal', launchTo: 'feed', keepRightPanel: true, navigateToMessages: true },
  { theme: 'official-night', viewport: viewports[0], fontScale: 'xlarge', launchTo: 'feed', keepRightPanel: false, titlebarStyle: 'system', navigateToMessages: true },
  { theme: 'sunset', viewport: viewports[1], fontScale: 'large', launchTo: 'history', discordPresence: true, discordShowSection: true },
  { theme: 'official-light', viewport: viewports[1], fontScale: 'xlarge', launchTo: 'gifts', discordPresence: false, discordShowSection: false },
]
const states = [...baseline, ...targeted]

expect(states).toHaveLength(120)

states.forEach((state, index) => {
  const ordinal = index + 1
  test(`theme matrix ${ordinal}/120`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.setViewportSize(state.viewport)
    await page.addInitScript((settings) => {
      sessionStorage.setItem('unixgram-desktop-preview-session', JSON.stringify({ connected: true, username: 'theme-test', storage: 'Browser Session', message: 'test session' }))
      localStorage.setItem('unixgram-desktop-theme', settings.theme)
      localStorage.setItem('unixgram-desktop-settings-v4', JSON.stringify(settings))
    }, { ...state, discordPresence: state.discordPresence ?? false })
    await page.goto('/')
    await expect(page.locator('.app-shell'), `state ${ordinal}`).toBeVisible()
    if (state.navigateToMessages) await page.locator('.app-rail').getByRole('button', { name: 'Сообщения', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', state.theme)
    await expect(page.locator('html')).toHaveAttribute('data-scale', state.fontScale)
    const geometry = await page.evaluate(() => ({
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      railWidth: document.querySelector('.app-rail')?.getBoundingClientRect().width ?? 0,
      workspaceWidth: document.querySelector('.workspace')?.getBoundingClientRect().width ?? 0,
      visibleButtons: [...document.querySelectorAll('button')].filter((button) => {
        const rect = button.getBoundingClientRect(); const style = getComputedStyle(button)
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      }).length,
    }))
    expect(geometry.documentWidth, `horizontal overflow in state ${ordinal}`).toBeLessThanOrEqual(geometry.viewportWidth + 1)
    expect(geometry.railWidth).toBeGreaterThan(0)
    expect(geometry.workspaceWidth).toBeGreaterThan(0)
    expect(geometry.visibleButtons).toBeGreaterThan(5)
    if (index < 9 || index >= 108) {
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze()
      const blockers = result.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
      expect(blockers, `a11y state ${ordinal}: ${blockers.map((item) => item.id).join(', ')}`).toEqual([])
    }
    expect(pageErrors).toEqual([])
  })
})
