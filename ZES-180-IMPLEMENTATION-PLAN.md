# ZES-180 实现计划：Socket.IO 鉴权强化

**任务**: ZES-180 - Socket.IO 鉴权：JWT 验证与房间权限控制
**优先级**: P1
**预估工作量**: 2-3天

---

## 📋 当前状态分析

### ✅ 已实现功能

1. **JWT 认证中间件**
   - 从 `handshake.auth.token` 或 `handshake.query.token` 获取 token
   - 使用 `jwtService.verifyToken()` 验证
   - 在 socket 对象上附加 `userId` 和 `address`
   - 未认证连接会被拒绝

2. **基础房间管理**
   - 自动加入用户专属房间 `user:${userId}`
   - 支持订阅红包房间 `packet:${packetId}`
   - 红包房间订阅时检查 packet 是否存在
   - 支持取消订阅

3. **错误处理**
   - 统一错误消息格式
   - 日志记录（info, warn, error 级别）

### ❌ 缺失功能

1. **房间权限精细化控制**
   - ❌ 没有检查用户是否有权访问特定红包
   - ❌ 没有限制用户可以加入的房间数量
   - ❌ 没有防止恶意订阅大量房间

2. **连接限流与安全**
   - ❌ 没有连接速率限制
   - ❌ 没有单用户最大连接数限制
   - ❌ 没有 IP 级别的限流

3. **审计日志**
   - ❌ 缺少结构化的安全事件日志
   - ❌ 没有异常行为监控
   - ❌ 没有连接统计和分析

4. **房间事件推送**
   - ❌ 没有实现 packet 相关事件推送
   - ❌ 缺少 gift 相关事件推送
   - ❌ 没有统一的事件推送接口

---

## 🎯 实现目标

### 1. 权限控制增强

#### 1.1 红包房间权限策略

**规则**:
- 任何用户都可以查看公开红包（默认）
- 创建者可以查看自己的红包统计
- 已领取用户可以查看领取记录

**实现**:
```typescript
interface PacketPermission {
  canView: boolean      // 可以查看红包信息
  canViewStats: boolean // 可以查看统计数据（创建者）
  canViewClaims: boolean // 可以查看领取记录
}

async function checkPacketPermission(
  userId: string,
  packetId: string
): Promise<PacketPermission>
```

#### 1.2 房间订阅限制

**限制**:
- 每个用户最多同时订阅 **50 个红包房间**
- 超过限制时自动取消最早订阅的房间
- 使用 Redis 存储订阅关系（TTL 1小时）

### 2. 连接安全增强

#### 2.1 连接速率限制

**策略**:
- 同一 IP 每分钟最多 **10 次连接尝试**
- 同一用户每分钟最多 **5 次连接尝试**
- 违规 IP/用户临时封禁 **5 分钟**

**实现**:
```typescript
class ConnectionRateLimiter {
  async checkIpLimit(ip: string): Promise<boolean>
  async checkUserLimit(userId: string): Promise<boolean>
  async recordConnection(ip: string, userId: string): Promise<void>
  async banIp(ip: string, duration: number): Promise<void>
}
```

#### 2.2 并发连接限制

**限制**:
- 单个用户最多 **3 个并发 Socket.IO 连接**
- 超过限制时断开最旧的连接
- 使用 Redis Set 存储活跃连接

### 3. 审计日志系统

#### 3.1 安全事件类型

```typescript
enum SecurityEventType {
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILED = 'auth_failed',
  ROOM_JOINED = 'room_joined',
  ROOM_LEFT = 'room_left',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CONNECTION_REJECTED = 'connection_rejected',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

interface SecurityEvent {
  type: SecurityEventType
  userId?: string
  socketId: string
  ip: string
  timestamp: Date
  details: Record<string, any>
}
```

#### 3.2 日志存储

- 使用 **Prisma** 存储关键安全事件
- 使用 **Redis** 存储实时统计数据
- 保留期限: 30天

### 4. 事件推送接口

#### 4.1 红包事件

