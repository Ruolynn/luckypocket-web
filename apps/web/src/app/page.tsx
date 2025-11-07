import Link from 'next/link'
import { MainLayout } from '@/components/MainLayout'
import { StatsCard } from '@/components/StatsCard'
import { PacketCard } from '@/components/PacketCard'
import { LeaderboardPreview } from '@/components/LeaderboardPreview'
import { EnhancedHero } from '@/components/EnhancedHero'
import { Icons, Decorations } from '@/lib/icons'

export default function HomePage() {
  return (
    <MainLayout>
      {/* Enhanced Hero Section with Background Image */}
      <EnhancedHero />

      {/* Featured Stats */}
      <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 xs:gap-4 px-3 xs:px-4">
        <StatsCard label="Today's Packets" value="1,234" />
        <StatsCard label="Today's Volume" value="50.2 ETH" currency="ETH" />
        <StatsCard label="Active Users" value="5,678" />
        <StatsCard label="Completion Rate" value="87%" />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3 xs:gap-4 px-3 xs:px-4">
        <Link
          href="/invite"
          className="glass-card flex-1 flex items-center gap-3 p-4 xs:p-6 rounded-xl bg-gradient-to-br from-blue-50/50 to-purple-50/50 touch-manipulation group hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-center w-12 xs:w-14 h-12 xs:h-14 rounded-full bg-blue-500/10 transition-transform group-hover:scale-110">
            <div className="w-7 xs:w-8 h-7 xs:h-8">
              <Icons.Share />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-base xs:text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              Invite Friends
              <Decorations.Sparkle className="w-3 h-3" />
            </p>
            <p className="text-xs xs:text-sm text-gray-600">Earn $2 USDC per invite</p>
          </div>
          <span className="material-symbols-outlined text-gray-400">chevron_right</span>
        </Link>
        <Link
          href="/achievements"
          className="glass-card flex-1 flex items-center gap-3 p-4 xs:p-6 rounded-xl bg-gradient-to-br from-yellow-50/50 to-orange-50/50 touch-manipulation group hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-center w-12 xs:w-14 h-12 xs:h-14 rounded-full bg-yellow-500/10 transition-transform group-hover:scale-110 group-hover:animate-[festive-bounce_0.6s_ease-in-out_infinite]">
            <div className="w-7 xs:w-8 h-7 xs:h-8">
              <Icons.Trophy />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-base xs:text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              Achievements
              <Decorations.Sparkle className="w-3 h-3" />
            </p>
            <p className="text-xs xs:text-sm text-gray-600">Unlock badges, show off</p>
          </div>
          <span className="material-symbols-outlined text-gray-400">chevron_right</span>
        </Link>
      </div>

      {/* Hot Packets Feed */}
      <div className="px-3 xs:px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl xs:text-2xl font-bold text-text-primary-light">
            Hot Lucky Packets
          </h2>
          <Link
            href="/dashboard"
            className="text-sm xs:text-base text-primary hover:underline font-medium"
          >
            View More
          </Link>
        </div>
        <div className="space-y-3 xs:space-y-4">
          <PacketCard
            title="Happy New Year!"
            description="A gift from vbuterin.eth"
            amount="0.05 ETH"
            claimed={8}
            total={10}
            status="active"
          />
          <PacketCard
            title="Congratulations!"
            description="Wishing everyone prosperity in the new year"
            amount="1.2 ETH"
            claimed={15}
            total={20}
            status="active"
          />
          <PacketCard
            title="All Claimed"
            description="Lucky packet from alice.eth"
            amount="0.8 ETH"
            claimed={10}
            total={10}
            status="claimed"
          />
        </div>
      </div>

      {/* Leaderboard Preview */}
      <LeaderboardPreview />
    </MainLayout>
  )
}

