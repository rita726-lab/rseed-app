'use client'
import { useState, useEffect, useRef } from 'react'
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
  avatar?: string
}

type HistoryItem = {
  type: 'mine' | 'arigatou_sent' | 'arigatou_received' | 'daily'
  amount: number
  created_at: string
  from_username?: string
  to_username?: string
  message?: string
}

const TITLE_THRESHOLDS = [
  { name: 'LEGEND', min: 500 },
  { name: 'BLOOM', min: 100 },
  { name: 'SPROUT', min: 10 },
  { name: 'SEED', min: 0 },
]
const TITLE_ORDER = ['SEED', 'SPROUT', 'BLOOM', 'LEGEND']

const DISCORD_INVITE = 'https://discord.gg/VkPnNunw'
const AVATAR_CHOICES = ['🌱', '🌿', '🌸', '🌳', '🍀', '🌻', '🐰', '🐿️', '🦊', '🐸', '🦋', '🐝']
const DAILY_AMOUNT = 0.005
const MAX_SUPPLY = 20_000_000
const TREASURY_ID = '00000000-0000-0000-0000-000000000000'
const DISTRIBUTE_THRESHOLD = 10

type BadgeStats = { rseed: number; arigatouCount: number; nftCount: number; mined: boolean }
const BADGES = [
  { id: 'miner', icon: '⛏️', name: { ja: 'マイナー', en: 'Miner' }, desc: { ja: '初めてマイニングした', en: 'Mined for the first time' }, earned: (s: BadgeStats) => s.mined || s.rseed > 0 },
  { id: 'loved', icon: '💚', name: { ja: '愛されはじめ', en: 'First Love' }, desc: { ja: '初めてありがとうをもらった', en: 'Received your first arigatou' }, earned: (s: BadgeStats) => s.arigatouCount >= 1 },
  { id: 'sprout', icon: '🌿', name: { ja: 'スプラウト', en: 'Sprout' }, desc: { ja: '称号SPROUT到達', en: 'Reached SPROUT' }, earned: (s: BadgeStats) => s.arigatouCount >= 10 },
  { id: 'bloom', icon: '🌸', name: { ja: 'ブルーム', en: 'Bloom' }, desc: { ja: '称号BLOOM到達', en: 'Reached BLOOM' }, earned: (s: BadgeStats) => s.arigatouCount >= 100 },
  { id: 'legend', icon: '🌳', name: { ja: 'レジェンド', en: 'Legend' }, desc: { ja: '称号LEGEND到達', en: 'Reached LEGEND' }, earned: (s: BadgeStats) => s.arigatouCount >= 500 },
  { id: 'collector', icon: '🖼️', name: { ja: 'コレクター', en: 'Collector' }, desc: { ja: 'NFTを2つ以上解放', en: 'Unlocked 2+ NFTs' }, earned: (s: BadgeStats) => s.nftCount >= 2 },
]
const NOTE_TUTORIAL_URL = 'https://note.com/aoki722' // チュートリアル記事ができたら個別記事URLに差し替え可

type Lang = 'ja' | 'en'

const TUTORIAL_STEPS = [
  { icon: '🌱', title: { ja: 'RSEEDってなに？', en: 'What is RSEED?' }, body: { ja: '「ありがとう」に価値を持たせる経済圏。感謝を送り合うほど、みんなのRSEEDが育つよ。', en: 'A gratitude economy where "thank you" has value. The more thanks you exchange, the more everyone\'s RSEED grows.' } },
  { icon: '⛏️', title: { ja: 'まずはマイニング', en: 'Start mining' }, body: { ja: 'ホーム画面で1時間ごとにRSEEDが貯まる（24時間で満タン）。「受け取る」を押して獲得しよう。', en: 'RSEED accumulates every hour on the home screen (full in 24h). Tap "Claim" to collect it.' } },
  { icon: '💚', title: { ja: 'ありがとうを送る', en: 'Send arigatou' }, body: { ja: '相手のユーザー名を入れてありがとうを送ると、相手のRSEEDと称号が上がるよ。', en: 'Enter someone\'s username and send arigatou to boost their RSEED and rank.' } },
  { icon: '🖼️', title: { ja: '称号とNFT', en: 'Ranks & NFTs' }, body: { ja: 'ありがとうを集めるとSEED→SPROUT→BLOOM→LEGENDと称号アップ。新しいNFTも解放される。', en: 'Collect arigatou to rank up SEED→SPROUT→BLOOM→LEGEND and unlock new NFTs.' } },
]

const NFT_LIST = [
  { id: 'genesis', name: 'Genesis Seed', sub: { ja: '初期コラボ限定', en: 'Early collab exclusive' }, tag: { ja: 'LEGEND限定', en: 'LEGEND only' }, requiredTitle: 'LEGEND', color: '#edf7e8', icon: '🌳', image: '/nft/genesis.jpg' },
  { id: 'bloom', name: 'First Bloom', sub: { ja: 'ありがとう100回達成', en: '100 arigatou reached' }, tag: { ja: 'BLOOM到達', en: 'Reach BLOOM' }, requiredTitle: 'BLOOM', color: '#e4f4dc', icon: '🌸', image: '/nft/bloom.jpg' },
  { id: 'warm', name: 'Warm Thanks', sub: { ja: '感謝送信50回', en: '50 thanks sent' }, tag: { ja: 'コミュニティ', en: 'Community' }, requiredTitle: 'SPROUT', color: '#f0f9ea', icon: '🌿', image: '/nft/sprout.jpg' },
  { id: 'seed', name: 'First Seed', sub: { ja: '初回マイニング記念', en: 'First mining memento' }, tag: { ja: 'SEED', en: 'SEED' }, requiredTitle: 'SEED', color: '#f7fbf4', icon: '🌱', image: '/nft/seed.jpg' },
]