```typescript
// 红包创建
io.to(`user:${creatorId}`).emit('packet:created', {
  packetId,
  totalAmount,
  count,
  expireTime
})

// 红包被领取
io.to(`packet:${packetId}`).emit('packet:claimed', {
  packetId,
  claimerId,
  amount,
  remainingCount,
  remainingAmount
})

// 随机数就绪
io.to(`packet:${packetId}`).emit('packet:random-ready', {
  packetId
})

// 手气最佳更新
io.to(`packet:${packetId}`).emit('packet:best-updated', {
  packetId,
  claimId,
  claimerId,
  amount
})

// 红包过期
io.to(`packet:${packetId}`).emit('packet:expired', {
  packetId
})
```

#### 4.2 礼物事件

```typescript
// 礼物创建
io.to(`user:${recipientId}`).emit('gift:received', {
  giftId,
  senderId,
  amount,
  message
})

// 礼物领取
io.to(`user:${senderId}`).emit('gift:claimed', {
  giftId,
  claimerId,
  claimedAt
})

// 礼物退款
io.to(`user:${senderId}`).emit('gift:refunded', {
  giftId,
  amount,
  refundedAt
})
```

---

## 📝 实现步骤

### Step 1: 权限控制服务 (2小时)

**文件**: `apps/api/src/services/socket-permission.service.ts`

```typescript
export class SocketPermissionService {
  // 检查红包访问权限
  async checkPacketAccess(userId: string, packetId: string): Promise<PacketPermission>

  // 检查房间订阅限制
  async canSubscribeToRoom(userId: string, roomId: string): Promise<boolean>

  // 记录房间订阅
  async recordRoomSubscription(userId: string, roomId: string): Promise<void>

  // 获取用户订阅的房间列表
  async getUserSubscriptions(userId: string): Promise<string[]>

  // 清理过期订阅
  async cleanupExpiredSubscriptions(): Promise<void>
}
```

### Step 2: 连接限流服务 (1.5小时)

**文件**: `apps/api/src/services/socket-rate-limiter.service.ts`

```typescript
export class SocketRateLimiterService {
  // IP 级别限流
  async checkIpRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }>

  // 用户级别限流
  async checkUserRateLimit(userId: string): Promise<{ allowed: boolean; retryAfter?: number }>

  // 并发连接检查
  async checkConcurrentConnections(userId: string): Promise<{ allowed: boolean; current: number; max: number }>

  // 记录连接
  async recordConnection(ip: string, userId: string, socketId: string): Promise<void>

  // 移除连接
  async removeConnection(userId: string, socketId: string): Promise<void>

  // 封禁 IP
  async banIp(ip: string, duration: number): Promise<void>

  // 检查 IP 是否被封禁
  async isIpBanned(ip: string): Promise<boolean>
}
```

### Step 3: 审计日志服务 (1小时)

**文件**: `apps/api/src/services/socket-audit.service.ts`

```typescript
export class SocketAuditService {
  // 记录安全事件
  async logSecurityEvent(event: SecurityEvent): Promise<void>

  // 检测异常行为
  async detectSuspiciousActivity(userId: string, ip: string): Promise<boolean>

  // 获取用户审计日志
  async getUserAuditLog(userId: string, limit?: number): Promise<SecurityEvent[]>

  // 获取实时统计
  async getRealTimeStats(): Promise<{
    totalConnections: number
    activeUsers: number
    activeRooms: number
    authFailures: number
  }>
}
```

### Step 4: 增强 Socket 插件 (2小时)

**文件**: `apps/api/src/plugins/socket.ts`

**改进点**:
1. 添加连接限流检查
2. 增强房间订阅权限验证
3. 实现并发连接限制
4. 添加审计日志记录
5. 实现事件推送辅助函数

### Step 5: 数据库 Schema (30分钟)

**文件**: `apps/api/prisma/schema.prisma`

```prisma
model SocketSecurityEvent {
  id        String   @id @default(cuid())
  type      String   // SecurityEventType
  userId    String?
  socketId  String
  ip        String
  userAgent String?
  details   Json?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@index([type, createdAt])
  @@index([ip, createdAt])
  @@map("socket_security_events")
}
```

### Step 6: 集成到事件监听器 (1.5小时)

**修改文件**:
- `apps/api/src/services/redpacket-listener.service.ts`
- `apps/api/src/services/event-listener.service.ts`

**添加推送**:
```typescript
// 在 PacketClaimed 事件处理中
await this.handlePacketClaimedLogs(logs)

// 推送 Socket.IO 事件
this.app.io.to(`packet:${packetId}`).emit('packet:claimed', {
  packetId,
  claimerId,
  amount,
  remainingCount,
  remainingAmount
})
```

