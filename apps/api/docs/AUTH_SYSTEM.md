# SIWE Authentication System

## Overview

Sign-In with Ethereum (SIWE) authentication system implementation following [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361).

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  Routes      │────▶│  Services   │
│  (Frontend) │     │  (auth.ts)   │     │  (AuthSvc)  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                     │
                           │                     ▼
                           │              ┌─────────────┐
                           │              │  JWTService │
                           │              └─────────────┘
                           │                     │
                           ▼                     ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  Middleware  │     │   Redis     │
                    │ (siwe-auth)  │     │  (Nonces)   │
                    └──────────────┘     └─────────────┘
```

## API Endpoints

### 1. Generate Nonce

**GET** `/api/v1/auth/nonce`

Generate a new nonce for SIWE authentication.

**Response:**
```json
{
  "nonce": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Notes:**
- Nonce expires in 10 minutes
- Stored in Redis with prefix `siwe:nonce:`
- One-time use only

---

### 2. Verify Signature

**POST** `/api/v1/auth/verify`

Verify SIWE signature and issue JWT token.

**Request Body:**
```json
{
  "message": "zesty.studio wants you to sign in with your Ethereum account:\n0x1234...abcd\n\nURI: https://zesty.studio\nVersion: 1\nChain ID: 11155111\nNonce: a1b2c3d4-e5f6-7890-abcd-ef1234567890\nIssued At: 2025-11-03T10:00:00.000Z",
  "signature": "0x1234567890abcdef..."
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clxxx123",
    "address": "0x1234...abcd"
  }
}
```

**Errors:**
- `401 SIWE_VALIDATION_FAILED` - Invalid signature
- `400 INVALID_DOMAIN` - Domain mismatch
- `400 INVALID_NONCE` - Nonce invalid or expired

---

### 3. Get Current User

**GET** `/api/v1/auth/me`

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "clxxx123",
  "address": "0x1234...abcd",
  "farcasterFid": null,
  "farcasterName": null,
  "email": null,
  "inviteCode": "abc123",
  "createdAt": "2025-11-03T10:00:00.000Z",
  "updatedAt": "2025-11-03T10:00:00.000Z"
}
```

**Errors:**
- `401 UNAUTHORIZED` - Missing or invalid token
- `401 TOKEN_EXPIRED` - Token has expired
- `404 USER_NOT_FOUND` - User not found

---

## Authentication Flow

### Client-Side Flow

```typescript
// 1. Request nonce
const { nonce } = await fetch('/api/v1/auth/nonce').then(r => r.json())

// 2. Create SIWE message
const message = new SiweMessage({
  domain: 'zesty.studio',
  address: account,
  statement: 'Sign in to DeGift',
  uri: 'https://zesty.studio',
  version: '1',
  chainId: 11155111,
  nonce,
})

// 3. Sign message with wallet
const signature = await signer.signMessage(message.prepareMessage())

// 4. Verify and get token
const { token, user } = await fetch('/api/v1/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: message.prepareMessage(),
    signature,
  }),
}).then(r => r.json())

// 5. Store token and use in subsequent requests
localStorage.setItem('auth_token', token)

// 6. Use token for authenticated requests
const userData = await fetch('/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(r => r.json())
```

---

## Middleware Usage

### Protect Routes with Authentication

```typescript
import { siweAuthMiddleware } from '../middleware/siwe-auth'

app.get('/api/v1/protected', {
  preHandler: siweAuthMiddleware
}, async (request, reply) => {
  // request.user is automatically injected
  const userId = request.user?.userId
  // ... your logic
})
```

### Optional Authentication

```typescript
import { optionalAuthMiddleware } from '../middleware/siwe-auth'

app.get('/api/v1/optional', {
  preHandler: optionalAuthMiddleware
}, async (request, reply) => {
  // request.user is set if token is valid
  // otherwise, request.user is undefined
  const isAuthenticated = !!request.user
  // ... your logic
})
```

---

## Security Features

### 1. Nonce Management
- Generated using `crypto.randomUUID()`
- 10-minute expiration
- One-time use (deleted after verification)
- Stored in Redis

### 2. JWT Security
- 7-day expiration (configurable)
- Secret from environment variable
- Signed with HS256 algorithm
- Payload: `{ userId, address, iat, exp }`

### 3. SIWE Validation
- Domain verification (if `SIWE_DOMAIN` is set)
- Signature verification using `siwe` library
- Nonce replay prevention
- Message format validation

---

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your_secret_key_here  # Required in production
JWT_EXPIRES_IN=7d                # Optional, default: 7d

# SIWE Configuration
SIWE_DOMAIN=zesty.studio         # Optional, for domain verification
```

---

## TypeScript Types

### JWTPayload
```typescript
interface JWTPayload {
  userId: string
  address: string
  iat?: number
  exp?: number
}
```

### Request Type Extension
```typescript
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload
  }
}
```

---

## Testing

### Manual Testing with cURL

```bash
# 1. Get nonce
curl http://localhost:3001/api/v1/auth/nonce

# 2. Verify signature (replace with actual values)
curl -X POST http://localhost:3001/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "...",
    "signature": "0x..."
  }'

# 3. Get user info
curl http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

### Unit Tests

Run unit tests:
```bash
pnpm test src/services/jwt.service.test.ts
pnpm test src/services/auth.service.test.ts
```

---

## Error Handling

All authentication errors follow a consistent format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {}  // Optional
}
```

**Common Error Codes:**
- `UNAUTHORIZED` - Missing authentication
- `TOKEN_EXPIRED` - JWT token expired
- `INVALID_TOKEN` - Malformed JWT token
- `SIWE_VALIDATION_FAILED` - Invalid SIWE signature
- `INVALID_NONCE` - Nonce not found or expired
- `INVALID_DOMAIN` - Domain mismatch
- `VALIDATION_ERROR` - Request validation failed
- `INTERNAL_ERROR` - Server error

---

## Performance Considerations

### Redis Usage
- Nonces stored with TTL
- Automatic cleanup after expiration
- Memory efficient (UUID + timestamp)

### JWT Verification
- Stateless (no database lookup needed)
- Fast cryptographic verification
- Payload cached in request object

### Recommended Limits
- Rate limit: 10 req/min per IP for `/nonce`
- Rate limit: 5 req/min per IP for `/verify`
- No rate limit for `/me` (protected by JWT)

---

## Migration from Old System

If upgrading from the old auth system at `/api/auth/siwe/*`:

**Old Endpoints:**
- `/api/auth/siwe/nonce`
- `/api/auth/siwe/verify`
- `/api/auth/me`

**New Endpoints:**
- `/api/v1/auth/nonce`
- `/api/v1/auth/verify`
- `/api/v1/auth/me`

**Changes:**
- Moved to versioned API path (`/v1/`)
- Separated into service layer
- Added comprehensive error handling
- Added Fastify schema validation
- Improved type safety

---

## References

- [EIP-4361: Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [SIWE Library](https://github.com/spruceid/siwe)
- [JSON Web Tokens](https://jwt.io/)
- [Fastify Authentication](https://fastify.dev/docs/latest/Guides/Getting-Started/#authentication)

---

**Last Updated:** 2025-11-03
**Version:** 1.0.0
**Author:** DeGift Development Team
