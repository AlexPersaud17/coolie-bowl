import { Fragment, type FormEvent, useEffect, useMemo, useState } from 'react'
import { onValue, ref, runTransaction, set } from 'firebase/database'
import { db } from './firebase'
import landingImage from './assets/landing_page.jpg'
import seahawksLogo from './assets/Seattle_Seahawks_logo.svg'
import patriotsLogo from './assets/New_England_Patriots_logo.svg'

const numbers = Array.from({ length: 10 }, (_, index) => index)
const placeholderAxis = Array.from({ length: 10 }, () => '?')

const randomColor = () => {
  const toHex = (value: number) => value.toString(16).padStart(2, '0')
  const r = Math.floor(120 + Math.random() * 120)
  const g = Math.floor(120 + Math.random() * 120)
  const b = Math.floor(120 + Math.random() * 120)
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

type AxisData = {
  top?: number[]
  left?: number[]
}

type CellData = {
  name: string
  color: string
  textColor: string
}

const MAX_NAME_LENGTH = 10

type Winners = {
  q1?: string
  q2?: string
  q3?: string
  q4?: string
}

type Scores = {
  q1?: string
  q2?: string
  q3?: string
  q4?: string
}

function App() {
  const [board, setBoard] = useState<Record<string, CellData>>({})
  const [axes, setAxes] = useState<AxisData>({})
  const [stage, setStage] = useState<'cover' | 'board'>('cover')
  const [playerName, setPlayerName] = useState('')
  const [playerColor, setPlayerColor] = useState(() => randomColor())
  const [playerTextColor, setPlayerTextColor] = useState('#0f172a')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [locks, setLocks] = useState<Record<string, boolean>>({})
  const [pendingSelections, setPendingSelections] = useState<
    Record<string, true>
  >({})
  const [authStep, setAuthStep] = useState<'password' | 'player'>('password')
  const [passwordInput, setPasswordInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [colorInput, setColorInput] = useState(() => randomColor())
  const [textColorInput, setTextColorInput] = useState('#0f172a')
  const [authError, setAuthError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [maxSelections, setMaxSelections] = useState<number | null>(null)
  const [maxInput, setMaxInput] = useState('10')
  const [boardLocked, setBoardLocked] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [adminAuthError, setAdminAuthError] = useState('')
  const [winners, setWinners] = useState<Winners>({})
  const [scores, setScores] = useState<Scores>({})

  useEffect(() => {
    const boardRef = ref(db, 'board')
    const unsubscribe = onValue(boardRef, (snapshot) => {
      const data = snapshot.val() as Record<string, CellData | string> | null
      if (!data) {
        setBoard({})
        return
      }
      const normalized: Record<string, CellData> = {}
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'string') {
          normalized[key] = {
            name: value,
            color: '#86efac',
            textColor: '#0f172a',
          }
          return
        }
        if (value && typeof value === 'object' && 'name' in value) {
          normalized[key] = {
            name: value.name,
            color: value.color || '#86efac',
            textColor: value.textColor || '#0f172a',
          }
        }
      })
      setBoard(normalized)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const axesRef = ref(db, 'axes')
    const unsubscribe = onValue(axesRef, (snapshot) => {
      const data = snapshot.val() as AxisData | null
      setAxes(data ?? {})
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const locksRef = ref(db, 'locks')
    const unsubscribe = onValue(locksRef, (snapshot) => {
      const data = snapshot.val() as Record<string, boolean> | null
      setLocks(data ?? {})
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const settingsRef = ref(db, 'settings/maxSelections')
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val() as number | null
      if (typeof data === 'number' && !Number.isNaN(data)) {
        setMaxSelections(data)
        setMaxInput(String(data))
        return
      }
      setMaxSelections(null)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const lockRef = ref(db, 'settings/boardLocked')
    const unsubscribe = onValue(lockRef, (snapshot) => {
      const data = snapshot.val() as boolean | null
      setBoardLocked(Boolean(data))
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const winnersRef = ref(db, 'settings/winners')
    const unsubscribe = onValue(winnersRef, (snapshot) => {
      const data = snapshot.val() as Winners | null
      setWinners(data ?? {})
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const scoresRef = ref(db, 'settings/scores')
    const unsubscribe = onValue(scoresRef, (snapshot) => {
      const data = snapshot.val() as Scores | null
      setScores(data ?? {})
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!playerName) return
    const locked = Boolean(locks[playerName])
    setIsLocked(locked)
  }, [locks, playerName])

  useEffect(() => {
    if (!playerName) return
    const existing = Object.values(board).find(
      (cell) => cell.name === playerName
    )
    if (existing) {
      setPlayerColor(existing.color)
      setPlayerTextColor(existing.textColor)
    }
  }, [board, playerName])

  useEffect(() => {
    if (boardLocked) {
      setStage('board')
      setAuthError('')
      setActionMessage('')
    }
  }, [boardLocked])

  const filledCount = useMemo(() => Object.keys(board).length, [board])
  const isBoardFull = filledCount === 100
  const topAxis = axes.top && axes.top.length === 10 ? axes.top : placeholderAxis
  const leftAxis = axes.left && axes.left.length === 10 ? axes.left : placeholderAxis
  const maxAllowed = maxSelections ?? 10
  const savedCount = useMemo(() => {
    if (!playerName) return 0
    return Object.values(board).filter((cell) => cell.name === playerName).length
  }, [board, playerName])
  const nameCounts = useMemo(() => {
    const counts = new Map<string, number>()
    Object.values(board).forEach((cell) => {
      counts.set(cell.name, (counts.get(cell.name) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.name.localeCompare(b.name)))
  }, [board])
  const pendingCount = useMemo(
    () => Object.keys(pendingSelections).length,
    [pendingSelections]
  )
  const totalSelected = savedCount + pendingCount
  const selectionsLeft = Math.max(0, maxAllowed - totalSelected)

  const formatName = (name: string) =>
    name
      ? name.charAt(0).toUpperCase() + name.slice(1, MAX_NAME_LENGTH)
      : ''

  const displayNameClass = () => 'text-[11px] sm:text-xs'

  const displayNameSize = (name: string) => {
    if (name.length <= 4) return undefined
    const size = Math.max(7, 11 - 0.6 * (name.length - 4))
    return `${size}px`
  }

  const handleClaim = (row: number, col: number) => {
    const key = `${row}-${col}`
    const existing = board[key]?.name

    if (boardLocked && !isAdmin) {
      setActionMessage('The board is locked.')
      return
    }

    if (isAdmin) {
      if (!existing) {
        setActionMessage('Admins can only remove selections.')
        return
      }
      const confirmRemove = window.confirm(
        `Remove ${existing} from this box?`
      )
      if (!confirmRemove) return
      runTransaction(ref(db, `board/${key}`), (current) => {
        if (!current) return current
        return null
      }).then(() => {
        setActionMessage('Selection removed.')
      })
      return
    }

    if (!playerName) {
      setActionMessage('Enter your name to select a box.')
      return
    }

    if (existing && !isAdmin) {
      if (existing === playerName) {
        runTransaction(ref(db, `board/${key}`), (current) => {
          if (current && typeof current === 'object' && 'name' in current) {
            if (current.name === playerName) return null
          }
          return current
        }).then((result) => {
          if (result.committed) {
            setActionMessage('Selection removed.')
          } else {
            setActionMessage('Unable to remove selection.')
          }
        })
        return
      }
      setActionMessage(`That box is already taken by ${existing}.`)
      return
    }

    setPendingSelections((prev) => {
      if (prev[key]) {
        const next = { ...prev }
        delete next[key]
        setActionMessage('Selection removed.')
        return next
      }
      if (totalSelected >= maxAllowed) {
        setActionMessage(`Selection limit reached (${maxAllowed}).`)
        return prev
      }
      setActionMessage('Selection added. Lock in to save.')
      return { ...prev, [key]: true }
    })
  }

  const handlePasswordSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const sitePassword = 'gosports'
    const adminPassword = 'iamadmin'
    const password = passwordInput.trim().toLowerCase()
    if (!password) {
      setAuthError('Password is required.')
      return
    }
    const adminMatch = adminPassword && password === adminPassword.toLowerCase()
    const siteMatch = sitePassword && password === sitePassword.toLowerCase()
    if (!adminMatch && !siteMatch) {
      setAuthError('Incorrect password.')
      return
    }
    setAuthError('')
    setIsAdmin(adminMatch)
    if (adminMatch) {
      setPlayerName('')
      setStage('board')
      return
    }
    setAuthStep('player')
  }

  const handleAdminLogin = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const adminPassword = 'iamadmin'
    const password = adminPasswordInput.trim().toLowerCase()
    if (!password) {
      setAdminAuthError('Admin password required.')
      return
    }
    if (password !== adminPassword.toLowerCase()) {
      setAdminAuthError('Incorrect admin password.')
      return
    }
    setAdminAuthError('')
    setIsAdmin(true)
    setShowAdminLogin(false)
    setAdminPasswordInput('')
  }

  const handlePlayerSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const name = formatName(nameInput.trim())
    if (!name) {
      setAuthError('Name is required.')
      return
    }
    setAuthError('')
    const existing = Object.values(board).find((cell) => cell.name === name)
    const resolvedColor = existing?.color ?? colorInput
    const resolvedTextColor = existing?.textColor ?? textColorInput
    setPlayerName(name)
    setPlayerColor(resolvedColor)
    setPlayerTextColor(resolvedTextColor)
    setColorInput(resolvedColor)
    setTextColorInput(resolvedTextColor)
    setStage('board')
  }

  const handleLock = async () => {
    if (!playerName) return
    if (Object.keys(pendingSelections).length === 0) {
      setActionMessage('Select at least one box before locking in.')
      return
    }
    const confirmLock = window.confirm(
      'Lock in your selections? You will not be able to change them.'
    )
    if (!confirmLock) return
    const keys = Object.keys(pendingSelections)
    const committedKeys: string[] = []
    const conflicts: string[] = []

    await Promise.all(
      keys.map(async (key) => {
        const result = await runTransaction(ref(db, `board/${key}`), (current) => {
          if (current) return current
          return {
            name: playerName,
            color: playerColor,
            textColor: playerTextColor,
          }
        })

        if (result.committed) {
          committedKeys.push(key)
        } else {
          conflicts.push(key)
        }
      })
    )

    if (committedKeys.length > 0) {
      await set(ref(db, `locks/${playerName}`), true)
    }

    if (conflicts.length > 0) {
      setActionMessage(
        `${committedKeys.length} saved, ${conflicts.length} already taken.`
      )
    } else {
      setActionMessage('Selections saved.')
    }

    setPendingSelections((prev) => {
      if (committedKeys.length === 0) return prev
      const next = { ...prev }
      committedKeys.forEach((key) => {
        delete next[key]
      })
      return next
    })
  }

  const handleGenerateAxes = () => {
    if (!isAdmin) return
    if (!isBoardFull) {
      window.alert('Fill all boxes before generating numbers.')
      return
    }
    const shuffledTop = shuffleNumbers()
    const shuffledLeft = shuffleNumbers()
    set(ref(db, 'axes/top'), shuffledTop)
    set(ref(db, 'axes/left'), shuffledLeft)
  }

  const handleResetBoard = () => {
    if (!isAdmin) return
    const confirmReset = window.confirm(
      'Reset the board, locks, and numbers? This cannot be undone.'
    )
    if (!confirmReset) return
    set(ref(db, 'board'), null)
    set(ref(db, 'locks'), null)
    set(ref(db, 'axes'), null)
    set(ref(db, 'settings/winners'), null)
    setPendingSelections({})
  }

  const handleToggleBoardLock = async () => {
    if (!isAdmin) return
    await set(ref(db, 'settings/boardLocked'), !boardLocked)
    setActionMessage(boardLocked ? 'Board unlocked.' : 'Board locked.')
  }

  const handleWinnerUpdate = async (quarter: keyof Winners, name: string) => {
    if (!isAdmin) return
    await set(ref(db, `settings/winners/${quarter}`), name || null)
    setActionMessage('Winner updated.')
  }

  const handleScoreUpdate = async (quarter: keyof Scores, score: string) => {
    if (!isAdmin) return
    await set(ref(db, `settings/scores/${quarter}`), score || null)
    setActionMessage('Score updated.')
  }

  const handleSaveMax = async () => {
    if (!isAdmin) return
    const value = Number(maxInput)
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      setActionMessage('Max selections must be between 1 and 100.')
      return
    }
    await set(ref(db, 'settings/maxSelections'), value)
    setActionMessage('Max selections updated.')
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {stage === 'cover' && !boardLocked ? (
        <div className="relative flex min-h-screen w-full items-center justify-center">
          <img
            src={landingImage}
            alt="Super Bowl Boxes"
            className="h-screen w-full object-contain"
          />
          <div className="absolute inset-0 flex items-end justify-center px-6 pb-10">
            <div className="w-full max-w-xs space-y-3 rounded-2xl bg-white/90 p-4 shadow-xl backdrop-blur">
              {authStep === 'password' ? (
                <form className="space-y-3" onSubmit={handlePasswordSubmit}>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(event) => {
                      setPasswordInput(event.target.value)
                      if (authError) setAuthError('')
                    }}
                    placeholder="Site password"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-slate-800"
                  >
                    Enter
                  </button>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={handlePlayerSubmit}>
                  <input
                    type="text"
                    value={nameInput}
                    maxLength={MAX_NAME_LENGTH}
                    onChange={(event) => setNameInput(event.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                  />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Max {MAX_NAME_LENGTH} characters
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Cell color
                      </label>
                      <input
                        type="color"
                        value={colorInput}
                        onChange={(event) => setColorInput(event.target.value)}
                        className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Text color
                      </label>
                      <input
                        type="color"
                        value={textColorInput}
                        onChange={(event) => setTextColorInput(event.target.value)}
                        className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Preview
                    </div>
                    <div className="mt-2 flex items-center justify-center">
                      <div
                        className={[
                          'flex aspect-square w-9 items-center justify-center rounded-lg border border-slate-300 text-center font-semibold leading-tight break-words sm:w-10',
                          displayNameClass(),
                        ].join(' ')}
                        style={{
                          backgroundColor: colorInput,
                          color: textColorInput,
                          fontSize: displayNameSize(formatName(nameInput.trim())),
                        }}
                      >
                        {formatName(nameInput.trim()) || 'Name'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-slate-800"
                  >
                    Continue
                  </button>
                </form>
              )}
              {authError ? (
                <p className="text-xs font-semibold text-red-600">{authError}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="min-h-screen bg-cover bg-center"
          style={{ backgroundImage: `url(${landingImage})` }}
        >
          <div className="min-h-screen bg-white/85">
            <div className="mx-auto w-full max-w-md p-4">
          <header className="mb-4 rounded-3xl bg-white/90 p-4 text-center shadow-xl backdrop-blur-md">
            <h1 className="text-2xl font-bold">Coolie Bowl LX Boxes</h1>
            <p className="mt-1 text-sm text-slate-600">
              Select any open box. Colored boxes are taken.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Ayuh good luck.
            </p>
          </header>

          <div className="mb-4 rounded-2xl bg-white/80 p-4 text-sm text-slate-700 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Cash Prizes</span>
              <span>$3 per box</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                Q1: $60
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                Q2: $80
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                Q3: $60
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                Q4: $100
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600 backdrop-blur-sm">
              <p className="font-semibold uppercase tracking-wide text-slate-500">
                Send payment via Zelle
              </p>
              <p className="mt-1">
                Email: <span className="font-semibold">alrpersaud17@gmail.com</span>
              </p>
              <p>
                Phone: <span className="font-semibold">347-409-1882</span>
              </p>
            </div>
          </div>

          {boardLocked ? (
            <div className="mb-4 rounded-2xl bg-slate-900/90 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm backdrop-blur-sm">
              Board Locked - View Only
            </div>
          ) : null}

          {!isAdmin && !boardLocked ? (
            <div className="mb-4 rounded-2xl bg-white/80 px-4 py-2 text-center text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-sm">
              Selections left: {selectionsLeft} of {maxAllowed}
              {actionMessage ? ` • ${actionMessage}` : ''}
            </div>
          ) : null}

          {actionMessage && (isAdmin || boardLocked) ? (
            <div className="mb-4 rounded-2xl bg-white/80 px-4 py-2 text-center text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-sm">
              {actionMessage}
            </div>
          ) : null}

          {isAdmin ? (
            <div className="mb-4 space-y-3">
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Max selections</span>
                <span>{maxSelections ?? 10}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={maxInput}
                  onChange={(event) => setMaxInput(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveMax}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800"
                >
                  Save
                </button>
              </div>
              <button
                type="button"
                onClick={handleToggleBoardLock}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {boardLocked ? 'Unlock Board' : 'Lock Board'}
              </button>
            </div>
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Player Summary
                </div>
                <div className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-slate-700">
                  {nameCounts.length === 0 ? (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                      No selections yet.
                    </div>
                  ) : (
                    nameCounts.map((entry) => (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="font-semibold">{entry.name}</span>
                        <span>{entry.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Set Winners
                </div>
                {(['q1', 'q2', 'q3', 'q4'] as Array<keyof Winners>).map(
                  (quarter) => (
                    <div key={quarter} className="mt-3 space-y-2">
                      <div className="text-[10px] font-semibold uppercase text-slate-500">
                        {quarter.toUpperCase()}
                      </div>
                      <input
                        type="text"
                        value={scores[quarter as keyof Scores] ?? ''}
                        onChange={(event) =>
                          handleScoreUpdate(quarter, event.target.value)
                        }
                        placeholder="Score (e.g. 14-10)"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-slate-500 focus:outline-none"
                      />
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-slate-500 focus:outline-none"
                        value={winners[quarter] ?? ''}
                        onChange={(event) =>
                          handleWinnerUpdate(quarter, event.target.value)
                        }
                      >
                        <option value="">TBD winner</option>
                        {nameCounts.map((entry) => (
                          <option key={entry.name} value={entry.name}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : null}

          {!isAdmin && boardLocked ? (
            <div className="mb-4 rounded-2xl bg-white/80 p-3 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setShowAdminLogin((prev) => !prev)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Admin Access
              </button>
              {showAdminLogin ? (
                <form className="mt-3 space-y-2" onSubmit={handleAdminLogin}>
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(event) => {
                      setAdminPasswordInput(event.target.value)
                      if (adminAuthError) setAdminAuthError('')
                    }}
                    placeholder="Admin password"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800"
                  >
                    Unlock Admin Controls
                  </button>
                  {adminAuthError ? (
                    <p className="text-xs font-semibold text-red-600">
                      {adminAuthError}
                    </p>
                  ) : null}
                </form>
              ) : null}
            </div>
          ) : null}
          <div className="mb-4 flex flex-col gap-2">
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={handleGenerateAxes}
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Generate Random Numbers
                </button>
                <button
                  type="button"
                  onClick={handleResetBoard}
                  className="w-full rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-red-700 shadow-sm transition hover:bg-red-100"
                >
                  Reset Board
                </button>
              </>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-12 shrink-0" />
            <div className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#002244]/90 via-[#69BE28]/90 to-[#A5ACAF]/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm backdrop-blur-sm">
                <span>Seattle Seahawks</span>
                <img
                  src={seahawksLogo}
                  alt="Seattle Seahawks logo"
                  className="h-8 w-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-[#002244]/90 via-[#C60C30]/90 to-[#B0B7BC]/90 text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-sm backdrop-blur-sm">
                <div className="flex h-full flex-col items-center justify-center gap-3 py-2">
                  <img
                    src={patriotsLogo}
                    alt="New England Patriots logo"
                    className="h-8 w-8 -rotate-90"
                  />
                  <span className="rotate-180 [writing-mode:vertical-rl]">
                    New England Patriots
                  </span>
                </div>
              </div>
              <div className="grid flex-1 grid-cols-11 gap-px rounded-2xl bg-slate-400/40 p-px shadow-sm backdrop-blur-sm">
                <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-[#002244]/45 via-[#69BE28]/45 to-[#C60C30]/45 text-xs font-semibold text-slate-700" />

            {topAxis.map((number, index) => (
              <div
                key={`top-${index}`}
                className="flex aspect-square items-center justify-center bg-gradient-to-br from-[#002244]/45 via-[#69BE28]/45 to-[#A5ACAF]/45 text-xs font-semibold text-slate-700"
              >
                {number}
              </div>
            ))}

                {leftAxis.map((row, rowIndex) => (
                  <Fragment key={`row-${rowIndex}`}>
                    <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-[#002244]/45 via-[#C60C30]/45 to-[#B0B7BC]/45 text-xs font-semibold text-slate-700">
                      {row}
                    </div>

                    {numbers.map((col) => {
                      const key = `${rowIndex}-${col}`
                      const cell = board[key]
                      const pending = Boolean(pendingSelections[key])
                      const name = cell?.name ?? (pending ? playerName : '')
                      const isTaken = Boolean(cell?.name)
                      const hasSelection = Boolean(name)
                      const color = cell?.color ?? (pending ? playerColor : undefined)
                  const textColor =
                    cell?.textColor ?? (pending ? playerTextColor : undefined)
                  const fontSize = displayNameSize(name)

                      return (
                        <button
                          key={key}
                          type="button"
                        className={[
                          'flex aspect-square items-center justify-center border border-slate-300/60 px-1 text-center leading-tight text-slate-700 transition break-words bg-white/45 backdrop-blur-sm',
                          isTaken
                            ? 'cursor-default font-semibold text-slate-900'
                            : 'hover:bg-white/90',
                          pending ? 'ring-2 ring-slate-400/50' : '',
                          displayNameClass(),
                        ].join(' ')}
                          onClick={() => handleClaim(rowIndex, col)}
                          style={
                            hasSelection
                              ? {
                                  backgroundColor: color,
                                  color: textColor,
                                  fontSize,
                                }
                              : undefined
                          }
                        >
                          {name ?? ''}
                        </button>
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>

          {!isAdmin && !boardLocked ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleLock}
                className={[
                  'w-full rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide transition',
                  isLocked
                    ? 'bg-red-800 text-white hover:bg-red-700'
                    : 'bg-red-800 text-white hover:bg-red-700',
                ].join(' ')}
              >
                {isLocked ? 'Save Updated Selections' : 'Lock In Selections'}
              </button>
            </div>
          ) : null}

          <div className="mt-4 text-center text-xs text-slate-500">
            {filledCount}/100 boxes filled
            {isBoardFull ? ' • All boxes claimed' : ''}
          </div>

          <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm text-slate-700 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Quarter Winners</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
              {(['q1', 'q2', 'q3', 'q4'] as Array<keyof Winners>).map(
                (quarter) => (
                  <div
                    key={quarter}
                    className="rounded-xl bg-slate-50 px-3 py-2 text-center"
                  >
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                      {quarter.toUpperCase()} Score
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      {scores[quarter as keyof Scores] ?? 'TBD'}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
                      Winner
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      {winners[quarter] ?? 'TBD'}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

function shuffleNumbers() {
  const array = [...numbers]
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
