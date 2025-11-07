#!/bin/bash

# 快速状态检查 - 单次显示，不循环

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:3001}"
WEB_URL="${WEB_URL:-http://localhost:9000}"

check_service() {
    local url=$1
    curl -s --max-time 3 "$url" > /dev/null 2>&1
}

check_docker() {
    local pattern=$1
    docker ps --format '{{.Names}}' | grep -qiE "$pattern" 2>/dev/null
}

echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}${BOLD}          🧧 HongBao 服务状态${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""

# API
if check_service "$API_URL/health"; then
    echo -e "${GREEN}✅${NC} ${BOLD}API 服务${NC}${GREEN} 运行中${NC} ($API_URL)"
else
    echo -e "${RED}❌${NC} ${BOLD}API 服务${NC}${RED} 未运行${NC}"
fi

# Web
if check_service "$WEB_URL"; then
    echo -e "${GREEN}✅${NC} ${BOLD}Web 服务${NC}${GREEN} 运行中${NC} ($WEB_URL)"
else
    echo -e "${YELLOW}⚠️${NC}  ${BOLD}Web 服务${NC}${YELLOW} 未运行${NC} ($WEB_URL)"
fi

# PostgreSQL
if check_docker "postgres"; then
    echo -e "${GREEN}✅${NC} ${BOLD}PostgreSQL${NC}${GREEN} 运行中${NC}"
else
    echo -e "${RED}❌${NC} ${BOLD}PostgreSQL${NC}${RED} 未运行${NC}"
fi

# Redis
if check_docker "redis"; then
    echo -e "${GREEN}✅${NC} ${BOLD}Redis${NC}${GREEN} 运行中${NC}"
else
    echo -e "${RED}❌${NC} ${BOLD}Redis${NC}${RED} 未运行${NC}"
fi

echo ""
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"

