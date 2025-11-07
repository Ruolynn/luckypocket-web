#!/bin/bash

# 后台运行监控脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/monitor-status.sh"
PID_FILE="$SCRIPT_DIR/.monitor.pid"
LOG_DIR="$SCRIPT_DIR/../logs"

# 检查是否已经在运行
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "监控脚本已在运行 (PID: $PID)"
        echo "停止监控: kill $PID"
        exit 1
    else
        # PID 文件存在但进程不存在，删除旧文件
        rm -f "$PID_FILE"
    fi
fi

# 启动监控脚本
echo "启动后台监控..."
nohup "$MONITOR_SCRIPT" > "$LOG_DIR/monitor-background.log" 2>&1 &
MONITOR_PID=$!

# 保存 PID
echo "$MONITOR_PID" > "$PID_FILE"

echo "监控脚本已在后台启动 (PID: $MONITOR_PID)"
echo "查看日志: tail -f $LOG_DIR/monitor-background.log"
echo "查看状态日志: tail -f $LOG_DIR/monitor-$(date +%Y%m%d).log"
echo "停止监控: kill $MONITOR_PID 或运行 ./scripts/stop-monitor.sh"

