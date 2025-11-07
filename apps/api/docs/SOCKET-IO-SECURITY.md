# Socket.IO Security Implementation

## Overview

LuckyPocket 使用 Socket.IO 提供实时通信功能，支持红包创建、领取等事件的实时推送。本文档详细说明了 Socket.IO 的安全架构、认证流程、权限控制和使用方式。

## Security Architecture

### Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────────┐
│                   Client Connection                      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 1: IP Ban Check                                  │
│  - Check if IP is temporarily banned                    │
│  - Auto-ban after excessive violations                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 2: IP Rate Limiting                              │
│  - Max 10 connections per minute per IP                 │
│  - Redis-based distributed rate limiting                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 3: JWT Authentication                            │
│  - Verify JWT token signature                           │
│  - Extract user ID and wallet address                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 4: User Rate Limiting                            │
│  - Max 5 connections per minute per user                │
│  - Prevent rapid reconnection attacks                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 5: Concurrent Connection Limit                   │
│  - Max 3 concurrent connections per user                │
│  - Auto-disconnect oldest connection if exceeded        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 6: Room Subscription Control                     │
│  - Permission check for packet access                   │
│  - Max 50 room subscriptions per user                   │
│  - Audit logging for all operations                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              Authenticated Connection                    │
└─────────────────────────────────────────────────────────┘
```

## Connection Flow

### 1. Client Connection

**Client Side:**
```typescript
import { io } from 'socket.io-client'

const socket = io('wss://api.luckypocket.xyz', {
  auth: {
    token: '<JWT_TOKEN>' // From /auth/login or /auth/connect-wallet
  },
  transports: ['websocket', 'polling']
})

socket.on('connect', () => {
  console.log('Connected:', socket.id)
})

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message)
  // Possible errors:
  // - CONNECTION_REJECTED: IP banned
  // - RATE_LIMIT_EXCEEDED: Too many connections
  // - AUTH_REQUIRED: No token provided
  // - AUTH_FAILED: Invalid token
})
```

**Server Side Validation:**
```typescript
// 1. Check IP ban status
const ipBanned = await rateLimiter.isIpBanned(ip)
if (ipBanned) return next(new Error('CONNECTION_REJECTED'))

// 2. Check IP rate limit (10/min)
const ipLimit = await rateLimiter.checkIpRateLimit(ip)
if (!ipLimit.allowed) return next(new Error('RATE_LIMIT_EXCEEDED'))

// 3. Verify JWT token
const payload = jwtService.verifyToken(token)

// 4. Check user rate limit (5/min)
const userLimit = await rateLimiter.checkUserRateLimit(userId)
if (!userLimit.allowed) return next(new Error('RATE_LIMIT_EXCEEDED'))

// 5. Check concurrent connections (max 3)
const concurrentLimit = await rateLimiter.checkConcurrentConnections(userId)
if (!concurrentLimit.allowed) {
  // Disconnect oldest connection automatically
}

// 6. Log successful authentication
await auditService.logSecurityEvent({
  type: SecurityEventType.AUTH_SUCCESS,
  userId, socketId, ip, userAgent
})
```

### 2. Room Subscription

#### Subscribe to Packet Room

**Client Side:**
```typescript
// Subscribe to real-time updates for a specific red packet
socket.emit('subscribe:packet', 'abc123def')

socket.on('subscribed', ({ packetId, room, permissions }) => {
  console.log('Subscribed to:', room)
  console.log('Permissions:', permissions)
  // permissions: { canView, canViewStats, canViewClaims }
})

socket.on('error', ({ type, message }) => {
  console.error('Subscription error:', type, message)
  // Possible errors:
  // - SUBSCRIPTION_LIMIT_EXCEEDED: Max 50 rooms per user
  // - PERMISSION_DENIED: No access to this packet
  // - PACKET_NOT_FOUND: Packet does not exist
})
```

**Server Side Validation:**
```typescript
// 1. Check subscription limit (max 50 rooms)
const canSubscribe = await permissionService.canSubscribeToRoom(userId, roomId)
if (!canSubscribe) {
  await auditService.logSecurityEvent({
    type: SecurityEventType.PERMISSION_DENIED,
    userId, socketId, ip,
    details: { reason: 'Room subscription limit exceeded' }
  })
  return socket.emit('error', { type: 'SUBSCRIPTION_LIMIT_EXCEEDED' })
}

