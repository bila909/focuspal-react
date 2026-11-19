import { useEffect, useRef, useState } from 'react'

// ===== PENGATURAN =====
// Ubah ke 1 untuk tes cepat (25 "menit" jadi 25 detik). Kembalikan ke 60 setelah tes.
const SECONDS_PER_MINUTE = 60
const BREAK_MINUTES = 5
const AWAY_LIMIT_SECONDS = 10 // pergi dari tab lebih dari ini = sesi gagal
const OPTIONS = [15, 25, 45]
const SESSIONS_KEY = 'focuspal_sessions'
const ITEMS_KEY = 'focuspal_items'

const MOCHI = {
  idle: '/mochi/mochi_idle.png',
  focus: '/mochi/mochi_focus.png',
  happy: '/mochi/mochi_happy.png',
  disturbed: '/mochi/mochi_disturbed.png',
  rest: '/mochi/mochi_rest.png',
  reward: '/mochi/mochi_reward.png',
}

// Dekorasi yang bisa dibeli di toko
const ITEMS = [
  { id: 'lamp', name: 'Lampu belajar', emoji: '💡', price: 20 },
  { id: 'plant', name: 'Tanaman', emoji: '🪴', price: 30 },
  { id: 'books', name: 'Tumpukan buku', emoji: '📚', price: 40 },
  { id: 'clock', name: 'Jam meja', emoji: '⏰', price: 50 },
  { id: 'frame', name: 'Bingkai foto', emoji: '🖼️', price: 60 },
  { id: 'yarn', name: 'Gulungan benang', emoji: '🧶', price: 80 },
  { id: 'cake', name: 'Kue stroberi', emoji: '🍰', price: 100 },
  { id: 'trophy', name: 'Piala fokus', emoji: '🏆', price: 150 },
]

// Kalimat-kalimat Mochi
const SAYS = {
  home: ['Halo! Ayo belajar bareng~', 'Hari ini mau fokus berapa lama?', 'Aku udah siap nih! 📚'],
  focus: [
    'Semangat! Aku nemenin kamu 📖',
    'Dikit lagi, kamu pasti bisa!',
    'HP-nya jangan dilirik dulu ya 👀',
    'Kamu keren banget hari ini ✨',
  ],
  paused: [
    'Yah... kok berhenti? 😢',
    'Ayo lanjut dong, jangan lama-lama...',
    'Aku capek nunggu nih 😤',
    'Resume yuk, tinggal dikit lagi!',
  ],
  rest: ['Zzz... istirahat yang cukup ya', 'Regangin badan dulu 🙆', 'Minum air dulu gih 💧'],
  done: ['Yeay! Kamu hebat! 🎉', 'Aku bangga sama kamu!', 'Nih bintang buat kamu ⭐'],
  failed: [
    'Kamu pergi ninggalin aku... 😢',
    'Aku sedih, jarum rajutku jatuh...',
    'Gapapa, coba lagi ya. Aku tunggu.',
  ],
  room: ['Ini kamarku! Bagus kan? 🏠', 'Beli dekorasi biar kamarku makin lucu~'],
}

// ===== PENYIMPANAN =====
function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || []
  } catch {
    return []
  }
}

function saveSession(session) {
  const list = loadSessions()
  list.push(session)
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(list))
}

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(ITEMS_KEY)) || []
  } catch {
    return []
  }
}

function saveItems(ids) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(ids))
}

// ===== HITUNGAN =====
function isToday(iso) {
  const d = new Date(iso)
  const n = new Date()
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}

// Koin sisa = semua poin yang didapat - harga barang yang sudah dibeli
function getCoins(owned) {
  const earned = loadSessions().reduce((a, s) => a + s.points, 0)
  const spent = owned.reduce((a, id) => a + (ITEMS.find((i) => i.id === id)?.price || 0), 0)
  return earned - spent
}

