"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  activeTarget, createGame, DIFFICULTIES, HEIGHT, movePlayer, selectTarget, TARGET_HEIGHT,
  TARGET_WIDTH, tick, TOTAL_ROUNDS, WIDTH, type Difficulty, type Game,
} from "../lib/game";

// Deterministic initial state keeps the server and first browser render identical.
const initialGame = () => createGame("classic", () => 0.37);

export default function Home() {
  const [game, setGame] = useState<Game>(initialGame);
  const [difficulty, setDifficulty] = useState<Difficulty>("classic");
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [best, setBest] = useState(0);
  const keys = useRef(new Set<string>());
  const board = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const live = game.status === "playing" || game.status === "feedback";
  const selected = activeTarget(game);

  useEffect(() => {
    try { setBest(Number(localStorage.getItem("chroma-best-v1")) || 0); } catch { /* Storage is optional. */ }
    return () => { void audio.current?.close(); };
  }, []);

  const start = useCallback(() => {
    keys.current.clear();
    setPaused(false);
    setGame({ ...createGame(difficulty), status: "playing" });
    board.current?.focus({ preventScroll: true });
  }, [difficulty]);

  const togglePause = useCallback(() => {
    keys.current.clear();
    setPaused((value) => !value);
    board.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!live) return;
    const down = (event: KeyboardEvent) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyP", "Escape"].includes(event.code)) return;
      if ((event.target as HTMLElement).closest("button, select, input, textarea")) return;
      event.preventDefault();
      if (event.code === "KeyP" || event.code === "Escape") {
        if (!event.repeat) togglePause();
        return;
      }
      if (paused) return;
      if (event.code === "Space") {
        if (!event.repeat) setGame(selectTarget);
      } else {
        keys.current.add(event.code);
        if (!event.repeat) {
          const dx = Number(event.code === "ArrowRight") - Number(event.code === "ArrowLeft");
          const dy = Number(event.code === "ArrowDown") - Number(event.code === "ArrowUp");
          setGame((current) => movePlayer(current, dx, dy, 18));
        }
      }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.code);
    const blur = () => { keys.current.clear(); setPaused(true); };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [live, paused, togglePause]);

  useEffect(() => {
    if (!live || paused) return;
    let frame: number;
    let previous = performance.now();
    const animate = (now: number) => {
      const elapsed = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      const dx = Number(keys.current.has("ArrowRight")) - Number(keys.current.has("ArrowLeft"));
      const dy = Number(keys.current.has("ArrowDown")) - Number(keys.current.has("ArrowUp"));
      setGame((current) => tick(current, elapsed, dx, dy));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [live, paused]);

  useEffect(() => {
    if (game.status !== "feedback" || !sound) return;
    try {
      const context = audio.current;
      if (!context) return;
      void context.resume();
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(game.feedback === "correct" ? 660 : 180, context.currentTime);
      volume.gain.setValueAtTime(0.06, context.currentTime);
      volume.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
      oscillator.connect(volume); volume.connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + 0.2);
    } catch { /* Gameplay does not require audio support. */ }
  }, [game.status, game.feedback, sound]);

  useEffect(() => {
    if (game.status !== "finished") return;
    setBest((previous) => {
      const next = Math.max(previous, game.score);
      try { localStorage.setItem("chroma-best-v1", String(next)); } catch { /* Storage is optional. */ }
      return next;
    });
  }, [game.status, game.score]);

  const toggleSound = () => {
    if (!sound) {
      try { audio.current ??= new AudioContext(); void audio.current.resume(); } catch { return; }
    }
    setSound(!sound);
    board.current?.focus({ preventScroll: true });
  };

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Chroma home"><span className="brand-icon">c<span /></span>chroma<span className="brand-period">.</span></a>
        <div className="topbar-right"><span className="prototype-tag"><i /> PLAYABLE PROTOTYPE</span><span className="build-label">EXPERIMENT 001</span></div>
      </header>

      <section className="intro">
        <div><div className="eyebrow">A LITTLE GAME AGAINST YOUR BRAIN</div><h1>Don’t read.<br className="mobile-break" /> <span>React.</span></h1><p>Follow the color. Ignore the word. Easier said than done.</p></div>
        <div className="intro-sticker"><span>eyes vs.</span><strong>brain</strong><span className="sticker-arrow">↙</span></div>
      </section>

      <div className="game-layout">
        <section className="game-panel" aria-label="Game">
          <div className="scorebar">
            <div className="stat"><span>ROUND</span><strong>{String(game.round).padStart(2, "0")}<small> / {TOTAL_ROUNDS}</small></strong></div>
            <div className="stat"><span>SCORE</span><strong>{String(game.score).padStart(4, "0")}</strong></div>
            <div className="stat lives"><span>LIVES</span><strong aria-label={`${game.lives} lives remaining`}>{[0, 1, 2].map((i) => <span key={i} className={i < game.lives ? "heart" : "heart empty"}>♥</span>)}</strong></div>
            <button className="icon-button" onClick={toggleSound} aria-label={sound ? "Mute sound" : "Enable sound"} title={sound ? "Mute sound" : "Enable sound"}>{sound ? "♪" : "♪̸"}</button>
            <button className="pause-button" onClick={togglePause} disabled={!live} aria-label={paused ? "Resume game" : "Pause game"}>{paused ? "▶" : "Ⅱ"}</button>
          </div>

          <div className="compact-signal"><span className="compact-orb" style={{ background: live ? game.cue.hex : "#9caa92" }} /><span>MATCH THE INK <strong style={{ color: live ? game.cue.hex : undefined }}>{live ? game.cue.label : "READY?"}</strong></span><span className="compact-time">{game.status === "idle" ? DIFFICULTIES[difficulty].toFixed(1) : game.remaining.toFixed(1)}s</span></div>

          <div className="arena" ref={board} tabIndex={0} aria-label="Game arena. Arrow keys to move. Space to select. P to pause.">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Six square targets with conflicting color words, and a circular player">
              <defs>
                <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#d9dfd6" /></pattern>
                <filter id="player-shadow" x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#16392c" floodOpacity=".2" /></filter>
              </defs>
              <rect width={WIDTH} height={HEIGHT} fill="url(#dots)" />
              <rect x="24" y="24" width="852" height="552" rx="20" fill="none" stroke="#d9dfd6" strokeDasharray="5 7" />
              <path d="M370 300h160M450 265v70" stroke="#e0e6dc" strokeWidth="1.5" />
              {game.targets.map((target, index) => {
                const nearby = selected === index && game.status === "playing";
                const reveal = game.status === "feedback" && target.color.id === game.cue.id;
                return <g key={index}>
                  <rect x={target.x - TARGET_WIDTH / 2} y={target.y - TARGET_HEIGHT / 2 + 6} width={TARGET_WIDTH} height={TARGET_HEIGHT} rx="14" fill="#dce1d7" />
                  <rect x={target.x - TARGET_WIDTH / 2} y={target.y - TARGET_HEIGHT / 2} width={TARGET_WIDTH} height={TARGET_HEIGHT} rx="14" fill={nearby || reveal ? "#edf6df" : "#fffef9"} stroke={nearby || reveal ? "#315c40" : "#cfd6c8"} strokeWidth={nearby || reveal ? 2.5 : 1.5} />
                  <text x={target.x - TARGET_WIDTH / 2 + 15} y={target.y - 27} className="target-number">0{index + 1}</text>
                  <text x={target.x} y={target.y + 12} textAnchor="middle" fill={target.color.hex} className="target-word">{target.word}</text>
                  {nearby && <text x={target.x} y={target.y + 76} textAnchor="middle" className="select-hint">SPACE TO SELECT</text>}
                </g>;
              })}
              <g transform={`translate(${game.player.x}, ${game.player.y})`} filter="url(#player-shadow)">
                <circle r="24" fill="#315c40" opacity=".1" /><circle r="17" fill="#315c40" stroke="#fffef9" strokeWidth="3" />
                <circle cx="-5" cy="-3" r="2.1" fill="white" /><circle cx="5" cy="-3" r="2.1" fill="white" />
                <path d="M-4 5q4 4 8 0" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </g>
              {game.status === "idle" && <text x="450" y="348" textAnchor="middle" className="spawn-label">THIS LITTLE DOT IS YOU</text>}
            </svg>

            {game.status === "idle" && <div className="overlay"><div className="overlay-card"><span className="card-kicker">YOUR BRAIN WILL TRY TO CHEAT</span><h2>Trust the ink.</h2><p>Find the square whose <strong>text color</strong> matches the signal. Ignore what the word says.</p><button className="primary-button" onClick={start}>Let’s play <span>↗</span></button><span className="overlay-note">10 rounds · 3 lives · one confused brain</span></div></div>}

            {paused && live && <div className="overlay"><div className="overlay-card"><span className="card-kicker">TAKE A BREATHER</span><h2>Brain break.</h2><p>The clock is paused. Come back when you’re ready.</p><button className="primary-button" onClick={togglePause}>Keep going <span>→</span></button></div></div>}

            {game.status === "feedback" && !paused && <div className="feedback-toast" role="status"><span className={`feedback-icon ${game.feedback === "correct" ? "good" : "bad"}`}>{game.feedback === "correct" ? "✓" : "×"}</span><div><strong>{game.feedback === "correct" ? `Nice one! +${game.lastPoints}` : game.feedback === "timeout" ? "Time slipped away." : "The word got you."}</strong><span>{game.feedback === "correct" ? "Your eyes win this round." : `Look for ${game.cue.label.toLowerCase()} ink, not the word.`}</span></div></div>}

            {game.status === "finished" && <div className="overlay"><div className="overlay-card result-card"><span className="card-kicker">{game.lives > 0 ? "EXPERIMENT COMPLETE" : "OUT OF LIVES. STILL A GOOD BRAIN."}</span><h2>{game.lives > 0 ? "Mind over words." : "Words won. Rematch?"}</h2><div className="result-score">{game.score}<span>POINTS</span></div><p>{game.correct} correct out of {game.round} rounds · Best on this browser: {best}</p><button className="primary-button" onClick={start}>One more game <span>↻</span></button></div></div>}
          </div>

          <div className="arena-footer"><span className={`status-dot ${live && !paused ? "running" : ""}`} /><span aria-live="polite">{paused ? "Paused — press P to resume" : game.status === "playing" ? selected >= 0 ? "On a square. Press Space to choose." : "Follow the signal. Find the matching ink." : game.status === "feedback" ? "Next round coming up…" : game.status === "finished" ? "Experiment complete. Try a different pace?" : "Ready when you are."}</span><span className="keyboard-label">KEYBOARD MODE</span></div>
        </section>

        <aside className="sidebar">
          <section className="signal-card">
            <div className="section-heading"><span className="eyebrow">THE SIGNAL</span><span className="sim-label">SIMULATED LED</span></div>
            <div className="signal-orb" style={{ "--signal": live ? game.cue.hex : "#9caa92" } as React.CSSProperties}><div /></div>
            <span className="signal-caption">FIND THIS TEXT COLOR</span>
            <h2 style={{ color: live ? game.cue.hex : undefined }}>{live ? game.cue.label : "READY?"}</h2>
            <p>The word is a distraction.<br />The ink is your destination.</p>
            <div className={`timer ${game.remaining < 2 && live ? "urgent" : ""}`}><div><span>TIME LEFT</span><strong>{game.status === "idle" ? DIFFICULTIES[difficulty].toFixed(1) : game.remaining.toFixed(1)}<small>s</small></strong></div><div className="timer-track"><div style={{ width: `${100 * (game.status === "idle" ? 1 : game.remaining / DIFFICULTIES[game.difficulty])}%` }} /></div></div>
          </section>

          <section className="pace-card"><div className="section-heading"><span className="eyebrow">PICK YOUR PACE</span><span>↗</span></div><div className="pace-options">{(Object.keys(DIFFICULTIES) as Difficulty[]).map((item) => <button key={item} disabled={live} aria-pressed={difficulty === item} className={difficulty === item ? "active" : ""} onClick={() => setDifficulty(item)}><span>{item}</span><small>{DIFFICULTIES[item]}s</small></button>)}</div><p>{live ? "Finish this game to change the pace." : "Start with Chill. Turn up the pressure later."}</p></section>

          <section className="controls-card"><span className="eyebrow">YOUR CONTROLS</span><div className="control-row"><div className="arrow-keys"><kbd>↑</kbd><div><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></div></div><div><strong>Move your dot</strong><span>Walk onto a square</span></div></div><div className="control-row"><kbd className="space-key">space</kbd><div><strong>Make your choice</strong><span>Select the square you’re on</span></div></div><div className="pause-hint"><kbd>P</kbd> Pause / resume</div></section>
        </aside>
      </div>

      <footer className="page-footer"><span><span className="tiny-dots">● ● ●</span> A Stroop-inspired experiment</span><span>Just shapes. Just colors. Surprisingly tricky.</span></footer>
    </main>
  );
}