// 2. Check if packet exists
const packet = await prisma.packet.findUnique({ where: { packetId } })
if (!packet) {
  return socket.emit('error', { type: 'PACKET_NOT_FOUND' })
}

// 3. Check access permissions
const permission = await permissionService.checkPacketAccess(userId, packetId)
if (!permission.canView) {
  await auditService.logSecurityEvent({
    type: SecurityEventType.PERMISSION_DENIED,
    userId, socketId, ip,
    details: { reason: 'No access to packet', packetId }
  })
  return socket.emit('error', { type: 'PERMISSION_DENIED' })
}

// 4. Join room and record subscription
socket.join(roomId)
await permissionService.recordRoomSubscription(userId, roomId)
await auditService.logSecurityEvent({
  type: SecurityEventType.ROOM_JOINED,
  userId, socketId, ip,
  details: { room: roomId, packetId }
})
```

#### Unsubscribe from Packet Room

**Client Side:**
```typescript
socket.emit('unsubscribe:packet', 'abc123def')

socket.on('unsubscribed', ({ packetId }) => {
  console.log('Unsubscribed from:', packetId)
})
```

**Server Side:**
```typescript
socket.leave(roomId)
await permissionService.removeRoomSubscription(userId, roomId)
await auditService.logSecurityEvent({
  type: SecurityEventType.ROOM_LEFT,
  userId, socketId, ip,
  details: { room: roomId, packetId }
})
```

#### Subscribe to User Notifications

**Client Side:**
```typescript
// Subscribe to personal notifications (auto-joined on connection)
socket.emit('subscribe:notifications')

socket.on('subscribed', ({ room, type }) => {
  console.log('Subscribed to:', room) // user:{userId}
})
```

## Real-Time Events

### Packet Events

Clients subscribed to `packet:{packetId}` rooms receive:

#### `packet:created`
```typescript
socket.on('packet:created', (data) => {
  // Emitted when a new packet is created
  console.log('New packet:', data)
  // { packetId, type, totalAmount, totalCount, creatorId, expireTime }
})
```

#### `packet:claimed`
```typescript
socket.on('packet:claimed', (data) => {
  // Emitted when someone claims from the packet
  console.log('Packet claimed:', data)
  // { packetId, claimId, claimerId, claimedAmount, remainingAmount, remainingCount }
})
```

#### `packet:random-ready`
```typescript
socket.on('packet:random-ready', (data) => {
  // Emitted when random draw results are ready (for random packets)
  console.log('Random results ready:', data)
  // { packetId, totalClaimed, bestClaimId }
})
```

#### `packet:best-updated`
```typescript
socket.on('packet:best-updated', (data) => {
  // Emitted when the best/luckiest claim is updated
  console.log('New best claim:', data)
  // { packetId, bestClaimId, bestClaimerId, bestAmount }
})
```

#### `packet:expired`
```typescript
socket.on('packet:expired', (data) => {
  // Emitted when packet expires
  console.log('Packet expired:', data)
  // { packetId, refundedAmount, creatorId }
})
```

### User Notifications

Clients automatically subscribed to `user:{userId}` receive:

#### `notification:gift-received`
```typescript
socket.on('notification:gift-received', (data) => {
  // Emitted when user receives a gift via claim
  console.log('Gift received:', data)
  // { giftId, giftType, fromPacketId, message }
})
```

#### `notification:achievement-unlocked`
```typescript
socket.on('notification:achievement-unlocked', (data) => {
  // Emitted when user unlocks an achievement
  console.log('Achievement unlocked:', data)
  // { achievementId, title, description, reward }
})
```

## Security Features

### 1. Rate Limiting

**IP-based Rate Limiting:**
- **Limit:** 10 connections per minute per IP
- **Window:** 60 seconds
- **Action:** Return `RATE_LIMIT_EXCEEDED` error
- **Auto-ban:** Ban IP for 5 minutes after exceeding 2x limit

**User-based Rate Limiting:**
- **Limit:** 5 connections per minute per user
- **Window:** 60 seconds
- **Action:** Return `RATE_LIMIT_EXCEEDED` error

**Implementation:**
```typescript
// Redis keys
socket:ip-limit:{ip}        // TTL: 60s
socket:user-limit:{userId}  // TTL: 60s
socket:banned:{ip}          // TTL: 300s (5 minutes)
```

### 2. Concurrent Connection Control

**Limit:** Maximum 3 concurrent connections per user

**Behavior:**
- When a 4th connection is established, the oldest connection is automatically disconnected
- The disconnected client receives a `CONCURRENT_LIMIT_EXCEEDED` error event
- Connection records are tracked in Redis with automatic cleanup

**Implementation:**
```typescript
// Redis keys
socket:connections:{userId}    // Set of socket IDs, TTL: 3600s
socket:user:{socketId}         // Socket-to-user mapping, TTL: 3600s
```

### 3. Room Subscription Limits

**Limit:** Maximum 50 room subscriptions per user

**Behavior:**
- Prevents memory exhaustion attacks
- Returns `SUBSCRIPTION_LIMIT_EXCEEDED` error when exceeded
- Subscriptions tracked in Redis with TTL for automatic cleanup

**Implementation:**
```typescript
// Redis keys
socket:subscriptions:{userId}  // Set of room IDs, TTL: 3600s (1 hour)
```

### 4. Permission Control

**Packet Access Permissions:**
```typescript
interface PacketPermission {
  canView: boolean        // Public access (all users)
  canViewStats: boolean   // Creator only
  canViewClaims: boolean  // Creator + claimers only
}
```

**Permission Matrix:**
| Role | canView | canViewStats | canViewClaims |
|------|---------|--------------|---------------|
| Creator | ✅ | ✅ | ✅ |
| Claimer | ✅ | ❌ | ✅ |
| Other | ✅ | ❌ | ❌ |

### 5. Audit Logging

**Security Event Types:**
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
  CONCURRENT_LIMIT_EXCEEDED = 'concurrent_limit_exceeded',
}
```

