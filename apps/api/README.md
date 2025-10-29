# @hongbao/api

运行指南（本地）

1. 环境变量
- NODE_ENV=development
- PORT=3001
- DATABASE_URL=postgresql://postgres:password@localhost:5432/hongbao
- REDIS_URL=redis://localhost:6379
- JWT_SECRET=replace_with_strong_secret
- SIWE_DOMAIN=localhost
- SIWE_STATEMENT=Sign in to HongBao dApp
- RATE_LIMIT_WINDOW_MS=60000
- RATE_LIMIT_MAX=120
- CHAIN_ID=11155111
- RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key

2. 安装与生成
```bash
pnpm install
pnpm prisma:generate
```

3. 数据库迁移
```bash
pnpm prisma:migrate
```

4. 开发启动
```bash
pnpm dev
```

5. 生产构建与启动
```bash
pnpm build
pnpm start
```
