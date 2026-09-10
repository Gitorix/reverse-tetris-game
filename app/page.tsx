'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ChevronsDown, Pause, Play, RotateCw, Sparkles, Volume2, VolumeX } from 'lucide-react';

const W = 10, H = 20;
const COLORS = ['#28d7ff', '#ffdc39', '#b36cff', '#49ee91', '#ff557c', '#ff8b3d', '#6381ff'];
const SHAPES = [
  [[0,1],[1,1],[2,1],[3,1]], [[0,0],[1,0],[0,1],[1,1]], [[1,0],[0,1],[1,1],[2,1]],
  [[1,0],[2,0],[0,1],[1,1]], [[0,0],[1,0],[1,1],[2,1]], [[0,0],[0,1],[1,1],[2,1]], [[2,0],[0,1],[1,1],[2,1]],
];
type Cell = { color: string; reverse?: boolean } | null;
type Piece = { shape: number[][]; x: number; y: number; color: string; reverse: boolean };
const blank = (): Cell[][] => Array.from({ length: H }, () => Array(W).fill(null));
function makePiece(forceReverse = false): Piece { const i = Math.floor(Math.random() * SHAPES.length); return { shape: SHAPES[i].map(([x,y]) => [x,y]), x: 3, y: 0, color: COLORS[i], reverse: forceReverse || Math.random() < .22 }; }
const PIXEL_TITLE = [
  ['10010','10010','10010','00010','00010','00100','01000'],
  ['00011','00100','01010','01010','10001','10001','10001'],
  ['00000','00000','00000','11111','00000','00000','00000'],
  ['11110','00010','00100','00100','01010','10001','00000'],
  ['11111','00000','11111','00100','00100','01000','10000'],
  ['10000','10000','10100','10010','10001','10000','10000'],
  ['10010','10010','10010','00010','00010','00100','01000'],
  ['11110','00010','00100','00100','01010','10001','00000'],
];
function PixelTitle() { return <div className="pixel-title" role="img" aria-label="リバーステトリス">{PIXEL_TITLE.map((rows, letter) => <span className="pixel-letter" key={letter} style={{'--letter-color':COLORS[letter%5]} as React.CSSProperties}>{rows.flatMap((row,y)=>[...row].map((on,x)=><i key={`${x}-${y}`} className={on==='1'?'on':''}/>))}</span>)}</div>; }

