#!/bin/bash
# 部署luckypocket项目到Vercel

set -e

echo "🚀 部署 luckypocket 到 Vercel..."
echo ""

cd /Users/ruolynnchen/Codebase/luckyPocket

# 检查登录
if ! npx vercel whoami &>/dev/null; then
    echo "📝 需要登录Vercel..."
    npx vercel login
fi

echo "✅ 已登录: $(npx vercel whoami)"
echo ""

# 清理旧的配置
if [ -d ".vercel" ]; then
    echo "🗑️  清理旧配置..."
    rm -rf .vercel
fi

# 临时移除vercel.json
BACKUP_VERCEL_JSON=false
if [ -f "vercel.json" ]; then
    echo "📋 临时移除vercel.json..."
    mv vercel.json vercel.json.backup
    BACKUP_VERCEL_JSON=true
fi

echo ""
echo "📦 开始交互式部署..."
echo ""
echo "⚠️  请按以下提示输入："
echo "   - Set up and deploy? → Y"
echo "   - Which scope? → 选择 ruolynn-4247's projects"
echo "   - Link to existing project? → N (创建新项目)"
echo "   - What's your project's name? → luckypocket"
echo "   - In which directory is your code located? → apps/web"
echo "   - Want to override the settings? → Y"
echo "   - Build Command? → pnpm install && pnpm --filter @luckypocket/web build"
echo "   - Output Directory? → .next"
echo "   - Install Command? → pnpm install"
echo ""
echo "按回车开始..."
read

# 交互式部署
npx vercel

# 部署到生产环境
echo ""
echo "🚀 部署到生产环境..."
echo "按回车继续..."
read
npx vercel --prod --yes

# 恢复vercel.json
if [ "$BACKUP_VERCEL_JSON" = true ]; then
    echo ""
    echo "📋 恢复vercel.json..."
    mv vercel.json.backup vercel.json
fi

echo ""
echo "✅ 部署完成!"
echo ""
echo "📋 下一步:"
echo "1. 在Vercel Dashboard中配置环境变量"
echo "2. 访问部署URL测试功能"
echo ""
echo "访问: https://vercel.com/dashboard 查看项目"

