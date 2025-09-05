import React, { useState, useRef, useEffect } from 'react';
import "./index.css";
function App() {
  const [solves, setSolves] = useState(() => {
    const saved = localStorage.getItem('solves');
    return saved ? JSON.parse(saved) : [];    
  });

  // Helper to calculate average from array of times
  const getAverage = (arr) => {
    if (!arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  // Get last N solves
  const getLastTimes = (n) => solves.slice(0, n).map(s => s.time);

  const ao5 = solves.length >= 5 ? getAverage(getLastTimes(5)) : null;
  const ao12 = solves.length >= 12 ? getAverage(getLastTimes(12)) : null;
  const ao100 = solves.length >= 100 ? getAverage(getLastTimes(100)) : null;
  const overall = solves.length > 0 ? getAverage(solves.map(s => s.time)) : null;

  // Scramble generator for 3x3
  const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
  const modifiers = ['', "'", '2'];
  function generateScramble(length = 20) {
    let scramble = [];
    let prevMove = '';
    for (let i = 0; i < length; i++) {
      let move;
      do {
        move = moves[Math.floor(Math.random() * moves.length)];
      } while (move === prevMove);
      prevMove = move;
      scramble.push(move + modifiers[Math.floor(Math.random() * modifiers.length)]);
    }
    return scramble.join(' ');
  }

  const [scramble, setScramble] = useState(generateScramble());
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [fontColor, setFontColor] = useState('#222');
  const [spaceHoldStart, setSpaceHoldStart] = useState(null);
  const [lastSolve, setLastSolve] = useState(0);
  const timeRef = useRef(0);
  const intervalRef = useRef(null);
  const greenTimeoutRef = useRef(null);
  const spacePressedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !spacePressedRef.current) {
        spacePressedRef.current = true;
        setFontColor('red');

        if (isRunning) {
          // Capture current time before stopping/resetting
          const solveTime = timeRef.current;
          setSolves((prev) => {
            const updated = [
              {
                time: solveTime,
                scramble,
                date: new Date().toISOString(),
              },
              ...prev,
            ];
            localStorage.setItem('solves', JSON.stringify(updated));
            return updated;
          });
          setIsRunning(false); // Stop timer on space down
          setLastSolve(solveTime); // Save last solve time
        }
        setSpaceHoldStart(Date.now());
        greenTimeoutRef.current = greenTimeoutRef + setTimeout(() => {
          setFontColor('green');
        }, 2000);
        // Only reset timer to 0 if not running (i.e. after stop)
        if (!isRunning) {
          setTime(0);
        }
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space' && spacePressedRef.current) {
        spacePressedRef.current = false;
        clearTimeout(greenTimeoutRef.current);
        const holdDuration = Date.now() - spaceHoldStart;
        if (holdDuration >= 2000) {
          setIsRunning(true); // Start timer only if held for 3s
        }
        setFontColor('#222');
        setSpaceHoldStart(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearTimeout(greenTimeoutRef.current);
    };
  }, [spaceHoldStart]);

  // Update scramble only when timer stops (isRunning changes from true to false)
  useEffect(() => {
    if (!isRunning && lastSolve !== null) {
      setScramble(generateScramble());
    }
  }, [isRunning, lastSolve]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      const start = Date.now();
      intervalRef.current = setInterval(() => {
        const newTime = Date.now() - start;
        setTime(newTime);
        timeRef.current = newTime;
      }, 10);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  // Format time
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${centiseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="min-h-screen flex flex-row items-start justify-center bg-gradient-to-br from-slate-50 to-slate-200 font-sans gap-8"
    >
      {/* Solves Table */}
      <div
        className="bg-white rounded-2xl shadow-md p-6 min-w-[320px] max-h-[80vh] overflow-y-auto mt-8"
      >
  <h2 className="text-xl font-bold text-blue-500 mb-4 tracking-wide">Solves</h2>
  <table className="w-full border-collapse text-[0.95rem]">
          <thead>
            <tr className="text-slate-500 font-semibold">
              <th className="text-left px-2 py-1">#</th>
              <th className="text-left px-2 py-1">Time</th>
              <th className="text-left px-2 py-1">Scramble</th>
            </tr>
          </thead>
          <tbody>
            {solves.length === 0 ? (
              <tr><td colSpan={3} className="text-slate-400 text-center p-4">No solves yet</td></tr>
            ) : (
              solves.map((solve, idx) => (
                <tr
                  key={solve.date}
                  className="border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50"
                  title="Click to delete this solve"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this solve?')) {
                      const updated = solves.filter((s) => s.date !== solve.date);
                      setSolves(updated);
                      localStorage.setItem('solves', JSON.stringify(updated));
                    }
                  }}
                >
                  <td className="px-2 py-1 text-zinc-900 font-semibold">{solves.length - idx}</td>
                  <td className="px-2 py-1 text-blue-500 font-bold">{formatTime(solve.time)}</td>
                  <td className="px-2 py-1 text-slate-500 text-[0.92rem] break-words">{solve.scramble}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Timer Card */}
      <div
        className="bg-white rounded-3xl shadow-lg p-10 mt-8 min-w-[320px] flex flex-col items-center"
      >
        <h1
          className="font-bold text-3xl mb-9 tracking-wide text-zinc-900"
        >
          rubiks<span className="text-blue-500">'</span>timer
        </h1>
        <div
          className="text-lg text-blue-500 font-semibold mb-8 tracking-wider select-all text-center"
        >
          {scramble}
        </div>
        <div
          className={`text-[4.5rem] font-bold tracking-wider mb-5 transition-colors duration-200 select-none drop-shadow-[0_2px_8px_rgba(59,130,246,0.08)]`}
          style={{ color: fontColor }}
        >
          {formatTime(time)}
        </div>

        {/* Averages */}
        <div className="flex flex-row items-center gap-4 mb-5 text-[1.1rem] text-slate-500 font-medium">
          <div>Ao5: <span className="text-zinc-900 font-bold">{ao5 !== null ? formatTime(ao5) : '-'}</span></div>
          <div>Ao12: <span className="text-zinc-900 font-bold">{ao12 !== null ? formatTime(ao12) : '-'}</span></div>
          <div>Ao100: <span className="text-zinc-900 font-bold">{ao100 !== null ? formatTime(ao100) : '-'}</span></div>
          <div>Overall: <span className="text-zinc-900 font-bold">{overall !== null ? formatTime(overall) : '-'}</span></div>
        </div>
        {/* {lastSolve !== null && !isRunning && (
          <div
            style={{
              color: '#64748b',
              fontSize: '1.2rem',
              marginBottom: '1.2rem',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            Last solve: <span style={{ color: '#222', fontWeight: 700 }}>{formatTime(lastSolve)}</span>
          </div>
        )} */}
        <div
          className="text-slate-400 text-base mt-2 tracking-tight font-normal"
        >
          <span className="text-blue-500 font-bold">Space</span> — hold to prepare (red), keep holding for 3s for green, release to start
        </div>
      </div>
    </div>
  );
}

export default App;
