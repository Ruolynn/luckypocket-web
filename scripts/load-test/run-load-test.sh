#!/bin/bash

# 压力测试启动脚本 - 自动禁用速率限制

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:3001}"

echo -e "${BLUE}🚀 启动压力测试${NC}\n"

# 检查 API 服务
echo -e "${YELLOW}🔍 检查 API 服务...${NC}"
if curl -s "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API 服务正在运行${NC}\n"
else
    echo -e "${RED}❌ API 服务未运行${NC}"
    echo -e "${YELLOW}请先启动 API 服务:${NC}"
    echo -e "  cd apps/api"
    echo -e "  DISABLE_RATE_LIMIT=true pnpm dev"
    exit 1
fi

# 提示用户禁用速率限制
echo -e "${YELLOW}⚠️  重要提示:${NC}"
echo -e "为了获得准确的测试结果，建议在启动 API 服务时禁用速率限制:"
echo -e "  ${BLUE}DISABLE_RATE_LIMIT=true pnpm dev${NC}"
echo -e ""
read -p "是否已禁用速率限制？(y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${YELLOW}⚠️  建议先禁用速率限制，否则测试结果可能不准确${NC}"
    echo -e "按 Enter 继续，或 Ctrl+C 取消..."
    read
fi

echo ""
echo -e "${GREEN}开始运行压力测试...${NC}\n"

# 运行 k6 测试
k6 run --env API_URL="${API_URL}" scripts/load-test/k6-api-test.js

echo -e "\n${GREEN}✅ 测试完成${NC}"