**Event Storage:**
All security events are logged to the database with:
- Event type
- User ID (if authenticated)
- Socket ID
- IP address
- User Agent
- Event details (JSON)
- Timestamp

**Suspicious Activity Detection:**
Automatically detect and log suspicious patterns:
- 10+ auth failures per hour from same IP
- 20+ permission denials per hour from same user
- 5+ rapid reconnects per minute from same IP

**Log Retention:**
- Default: 30 days
- Automatic cleanup via `cleanupOldLogs()` method
- Can be configured per deployment

## Error Handling

### Connection Errors

| Error Code | Description | Retry Strategy |
|------------|-------------|----------------|
| `CONNECTION_REJECTED` | IP is banned | Wait for ban expiration (check `retryAfter`) |
| `RATE_LIMIT_EXCEEDED` | Too many connections | Wait 60 seconds and retry |
| `AUTH_REQUIRED` | No token provided | Provide valid JWT token |
| `AUTH_FAILED` | Invalid token | Re-authenticate and get new token |
| `CONCURRENT_LIMIT_EXCEEDED` | Too many concurrent connections | Close one existing connection |

### Subscription Errors

| Error Code | Description | Action |
|------------|-------------|--------|
| `SUBSCRIPTION_LIMIT_EXCEEDED` | Max 50 rooms per user | Unsubscribe from unused rooms |
| `PERMISSION_DENIED` | No access to packet | Check if user has claimed/created packet |
| `PACKET_NOT_FOUND` | Packet does not exist | Verify packet ID is correct |
| `INVALID_PACKET_ID` | Invalid format | Check packet ID format |

### Client Error Handling Example

```typescript
socket.on('connect_error', async (error) => {
  switch (error.message) {
    case 'RATE_LIMIT_EXCEEDED':
      console.log('Rate limit exceeded, waiting 60 seconds...')
      await new Promise(resolve => setTimeout(resolve, 60000))
      socket.connect()
      break

    case 'AUTH_FAILED':
      console.log('Auth failed, refreshing token...')
      const newToken = await refreshAuthToken()
      socket.auth.token = newToken
      socket.connect()
      break

    case 'CONNECTION_REJECTED':
      console.error('IP banned, contact support')
      break

    default:
      console.error('Connection error:', error.message)
  }
})

socket.on('error', ({ type, message }) => {
  switch (type) {
    case 'SUBSCRIPTION_LIMIT_EXCEEDED':
      console.log('Too many subscriptions, cleaning up...')
      // Unsubscribe from oldest rooms
      break

    case 'PERMISSION_DENIED':
      console.log('Access denied to packet')
      break

    case 'CONCURRENT_LIMIT_EXCEEDED':
      console.log('New connection established elsewhere')
      // This connection will be disconnected
      break
  }
})
```

