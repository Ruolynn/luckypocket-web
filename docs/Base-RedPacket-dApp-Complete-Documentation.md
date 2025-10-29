# 🧧 Base 红包 dApp 完整开发文档

## 📋 目录

- [项目概述](#项目概述)
- [技术架构](#技术架构)
- [技术栈详解](#技术栈详解)
- [开发环境配置](#开发环境配置)
- [智能合约开发](#智能合约开发)
- [前端开发](#前端开发)
- [后端开发](#后端开发)
- [Farcaster Frames 集成](#farcaster-frames-集成)
- [测试策略](#测试策略)
- [部署流程](#部署流程)
- [产品功能规格](#产品功能规格)
- [病毒增长机制](#病毒增长机制)
- [安全审计清单](#安全审计清单)
- [开发路线图](#开发路线图)

---

## 架构定稿与重要变更（2025-10 更新）

- 核心架构：前后端 + 链（放弃"无后端/极简后端"）。
- 前端：Next.js 14、React 18、TypeScript、Tailwind、Neobrutalist UI、Lucide、Wagmi v2、RainbowKit、Viem、Zustand、TanStack Query、React Hot Toast。
- 后端：Fastify 4、TypeScript、Zod、Prisma ORM、PostgreSQL、Redis（缓存/会话/队列/Socket 适配）、Socket.IO（Redis Adapter 多实例）。
- 鉴权：SIWE（Sign-In with Ethereum）+ JWT；不默认使用 Privy（可作为可选扩展）。
- 区块链：Solidity 0.8.20、Foundry、OpenZeppelin；网络优先 Ethereum Sepolia（测试），后续再切主网；SDK 以 Viem 为主（可选 Ethers）。
- 部署：pnpm Monorepo、Docker Compose + Nginx、Railway（MVP/内测）+ 预留数据库迁移到 Neon/Supabase/Aiven/RDS 的策略。
- 数据库策略（Railway 阶段）：
  - 连接与池化：启用 PgBouncer（或 Prisma 连接数限制），API 层指数退避重试。
  - 备份：开启每日自动备份；收录 `pg_dump/pg_restore` 脚本，按月演练恢复。
  - 迁移：Prisma `migrate deploy` 作为发布前置步骤；达成阈值（>50GB、>200–300rps、需 PITR/只读副本）时迁移到专业 PG（Neon/Supabase/Aiven/RDS）。
- Frames：保留后端代理领取与分布式锁/幂等；与外部钱包主路径不冲突。

（以下原文档章节如与本节不一致，以本节为准；后续逐段替换到位）

## 项目概述

### 项目定位
Base 链上的社交红包 dApp,深度集成 Farcaster 生态,实现微信红包式的 Web3 社交支付体验。

### 核心价值主张
- 🚀 **零门槛**: Account Abstraction 无 Gas 费体验
- ⚡ **零跳转**: Farcaster Frames 内完成全流程
- 🎮 **高互动**: 游戏化设计 + 社交裂变
- 💰 **真激励**: 发红包/抢红包/邀请奖励

### 技术亮点
- EVM 兼容(可扩展到其他 L2)
- AA 智能账户(Privy/Biconomy)
- Farcaster Frames 深度集成
- 实时 WebSocket 通知
- 链上+链下混合架构

---

## 技术架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                       用户层                             │
│  Warpcast App  │  Web dApp  │  Mobile dApp (Future)    │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                    前端层 (Next.js)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Frame UI │  │ Web UI   │  │ Wallet   │             │
│  │ (Frog)   │  │ (React)  │  │ (Privy)  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                   后端服务层 (Node.js)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ API      │  │ WebSocket│  │ Queue    │             │
│  │ Gateway  │  │ Server   │  │ (Bull)   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                    区块链层 (Base)                       │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ RedPacket.sol    │  │ AccountFactory   │           │
│  │ (核心合约)        │  │ (AA 钱包)        │           │
│  └──────────────────┘  └──────────────────┘           │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│                    数据层 (PostgreSQL)                   │
│  用户表 │ 红包表 │ 领取记录 │ 邀请关系 │ 统计数据      │
└─────────────────────────────────────────────────────────┘
```

### 数据流向

**发红包流程**:
```
用户 → Frame UI → API Server → 创建 AA Tx → 
智能合约(mint) → 数据库记录 → WebSocket 广播 → 其他用户收到通知
```

**抢红包流程**:
```
用户 → Frame 点击 → API 验证(未领取?) → 
智能合约(claim) → 转账 USDC → 数据库更新 → 
WebSocket 推送结果 → 显示动画
```

---

## 技术栈详解

### 前端技术栈

| 技术 | 版本 | 用途 | 备注 |
|------|------|------|------|
| **Next.js** | 14.x | React 框架 | App Router, SSR |
| **TypeScript** | 5.x | 类型安全 | 强类型开发 |
| **Tailwind CSS** | 3.x | 样式 | 快速 UI 开发 |
| **Viem** | 2.x | EVM 交互 | 替代 ethers.js |
| **Wagmi** | 2.x | React Hooks | 钱包连接 |
| **Privy** | latest | AA 钱包 | 邮箱登录,无 Gas |
| **Frog** | latest | Frames 开发 | Farcaster 官方推荐 |
| **Framer Motion** | latest | 动画 | 红包动画效果 |
| **Zustand** | 4.x | 状态管理 | 轻量级 |
| **React Query** | 5.x | 数据获取 | 缓存优化 |
| **Socket.IO Client** | 4.x | 实时通信 | WebSocket |

### 后端技术栈

| 技术 | 版本 | 用途 | 备注 |
|------|------|------|------|
| **Node.js** | 20.x LTS | 运行环境 | - |
| **Express** | 4.x | Web 框架 | RESTful API |
| **TypeScript** | 5.x | 类型安全 | - |
| **Prisma** | 5.x | ORM | 数据库操作 |
| **PostgreSQL** | 16.x | 主数据库 | 关系型数据 |
| **Redis** | 7.x | 缓存/队列 | 高性能缓存 |
| **Bull** | 4.x | 任务队列 | 异步任务处理 |
| **Socket.IO** | 4.x | WebSocket | 实时推送 |
| **Viem** | 2.x | 链上交互 | 后端调用合约 |
| **JWT** | 9.x | 身份验证 | Token 认证 |

### 区块链技术栈

| 技术 | 版本 | 用途 | 备注 |
|------|------|------|------|
| **Solidity** | 0.8.24 | 智能合约 | 最新稳定版 |
| **Foundry** | latest | 合约框架 | 编译/测试/部署 |
| **OpenZeppelin** | 5.x | 合约库 | 安全标准实现 |
| **Chainlink VRF** | v2.5 | 随机数 | 可验证随机 |
| **Base Mainnet** | - | 部署链 | L2 低成本 |
| **Base Sepolia** | - | 测试网 | 开发测试 |

### 外部服务

| 服务 | 用途 | 备注 |
|------|------|------|
| **Alchemy** | RPC 节点 | Base RPC 服务 |
| **Privy** | AA 钱包服务 | 托管账户抽象 |
| **Farcaster Hub** | 社交数据 | 用户关系图谱 |
| **Pinata/IPFS** | 存储 | NFT 元数据 |
| **Vercel** | 部署 | 前端托管 |
| **Railway/Render** | 部署 | 后端托管 |
| **Sentry** | 监控 | 错误追踪 |

---

## 开发环境配置

### 系统要求

```bash
# 操作系统
Ubuntu 22.04+ / macOS 13+ / Windows 11 WSL2

# 软件版本
Node.js: v20.x LTS
pnpm: v8.x+
Git: v2.40+
Docker: v24.x+ (可选)
PostgreSQL: v16.x
Redis: v7.x
```

### 环境安装

#### 1. 安装 Node.js 和 pnpm

```bash
# 使用 nvm 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 安装 pnpm
npm install -g pnpm

# 验证
node -v  # v20.x.x
pnpm -v  # 8.x.x
```

#### 2. 安装 Foundry (智能合约)

```bash
# 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 验证
forge --version
cast --version
anvil --version
```

#### 3. 安装数据库

```bash
# PostgreSQL (使用 Docker)
docker run --name redpacket-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=redpacket \
  -p 5432:5432 \
  -d postgres:16

# Redis (使用 Docker)
docker run --name redpacket-redis \
  -p 6379:6379 \
  -d redis:7-alpine

# 或者本地安装
sudo apt install postgresql-16 redis-server  # Ubuntu
brew install postgresql@16 redis             # macOS
```

### 项目初始化

#### 1. 创建项目结构

```bash
mkdir base-redpacket-dapp
cd base-redpacket-dapp

# 创建目录结构
mkdir -p {contracts,frontend,backend,scripts,docs}

# 初始化 Git
git init
```

#### 2. 智能合约项目

```bash
cd contracts
forge init
pnpm init

# 安装依赖
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0
forge install smartcontractkit/chainlink@v2.5.0
```

**foundry.toml** 配置:
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200
via_ir = true

[rpc_endpoints]
base = "https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}"
base_sepolia = "https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}"

[etherscan]
base = { key = "${BASESCAN_API_KEY}", url = "https://api.basescan.org/api" }
base_sepolia = { key = "${BASESCAN_API_KEY}", url = "https://api-sepolia.basescan.org/api" }
```

#### 3. 前端项目

```bash
cd ../frontend
pnpm create next-app@latest . --typescript --tailwind --app --src-dir

# 安装核心依赖
pnpm add viem wagmi @privy-io/react-auth @tanstack/react-query
pnpm add frog hono
pnpm add framer-motion zustand
pnpm add socket.io-client axios

# 开发依赖
pnpm add -D @types/node prettier eslint
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### 4. 后端项目

```bash
cd ../backend
pnpm init

# 安装依赖
pnpm add express cors dotenv
pnpm add prisma @prisma/client
pnpm add socket.io redis bull
pnpm add viem jsonwebtoken bcrypt
pnpm add winston express-rate-limit helmet

# 开发依赖
pnpm add -D typescript @types/node @types/express
pnpm add -D tsx nodemon prisma
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**package.json scripts**:
```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

### 环境变量配置

#### contracts/.env
```bash
# RPC
ALCHEMY_API_KEY=your_alchemy_api_key

# 部署私钥 (仅测试网使用,主网用硬件钱包)
PRIVATE_KEY=your_private_key

# 区块链浏览器
BASESCAN_API_KEY=your_basescan_api_key

# Chainlink VRF (Base Sepolia)
VRF_COORDINATOR=0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
VRF_KEY_HASH=0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314
VRF_SUBSCRIPTION_ID=your_subscription_id
```

#### frontend/.env.local
```bash
# API
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# 链配置
NEXT_PUBLIC_CHAIN_ID=8453  # Base Mainnet
# NEXT_PUBLIC_CHAIN_ID=84532  # Base Sepolia (测试)

# Alchemy
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key

# Privy
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

# 合约地址 (部署后填入)
NEXT_PUBLIC_RED_PACKET_CONTRACT=0x...
NEXT_PUBLIC_USDC_CONTRACT=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Farcaster
NEXT_PUBLIC_FARCASTER_DOMAIN=https://warpcast.com
```

#### backend/.env
```bash
# 服务
NODE_ENV=development
PORT=3001

# 数据库
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/redpacket
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d

# 区块链
CHAIN_ID=8453
RPC_URL=https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
ALCHEMY_API_KEY=your_alchemy_api_key

# 合约地址
RED_PACKET_CONTRACT=0x...
USDC_CONTRACT=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# 钱包 (服务端钱包,用于 Gas 代付)
PAYMASTER_PRIVATE_KEY=your_paymaster_private_key

# Farcaster
FARCASTER_API_KEY=your_farcaster_api_key

# 监控
SENTRY_DSN=your_sentry_dsn
```

---

## 智能合约开发

### 合约架构设计

```
contracts/
├── src/
│   ├── RedPacket.sol          # 主合约
│   ├── AccountFactory.sol     # AA 账户工厂(可选)
│   └── interfaces/
│       └── IRedPacket.sol     # 接口定义
├── test/
│   ├── RedPacket.t.sol        # 单元测试
│   └── RedPacket.integration.t.sol  # 集成测试
└── script/
    ├── Deploy.s.sol           # 部署脚本
    └── Upgrade.s.sol          # 升级脚本(如需要)
```

### RedPacket.sol - 核心合约

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title RedPacket
 * @notice 红包智能合约 - 支持随机金额和固定金额两种模式
 * @dev 使用 Chainlink VRF 生成可验证随机数
 */
contract RedPacket is ReentrancyGuard, Ownable, VRFConsumerBaseV2 {
    using SafeERC20 for IERC20;

    // ============ 状态变量 ============

    /// @notice 红包结构体
    struct Packet {
        address creator;           // 创建者
        address token;            // 代币地址(USDC)
        uint256 totalAmount;      // 总金额
        uint256 remainingAmount;  // 剩余金额
        uint32 totalCount;        // 总份数
        uint32 remainingCount;    // 剩余份数
        bool isRandom;            // 是否随机金额
        uint256 expireTime;       // 过期时间
        uint256 minAmount;        // 最小金额(随机模式)
        bool refunded;            // 是否已退款
    }

    /// @notice 领取记录
    struct Claim {
        address claimer;          // 领取者
        uint256 amount;           // 领取金额
        uint256 timestamp;        // 领取时间
    }

    // 红包映射: packetId => Packet
    mapping(bytes32 => Packet) public packets;
    
    // 领取记录: packetId => claimer => Claim
    mapping(bytes32 => mapping(address => Claim)) public claims;
    
    // 红包领取列表: packetId => claimer[]
    mapping(bytes32 => address[]) public claimers;

    // Chainlink VRF
    VRFCoordinatorV2Interface private immutable COORDINATOR;
    uint64 private immutable subscriptionId;
    bytes32 private immutable keyHash;
    uint32 private constant callbackGasLimit = 200000;
    uint16 private constant requestConfirmations = 3;
    uint32 private constant numWords = 1;

    // VRF 请求映射: requestId => packetId
    mapping(uint256 => bytes32) private vrfRequests;
    
    // 随机数缓存: packetId => randomness
    mapping(bytes32 => uint256) private randomness;

    // 平台手续费 (basis points, 100 = 1%)
    uint256 public platformFee = 100; // 1%
    address public feeCollector;

    // 红包配置限制
    uint256 public constant MIN_AMOUNT = 0.01 ether; // 0.01 USDC
    uint256 public constant MAX_AMOUNT = 10000 ether; // 10,000 USDC
    uint32 public constant MAX_COUNT = 200;
    uint256 public constant MAX_DURATION = 7 days;

    // ============ 事件 ============

    event PacketCreated(
        bytes32 indexed packetId,
        address indexed creator,
        address token,
        uint256 totalAmount,
        uint32 totalCount,
        bool isRandom,
        uint256 expireTime
    );

    event PacketClaimed(
        bytes32 indexed packetId,
        address indexed claimer,
        uint256 amount,
        uint32 remainingCount
    );

    event PacketRefunded(
        bytes32 indexed packetId,
        address indexed creator,
        uint256 refundAmount
    );

    event RandomnessRequested(bytes32 indexed packetId, uint256 requestId);
    event RandomnessFulfilled(bytes32 indexed packetId, uint256 randomness);

    // ============ 错误 ============

    error InvalidAmount();
    error InvalidCount();
    error InvalidDuration();
    error PacketNotFound();
    error PacketExpired();
    error PacketEmpty();
    error AlreadyClaimed();
    error NotCreator();
    error NotExpired();
    error AlreadyRefunded();
    error TransferFailed();
    error RandomnessNotReady();

    // ============ 构造函数 ============

    constructor(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        address _feeCollector
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        feeCollector = _feeCollector;
    }

    // ============ 外部函数 ============

    /**
     * @notice 创建红包
     * @param token 代币地址(通常是 USDC)
     * @param totalAmount 总金额
     * @param count 红包份数
     * @param isRandom 是否随机金额
     * @param duration 有效期(秒)
     * @param salt 盐值(用于生成唯一 ID)
     * @return packetId 红包 ID
     */
    function createPacket(
        address token,
        uint256 totalAmount,
        uint32 count,
        bool isRandom,
        uint256 duration,
        bytes32 salt
    ) external nonReentrant returns (bytes32 packetId) {
        // 参数验证
        if (totalAmount < MIN_AMOUNT || totalAmount > MAX_AMOUNT) {
            revert InvalidAmount();
        }
        if (count == 0 || count > MAX_COUNT) {
            revert InvalidCount();
        }
        if (duration == 0 || duration > MAX_DURATION) {
            revert InvalidDuration();
        }

        // 计算手续费
        uint256 fee = (totalAmount * platformFee) / 10000;
        uint256 netAmount = totalAmount - fee;

        // 生成红包 ID
        packetId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, salt)
        );

        // 存储红包信息
        packets[packetId] = Packet({
            creator: msg.sender,
            token: token,
            totalAmount: netAmount,
            remainingAmount: netAmount,
            totalCount: count,
            remainingCount: count,
            isRandom: isRandom,
            expireTime: block.timestamp + duration,
            minAmount: isRandom ? MIN_AMOUNT : netAmount / count,
            refunded: false
        });

        // 转入代币
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);
        
        // 转手续费
        if (fee > 0) {
            IERC20(token).safeTransfer(feeCollector, fee);
        }

        // 如果是随机模式,请求随机数
        if (isRandom) {
            _requestRandomness(packetId);
        }

        emit PacketCreated(
            packetId,
            msg.sender,
            token,
            netAmount,
            count,
            isRandom,
            block.timestamp + duration
        );

        return packetId;
    }

    /**
     * @notice 领取红包
     * @param packetId 红包 ID
     * @return amount 领取到的金额
     */
    function claimPacket(bytes32 packetId) 
        external 
        nonReentrant 
        returns (uint256 amount) 
    {
        Packet storage packet = packets[packetId];

        // 验证
        if (packet.creator == address(0)) revert PacketNotFound();
        if (block.timestamp > packet.expireTime) revert PacketExpired();
        if (packet.remainingCount == 0) revert PacketEmpty();
        if (claims[packetId][msg.sender].amount > 0) revert AlreadyClaimed();

        // 计算领取金额
        if (packet.isRandom) {
            // 随机模式
            if (randomness[packetId] == 0) revert RandomnessNotReady();
            amount = _calculateRandomAmount(packetId);
        } else {
            // 固定模式
            amount = packet.remainingAmount / packet.remainingCount;
        }

        // 更新状态
        packet.remainingAmount -= amount;
        packet.remainingCount--;

        // 记录领取
        claims[packetId][msg.sender] = Claim({
            claimer: msg.sender,
            amount: amount,
            timestamp: block.timestamp
        });
        claimers[packetId].push(msg.sender);

        // 转账
        IERC20(packet.token).safeTransfer(msg.sender, amount);

        emit PacketClaimed(
            packetId,
            msg.sender,
            amount,
            packet.remainingCount
        );

        return amount;
    }

    /**
     * @notice 退款(过期后,创建者可取回剩余金额)
     * @param packetId 红包 ID
     */
    function refund(bytes32 packetId) external nonReentrant {
        Packet storage packet = packets[packetId];

        if (packet.creator != msg.sender) revert NotCreator();
        if (block.timestamp <= packet.expireTime) revert NotExpired();
        if (packet.refunded) revert AlreadyRefunded();

        uint256 refundAmount = packet.remainingAmount;
        if (refundAmount > 0) {
            packet.remainingAmount = 0;
            packet.refunded = true;

            IERC20(packet.token).safeTransfer(msg.sender, refundAmount);

            emit PacketRefunded(packetId, msg.sender, refundAmount);
        }
    }

    // ============ 查询函数 ============

    /**
     * @notice 查询红包详情
     */
    function getPacketInfo(bytes32 packetId) 
        external 
        view 
        returns (
            address creator,
            address token,
            uint256 totalAmount,
            uint256 remainingAmount,
            uint32 totalCount,
            uint32 remainingCount,
            bool isRandom,
            uint256 expireTime,
            bool refunded
        ) 
    {
        Packet memory packet = packets[packetId];
        return (
            packet.creator,
            packet.token,
            packet.totalAmount,
            packet.remainingAmount,
            packet.totalCount,
            packet.remainingCount,
            packet.isRandom,
            packet.expireTime,
            packet.refunded
        );
    }

    /**
     * @notice 查询用户是否已领取
     */
    function hasClaimed(bytes32 packetId, address user) 
        external 
        view 
        returns (bool) 
    {
        return claims[packetId][user].amount > 0;
    }

    /**
     * @notice 查询红包领取者列表
     */
    function getClaimers(bytes32 packetId) 
        external 
        view 
        returns (address[] memory) 
    {
        return claimers[packetId];
    }

    // ============ 管理员函数 ============

    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 500, "Fee too high"); // 最高 5%
        platformFee = newFee;
    }

    function setFeeCollector(address newCollector) external onlyOwner {
        feeCollector = newCollector;
    }

    // ============ 内部函数 ============

    function _requestRandomness(bytes32 packetId) internal {
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        vrfRequests[requestId] = packetId;
        emit RandomnessRequested(packetId, requestId);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        bytes32 packetId = vrfRequests[requestId];
        randomness[packetId] = randomWords[0];
        emit RandomnessFulfilled(packetId, randomWords[0]);
    }

    function _calculateRandomAmount(bytes32 packetId) 
        internal 
        view 
        returns (uint256) 
    {
        Packet memory packet = packets[packetId];
        
        if (packet.remainingCount == 1) {
            // 最后一个红包,给剩余所有金额
            return packet.remainingAmount;
        }

        // 计算最大可领取金额(确保剩余人数能分到最小金额)
        uint256 maxAmount = packet.remainingAmount - 
            (packet.remainingCount - 1) * packet.minAmount;

        // 使用随机数计算
        uint256 rand = uint256(
            keccak256(
                abi.encodePacked(
                    randomness[packetId],
                    msg.sender,
                    block.timestamp
                )
            )
        );

        uint256 amount = packet.minAmount + (rand % (maxAmount - packet.minAmount));
        
        return amount;
    }
}
```

### 合约测试

**test/RedPacket.t.sol**:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/RedPacket.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockVRFCoordinator {
    function requestRandomWords(
        bytes32,
        uint64,
        uint16,
        uint32,
        uint32
    ) external pure returns (uint256) {
        return 1; // Mock request ID
    }
}

contract RedPacketTest is Test {
    RedPacket public redPacket;
    MockERC20 public usdc;
    MockVRFCoordinator public vrfCoordinator;

    address public creator = address(1);
    address public claimer1 = address(2);
    address public claimer2 = address(3);
    address public feeCollector = address(4);

    function setUp() public {
        // 部署 Mock 合约
        usdc = new MockERC20();
        vrfCoordinator = new MockVRFCoordinator();

        // 部署红包合约
        redPacket = new RedPacket(
            address(vrfCoordinator),
            1, // subscription ID
            bytes32(0), // key hash
            feeCollector
        );

        // 给测试账户转币
        usdc.mint(creator, 10000 * 10**18);
        vm.deal(creator, 10 ether);
    }

    function testCreateFixedPacket() public {
        vm.startPrank(creator);
        
        uint256 totalAmount = 100 * 10**18; // 100 USDC
        uint32 count = 10;
        
        // 授权
        usdc.approve(address(redPacket), totalAmount);
        
        // 创建红包
        bytes32 packetId = redPacket.createPacket(
            address(usdc),
            totalAmount,
            count,
            false, // 固定金额
            1 days,
            bytes32(uint256(1))
        );

        // 验证
        (
            address creator_,
            ,
            uint256 totalAmount_,
            ,
            uint32 totalCount_,
            uint32 remainingCount_,
            bool isRandom_,
            ,
        ) = redPacket.getPacketInfo(packetId);

        assertEq(creator_, creator);
        assertTrue(totalAmount_ > 0); // 扣除手续费后
        assertEq(totalCount_, count);
        assertEq(remainingCount_, count);
        assertFalse(isRandom_);
        
        vm.stopPrank();
    }

    function testClaimFixedPacket() public {
        // 创建红包
        vm.startPrank(creator);
        usdc.approve(address(redPacket), 100 * 10**18);
        bytes32 packetId = redPacket.createPacket(
            address(usdc),
            100 * 10**18,
            10,
            false,
            1 days,
            bytes32(uint256(1))
        );
        vm.stopPrank();

        // 领取红包
        vm.prank(claimer1);
        uint256 amount1 = redPacket.claimPacket(packetId);
        
        // 验证
        assertTrue(amount1 > 0);
        assertTrue(redPacket.hasClaimed(packetId, claimer1));
        assertFalse(redPacket.hasClaimed(packetId, claimer2));
        
        // 第二个人领取
        vm.prank(claimer2);
        uint256 amount2 = redPacket.claimPacket(packetId);
        assertTrue(amount2 > 0);
        
        // 固定金额模式,金额应该相同
        assertEq(amount1, amount2);
    }

    function testCannotClaimTwice() public {
        // 创建红包
        vm.startPrank(creator);
        usdc.approve(address(redPacket), 100 * 10**18);
        bytes32 packetId = redPacket.createPacket(
            address(usdc),
            100 * 10**18,
            10,
            false,
            1 days,
            bytes32(uint256(1))
        );
        vm.stopPrank();

        // 第一次领取
        vm.prank(claimer1);
        redPacket.claimPacket(packetId);

        // 第二次领取应该失败
        vm.prank(claimer1);
        vm.expectRevert(RedPacket.AlreadyClaimed.selector);
        redPacket.claimPacket(packetId);
    }

    function testRefundAfterExpiry() public {
        // 创建红包
        vm.startPrank(creator);
        usdc.approve(address(redPacket), 100 * 10**18);
        bytes32 packetId = redPacket.createPacket(
            address(usdc),
            100 * 10**18,
            10,
            false,
            1 days,
            bytes32(uint256(1))
        );
        
        // 部分领取
        vm.stopPrank();
        vm.prank(claimer1);
        redPacket.claimPacket(packetId);

        // 时间快进到过期后
        vm.warp(block.timestamp + 1 days + 1);

        // 退款
        vm.prank(creator);
        uint256 balanceBefore = usdc.balanceOf(creator);
        redPacket.refund(packetId);
        uint256 balanceAfter = usdc.balanceOf(creator);

        // 验证收到退款
        assertTrue(balanceAfter > balanceBefore);
    }
}
```

### 部署脚本

**script/Deploy.s.sol**:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/RedPacket.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address vrfCoordinator = vm.envAddress("VRF_COORDINATOR");
        uint64 subscriptionId = uint64(vm.envUint("VRF_SUBSCRIPTION_ID"));
        bytes32 keyHash = vm.envBytes32("VRF_KEY_HASH");
        address feeCollector = vm.envAddress("FEE_COLLECTOR");

        vm.startBroadcast(deployerPrivateKey);

        RedPacket redPacket = new RedPacket(
            vrfCoordinator,
            subscriptionId,
            keyHash,
            feeCollector
        );

        console.log("RedPacket deployed to:", address(redPacket));

        vm.stopBroadcast();
    }
}
```

### 编译和测试

```bash
cd contracts

# 编译
forge build

# 运行测试
forge test -vvv

# 测试覆盖率
forge coverage

# Gas 报告
forge test --gas-report

# 部署到测试网
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify

# 部署到主网(使用 Ledger 硬件钱包)
forge script script/Deploy.s.sol --rpc-url base --ledger --broadcast --verify
```

---

## 前端开发

### 项目结构

```
frontend/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx         # 主页
│   │   ├── create/page.tsx  # 发红包页
│   │   └── api/
│   │       └── frame/route.tsx  # Frame API
│   ├── components/          # React 组件
│   │   ├── RedPacket/
│   │   │   ├── CreateForm.tsx
│   │   │   ├── ClaimButton.tsx
│   │   │   ├── PacketCard.tsx
│   │   │   └── PacketAnimation.tsx
│   │   ├── Wallet/
│   │   │   └── ConnectButton.tsx
│   │   └── Layout/
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   ├── lib/                 # 工具库
│   │   ├── contracts/      # 合约 ABI 和地址
│   │   ├── privy.ts        # Privy 配置
│   │   ├── wagmi.ts        # Wagmi 配置
│   │   ├── api.ts          # API 客户端
│   │   └── socket.ts       # WebSocket 客户端
│   ├── hooks/              # 自定义 Hooks
│   │   ├── useRedPacket.ts
│   │   ├── useNotification.ts
│   │   └── useInvite.ts
│   ├── store/              # 状态管理
│   │   └── index.ts        # Zustand store
│   └── types/              # TypeScript 类型
│       └── index.ts
└── public/
    └── images/
```

### 核心配置文件

**(续上文...)**

**lib/wagmi.ts**:
```typescript
import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { coinbaseWallet, injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'RedPacket dApp' }),
  ],
  transports: {
    [base.id]: http(
      `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    ),
    [baseSepolia.id]: http(
      `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    ),
  },
})
```

**lib/privy.ts**:
```typescript
import { PrivyClientConfig } from '@privy-io/react-auth'

export const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    noPromptOnSignature: true,
  },
  loginMethods: ['email', 'google', 'farcaster'],
  appearance: {
    theme: 'light',
    accentColor: '#FF4444',
    logo: '/logo.png',
  },
  supportedChains: [base, baseSepolia],
}
```

**lib/contracts/RedPacket.ts**:
```typescript
import { Address } from 'viem'
import RedPacketABI from './abis/RedPacket.json'

export const RED_PACKET_ADDRESS: Address = 
  process.env.NEXT_PUBLIC_RED_PACKET_CONTRACT as Address

export const USDC_ADDRESS: Address = 
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // Base USDC

export { RedPacketABI }

// 合约交互类型
export type CreatePacketParams = {
  token: Address
  totalAmount: bigint
  count: number
  isRandom: boolean
  duration: number
  salt: `0x${string}`
}

export type PacketInfo = {
  creator: Address
  token: Address
  totalAmount: bigint
  remainingAmount: bigint
  totalCount: number
  remainingCount: number
  isRandom: boolean
  expireTime: bigint
  refunded: boolean
}
```

### 核心 Hook - useRedPacket

**hooks/useRedPacket.ts**:
```typescript
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, keccak256, toBytes } from 'viem'
import { RED_PACKET_ADDRESS, RedPacketABI, CreatePacketParams } from '@/lib/contracts/RedPacket'

export function useCreateRedPacket() {
  const { writeContract, data: hash, isPending } = useWriteContract()

  const createPacket = async (params: {
    amount: string // "10.5" USDC
    count: number
    isRandom: boolean
    duration: number // seconds
  }) => {
    const totalAmount = parseUnits(params.amount, 6) // USDC 6 decimals
    const salt = keccak256(toBytes(Date.now().toString()))

    return writeContract({
      address: RED_PACKET_ADDRESS,
      abi: RedPacketABI,
      functionName: 'createPacket',
      args: [
        USDC_ADDRESS, // token
        totalAmount,
        params.count,
        params.isRandom,
        params.duration,
        salt,
      ],
    })
  }

  return {
    createPacket,
    hash,
    isPending,
  }
}

export function useClaimRedPacket() {
  const { writeContract, data: hash, isPending } = useWriteContract()

  const claimPacket = (packetId: `0x${string}`) => {
    return writeContract({
      address: RED_PACKET_ADDRESS,
      abi: RedPacketABI,
      functionName: 'claimPacket',
      args: [packetId],
    })
  }

  return {
    claimPacket,
    hash,
    isPending,
  }
}

export function usePacketInfo(packetId: `0x${string}` | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: RED_PACKET_ADDRESS,
    abi: RedPacketABI,
    functionName: 'getPacketInfo',
    args: packetId ? [packetId] : undefined,
  })

  return {
    packetInfo: data as PacketInfo | undefined,
    isLoading,
    refetch,
  }
}

export function useHasClaimed(packetId: `0x${string}` | undefined, address: Address | undefined) {
  const { data: hasClaimed } = useReadContract({
    address: RED_PACKET_ADDRESS,
    abi: RedPacketABI,
    functionName: 'hasClaimed',
    args: packetId && address ? [packetId, address] : undefined,
  })

  return hasClaimed as boolean | undefined
}
```

### 发红包组件

**components/RedPacket/CreateForm.tsx**:
```typescript
'use client'

import { useState } from 'react'
import { useCreateRedPacket } from '@/hooks/useRedPacket'
import { usePrivy } from '@privy-io/react-auth'
import { formatUnits } from 'viem'
import { motion } from 'framer-motion'

export default function CreateRedPacketForm() {
  const { user, authenticated } = usePrivy()
  const { createPacket, isPending, hash } = useCreateRedPacket()

  const [amount, setAmount] = useState('')
  const [count, setCount] = useState(5)
  const [isRandom, setIsRandom] = useState(true)
  const [duration, setDuration] = useState(24 * 60 * 60) // 24 hours
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createPacket({
        amount,
        count,
        isRandom,
        duration,
      })
      
      // 成功后的处理
      toast.success('红包创建成功!')
      // 调用后端 API 记录红包信息
      await fetch('/api/packets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: hash,
          message,
          amount,
          count,
          isRandom,
        }),
      })
    } catch (error) {
      toast.error('创建失败: ' + error.message)
    }
  }

  const presetAmounts = [5, 10, 20, 50, 100]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-6"
    >
      <h2 className="text-2xl font-bold text-center mb-6">
        🧧 发红包
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 金额输入 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            总金额 (USDC)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="10000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500"
            placeholder="输入金额"
            required
          />
          
          {/* 快捷金额按钮 */}
          <div className="flex gap-2 mt-2">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className="flex-1 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                ${preset}
              </button>
            ))}
          </div>
        </div>

        {/* 红包个数 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            红包个数
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="200"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-bold w-12 text-center">
              {count}
            </span>
          </div>
        </div>

        {/* 红包类型 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            红包类型
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setIsRandom(true)}
              className={`flex-1 py-3 rounded-lg border-2 transition ${
                isRandom
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300'
              }`}
            >
              🎲 拼手气
            </button>
            <button
              type="button"
              onClick={() => setIsRandom(false)}
              className={`flex-1 py-3 rounded-lg border-2 transition ${
                !isRandom
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300'
              }`}
            >
              💰 普通
            </button>
          </div>
          {!isRandom && amount && count && (
            <p className="text-sm text-gray-600 mt-2">
              每个红包 ${(Number(amount) / count).toFixed(2)} USDC
            </p>
          )}
        </div>

        {/* 有效期 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            有效期
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-4 py-3 border rounded-lg"
          >
            <option value={3600}>1 小时</option>
            <option value={21600}>6 小时</option>
            <option value={86400}>24 小时</option>
            <option value={259200}>3 天</option>
            <option value={604800}>7 天</option>
          </select>
        </div>

        {/* 祝福语 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            祝福语(可选)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={100}
            rows={3}
            className="w-full px-4 py-3 border rounded-lg resize-none"
            placeholder="恭喜发财,大吉大利!"
          />
        </div>

        {/* 手续费提示 */}
        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
          <div className="flex justify-between">
            <span>总金额:</span>
            <span className="font-medium">${amount || '0'}</span>
          </div>
          <div className="flex justify-between">
            <span>平台手续费 (1%):</span>
            <span className="font-medium">
              ${amount ? (Number(amount) * 0.01).toFixed(2) : '0'}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 mt-2 pt-2 border-t">
            <span>实际发出:</span>
            <span>
              ${amount ? (Number(amount) * 0.99).toFixed(2) : '0'}
            </span>
          </div>
        </div>

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={isPending || !authenticated || !amount}
          className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 
                   text-white font-bold rounded-lg shadow-lg 
                   hover:from-red-600 hover:to-red-700 
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all transform hover:scale-[1.02]"
        >
          {isPending ? '正在创建...' : '塞钱进红包 🧧'}
        </button>
      </form>

      {/* 交易状态 */}
      {hash && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            交易已提交:{' '}
            <a
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              查看详情
            </a>
          </p>
        </div>
      )}
    </motion.div>
  )
}
```

### 抢红包组件

**components/RedPacket/ClaimButton.tsx**:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useClaimRedPacket, usePacketInfo, useHasClaimed } from '@/hooks/useRedPacket'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import confetti from 'canvas-confetti'

interface ClaimButtonProps {
  packetId: `0x${string}`
}

export default function ClaimButton({ packetId }: ClaimButtonProps) {
  const { address } = useAccount()
  const { claimPacket, isPending, hash } = useClaimRedPacket()
  const { packetInfo, refetch } = usePacketInfo(packetId)
  const hasClaimed = useHasClaimed(packetId, address)

  const [isOpen, setIsOpen] = useState(false)
  const [claimedAmount, setClaimedAmount] = useState<string | null>(null)

  const handleClaim = async () => {
    try {
      const tx = await claimPacket(packetId)
      
      // 等待交易确认
      // 从事件中获取领取金额
      // 这里简化处理,实际应该监听合约事件
      
      refetch() // 刷新红包信息
      
      // 播放动画
      setIsOpen(true)
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
        // 模拟获取金额(实际应从事件中获取)
        setClaimedAmount('0.88')
      }, 1000)
      
    } catch (error) {
      console.error('Claim failed:', error)
    }
  }

  if (!packetInfo) return null

  const isExpired = Number(packetInfo.expireTime) * 1000 < Date.now()
  const isEmpty = packetInfo.remainingCount === 0
  const canClaim = !hasClaimed && !isExpired && !isEmpty && address

  return (
    <>
      <motion.button
        onClick={handleClaim}
        disabled={!canClaim || isPending}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          relative w-32 h-32 rounded-full
          ${canClaim ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gray-400'}
          shadow-2xl flex items-center justify-center
          disabled:cursor-not-allowed
          transition-all duration-300
        `}
      >
        <motion.div
          animate={canClaim ? { rotate: [0, -10, 10, -10, 0] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-6xl"
        >
          🧧
        </motion.div>
        
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent" />
          </div>
        )}
      </motion.button>

      {/* 红包状态提示 */}
      <div className="text-center mt-4 space-y-1">
        {hasClaimed && (
          <p className="text-green-600 font-medium">✅ 已领取</p>
        )}
        {isEmpty && (
          <p className="text-gray-600">🙈 手慢了,被抢光了</p>
        )}
        {isExpired && (
          <p className="text-gray-600">⏰ 红包已过期</p>
        )}
        {canClaim && (
          <p className="text-gray-700">
            还剩 <span className="font-bold text-red-600">
              {packetInfo.remainingCount}
            </span> 个
          </p>
        )}
      </div>

      {/* 开红包动画 Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-gradient-to-br from-red-500 to-red-700 p-8 rounded-3xl shadow-2xl text-white text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-8xl mb-4"
              >
                🧧
              </motion.div>
              
              <h2 className="text-3xl font-bold mb-2">恭喜!</h2>
              
              {claimedAmount && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-6xl font-bold my-6"
                >
                  ${claimedAmount}
                </motion.div>
              )}
              
              <p className="text-xl opacity-90">USDC 已到账</p>
              
              <button
                onClick={() => setIsOpen(false)}
                className="mt-6 px-8 py-3 bg-white text-red-600 rounded-full font-bold hover:bg-gray-100 transition"
              >
                查看详情
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
```

### App Layout with Providers

**app/layout.tsx**:
```typescript
import './globals.css'
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'RedPacket - Web3 红包 dApp',
  description: '在 Base 链上发送加密红包',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**app/providers.tsx**:
```typescript
'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { config } from '@/lib/wagmi'
import { privyConfig } from '@/lib/privy'
import { Toaster } from 'react-hot-toast'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={privyConfig}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="top-center" />
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  )
}
```

---

## Farcaster Frames 集成

### Frame API Route

**app/api/frame/route.tsx**:
```typescript
import { Button, Frog } from 'frog'
import { handle } from 'frog/next'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

export const app = new Frog({
  basePath: '/api/frame',
  title: 'RedPacket',
  imageOptions: {
    width: 1200,
    height: 630,
  },
})

// 主 Frame - 显示红包
app.frame('/:packetId', async (c) => {
  const { packetId } = c.req.param()
  
  // 从数据库或缓存获取红包信息
  const packet = await getPacketInfo(packetId)
  
  if (!packet) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', ... }}>
          <h1>红包不存在</h1>
        </div>
      ),
    })
  }

  const { creator, message, remainingCount, totalCount } = packet

  return c.res({
    image: (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF4444 100%)',
          width: '100%',
          height: '100%',
          padding: '40px',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 80, marginBottom: 20 }}>🧧</div>
        <div style={{ fontSize: 40, fontWeight: 'bold', marginBottom: 10 }}>
          {creator} 发了红包
        </div>
        <div style={{ fontSize: 24, opacity: 0.9, marginBottom: 40 }}>
          {message || '恭喜发财,大吉大利!'}
        </div>
        <div style={{ fontSize: 32 }}>
          还剩 {remainingCount}/{totalCount} 个
        </div>
      </div>
    ),
    intents: [
      <Button action={`/claim/${packetId}`}>
        抢红包 🎁
      </Button>,
      <Button action={`/details/${packetId}`}>
        查看详情
      </Button>,
      <Button.Link href={`https://yourapp.com/packet/${packetId}`}>
        打开 dApp
      </Button.Link>,
    ],
  })
})

// 领取 Frame
app.frame('/claim/:packetId', async (c) => {
  const { packetId } = c.req.param()
  const { fid } = c.frameData || {}
  
  if (!fid) {
    return c.res({
      image: <div>请先登录 Farcaster</div>,
    })
  }

  // 验证用户是否已领取
  const userAddress = await getUserAddressFromFid(fid)
  const hasClaimed = await checkIfClaimed(packetId, userAddress)

  if (hasClaimed) {
    return c.res({
      image: <div>你已经领取过了!</div>,
      intents: [
        <Button action={`/${packetId}`}>返回</Button>,
      ],
    })
  }

  // 执行链上领取(这里需要后端代理)
  try {
    const result = await claimPacketOnChain(packetId, userAddress)
    const amount = result.amount

    return c.res({
      image: (
        <div style={{ /* 成功样式 */ }}>
          <div style={{ fontSize: 80 }}>🎉</div>
          <div style={{ fontSize: 48 }}>恭喜!</div>
          <div style={{ fontSize: 60, fontWeight: 'bold' }}>
            ${amount} USDC
          </div>
        </div>
      ),
      intents: [
        <Button action={`/${packetId}`}>继续抢</Button>,
        <Button.Link href="https://yourapp.com">
          查看余额
        </Button.Link>,
      ],
    })
  } catch (error) {
    return c.res({
      image: <div>领取失败: {error.message}</div>,
      intents: [
        <Button action={`/${packetId}`}>重试</Button>,
      ],
    })
  }
})

// 详情 Frame
app.frame('/details/:packetId', async (c) => {
  const { packetId } = c.req.param()
  const packet = await getPacketDetails(packetId)
  const claimers = await getClaimers(packetId)

  return c.res({
    image: (
      <div style={{ /* 详情样式 */ }}>
        <h2>领取记录</h2>
        {claimers.slice(0, 5).map((claim, i) => (
          <div key={i}>
            {claim.user}: ${claim.amount}
            {claim.isBest && ' 👑 手气最佳'}
          </div>
        ))}
      </div>
    ),
    intents: [
      <Button action={`/${packetId}`}>返回</Button>,
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)
```

### Frame 辅助函数

**lib/frame-utils.ts**:
```typescript
import { kv } from '@vercel/kv' // 或使用 Redis
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const client = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_URL),
})

export async function getPacketInfo(packetId: string) {
  // 先从缓存读取
  const cached = await kv.get(`packet:${packetId}`)
  if (cached) return cached

  // 从链上读取
  const data = await client.readContract({
    address: process.env.RED_PACKET_CONTRACT!,
    abi: RedPacketABI,
    functionName: 'getPacketInfo',
    args: [packetId as `0x${string}`],
  })

  // 缓存5分钟
  await kv.set(`packet:${packetId}`, data, { ex: 300 })
  
  return data
}

export async function getUserAddressFromFid(fid: number): Promise<string> {
  // 调用 Farcaster Hub API
  const response = await fetch(
    `https://hub.farcaster.xyz/v1/verificationsByFid?fid=${fid}`
  )
  const data = await response.json()
  
  // 返回用户的以太坊地址
  return data.messages[0]?.data?.verificationAddAddressBody?.address || null
}

export async function claimPacketOnChain(
  packetId: string,
  userAddress: string
) {
  // 调用后端 API 代理领取(因为 Frame 无法直接发交易)
  const response = await fetch(`${process.env.API_URL}/api/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packetId, userAddress }),
  })

  return response.json()
}
```

### 在 Warpcast 中分享

**components/ShareToWarpcast.tsx**:
```typescript
'use client'

export function ShareToWarpcast({ packetId }: { packetId: string }) {
  const frameUrl = `https://yourapp.com/api/frame/${packetId}`
  const text = encodeURIComponent('我发了一个红包!快来抢!')
  const warpcastUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${frameUrl}`

  return (
    <a
      href={warpcastUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
    >
      <span>分享到 Warpcast</span>
      <svg className="w-5 h-5" /* Farcaster logo SVG */ />
    </a>
  )
}
```

---

## 后端开发

### 项目结构

```
backend/
├── src/
│   ├── index.ts              # 入口文件
│   ├── config/
│   │   ├── database.ts       # Prisma 配置
│   │   ├── redis.ts          # Redis 连接
│   │   └── blockchain.ts     # Web3 配置
│   ├── routes/
│   │   ├── auth.ts           # 认证路由
│   │   ├── packets.ts        # 红包路由
│   │   ├── users.ts          # 用户路由
│   │   └── stats.ts          # 统计路由
│   ├── controllers/
│   │   ├── packet.controller.ts
│   │   └── user.controller.ts
│   ├── services/
│   │   ├── blockchain.service.ts  # 链上交互
│   │   ├── packet.service.ts      # 红包业务逻辑
│   │   └── notification.service.ts # 推送服务
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── validation.middleware.ts
│   ├── jobs/
│   │   ├── syncPackets.job.ts    # 同步链上数据
│   │   └── sendNotifications.job.ts
│   ├── websocket/
│   │   └── index.ts              # WebSocket 服务器
│   └── utils/
│       ├── logger.ts
│       └── errors.ts
└── prisma/
    └── schema.prisma
```

### Prisma Schema

**prisma/schema.prisma**:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  address       String    @unique
  farcasterFid  Int?      @unique
  farcasterName String?
  email         String?   @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 关系
  createdPackets Packet[]  @relation("CreatedPackets")
  claims         Claim[]
  inviter        User?     @relation("Invitations", fields: [inviterId], references: [id])
  inviterId      String?
  invited        User[]    @relation("Invitations")

  @@index([address])
  @@index([farcasterFid])
}

model Packet {
  id                String    @id @default(cuid())
  packetId          String    @unique // 链上 ID
  txHash            String    @unique
  
  // 基本信息
  creatorId         String
  creator           User      @relation("CreatedPackets", fields: [creatorId], references: [id])
  token             String    // USDC address
  totalAmount       String    // BigInt as String
  count             Int
  isRandom          Boolean
  message           String?
  
  // 状态
  remainingAmount   String
  remainingCount    Int
  expireTime        DateTime
  refunded          Boolean   @default(false)
  
  // 元数据
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // 关系
  claims            Claim[]

  @@index([creatorId])
  @@index([expireTime])
  @@index([createdAt])
}

model Claim {
  id          String    @id @default(cuid())
  
  // 关联
  packetId    String
  packet      Packet    @relation(fields: [packetId], references: [id])
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  
  // 领取信息
  amount      String    // BigInt as String
  txHash      String    @unique
  isBest      Boolean   @default(false) // 是否手气最佳
  
  // 时间
  claimedAt   DateTime  @default(now())

  @@unique([packetId, userId])
  @@index([packetId])
  @@index([userId])
  @@index([claimedAt])
}

model Invitation {
  id          String    @id @default(cuid())
  inviterId   String
  inviteeId   String
  rewardPaid  Boolean   @default(false)
  createdAt   DateTime  @default(now())

  @@unique([inviterId, inviteeId])
  @@index([inviterId])
  @@index([inviteeId])
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String    // "packet_created", "packet_claimed", etc.
  title     String
  content   String
  data      Json?     // 额外数据
  read      Boolean   @default(false)
  createdAt DateTime  @default(now())

  @@index([userId, read])
  @@index([createdAt])
}
```

### 主入口文件

**src/index.ts**:
```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { createBullBoard } from '@bull-board/api'
import { BullAdapter } from '@bull-board/api/bullAdapter'
import { ExpressAdapter } from '@bull-board/express'

// Routes
import authRoutes from './routes/auth'
import packetRoutes from './routes/packets'
import userRoutes from './routes/users'
import statsRoutes from './routes/stats'

// Middleware
import { errorHandler } from './middleware/errorHandler'
import { authMiddleware } from './middleware/auth.middleware'
import { rateLimitMiddleware } from './middleware/rateLimit.middleware'

// Services
import { initWebSocket } from './websocket'
import { initJobs, packetSyncQueue } from './jobs'
import logger from './utils/logger'

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})

// Prisma Client
export const prisma = new PrismaClient()

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(rateLimitMiddleware)

// Bull Board (任务队列监控)
const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')
createBullBoard({
  queues: [new BullAdapter(packetSyncQueue)],
  serverAdapter,
})
app.use('/admin/queues', serverAdapter.getRouter())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/packets', authMiddleware, packetRoutes)
app.use('/api/users', authMiddleware, userRoutes)
app.use('/api/stats', statsRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling
app.use(errorHandler)

// Initialize WebSocket
initWebSocket(io)

// Initialize Jobs
initJobs()

// Start server
const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Bull Board: http://localhost:${PORT}/admin/queues`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server...')
  await prisma.$disconnect()
  httpServer.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})
```

### 红包路由

**src/routes/packets.ts**:
```typescript
import { Router } from 'express'
import { body, param, query } from 'express-validator'
import { validate } from '../middleware/validation.middleware'
import * as packetController from '../controllers/packet.controller'

const router = Router()

// 创建红包(链上交易后,记录到数据库)
router.post(
  '/create',
  [
    body('txHash').isString().notEmpty(),
    body('packetId').isString().notEmpty(),
    body('message').optional().isString().isLength({ max: 100 }),
    body('amount').isString().notEmpty(),
    body('count').isInt({ min: 1, max: 200 }),
    body('isRandom').isBoolean(),
    validate,
  ],
  packetController.createPacket
)

// 领取红包(后端代理)
router.post(
  '/claim',
  [
    body('packetId').isString().notEmpty(),
    validate,
  ],
  packetController.claimPacket
)

// 查询红包详情
router.get(
  '/:packetId',
  [
    param('packetId').isString().notEmpty(),
    validate,
  ],
  packetController.getPacket
)

// 查询红包领取记录
router.get(
  '/:packetId/claims',
  [
    param('packetId').isString().notEmpty(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validate,
  ],
  packetController.getPacketClaims
)

// 查询用户创建的红包
router.get(
  '/user/created',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validate,
  ],
  packetController.getUserCreatedPackets
)

// 查询用户领取的红包
router.get(
  '/user/claimed',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validate,
  ],
  packetController.getUserClaimedPackets
)

// 退款
router.post(
  '/:packetId/refund',
  [
    param('packetId').isString().notEmpty(),
    validate,
  ],
  packetController.refundPacket
)

export default router
```

### 红包控制器

**src/controllers/packet.controller.ts**:
```typescript
import { Request, Response, NextFunction } from 'express'
import * as packetService from '../services/packet.service'
import { AppError } from '../utils/errors'
import logger from '../utils/logger'

export async function createPacket(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id
    const { txHash, packetId, message, amount, count, isRandom } = req.body

    // 验证交易是否存在且成功
    const txValid = await packetService.verifyTransaction(txHash)
    if (!txValid) {
      throw new AppError('Invalid transaction', 400)
    }

    // 创建记录
    const packet = await packetService.createPacket({
      userId,
      txHash,
      packetId,
      message,
      amount,
      count,
      isRandom,
    })

    // 发送通知给关注者
    await packetService.notifyFollowers(userId, packet.id)

    res.status(201).json({
      success: true,
      data: packet,
    })
  } catch (error) {
    next(error)
  }
}

export async function claimPacket(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.id
    const { packetId } = req.body

    // 验证是否可以领取
    const canClaim = await packetService.canClaim(packetId, userId)
    if (!canClaim) {
      throw new AppError('Cannot claim this packet', 400)
    }

    // 执行领取(调用智能合约)
    const claim = await packetService.claimPacket(packetId, userId)

    res.json({
      success: true,
      data: claim,
    })
  } catch (error) {
    next(error)
  }
}

export async function getPacket(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { packetId } = req.params

    const packet = await packetService.getPacket(packetId)
    if (!packet) {
      throw new AppError('Packet not found', 404)
    }

    res.json({
      success: true,
      data: packet,
    })
  } catch (error) {
    next(error)
  }
}

