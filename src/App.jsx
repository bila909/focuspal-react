import { useEffect, useRef, useState } from 'react'

// ===== PENGATURAN =====
// Ubah ke 1 untuk tes cepat (25 "menit" jadi 25 detik). Kembalikan ke 60 setelah tes.
const SECONDS_PER_MINUTE = 60
const BREAK_MINUTES = 5
const OPTIONS = [15, 25, 45]
const STORAGE_KEY = 'focuspal_sessions'

const MOCHI = {
  idle: '/mochi/mochi_idle.png',
  focus: '/mochi/mochi_focus.png',
  happy: '/mochi/mochi_happy.png',
  disturbed: '/mochi/mochi_disturbed.png',
  rest: '/mochi/mochi_rest.png',
  reward: '/mochi/mochi_reward.png',
}

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
}

// ===== PENYIMPANAN (riwayat sesi) =====
function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function saveSession(session) {
  const list = loadSessions()
  list.push(session)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

function isToday(iso) {
  const d = new Date(iso)
  const n = new Date()
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}

// ===== KARAKTER =====
// mood     : pose utama
// altMood  : pose selingan (muncul sebentar tiap 5 detik, misal angkat tangan)
// messages : kalimat di balon chat, ganti tiap 4 detik
function Mochi({ mood, size = 190, messages = [], altMood = null }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [showAlt, setShowAlt] = useState(false)

  // Ganti kalimat
  useEffect(() => {
    setMsgIndex(0)
    if (messages.length < 2) return
    const id = setInterval(() => setMsgIndex((n) => (n + 1) % messages.length), 4000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood])

  // Ganti pose sebentar
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
  const [screen, setScreen] = useState('home') // home | focus | done | break | progress
  const [minutes, setMinutes] = useState(25)
  const [lastSession, setLastSession] = useState(null)

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

  return (
    <div className="phone">
      {screen === 'home' && (
        <Home
          minutes={minutes}
          setMinutes={setMinutes}
          onStart={() => setScreen('focus')}
          onProgress={() => setScreen('progress')}
        />
      )}

      {screen === 'focus' && (
        <Timer
          key="focus"
          mode="focus"
          totalSeconds={minutes * SECONDS_PER_MINUTE}
          onFinish={handleFocusFinish}
          onCancel={() => setScreen('home')}
        />
      )}

      {screen === 'done' && (
        <Done
          session={lastSession}
          onHome={() => setScreen('home')}
          onBreak={() => setScreen('break')}
        />
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

      {screen === 'progress' && <Progress onBack={() => setScreen('home')} />}
    </div>
  )
}

// ===== HALAMAN 1: HOME =====
function Home({ minutes, setMinutes, onStart, onProgress }) {
  const sessions = loadSessions()
  const todayCount = sessions.filter((s) => isToday(s.date)).length
  const totalMinutes = sessions.reduce((a, s) => a + s.minutes, 0)

  return (
    <div className="screen">
      <h1 className="logo">FocusPal 🌱</h1>
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

      <button className="btn ghost" onClick={onProgress}>
        Lihat Progress
      </button>
    </div>
  )
}

// ===== HALAMAN 2: FOCUS SESSION (dan juga istirahat) =====
function Timer({ mode, totalSeconds, onFinish, onCancel }) {
  const [ms, setMs] = useState(totalSeconds * 1000)
  const [paused, setPaused] = useState(false)
  const msRef = useRef(ms) // sisa waktu terakhir (dipakai saat resume)

  useEffect(() => {
    if (paused) return
    // Simpan waktu SELESAI, bukan kurangi detik satu-satu -> tetap akurat
    // walau tab di-background atau layar dikunci.
    const endTime = Date.now() + msRef.current
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

// ===== HALAMAN 4: PROGRESS =====
function Progress({ onBack }) {
  const list = loadSessions().reverse()
  const totalMinutes = list.reduce((a, s) => a + s.minutes, 0)
  const totalPoints = list.reduce((a, s) => a + s.points, 0)
  const todayCount = list.filter((s) => isToday(s.date)).length

  return (
    <div className="screen top">
      <h2>Progress</h2>
      <Mochi mood="happy" size={110} />

      <div className="stats">
        <div className="stat"><b>{list.length}</b><span>Total sesi</span></div>
        <div className="stat"><b>{totalMinutes}</b><span>Total menit</span></div>
        <div className="stat"><b>{totalPoints}</b><span>Total poin ⭐</span></div>
        <div className="stat"><b>{todayCount}</b><span>Sesi hari ini</span></div>
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