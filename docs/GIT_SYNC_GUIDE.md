# Git同步指南

## 当前状态

✅ **已完成的操作**:
- ✅ 清理了不需要的文件（.DS_Store, tsbuildinfo等）
- ✅ 优化了.gitignore文件
- ✅ 移除了node_modules的git跟踪
- ✅ 修复了create页面的useRouter导入问题
- ✅ 提交了所有更改到本地仓库

**提交信息**: `chore: clean up unused files and optimize .gitignore`

---

## 推送到GitHub

当前本地仓库已准备好，但需要配置GitHub认证才能推送。

### 方法1: 使用SSH（推荐）

1. **检查SSH密钥**:
```bash
ls -la ~/.ssh/id_rsa.pub
```

2. **如果没有SSH密钥，生成一个**:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

3. **添加SSH密钥到GitHub**:
   - 复制公钥: `cat ~/.ssh/id_rsa.pub`
   - 在GitHub上: Settings → SSH and GPG keys → New SSH key
   - 粘贴公钥并保存

4. **更改远程URL为SSH**:
```bash
cd /Users/ruolynnchen/Codebase/luckyPocket
git remote set-url origin git@github.com:Zesty-Studio/HongBao.git
```

5. **推送**:
```bash
git push origin main
```

---

### 方法2: 使用Personal Access Token (HTTPS)

1. **在GitHub上创建Personal Access Token**:
   - 访问: https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 选择权限: `repo` (全部)
   - 生成并复制token

2. **推送时使用token作为密码**:
```bash
cd /Users/ruolynnchen/Codebase/luckyPocket
git push origin main
# Username: 你的GitHub用户名
# Password: 粘贴你的Personal Access Token
```

---

### 方法3: 使用GitHub CLI

1. **安装GitHub CLI** (如果未安装):
```bash
brew install gh
```

2. **登录**:
```bash
gh auth login
```

3. **推送**:
```bash
git push origin main
```

---

## 验证推送

推送成功后，访问以下URL验证:
https://github.com/Zesty-Studio/HongBao

---

## 当前.gitignore配置

已优化的.gitignore包含以下规则:
- ✅ node_modules/ (所有目录)
- ✅ .DS_Store (macOS系统文件)
- ✅ *.tsbuildinfo (TypeScript构建缓存)
- ✅ .env文件 (环境变量)
- ✅ build/dist输出目录
- ✅ 测试报告和覆盖率
- ✅ IDE配置文件
- ✅ 日志文件

---

## 后续维护

### 定期清理不需要的文件:
```bash
# 删除.DS_Store文件
find . -name ".DS_Store" -type f -delete

# 删除tsbuildinfo文件
find . -name "*.tsbuildinfo" -type f -delete

# 检查git状态
git status
```

### 确保.gitignore生效:
```bash
# 如果文件已被追踪，需要从git中移除
git rm --cached <file>
git commit -m "Remove tracked file"
```

---

## 注意事项

1. **不要提交敏感信息**: 
   - `.env`文件
   - 私钥文件
   - API密钥

2. **不要提交构建产物**:
   - `node_modules/`
   - `dist/` 或 `build/`
   - `.next/`

3. **定期同步**:
   - 在推送前先拉取: `git pull origin main`
   - 解决冲突后再推送

---

**最后更新**: 2025-11-03

