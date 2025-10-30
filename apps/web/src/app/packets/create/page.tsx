'use client'
import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'

async function api(url: string, init?: RequestInit) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const res = await fetch(base + url, init)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function CreatePacketPage() {
  const { address } = useAccount()
  const [token, setToken] = useState('0xUSDC')
  const [totalAmount, setTotalAmount] = useState('1000000')
  const [count, setCount] = useState(10)
  const [isRandom, setIsRandom] = useState(true)
  const [message, setMessage] = useState('新年快乐!')
  const [expireHours, setExpireHours] = useState(24)
  const [jwt, setJwt] = useState<string>('')
  const { signMessageAsync } = useSignMessage()

  const siweLogin = async () => {
    const { nonce } = await api('/api/auth/siwe/nonce')
    const domain = typeof window !== 'undefined' ? window.location.host : 'localhost'
    const chainId = 11155111
    const message = `localhost wants you to sign in with your Ethereum account:\n${address}\n\nSign in to HongBao dApp\n\nURI: https://${domain}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`
    const signature = await signMessageAsync({ message })
    const { token } = await api('/api/auth/siwe/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, signature }),
    })
    setJwt(token)
  }

  const handleCreate = async () => {
    if (!jwt) await siweLogin()
    const idem = crypto.randomUUID()
    const expire = new Date(Date.now() + expireHours * 3600_000).toISOString()
    const body = {
      packetId: '0x' + crypto.randomUUID().replace(/-/g, '').slice(0, 64),
      txHash: '0x' + crypto.randomUUID().replace(/-/g, '').slice(0, 64),
      token,
      totalAmount,
      count,
      isRandom,
      message,
      expireTime: expire,
    }
    const res = await api('/api/packets/create', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${jwt}`, 'idempotency-key': idem },
      body: JSON.stringify(body),
    })
    alert('创建成功: ' + res.packet.packetId)
  }

  return (
    <main style={{ padding: 24 }}>
      <h2>创建红包</h2>
      <div>
        <label>Token</label>
        <input value={token} onChange={(e) => setToken(e.target.value)} />
      </div>
      <div>
        <label>总金额(最小单位)</label>
        <input value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
      </div>
      <div>
        <label>份数</label>
        <input type="number" value={count} onChange={(e) => setCount(parseInt(e.target.value, 10))} />
      </div>
      <div>
        <label>随机</label>
        <input type="checkbox" checked={isRandom} onChange={(e) => setIsRandom(e.target.checked)} />
      </div>
      <div>
        <label>祝福语</label>
        <input value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <div>
        <label>有效期(小时)</label>
        <input type="number" value={expireHours} onChange={(e) => setExpireHours(parseInt(e.target.value, 10))} />
      </div>
      <button onClick={handleCreate} disabled={!address} style={{ marginTop: 12 }}>提交</button>
    </main>
  )
}