const STR = {
  ja: {
    loading: '読み込み中...', mailSent: 'メールを送りました！', mailSentDesc: '届いたメールのリンクをタップするとログインできるよ🌱', tryAnother: '別のメールで試す',
    enterEmail: 'メールアドレスを入力するとログインリンクが届くよ', emailPh: 'メールアドレス', sendLink: '🌱 ログインリンクを送る',
    emailInvalid: 'メールアドレスが正しくありません', sendFailed: '送信に失敗しました：',
    guideTitle: 'はじめてガイド 🌱', readNote: '📖 noteで詳しく読む', start: '🌱 はじめる',
    requires: '必要称号：', unlocked: '✅ 解放済み', locked: '🔒 未解放', sendToUnlock: '💚 ありがとうを送って称号を上げる',
    nftUnlockedDesc: (n: string) => `おめでとう！「${n}」を保有してるよ🌱 称号が上がるたびに新しいNFTが解放される。将来はBNB Chainでミントして本物のNFTにできる予定。`,
    nftLockedDesc: (t: string) => `このNFTは「${t}」称号で解放されるよ。ありがとうを送り合って称号を上げよう🌱`,
    accumulated: '溜まってるRSEED', full: '満タン 🌳', elapsed: '経過時間', fullClaim: '⛏️ 満タンだよ！受け取ろう', mineRate: '1時間で +0.001 RSEED・24時間で満タン',
    receiving: '受け取り中...', claim: (a: string) => `⛏️ ${a} RSEEDを受け取る`, waiting: '⏳ 溜まるのを待ってね', sendArigatou: '💚 ありがとうを送る',
    recentHistory: 'RECENT HISTORY', noHistory: 'まだ履歴がないよ', mining: 'マイニング', arigatouSent: 'ありがとう送信', arigatouReceived: 'ありがとう受け取り',
    ranking: 'RANKING', anon: '匿名',
    sendArigatouTitle: 'SEND ARIGATOU', recipient: '送る相手のユーザー名', amountLabel: '量（1 = 0.01 RSEED消費）',
    costBalance: (c: string, b: string) => `消費：${c} RSEED　／　残高：${b} RSEED`,
    nftGallery: 'NFT GALLERY', unlockAt: (t: string) => `${t}で解放`, rankUpUnlock: '🌱 称号を上げてNFTを解放しよう', nftGalleryDesc: 'ありがとうを送るほど称号が上がり、新しいNFTがアンロックされるよ。LEGENDだけのGenesis Seedは限定10枚🌳',
    walletBalance: 'WALLET BALANCE', totalReceived: '受け取り総額', totalSent: '送った総額', fAll: 'すべて', fReceived: 'もらった', fSent: '送った', fMine: 'マイニング', noHistory2: '履歴がないよ',
    profile: 'PROFILE', noName: '名前未設定', arigatouTotal: (n: number) => `ありがとう累計 ${n}回`, statBalance: 'RSEED残高', statArigatou: 'ありがとう数', statNft: 'NFT保有',
    nextRank: (t: string) => `次の称号まで（${t}）`, arigatouUnit: 'ありがとう', usernameCard: '👤 ユーザー名', usernameDesc: 'ランキングやありがとうで表示される名前だよ',
    namePh: '名前を入力（2〜16文字）', save: '保存', avatarCard: '🎨 アバター', avatarDesc: '好きなアイコンを選んでね', joinDiscord: 'Discordコミュニティに参加', logout: 'ログアウト',
    kujiHead: 'ARIGATOU KUJI', kujiTitle: 'ありがとうくじ', kujiDesc1: '大当たり 1%（100倍）/ 中当たり 9%（10倍）', kujiDesc2: 'ハズレ 90%（10%返還）', betLabel: '賭けるRSEED（0.001〜10）',
    balance: (b: string) => `残高：${b} RSEED`, drawing: '🎋 引いてる...', draw: '🎋 くじを引く', bigWin: '大当たり！！！', midWin: '中当たり！', miss: 'ハズレ...', wonAmt: (p: string) => `${p} RSEED 獲得`, again: 'もう一回',
    nameMin: '2文字以上にしてね', nameMax: '16文字以内にしてね', nameInvalid: '使えない文字が含まれてるよ', nameTaken: 'この名前はもう使われてるよ', nameSaveFail: '保存に失敗しました',
    nameSaved: '✨ 名前を保存したよ！', earned: (a: string) => `🌱 +${a} RSEED 獲得！`, saveFailed: '⚠️ 保存に失敗：', userNotFound: 'ユーザーが見つかりません', notEnough: 'RSEEDが足りません', arigatouToast: '💚 ありがとうを送ったよ！',
    kujiRange: '0.001〜10 RSEEDで入力してね', kujiNotEnough: 'RSEEDが足りない！', titleUp: (t: string) => `🎉 称号アップ！「${t}」になったよ`, avatarSaved: '✨ アバターを変更したよ！',
    navHome: 'ホーム', navRank: 'ランク', navKuji: 'くじ', navNft: 'NFT', navProfile: 'プロフィール',
    notifTitle: 'お知らせ', notifEmpty: 'まだお知らせはないよ', gotArigatou: '🌱 ありがとうをもらった！', navWallet: 'ウォレット',
    share: '📤 シェアする', linkCopied: '📋 シェア文をコピーしたよ！',
    msgLabel: 'メッセージ（任意・50文字まで）', msgPh: '例：手伝ってくれてありがとう！',
    dailyBonus: '🎁 デイリーボーナス', dailyClaim: '受け取る', dailyDone: '✅ 今日は受け取り済み', dailyDesc: '毎日ログインで +0.005 RSEED',
    dailyGot: (a: string) => `🎁 デイリーボーナス +${a} RSEED！`, daily: 'デイリーボーナス',
    badgesTitle: '🏅 実績バッジ', badgeLocked: '未獲得',
    totalSupply: '🌍 みんなで育てたRITATASEED', supplyNote: '上限2,000万枚に到達したら新規発行は止まるよ。みんなで少しずつ育てていこう🌱',
    poolTitle: '🤝 みんなのプール', poolNote: (n: string) => `使われたRSEEDは燃えずにここへ集まるよ。${n}枚たまったら全員に分配🌱`,
    shareUnlocked: (n: string) => `🌱 RSEEDで「${n}」NFTを手に入れた！感謝が価値になる経済圏 #RSEED #RITATASEED`,
    shareLocked: (n: string) => `🌱 RSEEDで「${n}」NFTを目指してるよ！感謝が価値になる経済圏 #RSEED #RITATASEED`,
  },
  en: {
    loading: 'Loading...', mailSent: 'Email sent!', mailSentDesc: 'Tap the link in the email to log in 🌱', tryAnother: 'Try another email',
    enterEmail: "Enter your email and we'll send a login link", emailPh: 'Email address', sendLink: '🌱 Send login link',
    emailInvalid: 'Invalid email address', sendFailed: 'Failed to send: ',
    guideTitle: 'Getting started 🌱', readNote: '📖 Read more on note', start: '🌱 Get started',
    requires: 'Requires: ', unlocked: '✅ Unlocked', locked: '🔒 Locked', sendToUnlock: '💚 Send arigatou to rank up',
    nftUnlockedDesc: (n: string) => `Congrats! You own "${n}" 🌱 New NFTs unlock as your rank rises. Soon you'll be able to mint real NFTs on BNB Chain.`,
    nftLockedDesc: (t: string) => `This NFT unlocks at the "${t}" rank. Exchange arigatou to rank up 🌱`,
    accumulated: 'Accumulating RSEED', full: 'Full 🌳', elapsed: 'Elapsed', fullClaim: '⛏️ Full! Tap to claim', mineRate: '+0.001 RSEED per hour, full in 24h',
    receiving: 'Claiming...', claim: (a: string) => `⛏️ Claim ${a} RSEED`, waiting: '⏳ Waiting to fill up', sendArigatou: '💚 Send arigatou',
    recentHistory: 'RECENT HISTORY', noHistory: 'No history yet', mining: 'Mining', arigatouSent: 'Arigatou sent', arigatouReceived: 'Arigatou received',
    ranking: 'RANKING', anon: 'Anonymous',
    sendArigatouTitle: 'SEND ARIGATOU', recipient: "Recipient's username", amountLabel: 'Amount (1 = 0.01 RSEED)',
    costBalance: (c: string, b: string) => `Cost: ${c} RSEED　/　Balance: ${b} RSEED`,
    nftGallery: 'NFT GALLERY', unlockAt: (t: string) => `Unlock at ${t}`, rankUpUnlock: '🌱 Rank up to unlock NFTs', nftGalleryDesc: 'The more arigatou you exchange, the higher your rank and the more NFTs unlock. Genesis Seed is LEGEND-only, limited to 10 🌳',
    walletBalance: 'WALLET BALANCE', totalReceived: 'Total received', totalSent: 'Total sent', fAll: 'All', fReceived: 'Received', fSent: 'Sent', fMine: 'Mining', noHistory2: 'No history',
    profile: 'PROFILE', noName: 'No name set', arigatouTotal: (n: number) => `${n} arigatou received`, statBalance: 'Balance', statArigatou: 'Arigatou', statNft: 'NFTs',
    nextRank: (t: string) => `Next rank (${t})`, arigatouUnit: 'arigatou', usernameCard: '👤 Username', usernameDesc: 'Your display name in ranking and arigatou',
    namePh: 'Enter name (2-16 chars)', save: 'Save', avatarCard: '🎨 Avatar', avatarDesc: 'Pick your favorite icon', joinDiscord: 'Join Discord community', logout: 'Log out',
    kujiHead: 'ARIGATOU KUJI', kujiTitle: 'Arigatou Lottery', kujiDesc1: 'Jackpot 1% (100x) / Win 9% (10x)', kujiDesc2: 'Miss 90% (10% back)', betLabel: 'Bet RSEED (0.001-10)',
    balance: (b: string) => `Balance: ${b} RSEED`, drawing: '🎋 Drawing...', draw: '🎋 Draw', bigWin: 'JACKPOT!!!', midWin: 'You win!', miss: 'Miss...', wonAmt: (p: string) => `${p} RSEED won`, again: 'Again',
    nameMin: 'At least 2 characters', nameMax: '16 characters or fewer', nameInvalid: 'Contains invalid characters', nameTaken: 'This name is already taken', nameSaveFail: 'Failed to save',
    nameSaved: '✨ Name saved!', earned: (a: string) => `🌱 +${a} RSEED earned!`, saveFailed: '⚠️ Save failed: ', userNotFound: 'User not found', notEnough: 'Not enough RSEED', arigatouToast: '💚 Arigatou sent!',
    kujiRange: 'Enter between 0.001 and 10 RSEED', kujiNotEnough: 'Not enough RSEED!', titleUp: (t: string) => `🎉 Rank up! You're now ${t}`, avatarSaved: '✨ Avatar updated!',
    navHome: 'Home', navRank: 'Rank', navKuji: 'Lottery', navNft: 'NFT', navProfile: 'Profile',
    notifTitle: 'Notifications', notifEmpty: 'No notifications yet', gotArigatou: '🌱 You received arigatou!', navWallet: 'Wallet',
    share: '📤 Share', linkCopied: '📋 Share text copied!',
    msgLabel: 'Message (optional, up to 50 chars)', msgPh: 'e.g. Thanks for helping me!',
    dailyBonus: '🎁 Daily bonus', dailyClaim: 'Claim', dailyDone: '✅ Claimed today', dailyDesc: 'Log in daily for +0.005 RSEED',
    dailyGot: (a: string) => `🎁 Daily bonus +${a} RSEED!`, daily: 'Daily bonus',
    badgesTitle: '🏅 Achievements', badgeLocked: 'Locked',
    totalSupply: '🌍 RITATASEED grown together', supplyNote: 'New minting stops once it reaches the 20M cap. Let\'s grow it together 🌱',
    poolTitle: '🤝 Community Pool', poolNote: (n: string) => `Used RSEED isn't burned — it collects here. At ${n} it's shared with everyone 🌱`,
    shareUnlocked: (n: string) => `🌱 I got the "${n}" NFT on RSEED! A gratitude economy where thanks has value. #RSEED #RITATASEED`,
    shareLocked: (n: string) => `🌱 I'm aiming for the "${n}" NFT on RSEED! A gratitude economy where thanks has value. #RSEED #RITATASEED`,
  },
}

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