### Step 7: 测试 (2小时)

**文件**: `apps/api/test/unit/services/socket-*.test.ts`

**测试覆盖**:
- 权限检查逻辑
- 连接限流功能
- 房间订阅限制
- 审计日志记录
- 事件推送功能

### Step 8: 文档 (1小时)

**文件**: `docs/API-Socket-IO.md`

**内容**:
- Socket.IO 连接指南
- 鉴权方式
- 房间订阅机制
- 事件列表
- 错误处理
- 安全最佳实践

---

## ⚠️ 安全考虑

### 1. Token 安全
- ✅ 使用 JWT 验证
- ✅ Token 只能从认证头或查询参数获取
- ⚠️ 建议：实现 Token 刷新机制
- ⚠️ 建议：Token 过期时间设置为 1 小时

### 2. 防止滥用
- ✅ IP 级别限流
- ✅ 用户级别限流
- ✅ 房间订阅数量限制
- ✅ 并发连接限制

### 3. 数据隐私
- ✅ 用户只能访问自己的通知
- ✅ 红包信息基于权限展示
- ⚠️ 敏感数据脱敏（如完整地址）

### 4. 审计与监控
- ✅ 所有认证失败记录
- ✅ 权限拒绝事件记录
- ✅ 异常行为检测
- ✅ 实时统计仪表板

---

## 📊 性能指标

### Redis 使用

| 键模式 | 用途 | TTL | 估计大小 |
|--------|------|-----|----------|
| `socket:ip-limit:{ip}` | IP 限流 | 60s | ~1KB |
| `socket:user-limit:{userId}` | 用户限流 | 60s | ~1KB |
| `socket:connections:{userId}` | 活跃连接 | 3600s | ~100B |
| `socket:subscriptions:{userId}` | 房间订阅 | 3600s | ~2KB |
| `socket:banned-ips` | 封禁 IP 列表 | 300s | ~5KB |

### 数据库负载

| 操作 | 频率 | 索引 |
|------|------|------|
| 审计日志写入 | 每次连接/断开 | `(userId, createdAt)` |
| 审计日志查询 | 按需 | `(type, createdAt)` |
| 权限检查 | 每次房间订阅 | Packet 表已有索引 |

---

## ✅ 验收标准

### 功能完整性
- [ ] JWT 认证中间件工作正常
- [ ] 房间权限检查正确
- [ ] 连接限流生效
- [ ] 并发连接限制工作
- [ ] 审计日志正确记录
- [ ] 事件推送功能正常
- [ ] 异常行为检测工作

### 安全性
- [ ] 未认证连接被拒绝
- [ ] 无权限订阅被拒绝
- [ ] 超速连接被限流
- [ ] 恶意 IP 被封禁
- [ ] 敏感事件被记录

### 性能
- [ ] 认证延迟 < 10ms
- [ ] 权限检查延迟 < 20ms
- [ ] Redis 操作 < 5ms
- [ ] 单服务器支持 10000+ 并发连接

### 测试覆盖
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 压力测试通过

### 文档
- [ ] API 文档完整
- [ ] 安全指南完整
- [ ] 示例代码可用

---

## 🚀 后续优化

### Phase 2
- [ ] WebSocket 心跳优化
- [ ] 连接池管理
- [ ] 集群模式支持（Redis Adapter 已支持）
- [ ] 实时监控仪表板

### Phase 3
- [ ] Token 自动刷新
- [ ] 多设备登录管理
- [ ] 推送消息去重
- [ ] 消息持久化（离线消息）

---

## 📅 时间估算

| 任务 | 预估时间 | 优先级 |
|------|---------|--------|
| 权限控制服务 | 2h | P0 |
| 连接限流服务 | 1.5h | P0 |
| 审计日志服务 | 1h | P1 |
| Socket 插件增强 | 2h | P0 |
| 数据库 Schema | 0.5h | P0 |
| 事件监听器集成 | 1.5h | P1 |
| 测试 | 2h | P0 |
| 文档 | 1h | P2 |
| **总计** | **11.5h** | **~2天** |

---

**创建时间**: 2025-11-07
**预计完成**: 2025-11-09
**负责人**: Claude Code
**状态**: 📝 Planning