export default function Home() {
  const [screen, setScreen] = useState<'start'|'play'|'over'>('start');
  const [reverseEnabled, setReverseEnabled] = useState(true), [reversed, setReversed] = useState(false);
  const [board, setBoard] = useState<Cell[][]>(blank), [piece, setPiece] = useState<Piece>(() => makePiece()), [next, setNext] = useState<Piece>(() => makePiece());
  const [score, setScore] = useState(0), [lines, setLines] = useState(0), [combo, setCombo] = useState(1);
  const [paused, setPaused] = useState(false), [flash, setFlash] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const level = Math.floor(lines / 5) + 1;
  const stateRef = useRef({ board, piece, reversed, paused, screen, reverseEnabled }); stateRef.current = { board, piece, reversed, paused, screen, reverseEnabled };
  const cells = (p: Piece) => p.shape.map(([x,y]) => [p.x+x, p.y+y]);
  const valid = (p: Piece, b: Cell[][]) => cells(p).every(([x,y]) => x >= 0 && x < W && y >= 0 && y < H && !b[y]?.[x]);
  const start = () => { const p = makePiece(reverseEnabled); setBoard(blank()); setPiece(p); setNext(makePiece()); setScore(0); setLines(0); setCombo(1); setReversed(false); setPaused(false); setScreen('play'); };
  const playClearSound = useCallback((count: number) => {
    if (!musicOn) return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return; const ctx = new AudioCtx();
    const notes = [72, 76, 79, 84, 88].slice(0, Math.min(5, count + 2));
    notes.forEach((note, i) => { const osc = ctx.createOscillator(), gain = ctx.createGain(), start = ctx.currentTime + i * .055; osc.type = i === notes.length - 1 ? 'square' : 'triangle'; osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12); gain.gain.setValueAtTime(.11, start); gain.gain.exponentialRampToValueAtTime(.001, start + .22); osc.connect(gain).connect(ctx.destination); osc.start(start); osc.stop(start + .23); });
    window.setTimeout(() => void ctx.close(), 700);
  }, [musicOn]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: object, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'start_reverse_tetris', title: 'リバーステトリスを開始',
      description: '選択したモードで新しいゲームを開始し、表示中の盤面をリセットします。',
      inputSchema: { type: 'object', properties: { reverseMode: { type: 'boolean' } }, required: ['reverseMode'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) { const mode = (input as { reverseMode?: unknown })?.reverseMode; if (typeof mode !== 'boolean') throw new Error('reverseMode must be boolean'); setReverseEnabled(mode); const p = makePiece(mode); setBoard(blank()); setPiece(p); setNext(makePiece()); setScore(0); setLines(0); setCombo(1); setReversed(false); setPaused(false); setScreen('play'); return { started: true, reverseMode: mode }; }
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const lock = useCallback((p: Piece, b: Cell[][], rev: boolean) => {
    const placed = b.map(r => [...r]); cells(p).forEach(([x,y], i) => { if (placed[y]) placed[y][x] = { color: p.color, reverse: p.reverse && i === 0 }; });
    const full = placed.map((r,i) => r.every(Boolean) ? i : -1).filter(i => i >= 0);
    const hitReverse = full.some(y => placed[y].some(c => c?.reverse));
    let out = placed.filter((_,i) => !full.includes(i)); const empties = Array.from({ length: full.length }, () => Array(W).fill(null)); out = rev ? [...out, ...empties] : [...empties, ...out];
    const nextRev = hitReverse && stateRef.current.reverseEnabled ? !rev : rev;
    if (hitReverse && stateRef.current.reverseEnabled) { out = out.slice().reverse().map(r => r.slice().reverse()); setReversed(nextRev); setCombo(v => Math.min(8, v + 1)); setFlash(true); window.setTimeout(() => setFlash(false), 700); }
    if (full.length) { playClearSound(full.length); setLines(v => v + full.length); setScore(v => v + [0,100,300,500,800][full.length] * combo); }
    const np = { ...next, x: 3, y: nextRev ? H - 3 : 0 };
    if (!valid(np, out)) { setBoard(out); setScreen('over'); return; }
    setBoard(out); setPiece(np); setNext(makePiece());
  }, [next, combo, playClearSound]);
  const move = useCallback((dx: number, dy: number) => { const s = stateRef.current; if (s.screen !== 'play' || s.paused) return; const np = { ...s.piece, x: s.piece.x + dx, y: s.piece.y + dy }; if (valid(np, s.board)) setPiece(np); else if (dy !== 0) lock(s.piece, s.board, s.reversed); }, [lock]);
  const rotate = useCallback(() => { const s = stateRef.current; if (s.paused || s.screen !== 'play') return; const maxY = Math.max(...s.piece.shape.map(q => q[1])); const np = { ...s.piece, shape: s.piece.shape.map(([x,y]) => [maxY-y, x]) }; if (valid(np, s.board)) setPiece(np); }, []);
  const drop = useCallback(() => { const s = stateRef.current; if (s.paused || s.screen !== 'play') return; const dir = s.reversed ? -1 : 1; let np = { ...s.piece }; while (valid({ ...np, y: np.y + dir }, s.board)) np.y += dir; setScore(v => v + Math.abs(np.y - s.piece.y) * 2); lock(np, s.board, s.reversed); }, [lock]);
  useEffect(() => { if (screen !== 'play' || paused) return; const id = window.setInterval(() => move(0, reversed ? -1 : 1), Math.max(85, 760 * Math.pow(.82, level - 1))); return () => window.clearInterval(id); }, [screen, paused, reversed, level, move]);
  useEffect(() => {
    if (!musicOn || screen !== 'play' || paused) return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return; const ctx = new AudioCtx(); void ctx.resume();
    const tune = [76,71,72,74,72,71,69,69,72,76,74,72,71,71,72,74,76,72,69,69,74,77,81,79,77,76,72,76,74,72,71,71];
    const notes = reversed ? [...tune].reverse() : tune; let i = 0;
    const playNote = () => { const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = 'square'; osc.frequency.value = 440 * Math.pow(2, (notes[i++ % notes.length] - 69) / 12); gain.gain.setValueAtTime(.035, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .14); osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .15); };
    playNote(); const id = window.setInterval(playNote, Math.max(105, 180 - level * 5)); return () => { window.clearInterval(id); void ctx.close(); };
  }, [musicOn, screen, paused, reversed, level]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key)) e.preventDefault(); if (e.key === 'ArrowLeft') move(-1,0); if (e.key === 'ArrowRight') move(1,0); if (e.key === 'ArrowDown') move(0,reversed?-1:1); if (e.key === 'ArrowUp') rotate(); if (e.key === ' ') drop(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [move, rotate, drop, reversed]);
  const display = board.map(r => [...r]); if (screen === 'play') cells(piece).forEach(([x,y],i) => { if (display[y]?.[x] !== undefined) display[y][x] = { color: piece.color, reverse: piece.reverse && i === 0 }; });

  return <main className={`app-shell ${reversed?'world-reversed':''}`}><div className="ambient" /><div className="character-snow" aria-hidden="true">{Array.from({length:15},(_,i)=><img key={i} src={`/characters/${['purple','blue','yellow'][i%3]}.png`} alt="" style={{'--x':`${(i*37)%96}%`,'--delay':`${-(i*1.7)%14}s`,'--duration':`${9+(i%6)*1.4}s`,'--size':`${42+(i%4)*15}px`} as React.CSSProperties}/>)}</div><header className="topbar"><div className="brand"><span className="brand-mark">R</span><h1>REVERSE<br/><b>TETRIS</b></h1></div><div className="header-actions"><button className="sound" aria-label={musicOn?'BGMをオフ':'BGMをオン'} onClick={()=>setMusicOn(v=>!v)}>{musicOn?<Volume2 size={17}/>:<VolumeX size={17}/>}</button><div className="top-score"><small>SCORE</small><strong>{score.toLocaleString()}</strong></div></div></header>
    {screen === 'start' ? <section className="start-card"><PixelTitle/><p className="eyebrow">FLIP THE GRAVITY</p><h2>積み上げた世界を<em>ひっくり返せ</em></h2><p className="intro">リバースブロックでラインを消すと盤面と重力が反転</p><label className="mode-toggle"><span><b>リバースモード</b><small>反転コンボでスコア倍率アップ</small></span><input type="checkbox" checked={reverseEnabled} onChange={e=>setReverseEnabled(e.target.checked)} /><i /></label><button className="primary" onClick={start}><Play fill="currentColor" size={19}/> ゲームスタート</button><p className="hint">画面ボタンとキーボードの矢印キー スペースキーに対応</p></section> : <section className="game-layout">
      <aside className="stats"><div><small>LINES</small><strong>{String(lines).padStart(2,'0')}</strong></div><div><small>LEVEL</small><strong>{level}</strong></div></aside>
      <div className={`board-wrap ${reversed?'is-reversed':''} ${flash?'is-flipping':''}`}><div className="gravity-pill">{reversed ? '↑ REVERSE GRAVITY' : '↓ NORMAL GRAVITY'}</div><div className="board" role="grid" aria-label="テトリス盤面">{display.flatMap((row,y)=>row.map((cell,x)=><span key={`${x}-${y}`} className={`cell ${cell?'filled':''} ${cell?.reverse?'reverse-cell':''}`} style={cell?{background:cell.color,boxShadow:`0 0 12px ${cell.color}66`}:undefined}>{cell?.reverse && <Sparkles size={12}/>}</span>))}</div>{paused && <div className="overlay"><Pause size={34}/><b>PAUSED</b><button onClick={()=>setPaused(false)}>ゲームに戻る</button><button className="ghost" onClick={()=>{setPaused(false);setScreen('start')}}>ホーム画面へ</button></div>}{screen === 'over' && <div className="overlay"><b>GAME OVER</b><span>{score.toLocaleString()} pts</span><button onClick={start}>もう一度</button><button className="ghost" onClick={()=>setScreen('start')}>モード選択へ</button></div>}{flash && <div className="reverse-flash"><Sparkles/><b>REVERSE!</b><span>GRAVITY FLIPPED</span></div>}</div>
      <aside className="stats"><div><small>NEXT</small><div className="next-grid">{next.shape.map(([x,y],i)=><i key={i} className={next.reverse&&i===0?'special':''} style={{left:x*15,top:y*15,background:next.color}} />)}</div></div><div className="multiplier"><small>REVERSE CHAIN</small><strong>×{combo}</strong><span>{combo>1?'KEEP IT UP!':'READY'}</span></div></aside>
      <div className="mobile-stats"><span>LINES <b>{String(lines).padStart(2,'0')}</b></span><span>CHAIN <b>×{combo}</b></span><span>NEXT <i style={{background:next.color}} /></span></div>
      <div className="controls" aria-label="ゲーム操作"><button aria-label="左へ" onClick={()=>move(-1,0)}><ArrowLeft/></button><button aria-label="回転" className="rotate" onClick={rotate}><RotateCw/></button><button aria-label="右へ" onClick={()=>move(1,0)}><ArrowRight/></button><button aria-label="一段落下" onClick={()=>move(0,reversed?-1:1)}><ArrowDown style={reversed?{transform:'rotate(180deg)'}:undefined}/></button><button aria-label="ハードドロップ" className="drop" onClick={drop}><ChevronsDown style={reversed?{transform:'rotate(180deg)'}:undefined}/><span>DROP</span></button></div>
      {screen === 'play' && <button className="pause" aria-label={paused?'再開':'一時停止'} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={18}/>:<Pause size={18}/>}</button>}</section>}
    <footer>REVERSE MODE <b>{reverseEnabled?'ON':'OFF'}</b><span>•</span> BEST <b>{Math.max(score,12480).toLocaleString()}</b></footer></main>;
}
