/**
 * LuckyPocket 图标库
 * 喜庆、Web3 Social 友好的彩色图标集合
 */

export const Icons = {
  // 红包相关图标 - 使用喜庆的红色和金色
  RedPacket: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="redPacketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF4545" />
          <stop offset="50%" stopColor="#FF6B6B" />
          <stop offset="100%" stopColor="#FF8E8E" />
        </linearGradient>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFC107" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
      </defs>
      {/* 红包主体 */}
      <rect x="12" y="8" width="40" height="48" rx="4" fill="url(#redPacketGradient)" />
      {/* 金色装饰边 */}
      <rect x="14" y="10" width="36" height="2" rx="1" fill="url(#goldGradient)" />
      <rect x="14" y="52" width="36" height="2" rx="1" fill="url(#goldGradient)" />
      {/* 封口装饰 */}
      <path d="M 20 8 Q 32 14 44 8" stroke="url(#goldGradient)" strokeWidth="2" fill="none" />
      {/* 福字圆形 */}
      <circle cx="32" cy="32" r="10" fill="url(#goldGradient)" />
      <text x="32" y="37" textAnchor="middle" fill="#FF4545" fontSize="12" fontWeight="bold">福</text>
    </svg>
  ),

  // Logo - Lucky Packet 红包 + Web3 Social 元素
  Logo: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        {/* 红包主渐变 - 喜庆红色 */}
        <linearGradient id="logoRedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF3B3B" />
          <stop offset="50%" stopColor="#FF5757" />
          <stop offset="100%" stopColor="#FF7373" />
        </linearGradient>
        {/* 金色渐变 - 财富象征 */}
        <linearGradient id="logoGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFC107" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
        {/* 发光效果 */}
        <radialGradient id="logoGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#FFE57F" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 外发光圈 - Web3 科技感 */}
      <circle cx="32" cy="32" r="30" fill="url(#logoGlow)" opacity="0.3" />

      {/* 红包主体 - 圆角矩形 */}
      <rect x="14" y="8" width="36" height="48" rx="6" fill="url(#logoRedGradient)" />

      {/* 顶部金色封口装饰 */}
      <path d="M 14 16 Q 32 10 50 16" fill="url(#logoGoldGradient)" />
      <rect x="16" y="8" width="32" height="3" rx="1.5" fill="url(#logoGoldGradient)" />

      {/* 金色装饰边框 */}
      <rect x="16" y="20" width="32" height="1.5" rx="0.75" fill="url(#logoGoldGradient)" opacity="0.6" />
      <rect x="16" y="53" width="32" height="1.5" rx="0.75" fill="url(#logoGoldGradient)" opacity="0.6" />

      {/* 中心福字圆形背景 */}
      <circle cx="32" cy="36" r="12" fill="url(#logoGoldGradient)" />
      <circle cx="32" cy="36" r="11" fill="#FFFFFF" opacity="0.2" />

      {/* 福字 */}
      <text
        x="32"
        y="42"
        textAnchor="middle"
        fill="#FF3B3B"
        fontSize="16"
        fontWeight="900"
        fontFamily="serif"
      >福</text>

      {/* 区块链网络节点装饰 - Web3 元素 */}
      <circle cx="20" cy="28" r="1.5" fill="url(#logoGoldGradient)" opacity="0.8" />
      <circle cx="44" cy="28" r="1.5" fill="url(#logoGoldGradient)" opacity="0.8" />
      <circle cx="20" cy="44" r="1.5" fill="url(#logoGoldGradient)" opacity="0.8" />
      <circle cx="44" cy="44" r="1.5" fill="url(#logoGoldGradient)" opacity="0.8" />

      {/* 连接线 - 区块链网络 */}
      <line x1="20" y1="28" x2="32" y2="36" stroke="url(#logoGoldGradient)" strokeWidth="0.5" opacity="0.4" />
      <line x1="44" y1="28" x2="32" y2="36" stroke="url(#logoGoldGradient)" strokeWidth="0.5" opacity="0.4" />
      <line x1="20" y1="44" x2="32" y2="36" stroke="url(#logoGoldGradient)" strokeWidth="0.5" opacity="0.4" />
      <line x1="44" y1="44" x2="32" y2="36" stroke="url(#logoGoldGradient)" strokeWidth="0.5" opacity="0.4" />

      {/* 顶部闪光效果 */}
      <circle cx="38" cy="14" r="2" fill="white" opacity="0.9" />
      <circle cx="34" cy="12" r="1" fill="white" opacity="0.7" />
      <circle cx="30" cy="13" r="1.5" fill="#FFE57F" opacity="0.8" />
    </svg>
  ),

  // 礼物盒 - 用于 Gift 功能
  GiftBox: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="giftGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B9D" />
          <stop offset="100%" stopColor="#C44569" />
        </linearGradient>
      </defs>
      {/* 礼物盒主体 */}
      <rect x="12" y="24" width="40" height="32" rx="2" fill="url(#giftGradient)" />
      {/* 丝带 */}
      <rect x="28" y="24" width="8" height="32" fill="#FFD700" />
      <rect x="12" y="36" width="40" height="8" fill="#FFD700" />
      {/* 蝴蝶结 */}
      <ellipse cx="24" cy="20" rx="8" ry="6" fill="#FFD700" />
      <ellipse cx="40" cy="20" rx="8" ry="6" fill="#FFD700" />
      <circle cx="32" cy="20" r="4" fill="#FFC107" />
    </svg>
  ),

  // 金币 - Web3 友好 - ETH 金色
  Coin: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="coinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFC107" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
        <radialGradient id="coinShine">
          <stop offset="0%" stopColor="#FFEB3B" />
          <stop offset="100%" stopColor="#FFD700" />
        </radialGradient>
      </defs>
      {/* 外圈 */}
      <circle cx="32" cy="32" r="28" fill="url(#coinGradient)" />
      {/* 内圈装饰 */}
      <circle cx="32" cy="32" r="24" fill="url(#coinShine)" />
      <circle cx="32" cy="32" r="20" stroke="#FFA000" strokeWidth="2" fill="none" />
      {/* ETH 符号 */}
      <path d="M32 16 L32 30 L44 32 Z" fill="#FFA000" opacity="0.8" />
      <path d="M32 16 L20 32 L32 30 Z" fill="#FF8F00" />
      <path d="M32 34 L32 48 L44 32 Z" fill="#FFA000" opacity="0.6" />
      <path d="M32 34 L20 32 L32 48 Z" fill="#FF8F00" opacity="0.6" />
    </svg>
  ),

  // BTC - 橙色
  BitcoinCoin: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="btcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9800" />
          <stop offset="50%" stopColor="#FF6F00" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#btcGradient)" />
      <circle cx="32" cy="32" r="24" fill="#FFA726" />
      <circle cx="32" cy="32" r="20" stroke="#E65100" strokeWidth="2" fill="none" />
      {/* BTC B符号 */}
      <path d="M28 20 L28 44 M28 20 L36 20 Q40 20 40 26 Q40 30 36 30 L28 30 M28 30 L38 30 Q42 30 42 36 Q42 44 36 44 L28 44 M30 16 L30 48 M34 16 L34 48" stroke="#E65100" strokeWidth="2" fill="none" />
    </svg>
  ),

  // USDC - 蓝色
  UsdcCoin: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="usdcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2775CA" />
          <stop offset="50%" stopColor="#1E5DA8" />
          <stop offset="100%" stopColor="#1B4C8F" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#usdcGradient)" />
      <circle cx="32" cy="32" r="24" fill="#3B82E8" />
      <circle cx="32" cy="32" r="20" stroke="#1B4C8F" strokeWidth="2" fill="none" />
      {/* USDC 美元符号 */}
      <text x="32" y="42" textAnchor="middle" fill="#1B4C8F" fontSize="28" fontWeight="bold">$</text>
    </svg>
  ),

  // USDT - 绿色
  UsdtCoin: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="usdtGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#26A17B" />
          <stop offset="50%" stopColor="#1F8A66" />
          <stop offset="100%" stopColor="#197556" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#usdtGradient)" />
      <circle cx="32" cy="32" r="24" fill="#2AB57D" />
      <circle cx="32" cy="32" r="20" stroke="#197556" strokeWidth="2" fill="none" />
      {/* USDT T符号 */}
      <path d="M20 22 L44 22 M32 22 L32 42 M26 42 L38 42" stroke="#197556" strokeWidth="3" fill="none" />
    </svg>
  ),

  // SOL - 紫色渐变
  SolanaCoin: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="solGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="50%" stopColor="#7E3FD8" />
          <stop offset="100%" stopColor="#6A30C0" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#solGradient)" />
      <circle cx="32" cy="32" r="24" fill="#A855F7" />
      <circle cx="32" cy="32" r="20" stroke="#6A30C0" strokeWidth="2" fill="none" />
      {/* SOL 箭头符号 */}
      <path d="M20 26 L42 26 L38 22 M20 32 L44 32 M20 38 L42 38 L38 42" stroke="#6A30C0" strokeWidth="2" fill="none" />
    </svg>
  ),

  // MATIC - 紫蓝色
  PolygonCoin: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="maticGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8247E5" />
          <stop offset="50%" stopColor="#6B38D1" />
          <stop offset="100%" stopColor="#5B2CB8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#maticGradient)" />
      <circle cx="32" cy="32" r="24" fill="#9457EB" />
      <circle cx="32" cy="32" r="20" stroke="#5B2CB8" strokeWidth="2" fill="none" />
      {/* Polygon 多边形 */}
      <path d="M32 18 L42 24 L42 36 L32 42 L22 36 L22 24 Z" stroke="#5B2CB8" strokeWidth="2" fill="none" />
    </svg>
  ),

  // BASE - 蓝色
  BaseCoin: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="baseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0052FF" />
          <stop offset="50%" stopColor="#0041CC" />
          <stop offset="100%" stopColor="#0033AA" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#baseGradient)" />
      <circle cx="32" cy="32" r="24" fill="#1E6EFF" />
      <circle cx="32" cy="32" r="20" stroke="#0033AA" strokeWidth="2" fill="none" />
      {/* BASE B字母 */}
      <text x="32" y="42" textAnchor="middle" fill="#0033AA" fontSize="24" fontWeight="bold">B</text>
    </svg>
  ),

  // 火焰 - 热门标识
  Fire: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="fireGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FF4500" />
          <stop offset="50%" stopColor="#FF6347" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
      </defs>
      <path d="M32 8 Q28 16 28 24 Q28 28 30 30 Q28 32 28 36 Q28 44 32 48 Q36 44 36 36 Q36 32 34 30 Q36 28 36 24 Q36 16 32 8 Z" fill="url(#fireGradient)" />
      <path d="M32 16 Q30 20 30 24 Q30 28 32 30 Q34 28 34 24 Q34 20 32 16 Z" fill="#FFD700" opacity="0.8" />
    </svg>
  ),

  // 星星 - 成就/特别标识
  Star: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFC107" />
        </linearGradient>
      </defs>
      <path d="M32 8 L38 26 L56 28 L42 40 L46 56 L32 46 L18 56 L22 40 L8 28 L26 26 Z" fill="url(#starGradient)" />
      <circle cx="32" cy="28" r="4" fill="#FFEB3B" opacity="0.8" />
    </svg>
  ),

  // 钱包 - Web3 钱包
  Wallet: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="walletGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="8" y="16" width="48" height="36" rx="4" fill="url(#walletGradient)" />
      <rect x="12" y="20" width="40" height="28" rx="2" fill="#8B5CF6" opacity="0.5" />
      <rect x="44" y="28" width="8" height="12" rx="2" fill="#A78BFA" />
      <circle cx="48" cy="34" r="2" fill="#E0E7FF" />
    </svg>
  ),

  // Web3 Avatar - 社交头像
  Web3Avatar: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="avatarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667EEA" />
          <stop offset="50%" stopColor="#764BA2" />
          <stop offset="100%" stopColor="#F093FB" />
        </linearGradient>
        <linearGradient id="avatarShine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      {/* 外圈 - 渐变边框 */}
      <circle cx="32" cy="32" r="30" fill="url(#avatarGradient)" />
      <circle cx="32" cy="32" r="27" fill="white" />
      {/* 头部 */}
      <circle cx="32" cy="26" r="10" fill="url(#avatarShine)" />
      {/* 身体 */}
      <path d="M 32 36 Q 20 36 16 48 L 48 48 Q 44 36 32 36 Z" fill="url(#avatarShine)" />
      {/* Web3 装饰点 */}
      <circle cx="24" cy="18" r="2" fill="#FFD700" opacity="0.8" />
      <circle cx="40" cy="20" r="2" fill="#00D4FF" opacity="0.8" />
      <circle cx="44" cy="32" r="2" fill="#FF3366" opacity="0.8" />
    </svg>
  ),

  // 社交分享
  Share: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="shareGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00B8D9" />
          <stop offset="100%" stopColor="#0086A8" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="16" r="8" fill="url(#shareGradient)" />
      <circle cx="16" cy="48" r="8" fill="url(#shareGradient)" />
      <circle cx="48" cy="48" r="8" fill="url(#shareGradient)" />
      <line x1="28" y1="22" x2="20" y2="42" stroke="url(#shareGradient)" strokeWidth="4" />
      <line x1="36" y1="22" x2="44" y2="42" stroke="url(#shareGradient)" strokeWidth="4" />
    </svg>
  ),

  // 奖杯
  Trophy: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="trophyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA000" />
        </linearGradient>
      </defs>
      <path d="M20 16 L20 8 L44 8 L44 16" stroke="url(#trophyGradient)" strokeWidth="4" fill="none" />
      <ellipse cx="32" cy="28" rx="12" ry="16" fill="url(#trophyGradient)" />
      <rect x="28" y="44" width="8" height="12" fill="url(#trophyGradient)" />
      <rect x="20" y="54" width="24" height="4" rx="2" fill="url(#trophyGradient)" />
      <circle cx="32" cy="28" r="6" fill="#FFEB3B" />
    </svg>
  ),

  // Twitter/X - 黑色官方
  TwitterIcon: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="twitterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1DA1F2" />
          <stop offset="100%" stopColor="#0D8BD9" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#twitterGradient)" />
      {/* X logo */}
      <path d="M 22 18 L 32 32 L 22 46 M 42 18 L 32 32 L 42 46" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="22" y1="18" x2="42" y2="46" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="42" y1="18" x2="22" y2="46" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),

  // Discord - 紫色官方
  DiscordIcon: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="discordGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7289DA" />
          <stop offset="100%" stopColor="#5865F2" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#discordGradient)" />
      {/* Discord logo简化版 */}
      <path d="M 20 24 Q 20 20 24 20 L 40 20 Q 44 20 44 24 L 44 38 Q 44 42 40 42 L 36 42 L 34 46 L 30 46 L 28 42 L 24 42 Q 20 42 20 38 Z" fill="white" />
      {/* Eyes */}
      <circle cx="27" cy="30" r="3" fill="#5865F2" />
      <circle cx="37" cy="30" r="3" fill="#5865F2" />
    </svg>
  ),

  // Telegram - 蓝色官方
  TelegramIcon: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="telegramGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2AABEE" />
          <stop offset="100%" stopColor="#229ED9" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#telegramGradient)" />
      {/* Paper plane */}
      <path d="M 18 32 L 46 20 L 38 46 L 28 38 L 32 34 L 38 28 L 26 36 Z" fill="white" />
    </svg>
  ),

  // GitHub - 黑白官方
  GitHubIcon: () => (
    <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id="githubGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#24292e" />
          <stop offset="100%" stopColor="#1a1e22" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#githubGradient)" />
      {/* GitHub Octocat simplified */}
      <circle cx="32" cy="28" r="14" fill="white" />
      <circle cx="27" cy="26" r="2" fill="#24292e" />
      <circle cx="37" cy="26" r="2" fill="#24292e" />
      <path d="M 28 32 Q 32 34 36 32" stroke="#24292e" strokeWidth="2" fill="none" />
      {/* Cat ears */}
      <circle cx="22" cy="18" r="4" fill="white" />
      <circle cx="42" cy="18" r="4" fill="white" />
    </svg>
  ),
}

