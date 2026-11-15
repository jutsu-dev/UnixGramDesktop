import { Save } from 'lucide-react'

type ApplyButtonProps = {
  /** False in the browser preview, where there is nothing to save to. */
  isDesktopRuntime: boolean
  busy: boolean
  onApply: () => void
}

/** The "apply" action, rendered in both the header and the footer. */
export function ApplyButton({ isDesktopRuntime, busy, onApply }: ApplyButtonProps) {
  return (
    <button disabled={!isDesktopRuntime || busy} onClick={onApply}>
      <Save size={16} /> {isDesktopRuntime ? 'Применить' : 'Предпросмотр'}
    </button>
  )
}
