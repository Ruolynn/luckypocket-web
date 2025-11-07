#!/bin/bash

# 服务状态监控脚本 - 每5分钟检查一次

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

API_URL="${API_URL:-http://localhost:3001}"
WEB_URL="${WEB_URL:-http://localhost:9000}"  # Next.js 默认运行在 9000 端口
INTERVAL="${INTERVAL:-300}"  # 默认5分钟 (300秒)

# 创建日志目录
LOG_DIR="${LOG_DIR:-./logs}"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/monitor-$(date +%Y%m%d).log"

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

check_service() {
    local name=$1
    local url=$2
    local timeout=${3:-5}
    
    if curl -s --max-time "$timeout" "$url" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

check_docker_service() {
    local service=$1
    if docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
        return 0
    else
        return 1
    fi
}

check_database() {
    # 检查 Docker 容器（支持多种命名格式）
    local postgres_running=false
    if docker ps --format '{{.Names}}' | grep -qiE "postgres|hongbao.*postgres"; then
        postgres_running=true
    fi
    
    if [ "$postgres_running" = true ]; then
        # 如果容器运行，尝试连接数据库
        if command -v psql > /dev/null 2>&1; then
            local db_url="${DATABASE_URL:-postgresql://hongbao:hongbao@localhost:5432/hongbao}"
            PGPASSWORD=$(echo "$db_url" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p') \
            psql "$db_url" -c "SELECT 1;" > /dev/null 2>&1
            return $?
        else
            # 容器运行但没有 psql，认为数据库可用
            return 0
        fi
    else
        return 1
    fi
}

check_redis() {
    # 检查 Docker 容器（支持多种命名格式）
    if docker ps --format '{{.Names}}' | grep -qiE "redis|hongbao.*redis"; then
        return 0
    else
        # 尝试连接 Redis
        if command -v redis-cli > /dev/null 2>&1; then
            redis-cli -h localhost -p 6379 ping > /dev/null 2>&1
            return $?
        fi
        return 1
    fi
}

print_status() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  服务状态监控 - $timestamp${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # 检查 API 服务
    if check_service "API" "$API_URL/health"; then
        echo -e "${GREEN}✅ API 服务${NC}        : ${GREEN}运行中${NC} ($API_URL)"
        log "INFO" "API service is running"
    else
        echo -e "${RED}❌ API 服务${NC}        : ${RED}未运行${NC} ($API_URL)"
        log "ERROR" "API service is not running"
    fi
    
    # 检查 Web 服务
    if check_service "Web" "$WEB_URL" 3; then
        echo -e "${GREEN}✅ Web 服务${NC}        : ${GREEN}运行中${NC} ($WEB_URL)"
        log "INFO" "Web service is running"
    else
        echo -e "${YELLOW}⚠️  Web 服务${NC}        : ${YELLOW}未运行${NC} ($WEB_URL)"
        log "WARN" "Web service is not running"
    fi
    
    # 检查 PostgreSQL
    if check_database; then
        echo -e "${GREEN}✅ PostgreSQL${NC}      : ${GREEN}运行中${NC}"
        log "INFO" "PostgreSQL is running"
    else
        echo -e "${RED}❌ PostgreSQL${NC}      : ${RED}未运行${NC}"
        log "ERROR" "PostgreSQL is not running"
    fi
    
    # 检查 Redis
    if check_redis; then
        echo -e "${GREEN}✅ Redis${NC}           : ${GREEN}运行中${NC}"
        log "INFO" "Redis is running"
    else
        echo -e "${RED}❌ Redis${NC}           : ${RED}未运行${NC}"
        log "ERROR" "Redis is not running"
    fi
    
    # 检查 Docker 容器
    echo ""
    echo -e "${BLUE}Docker 容器状态:${NC}"
    if command -v docker > /dev/null 2>&1; then
        local containers=$(docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E "hongbao|CONTAINER" || true)
        if [ -n "$containers" ]; then
            echo "$containers"
            log "INFO" "Docker containers checked"
        else
            echo -e "${YELLOW}⚠️  未找到 hongbao 相关容器${NC}"
            log "WARN" "No hongbao containers found"
        fi
    else
        echo -e "${YELLOW}⚠️  Docker 未安装${NC}"
        log "WARN" "Docker is not installed"
    fi
    
    # API 健康检查详情
    echo ""
    echo -e "${BLUE}API 健康检查详情:${NC}"
    if check_service "API" "$API_URL/health"; then
        local health_response=$(curl -s --max-time 5 "$API_URL/health" 2>/dev/null || echo "{}")
        echo "$health_response" | python3 -m json.tool 2>/dev/null || echo "$health_response"
        log "INFO" "API health check: $health_response"
    else
        echo -e "${RED}无法获取健康检查信息${NC}"
        log "ERROR" "Cannot fetch API health check"
    fi
    
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}下次检查时间: $(date -d "+$INTERVAL seconds" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date -v+${INTERVAL}S '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "N/A")${NC}"
    echo -e "${CYAN}日志文件: $LOG_FILE${NC}"
    echo ""
}

# 主循环
main() {
    echo -e "${GREEN}🚀 服务状态监控启动${NC}"
    echo -e "${YELLOW}监控间隔: ${INTERVAL} 秒 (5分钟)${NC}"
    echo -e "${YELLOW}按 Ctrl+C 停止监控${NC}"
    echo ""
    
    # 首次检查
    print_status
    
    # 循环监控
    while true; do
        sleep "$INTERVAL"
        print_status
    done
}

# 处理 Ctrl+C
trap 'echo -e "\n${YELLOW}监控已停止${NC}"; exit 0' INT TERM

# 运行主函数
main

