'use client'

import type { GiftTheme } from '@/lib/gift-types'

interface GiftThemeSelectorProps {
  selectedTheme: string
  onThemeSelect: (themeId: string) => void
}

const GIFT_THEMES: GiftTheme[] = [
  {
    id: 'default',
    name: 'Classic Red',
    previewImage: '🎁',
    backgroundColor: '#EF4444',
    accentColor: '#FCA5A5',
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    previewImage: '🌊',
    backgroundColor: '#3B82F6',
    accentColor: '#93C5FD',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    previewImage: '👑',
    backgroundColor: '#8B5CF6',
    accentColor: '#C4B5FD',
  },
  {
    id: 'gold',
    name: 'Golden Shine',
    previewImage: '✨',
    backgroundColor: '#F59E0B',
    accentColor: '#FCD34D',
  },
  {
    id: 'green',
    name: 'Lucky Green',
    previewImage: '🍀',
    backgroundColor: '#10B981',
    accentColor: '#6EE7B7',
  },
  {
    id: 'pink',
    name: 'Sweet Pink',
    previewImage: '💝',
    backgroundColor: '#EC4899',
    accentColor: '#F9A8D4',
  },
]

export function GiftThemeSelector({
  selectedTheme,
  onThemeSelect,
}: GiftThemeSelectorProps) {
  return (
    <div>
      <h3 className="text-base xs:text-lg font-bold text-text-primary-light pb-2">
        Gift Theme
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {GIFT_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => onThemeSelect(theme.id)}
            className={`glass-card rounded-lg p-4 transition-all hover:scale-105 ${
              selectedTheme === theme.id ? 'ring-2 ring-primary' : ''
            }`}
            style={{
              background: `linear-gradient(135deg, ${theme.backgroundColor}20, ${theme.accentColor}20)`,
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: theme.backgroundColor }}
              >
                {theme.previewImage}
              </div>
              <p className="text-xs font-medium text-text-primary-light text-center">
                {theme.name}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
