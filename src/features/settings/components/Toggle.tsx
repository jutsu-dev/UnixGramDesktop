type ToggleProps = {
  checked: boolean
  label: string
  note?: string
  onChange: (value: boolean) => void
}

/** A full-width switch row. The checkbox is visually hidden; the trailing `<i>` draws the track. */
export function Toggle({ checked, label, note, onChange }: ToggleProps) {
  return (
    <label className="setting-row">
      <span>
        <strong>{label}</strong>
        {note && <small>{note}</small>}
      </span>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i />
    </label>
  )
}
