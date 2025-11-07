import { Icons } from '@/lib/icons'

type IconType = 'RedPacket' | 'Coin' | 'Fire' | 'Star' | 'GiftBox' | 'Wallet' | 'Trophy' | 'Web3Avatar' |
                'BitcoinCoin' | 'UsdcCoin' | 'UsdtCoin' | 'SolanaCoin' | 'PolygonCoin' | 'BaseCoin'

type CurrencyType = 'ETH' | 'BTC' | 'USDC' | 'USDT' | 'SOL' | 'MATIC' | 'BASE'

interface StatsCardProps {
  label: string
  value: string
  icon?: IconType
  iconColor?: 'primary' | 'accent' | 'green' | 'blue' | 'yellow' | 'purple' | 'orange'
  currency?: CurrencyType  // 新增：用于 Volume 卡片的币种
}

// 根据币种获取对应的图标
function getCurrencyIcon(currency: CurrencyType): IconType {
  const currencyMap: Record<CurrencyType, IconType> = {
    'ETH': 'Coin',
    'BTC': 'BitcoinCoin',
    'USDC': 'UsdcCoin',
    'USDT': 'UsdtCoin',
    'SOL': 'SolanaCoin',
    'MATIC': 'PolygonCoin',
    'BASE': 'BaseCoin',
  }
  return currencyMap[currency] || 'Coin'
}

// 根据 label 自动获取图标（如果未提供 icon prop）
function getIconForLabel(label: string, currency?: CurrencyType): IconType {
  const lowerLabel = label.toLowerCase()
  if (lowerLabel.includes('packet')) return 'RedPacket'
  // Volume 类型：如果有币种信息，使用对应的币种图标
  if (lowerLabel.includes('volume') || lowerLabel.includes('value') || lowerLabel.includes('amount')) {
    return currency ? getCurrencyIcon(currency) : 'Coin'
  }
  // Active Users 使用 Web3Avatar
  if (lowerLabel.includes('user') || lowerLabel.includes('people') || lowerLabel.includes('active')) return 'Web3Avatar'
  if (lowerLabel.includes('rate') || lowerLabel.includes('completion') || lowerLabel.includes('percent')) return 'Star'
  if (lowerLabel.includes('sent') || lowerLabel.includes('send')) return 'GiftBox'
  if (lowerLabel.includes('received') || lowerLabel.includes('claim')) return 'GiftBox'
  if (lowerLabel.includes('invite') || lowerLabel.includes('reward')) return 'Trophy'
  if (lowerLabel.includes('wallet') || lowerLabel.includes('balance')) return 'Wallet'
  return 'Coin'
}

// 根据 label 自动获取图标颜色（如果未提供 iconColor prop）
function getIconColorForLabel(label: string): 'primary' | 'accent' | 'green' | 'blue' | 'yellow' | 'purple' | 'orange' {
  const lowerLabel = label.toLowerCase()
  if (lowerLabel.includes('volume') || lowerLabel.includes('value') || lowerLabel.includes('amount')) return 'accent'
  if (lowerLabel.includes('user') || lowerLabel.includes('people') || lowerLabel.includes('active')) return 'purple'
  if (lowerLabel.includes('rate') || lowerLabel.includes('completion')) return 'green'
  if (lowerLabel.includes('received') || lowerLabel.includes('claim')) return 'green'
  if (lowerLabel.includes('invite') || lowerLabel.includes('reward')) return 'yellow'
  return 'primary'
}

const iconColorClasses = {
  primary: 'text-primary bg-primary/10',
  accent: 'text-accent bg-accent/10',
  green: 'text-green-600 bg-green-500/10',
  blue: 'text-blue-600 bg-blue-500/10',
  yellow: 'text-yellow-600 bg-yellow-500/10',
  purple: 'text-purple-600 bg-purple-500/10',
  orange: 'text-orange-600 bg-orange-500/10',
}

export function StatsCard({ label, value, icon, iconColor, currency }: StatsCardProps) {
  const displayIcon = icon || getIconForLabel(label, currency)
  const displayColor = iconColor || getIconColorForLabel(label)

  // Get the icon component
  const IconComponent = Icons[displayIcon]

  return (
    <div className="glass-card-gradient flex flex-col items-center p-4 xs:p-6 rounded-xl transition-all scale-on-hover group cursor-pointer">
      {/* Icon with glow effect */}
      <div className={`flex items-center justify-center w-10 xs:w-12 h-10 xs:h-12 rounded-full mb-2 xs:mb-3 ${iconColorClasses[displayColor]} transition-transform group-hover:scale-110 group-hover:animate-[festive-bounce_0.6s_ease-in-out_infinite]`}>
        <div className="w-6 xs:w-7 h-6 xs:h-7">
          <IconComponent />
        </div>
      </div>

      {/* Label */}
      <p className="text-text-secondary-light text-xs xs:text-sm font-medium mb-1 transition-colors group-hover:text-text-primary-light">{label}</p>

      {/* Value with neon glow on hover */}
      <p className="text-text-primary-light text-xl xs:text-2xl font-bold transition-all group-hover:scale-105">{value}</p>
    </div>
  )
}

