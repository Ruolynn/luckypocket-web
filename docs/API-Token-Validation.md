# Token Validation API Documentation

## Overview

The Token Validation API provides endpoints to validate ERC20 tokens, check against blacklists/whitelists, and assess potential risks before using them in gift transactions.

---

## Endpoints

### POST /api/v1/gifts/validate-token

Validate an ERC20 token address for safety and compatibility.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "tokenAddress": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tokenAddress | string | Yes | Ethereum address of the token to validate (must be 40 hex characters with 0x prefix) |

#### Response

**Success (200 OK):**
```json
{
  "isValid": true,
  "isERC20": true,
  "isBlacklisted": false,
  "metadata": {
    "symbol": "USDC",
    "decimals": 6,
    "name": "USD Coin"
  },
  "risks": [],
  "warnings": []
}
```

**Whitelisted Token (200 OK):**
```json
{
  "isValid": true,
  "isERC20": true,
  "isBlacklisted": false,
  "metadata": {
    "symbol": "USDC",
    "decimals": 6,
    "name": "USD Coin"
  },
  "risks": [],
  "warnings": ["此代币在白名单中，已跳过严格检查"]
}
```

**Invalid Token (200 OK):**
```json
{
  "isValid": false,
  "isERC20": false,
  "isBlacklisted": false,
  "metadata": {
    "symbol": null,
    "decimals": null,
    "name": null
  },
  "risks": ["NO_SYMBOL", "NO_DECIMALS"],
  "warnings": [
    "代币缺少 symbol 信息，可能不是标准 ERC20 代币",
    "代币缺少 decimals 信息，可能导致金额计算错误"
  ]
}
```

**Blacklisted Token (200 OK):**
```json
{
  "isValid": false,
  "isERC20": true,
  "isBlacklisted": true,
  "metadata": {
    "symbol": "SCAM",
    "decimals": 18,
    "name": "Scam Token"
  },
  "risks": ["BLACKLISTED"],
  "warnings": ["此代币已被列入黑名单，可能存在风险"]
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid request parameters",
  "details": [
    {
      "code": "invalid_string",
      "path": ["tokenAddress"],
      "message": "Invalid Ethereum address"
    }
  ]
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "error": "INTERNAL_ERROR",
  "message": "Failed to validate token"
}
```

---

## Response Fields

### TokenValidationResult

| Field | Type | Description |
|-------|------|-------------|
| isValid | boolean | Overall validation result. `true` if token passes all checks |
| isERC20 | boolean | Whether the token implements ERC20 interface |
| isBlacklisted | boolean | Whether the token is in the blacklist |
| metadata | object | Token metadata (symbol, decimals, name) |
| metadata.symbol | string \| null | Token symbol (e.g., "USDC") |
| metadata.decimals | number \| null | Token decimals (e.g., 6, 18) |
| metadata.name | string \| null | Token full name (e.g., "USD Coin") |
| risks | string[] | Array of identified risks (see Risk Types below) |
| warnings | string[] | Human-readable warning messages |

### Risk Types

| Risk | Description |
|------|-------------|
| BLACKLISTED | Token is in the blacklist |
| NO_SYMBOL | Token doesn't have a symbol |
| NO_DECIMALS | Token doesn't have decimals defined |
| SUSPICIOUS_NAME | Token name contains suspicious keywords (test, fake, scam, honeypot, rug) |
| ZERO_ADDRESS | Token address is 0x0000...0000 |

---

## Usage in Gift Creation

The token validation is automatically applied when creating a gift with `tokenType: "ERC20"`:

### POST /api/v1/gifts/create

```json
{
  "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "tokenType": "ERC20",
  "tokenAddress": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
  "amount": "100",
  "daysUntilExpiry": 7,
  "message": "Happy Birthday!"
}
```

**If token validation fails:**
```json
{
  "error": "INVALID_TOKEN",
  "message": "Token validation failed",
  "details": {
    "isERC20": true,
    "isBlacklisted": true,
    "risks": ["BLACKLISTED"],
    "warnings": ["此代币已被列入黑名单，可能存在风险"],
    "metadata": {
      "symbol": "SCAM",
      "decimals": 18,
      "name": "Scam Token"
    }
  }
}
```

---

## Configuration

### Environment Variables

Configure token validation behavior in your `.env` file:

```bash
# Token Blacklist (comma-separated addresses, lowercase)
TOKEN_BLACKLIST=0xbad1111111111111111111111111111111111111,0xbad2222222222222222222222222222222222222

# Token Whitelist (known safe tokens that skip strict checks)
# Sepolia USDC, USDT etc.
TOKEN_WHITELIST=0x1c7d4b196cb0c7b01d743fbc6116a902379c7238,0x...
```

