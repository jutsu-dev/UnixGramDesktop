import type { GlassMode, Preferences } from '../../shared/ipc'

/** Upper end of the opacity slider. */
export const MAX_PANEL_OPACITY = 0.9

/** Panels may not get more transparent than this; clear glass allows more than frosted. */
const MIN_PANEL_OPACITY: Readonly<Record<GlassMode, number>> = {
  frosted: 0.88,
  clear: 0.7,
}

export function minPanelOpacity(mode: GlassMode): number {
  return MIN_PANEL_OPACITY[mode] ?? MIN_PANEL_OPACITY.frosted
}

/** The stored glass strength, raised to the minimum the current glass mode allows. */
export function effectivePanelOpacity({ glassStrength, glassMode }: Pick<Preferences, 'glassStrength' | 'glassMode'>): number {
  return Math.max(glassStrength, minPanelOpacity(glassMode))
}

/** Value of the `data-glass` attribute that the stylesheet keys its glass rules on. */
export function glassAttribute({ liquidGlass, reduceTransparency, glassMode }: Pick<Preferences, 'liquidGlass' | 'reduceTransparency' | 'glassMode'>): GlassMode | 'off' {
  return liquidGlass && !reduceTransparency ? glassMode : 'off'
}
