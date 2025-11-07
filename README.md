# LuckyPocket - DeGift 礼物功能

去中心化礼物系统，支持发送 Token 和 NFT 作为礼物。

## 🚀 快速启动

### 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| Web 前端 | 9002 | Next.js 开发服务器 |
| API 后端 | 9001 | Fastify API 服务器 |

> **注意**: 端口 9000 已被 HKD 项目占用

### 启动服务

**终端 1 - 启动 API**:
```bash
cd apps/api
pnpm dev
```

**终端 2 - 启动 Web**:
```bash
cd apps/web
pnpm dev
```

### 访问应用

- 🌐 Web 应用: http://localhost:9002
- 🎁 创建礼物: http://localhost:9002/gift/create
- 📋 礼物列表: http://localhost:9002/gifts

## 📚 文档

- [快速启动指南](./docs/快速启动.md)
- [本地开发启动指南](./docs/本地开发启动指南.md)
- [DeGift 功能架构](./docs/DeGift功能架构.md)
- [DeGift 开发进度](./docs/DeGift开发进度.md)
- [DeGift 文件清单](./docs/DeGift文件清单.md)

## 🎯 功能概览

### DeGift 功能

- ✅ **礼物创建** - 支持 Token 和 NFT 两种类型
- ✅ **礼物展示** - 精美的礼物卡片和详情页
- ✅ **礼物领取** - 完整的领取流程和权限验证
- ✅ **主题系统** - 6 种精美主题可选
- ✅ **移动端适配** - 响应式设计，触摸优化

### 已实现功能

1. **礼物创建界面**
   - Token/NFT 类型选择
   - 代币选择器（ETH/USDC/DAI）
   - NFT 选择器
   - 接收者地址输入
   - 礼物消息编辑
   - 主题选择
   - 有效期设置

2. **礼物展示和领取**
   - 礼物详情页
   - 礼物卡片组件
   - 状态管理（Active/Claimed/Expired）
   - 领取权限验证
   - 礼物列表和筛选

3. **移动端优化**
   - 响应式布局
   - 触摸优化
   - 玻璃态设计

## 🔧 技术栈

- **前端**: Next.js 14, React, TypeScript, Tailwind CSS
- **后端**: Fastify, Prisma, PostgreSQL
- **Web3**: wagmi, viem, RainbowKit
- **样式**: 玻璃态设计系统

## 📊 开发进度

| 任务 | 进度 | 状态 |
|------|------|------|
| ZES-77 礼物创建界面 | 70% | 🔄 基础完成 |
| ZES-78 礼物展示和领取 | 60% | 🔄 基础完成 |
| ZES-80 移动端适配 | 85% | ✅ 基本完成 |

## 🔄 待完成工作

- [ ] API 集成
- [ ] 智能合约交互
- [ ] NFT 元数据获取
- [ ] 动画效果
- [ ] 分享功能

## 👥 开发团队

- **前端开发**: Ruolynn Chen

## 📝 License

Private Project

---

**最后更新**: 2025-11-06
