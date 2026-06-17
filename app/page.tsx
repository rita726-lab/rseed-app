'use client'
import { useState } from 'react'

export default function Home() {
  const [rseed, setRseed] = useState(0)
  const [mining, setMining] = useState(false)
  const [message, setMessage] = useState('')

  const handleMine = async () => {
    setMining(true)
    setMessage('⛏️ マイニング中...')
    await new Promise(r => setTimeout(r, 1500))
    setRseed(prev => prev + 0.001)
    setMessage('🌱 +0.001 RSEED 獲得！')
    setMining(false)
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold tracking-widest">🌱 RSEED</h1>
      <p className="text-gray-400 text-sm">RITATASEED マイニング</p>
      <div className="text-6xl font-mono font-bold text-green-400">
        {rseed.toFixed(4)}
      </div>
      <p className="text-gray-500 text-xs">RSEED</p>
      <button
        onClick={handleMine}
        disabled={mining}
        className="px-12 py-6 bg-green-500 hover:bg-green-400 disabled:bg-gray-700 rounded-full text-xl font-bold transition-all"
      >
        {mining ? '採掘中...' : '⛏️ MINE'}
      </button>
      {message && <p className="text-green-300 text-lg">{message}</p>}
    </main>
  )
}