import React, { useState, useRef, useEffect } from 'react';

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
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        fontFamily: 'Inter, Arial, sans-serif',
        gap: '2rem',
      }}
    >
      {/* Solves Table */}
      <div
        style={{
          background: '#fff',
          borderRadius: '1.2rem',
          boxShadow: '0 2px 12px 0 rgba(0,0,0,0.05)',
          padding: '1.5rem 1rem',
          minWidth: '320px',
          maxHeight: '80vh',
          overflowY: 'auto',
          marginTop: '2rem',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3b82f6', marginBottom: '1rem', letterSpacing: '0.02em' }}>Solves</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ color: '#64748b', fontWeight: 600 }}>
              <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem' }}>#</th>
              <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem' }}>Time</th>
              <th style={{ textAlign: 'left', padding: '0.3rem 0.5rem' }}>Scramble</th>
            </tr>
          </thead>
          <tbody>
            {solves.length === 0 ? (
              <tr><td colSpan={3} style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>No solves yet</td></tr>
            ) : (
              solves.map((solve, idx) => (
                <tr
                  key={solve.date}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                  title="Click to delete this solve"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this solve?')) {
                      const updated = solves.filter((s) => s.date !== solve.date);
                      setSolves(updated);
                      localStorage.setItem('solves', JSON.stringify(updated));
                    }
                  }}
                >
                  <td style={{ padding: '0.3rem 0.5rem', color: '#222', fontWeight: 600 }}>{solves.length - idx}</td>
                  <td style={{ padding: '0.3rem 0.5rem', color: '#3b82f6', fontWeight: 700 }}>{formatTime(solve.time)}</td>
                  <td style={{ padding: '0.3rem 0.5rem', color: '#64748b', fontSize: '0.92rem', wordBreak: 'break-word' }}>{solve.scramble}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Timer Card */}
      <div
        style={{
          background: '#fff',
          borderRadius: '1.5rem',
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.07)',
          padding: '2.5rem 3rem',
          marginTop: '2rem',
          minWidth: '320px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h1
          style={{
            fontWeight: 700,
            fontSize: '2.2rem',
            marginBottom: '2.2rem',
            letterSpacing: '0.02em',
            color: '#222',
          }}
        >
          rubiks<span style={{ color: '#3b82f6' }}>'</span>timer
        </h1>
        <div
          style={{
            fontSize: '1.3rem',
            color: '#3b82f6',
            fontWeight: 600,
            marginBottom: '2rem',
            letterSpacing: '0.04em',
            userSelect: 'all',
            textAlign: 'center',
          }}
        >
          {scramble}
        </div>
        <div
          style={{
            fontSize: '4.5rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            marginBottom: '1.2rem',
            color: fontColor,
            transition: 'color 0.2s',
            textShadow: '0 2px 8px rgba(59,130,246,0.08)',
            userSelect: 'none',
          }}
        >
          {formatTime(time)}
        </div>

        {/* Averages */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.3rem',
          marginBottom: '1.2rem',
          fontSize: '1.1rem',
          color: '#64748b',
          fontWeight: 500,
        }}>
          <div>Ao5: <span style={{ color: '#222', fontWeight: 700 }}>{ao5 !== null ? formatTime(ao5) : '-'}</span></div>
          <div>Ao12: <span style={{ color: '#222', fontWeight: 700 }}>{ao12 !== null ? formatTime(ao12) : '-'}</span></div>
          <div>Ao100: <span style={{ color: '#222', fontWeight: 700 }}>{ao100 !== null ? formatTime(ao100) : '-'}</span></div>
          <div>Overall: <span style={{ color: '#222', fontWeight: 700 }}>{overall !== null ? formatTime(overall) : '-'}</span></div>
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
          style={{
            color: '#94a3b8',
            fontSize: '1rem',
            marginTop: '0.5rem',
            letterSpacing: '0.01em',
            fontWeight: 400,
          }}
        >
          <span style={{ color: '#3b82f6', fontWeight: 700 }}>Space</span> — hold to prepare (red), keep holding for 3s for green, release to start
        </div>
      </div>
    </div>
  );
}

export default App;
