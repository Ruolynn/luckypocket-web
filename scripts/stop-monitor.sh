#!/bin/bash

# 停止监控脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.monitor.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "监控脚本未运行"
    exit 1
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    kill "$PID"
    rm -f "$PID_FILE"
    echo "监控脚本已停止 (PID: $PID)"
else
    echo "监控脚本未运行 (PID: $PID)"
    rm -f "$PID_FILE"
fi

