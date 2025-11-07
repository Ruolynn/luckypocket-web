'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { UserMenu } from './UserMenu'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/create', label: 'Create' },
    { href: '/claim', label: 'Claim' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/invite', label: 'Invite' },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname?.startsWith(href)
  }

  return (
    <>
      <header className="glass sticky top-0 z-40 flex items-center justify-between whitespace-nowrap border-b border-white/20 px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-3 sm:py-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 text-text-primary-light">
          <Link href="/" className="flex items-center gap-2 xs:gap-3 sm:gap-4">
            <div className="size-5 xs:size-6 text-primary flex-shrink-0">
              <svg
                fill="none"
                viewBox="0 0 48 48"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <g clipPath="url(#clip0_6_330)">
                  <path
                    clipRule="evenodd"
                    d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z"
                    fill="currentColor"
                    fillRule="evenodd"
                  ></path>
                </g>
                <defs>
                  <clipPath id="clip0_6_330">
                    <rect fill="white" height="48" width="48"></rect>
                  </clipPath>
                </defs>
              </svg>
            </div>
            <h2 className="text-text-primary-light text-base xs:text-lg font-bold leading-tight tracking-[-0.015em]">
              LuckyPacket
            </h2>
          </Link>
        </div>

        <nav className="hidden items-center gap-6 md:gap-9 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium leading-normal transition-colors ${
                isActive(item.href)
                  ? 'text-primary font-bold'
                  : 'text-text-primary-light hover:text-primary'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2 xs:gap-3 sm:gap-4">
          <UserMenu />
          <button
            className="md:hidden text-text-primary-light p-2 touch-manipulation"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="mb-4 text-text-primary-light p-2"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-base font-medium leading-normal px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'text-primary font-bold bg-primary/10'
                      : 'text-text-primary-light hover:text-primary hover:bg-surface-light'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}

