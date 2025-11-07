'use client'

import Link from 'next/link'
import { Icons } from '@/lib/icons'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { label: 'Create Packet', href: '/create' },
      { label: 'Claim Packet', href: '/claim' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Invite Friends', href: '/invite' },
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Documentation', href: '/docs' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
    legal: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
    social: [
      { label: 'Twitter', href: 'https://twitter.com', icon: 'X' },
      { label: 'Discord', href: 'https://discord.com', icon: 'Discord' },
      { label: 'Telegram', href: 'https://telegram.org', icon: 'Telegram' },
      { label: 'GitHub', href: 'https://github.com', icon: 'GitHub' },
    ],
  }

  return (
    <footer className="glass w-full border-t border-white/20 mt-auto backdrop-blur-xl">
      <div className="flex justify-center px-3 xs:px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 py-8 sm:py-12">
        <div className="w-full max-w-[960px]">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8">
            {/* Product Section */}
            <div>
              <h3 className="text-sm font-bold text-text-primary-light mb-3 sm:mb-4">
                Product
              </h3>
              <ul className="space-y-2">
                {footerLinks.product.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary-light hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Section */}
            <div>
              <h3 className="text-sm font-bold text-text-primary-light mb-3 sm:mb-4">
                Company
              </h3>
              <ul className="space-y-2">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary-light hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Section */}
            <div>
              <h3 className="text-sm font-bold text-text-primary-light mb-3 sm:mb-4">
                Legal
              </h3>
              <ul className="space-y-2">
                {footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary-light hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social & Brand Section */}
            <div>
              <h3 className="text-sm font-bold text-text-primary-light mb-3 sm:mb-4">
                Community
              </h3>
              <div className="flex flex-wrap gap-3">
                {footerLinks.social.map((link) => {
                  // 根据社交媒体类型选择对应的彩色图标
                  const getIconComponent = () => {
                    switch(link.icon) {
                      case 'X': return Icons.TwitterIcon
                      case 'Discord': return Icons.DiscordIcon
                      case 'Telegram': return Icons.TelegramIcon
                      case 'GitHub': return Icons.GitHubIcon
                      default: return Icons.Share
                    }
                  }
                  const IconComponent = getIconComponent()

                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-full hover:scale-110 transition-transform group"
                      title={link.label}
                    >
                      <div className="w-10 h-10">
                        <IconComponent />
                      </div>
                    </a>
                  )
                })}
              </div>
              <div className="mt-4">
                <p className="text-xs text-text-secondary-light">
                  Join our community to stay updated with the latest features and announcements.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/20 mb-6"></div>

          {/* Bottom Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8">
                <Icons.Logo />
              </div>
              <span className="text-sm font-bold text-text-primary-light">
                Lucky Packet
              </span>
            </div>

            <p className="text-xs text-text-secondary-light text-center sm:text-right">
              © {currentYear} Lucky Packet. All rights reserved. Built on Base Sepolia.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
