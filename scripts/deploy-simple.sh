#!/bin/bash
# 简化部署脚本 - 临时移除vercel.json避免配置冲突

set -e

echo "🚀 开始部署Lucky Pocket..."
echo ""

cd /Users/ruolynnchen/Codebase/luckyPocket

# 检查是否已登录
if ! npx vercel whoami &>/dev/null; then
    echo "📝 需要登录Vercel..."
    npx vercel login
fi

# 备份vercel.json
if [ -f "vercel.json" ]; then
    echo "📋 备份vercel.json..."
    mv vercel.json vercel.json.backup
fi

# 清理.vercel目录
if [ -d ".vercel" ]; then
    echo "🗑️  清理现有配置..."
    rm -rf .vercel
fi

echo ""
echo "✅ 准备完成，开始交互式部署..."
echo ""
echo "⚠️  重要提示："
echo "   项目名称请使用: lucky-pocket"
echo "   代码目录请使用: apps/web"
echo "   构建命令请使用: pnpm install && pnpm --filter @luckypocket/web build"
echo ""
echo "按回车继续..."
read

# 交互式部署
npx vercel

# 部署到生产环境
echo ""
echo "🚀 部署到生产环境..."
npx vercel --prod

# 恢复vercel.json
if [ -f "vercel.json.backup" ]; then
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
echo "3. 查看部署日志确认构建成功"

