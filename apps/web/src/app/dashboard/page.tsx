'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/MainLayout'
import Link from 'next/link'

type FilterType = 'all' | 'sent' | 'received'
type StatusType = 'all' | 'claimed' | 'unclaimed' | 'expired'
type TypeFilter = 'all' | 'fixed' | 'random'

export default function DashboardPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [status, setStatus] = useState<StatusType>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')

  const stats = {
    sent: '15.2 ETH',
    received: '8.9 ETH',
    claimed: '124',
  }

  const packets = [
    {
      id: '1',
      title: '10 ETH',
      description: 'Created: 2 hours ago | Equal - for 10 people',
      amount: '10 ETH',
      status: 'active' as const,
      type: 'sent' as const,
    },
    {
      id: '2',
      title: '0.5 ETH',
      description: 'Claimed: 1 day ago | From 0xAb...cdef',
      amount: '0.5 ETH',
      status: 'claimed' as const,
      type: 'received' as const,
    },
  ]

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 sm:gap-8 py-4 xs:py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between gap-3 px-3 xs:px-4">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-text-primary-light leading-tight tracking-[-0.033em]">
            My Lucky Packet Dashboard
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 xs:gap-4 px-3 xs:px-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="glass-card flex flex-1 flex-col items-center gap-2 rounded-xl p-4 xs:p-5 sm:p-6 transition-all">
            <div className="flex items-center justify-center w-10 xs:w-12 h-10 xs:h-12 rounded-full mb-2 text-primary bg-primary/10">
              <span className="material-symbols-outlined text-xl xs:text-2xl">send</span>
            </div>
            <p className="text-text-secondary-light text-sm xs:text-base font-medium">Total Value Sent</p>
            <p className="text-text-primary-light text-xl xs:text-2xl font-bold">{stats.sent}</p>
          </div>
          <div className="glass-card flex flex-1 flex-col items-center gap-2 rounded-xl p-4 xs:p-5 sm:p-6 transition-all">
            <div className="flex items-center justify-center w-10 xs:w-12 h-10 xs:h-12 rounded-full mb-2 text-green-600 bg-green-500/10">
              <span className="material-symbols-outlined text-xl xs:text-2xl">download</span>
            </div>
            <p className="text-text-secondary-light text-sm xs:text-base font-medium">Total Value Received</p>
            <p className="text-text-primary-light text-xl xs:text-2xl font-bold">{stats.received}</p>
          </div>
          <div className="glass-card flex flex-1 flex-col items-center gap-2 rounded-xl p-4 xs:p-5 sm:p-6 transition-all sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-center w-10 xs:w-12 h-10 xs:h-12 rounded-full mb-2 text-accent bg-accent/10">
              <span className="material-symbols-outlined text-xl xs:text-2xl">redeem</span>
            </div>
            <p className="text-text-secondary-light text-sm xs:text-base font-medium">Packets Claimed</p>
            <p className="text-text-primary-light text-xl xs:text-2xl font-bold">{stats.claimed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 xs:gap-4 px-3 xs:px-4 py-2 sm:py-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or sender"
              className="h-10 xs:h-11 w-full rounded-lg border border-gray-200 bg-surface-light pl-10 pr-4 text-sm text-text-primary-light placeholder:text-text-secondary-light focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusType)}
                className="h-10 xs:h-11 appearance-none rounded-lg border border-gray-200 bg-surface-light py-2 pl-3 pr-8 text-sm text-text-secondary-light focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all w-full sm:w-auto"
              >
                <option value="all">All Status</option>
                <option value="claimed">Claimed</option>
                <option value="unclaimed">Unclaimed</option>
                <option value="expired">Expired</option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary-light text-lg">
                expand_more
              </span>
            </div>
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className="h-10 xs:h-11 appearance-none rounded-lg border border-gray-200 bg-surface-light py-2 pl-3 pr-8 text-sm text-text-secondary-light focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all w-full sm:w-auto"
              >
                <option value="all">All Types</option>
                <option value="fixed">Fixed</option>
                <option value="random">Random</option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary-light text-lg">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Tab Filter */}
        <div className="flex px-3 xs:px-4 py-2 sm:py-3 overflow-x-auto">
          <div className="flex h-10 xs:h-11 w-full max-w-sm items-center justify-center rounded-lg bg-surface-light p-1 border border-gray-200">
            {(['all', 'sent', 'received'] as FilterType[]).map((f) => (
              <label
                key={f}
                className={`flex h-full flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-md px-2 xs:px-3 text-xs xs:text-sm font-medium leading-normal transition-all touch-manipulation ${
                  filter === f
                    ? 'bg-white text-text-primary-light shadow-sm'
                    : 'text-text-secondary-light'
                }`}
              >
                <span className="truncate capitalize">{f === 'all' ? 'All' : f}</span>
                <input
                  type="radio"
                  name="packet-filter"
                  value={f}
                  checked={filter === f}
                  onChange={() => setFilter(f)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Packet List */}
        <div className="flex flex-col gap-2 xs:gap-3 p-3 xs:p-4">
          {packets.map((packet) => (
            <div
              key={packet.id}
              className="glass-card flex flex-col sm:flex-row gap-3 xs:gap-4 rounded-xl px-3 xs:px-4 py-3 justify-between items-center transition-all"
            >
              <div className="flex items-center gap-3 xs:gap-4 w-full sm:w-auto min-w-0">
                <div
                  className={`material-symbols-outlined flex items-center justify-center rounded-lg shrink-0 size-10 xs:size-12 text-xl xs:text-2xl ${
                    packet.status === 'active'
                      ? 'text-accent bg-accent/20'
                      : packet.status === 'claimed'
                        ? 'text-green-400 bg-green-500/10'
                        : 'text-gray-400 bg-gray-500/10'
                  }`}
                >
                  {packet.status === 'claimed' ? 'card_giftcard' : 'rocket_launch'}
                </div>
                <div className="flex flex-1 flex-col justify-center min-w-0">
                  <p className="text-text-primary-light text-sm xs:text-base font-bold leading-normal truncate">
                    {packet.title}
                  </p>
                  <p className="text-text-secondary-light text-xs xs:text-sm font-normal leading-normal line-clamp-2">
                    {packet.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <div
                  className={`flex items-center gap-2 rounded-full px-2 xs:px-3 py-1 text-xs xs:text-sm font-medium whitespace-nowrap ${
                    packet.status === 'active'
                      ? 'bg-orange-500/10 text-orange-400'
                      : packet.status === 'claimed'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-gray-500/10 text-gray-400'
                  }`}
                >
                  <div
                    className={`size-2 rounded-full ${
                      packet.status === 'active'
                        ? 'bg-orange-400'
                        : packet.status === 'claimed'
                          ? 'bg-green-400'
                          : 'bg-gray-400'
                    }`}
                  ></div>
                  <span className="capitalize">{packet.status === 'claimed' ? 'Completed' : packet.status}</span>
                </div>
                {packet.status === 'active' ? (
                  <button className="flex items-center justify-center rounded-md h-9 xs:h-10 px-3 bg-primary/20 text-xs xs:text-sm font-medium text-primary hover:bg-primary/30 active:bg-primary/40 transition-colors touch-manipulation whitespace-nowrap">
                    <span className="truncate">Share Link</span>
                  </button>
                ) : (
                  <Link
                    href={`/packet/${packet.id}`}
                    className="glass-button-secondary flex items-center justify-center rounded-md h-9 xs:h-10 px-3 text-xs xs:text-sm font-medium text-text-secondary-light touch-manipulation whitespace-nowrap"
                  >
                    <span className="truncate">View Details</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}

