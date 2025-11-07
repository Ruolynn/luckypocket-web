# 🚀 快速开始 - 实时监控

## 📍 重要：先切换到项目目录

脚本需要在项目根目录下运行：

```bash
# 1. 切换到项目目录
cd /Users/lushengqi/工作间/Github/HongBao

# 2. 运行实时监控
./scripts/watch-status.sh
```

## 🎯 三种使用方式

### 方式 1: 实时监控（推荐）

```bash
cd /Users/lushengqi/工作间/Github/HongBao
./scripts/watch-status.sh
```

### 方式 2: 快速检查

```bash
cd /Users/lushengqi/工作间/Github/HongBao
./scripts/quick-status.sh
```

### 方式 3: 后台监控（每5分钟检查一次）

```bash
cd /Users/lushengqi/工作间/Github/HongBao
./scripts/monitor-status.sh
```

## 💡 如果还是找不到文件

检查当前目录：
```bash
pwd
```

应该显示：
```
/Users/lushengqi/工作间/Github/HongBao
```

如果不在这个目录，运行：
```bash
cd /Users/lushengqi/工作间/Github/HongBao
```

## 🔧 创建快捷命令（可选）

如果想在任何目录都能运行，可以添加到 `~/.zshrc`：

```bash
# 添加到 ~/.zshrc
alias hongbao-status='cd /Users/lushengqi/工作间/Github/HongBao && ./scripts/watch-status.sh'
alias hongbao-quick='cd /Users/lushengqi/工作间/Github/HongBao && ./scripts/quick-status.sh'

# 然后重新加载
source ~/.zshrc

# 之后就可以在任何地方运行
hongbao-status
```

