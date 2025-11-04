# 部署 luckypocket 到 Vercel - 完整指南

## 🚀 快速部署（推荐）

### 方法1: 使用部署脚本

```bash
cd /Users/ruolynnchen/Codebase/luckyPocket
./scripts/deploy-luckypocket.sh
```

然后按照提示输入配置信息。

---

### 方法2: 手动CLI部署

#### 步骤1: 准备环境

```bash
cd /Users/ruolynnchen/Codebase/luckyPocket

# 确保已登录
npx vercel whoami

# 清理旧配置
rm -rf .vercel

# 临时移除vercel.json（避免配置冲突）
mv vercel.json vercel.json.backup
```

#### 步骤2: 交互式创建项目

```bash
npx vercel
```

**回答以下问题**：

1. `Set up and deploy "~/Codebase/luckyPocket"?` 
   → **Y** (Yes)

2. `Which scope do you want to deploy to?`
   → 选择 **ruolynn-4247's projects**

3. `Link to existing project?`
   → **N** (No - 创建新项目)

4. `What's your project's name?`
   → **luckypocket** (小写，无连字符)

5. `In which directory is your code located?`
   → **apps/web**

6. `Want to override the settings?`
   → **Y** (Yes)

7. `Which settings would you like to override?`
   → 选择 **a** (all) 或按需选择

8. `Build Command?`
   → **pnpm install && pnpm --filter @luckypocket/web build**

9. `Output Directory?`
   → **.next**

10. `Install Command?`
    → **pnpm install**

11. `Development Command?`
    → **next dev --port $PORT** (或直接回车使用默认)

#### 步骤3: 部署到生产环境

```bash
npx vercel --prod --yes
```

#### 步骤4: 恢复配置文件

```bash
mv vercel.json.backup vercel.json
```

---

## ✅ 验证部署

部署成功后，你会看到：

```
✅ Production: https://luckypocket-xxx.vercel.app
```

### 检查部署状态

1. **访问Vercel Dashboard**
   ```
   https://vercel.com/dashboard
   ```

2. **查看项目**
   - 找到 "luckypocket" 项目
   - 查看最新部署状态

3. **测试网站**
   - 访问部署URL
   - 测试页面加载和功能

---

## 🔧 配置环境变量

部署后需要在Vercel Dashboard中配置环境变量：

1. **访问项目设置**
   - Dashboard → luckypocket → Settings → Environment Variables

2. **添加以下变量**：

   ```
   NEXT_PUBLIC_API_URL=<你的后端API地址>
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<你的WalletConnect项目ID>
   NEXT_PUBLIC_RED_PACKET_CONTRACT_ADDRESS=<合约地址>
   NEXT_PUBLIC_CHAIN_ID=8453
   NEXT_PUBLIC_MOCK_WALLET=false
   ```

3. **选择环境**
   - Production ✅
   - Preview ✅
   - Development ✅

4. **保存并重新部署**
   - 保存后，Vercel会自动触发重新部署
   - 或手动点击 "Redeploy"

---

## 📋 部署后检查清单

- [ ] 部署成功并可以访问
- [ ] 环境变量已配置
- [ ] 页面可以正常加载
- [ ] 钱包连接功能正常
- [ ] API调用正常
- [ ] 自定义域名已配置（可选）

---

## 🐛 常见问题

### 问题1: 构建失败 - 找不到模块

**错误**: `Cannot find module '@luckypocket/config'`

**解决**:
- 确保从项目根目录运行 `npx vercel`
- 确保 `rootDirectory` 设置为 `apps/web`
- 确保 `buildCommand` 从根目录运行

### 问题2: 构建超时

**解决**:
- 检查构建命令是否正确
- 减少不必要的依赖
- Vercel免费版有构建时间限制

### 问题3: 环境变量未生效

**解决**:
- 确保变量名以 `NEXT_PUBLIC_` 开头
- 保存后重新部署
- 检查环境变量是否选择了正确的环境

---

## 🔄 更新部署

### 自动部署（推荐）

1. **在Vercel Dashboard中连接GitHub**
   - Settings → Git
   - 连接仓库 `Zesty-Studio/HongBao`
   - 选择分支 `main`

2. **后续每次推送**
   - 推送到 `main` → 自动部署到生产环境
   - 创建PR → 自动创建预览部署

### 手动部署

```bash
cd /Users/ruolynnchen/Codebase/luckyPocket
npx vercel --prod
```

---

## 📝 项目信息

- **项目名称**: luckypocket
- **框架**: Next.js 14
- **根目录**: apps/web
- **包管理器**: pnpm
- **构建命令**: `pnpm install && pnpm --filter @luckypocket/web build`

---

**最后更新**: 2025-11-04

