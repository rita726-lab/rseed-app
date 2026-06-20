'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Tab = 'home' | 'ranking' | 'arigatou' | 'nft' | 'profile' | 'wallet' | 'kuji'

type RankUser = {
  id: string
  username: string
  rseed: number
  arigatou_count: number
}

type HistoryItem = {
  type: 'mine' | 'arigatou_sent' | 'arigatou_received'
  amount: number
  created_at: string
  from_username?: string
  to_username?: string
}

const TITLE_THRESHOLDS = [
  { name: 'LEGEND', min: 500 },
  { name: 'BLOOM', min: 100 },
  { name: 'SPROUT', min: 10 },
  { name: 'SEED', min: 0 },
]
const TITLE_ORDER = ['SEED', 'SPROUT', 'BLOOM', 'LEGEND']

const NFT_LIST = [
  { id: 'genesis', name: 'Genesis Seed', sub: '初期コラボ限定', tag: 'LEGEND限定', requiredTitle: 'LEGEND', color: '#edf7e8', icon: '🌳' },
  { id: 'bloom', name: 'First Bloom', sub: 'ありがとう100回達成', tag: 'BLOOM到達', requiredTitle: 'BLOOM', color: '#e4f4dc', icon: '🌸' },
  { id: 'warm', name: 'Warm Thanks', sub: '感謝送信50回', tag: 'コミュニティ', requiredTitle: 'SPROUT', color: '#f0f9ea', icon: '🌿' },
  { id: 'seed', name: 'First Seed', sub: '初回マイニング記念', tag: 'SEED', requiredTitle: 'SEED', color: '#f7fbf4', icon: '🌱' },
]

function getTitle(count: number) {
  for (const t of TITLE_THRESHOLDS) if (count >= t.min) return t.name
  return 'SEED'
}

function getNextTitle(current: string) {
  const idx = TITLE_ORDER.indexOf(current)
  return TITLE_ORDER[idx + 1] ?? null
}

function getNextThreshold(current: string) {
  const next = getNextTitle(current)
  if (!next) return null
  return TITLE_THRESHOLDS.find(t => t.name === next)?.min ?? null
}

function isNftUnlocked(nft: typeof NFT_LIST[0], userTitle: string) {
  return TITLE_ORDER.indexOf(userTitle) >= TITLE_ORDER.indexOf(nft.requiredTitle)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'さっき'
  if (h < 24) return `${h}時間前`
  return `${Math.floor(h / 24)}日前`
}

