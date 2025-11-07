# 🧧 Lucky Packet

A decentralized lucky packet (red envelope) dApp built on Base blockchain. Send and receive encrypted lucky packets with Web3 social payment experience.

## ✨ Features

- 🎁 **Create Lucky Packets** - Send crypto lucky packets to friends and community
- 🔍 **Claim Packets** - Discover and claim available lucky packets
- 📊 **Dashboard** - Track your sent and received packets
- 👥 **Invite & Earn** - Share with friends and earn rewards
- 🏆 **Achievements** - Unlock badges and show off your activity
- 📱 **Mobile Optimized** - Responsive design with touch-friendly UI

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL
- Redis

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Development

Start both frontend and backend in separate terminals:

**Terminal 1 - API Server**
```bash
cd apps/api
pnpm dev
# API runs on http://localhost:9001
```

**Terminal 2 - Web App**
```bash
cd apps/web
pnpm dev
# Web app runs on http://localhost:9003
```

### Access Application

- 🌐 Web App: http://localhost:9003
- 🔌 API Server: http://localhost:9001

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Web3**: wagmi, viem, RainbowKit
- **Icons**: Custom SVG icon library with festive themes

### Backend
- **Framework**: Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: Sign-In with Ethereum (SIWE)

### Smart Contracts
- **Chain**: Base Sepolia (testnet)
- **Contracts**: RedPacket.sol for packet management

## 📁 Project Structure

```
luckypocket/
├── apps/
│   ├── api/          # Fastify backend
│   └── web/          # Next.js frontend
├── packages/
│   └── contracts/    # Smart contracts
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## 🎨 Design System

Our UI features a festive, Web3-friendly design:

- **Glass morphism** effects
- **Custom icons** with Chinese New Year themes
- **Cryptocurrency icons** with official brand colors
- **Responsive layouts** optimized for mobile and desktop
- **Smooth animations** and transitions

## 🔐 Security

- SIWE authentication for wallet-based login
- JWT tokens for session management
- Rate limiting on API endpoints
- Input validation and sanitization

## 📖 Documentation

- [API Integration Guide](./docs/API-Integration-Guide.md)
- [Red Packet dApp PRD](./docs/红包dApp-PRD.md)
- [Technical Implementation](./docs/技术落地方案-模块接口与伪代码.md)
- [Base Documentation](./docs/Base-RedPacket-dApp-Complete-Documentation.md)

## 🤝 Contributing

This is a private project. Please contact the team for contribution guidelines.

## 📝 License

Private & Proprietary

## 👥 Team

- **Frontend**: Ruolynn Chen
- **Organization**: Zesty Studio

---

**Last Updated**: 2025-11-07
