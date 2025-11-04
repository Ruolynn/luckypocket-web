'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/MainLayout'
import Link from 'next/link'

type NotificationType = 'all' | 'claim' | 'created' | 'expired' | 'reward'

interface Notification {
  id: string
  type: 'claim' | 'created' | 'expired' | 'reward'
  title: string
  message: string
  timestamp: number
  read: boolean
  link?: string
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationType>('all')
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'claim',
      title: 'Packet Claimed',
      message: '0x1b...dE3F claimed 0.0031 ETH from your packet',
      timestamp: Date.now() - 120000,
      read: false,
      link: '/packet/1',
    },
    {
      id: '2',
      type: 'created',
      title: 'Packet Created',
      message: 'You successfully created a lucky packet with 0.05 ETH',
      timestamp: Date.now() - 3600000,
      read: true,
      link: '/packet/2',
    },
    {
      id: '3',
      type: 'reward',
      title: 'Reward Earned',
      message: 'You earned $2 USDC from your referral',
      timestamp: Date.now() - 86400000,
      read: false,
    },
  ])

  const filters: { value: NotificationType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'claim', label: 'Claims' },
    { value: 'created', label: 'Created' },
    { value: 'expired', label: 'Expired' },
    { value: 'reward', label: 'Rewards' },
  ]

  const unreadCount = notifications.filter((n) => !n.read).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'claim':
        return 'redeem'
      case 'created':
        return 'add_circle'
      case 'expired':
        return 'schedule'
      case 'reward':
        return 'stars'
      default:
        return 'notifications'
    }
  }

  const formatTime = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const filteredNotifications =
    filter === 'all' ? notifications : notifications.filter((n) => n.type === filter)

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 sm:gap-8 py-4 xs:py-6 sm:py-8">
        <div className="flex flex-wrap justify-between gap-3 px-3 xs:px-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-text-primary-light leading-tight tracking-[-0.033em]">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-text-secondary-light">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto px-3 xs:px-4">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`h-10 px-4 rounded-lg text-sm font-medium transition-colors touch-manipulation whitespace-nowrap ${
                filter === f.value
                  ? 'bg-primary text-white'
                  : 'bg-surface-light border border-gray-200 text-text-secondary-light hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex flex-col gap-2 px-3 xs:px-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <span className="material-symbols-outlined text-6xl text-text-secondary-light mb-4">
                notifications_off
              </span>
              <p className="text-text-secondary-light">No notifications</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const NotificationContent = notification.link ? Link : 'div'
              const contentProps = notification.link ? { href: notification.link } : {}

              return (
                <NotificationContent
                  key={notification.id}
                  {...contentProps}
                  className={`flex items-start gap-3 xs:gap-4 bg-white rounded-xl p-3 xs:p-4 border border-gray-200 hover:shadow-sm transition-all ${
                    !notification.read ? 'bg-primary/5 border-primary/20' : ''
                  }`}
                >
                  <div
                    className={`flex items-center justify-center rounded-lg size-10 xs:size-12 shrink-0 ${
                      notification.type === 'claim'
                        ? 'bg-green-500/10 text-green-600'
                        : notification.type === 'created'
                          ? 'bg-blue-500/10 text-blue-600'
                          : notification.type === 'reward'
                            ? 'bg-yellow-500/10 text-yellow-600'
                            : 'bg-gray-500/10 text-gray-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl xs:text-2xl">
                      {getNotificationIcon(notification.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm xs:text-base font-bold text-text-primary-light mb-1">
                          {notification.title}
                        </p>
                        <p className="text-xs xs:text-sm text-text-secondary-light line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="size-2 bg-primary rounded-full shrink-0 mt-1"></div>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary-light mt-2">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>
                </NotificationContent>
              )
            })
          )}
        </div>
      </div>
    </MainLayout>
  )
}

