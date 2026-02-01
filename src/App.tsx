import { Fragment, useEffect, useState } from 'react'
import { onValue, ref, set } from 'firebase/database'
import { db } from './firebase'

const numbers = Array.from({ length: 10 }, (_, index) => index)

function App() {
  const [board, setBoard] = useState<Record<string, string>>({})

  useEffect(() => {
    const boardRef = ref(db, 'board')
    const unsubscribe = onValue(boardRef, (snapshot) => {
      const data = snapshot.val() as Record<string, string> | null
      setBoard(data ?? {})
    })

    return () => unsubscribe()
  }, [])

  const handleClaim = (row: number, col: number) => {
    const key = `${row}-${col}`
    if (board[key]) return
    const name = window.prompt('Enter your name')
    const trimmed = name?.trim()
    if (!trimmed) return
    set(ref(db, `board/${key}`), trimmed)
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto w-full max-w-md p-4">
        <header className="mb-4 text-center">
          <h1 className="text-2xl font-bold">Super Bowl Squares</h1>
          <p className="mt-1 text-sm text-slate-600">
            Tap a square to claim your spot.
          </p>
        </header>

        <div className="grid grid-cols-11 gap-px rounded-lg bg-slate-300 p-px shadow-sm">
          <div className="flex aspect-square items-center justify-center bg-slate-100 text-xs font-semibold text-slate-600" />

          {numbers.map((number) => (
            <div
              key={`top-${number}`}
              className="flex aspect-square items-center justify-center bg-slate-100 text-xs font-semibold text-slate-700"
            >
              {number}
            </div>
          ))}

          {numbers.map((row) => (
            <Fragment key={`row-${row}`}>
              <div className="flex aspect-square items-center justify-center bg-slate-100 text-xs font-semibold text-slate-700">
                {row}
              </div>

              {numbers.map((col) => {
                const key = `${row}-${col}`
                const name = board[key]
                const isTaken = Boolean(name)

                return (
                  <button
                    key={key}
                    type="button"
                    className={[
                      'flex aspect-square items-center justify-center border border-slate-300 bg-white px-1 text-center text-[10px] leading-tight text-slate-700 transition sm:text-xs',
                      isTaken
                        ? 'cursor-default bg-green-200 font-semibold text-green-900'
                        : 'hover:bg-slate-50',
                    ].join(' ')}
                    onClick={() => handleClaim(row, col)}
                    disabled={isTaken}
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
  )
}

export default App