function Tree({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={{ opacity: 0.13, pointerEvents: 'none', ...style }} width="70" height="90" viewBox="0 0 80 100">
      <rect x="34" y="60" width="12" height="40" fill="#3a7d44" />
      <ellipse cx="40" cy="48" rx="28" ry="32" fill="#5a9e5a" />
      <ellipse cx="40" cy="30" rx="20" ry="24" fill="#3a7d44" />
      <ellipse cx="40" cy="16" rx="14" ry="18" fill="#6ab86a" />
    </svg>
  )
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('home')
  const [email, setEmail] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [rseed, setRseed] = useState(0)
  const [arigatouCount, setArigatouCount] = useState(0)
  const [mining, setMining] = useState(false)
  const [accumulatedHours, setAccumulatedHours] = useState(0)
  const [accumulatedRseed, setAccumulatedRseed] = useState(0)
  const [sent, setSent] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(true)
  const [ranking, setRanking] = useState<RankUser[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [arigatouTarget, setArigatouTarget] = useState('')
  const [arigatouAmount, setArigatouAmount] = useState(1)
  const [sendingArigatou, setSendingArigatou] = useState(false)
  const [toast, setToast] = useState('')
  const [walletFilter, setWalletFilter] = useState<'all' | 'mine' | 'sent' | 'received'>('all')
  const [kujiAmount, setKujiAmount] = useState('0.01')
  const [kujiResult, setKujiResult] = useState<null | { type: 'big' | 'mid' | 'miss'; payout: number; bet: number }>(null)
  const [kujiPlaying, setKujiPlaying] = useState(false)

  const userTitle = getTitle(arigatouCount)
  const nextTitle = getNextTitle(userTitle)
  const nextThreshold = getNextThreshold(userTitle)
  const progress = nextThreshold ? Math.min((arigatouCount / nextThreshold) * 100, 100) : 100

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) { await loadUser(u.id); await loadRanking() }
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const calcAccumulated = (lastMined: string | null) => {
    if (!lastMined) return { hours: 24, rseed: 0.024 }
    const diff = Date.now() - new Date(lastMined).getTime()
    const hours = Math.min(Math.floor(diff / 3600000), 24)
    return { hours, rseed: hours * 0.001 }
  }

  const loadUser = async (uid: string) => {
    const { data, error } = await supabase.from('users').select('rseed, last_mined, arigatou_count').eq('id', uid).single()
    if (error || !data) { await supabase.from('users').insert({ id: uid, rseed: 0, arigatou_count: 0 }); return }
    setRseed(data.rseed ?? 0)
    setArigatouCount(data.arigatou_count ?? 0)
    const { hours, rseed: acc } = calcAccumulated(data.last_mined)
    setAccumulatedHours(hours)
    setAccumulatedRseed(acc)
    const { data: hist } = await supabase.from('history').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(10)
    setHistory(hist ?? [])
  }

  const loadRanking = async () => {
    const { data } = await supabase.from('users').select('id, username, rseed, arigatou_count').order('rseed', { ascending: false }).limit(10)
    setRanking(data ?? [])
  }

  const handleLogin = async () => {
    setLoginError('')
    const trimmed = email.trim()
    if (!trimmed.includes('@')) { setLoginError('メールアドレスが正しくありません'); return }
    const { error } = await supabase.auth.signInWithOtp({ email: trimmed })
    if (error) { setLoginError('送信に失敗しました'); return }
    setSent(true)
  }

  const handleMine = async () => {
    if (!user || accumulatedRseed <= 0 || mining) return
    setMining(true)
    await new Promise(r => setTimeout(r, 1200))
    const earned = accumulatedRseed
    const newBalance = rseed + earned
    const { error } = await supabase.from('users').upsert({ id: user.id, rseed: newBalance, last_mined: new Date().toISOString() })
    if (!error) {
      await supabase.from('history').insert({ user_id: user.id, type: 'mine', amount: earned })
      setRseed(newBalance)
      setAccumulatedHours(0)
      setAccumulatedRseed(0)
      showToast(`🌱 +${earned.toFixed(3)} RSEED 獲得！`)
      await loadRanking()
    }
    setMining(false)
  }

  const handleSendArigatou = async () => {
    if (!user || !arigatouTarget.trim() || sendingArigatou) return
    setSendingArigatou(true)
    const { data: target } = await supabase.from('users').select('id, rseed, arigatou_count').eq('username', arigatouTarget.trim()).single()
    if (!target) { showToast('ユーザーが見つかりません'); setSendingArigatou(false); return }
    const cost = arigatouAmount * 0.01
    if (rseed < cost) { showToast('RSEEDが足りません'); setSendingArigatou(false); return }
    await supabase.from('users').update({ rseed: rseed - cost }).eq('id', user.id)
    await supabase.from('users').update({ rseed: target.rseed + arigatouAmount * 0.005, arigatou_count: (target.arigatou_count ?? 0) + 1 }).eq('id', target.id)
    await supabase.from('history').insert([
      { user_id: user.id, type: 'arigatou_sent', amount: cost },
      { user_id: target.id, type: 'arigatou_received', amount: arigatouAmount * 0.005 },
    ])
    setRseed(r => r - cost)
    setArigatouTarget('')
    showToast('💚 ありがとうを送ったよ！')
    setSendingArigatou(false)
  }

  const handleKuji = async () => {
    if (!user || kujiPlaying) return
    const bet = parseFloat(kujiAmount)
    if (isNaN(bet) || bet < 0.001 || bet > 10) { showToast('0.001〜10 RSEEDで入力してね'); return }
    if (rseed < bet) { showToast('RSEEDが足りない！'); return }
    setKujiPlaying(true)
    setKujiResult(null)
    await new Promise(r => setTimeout(r, 1800))
    const rand = Math.random()
    let type: 'big' | 'mid' | 'miss'
    let payout: number
    if (rand < 0.01) { type = 'big'; payout = bet * 100 }
    else if (rand < 0.10) { type = 'mid'; payout = bet * 10 }
    else { type = 'miss'; payout = bet * 0.1 }
    const diff = payout - bet
    const newBalance = rseed + diff
    await supabase.from('users').update({ rseed: newBalance }).eq('id', user.id)
    await supabase.from('history').insert({ user_id: user.id, type: diff >= 0 ? 'arigatou_received' : 'arigatou_sent', amount: Math.abs(diff) })
    setRseed(newBalance)
    setKujiResult({ type, payout, bet })
    setKujiPlaying(false)
  }

  const G = { background: '#f7fbf4' }
  const W = { background: '#fff' }
  const borderGreen = '0.5px solid #d4eacc'
  const textPrimary = { color: '#2d4a2d' }
  const textMuted = { color: '#8ab88a' }
  const textGreen = { color: '#3a7d44' }
  const pill = { background: '#edf7e8', border: '0.5px solid #c8e8bc', borderRadius: 10, padding: '1px 7px', fontSize: 10, ...textGreen, display: 'inline-block' }

  if (loading) return <main style={{ minHeight: '100vh', ...G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={textMuted}>読み込み中...</p></main>

  if (!user) return (
    <main style={{ minHeight: '100vh', ...G, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: 4, ...textGreen }}>RSEED</div>
        <div style={{ fontSize: 11, ...textMuted, letterSpacing: 2, marginTop: 2 }}>RITATASEED</div>
      </div>
      {!sent ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300 }}>
          <input type="email" placeholder="メールアドレスを入力" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ padding: '12px 16px', borderRadius: 12, border: borderGreen, ...W, ...textPrimary, fontSize: 14, outline: 'none', width: '100%' }} />
          <button onClick={handleLogin} style={{ padding: '13px 0', borderRadius: 30, background: '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            ログイン / 登録
          </button>
          {loginError && <p style={{ color: '#e24b4a', fontSize: 12, textAlign: 'center' }}>{loginError}</p>}
        </div>
      ) : (
        <p style={{ ...textGreen, fontSize: 14, textAlign: 'center' }}>📧 メールを確認してリンクをタップしてね</p>
      )}
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', ...G, maxWidth: 420, margin: '0 auto', position: 'relative', paddingBottom: 75 }}>

      {toast && (
        <div style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', background: '#3a7d44', color: '#fff', fontSize: 13, padding: '8px 20px', borderRadius: 20, zIndex: 100, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      <div style={{ ...W, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #e0f0d8' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: 4, ...textGreen }}>RSEED</div>
          <div style={{ fontSize: 10, ...textMuted, letterSpacing: 1 }}>RITATASEED</div>
        </div>
        <div style={{ background: '#edf7e8', border: '0.5px solid #c8e8bc', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🔔</div>
      </div>

      {tab === 'home' && (
        <>
          <div style={{ ...W, padding: '24px 20px 18px', textAlign: 'center', borderBottom: '0.5px solid #e0f0d8', position: 'relative', overflow: 'hidden' }}>
            <Tree style={{ position: 'absolute', left: -8, bottom: 0 }} />
            <Tree style={{ position: 'absolute', right: -8, bottom: 0 }} />
            <div style={{ ...pill, marginBottom: 12, position: 'relative', zIndex: 1, fontSize: 11, padding: '3px 14px' }}>{userTitle} ✦</div>
            <div style={{ fontSize: 42, fontWeight: 500, color: '#2d6636', letterSpacing: 1, position: 'relative', zIndex: 1 }}>{rseed.toFixed(4)}</div>
            <div style={{ fontSize: 12, ...textMuted, marginTop: 2, position: 'relative', zIndex: 1 }}>RSEED</div>
            <div style={{ background: '#f0f9ea', border: '0.5px solid #c8e8bc', borderRadius: 14, padding: '12px 16px', marginTop: 14, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ ...textMuted, fontSize: 11 }}>溜まってるRSEED</div>
                  <div style={{ color: '#2d6636', fontSize: 22, fontWeight: 500, marginTop: 2 }}>+{accumulatedRseed.toFixed(3)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...textMuted, fontSize: 11 }}>経過時間</div>
                  <div style={{ ...textGreen, fontSize: 22, fontWeight: 500, marginTop: 2 }}>{accumulatedHours}h / 24h</div>
                </div>
              </div>
              <div style={{ background: '#d4eacc', borderRadius: 4, height: 5, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ background: '#3a7d44', height: '100%', width: `${(accumulatedHours / 24) * 100}%`, borderRadius: 4 }} />
              </div>
            </div>
            <button onClick={handleMine} disabled={mining || accumulatedRseed <= 0}
              style={{ display: 'block', width: '100%', marginTop: 10, padding: '14px 0', borderRadius: 30, background: accumulatedRseed > 0 ? '#3a7d44' : '#c8e8bc', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: accumulatedRseed > 0 ? 'pointer' : 'default', position: 'relative', zIndex: 1 }}>
              {mining ? '受け取り中...' : accumulatedRseed > 0 ? `⛏️ ${accumulatedRseed.toFixed(3)} RSEEDを受け取る` : '⏳ 溜まるのを待ってね'}
            </button>
            <button onClick={() => setTab('arigatou')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 30, background: '#edf7e8', ...textGreen, fontSize: 13, border: '0.5px solid #b8dda8', cursor: 'pointer', position: 'relative', zIndex: 1 }}>
              💚 ありがとうを送る
            </button>
          </div>
          <div style={{ padding: '14px 16px', ...G, borderBottom: '0.5px solid #e8f4e0' }}>
            <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 10, fontWeight: 500 }}>RECENT HISTORY</div>
            {history.length === 0 && <div style={{ color: '#b8dda8', fontSize: 13 }}>まだ履歴がないよ</div>}
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < history.length - 1 ? '0.5px solid #e8f4e0' : 'none' }}>
                <div>
                  <div style={{ ...textPrimary, fontSize: 13 }}>
                    {h.type === 'mine' ? '⛏️ マイニング' : h.type === 'arigatou_sent' ? '💚 ありがとう送信' : '🌱 ありがとう受け取り'}
                  </div>
                  <div style={{ ...textMuted, fontSize: 11 }}>{timeAgo(h.created_at)}</div>
                </div>
                <div style={{ ...textGreen, fontSize: 12, fontFamily: 'monospace' }}>
                  {h.type === 'arigatou_sent' ? '-' : '+'}{h.amount.toFixed(4)} RSEED
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'ranking' && (
        <div style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
          <Tree style={{ position: 'absolute', right: -8, top: 10 }} />
          <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 12, fontWeight: 500 }}>RANKING</div>
          {ranking.map((u, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid #e8f4e0' }}>
              <div style={{ color: '#b8dda8', fontSize: 13, width: 20, textAlign: 'center' }}>{i + 1}</div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#edf7e8', border: '0.5px solid #c8e8bc', display: 'flex', alignItems: 'center', justifyContent: 'center', ...textGreen, fontSize: 12, fontWeight: 500 }}>
                {(u.username ?? 'U').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...textPrimary, fontSize: 13 }}>{u.username ?? '匿名'}</div>
                <div style={pill}>{getTitle(u.arigatou_count ?? 0)}</div>
              </div>
              <div style={{ ...textGreen, fontSize: 12, fontFamily: 'monospace' }}>{u.rseed.toFixed(3)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'arigatou' && (
        <div style={{ padding: '20px 16px' }}>
          <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 16, fontWeight: 500 }}>SEND ARIGATOU</div>
          <div style={{ ...W, border: borderGreen, borderRadius: 16, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ ...textMuted, fontSize: 11, marginBottom: 6 }}>送る相手のユーザー名</div>
              <input type="text" placeholder="username" value={arigatouTarget} onChange={e => setArigatouTarget(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '0.5px solid #c8e8bc', ...G, ...textPrimary, fontSize: 14, outline: 'none' }} />
            </div>
            <div>
              <div style={{ ...textMuted, fontSize: 11, marginBottom: 6 }}>量（1 = 0.01 RSEED消費）</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 5, 10, 50].map(n => (
                  <button key={n} onClick={() => setArigatouAmount(n)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 20, background: arigatouAmount === n ? '#3a7d44' : '#edf7e8', color: arigatouAmount === n ? '#fff' : '#3a7d44', border: '0.5px solid #b8dda8', fontSize: 13, cursor: 'pointer' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ color: '#a0c4a0', fontSize: 11, textAlign: 'center' }}>
              消費：{(arigatouAmount * 0.01).toFixed(3)} RSEED　／　残高：{rseed.toFixed(4)} RSEED
            </div>
            <button onClick={handleSendArigatou} disabled={sendingArigatou || !arigatouTarget.trim()}
              style={{ padding: '13px 0', borderRadius: 30, background: '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer', opacity: sendingArigatou || !arigatouTarget.trim() ? 0.5 : 1 }}>
              💚 ありがとうを送る
            </button>
          </div>
        </div>
      )}

      {tab === 'nft' && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 12, fontWeight: 500 }}>NFT GALLERY</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {NFT_LIST.map(nft => {
              const unlocked = isNftUnlocked(nft, userTitle)
              return (
                <div key={nft.id} style={{ ...W, border: unlocked ? borderGreen : '0.5px dashed #c8e8bc', borderRadius: 14, overflow: 'hidden', opacity: unlocked ? 1 : 0.6 }}>
                  <div style={{ height: 100, background: nft.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, position: 'relative' }}>
                    {nft.icon}
                    {!unlocked && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(247,251,244,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🔒</div>
                    )}
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ ...textPrimary, fontSize: 12, fontWeight: 500 }}>{nft.name}</div>
                    <div style={{ ...textMuted, fontSize: 10, marginTop: 1 }}>{nft.sub}</div>
                    <div style={{ ...pill, marginTop: 5 }}>{nft.tag}</div>
                    {!unlocked && <div style={{ color: '#b8dda8', fontSize: 10, marginTop: 4 }}>{nft.requiredTitle}で解放</div>}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 14, padding: '12px 14px', background: '#edf7e8', borderRadius: 12, border: '0.5px solid #c8e8bc' }}>
            <div style={{ ...textGreen, fontSize: 12, fontWeight: 500 }}>NFT画像は制作中</div>
            <div style={{ ...textMuted, fontSize: 11, marginTop: 4 }}>AI生成＋デザイナーコラボで制作中。お楽しみに！</div>
          </div>
        </div>
      )}

      {tab === 'wallet' && (
        <div>
          <div style={{ ...W, padding: '20px 20px 16px', borderBottom: '0.5px solid #e0f0d8', textAlign: 'center' }}>
            <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 }}>WALLET BALANCE</div>
            <div style={{ fontSize: 44, fontWeight: 500, color: '#2d6636' }}>{rseed.toFixed(4)}</div>
            <div style={{ ...textMuted, fontSize: 12, marginTop: 2 }}>RSEED</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <div style={{ flex: 1, background: '#f0f9ea', border: '0.5px solid #d4eacc', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ ...textMuted, fontSize: 10, marginBottom: 3 }}>受け取り総額</div>
                <div style={{ color: '#2d6636', fontSize: 16, fontWeight: 500 }}>+{history.filter(h => h.type !== 'arigatou_sent').reduce((s, h) => s + h.amount, 0).toFixed(3)}</div>
                <div style={{ color: '#a0c4a0', fontSize: 10 }}>RSEED</div>
              </div>
              <div style={{ flex: 1, background: '#f0f9ea', border: '0.5px solid #d4eacc', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ ...textMuted, fontSize: 10, marginBottom: 3 }}>送った総額</div>
                <div style={{ color: '#e24b4a', fontSize: 16, fontWeight: 500 }}>-{history.filter(h => h.type === 'arigatou_sent').reduce((s, h) => s + h.amount, 0).toFixed(3)}</div>
                <div style={{ color: '#a0c4a0', fontSize: 10 }}>RSEED</div>
              </div>
            </div>
            <button onClick={() => setTab('arigatou')}
              style={{ display: 'block', width: '100%', marginTop: 12, padding: '13px 0', borderRadius: 30, background: '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              💚 ありがとうを送る
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px', background: '#f7fbf4', borderBottom: '0.5px solid #e8f4e0' }}>
            {([['all', 'すべて'], ['received', 'もらった'], ['sent', '送った'], ['mine', 'マイニング']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setWalletFilter(val)}
                style={{ flex: 1, padding: '6px 0', borderRadius: 20, fontSize: 10, border: '0.5px solid #c8e8bc', cursor: 'pointer', background: walletFilter === val ? '#3a7d44' : '#fff', color: walletFilter === val ? '#fff' : '#8ab88a' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ ...W }}>
            {history.filter(h => {
              if (walletFilter === 'all') return true
              if (walletFilter === 'mine') return h.type === 'mine'
              if (walletFilter === 'sent') return h.type === 'arigatou_sent'
              return h.type === 'arigatou_received'
            }).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: '0.5px solid #f0f7ec' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: h.type === 'arigatou_sent' ? '#fff0f0' : '#edf7e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {h.type === 'mine' ? '⛏️' : h.type === 'arigatou_sent' ? '💸' : '💚'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...textPrimary, fontSize: 13, fontWeight: 500 }}>
                    {h.type === 'mine' ? 'マイニング' : h.type === 'arigatou_sent' ? 'ありがとう送信' : 'ありがとう受け取り'}
                  </div>
                  <div style={{ color: '#a0c4a0', fontSize: 10, marginTop: 1 }}>{timeAgo(h.created_at)}</div>
                </div>
                <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 500, color: h.type === 'arigatou_sent' ? '#e24b4a' : '#3a7d44' }}>
                  {h.type === 'arigatou_sent' ? '-' : '+'}{h.amount.toFixed(3)}
                </div>
              </div>
            ))}
            {history.filter(h => walletFilter === 'all' || (walletFilter === 'mine' && h.type === 'mine') || (walletFilter === 'sent' && h.type === 'arigatou_sent') || (walletFilter === 'received' && h.type === 'arigatou_received')).length === 0 && (
              <div style={{ padding: '20px 16px', ...textMuted, fontSize: 13 }}>履歴がないよ</div>
            )}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 12, fontWeight: 500 }}>PROFILE</div>
          <div style={{ ...W, border: borderGreen, borderRadius: 16, padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#edf7e8', border: '0.5px solid #b8dda8', display: 'flex', alignItems: 'center', justifyContent: 'center', ...textGreen, fontSize: 14, fontWeight: 500 }}>
                {user.email?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ ...textPrimary, fontSize: 14, fontWeight: 500 }}>{user.email}</div>
                <div style={{ ...textGreen, fontSize: 11, marginTop: 2 }}>{userTitle} ✦ ありがとう累計 {arigatouCount}回</div>
              </div>
            </div>
            <div style={{ borderTop: '0.5px solid #e8f4e0', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
                {[
                  { label: 'RSEED残高', value: rseed.toFixed(3) },
                  { label: 'ありがとう数', value: arigatouCount },
                  { label: 'NFT保有', value: NFT_LIST.filter(n => isNftUnlocked(n, userTitle)).length },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ color: '#2d6636', fontSize: 22, fontWeight: 500 }}>{s.value}</div>
                    <div style={{ ...textMuted, fontSize: 10 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {nextTitle && (
                <>
                  <div style={{ color: '#a0c4a0', fontSize: 11, marginBottom: 5 }}>次の称号まで（{nextTitle}）</div>
                  <div style={{ background: '#e8f4e0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ background: '#3a7d44', height: '100%', width: `${progress}%`, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                    <span style={{ color: '#a0c4a0', fontSize: 10 }}>{arigatouCount} / {nextThreshold} ありがとう</span>
                    <span style={{ color: '#a0c4a0', fontSize: 10 }}>{Math.round(progress)}%</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()}
            style={{ width: '100%', marginTop: 14, padding: '12px 0', borderRadius: 30, ...W, ...textMuted, border: '0.5px solid #c8e8bc', fontSize: 13, cursor: 'pointer' }}>
            ログアウト
          </button>
        </div>
      )}

      {tab === 'kuji' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 20, fontWeight: 500 }}>ARIGATOU KUJI</div>
          <div style={{ ...W, border: borderGreen, borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎋</div>
            <div style={{ ...textPrimary, fontSize: 14, fontWeight: 500, marginBottom: 4 }}>ありがとうくじ</div>
            <div style={{ ...textMuted, fontSize: 11, marginBottom: 20, lineHeight: 1.6 }}>
              大当たり 1%（100倍）/ 中当たり 9%（10倍）<br/>ハズレ 90%（10%返還）
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...textMuted, fontSize: 11, marginBottom: 8 }}>賭けるRSEED（0.001〜10）</div>
              <input
                type="number" value={kujiAmount} onChange={e => setKujiAmount(e.target.value)}
                min="0.001" max="10" step="0.001"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '0.5px solid #c8e8bc', background: '#f7fbf4', color: '#2d4a2d', fontSize: 18, textAlign: 'center', outline: 'none', fontWeight: 500 }}
              />
              <div style={{ ...textMuted, fontSize: 11, marginTop: 6 }}>残高：{rseed.toFixed(4)} RSEED</div>
            </div>
            <button onClick={handleKuji} disabled={kujiPlaying}
              style={{ width: '100%', padding: '16px 0', borderRadius: 30, background: kujiPlaying ? '#c8e8bc' : '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 16, border: 'none', cursor: kujiPlaying ? 'default' : 'pointer' }}>
              {kujiPlaying ? '🎋 引いてる...' : '🎋 くじを引く'}
            </button>
          </div>

          {kujiResult && (
            <div style={{ marginTop: 16, ...W, border: kujiResult.type === 'big' ? '2px solid #f0c040' : kujiResult.type === 'mid' ? '1px solid #b8dda8' : borderGreen, borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>
                {kujiResult.type === 'big' ? '🎉' : kujiResult.type === 'mid' ? '✨' : '🌱'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 500, color: kujiResult.type === 'big' ? '#b8860b' : kujiResult.type === 'mid' ? '#3a7d44' : '#8ab88a', marginBottom: 4 }}>
                {kujiResult.type === 'big' ? '大当たり！！！' : kujiResult.type === 'mid' ? '中当たり！' : 'ハズレ...'}
              </div>
              <div style={{ color: '#2d6636', fontSize: 28, fontWeight: 500 }}>
                {kujiResult.payout >= kujiResult.bet ? '+' : ''}{(kujiResult.payout - kujiResult.bet).toFixed(4)} RSEED
              </div>
              <div style={{ ...textMuted, fontSize: 11, marginTop: 4 }}>
                {kujiResult.payout.toFixed(4)} RSEED 獲得
              </div>
              <button onClick={() => setKujiResult(null)}
                style={{ marginTop: 14, padding: '10px 28px', borderRadius: 30, background: '#edf7e8', color: '#3a7d44', border: '0.5px solid #b8dda8', fontSize: 13, cursor: 'pointer' }}>
                もう一回
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, ...W, borderTop: '0.5px solid #e0f0d8', padding: '10px 0 20px', display: 'flex', justifyContent: 'space-around', zIndex: 50 }}>
        {([
          { id: 'home', icon: '🏠', label: 'ホーム' },
          { id: 'ranking', icon: '🏆', label: 'ランク' },
          { id: 'kuji', icon: '🎋', label: 'くじ' },
          { id: 'nft', icon: '🖼️', label: 'NFT' },
          { id: 'profile', icon: '👤', label: 'プロフィール' },
        ] as { id: Tab; icon: string; label: string }[]).map(({ id, icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', color: tab === id ? '#3a7d44' : '#b8dda8', fontSize: 10 }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </main>
  )
}
