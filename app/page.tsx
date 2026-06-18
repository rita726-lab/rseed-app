'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [email, setEmail] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [rseed, setRseed] = useState(0)
  const [mining, setMining] = useState(false)
  const [canMine, setCanMine] = useState(true)
  const [nextMine, setNextMine] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) await loadUser(currentUser.id)
        setLoading(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const loadUser = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('rseed, last_mined')
        .eq('id', uid)
        .single()
      if (error || !data) {
        await supabase.from('users').insert({ id: uid, rseed: 0 })
        return
      }
      setRseed(data.rseed ?? 0)
      if (data.last_mined) {
        const diff = Date.now() - new Date(data.last_mined).getTime()
        if (diff < 86400000) {
          setCanMine(false)
          const remaining = 86400000 - diff
          const hours = Math.floor(remaining / 3600000)
          const mins = Math.floor((remaining % 3600000) / 60000)
          setNextMine(`${hours}時間${mins}分後`)
        } else {
          setCanMine(true)
          setNextMine('')
        }
      }
    } catch (e) {
      console.error('loadUser error:', e)
    }
  }

  const handleLogin = async () => {
    setMessage('')
    const trimmed = email.trim()
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      setMessage('メールアドレスが正しくありません')
      return
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: trimmed })
      if (error) throw error
      setSent(true)
    } catch (e) {
      setMessage('送信に失敗しました。もう一度お試しください')
    }
  }

  const handleMine = async () => {
    if (!user || !canMine) return
    setMessage('')
    setMining(true)
    setMessage('⛏️ マイニング中...')
    try {
      await new Promise(r => setTimeout(r, 1500))
      const newBalance = rseed + 0.001
      const { error } = await supabase.from('users').upsert({
        id: user.id,
        rseed: newBalance,
        last_mined: new Date().toISOString()
      })
      if (error) throw error
      setRseed(newBalance)
      setCanMine(false)
      setNextMine('24時間後')
      setMessage('🌱 +0.001 RSEED 獲得！')
    } catch (e) {
      setMessage('エラーが発生しました')
    }
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
          {message && <p className="text-red-400 text-sm">{message}</p>}
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
      {!canMine && nextMine && (
        <p className="text-gray-400 text-sm">次のマイニング：{nextMine}</p>
      )}
      {message && <p className="text-green-300 text-lg">{message}</p>}
    </main>
  )
}cd ~/rseed-app && git add . && git commit -m "improve login and mining" && git push https://rita726-lab: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@github.com/rita726-lab/rseed-app.git main