# Vercel快速部署指南 - Lucky Pocket

## 🚀 快速开始（推荐方式）

### 通过Vercel Dashboard部署

1. **访问Vercel Dashboard**
   ```
   https://vercel.com/new
   ```

2. **导入GitHub仓库**
   - 点击 "Import Git Repository"
   - 选择 `Zesty-Studio/HongBao`
   - 点击 "Import"

3. **配置项目**
   
   **项目名称**: `lucky-pocket`
   
   **框架设置**:
   - Framework Preset: `Next.js` (自动检测)
   - Root Directory: `apps/web` ⚠️ **重要**
   - Build Command: `pnpm install && pnpm --filter @luckypocket/web build`
   - Output Directory: `.next` (默认)
   - Install Command: `pnpm install`

4. **环境变量** (点击 "Environment Variables")
   
   添加以下变量：
   ```
   NEXT_PUBLIC_API_URL=https://your-api-url.com
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-project-id
   NEXT_PUBLIC_RED_PACKET_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_CHAIN_ID=8453
   NEXT_PUBLIC_MOCK_WALLET=false
   ```

5. **部署**
   - 点击 "Deploy"
   - 等待构建完成（约2-5分钟）

---

## 📋 使用现有项目

如果之前已经创建了 `luckypocket-web` 项目：

1. **在Vercel Dashboard中**
   - 进入项目设置
   - 更新项目名称或创建一个新项目

2. **或者使用CLI链接现有项目**
   ```bash
   cd /Users/ruolynnchen/Codebase/luckyPocket
   npx vercel link
   # 选择现有项目: luckypocket-web
   # 或者创建新项目: lucky-pocket
   ```

---

## 🔧 手动部署（CLI）

如果Dashboard方式有问题，可以使用CLI：

```bash
cd /Users/ruolynnchen/Codebase/luckyPocket

# 1. 确保已登录
npx vercel whoami

# 2. 创建新项目（交互式）
npx vercel

# 回答以下问题：
# - Set up and deploy? → Yes
# - Which scope? → ruolynn-4247's projects
# - Link to existing project? → No (创建新项目)
# - Project name? → lucky-pocket
# - Directory? → apps/web
# - Override settings? → Yes
# - Build Command? → pnpm install && pnpm --filter @luckypocket/web build
# - Output Directory? → .next
# - Install Command? → pnpm install

# 3. 部署到生产环境
npx vercel --prod
```

---

## ✅ 验证部署

部署成功后：

1. **访问部署URL**
   - 默认: `lucky-pocket-*.vercel.app`
   - 或自定义域名

2. **检查功能**
   - ✅ 页面加载正常
   - ✅ 钱包连接功能
   - ✅ API调用正常

---

## 🐛 常见问题

### 问题1: 构建失败 - 找不到模块

**错误**: `Cannot find module '@luckypocket/config'`

**解决**:
- 确保Root Directory设置为 `apps/web`
- 确保Build Command从根目录运行
- 检查 `pnpm-workspace.yaml` 配置

### 问题2: 项目名称错误

**错误**: `Project names can be up to 100 characters long...`

**解决**:
- 使用小写字母和连字符: `lucky-pocket`
- 不要使用空格或特殊字符

### 问题3: 构建超时

**解决**:
- 检查构建命令是否正确
- 减少不必要的依赖
- 使用Vercel的缓存功能

---

## 📝 下一步

部署完成后：

1. **配置自定义域名** (可选)
   - Settings → Domains
   - 添加你的域名

2. **设置环境变量**
   - 确保所有必需的环境变量都已设置

3. **启用自动部署**
   - 每次推送到main分支会自动部署

---

**需要帮助?** 查看完整文档: `docs/VERCEL_DEPLOYMENT.md`