### Whitelist

Tokens in the whitelist:
- ✅ Skip strict validation checks
- ✅ Automatically marked as valid
- ✅ Still fetch metadata for display
- ⚠️ Include warning message indicating whitelist status

**Use Case:** Well-known stablecoins, official test tokens

### Blacklist

Tokens in the blacklist:
- ❌ Automatically marked as invalid
- ❌ Cannot be used in gift creation
- ⚠️ Includes risk and warning messages

**Use Case:** Known scam tokens, deprecated tokens, high-risk assets

---

## Integration Examples

### Frontend: Pre-validate Before Gift Creation

```typescript
async function validateTokenBeforeGift(tokenAddress: string) {
  const response = await fetch('/api/v1/gifts/validate-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenAddress })
  });

  const result = await response.json();

  if (!result.isValid) {
    console.warn('Token validation failed:', result.warnings);
    // Show warning to user
    if (result.risks.includes('BLACKLISTED')) {
      alert('This token is blacklisted and cannot be used');
      return false;
    }
  }

  // Show token metadata to user
  console.log(`Token: ${result.metadata.symbol} (${result.metadata.name})`);
  console.log(`Decimals: ${result.metadata.decimals}`);

  return result.isValid;
}
```

### Backend: Runtime Blacklist Management

```typescript
import { getTokenValidationService } from './services/token-validation.service';

const service = getTokenValidationService();

// Add token to blacklist
service.addToBlacklist('0xBAD1111111111111111111111111111111111111');

// Add token to whitelist
service.addToWhitelist('0x1c7d4b196cb0c7b01d743fbc6116a902379c7238');

// Remove from blacklist
service.removeFromBlacklist('0xBAD1111111111111111111111111111111111111');

// Check if blacklisted
const isBlacklisted = service.isBlacklisted('0x...');

// Check if whitelisted
const isWhitelisted = service.isWhitelisted('0x...');
```

### Batch Validation

```typescript
const addresses = [
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
  '0x2c7d4b196cb0c7b01d743fbc6116a902379c7238'
];

const results = await service.validateTokens(addresses);

results.forEach((result, address) => {
  console.log(`${address}: ${result.isValid ? 'Valid' : 'Invalid'}`);
});
```

---

## Security Considerations

### Validation Strategy

1. **Whitelist First**: Trusted tokens bypass strict checks for better UX
2. **Blacklist Check**: Known malicious tokens immediately rejected
3. **ERC20 Compliance**: Verify standard interface implementation
4. **Metadata Validation**: Ensure token has symbol and decimals
5. **Risk Assessment**: Check for suspicious patterns

### Best Practices

1. **Update Blacklist Regularly**: Monitor for new scam tokens
2. **Whitelist Major Tokens**: Add USDC, USDT, DAI for smoother UX
3. **Monitor Warnings**: Log all validation warnings for analysis
4. **Graceful Degradation**: Allow transactions to continue with warnings (non-blocking)
5. **User Education**: Display risk warnings clearly in the UI

### False Positives

Some legitimate tokens may trigger warnings:
- Tokens with "Test" in name (testnet tokens)
- New tokens without extensive metadata
- Non-standard implementations

**Mitigation**: Use whitelist for known safe tokens

---

## Testing

### Unit Tests

Run token validation tests:
```bash
cd apps/api
pnpm test token-validation
```

### Test Coverage

- ✅ Blacklist/Whitelist management
- ✅ ERC20 interface validation
- ✅ Risk assessment
- ✅ Warning generation
- ✅ Batch validation
- ✅ Case-insensitive address handling

### Manual Testing

```bash
# Test with Sepolia USDC
curl -X POST http://localhost:3001/api/v1/gifts/validate-token \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress":"0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"}'

# Test with invalid address
curl -X POST http://localhost:3001/api/v1/gifts/validate-token \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress":"0x0000000000000000000000000000000000000000"}'
```

---

## Changelog

### v1.0.0 (2025-11-07)
- ✅ Initial implementation
- ✅ Blacklist/Whitelist support
- ✅ ERC20 interface validation
- ✅ Risk assessment system
- ✅ Integration with gift creation
- ✅ Unit tests (26 test cases)
- ✅ API documentation

---

## Related

- [Gift API Documentation](./API-Gifts.md)
- [Smart Contract Integration](./Smart-Contract-Integration.md)
- [Security Best Practices](./Security.md)

---

**Last Updated**: 2025-11-07
**Maintained By**: DeGift Team
