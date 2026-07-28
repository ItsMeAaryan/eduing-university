'use client'

/**
 * Thin typed re-export of next-themes.
 * Import from here instead of 'next-themes' directly so we have a
 * single place to swap the underlying implementation if needed.
 */

export type AppTheme = 'light' | 'dark' | 'system'

export { useTheme } from 'next-themes'

export const THEMES: { value: AppTheme; label: string; description: string; emoji: string }[] = [
  { value: 'light',  label: 'Light',  description: 'Always use the light appearance.',       emoji: '☀️' },
  { value: 'dark',   label: 'Dark',   description: 'Always use the dark appearance.',        emoji: '🌙' },
  { value: 'system', label: 'System', description: 'Automatically match your device theme.', emoji: '💻' },
]
