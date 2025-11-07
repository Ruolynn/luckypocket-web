#!/bin/bash

# 实时监控脚本 - 在终端持续显示服务状态

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:3001}"
WEB_URL="${WEB_URL:-http://localhost:9000}"
REFRESH_INTERVAL="${REFRESH_INTERVAL:-5}"  # 默认5秒刷新一次

check_service() {
    local name=$1
    local url=$2
    local timeout=${3:-3}
    
    if curl -s --max-time "$timeout" "$url" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

check_docker_container() {
    local pattern=$1
    if docker ps --format '{{.Names}}' | grep -qiE "$pattern"; then
        return 0
    else
        return 1
    fi
}

get_api_health() {
    local response=$(curl -s --max-time 3 "$API_URL/health" 2>/dev/null || echo "{}")
    echo "$response"
}

get_docker_status() {
    local containers=$(docker ps --format '{{.Names}}\t{{.Status}}' | grep -iE "hongbao|postgres|redis" 2>/dev/null || echo "")
    echo "$containers"
}

format_status() {
    local status=$1
    local name=$2
    
    if [ "$status" = "0" ]; then
        echo -e "${GREEN}✅${NC} ${BOLD}$name${NC}${GREEN} 运行中${NC}"
    else
        if [[ "$name" == *"Web"* ]]; then
            echo -e "${YELLOW}⚠️${NC}  ${BOLD}$name${NC}${YELLOW} 未运行${NC} (可选)"
        else
            echo -e "${RED}❌${NC} ${BOLD}$name${NC}${RED} 未运行${NC}"
        fi
    fi
}

print_header() {
    clear
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD}          🧧 HongBao 服务状态实时监控${NC}"
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_status() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${MAGENTA}📊 检查时间: ${BOLD}$timestamp${NC}"
    echo -e "${MAGENTA}🔄 刷新间隔: ${BOLD}${REFRESH_INTERVAL} 秒${NC}"
    echo -e "${MAGENTA}⏹️  按 Ctrl+C 停止监控${NC}"
    echo ""
    
    # API 服务
    check_service "API" "$API_URL/health"
    local api_status=$?
    format_status $api_status "API 服务"
    if [ $api_status -eq 0 ]; then
        local health=$(get_api_health)
        if [ -n "$health" ] && [ "$health" != "{}" ]; then
            echo -e "   ${BLUE}📍${NC} $API_URL"
            echo -e "   ${BLUE}💚${NC} $(echo "$health" | python3 -m json.tool 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "healthy")"
        fi
    fi
    echo ""
    
    # Web 服务
    check_service "Web" "$WEB_URL" 2
    local web_status=$?
    format_status $web_status "Web 服务"
    if [ $web_status -eq 0 ]; then
        echo -e "   ${BLUE}📍${NC} $WEB_URL"
    fi
    echo ""
    
    # PostgreSQL
    check_docker_container "postgres"
    local db_status=$?
    format_status $db_status "PostgreSQL"
    if [ $db_status -eq 0 ]; then
        local db_info=$(docker ps --format '{{.Names}}\t{{.Status}}' | grep -i postgres | head -1)
        if [ -n "$db_info" ]; then
            local db_name=$(echo "$db_info" | cut -f1)
            local db_state=$(echo "$db_info" | cut -f2)
            echo -e "   ${BLUE}🐳${NC} 容器: $db_name"
            echo -e "   ${BLUE}📊${NC} 状态: $db_state"
        fi
    fi
    echo ""
    
    # Redis
    check_docker_container "redis"
    local redis_status=$?
    format_status $redis_status "Redis"
    if [ $redis_status -eq 0 ]; then
        local redis_info=$(docker ps --format '{{.Names}}\t{{.Status}}' | grep -i redis | head -1)
        if [ -n "$redis_info" ]; then
            local redis_name=$(echo "$redis_info" | cut -f1)
            local redis_state=$(echo "$redis_info" | cut -f2)
            echo -e "   ${BLUE}🐳${NC} 容器: $redis_name"
            echo -e "   ${BLUE}📊${NC} 状态: $redis_state"
        fi
    fi
    echo ""
    
    # Docker 容器总览
    echo -e "${CYAN}${BOLD}🐳 Docker 容器状态:${NC}"
    local containers=$(get_docker_status)
    if [ -n "$containers" ]; then
        echo "$containers" | while IFS=$'\t' read -r name status; do
            echo -e "   ${BLUE}•${NC} ${BOLD}$name${NC}: $status"
        done
    else
        echo -e "   ${YELLOW}⚠️  未找到相关容器${NC}"
    fi
    echo ""
    
    # 系统资源（如果可用）
    if command -v top > /dev/null 2>&1; then
        echo -e "${CYAN}${BOLD}💻 系统资源:${NC}"
        local cpu=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "N/A")
        local mem=$(top -l 1 | grep "PhysMem" | awk '{print $2}' | sed 's/M//' 2>/dev/null || echo "N/A")
        echo -e "   ${BLUE}⚡${NC} CPU: ${cpu}%"
        echo -e "   ${BLUE}💾${NC} 内存: ${mem}MB"
        echo ""
    fi
    
    # 统计信息
    echo -e "${CYAN}${BOLD}📈 服务统计:${NC}"
    local running=0
    local total=4
    
    [ $api_status -eq 0 ] && ((running++))
    [ $web_status -eq 0 ] && ((running++))
    [ $db_status -eq 0 ] && ((running++))
    [ $redis_status -eq 0 ] && ((running++))
    
    echo -e "   ${BLUE}✅${NC} 运行中: ${GREEN}${BOLD}$running${NC}/${total}"
    echo -e "   ${BLUE}⏱️${NC} 下次刷新: ${YELLOW}$(date -d "+${REFRESH_INTERVAL} seconds" '+%H:%M:%S' 2>/dev/null || date -v+${REFRESH_INTERVAL}S '+%H:%M:%S' 2>/dev/null || echo "N/A")${NC}"
    echo ""
    
    echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
}

# 主循环
main() {
    # 处理 Ctrl+C
    trap 'echo -e "\n${YELLOW}监控已停止${NC}"; exit 0' INT TERM
    
    while true; do
        print_status
        sleep "$REFRESH_INTERVAL"
    done
}

# 运行
main