function timeAgo(dateStr: string, lang: Lang = 'ja') {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (lang === 'en') {
    if (h < 1) return 'just now'
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }
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

function Fireworks({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width = window.innerWidth
    const H = canvas.height = window.innerHeight
    const colors = ['#3a7d44', '#6ab86a', '#f0a830', '#e85d8a', '#5b8def', '#ffd24a']
    type P = { x: number; y: number; vx: number; vy: number; life: number; color: string }
    let particles: P[] = []
    const burst = (cx: number, cy: number) => {
      const color = colors[Math.floor(Math.random() * colors.length)]
      for (let i = 0; i < 46; i++) {
        const a = (Math.PI * 2 * i) / 46
        const s = 2 + Math.random() * 4
        particles.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color })
      }
    }
    let bursts = 0
    const interval = setInterval(() => {
      burst(W * (0.2 + Math.random() * 0.6), H * (0.2 + Math.random() * 0.4))
      if (++bursts >= 5) clearInterval(interval)
    }, 350)
    let raf = 0
    const loop = () => {
      ctx.clearRect(0, 0, W, H)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= 0.016
        ctx.globalAlpha = Math.max(p.life, 0)
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill()
      })
      particles = particles.filter(p => p.life > 0)
      if (particles.length > 0 || bursts < 5) raf = requestAnimationFrame(loop)
      else onDone()
    }
    raf = requestAnimationFrame(loop)
    return () => { clearInterval(interval); cancelAnimationFrame(raf) }
  }, [onDone])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 300, pointerEvents: 'none' }} />
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
  const [accumulatedFrac, setAccumulatedFrac] = useState(0)
  const [lastMined, setLastMined] = useState<string | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [selectedNft, setSelectedNft] = useState<typeof NFT_LIST[0] | null>(null)
  const [fireworks, setFireworks] = useState(false)
  const [avatar, setAvatar] = useState('')
  const [lastDaily, setLastDaily] = useState<string | null>(null)
  const [claimingDaily, setClaimingDaily] = useState(false)
  const [totalSupply, setTotalSupply] = useState(0)
  const [poolAmount, setPoolAmount] = useState(0)
  const [lang, setLang] = useState<Lang>('ja')
  const [showNotif, setShowNotif] = useState(false)
  const [notifSeen, setNotifSeen] = useState(0)
  const prevTitleRef = useRef<string | null>(null)
  const t = STR[lang]
  const [loginError, setLoginError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ranking, setRanking] = useState<RankUser[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [arigatouTarget, setArigatouTarget] = useState('')
  const [arigatouAmount, setArigatouAmount] = useState(1)
  const [arigatouMessage, setArigatouMessage] = useState('')
  const [sendingArigatou, setSendingArigatou] = useState(false)
  const [toast, setToast] = useState('')
  const [walletFilter, setWalletFilter] = useState<'all' | 'mine' | 'sent' | 'received'>('all')
  const [kujiAmount, setKujiAmount] = useState('0.01')
  const [kujiResult, setKujiResult] = useState<null | { type: 'big' | 'mid' | 'miss'; payout: number; bet: number }>(null)
  const [kujiPlaying, setKujiPlaying] = useState(false)
  const [username, setUsername] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')

  const userTitle = getTitle(arigatouCount)
  const nextTitle = getNextTitle(userTitle)
  const nextThreshold = getNextThreshold(userTitle)
  const progress = nextThreshold ? Math.min((arigatouCount / nextThreshold) * 100, 100) : 100
  const notifications = history.filter(h => h.type === 'arigatou_received')
  const unreadCount = notifications.filter(h => new Date(h.created_at).getTime() > notifSeen).length
  const nftCount = NFT_LIST.filter(n => isNftUnlocked(n, userTitle)).length
  const badgeStats: BadgeStats = { rseed, arigatouCount, nftCount, mined: history.some(h => h.type === 'mine') }
  const todayStr = new Date().toDateString()
  const canClaimDaily = !lastDaily || new Date(lastDaily).toDateString() !== todayStr

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        await loadUser(u.id); await loadRanking(); await loadTotalSupply(); await loadPool()
        if (!localStorage.getItem('rseed_tutorial_seen')) setShowTutorial(true)
      }
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('rseed_last_email')
    if (saved) setEmail(saved)
    const savedLang = localStorage.getItem('rseed_lang')
    if (savedLang === 'en' || savedLang === 'ja') setLang(savedLang)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    const seen = localStorage.getItem('rseed_notif_seen')
    if (seen) setNotifSeen(Number(seen))
  }, [])

  const openNotif = () => {
    setShowNotif(true)
    const now = Date.now()
    setNotifSeen(now)
    localStorage.setItem('rseed_notif_seen', String(now))
  }

  const toggleLang = () => {
    const next: Lang = lang === 'ja' ? 'en' : 'ja'
    setLang(next)
    localStorage.setItem('rseed_lang', next)
  }

  useEffect(() => {
    if (!user) return
    const id = setInterval(() => applyAccumulated(lastMined), 5000)
    return () => clearInterval(id)
  }, [user, lastMined])

  useEffect(() => {
    const prev = prevTitleRef.current
    if (prev && TITLE_ORDER.indexOf(userTitle) > TITLE_ORDER.indexOf(prev)) {
      setFireworks(true)
      showToast(t.titleUp(userTitle))
    }
    prevTitleRef.current = userTitle
  }, [userTitle])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleShareNft = async (nft: typeof NFT_LIST[0]) => {
    const unlocked = isNftUnlocked(nft, userTitle)
    const text = unlocked ? t.shareUnlocked(nft.name) : t.shareLocked(nft.name)
    const url = typeof window !== 'undefined' ? window.location.origin : ''
    const nav = typeof navigator !== 'undefined' ? navigator : undefined
    try {
      if (nav?.share) {
        try {
          const res = await fetch(nft.image)
          const blob = await res.blob()
          const file = new File([blob], `${nft.id}.jpg`, { type: blob.type })
          if (nav.canShare?.({ files: [file] })) {
            await nav.share({ title: nft.name, text, url, files: [file] })
            return
          }
        } catch {}
        await nav.share({ title: nft.name, text, url })
      } else {
        await nav?.clipboard?.writeText(`${text}\n${url}`)
        showToast(t.linkCopied)
      }
    } catch {}
  }

  const closeTutorial = () => {
    localStorage.setItem('rseed_tutorial_seen', '1')
    setShowTutorial(false)
  }

  const handlePickAvatar = async (emoji: string) => {
    if (!user) return
    setAvatar(emoji)
    const { error } = await supabase.from('users').upsert({ id: user.id, avatar: emoji }, { onConflict: 'id' })
    if (error) { showToast(t.saveFailed + error.message); return }
    showToast(t.avatarSaved)
    await loadRanking()
  }

  const calcAccumulated = (lm: string | null) => {
    if (!lm) return { hours: 24, rseed: 0.024, frac: 1 }
    const diff = Date.now() - new Date(lm).getTime()
    const rawHours = Math.min(diff / 3600000, 24)
    return { hours: Math.floor(rawHours), rseed: rawHours * 0.001, frac: rawHours / 24 }
  }

  const applyAccumulated = (lm: string | null) => {
    const { hours, rseed: acc, frac } = calcAccumulated(lm)
    setAccumulatedHours(hours)
    setAccumulatedRseed(acc)
    setAccumulatedFrac(frac)
  }

  const loadUser = async (uid: string) => {
    // 行が無ければ作る（既にあれば何もしない）→ 以降の保存が必ず通るように
    await supabase.from('users').upsert({ id: uid, rseed: 0, arigatou_count: 0 }, { onConflict: 'id', ignoreDuplicates: true })
    const { data } = await supabase.from('users').select('rseed, last_mined, arigatou_count, username, avatar').eq('id', uid).single()
    if (!data) return
    setRseed(data.rseed ?? 0)
    setArigatouCount(data.arigatou_count ?? 0)
    setUsername(data.username ?? '')
    setUsernameInput(data.username ?? '')
    if (data.avatar) setAvatar(data.avatar)
    setLastMined(data.last_mined)
    applyAccumulated(data.last_mined)
    const { data: dd } = await supabase.from('users').select('last_daily').eq('id', uid).maybeSingle()
    if (dd && 'last_daily' in dd) setLastDaily(dd.last_daily)
    const { data: hist } = await supabase.from('history').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(10)
    setHistory(hist ?? [])
  }

  const loadRanking = async () => {
    const withAvatar = await supabase.from('users').select('id, username, rseed, arigatou_count, avatar').neq('id', TREASURY_ID).order('rseed', { ascending: false }).limit(10)
    const data: RankUser[] | null = withAvatar.data
      ? withAvatar.data
      : (await supabase.from('users').select('id, username, rseed, arigatou_count').neq('id', TREASURY_ID).order('rseed', { ascending: false }).limit(10)).data
    setRanking(data ?? [])
  }

  const loadTotalSupply = async () => {
    const { data } = await supabase.from('users').select('rseed')
    if (data) setTotalSupply(data.reduce((s, u) => s + (u.rseed ?? 0), 0))
  }

  const loadPool = async () => {
    await supabase.from('users').upsert({ id: TREASURY_ID, rseed: 0, arigatou_count: 0, username: '__pool__' }, { onConflict: 'id', ignoreDuplicates: true })
    const { data } = await supabase.from('users').select('rseed').eq('id', TREASURY_ID).maybeSingle()
    setPoolAmount(data?.rseed ?? 0)
  }

  const handleLogin = async () => {
    setLoginError('')
    const trimmed = email.trim()
    if (!trimmed.includes('@')) { setLoginError(t.emailInvalid); return }
    const { error } = await supabase.auth.signInWithOtp({ email: trimmed })
    if (error) { setLoginError(t.sendFailed + error.message); return }
    localStorage.setItem('rseed_last_email', trimmed)
    setMagicSent(true)
  }

  const handleSaveUsername = async () => {
    if (!user) return
    setNameError('')
    const name = usernameInput.trim()
    if (name.length < 2) { setNameError(t.nameMin); return }
    if (name.length > 16) { setNameError(t.nameMax); return }
    if (!/^[a-zA-Z0-9_ぁ-んァ-ヶー一-龠]+$/.test(name)) { setNameError(t.nameInvalid); return }
    setSavingName(true)
    const { data: existing } = await supabase.from('users').select('id').ilike('username', name).neq('id', user.id).maybeSingle()
    if (existing) { setNameError(t.nameTaken); setSavingName(false); return }
    const { error } = await supabase.from('users').update({ username: name }).eq('id', user.id)
    setSavingName(false)
    if (error) { setNameError(/unique|duplicate/i.test(error.message) ? t.nameTaken : t.nameSaveFail); return }
    setUsername(name)
    await loadRanking()
    showToast(t.nameSaved)
  }

  const handleMine = async () => {
    if (!user || accumulatedRseed <= 0 || mining) return
    setMining(true)
    await new Promise(r => setTimeout(r, 1200))
    const earned = accumulatedRseed
    const newBalance = rseed + earned
    const now = new Date().toISOString()
    const { error } = await supabase.from('users').upsert({ id: user.id, rseed: newBalance, last_mined: now }, { onConflict: 'id' })
    if (!error) {
      await supabase.from('history').insert({ user_id: user.id, type: 'mine', amount: earned })
      setRseed(newBalance)
      setLastMined(now)
      applyAccumulated(now)
      showToast(t.earned(earned.toFixed(3)))
      await loadRanking(); await loadTotalSupply()
    } else {
      showToast(t.saveFailed + error.message)
    }
    setMining(false)
  }

  const handleClaimDaily = async () => {
    if (!user || !canClaimDaily || claimingDaily) return
    setClaimingDaily(true)
    const now = new Date().toISOString()
    const newBalance = rseed + DAILY_AMOUNT
    const { error } = await supabase.from('users').update({ rseed: newBalance, last_daily: now }).eq('id', user.id)
    if (!error) {
      await supabase.from('history').insert({ user_id: user.id, type: 'daily', amount: DAILY_AMOUNT })
      setRseed(newBalance)
      setLastDaily(now)
      setFireworks(true)
      showToast(t.dailyGot(DAILY_AMOUNT.toFixed(3)))
      await loadRanking(); await loadTotalSupply()
    } else {
      showToast(t.saveFailed + error.message)
    }
    setClaimingDaily(false)
  }

  const handleSendArigatou = async () => {
    if (!user || !arigatouTarget.trim() || sendingArigatou) return
    setSendingArigatou(true)
    const { data: target } = await supabase.from('users').select('id, rseed, arigatou_count').eq('username', arigatouTarget.trim()).single()
    if (!target) { showToast(t.userNotFound); setSendingArigatou(false); return }
    const cost = arigatouAmount * 0.01
    if (rseed < cost) { showToast(t.notEnough); setSendingArigatou(false); return }
    await supabase.from('users').update({ rseed: rseed - cost }).eq('id', user.id)
    await supabase.from('users').update({ rseed: target.rseed + arigatouAmount * 0.005, arigatou_count: (target.arigatou_count ?? 0) + 1 }).eq('id', target.id)
    // 使われた差額は燃やさず「みんなのプール」へ集める（ポジティブサム）
    const poolAdd = cost - arigatouAmount * 0.005
    const { data: tre } = await supabase.from('users').select('rseed').eq('id', TREASURY_ID).maybeSingle()
    const newPool = (tre?.rseed ?? 0) + poolAdd
    await supabase.from('users').upsert({ id: TREASURY_ID, rseed: newPool, arigatou_count: 0 }, { onConflict: 'id' })
    setPoolAmount(newPool)
    const msg = arigatouMessage.trim().slice(0, 50)
    const rows = [
      { user_id: user.id, type: 'arigatou_sent', amount: cost, message: msg, to_username: arigatouTarget.trim() },
      { user_id: target.id, type: 'arigatou_received', amount: arigatouAmount * 0.005, message: msg, from_username: username },
    ]
    const { error: histErr } = await supabase.from('history').insert(rows)
    if (histErr) {
      // message / username 列が未作成でも履歴だけは残す
      await supabase.from('history').insert(rows.map(({ message, from_username, to_username, ...r }) => r))
    }
    setRseed(r => r - cost)
    setArigatouTarget('')
    setArigatouMessage('')
    showToast(t.arigatouToast)
    setSendingArigatou(false)
  }

  const handleKuji = async () => {
    if (!user || kujiPlaying) return
    const bet = parseFloat(kujiAmount)
    if (isNaN(bet) || bet < 0.001 || bet > 10) { showToast(t.kujiRange); return }
    if (rseed < bet) { showToast(t.kujiNotEnough); return }
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
    if (type === 'big') setFireworks(true)
    setKujiPlaying(false)
  }

  const G = { background: '#f7fbf4' }
  const W = { background: '#fff' }
  const borderGreen = '0.5px solid #d4eacc'
  const textPrimary = { color: '#2d4a2d' }
  const textMuted = { color: '#8ab88a' }
  const textGreen = { color: '#3a7d44' }
  const pill = { background: '#edf7e8', border: '0.5px solid #c8e8bc', borderRadius: 10, padding: '1px 7px', fontSize: 10, ...textGreen, display: 'inline-block' }

  if (loading) return <main style={{ minHeight: '100vh', ...G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={textMuted}>{t.loading}</p></main>

  if (!user) return (
    <main style={{ minHeight: '100vh', ...G, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: 4, ...textGreen }}>RSEED</div>
        <div style={{ fontSize: 11, ...textMuted, letterSpacing: 2, marginTop: 2 }}>RITATASEED</div>
      </div>
      <button onClick={toggleLang} style={{ background: '#edf7e8', border: '0.5px solid #c8e8bc', borderRadius: 20, padding: '5px 14px', fontSize: 12, ...textGreen, cursor: 'pointer' }}>
        {lang === 'ja' ? '🌐 English' : '🌐 日本語'}
      </button>
      <div style={{ ...W, border: borderGreen, borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {magicSent ? (
          <>
            <div style={{ textAlign: 'center', fontSize: 32 }}>📬</div>
            <p style={{ textAlign: 'center', ...textGreen, fontWeight: 500, fontSize: 15 }}>{t.mailSent}</p>
            <p style={{ textAlign: 'center', ...textMuted, fontSize: 13, lineHeight: 1.6 }}>{t.mailSentDesc}</p>
            <button onClick={() => { setMagicSent(false); setEmail('') }} style={{ padding: '10px 0', borderRadius: 30, background: 'transparent', color: '#3a7d44', fontWeight: 500, fontSize: 13, border: '0.5px solid #c8e8bc', cursor: 'pointer' }}>
              {t.tryAnother}
            </button>
          </>
        ) : (
          <>
            <p style={{ textAlign: 'center', ...textMuted, fontSize: 13 }}>{t.enterEmail}</p>
            <input type="email" placeholder={t.emailPh} value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ padding: '12px 16px', borderRadius: 12, border: '0.5px solid #c8e8bc', ...G, ...textPrimary, fontSize: 14, outline: 'none', width: '100%' }} />
            <button onClick={handleLogin} style={{ padding: '13px 0', borderRadius: 30, background: '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              {t.sendLink}
            </button>
            {loginError && <p style={{ color: '#e24b4a', fontSize: 12, textAlign: 'center' }}>{loginError}</p>}
          </>
        )}
      </div>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', ...G, maxWidth: 420, margin: '0 auto', position: 'relative', paddingBottom: 75 }}>

      {fireworks && <Fireworks onDone={() => setFireworks(false)} />}

      {showNotif && (
        <div onClick={() => setShowNotif(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(45,74,45,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '70px 16px 16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ ...W, borderRadius: 20, padding: '18px 18px', width: '100%', maxWidth: 360, maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ ...textGreen, fontSize: 15, fontWeight: 500 }}>🔔 {t.notifTitle}</div>
              <button onClick={() => setShowNotif(false)} aria-label="close"
                style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#8ab88a' }}>✕</button>
            </div>
            {notifications.length === 0 ? (
              <div style={{ ...textMuted, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>{t.notifEmpty}</div>
            ) : (
              notifications.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < notifications.length - 1 ? '0.5px solid #f0f7ec' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#edf7e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>💚</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...textPrimary, fontSize: 13, fontWeight: 500 }}>{h.from_username ? `${h.from_username} ${t.gotArigatou}` : t.gotArigatou}</div>
                    {h.message && <div style={{ ...textGreen, fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>「{h.message}」</div>}
                    <div style={{ ...textMuted, fontSize: 11, marginTop: 1 }}>{timeAgo(h.created_at, lang)}</div>
                  </div>
                  <div style={{ ...textGreen, fontSize: 12, fontFamily: 'monospace', fontWeight: 500 }}>+{h.amount.toFixed(4)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showTutorial && (
        <div onClick={closeTutorial}
          style={{ position: 'fixed', inset: 0, background: 'rgba(45,74,45,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ ...W, borderRadius: 24, padding: '24px 22px', width: '100%', maxWidth: 360, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: 3, ...textGreen }}>RSEED</div>
              <div style={{ ...textMuted, fontSize: 12, marginTop: 2 }}>{t.guideTitle}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TUTORIAL_STEPS.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 24, flexShrink: 0, width: 38, height: 38, borderRadius: '50%', background: '#edf7e8', border: '0.5px solid #c8e8bc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                  <div>
                    <div style={{ ...textPrimary, fontSize: 14, fontWeight: 500 }}>{s.title[lang]}</div>
                    <div style={{ ...textMuted, fontSize: 12, marginTop: 2, lineHeight: 1.6 }}>{s.body[lang]}</div>
                  </div>
                </div>
              ))}
            </div>
            <a href={NOTE_TUTORIAL_URL} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 18, padding: '12px 0', borderRadius: 30, background: '#edf7e8', ...textGreen, fontSize: 13, border: '0.5px solid #b8dda8', textDecoration: 'none', boxSizing: 'border-box' }}>
              {t.readNote}
            </a>
            <button onClick={closeTutorial}
              style={{ width: '100%', marginTop: 10, padding: '13px 0', borderRadius: 30, background: '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              {t.start}
            </button>
          </div>
        </div>
      )}

      {selectedNft && (() => {
        const unlocked = isNftUnlocked(selectedNft, userTitle)
        return (
          <div onClick={() => setSelectedNft(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(45,74,45,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ ...W, borderRadius: 24, width: '100%', maxWidth: 360, maxHeight: '88vh', overflowY: 'auto', overflowX: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                <img src={selectedNft.image} alt={selectedNft.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', filter: unlocked ? 'none' : 'grayscale(0.7) blur(3px)' }} />
                <button onClick={() => setSelectedNft(null)} aria-label="close"
                  style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.85)', border: 'none', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                {!unlocked && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>🔒</div>
                )}
              </div>
              <div style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{selectedNft.icon}</span>
                  <span style={{ ...textPrimary, fontSize: 18, fontWeight: 500 }}>{selectedNft.name}</span>
                </div>
                <div style={{ ...textMuted, fontSize: 13, marginTop: 4 }}>{selectedNft.sub[lang]}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  <span style={{ ...pill, fontSize: 11 }}>{selectedNft.tag[lang]}</span>
                  <span style={{ ...pill, fontSize: 11 }}>{t.requires}{selectedNft.requiredTitle}</span>
                  <span style={{ ...pill, fontSize: 11, background: unlocked ? '#edf7e8' : '#fff0f0', color: unlocked ? '#3a7d44' : '#c47', border: unlocked ? '0.5px solid #c8e8bc' : '0.5px solid #f0c8c8' }}>
                    {unlocked ? t.unlocked : t.locked}
                  </span>
                </div>
                <div style={{ marginTop: 14, padding: '12px 14px', background: '#f7fbf4', borderRadius: 12, border: '0.5px solid #e0f0d8' }}>
                  <div style={{ ...textGreen, fontSize: 11, fontWeight: 500, marginBottom: 4 }}>RSEED Collection</div>
                  <div style={{ ...textMuted, fontSize: 12, lineHeight: 1.7 }}>
                    {unlocked ? t.nftUnlockedDesc(selectedNft.name) : t.nftLockedDesc(selectedNft.requiredTitle)}
                  </div>
                </div>
                <button onClick={() => handleShareNft(selectedNft)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 12, padding: '12px 0', borderRadius: 30, background: '#edf7e8', ...textGreen, fontWeight: 500, fontSize: 14, border: '0.5px solid #b8dda8', cursor: 'pointer' }}>
                  {t.share}
                </button>
                {!unlocked && (
                  <button onClick={() => { setSelectedNft(null); setTab('arigatou') }}
                    style={{ width: '100%', marginTop: 10, padding: '13px 0', borderRadius: 30, background: '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer' }}>
                    {t.sendToUnlock}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={toggleLang} aria-label="language"
            style={{ background: '#edf7e8', border: '0.5px solid #c8e8bc', borderRadius: 16, height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, ...textGreen, cursor: 'pointer' }}>
            {lang === 'ja' ? 'EN' : 'JA'}
          </button>
          <button onClick={() => setShowTutorial(true)} aria-label="help"
            style={{ background: '#edf7e8', border: '0.5px solid #c8e8bc', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer' }}>❓</button>
          <button onClick={openNotif} aria-label="notifications"
            style={{ position: 'relative', background: '#edf7e8', border: '0.5px solid #c8e8bc', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer' }}>
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: '#e24b4a', color: '#fff', fontSize: 9, fontWeight: 600, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadCount}</span>
            )}
          </button>
        </div>
      </div>

      {tab === 'home' && (
        <>
          <div style={{ ...W, padding: '24px 20px 18px', textAlign: 'center', borderBottom: '0.5px solid #e0f0d8', position: 'relative', overflow: 'hidden' }}>
            <Tree style={{ position: 'absolute', left: -8, bottom: 0 }} />
            <Tree style={{ position: 'absolute', right: -8, bottom: 0 }} />
            <div style={{ ...pill, marginBottom: 12, position: 'relative', zIndex: 1, fontSize: 11, padding: '3px 14px' }}>{userTitle} ✦</div>
            <div onClick={() => setTab('wallet')} style={{ fontSize: 42, fontWeight: 500, color: '#2d6636', letterSpacing: 1, position: 'relative', zIndex: 1, cursor: 'pointer' }}>{rseed.toFixed(4)}</div>
            <div style={{ fontSize: 12, ...textMuted, marginTop: 2, position: 'relative', zIndex: 1 }}>RSEED 👛</div>
            <div style={{ background: '#f0f9ea', border: '0.5px solid #c8e8bc', borderRadius: 14, padding: '12px 16px', marginTop: 14, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ ...textMuted, fontSize: 11 }}>{t.accumulated}</div>
                  <div style={{ color: '#2d6636', fontSize: 22, fontWeight: 500, marginTop: 2 }}>+{accumulatedRseed.toFixed(3)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...textMuted, fontSize: 11 }}>{accumulatedFrac >= 1 ? t.full : t.elapsed}</div>
                  <div style={{ ...textGreen, fontSize: 22, fontWeight: 500, marginTop: 2 }}>{accumulatedHours}h / 24h</div>
                </div>
              </div>
              <div style={{ background: '#d4eacc', borderRadius: 4, height: 5, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ background: accumulatedFrac >= 1 ? '#f0a830' : '#3a7d44', height: '100%', width: `${Math.min(accumulatedFrac * 100, 100)}%`, borderRadius: 4, transition: 'width 1s linear' }} />
              </div>
              <div style={{ ...textMuted, fontSize: 10, marginTop: 6, textAlign: 'center' }}>
                {accumulatedFrac >= 1 ? t.fullClaim : t.mineRate}
              </div>
            </div>
            <button onClick={handleMine} disabled={mining || accumulatedRseed <= 0}
              style={{ display: 'block', width: '100%', marginTop: 10, padding: '14px 0', borderRadius: 30, background: accumulatedRseed > 0 ? '#3a7d44' : '#c8e8bc', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: accumulatedRseed > 0 ? 'pointer' : 'default', position: 'relative', zIndex: 1 }}>
              {mining ? t.receiving : accumulatedRseed > 0 ? t.claim(accumulatedRseed.toFixed(3)) : t.waiting}
            </button>
            <button onClick={() => setTab('arigatou')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 30, background: '#edf7e8', ...textGreen, fontSize: 13, border: '0.5px solid #b8dda8', cursor: 'pointer', position: 'relative', zIndex: 1 }}>
              {t.sendArigatou}
            </button>
          </div>
          <div style={{ padding: '12px 16px', ...G, borderBottom: '0.5px solid #e8f4e0' }}>
            <div style={{ ...W, border: borderGreen, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ ...textGreen, fontSize: 13, fontWeight: 500 }}>{t.dailyBonus}</div>
                <div style={{ ...textMuted, fontSize: 11, marginTop: 1 }}>{t.dailyDesc}</div>
              </div>
              <button onClick={handleClaimDaily} disabled={!canClaimDaily || claimingDaily}
                style={{ flexShrink: 0, padding: '9px 18px', borderRadius: 20, background: canClaimDaily ? '#f0a830' : '#edf7e8', color: canClaimDaily ? '#fff' : '#a0c4a0', fontWeight: 500, fontSize: 13, border: canClaimDaily ? 'none' : '0.5px solid #d4eacc', cursor: canClaimDaily ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                {canClaimDaily ? `🎁 ${t.dailyClaim}` : t.dailyDone}
              </button>
            </div>
            <div style={{ ...W, border: borderGreen, borderRadius: 14, padding: '14px', marginTop: 10 }}>
              <div style={{ ...textGreen, fontSize: 12, fontWeight: 500, marginBottom: 8 }}>{t.totalSupply}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ color: '#2d6636', fontSize: 26, fontWeight: 500, fontFamily: 'monospace' }}>{totalSupply.toFixed(3)}</span>
                <span style={{ ...textMuted, fontSize: 12 }}>/ {MAX_SUPPLY.toLocaleString()}</span>
              </div>
              <div style={{ background: '#e8f4e0', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 8 }}>
                <div style={{ background: '#3a7d44', height: '100%', width: `${Math.max(Math.min((totalSupply / MAX_SUPPLY) * 100, 100), 0.4)}%`, borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ ...textMuted, fontSize: 10 }}>{((totalSupply / MAX_SUPPLY) * 100).toFixed(6)}%</span>
                <span style={{ ...textMuted, fontSize: 10 }}>🌱 → 🌳</span>
              </div>
              <div style={{ ...textMuted, fontSize: 10, marginTop: 8, lineHeight: 1.5 }}>{t.supplyNote}</div>
            </div>
            <div style={{ ...W, border: borderGreen, borderRadius: 14, padding: '14px', marginTop: 10 }}>
              <div style={{ ...textGreen, fontSize: 12, fontWeight: 500, marginBottom: 8 }}>{t.poolTitle}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ color: '#2d6636', fontSize: 26, fontWeight: 500, fontFamily: 'monospace' }}>{poolAmount.toFixed(4)}</span>
                <span style={{ ...textMuted, fontSize: 12 }}>/ {DISTRIBUTE_THRESHOLD}</span>
              </div>
              <div style={{ background: '#e8f4e0', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 8 }}>
                <div style={{ background: '#f0a830', height: '100%', width: `${Math.min((poolAmount / DISTRIBUTE_THRESHOLD) * 100, 100)}%`, borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ ...textMuted, fontSize: 10, marginTop: 8, lineHeight: 1.5 }}>{t.poolNote(String(DISTRIBUTE_THRESHOLD))}</div>
            </div>
          </div>
          <div style={{ padding: '14px 16px', ...G, borderBottom: '0.5px solid #e8f4e0' }}>
            <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 10, fontWeight: 500 }}>{t.recentHistory}</div>
            {history.length === 0 && <div style={{ color: '#b8dda8', fontSize: 13 }}>{t.noHistory}</div>}
            {history.map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < history.length - 1 ? '0.5px solid #e8f4e0' : 'none' }}>
                <div>
                  <div style={{ ...textPrimary, fontSize: 13 }}>
                    {h.type === 'mine' ? `⛏️ ${t.mining}` : h.type === 'daily' ? `🎁 ${t.daily}` : h.type === 'arigatou_sent' ? `💚 ${t.arigatouSent}` : `🌱 ${t.arigatouReceived}`}
                  </div>
                  {h.message && <div style={{ ...textGreen, fontSize: 11, marginTop: 1 }}>「{h.message}」</div>}
                  <div style={{ ...textMuted, fontSize: 11 }}>{timeAgo(h.created_at, lang)}</div>
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
          {ranking.map((u, i) => {
            const isMe = u.id === user.id
            return (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', margin: isMe ? '2px -10px' : '2px 0', borderRadius: isMe ? 12 : 0, background: isMe ? '#edf7e8' : 'transparent', border: isMe ? '0.5px solid #b8dda8' : 'none', borderBottom: isMe ? '0.5px solid #b8dda8' : '0.5px solid #e8f4e0' }}>
              <div style={{ color: isMe ? '#3a7d44' : '#b8dda8', fontSize: 13, width: 20, textAlign: 'center', fontWeight: isMe ? 600 : 400 }}>{i + 1}</div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#edf7e8', border: '0.5px solid #c8e8bc', display: 'flex', alignItems: 'center', justifyContent: 'center', ...textGreen, fontSize: u.avatar ? 18 : 12, fontWeight: 500 }}>
                {u.avatar || (u.username ?? 'U').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...textPrimary, fontSize: 13 }}>{u.username ?? t.anon}</div>
                <div style={pill}>{getTitle(u.arigatou_count ?? 0)}</div>
              </div>
              <div style={{ ...textGreen, fontSize: 12, fontFamily: 'monospace' }}>{u.rseed.toFixed(3)}</div>
            </div>
            )
          })}
        </div>
      )}

      {tab === 'arigatou' && (
        <div style={{ padding: '20px 16px' }}>
          <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 16, fontWeight: 500 }}>{t.sendArigatouTitle}</div>
          <div style={{ ...W, border: borderGreen, borderRadius: 16, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ ...textMuted, fontSize: 11, marginBottom: 6 }}>{t.recipient}</div>
              <input type="text" placeholder="username" value={arigatouTarget} onChange={e => setArigatouTarget(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '0.5px solid #c8e8bc', ...G, ...textPrimary, fontSize: 14, outline: 'none' }} />
            </div>
            <div>
              <div style={{ ...textMuted, fontSize: 11, marginBottom: 6 }}>{t.amountLabel}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 5, 10, 50].map(n => (
                  <button key={n} onClick={() => setArigatouAmount(n)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 20, background: arigatouAmount === n ? '#3a7d44' : '#edf7e8', color: arigatouAmount === n ? '#fff' : '#3a7d44', border: '0.5px solid #b8dda8', fontSize: 13, cursor: 'pointer' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ ...textMuted, fontSize: 11, marginBottom: 6 }}>{t.msgLabel}</div>
              <input type="text" maxLength={50} placeholder={t.msgPh} value={arigatouMessage} onChange={e => setArigatouMessage(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '0.5px solid #c8e8bc', ...G, ...textPrimary, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ color: '#a0c4a0', fontSize: 11, textAlign: 'center' }}>
              {t.costBalance((arigatouAmount * 0.01).toFixed(3), rseed.toFixed(4))}
            </div>
            <button onClick={handleSendArigatou} disabled={sendingArigatou || !arigatouTarget.trim()}
              style={{ padding: '13px 0', borderRadius: 30, background: '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer', opacity: sendingArigatou || !arigatouTarget.trim() ? 0.5 : 1 }}>
              {t.sendArigatou}
            </button>
          </div>
        </div>
      )}

      {tab === 'nft' && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 12, fontWeight: 500 }}>{t.nftGallery}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {NFT_LIST.map(nft => {
              const unlocked = isNftUnlocked(nft, userTitle)
              return (
                <div key={nft.id} onClick={() => setSelectedNft(nft)} style={{ ...W, border: unlocked ? borderGreen : '0.5px dashed #c8e8bc', borderRadius: 14, overflow: 'hidden', opacity: unlocked ? 1 : 0.85, cursor: 'pointer' }}>
                  <div style={{ height: 120, background: nft.color, position: 'relative' }}>
                    <img src={nft.image} alt={nft.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: unlocked ? 'none' : 'grayscale(0.7) blur(2px)' }} />
                    <div style={{ position: 'absolute', top: 6, left: 6, fontSize: 18, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>{nft.icon}</div>
                    {!unlocked && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(247,251,244,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🔒</div>
                    )}
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ ...textPrimary, fontSize: 12, fontWeight: 500 }}>{nft.name}</div>
                    <div style={{ ...textMuted, fontSize: 10, marginTop: 1 }}>{nft.sub[lang]}</div>
                    <div style={{ ...pill, marginTop: 5 }}>{nft.tag[lang]}</div>
                    {!unlocked && <div style={{ color: '#b8dda8', fontSize: 10, marginTop: 4 }}>{t.unlockAt(nft.requiredTitle)}</div>}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 14, padding: '12px 14px', background: '#edf7e8', borderRadius: 12, border: '0.5px solid #c8e8bc' }}>
            <div style={{ ...textGreen, fontSize: 12, fontWeight: 500 }}>{t.rankUpUnlock}</div>
            <div style={{ ...textMuted, fontSize: 11, marginTop: 4, lineHeight: 1.6 }}>{t.nftGalleryDesc}</div>
          </div>
        </div>
      )}

      {tab === 'wallet' && (
        <div>
          <div style={{ ...W, padding: '20px 20px 16px', borderBottom: '0.5px solid #e0f0d8', textAlign: 'center' }}>
            <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 }}>{t.walletBalance}</div>
            <div style={{ fontSize: 44, fontWeight: 500, color: '#2d6636' }}>{rseed.toFixed(4)}</div>
            <div style={{ ...textMuted, fontSize: 12, marginTop: 2 }}>RSEED</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <div style={{ flex: 1, background: '#f0f9ea', border: '0.5px solid #d4eacc', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ ...textMuted, fontSize: 10, marginBottom: 3 }}>{t.totalReceived}</div>
                <div style={{ color: '#2d6636', fontSize: 16, fontWeight: 500 }}>+{history.filter(h => h.type !== 'arigatou_sent').reduce((s, h) => s + h.amount, 0).toFixed(3)}</div>
                <div style={{ color: '#a0c4a0', fontSize: 10 }}>RSEED</div>
              </div>
              <div style={{ flex: 1, background: '#f0f9ea', border: '0.5px solid #d4eacc', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ ...textMuted, fontSize: 10, marginBottom: 3 }}>{t.totalSent}</div>
                <div style={{ color: '#e24b4a', fontSize: 16, fontWeight: 500 }}>-{history.filter(h => h.type === 'arigatou_sent').reduce((s, h) => s + h.amount, 0).toFixed(3)}</div>
                <div style={{ color: '#a0c4a0', fontSize: 10 }}>RSEED</div>
              </div>
            </div>
            <button onClick={() => setTab('arigatou')}
              style={{ display: 'block', width: '100%', marginTop: 12, padding: '13px 0', borderRadius: 30, background: '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              {t.sendArigatou}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px', background: '#f7fbf4', borderBottom: '0.5px solid #e8f4e0' }}>
            {([['all', t.fAll], ['received', t.fReceived], ['sent', t.fSent], ['mine', t.fMine]] as const).map(([val, label]) => (
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
                  {h.type === 'mine' ? '⛏️' : h.type === 'daily' ? '🎁' : h.type === 'arigatou_sent' ? '💸' : '💚'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...textPrimary, fontSize: 13, fontWeight: 500 }}>
                    {h.type === 'mine' ? t.mining : h.type === 'daily' ? t.daily : h.type === 'arigatou_sent' ? t.arigatouSent : t.arigatouReceived}
                  </div>
                  {h.message && <div style={{ ...textGreen, fontSize: 11 }}>「{h.message}」</div>}
                  <div style={{ color: '#a0c4a0', fontSize: 10, marginTop: 1 }}>{timeAgo(h.created_at, lang)}</div>
                </div>
                <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 500, color: h.type === 'arigatou_sent' ? '#e24b4a' : '#3a7d44' }}>
                  {h.type === 'arigatou_sent' ? '-' : '+'}{h.amount.toFixed(3)}
                </div>
              </div>
            ))}
            {history.filter(h => walletFilter === 'all' || (walletFilter === 'mine' && h.type === 'mine') || (walletFilter === 'sent' && h.type === 'arigatou_sent') || (walletFilter === 'received' && h.type === 'arigatou_received')).length === 0 && (
              <div style={{ padding: '20px 16px', ...textMuted, fontSize: 13 }}>{t.noHistory2}</div>
            )}
          </div>
        </div>
      )}

      {tab === 'profile' && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 12, fontWeight: 500 }}>{t.profile}</div>
          <div style={{ ...W, border: borderGreen, borderRadius: 16, padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#edf7e8', border: '0.5px solid #b8dda8', display: 'flex', alignItems: 'center', justifyContent: 'center', ...textGreen, fontSize: avatar ? 24 : 14, fontWeight: 500 }}>
                {avatar || (username || user.email || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ ...textPrimary, fontSize: 14, fontWeight: 500 }}>{username || t.noName}</div>
                <div style={{ ...textGreen, fontSize: 11, marginTop: 2 }}>{userTitle} ✦ {t.arigatouTotal(arigatouCount)}</div>
              </div>
            </div>
            <div style={{ borderTop: '0.5px solid #e8f4e0', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 16 }}>
                {[
                  { label: t.statBalance, value: rseed.toFixed(3) },
                  { label: t.statArigatou, value: arigatouCount },
                  { label: t.statNft, value: NFT_LIST.filter(n => isNftUnlocked(n, userTitle)).length },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ color: '#2d6636', fontSize: 22, fontWeight: 500 }}>{s.value}</div>
                    <div style={{ ...textMuted, fontSize: 10 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {nextTitle && (
                <>
                  <div style={{ color: '#a0c4a0', fontSize: 11, marginBottom: 5 }}>{t.nextRank(nextTitle)}</div>
                  <div style={{ background: '#e8f4e0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ background: '#3a7d44', height: '100%', width: `${progress}%`, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                    <span style={{ color: '#a0c4a0', fontSize: 10 }}>{arigatouCount} / {nextThreshold} {t.arigatouUnit}</span>
                    <span style={{ color: '#a0c4a0', fontSize: 10 }}>{Math.round(progress)}%</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={{ ...W, border: borderGreen, borderRadius: 16, padding: '16px', marginTop: 14 }}>
            <div style={{ ...textGreen, fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{t.usernameCard}</div>
            <div style={{ ...textMuted, fontSize: 10, marginBottom: 10 }}>{t.usernameDesc}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder={t.namePh} value={usernameInput} onChange={e => setUsernameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveUsername()}
                style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '0.5px solid #c8e8bc', background: '#f7fbf4', color: '#2d4a2d', fontSize: 14, outline: 'none', minWidth: 0 }} />
              <button onClick={handleSaveUsername} disabled={savingName || usernameInput.trim() === username}
                style={{ padding: '0 18px', borderRadius: 12, background: (savingName || usernameInput.trim() === username) ? '#c8e8bc' : '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 13, border: 'none', cursor: (savingName || usernameInput.trim() === username) ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                {savingName ? '...' : t.save}
              </button>
            </div>
            {nameError && <p style={{ color: '#e24b4a', fontSize: 11, marginTop: 8 }}>{nameError}</p>}
          </div>
          <div style={{ ...W, border: borderGreen, borderRadius: 16, padding: '16px', marginTop: 14 }}>
            <div style={{ ...textGreen, fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{t.avatarCard}</div>
            <div style={{ ...textMuted, fontSize: 10, marginBottom: 10 }}>{t.avatarDesc}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {AVATAR_CHOICES.map(emoji => (
                <button key={emoji} onClick={() => handlePickAvatar(emoji)}
                  style={{ width: 42, height: 42, borderRadius: '50%', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatar === emoji ? '#3a7d44' : '#f7fbf4', border: avatar === emoji ? '2px solid #2d6636' : '0.5px solid #c8e8bc' }}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div style={{ ...W, border: borderGreen, borderRadius: 16, padding: '16px', marginTop: 14 }}>
            <div style={{ ...textGreen, fontSize: 12, fontWeight: 500, marginBottom: 10 }}>{t.badgesTitle}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {BADGES.map(b => {
                const earned = b.earned(badgeStats)
                return (
                  <div key={b.id} style={{ textAlign: 'center', opacity: earned ? 1 : 0.45 }}>
                    <div style={{ width: 46, height: 46, margin: '0 auto', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: earned ? '#edf7e8' : '#f1efe8', border: earned ? '0.5px solid #b8dda8' : '0.5px dashed #c8c8c8', filter: earned ? 'none' : 'grayscale(1)' }}>
                      {earned ? b.icon : '🔒'}
                    </div>
                    <div style={{ ...textPrimary, fontSize: 10, fontWeight: 500, marginTop: 4 }}>{b.name[lang]}</div>
                    <div style={{ ...textMuted, fontSize: 9, marginTop: 1, lineHeight: 1.3 }}>{earned ? b.desc[lang] : t.badgeLocked}</div>
                  </div>
                )
              })}
            </div>
          </div>
          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 14, padding: '13px 0', borderRadius: 30, background: '#5865F2', color: '#fff', fontWeight: 500, fontSize: 14, border: 'none', cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box' }}>
            <span style={{ fontSize: 17 }}>💬</span> {t.joinDiscord}
          </a>
          <button onClick={() => supabase.auth.signOut()}
            style={{ width: '100%', marginTop: 14, padding: '12px 0', borderRadius: 30, ...W, ...textMuted, border: '0.5px solid #c8e8bc', fontSize: 13, cursor: 'pointer' }}>
            {t.logout}
          </button>
        </div>
      )}

      {tab === 'kuji' && (
        <div style={{ padding: '24px 16px' }}>
          <div style={{ ...textMuted, fontSize: 10, letterSpacing: 1.5, marginBottom: 20, fontWeight: 500 }}>{t.kujiHead}</div>
          <div style={{ ...W, border: borderGreen, borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎋</div>
            <div style={{ ...textPrimary, fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{t.kujiTitle}</div>
            <div style={{ ...textMuted, fontSize: 11, marginBottom: 20, lineHeight: 1.6 }}>
              {t.kujiDesc1}<br/>{t.kujiDesc2}
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...textMuted, fontSize: 11, marginBottom: 8 }}>{t.betLabel}</div>
              <input
                type="number" value={kujiAmount} onChange={e => setKujiAmount(e.target.value)}
                min="0.001" max="10" step="0.001"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '0.5px solid #c8e8bc', background: '#f7fbf4', color: '#2d4a2d', fontSize: 18, textAlign: 'center', outline: 'none', fontWeight: 500 }}
              />
              <div style={{ ...textMuted, fontSize: 11, marginTop: 6 }}>{t.balance(rseed.toFixed(4))}</div>
            </div>
            <button onClick={handleKuji} disabled={kujiPlaying}
              style={{ width: '100%', padding: '16px 0', borderRadius: 30, background: kujiPlaying ? '#c8e8bc' : '#3a7d44', color: '#fff', fontWeight: 500, fontSize: 16, border: 'none', cursor: kujiPlaying ? 'default' : 'pointer' }}>
              {kujiPlaying ? t.drawing : t.draw}
            </button>
          </div>

          {kujiResult && (
            <div style={{ marginTop: 16, ...W, border: kujiResult.type === 'big' ? '2px solid #f0c040' : kujiResult.type === 'mid' ? '1px solid #b8dda8' : borderGreen, borderRadius: 20, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>
                {kujiResult.type === 'big' ? '🎉' : kujiResult.type === 'mid' ? '✨' : '🌱'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 500, color: kujiResult.type === 'big' ? '#b8860b' : kujiResult.type === 'mid' ? '#3a7d44' : '#8ab88a', marginBottom: 4 }}>
                {kujiResult.type === 'big' ? t.bigWin : kujiResult.type === 'mid' ? t.midWin : t.miss}
              </div>
              <div style={{ color: '#2d6636', fontSize: 28, fontWeight: 500 }}>
                {kujiResult.payout >= kujiResult.bet ? '+' : ''}{(kujiResult.payout - kujiResult.bet).toFixed(4)} RSEED
              </div>
              <div style={{ ...textMuted, fontSize: 11, marginTop: 4 }}>
                {t.wonAmt(kujiResult.payout.toFixed(4))}
              </div>
              <button onClick={() => setKujiResult(null)}
                style={{ marginTop: 14, padding: '10px 28px', borderRadius: 30, background: '#edf7e8', color: '#3a7d44', border: '0.5px solid #b8dda8', fontSize: 13, cursor: 'pointer' }}>
                {t.again}
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 420, ...W, borderTop: '0.5px solid #e0f0d8', padding: '10px 0 20px', display: 'flex', justifyContent: 'space-around', zIndex: 50 }}>
        {([
          { id: 'home', icon: '🏠', label: t.navHome },
          { id: 'wallet', icon: '👛', label: t.navWallet },
          { id: 'kuji', icon: '🎋', label: t.navKuji },
          { id: 'ranking', icon: '🏆', label: t.navRank },
          { id: 'nft', icon: '🖼️', label: t.navNft },
          { id: 'profile', icon: '👤', label: t.navProfile },
        ] as { id: Tab; icon: string; label: string }[]).map(({ id, icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', color: tab === id ? '#3a7d44' : '#b8dda8', fontSize: 9, whiteSpace: 'nowrap', flex: 1, padding: 0 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </main>
  )
}
