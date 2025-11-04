# 🚀 立即部署 - 简单步骤

由于Vercel CLI在某些配置上有问题，请按以下步骤手动部署：

## 步骤1: 进入项目目录
```bash
cd /Users/ruolynnchen/Codebase/luckyPocket
```

## 步骤2: 临时重命名vercel.json（避免配置冲突）
```bash
mv vercel.json vercel.json.backup
```

## 步骤3: 交互式部署
```bash
npx vercel
```

**回答以下问题**：
1. `Set up and deploy?` → **Y**
2. `Which scope?` → 选择 **ruolynn-4247's projects**
3. `Link to existing project?` → **N** (创建新项目)
4. `What's your project's name?` → **lucky-pocket** (小写，用连字符)
5. `In which directory is your code located?` → **apps/web**
6. `Want to override the settings?` → **Y**
7. `Which settings would you like to override?` → 全选或按需选择
8. `Build Command?` → **pnpm install && pnpm --filter @luckypocket/web build**
9. `Output Directory?` → **.next**
10. `Install Command?` → **pnpm install**
11. `Development Command?` → **next dev --port $PORT** (或直接回车使用默认)

## 步骤4: 部署到生产环境
```bash
npx vercel --prod
```

## 步骤5: 恢复vercel.json
```bash
mv vercel.json.backup vercel.json
```

---

## ✅ 完成！

部署成功后：
1. 在Vercel Dashboard中配置环境变量
2. 访问部署URL测试
3. 后续可以通过Git集成自动部署

---

## 🔧 如果还有问题

尝试使用现有项目：
```bash
# 链接到现有项目 luckypocket-web
npx vercel link
# 选择: luckypocket-web
```

然后部署：
```bash
npx vercel --prod
```

