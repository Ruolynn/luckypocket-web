import Link from 'next/link'
import { Icons, Decorations } from '@/lib/icons'

interface PacketCardProps {
  title: string
  description: string
  amount: string
  claimed: number
  total: number
  status: 'active' | 'claimed'
  packetId?: string
}

export function PacketCard({
  title,
  description,
  amount,
  claimed,
  total,
  status,
  packetId = '#',
}: PacketCardProps) {
  const isClaimed = status === 'claimed'

  // Determine which icon to use
  const isGift = title.includes('Congratulations') || title.includes('Gift')
  const IconComponent = isGift ? Icons.GiftBox : Icons.RedPacket

  return (
    <div
      className={`glass-card flex flex-col sm:flex-row gap-3 xs:gap-4 rounded-xl px-4 xs:px-6 py-4 transition-all hover:shadow-lg group ${
        isClaimed ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-3 xs:gap-4 flex-1 min-w-0">
        <div
          className={`flex items-center justify-center rounded-lg shrink-0 size-12 xs:size-14 transition-all ${
            isClaimed
              ? 'bg-gray-500/10'
              : isGift
                ? 'bg-green-500/10 group-hover:scale-110 group-hover:animate-[festive-bounce_0.6s_ease-in-out_infinite]'
                : 'bg-accent/20 group-hover:scale-110 group-hover:animate-[shake_0.5s_ease-in-out_infinite]'
          }`}
        >
          <div className={`w-8 xs:w-9 h-8 xs:h-9 ${isClaimed ? 'opacity-40' : ''}`}>
            <IconComponent />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base xs:text-lg font-bold text-text-primary-light truncate mb-1 flex items-center gap-2">
            {title}
            {!isClaimed && <Decorations.Sparkle className="w-3 h-3 flex-shrink-0" />}
          </p>
          <p className="text-xs xs:text-sm text-text-secondary-light line-clamp-2">
            {description}
          </p>
          <div className="flex items-center gap-3 xs:gap-4 mt-2 text-xs xs:text-sm text-text-secondary-light">
            <span className="flex items-center gap-1">
              <div className="w-4 h-4">
                <Icons.Coin />
              </div>
              <span>{amount}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">group</span>
              <span>
                {isClaimed ? 'All claimed' : `${claimed}/${total} claimed`}
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 sm:flex-col">
        {isClaimed ? (
          <button
            disabled
            className="flex items-center justify-center rounded-lg h-10 xs:h-11 px-4 bg-gray-100 text-sm xs:text-base font-medium text-gray-400 cursor-not-allowed whitespace-nowrap"
          >
            All Claimed
          </button>
        ) : (
          <Link
            href={`/packet/${packetId}`}
            className="glass-button flex items-center justify-center rounded-lg h-10 xs:h-11 px-4 text-sm xs:text-base font-medium text-primary touch-manipulation whitespace-nowrap"
          >
            <span>Claim</span>
          </Link>
        )}
        <Link
          href={`/packet/${packetId}`}
          className="glass-button-secondary flex items-center justify-center rounded-lg h-10 xs:h-11 px-4 text-sm xs:text-base font-medium text-text-secondary-light touch-manipulation whitespace-nowrap"
        >
          <span>Details</span>
        </Link>
      </div>
    </div>
  )
}

