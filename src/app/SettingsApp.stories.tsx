import type { Meta, StoryObj } from '@storybook/react-vite'
import SettingsApp from './SettingsApp'
import '../styles/base.css'

// Outside the desktop shell the page renders as a read-only preview with default preferences.
const meta = {
  title: 'Settings/SettingsApp',
  component: SettingsApp,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SettingsApp>

export default meta

export const Preview: StoryObj<typeof meta> = {}
