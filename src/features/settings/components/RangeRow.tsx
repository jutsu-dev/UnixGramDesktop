import type { LucideIcon } from 'lucide-react'

type RangeRowProps = {
  icon: LucideIcon
  label: string
  /** Text shown to the right of the slider, for example "100%". */
  valueLabel: string
  value: number
  min: string
  max: string
  step: string
  /** Accessible name; when omitted the visible label names the slider. */
  ariaLabel?: string
  className?: string
  disabled?: boolean
  onChange: (value: number) => void
}

/** A labelled slider row with a value read-out. */
export function RangeRow({
  icon: Icon,
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  ariaLabel,
  className,
  disabled,
  onChange,
}: RangeRowProps) {
  return (
    <label className={className ? `zoom-row ${className}` : 'zoom-row'}>
      <span>
        <Icon size={17} />
        <strong>{label}</strong>
      </span>
      <input
        aria-label={ariaLabel}
        disabled={disabled}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <b>{valueLabel}</b>
    </label>
  )
}
