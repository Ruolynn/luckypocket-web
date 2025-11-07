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

      {/* Lucky Packet Rain Banner */}
      <div className="px-3 xs:px-4">
        <div className="glass-card relative overflow-hidden rounded-xl p-6 xs:p-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          {/* Coin Rain Decoration */}
          <Decorations.CoinRain />
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-accent rounded-full blur-3xl"></div>
          </div>
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                <div className="w-8 xs:w-10 h-8 xs:h-10 animate-[festive-bounce_1s_ease-in-out_infinite]">
                  <Icons.RedPacket />
                </div>
                <h3 className="text-xl xs:text-2xl font-bold text-text-primary-light relative">
                  Lucky Packet Rain Coming Soon
                  <Decorations.Sparkle className="absolute -top-1 -right-4 w-3 h-3" />
                </h3>
              </div>
              <p className="text-text-secondary-light text-sm xs:text-base mb-3">
                Daily at 12:00, 18:00, 22:00 UTC
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-lg xs:text-xl font-bold text-primary">
                <span>2h 30m</span>
                <Decorations.Sparkle className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <Link
              href="/rain"
              className="glass-button flex items-center justify-center rounded-xl h-11 xs:h-12 px-6 text-primary font-bold touch-manipulation whitespace-nowrap relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              <span className="relative z-10">View Details</span>
              <span className="material-symbols-outlined ml-2 relative z-10">arrow_forward</span>
            </Link>
          </div>
        </div>
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