export async function getPacketClaims(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { packetId } = req.params
    const page = req.query.page ? parseInt(req.query.page as string) : 1
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20

    const claims = await packetService.getPacketClaims(packetId, page, limit)

    res.json({
      success: true,
      data: claims,
    })
  } catch (error) {
    next(error)
  }
}

// ... 其他控制器函数
```

### WebSocket 服务

**src/websocket/index.ts**:
```typescript
import { Server as SocketIOServer, Socket } from 'socket.io'
import { verifyJWT } from '../utils/jwt'
import logger from '../utils/logger'

interface AuthenticatedSocket extends Socket {
  userId?: string
}

export function initWebSocket(io: SocketIOServer) {
  // 认证中间件
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error('Authentication error'))
      }

      const payload = verifyJWT(token)
      socket.userId = payload.userId
      next()
    } catch (error) {
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User ${socket.userId} connected`)

    // 加入用户专属房间
    socket.join(`user:${socket.userId}`)

    // 订阅红包房间
    socket.on('subscribe:packet', (packetId: string) => {
      socket.join(`packet:${packetId}`)
      logger.info(`User ${socket.userId} subscribed to packet ${packetId}`)
    })

    // 取消订阅
    socket.on('unsubscribe:packet', (packetId: string) => {
      socket.leave(`packet:${packetId}`)
    })

    // 断开连接
    socket.on('disconnect', () => {
      logger.info(`User ${socket.userId} disconnected`)
    })
  })

  return io
}

// 全局 IO 实例
export let io: SocketIOServer

export function setIO(ioInstance: SocketIOServer) {
  io = ioInstance
}

// 辅助函数:向用户发送消息
export function emitToUser(userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data)
}

// 辅助函数:向红包房间广播
export function emitToPacket(packetId: string, event: string, data: any) {
  io.to(`packet:${packetId}`).emit(event, data)
}
```

### 区块链监听任务

**src/jobs/syncPackets.job.ts**:
```typescript
import Queue from 'bull'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { prisma } from '../index'
import { emitToPacket } from '../websocket'
import logger from '../utils/logger'
import { RED_PACKET_ADDRESS, RedPacketABI } from '../config/blockchain'

export const packetSyncQueue = new Queue('packet-sync', process.env.REDIS_URL!)

const client = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_URL),
})

// 监听 PacketClaimed 事件
packetSyncQueue.process('listen-claims', async (job) => {
  const fromBlock = BigInt(job.data.fromBlock || 0)
  
  try {
    const logs = await client.getLogs({
      address: RED_PACKET_ADDRESS,
      event: parseAbiItem('event PacketClaimed(bytes32 indexed packetId, address indexed claimer, uint256 amount, uint32 remainingCount)'),
      fromBlock,
      toBlock: 'latest',
    })

    for (const log of logs) {
      const { packetId, claimer, amount, remainingCount } = log.args

      // 更新数据库
      await prisma.claim.create({
        data: {
          packetId: packetId as string,
          userId: claimer as string, // 需要从 address 找到 userId
          amount: amount.toString(),
          txHash: log.transactionHash,
        },
      })

      await prisma.packet.update({
        where: { packetId: packetId as string },
        data: {
          remainingCount: Number(remainingCount),
        },
      })

      // WebSocket 实时推送
      emitToPacket(packetId as string, 'packet:claimed', {
        claimer,
        amount: amount.toString(),
        remainingCount: Number(remainingCount),
      })

      logger.info(`Packet ${packetId} claimed by ${claimer}`)
    }

    // 记录最新区块
    const latestBlock = await client.getBlockNumber()
    return { processedBlocks: logs.length, latestBlock }
    
  } catch (error) {
    logger.error('Sync claims error:', error)
    throw error
  }
})

// 每 30 秒运行一次
packetSyncQueue.add(
  'listen-claims',
  { fromBlock: null }, // null = 从上次记录的区块开始
  { repeat: { every: 30000 } }
)

export function initJobs() {
  logger.info('Jobs initialized')
}
```

---

## 测试策略

### 智能合约测试

```bash
cd contracts

# 单元测试
forge test

# 测试特定函数
forge test --match-test testClaimFixedPacket -vvv

# Gas 优化测试
forge test --gas-report

# Fork 测试(真实网络状态)
forge test --fork-url https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# 覆盖率
forge coverage

# Fuzz 测试
forge test --fuzz-runs 10000
```

### 前端测试

**安装测试依赖**:
```bash
cd frontend
pnpm add -D @testing-library/react @testing-library/jest-dom vitest
```

**components/__tests__/CreateForm.test.tsx**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CreateRedPacketForm from '../RedPacket/CreateForm'

describe('CreateRedPacketForm', () => {
  it('renders form fields', () => {
    render(<CreateRedPacketForm />)
    
    expect(screen.getByText('总金额')).toBeInTheDocument()
    expect(screen.getByText('红包个数')).toBeInTheDocument()
    expect(screen.getByText('红包类型')).toBeInTheDocument()
  })

  it('validates amount input', async () => {
    render(<CreateRedPacketForm />)
    
    const input = screen.getByPlaceholderText('输入金额')
    fireEvent.change(input, { target: { value: '-10' } })
    
    // 应该显示错误
    expect(input).toBeInvalid()
  })

  it('calculates fee correctly', () => {
    render(<CreateRedPacketForm />)
    
    const input = screen.getByPlaceholderText('输入金额')
    fireEvent.change(input, { target: { value: '100' } })
    
    expect(screen.getByText('$1.00')).toBeInTheDocument() // 1% fee
    expect(screen.getByText('$99.00')).toBeInTheDocument() // net amount
  })
})
```

### 后端测试

**安装测试依赖**:
```bash
cd backend
pnpm add -D jest @types/jest supertest @types/supertest
```

**src/__tests__/packet.test.ts**:
```typescript
import request from 'supertest'
import { app } from '../index'
import { prisma } from '../index'

describe('Packet API', () => {
  let authToken: string

  beforeAll(async () => {
    // 登录获取 token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ address: '0x123...' })
    authToken = res.body.token
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/packets/create', () => {
    it('creates a packet successfully', async () => {
      const res = await request(app)
        .post('/api/packets/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          txHash: '0xabc...',
          packetId: '0xdef...',
          message: 'Test packet',
          amount: '100',
          count: 10,
          isRandom: true,
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toHaveProperty('id')
    })

    it('returns 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/packets/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          txHash: '0xabc...',
          // missing required fields
        })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/packets/:packetId', () => {
    it('returns packet details', async () => {
      const res = await request(app)
        .get('/api/packets/test-packet-id')
        .set('Authorization', `Bearer ${authToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data).toHaveProperty('packetId')
    })
  })
})
```

### 集成测试

**tests/e2e/redpacket.spec.ts** (使用 Playwright):
```typescript
import { test, expect } from '@playwright/test'

test.describe('Red Packet E2E', () => {
  test('complete flow: create and claim', async ({ page, context }) => {
    // 第一个用户:创建红包
    await page.goto('http://localhost:3000')
    
    await page.click('text=连接钱包')
    // ... 连接钱包流程
    
    await page.click('text=发红包')
    await page.fill('[placeholder="输入金额"]', '10')
    await page.click('text=拼手气')
    await page.click('text=塞钱进红包')
    
    await page.waitForSelector('text=红包创建成功')
    const packetUrl = await page.locator('[href^="/packet/"]').getAttribute('href')
    
    // 第二个用户:领取红包
    const page2 = await context.newPage()
    await page2.goto(`http://localhost:3000${packetUrl}`)
    
    await page2.click('text=抢红包')
    await page2.waitForSelector('text=恭喜!')
    
    const amount = await page2.locator('text=/\\$[0-9.]+/').textContent()
    expect(amount).toBeTruthy()
  })
})
```

---

## 部署流程

### 智能合约部署

#### 1. 测试网部署(Base Sepolia)

```bash
cd contracts

# 配置环境变量
export PRIVATE_KEY="your_private_key"
export ALCHEMY_API_KEY="your_alchemy_key"
export BASESCAN_API_KEY="your_basescan_key"

# 部署
forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify \
  -vvvv

# 记录合约地址
echo "RED_PACKET_CONTRACT=0x..." >> ../.env
```

#### 2. 主网部署(Base Mainnet)

```bash
# ⚠️ 主网部署请使用硬件钱包!

forge script script/Deploy.s.sol \
  --rpc-url base \
  --ledger \
  --sender 0xYourLedgerAddress \
  --broadcast \
  --verify \
  -vvvv
```

#### 3. 合约验证

```bash
forge verify-contract \
  --chain-id 8453 \
  --num-of-optimizations 200 \
  --watch \
  --constructor-args $(cast abi-encode "constructor(address,uint64,bytes32,address)" 0xVRF... 123 0xKey... 0xFee...) \
  --compiler-version v0.8.24 \
  0xYourContractAddress \
  src/RedPacket.sol:RedPacket \
  --etherscan-api-key $BASESCAN_API_KEY
```

### 前端部署(Vercel)

#### 1. 连接 GitHub

```bash
cd frontend

# 初始化 Git(如果还没有)
git init
git add .
git commit -m "Initial commit"

# 推送到 GitHub
git remote add origin https://github.com/yourusername/redpacket-frontend
git push -u origin main
```

#### 2. Vercel 配置

登录 [vercel.com](https://vercel.com) → Import Project → 选择仓库

**vercel.json**:
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_WS_URL": "@ws_url",
    "NEXT_PUBLIC_CHAIN_ID": "@chain_id",
    "NEXT_PUBLIC_ALCHEMY_API_KEY": "@alchemy_key",
    "NEXT_PUBLIC_PRIVY_APP_ID": "@privy_app_id",
    "NEXT_PUBLIC_RED_PACKET_CONTRACT": "@contract_address",
    "NEXT_PUBLIC_USDC_CONTRACT": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  }
}
```

#### 3. 部署

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 登录
vercel login

# 部署到预览环境
vercel

# 部署到生产环境
vercel --prod
```

### 后端部署(Railway/Render)

#### 使用 Railway

**railway.json**:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm prisma generate && pnpm build"
  },
  "deploy": {
    "startCommand": "pnpm prisma migrate deploy && pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**部署步骤**:
```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 添加 PostgreSQL 服务
railway add -d postgres

# 添加 Redis 服务
railway add -d redis

# 设置环境变量
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}
railway variables set REDIS_URL=${{Redis.REDIS_URL}}

# 部署
railway up
```

#### 使用 Docker

**Dockerfile**:
```dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && \
    pnpm prisma generate && \
    pnpm build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

USER nodejs

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/redpacket
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=redpacket
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 产品功能规格

### MVP 功能清单

✅ **必须有(P0)**
- 用户登录(Privy)
- 创建红包(固定/随机)
- 抢红包(Frame + Web)
- 红包详情页
- 领取记录
- 余额查看

⚠️ **应该有(P1)**
- 邀请奖励
- 排行榜(周榜)
- 成就系统(基础3个)
- 推送通知
- 红包雨(定时)

💡 **可以有(P2)**
- NFT 红包
- 群红包
- 定时红包
- 多币种支持

### 用户流程图

```
[新用户]
    ↓
  登录(邮箱/Farcaster)
    ↓
  创建 AA 钱包(自动)
    ↓
  ┌─充值 USDC (选项1)
  └─领取新人红包 (选项2)
    ↓
  [选择行动]
    ├─ 发红包 → 分享到 Warpcast → 等待领取
    └─ 抢红包 → 查看 Feed → 点击抢 → 成功!
```

### 数据指标

**核心指标(North Star Metric)**:
- 日均发红包数(DSR - Daily Sent RedPackets)

**增长指标**:
- DAU(日活用户)
- 注册用户数
- K-Factor(病毒系数)
- 邀请转化率

**参与度指标**:
- 平均每用户发红包数
- 平均每用户抢红包数
- 红包领取率(被抢完的比例)
- 平均红包金额

**留存指标**:
- D1/D7/D30 留存率
- 周活/月活比(WAU/MAU)
- 流失率

**商业化指标**:
- 平台手续费收入
- 付费用户数
- ARPU(平均每用户收入)
- LTV(用户生命周期价值)

---

## 病毒增长机制

### 实现清单

✅ **邀请奖励系统**
- [ ] 智能合约记录邀请关系
- [ ] 后端自动发放奖励
- [ ] 前端邀请链接生成
- [ ] 邀请排行榜

✅ **助力抢红包**
- [ ] Frame 按钮:邀请助力
- [ ] 记录助力关系
- [ ] 解锁完整金额

✅ **排行榜系统**
- [ ] 手气榜(周榜)
- [ ] 慷慨榜(月榜)
- [ ] 活跃榜(实时)
- [ ] 排名推送通知

✅ **成就系统**
- [ ] 数据库 Schema
- [ ] 成就解锁逻辑
- [ ] 徽章 NFT 铸造
- [ ] 分享卡片生成

✅ **定时红包雨**
- [ ] Cron Job 定时发放
- [ ] 倒计时提醒
- [ ] Frame 快速领取

✅ **推送通知**
- [ ] WebSocket 实时推送
- [ ] 邮件通知(可选)
- [ ] Telegram Bot(可选)

---

## 安全审计清单

### 智能合约安全

- [ ] Reentrancy Guard(已实现)
- [ ] Access Control(Owner only)
- [ ] Integer Overflow(Solidity 0.8+)
- [ ] Front-running 防护
- [ ] Gas Limit 攻击防护
- [ ] 随机数安全(Chainlink VRF)
- [ ] 升级机制(如需要)

### 外部审计

- [ ] CertiK 审计
- [ ] SlowMist 审计
- [ ] OpenZeppelin Defender 监控
- [ ] Bug Bounty 计划

### 前端安全

- [ ] XSS 防护
- [ ] CSRF Token
- [ ] Content Security Policy
- [ ] 私钥本地存储加密

### 后端安全

- [ ] SQL 注入防护(Prisma ORM)
- [ ] Rate Limiting
- [ ] JWT Token 过期
- [ ] CORS 白名单
- [ ] Helmet.js 安全头
- [ ] Input Validation

### 运维安全

- [ ] 环境变量加密
- [ ] 数据库备份
- [ ] 日志监控(Sentry)
- [ ] DDoS 防护(Cloudflare)
- [ ] 定期安全扫描

---

## 开发路线图

### Phase 1: MVP (Week 1-8)

**Week 1-2: 基础设施**
- [x] 项目结构搭建
- [ ] 智能合约开发
- [ ] 数据库设计
- [ ] API 框架搭建

**Week 3-4: 核心功能**
- [ ] 创建红包(固定+随机)
- [ ] 抢红包逻辑
- [ ] Frame 集成
- [ ] AA 钱包集成

**Week 5-6: 前端 UI**
- [ ] 发红包页面
- [ ] 抢红包动画
- [ ] 红包详情页
- [ ] 个人中心

**Week 7: 测试 & 优化**
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能优化
- [ ] 安全审计

**Week 8: 发布**
- [ ] 部署测试网
- [ ] Beta 测试(100 用户)
- [ ] 收集反馈
- [ ] 主网部署

### Phase 2: 增长功能 (Week 9-16)

**Week 9-10: 病毒机制**
- [ ] 邀请奖励系统
- [ ] 助力抢红包
- [ ] 分享卡片生成

**Week 11-12: 社交功能**
- [ ] 排行榜系统
- [ ] 成就系统
- [ ] 好友关系链

**Week 13-14: 运营工具**
- [ ] 定时红包雨
- [ ] 推送通知
- [ ] 管理后台

**Week 15-16: 优化迭代**
- [ ] 数据分析看板
- [ ] A/B 测试平台
- [ ] 用户反馈系统

### Phase 3: 高级功能 (Week 17-24)

- [ ] NFT 红包
- [ ] 群红包(Farcaster Channel)
- [ ] 定时红包
- [ ] 跨链支持(Arbitrum, Optimism)
- [ ] 移动端 App
- [ ] 代币经济模型($PACKET)

---

## 附录

### 有用的资源

**区块链**
- [Base 文档](https://docs.base.org/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Viem 文档](https://viem.sh/)
- [OpenZeppelin 合约](https://docs.openzeppelin.com/contracts/)

**Farcaster**
- [Farcaster 文档](https://docs.farcaster.xyz/)
- [Frames 开发指南](https://docs.farcaster.xyz/developers/frames)
- [Frog Framework](https://frog.fm/)

**前端**
- [Next.js 文档](https://nextjs.org/docs)
- [Privy 文档](https://docs.privy.io/)
- [Wagmi 文档](https://wagmi.sh/)

**后端**
- [Prisma 文档](https://www.prisma.io/docs)
- [Bull 文档](https://github.com/OptimalBits/bull)
- [Socket.IO 文档](https://socket.io/docs/)

### 社区支持

- [Base Discord](https://base.org/discord)
- [Farcaster Developers](https://warpcast.com/~/channel/fc-devs)
- [Privy Discord](https://privy.io/discord)

### 开发工具

- [Remix IDE](https://remix.ethereum.org/) - 在线 Solidity IDE
- [Tenderly](https://tenderly.co/) - 合约调试
- [Alchemy Dashboard](https://dashboard.alchemy.com/) - RPC 监控
- [Vercel Analytics](https://vercel.com/analytics) - 前端性能
- [Sentry](https://sentry.io/) - 错误追踪

---

## 总结

这份文档涵盖了从零开始构建 Base 红包 dApp 的完整技术方案:

✅ **技术架构**: 前后端分离 + 区块链
✅ **智能合约**: Solidity + Foundry + 安全审计
✅ **前端**: Next.js + Privy AA + Farcaster Frames
✅ **后端**: Node.js + Prisma + WebSocket
✅ **测试**: 单元测试 + 集成测试 + E2E
✅ **部署**: Vercel + Railway + Docker
✅ **产品**: MVP 功能 + 病毒增长机制
✅ **安全**: 多层防护 + 审计清单

**下一步行动**:
1. Fork 这个文档,开始搭建环境
2. 先完成智能合约 + 测试
3. 并行开发前后端
4. 持续迭代,快速发布

**记住**: 完成比完美更重要。先做出 MVP,快速上线,根据用户反馈迭代!

祝你开发顺利! 🚀🧧