// 装饰性元素
export const Decorations = {
  // 烟花效果
  Firework: ({ color = "#FFD700", size = 40 }: { color?: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" className="animate-pulse">
      <circle cx="32" cy="32" r="4" fill={color} />
      <circle cx="32" cy="16" r="2" fill={color} opacity="0.8" />
      <circle cx="48" cy="24" r="2" fill={color} opacity="0.8" />
      <circle cx="48" cy="40" r="2" fill={color} opacity="0.8" />
      <circle cx="32" cy="48" r="2" fill={color} opacity="0.8" />
      <circle cx="16" cy="40" r="2" fill={color} opacity="0.8" />
      <circle cx="16" cy="24" r="2" fill={color} opacity="0.8" />
    </svg>
  ),

  // 加密货币雨动画 - 彩虹色多币种
  CoinRain: () => {
    // 多种加密货币图标数组
    const cryptoIcons = [
      Icons.Coin,        // ETH - 金色
      Icons.BitcoinCoin, // BTC - 橙色
      Icons.UsdcCoin,    // USDC - 蓝色
      Icons.UsdtCoin,    // USDT - 绿色
      Icons.SolanaCoin,  // SOL - 紫色
      Icons.PolygonCoin, // MATIC - 紫蓝色
      Icons.BaseCoin,    // BASE - 蓝色
    ]

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(10)].map((_, i) => {
          // 随机选择加密货币图标
          const CryptoIcon = cryptoIcons[i % cryptoIcons.length]
          return (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${5 + i * 10}%`,
                animationDelay: `${i * 0.4}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <div className="w-6 h-6">
                <CryptoIcon />
              </div>
            </div>
          )
        })}
      </div>
    )
  },

  // 闪光效果
  Sparkle: ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 text-yellow-400 ${className}`}>
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  ),
}

// 动画类名
export const animations = {
  float: 'animate-[float_3s_ease-in-out_infinite]',
  pulse: 'animate-[pulse_2s_ease-in-out_infinite]',
  shimmer: 'animate-[shimmer_2s_linear_infinite]',
  bounce: 'animate-[bounce_1s_ease-in-out_infinite]',
  fall: 'animate-[fall_3s_linear_infinite]',
}
