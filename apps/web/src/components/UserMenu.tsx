'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function UserMenu() {
  const { isConnected, address } = useAccount()
  const { disconnect } = useDisconnect()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Get user avatar (use ENS avatar or generate from address)
  const getAvatarUrl = () => {
    // In production, you could fetch ENS avatar here
    // For now, use a placeholder or generate from address
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`
  }

  // Format address
  const formatAddress = (addr: string | undefined) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!isConnected) {
    return <ConnectButton />
  }

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/profile', label: 'Profile', icon: 'person' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
    { href: '/notifications', label: 'Notifications', icon: 'notifications', badge: true },
  ]

  const isActive = (href: string) => pathname?.startsWith(href)

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-light transition-colors touch-manipulation"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/20 overflow-hidden flex-shrink-0">
          <img
            src={getAvatarUrl()}
            alt="User avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to a default avatar
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
        <span className="hidden sm:block text-sm font-medium text-text-primary-light">
          {formatAddress(address)}
        </span>
        <span className="material-symbols-outlined text-lg text-text-secondary-light">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className="glass-card absolute right-0 top-full mt-2 w-56 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 overflow-hidden flex-shrink-0">
                <img
                  src={getAvatarUrl()}
                  alt="User avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary-light truncate">
                  {formatAddress(address)}
                </p>
                <p className="text-xs text-text-secondary-light">Connected</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-primary-light hover:bg-surface-light'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                )}
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Disconnect */}
          <button
            onClick={() => {
              disconnect()
              setIsOpen(false)
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  )
}

