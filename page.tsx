'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [email, setEmail] = useState('')
  const [user, setUser] = useState<any>(null)
  const [rseed, setRseed] = useState(0)
  const [mining, setMining] = useState(false)
  const [canMine, setCanMine] = useState(true)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadUser(session.user.id)
      setLoading(false)
    })
  }, [])

  const loadUser = async (uid: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single()
    if (data) {
      setRseed(data.rseed)
      if (data.last_mined) {
        const diff = Date.now() - new Date(data.last_mined).getTime()
        if (diff < 86400000) setCanMine(false)
      }
    } else {
      await supabase.from('users').insert({ id: uid, rseed: 0 })
    }
  }

  const handleLogin = async () => {
    await supabase.auth.signInWithOtp({ email })
    setSent(true)
  }

  const handleMine = async () => {
    if (!user) return
    setMining(true)
    setMessage('⛏️ マイニング中...')
    await new Promise(r => setTimeout(r, 1500))
    const newBalance = rseed + 0.001
    await supabase.from('users').update({
      rseed: newBalance,
      last_mined: new Date().toISOString()
    }).eq('id', user.id)
    setRseed(newBalance)
    setCanMine(false)
    setMessage('🌱 +0.001 RSEED 獲得！')
    setMining(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <p className="text-gray-400">読み込み中...</p>
    </main>
  )

  if (!user) return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">🌱 RSEED</h1>
      {!sent ? (
        <>
          <input
            type="email"
            placeholder="メールアドレスを入力"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="px-6 py-3 rounded-lg bg-gray-800 text-white w-72"
          />
          <button
            onClick={handleLogin}
            className="px-10 py-4 bg-green-500 rounded-full font-bold"
          >
            ログイン
          </button>
        </>
      ) : (
        <p className="text-green-400">📧 メールを確認してください！</p>
      )}
    </main>
  )

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
        disabled={mining || !canMine}
        className="px-12 py-6 bg-green-500 hover:bg-green-400 disabled:bg-gray-700 rounded-full text-xl font-bold transition-all"
      >
        {mining ? '採掘中...' : canMine ? '⛏️ MINE' : '⏳ 採掘済み'}
      </button>
      {message && <p className="text-green-300 text-lg">{message}</p>}
    </main>
  )
}