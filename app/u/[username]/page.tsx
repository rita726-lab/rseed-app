'use client'
import { use, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// page.tsx と同じ称号ロジック（公開ページ用に最小限を再掲）
const TITLE_THRESHOLDS = [
  { name: 'LEGEND', min: 500 },
  { name: 'BLOOM', min: 100 },
  { name: 'SPROUT', min: 10 },
  { name: 'SEED', min: 0 },
]
function getTitle(count: number) {
  for (const t of TITLE_THRESHOLDS) if (count >= t.min) return t.name
  return 'SEED'
}

type PublicUser = { username: string; rseed: number; arigatou_count: number; avatar?: string }

export default function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  const name = decodeURIComponent(username)
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('users').select('username, rseed, arigatou_count, avatar').eq('username', name).maybeSingle()
      setUser(data as PublicUser | null)
      setLoading(false)
    })()
  }, [name])

  const card: React.CSSProperties = { background: '#fff', border: '0.5px solid #c8e8bc', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, textAlign: 'center', boxShadow: '0 2px 16px rgba(58,125,68,0.08)' }
  const wrap: React.CSSProperties = { minHeight: '100vh', background: 'linear-gradient(180deg,#f3faef,#e8f4e0)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'system-ui, sans-serif' }

  if (loading) {
    return <main style={wrap}><div style={{ color: '#8ab88a', fontSize: 14 }}>🌱 読み込み中... / Loading...</div></main>
  }

  if (!user) {
    return (
      <main style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌱</div>
          <div style={{ color: '#3a7d44', fontSize: 15, fontWeight: 500 }}>このユーザーは見つかりませんでした</div>
          <div style={{ color: '#8ab88a', fontSize: 12, marginTop: 4 }}>User not found</div>
          <a href="/" style={{ display: 'inline-block', marginTop: 18, padding: '11px 22px', borderRadius: 30, background: '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>RSEEDを開く →</a>
        </div>
      </main>
    )
  }

  const title = getTitle(user.arigatou_count ?? 0)
  return (
    <main style={wrap}>
      <div style={card}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#edf7e8', border: '0.5px solid #c8e8bc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: user.avatar ? 38 : 24, color: '#3a7d44', fontWeight: 500, margin: '0 auto 14px' }}>
          {user.avatar || (user.username ?? 'U').slice(0, 2).toUpperCase()}
        </div>
        <div style={{ color: '#2d4a2d', fontSize: 20, fontWeight: 600 }}>{user.username}</div>
        <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 14px', borderRadius: 20, background: '#edf7e8', color: '#3a7d44', fontSize: 12, fontWeight: 500 }}>{title}</div>

        <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
          <div style={{ flex: 1, background: '#f7fbf4', borderRadius: 14, padding: '14px 8px' }}>
            <div style={{ color: '#3a7d44', fontSize: 22, fontWeight: 600, fontFamily: 'monospace' }}>💚 {user.arigatou_count ?? 0}</div>
            <div style={{ color: '#8ab88a', fontSize: 11, marginTop: 2 }}>もらったありがとう</div>
          </div>
          <div style={{ flex: 1, background: '#f7fbf4', borderRadius: 14, padding: '14px 8px' }}>
            <div style={{ color: '#3a7d44', fontSize: 22, fontWeight: 600, fontFamily: 'monospace' }}>{(user.rseed ?? 0).toFixed(2)}</div>
            <div style={{ color: '#8ab88a', fontSize: 11, marginTop: 2 }}>RSEED</div>
          </div>
        </div>

        <div style={{ color: '#a0c4a0', fontSize: 11, marginTop: 20 }}>🌱 感謝が価値になる世界、RSEED</div>
        <a href="/" style={{ display: 'inline-block', marginTop: 14, padding: '11px 24px', borderRadius: 30, background: '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 13, textDecoration: 'none' }}>RSEEDを始める →</a>
      </div>
    </main>
  )
}