## Monitoring & Statistics

### Real-Time Rate Limiter Stats

```typescript
GET /admin/socket/stats

Response:
{
  totalConnections: 245,
  bannedIps: 3
}
```

### Real-Time Audit Stats

```typescript
GET /admin/socket/audit/stats

Response:
{
  totalEvents: 1523,       // Last hour
  authFailures: 12,        // Last hour
  activeConnections: 245,  // Last hour
  suspiciousActivities: 2  // Last hour
}
```

### User Audit Log

```typescript
GET /admin/socket/audit/user/:userId?limit=50

Response:
[
  {
    type: 'auth_success',
    userId: 'user123',
    socketId: 'socket456',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    details: { address: '0x...' },
    timestamp: '2025-11-07T10:30:00Z'
  },
  // ... more events
]
```

### Events by Type

```typescript
GET /admin/socket/audit/events?type=auth_failed&hoursAgo=24

Response:
[
  // Last 24 hours of auth_failed events
]
```

## Best Practices

### Client Implementation

1. **Handle Reconnection:**
```typescript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server forcefully disconnected (concurrent limit)
    console.log('Disconnected due to concurrent limit')
  } else {
    // Auto-reconnect with exponential backoff
    socket.connect()
  }
})
```

2. **Token Refresh:**
```typescript
// Refresh token before expiration
setInterval(async () => {
  const newToken = await refreshAuthToken()
  socket.auth.token = newToken
  socket.disconnect().connect() // Reconnect with new token
}, 55 * 60 * 1000) // Refresh every 55 minutes (if token expires in 60 min)
```

3. **Clean Subscription:**
```typescript
// Clean up subscriptions when navigating away
window.addEventListener('beforeunload', () => {
  socket.emit('unsubscribe:packet', currentPacketId)
  socket.disconnect()
})
```

4. **Error Recovery:**
```typescript
let reconnectAttempts = 0
const maxReconnectAttempts = 5

socket.on('connect_error', (error) => {
  reconnectAttempts++
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('Max reconnection attempts reached')
    socket.disconnect()
    return
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
  setTimeout(() => socket.connect(), delay)
})

socket.on('connect', () => {
  reconnectAttempts = 0
})
```

### Server Implementation

1. **Use Service Instances:**
All security services are initialized in the Socket plugin and available throughout the connection lifecycle.

2. **Always Log Security Events:**
Every authentication attempt, room subscription, and security violation should be logged for audit purposes.

3. **Fail Gracefully:**
If audit logging or rate limiting fails, log the error but don't block legitimate users.

4. **Regular Cleanup:**
```typescript
// Schedule periodic cleanup of old audit logs
setInterval(async () => {
  const deleted = await auditService.cleanupOldLogs(30)
  console.log(`Cleaned up ${deleted} old security events`)
}, 24 * 60 * 60 * 1000) // Daily
```

## Security Considerations

1. **JWT Token Security:**
   - Tokens should have reasonable expiration times (e.g., 1 hour)
   - Use HTTPS/WSS in production
   - Never expose tokens in URLs or logs

2. **IP-based Limiting Caveats:**
   - May affect users behind NAT/proxies
   - Consider using X-Forwarded-For header in production
   - Whitelist known good IPs if needed

3. **Redis Security:**
   - Use Redis AUTH in production
   - Enable TLS for Redis connections
   - Set appropriate key expiration times

4. **Rate Limit Tuning:**
   - Adjust limits based on traffic patterns
   - Monitor false positives
   - Consider user tier-based limits (free vs premium)

5. **Audit Log Privacy:**
   - Store only necessary user information
   - Comply with GDPR/privacy regulations
   - Implement data retention policies

## Testing

See `apps/api/src/services/__tests__/socket-*.test.ts` for unit tests covering:
- Rate limiting behavior
- Permission checks
- Audit logging
- Concurrent connection handling
- Subscription limits

## Related Documentation

- [JWT Authentication](./JWT-Authentication.md)
- [Redis Configuration](./Redis-Configuration.md)
- [Token Validation](./API-Token-Validation.md)
- [Event Synchronization](./Event-Synchronization.md)
