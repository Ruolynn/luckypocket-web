'use client'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>HongBao dApp</h1>
      <ConnectButton />
      <div style={{ marginTop: 16 }}>
        <Link href="/packets/create">创建红包</Link>
      </div>
    </main>
  )
}