// Streak = berapa hari berturut-turut ada sesi
function calcStreak(list) {
  const days = new Set(list.map((s) => new Date(s.date).toDateString()))
  let streak = 0
  const d = new Date()
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1)
  while (days.has(d.toDateString())) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// ===== KARAKTER =====
// mood     : pose utama
// altMood  : pose selingan (muncul sebentar tiap 5 detik, misal angkat tangan)
// messages : kalimat di balon chat, ganti tiap 4 detik
function Mochi({ mood, size = 190, messages = [], altMood = null }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [showAlt, setShowAlt] = useState(false)

  useEffect(() => {
    setMsgIndex(0)
    if (messages.length < 2) return
    const id = setInterval(() => setMsgIndex((n) => (n + 1) % messages.length), 4000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood])

  useEffect(() => {
    setShowAlt(false)
    if (!altMood) return
    let t
    const id = setInterval(() => {
      setShowAlt(true)
      t = setTimeout(() => setShowAlt(false), 1300)
    }, 5000)
    return () => {
      clearInterval(id)
      clearTimeout(t)
    }
  }, [mood, altMood])

  const shown = showAlt && altMood ? altMood : mood

  return (
    <div className="mochi-wrap">
      {messages.length > 0 && (
        <div className="bubble" key={mood + msgIndex}>
          {messages[msgIndex % messages.length]}
        </div>
      )}
      <img key={shown} className={'mochi ' + shown} src={MOCHI[shown]} alt={`Mochi ${shown}`} width={size} />
    </div>
  )
}

// ===== APLIKASI UTAMA =====
export default function App() {
  // home | focus | done | failed | break | progress | room
  const [screen, setScreen] = useState('home')
  const [minutes, setMinutes] = useState(25)
  const [lastSession, setLastSession] = useState(null)
  const [owned, setOwned] = useState(loadItems)

  function handleFocusFinish() {
    const session = {
      date: new Date().toISOString(),
      minutes,
      points: minutes, // 1 poin per menit
    }
    saveSession(session)
    setLastSession(session)
    setScreen('done')
  }

  function handleBuy(item) {
    if (owned.includes(item.id) || getCoins(owned) < item.price) return
    const next = [...owned, item.id]
    saveItems(next)
    setOwned(next)
  }

  return (
    <div className="phone">
      {screen === 'home' && (
        <Home
          minutes={minutes}
          setMinutes={setMinutes}
          owned={owned}
          onStart={() => setScreen('focus')}
          onProgress={() => setScreen('progress')}
          onRoom={() => setScreen('room')}
        />
      )}

      {screen === 'focus' && (
        <Timer
          key="focus"
          mode="focus"
          totalSeconds={minutes * SECONDS_PER_MINUTE}
          onFinish={handleFocusFinish}
          onCancel={() => setScreen('home')}
          onInterrupt={() => setScreen('failed')}
        />
      )}

      {screen === 'done' && (
        <Done
          session={lastSession}
          onHome={() => setScreen('home')}
          onBreak={() => setScreen('break')}
        />
      )}

      {screen === 'failed' && (
        <Failed onRetry={() => setScreen('focus')} onHome={() => setScreen('home')} />
      )}

      {screen === 'break' && (
        <Timer
          key="break"
          mode="break"
          totalSeconds={BREAK_MINUTES * SECONDS_PER_MINUTE}
          onFinish={() => setScreen('home')}
          onCancel={() => setScreen('home')}
        />
      )}

      {screen === 'progress' && <Progress owned={owned} onBack={() => setScreen('home')} />}

      {screen === 'room' && (
        <Room owned={owned} onBuy={handleBuy} onBack={() => setScreen('home')} />
      )}
    </div>
  )
}

// ===== HALAMAN 1: HOME =====
function Home({ minutes, setMinutes, owned, onStart, onProgress, onRoom }) {
  const sessions = loadSessions()
  const todayCount = sessions.filter((s) => isToday(s.date)).length
  const totalMinutes = sessions.reduce((a, s) => a + s.minutes, 0)
  const streak = calcStreak(sessions)
  const coins = getCoins(owned)

  return (
    <div className="screen">
      <h1 className="logo">FocusPal 🌱</h1>
      <div className="coins">
        🔥 {streak} hari &nbsp;·&nbsp; ⭐ {coins} koin
      </div>
      <Mochi mood="idle" altMood="happy" messages={SAYS.home} />

      <div className="chips">
        {OPTIONS.map((m) => (
          <button
            key={m}
            className={'chip' + (minutes === m ? ' active' : '')}
            onClick={() => setMinutes(m)}
          >
            {m} menit
          </button>
        ))}
      </div>

      <button className="btn primary" onClick={onStart}>
        Start Focus
      </button>

      <div className="summary">
        Hari ini: <b>{todayCount}</b> sesi · Total: <b>{totalMinutes}</b> menit
      </div>

      <div className="row">
        <button className="btn ghost" onClick={onRoom}>
          Ruang Mochi 🏠
        </button>
        <button className="btn ghost" onClick={onProgress}>
          Progress
        </button>
      </div>
    </div>
  )
}

// ===== HALAMAN 2: FOCUS SESSION (dan juga istirahat) =====
function Timer({ mode, totalSeconds, onFinish, onCancel, onInterrupt }) {
  const [ms, setMs] = useState(totalSeconds * 1000)
  const [paused, setPaused] = useState(false)
  const msRef = useRef(ms) // sisa waktu terakhir (dipakai saat resume)
  const endRef = useRef(null) // waktu selesai

  // Countdown
  useEffect(() => {
    if (paused) return
    // Simpan waktu SELESAI, bukan kurangi detik satu-satu -> tetap akurat
    // walau tab di-background atau layar dikunci.
    const endTime = Date.now() + msRef.current
    endRef.current = endTime
    const id = setInterval(() => {
      const left = endTime - Date.now()
      if (left <= 0) {
        clearInterval(id)
        msRef.current = 0
        setMs(0)
        onFinish()
      } else {
        msRef.current = left
        setMs(left)
      }
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused])

  // Deteksi pergi dari tab/aplikasi saat fokus (versi web dari Deep Focus)
  useEffect(() => {
    if (mode !== 'focus' || paused) return
    let hiddenAt = null

    function onVisibility() {
      if (document.hidden) {
        hiddenAt = Date.now()
        return
      }
      if (hiddenAt === null) return
      const away = (Date.now() - hiddenAt) / 1000
      hiddenAt = null
      const timeIsUp = endRef.current !== null && Date.now() >= endRef.current
      // Kalau waktu sudah habis selama pergi, biarkan countdown menyelesaikan sesi
      if (!timeIsUp && away > AWAY_LIMIT_SECONDS) onInterrupt()
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, paused])

  const secs = Math.ceil(ms / 1000)
  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  const isBreak = mode === 'break'
  const mood = isBreak ? 'rest' : paused ? 'disturbed' : 'focus'
  const messages = isBreak ? SAYS.rest : paused ? SAYS.paused : SAYS.focus
  const altMood = isBreak ? null : paused ? null : 'happy'

  return (
    <div className="screen">
      <h2>{isBreak ? 'Istirahat' : 'Focus Session'}</h2>
      <Mochi mood={mood} altMood={altMood} messages={messages} />
      <div className="time">
        {mm}:{ss}
      </div>

      <div className="row">
        <button className="btn primary" onClick={() => setPaused(!paused)}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="btn ghost" onClick={onCancel}>
          {isBreak ? 'Skip' : 'End Session'}
        </button>
      </div>
    </div>
  )
}

// ===== HALAMAN 3: SESSION COMPLETED =====
function Done({ session, onHome, onBreak }) {
  return (
    <div className="screen">
      <h2>Sesi berhasil! 🎉</h2>
      <Mochi mood="reward" altMood="happy" messages={SAYS.done} />
      <p className="caption">Durasi fokus: {session.minutes} menit</p>
      <div className="reward">+{session.points} poin ⭐</div>

      <div className="row">
        <button className="btn primary" onClick={onHome}>
          Kembali
        </button>
        <button className="btn ghost" onClick={onBreak}>
          Istirahat {BREAK_MINUTES} menit
        </button>
      </div>
    </div>
  )
}

// ===== HALAMAN: SESI GAGAL (kabur dari aplikasi) =====
function Failed({ onRetry, onHome }) {
  return (
    <div className="screen">
      <h2>Sesi terhenti 😢</h2>
      <Mochi mood="disturbed" messages={SAYS.failed} />
      <p className="caption">
        Kamu meninggalkan aplikasi lebih dari {AWAY_LIMIT_SECONDS} detik, jadi sesi ini nggak dapat poin.
      </p>
      <div className="row">
        <button className="btn primary" onClick={onRetry}>
          Coba lagi
        </button>
        <button className="btn ghost" onClick={onHome}>
          Kembali
        </button>
      </div>
    </div>
  )
}

// ===== HALAMAN: RUANG MOCHI + TOKO =====
function Room({ owned, onBuy, onBack }) {
  const coins = getCoins(owned)

  return (
    <div className="screen top">
      <h2>Ruang Mochi 🏠</h2>
      <div className="coins">⭐ {coins} koin</div>

      <div className="room">
        <div className="shelf">
          {owned.length === 0 && <span className="empty">Kamar masih kosong...</span>}
          {owned.map((id) => (
            <span key={id} className="deco">
              {ITEMS.find((i) => i.id === id)?.emoji}
            </span>
          ))}
        </div>
        <Mochi mood="idle" altMood="happy" size={120} messages={SAYS.room} />
      </div>

      <h3>Toko</h3>
      <div className="shop">
        {ITEMS.map((item) => {
          const has = owned.includes(item.id)
          const canBuy = coins >= item.price
          return (
            <div className="item" key={item.id}>
              <span className="emoji">{item.emoji}</span>
              <div className="info">
                <b>{item.name}</b>
                <small>⭐ {item.price}</small>
              </div>
              <button
                className="btn small primary"
                disabled={has || !canBuy}
                onClick={() => onBuy(item)}
              >
                {has ? 'Dimiliki' : canBuy ? 'Beli' : 'Kurang'}
              </button>
            </div>
          )
        })}
      </div>

      <button className="btn ghost" onClick={onBack}>
        Kembali
      </button>
    </div>
  )
}

// ===== HALAMAN 4: PROGRESS =====
function Progress({ owned, onBack }) {
  const list = loadSessions().reverse()
  const totalMinutes = list.reduce((a, s) => a + s.minutes, 0)
  const totalPoints = list.reduce((a, s) => a + s.points, 0)
  const todayCount = list.filter((s) => isToday(s.date)).length
  const streak = calcStreak(list)
  const coins = getCoins(owned)

  return (
    <div className="screen top">
      <h2>Progress</h2>
      <Mochi mood="happy" size={110} />

      <div className="stats">
        <div className="stat"><b>{list.length}</b><span>Total sesi</span></div>
        <div className="stat"><b>{totalMinutes}</b><span>Total menit</span></div>
        <div className="stat"><b>{totalPoints}</b><span>Total poin ⭐</span></div>
        <div className="stat"><b>{todayCount}</b><span>Sesi hari ini</span></div>
        <div className="stat"><b>{streak} 🔥</b><span>Streak hari</span></div>
        <div className="stat"><b>{coins}</b><span>Koin sisa</span></div>
      </div>

      <h3>Riwayat</h3>
      <div className="history">
        {list.length === 0 && <p className="caption">Belum ada sesi.</p>}
        {list.map((s, i) => {
          const d = new Date(s.date)
          return (
            <div className="hrow" key={i}>
              <span>🌿 {s.minutes} menit · +{s.points} poin</span>
              <small>
                {d.toLocaleDateString('id-ID')}{' '}
                {d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </small>
            </div>
          )
        })}
      </div>

      <button className="btn ghost" onClick={onBack}>
        Kembali
      </button>
    </div>
  )
}