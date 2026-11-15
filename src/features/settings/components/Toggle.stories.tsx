import { useState, type CSSProperties } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Toggle } from './Toggle'
import '../../../styles/base.css'
import '../../../styles/settings.css'

// The settings stylesheet scopes its rules to `.settings-app` and reads the palette from
// custom properties, so the story provides the same wrapper the page does.
const palette = {
  '--settings-bg': '#08090d',
  '--settings-panel': '#15151c',
  '--settings-text': '#f4f5fa',
  '--settings-accent': '#6e5fe4',
  '--settings-opacity': '88%',
} as CSSProperties

const meta = {
  title: 'Settings/Toggle',
  component: Toggle,
  args: { label: 'Счётчик в трее', checked: true, onChange: () => undefined },
  render: function ToggleStory(args) {
    const [checked, setChecked] = useState(args.checked)
    return (
      <main className="settings-app" style={palette} data-theme="native" data-glass="off" data-motion="normal">
        <section>
          <Toggle {...args} checked={checked} onChange={setChecked} />
        </section>
      </main>
    )
  },
} satisfies Meta<typeof Toggle>

export default meta

type Story = StoryObj<typeof meta>

export const On: Story = {}

export const Off: Story = { args: { checked: false } }

export const WithNote: Story = {
  args: { label: 'Уведомления Windows', note: 'Без текста сообщений и имён' },
}
