
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Award, Heart, Timer, AlertCircle, User, School } from 'lucide-react';
import { Category, ActiveItem, GameState, GameHistoryRecord, PlayerInfo } from './types';
import { GAME_DATA } from './constants';
import { DropZone } from './components/DropZone';
import { FloatingCard } from './components/FloatingCard';
import { Feedback } from './components/Feedback';

const SPAWN_INTERVAL_MS = 4500; 
const GAME_DURATION_SEC = 180; 
const MOVEMENT_SPEED = 0.35; 

interface FeedbackItem {
  id: string;
  type: 'correct' | 'wrong';
  x: number;
  y: number;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [items, setItems] = useState<ActiveItem[]>([]);
  const [activeZone, setActiveZone] = useState<Category | null>(null);
  
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>({ name: '', className: '' });

  const contentRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const lessonRef = useRef<HTMLDivElement>(null);
  const lastSpawnTime = useRef(0);
  const requestRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (type: 'correct' | 'wrong') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'correct') {
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    } else if (type === 'wrong') {
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    }
    osc.start(now);
    osc.stop(now + 0.3);
  };

  const spawnItem = useCallback(() => {
    const template = GAME_DATA[Math.floor(Math.random() * GAME_DATA.length)];
    const newItem: ActiveItem = {
      ...template,
      id: Math.random().toString(36).substr(2, 9),
      x: -25, 
      y: 15 + Math.random() * 45,
      speed: MOVEMENT_SPEED, 
      isDragging: false,
    };
    setItems(prev => [...prev, newItem]);
  }, []);

  const updateGame = useCallback((time: number) => {
    if (gameState !== 'PLAYING') return;

    if (time - lastSpawnTime.current > SPAWN_INTERVAL_MS) {
      spawnItem();
      lastSpawnTime.current = time;
    }

    setItems(prevItems => {
      const nextItems: ActiveItem[] = [];
      let missed = false;
      prevItems.forEach(item => {
        if (item.isDragging) {
          nextItems.push(item);
          return;
        }
        const nextX = item.x + item.speed;
        if (nextX > 110) missed = true;
        else nextItems.push({ ...item, x: nextX });
      });

      if (missed) {
        setLives(l => {
          const newLives = Math.max(0, l - 1);
          if (newLives < l) playSound('wrong');
          return newLives;
        });
      }
      return nextItems;
    });

    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameState, spawnItem]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      lastSpawnTime.current = performance.now();
      requestRef.current = requestAnimationFrame(updateGame);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, updateGame]);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameState(score > 50 ? 'VICTORY' : 'GAME_OVER');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, score]);

  useEffect(() => {
    if (lives <= 0 && gameState === 'PLAYING') setGameState('GAME_OVER');
  }, [lives, gameState]);

  const checkCollision = (point: { x: number, y: number }): Category | null => {
    const zones = [
      { id: Category.CONTENT, ref: contentRef },
      { id: Category.ART, ref: artRef },
      { id: Category.LESSON, ref: lessonRef },
    ];
    for (const zone of zones) {
      if (zone.ref.current) {
        const rect = zone.ref.current.getBoundingClientRect();
        if (point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) {
          return zone.id;
        }
      }
    }
    return null;
  };

  const handleDragStart = (id: string) => {
    initAudio();
    setItems(prev => prev.map(item => item.id === id ? { ...item, isDragging: true } : item));
  };

  const handleDragMove = (point: { x: number, y: number }) => {
    const hovered = checkCollision(point);
    if (hovered !== activeZone) setActiveZone(hovered);
  };

  const handleDragEnd = (id: string, info: any) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const dropped = checkCollision(info.point);
    if (dropped) {
      const isCorrect = dropped === item.category;
      playSound(isCorrect ? 'correct' : 'wrong');
      setFeedbacks(prev => [...prev, { id: Math.random().toString(), type: isCorrect ? 'correct' : 'wrong', x: info.point.x, y: info.point.y }]);
      
      if (isCorrect) {
        setScore(s => s + 10);
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        setLives(l => Math.max(0, l - 1));
        setItems(prev => prev.map(i => i.id === id ? { ...i, isDragging: false } : i));
      }
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, isDragging: false } : i));
    }
    setActiveZone(null);
  };

  const startGame = () => {
    if (!playerInfo.name.trim() || !playerInfo.className.trim()) return;
    setScore(0);
    setLives(5);
    setTimeLeft(GAME_DURATION_SEC);
    setItems([]);
    setGameState('PLAYING');
  };

  return (
    <div className="relative w-full h-screen bg-[#f8fafc] overflow-hidden select-none touch-none font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-200 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      {/* HUD */}
      <div className="absolute top-6 left-6 right-6 z-40 flex justify-between items-center pointer-events-none">
        <div className="flex gap-4">
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-4">
            <div className="p-2 bg-indigo-500 rounded-lg text-white">
              <Award size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score</p>
              <p className="text-2xl font-black text-slate-800 leading-none">{score}</p>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-4">
            <div className="p-2 bg-rose-500 rounded-lg text-white">
              <Heart size={24} fill="white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lives</p>
              <div className="flex gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full transition-colors duration-300 ${i < lives ? 'bg-rose-500' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700 px-8 py-3 rounded-2xl shadow-xl flex items-center gap-4 text-white">
          <Timer size={24} className={timeLeft < 30 ? 'text-rose-400 animate-pulse' : 'text-indigo-400'} />
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time Left</p>
            <p className="text-2xl font-mono font-black">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </p>
          </div>
        </div>
      </div>

      {/* Cards Canvas */}
      <div className="absolute inset-0 z-10">
         <AnimatePresence mode="popLayout">
           {items.map(item => (
             <FloatingCard 
               key={item.id}
               item={item} 
               onDragStart={handleDragStart}
               onDrag={handleDragMove}
               onDragEnd={handleDragEnd}
             />
           ))}
         </AnimatePresence>
      </div>

      {/* Feedback Popups */}
      <AnimatePresence>
        {feedbacks.map(fb => (
          <Feedback 
            key={fb.id} x={fb.x} y={fb.y} type={fb.type}
            onComplete={() => setFeedbacks(prev => prev.filter(p => p.id !== fb.id))}
          />
        ))}
      </AnimatePresence>

      {/* Bottom Drop Zones */}
      <div className="absolute bottom-0 left-0 right-0 h-[32%] z-20 p-8 flex gap-8 items-stretch justify-center bg-gradient-to-t from-white via-white/90 to-transparent">
        <div className="flex-1 max-w-sm">
          <DropZone ref={contentRef} category={Category.CONTENT} highlight={activeZone === Category.CONTENT}/>
        </div>
        <div className="flex-1 max-w-sm">
          <DropZone ref={artRef} category={Category.ART} highlight={activeZone === Category.ART}/>
        </div>
        <div className="flex-1 max-w-sm">
          <DropZone ref={lessonRef} category={Category.LESSON} highlight={activeZone === Category.LESSON}/>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {gameState === 'MENU' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-lg flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white p-10 md:p-12 rounded-[40px] shadow-2xl text-center max-w-lg w-full border border-white">
              <div className="mb-6 inline-block p-4 bg-indigo-50 rounded-3xl">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Play size={32} fill="currentColor" />
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-2 tracking-tight">Dòng Chảy Văn Học</h1>
              <p className="text-slate-500 mb-8 text-lg font-medium">Thử thách phân loại kiến thức tốc độ cao</p>
              
              <div className="space-y-4 mb-8">
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input 
                    type="text" value={playerInfo.name} placeholder="Nhập họ và tên..."
                    onChange={(e) => setPlayerInfo(p => ({...p, name: e.target.value}))}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-lg text-slate-700 transition-all"
                  />
                </div>
                <div className="relative group">
                  <School className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input 
                    type="text" value={playerInfo.className} placeholder="Nhập tên lớp (VD: 12A1)..."
                    onChange={(e) => setPlayerInfo(p => ({...p, className: e.target.value}))}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none font-bold text-lg text-slate-700 transition-all"
                  />
                </div>
              </div>
              
              <button 
                onClick={startGame} disabled={!playerInfo.name.trim() || !playerInfo.className.trim()}
                className="w-full group relative overflow-hidden px-8 py-5 font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-200 disabled:opacity-50 transition-all active:scale-95"
              >
                <span className="relative z-10 flex items-center justify-center gap-3 text-xl">
                  BẮT ĐẦU TRẢI NGHIỆM
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </motion.div>
          </motion.div>
        )}

        {(gameState === 'GAME_OVER' || gameState === 'VICTORY') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-6">
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[40px] shadow-2xl text-center max-w-md w-full">
              <div className={`mb-6 inline-flex p-6 rounded-3xl ${gameState === 'VICTORY' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                {gameState === 'VICTORY' ? <Award className="w-16 h-16 text-emerald-500" /> : <AlertCircle className="w-16 h-16 text-rose-500" />}
              </div>
              <h2 className="text-4xl font-black text-slate-800 mb-2">{gameState === 'VICTORY' ? 'Tuyệt Vời!' : 'Kết Thúc!'}</h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mb-6">Người chơi: {playerInfo.name} - {playerInfo.className}</p>
              <div className="text-7xl font-black text-indigo-600 mb-10 drop-shadow-sm">{score}</div>
              
              <button onClick={startGame} className="w-full py-5 font-black text-xl text-white bg-slate-800 rounded-2xl hover:bg-slate-900 flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95">
                <RotateCcw size={24} /> THỬ LẠI NGAY
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
