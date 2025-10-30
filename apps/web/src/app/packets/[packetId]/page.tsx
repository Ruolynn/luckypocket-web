'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import io from 'socket.io-client'

async function api(url: string, init?: RequestInit) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const res = await fetch(base + url, init)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function PacketDetailPage() {
  const params = useParams<{ packetId: string }>()
  const [packet, setPacket] = useState<any>()
  const [claims, setClaims] = useState<any[]>([])

  useEffect(() => {
    if (!params?.packetId) return
    const pid = params.packetId as string
    ;(async () => {
      const p = await api(`/api/packets/${pid}`)
      setPacket(p.packet)
      const c = await api(`/api/packets/${pid}/claims`)
      setClaims(c.claims)
    })()

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      auth: { token: '' },
    })
    socket.emit('subscribe:packet', pid)
    socket.on('packet:claimed', (evt) => {
      setClaims((prev) => [{ id: crypto.randomUUID(), userId: evt.claimer, amount: evt.amount, claimedAt: new Date().toISOString() }, ...prev])
    })
    return () => {
      socket.emit('unsubscribe:packet', pid)
      socket.disconnect()
    }
  }, [params?.packetId])

  if (!packet) return <main style={{ padding: 24 }}>加载中...</main>

  return (
    <main style={{ padding: 24 }}>
      <h2>红包详情</h2>
      <div>packetId: {packet.packetId}</div>
      <div>剩余份数: {packet.remainingCount}</div>
      <h3>领取记录</h3>
      <ul>
        {claims.map((c) => (
          <li key={c.id}>{c.userId} - {c.amount}</li>
        ))}
      </ul>
    </main>
  )
}


