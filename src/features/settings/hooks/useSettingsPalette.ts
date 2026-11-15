import { useEffect, type CSSProperties } from 'react'
import type { Preferences } from '../../../shared/ipc'
import { controlAccentFor, surfaceFor } from '../../../shared/theme/themes'
import { effectivePanelOpacity } from '../glass'

type PaletteInput = Pick<Preferences, 'theme' | 'glassStrength' | 'glassMode'>

/**
 * Turns the selected theme into the CSS custom properties the settings stylesheet is built on,
 * so the page previews a theme as soon as its card is clicked.
 *
 * The page background lives on `<html>` because it has to cover the area outside the app column.
 */
export function useSettingsPalette({ theme, glassStrength, glassMode }: PaletteInput) {
  const surface = surfaceFor(theme)
  const panelOpacity = effectivePanelOpacity({ glassStrength, glassMode })

  useEffect(() => {
    document.documentElement.style.setProperty('--settings-page-bg', surface.background)
    return () => {
      document.documentElement.style.removeProperty('--settings-page-bg')
    }
  }, [surface.background])

  const style = {
    '--settings-bg': surface.background,
    '--settings-panel': surface.panel,
    '--settings-text': surface.text,
    '--settings-accent': controlAccentFor(theme),
    '--settings-opacity': `${Math.round(panelOpacity * 100)}%`,
  } as CSSProperties

  return { style, panelOpacity }
}
