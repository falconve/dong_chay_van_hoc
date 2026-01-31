import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Award, Heart, Timer, Download, User, School, CheckCircle, AlertCircle, Loader2, Share2 } from 'lucide-react';
import { Category, ActiveItem, GameState, GameHistoryRecord, PlayerInfo, SubmitStatus } from './types';
import { GAME_DATA } from './constants';
import { DropZone } from './components/DropZone';
import { FloatingCard } from './components/FloatingCard';
import { Feedback } from './components/Feedback';

// Game Configuration
const SPAWN_INTERVAL_MS = 9000; 
const GAME_DURATION_SEC = 240; 
const MOVEMENT_SPEED = 0.15;

// --- CẤU HÌNH LIÊN KẾT GOOGLE SHEET ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzL-Dh8gKh7qJ6mHtBv_4TwS1QY1e0HDLK1hH37BgP71fxKC4o2OlvU1y-tzcEfrLTVRg/exec"; 

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
  
  // Visual Feedback State
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  
  // Player & History State
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>({ name: '', className: '' });
  const [history, setHistory] = useState<GameHistoryRecord[]>([]);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('IDLE');

  // Stable refs
  const contentRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const lessonRef = useRef<HTMLDivElement>(null);
  const lastSpawnTime = useRef(0);
  const requestRef = useRef<number>(0);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  
  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- Audio System ---
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSound = (type: 'correct' | 'wrong' | 'victory' | 'gameover') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'correct') {
      // Ding sound (Sine wave, pitch up)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'wrong') {
      // Buzz sound (Sawtooth, pitch down)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'victory') {
      // Victory Arpeggio
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.1); // C#
      osc.frequency.setValueAtTime(659, now + 0.2); // E
      osc.frequency.setValueAtTime(880, now + 0.3); // A
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.0);
      osc.start(now);
      osc.stop(now + 1.0);
    }
  };

  // --- Logic gửi dữ liệu ---
  const sendDataToSheet = async (finalScore: number, finalResult: string) => {
    if (!GOOGLE_SCRIPT_URL) {
      console.warn("Chưa cấu hình URL Google Apps Script");
      setSubmitStatus('ERROR');
      return;
    }

    setSubmitStatus('SENDING');

    const dataToSend = {
      timestamp: new Date().toLocaleString('vi-VN'),
      name: playerInfo.name,
      className: playerInfo.className,
      score: finalScore,
      result: finalResult, 
      detail_history: JSON.stringify(history.map(h => `${h.content} -> ${h.selectedCategory} (${h.result})`))
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });
      setSubmitStatus('SUCCESS');
    } catch (error) {
      console.error("Lỗi gửi dữ liệu:", error);
      setSubmitStatus('ERROR');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert("Đã sao chép liên kết! Hãy gửi cho học sinh của bạn.");
    }).catch(() => {
      alert("Không thể sao chép liên kết. Vui lòng copy thủ công từ thanh địa chỉ.");
    });
  };

  // --- Game Loop Logic ---

  const spawnItem = useCallback(() => {
    const template = GAME_DATA[Math.floor(Math.random() * GAME_DATA.length)];
    
    const newItem: ActiveItem = {
      ...template,
      id: Math.random().toString(36).substr(2, 9),
      x: -35, 
      y: 25, 
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
      let missedItem = false;

      prevItems.forEach(item => {
        if (item.isDragging) {
          nextItems.push(item);
          return;
        }

        const nextX = item.x + item.speed;

        if (nextX > 110) {
          missedItem = true;
        } else {
          nextItems.push({ ...item, x: nextX });
        }
      });

      if (missedItem) {
        setLives(l => {
            const newLives = Math.max(0, l - 1);
            if (newLives < l) playSound('wrong'); // Play sound on miss
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
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, updateGame]);

  // Timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          endGame(score > 0 ? 'VICTORY' : 'GAME_OVER');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, score]); 

  // Game Over Check via Lives
  useEffect(() => {
    if (lives <= 0 && gameState === 'PLAYING') {
      endGame('GAME_OVER');
    }
  }, [lives, gameState]);

  const endGame = (state: 'VICTORY' | 'GAME_OVER') => {
    setGameState(state);
    if (state === 'VICTORY') playSound('victory');
    else playSound('wrong');
    sendDataToSheet(score, state === 'VICTORY' ? 'Hoàn thành' : 'Thất bại');
  };

  // --- Interaction Handlers ---

  const checkCollision = (point: { x: number, y: number }): Category | null => {
    const zones = [
      { id: Category.CONTENT, ref: contentRef },
      { id: Category.ART, ref: artRef },
      { id: Category.LESSON, ref: lessonRef },
    ];

    for (const zone of zones) {
      if (zone.ref.current) {
        const rect = zone.ref.current.getBoundingClientRect();
        if (
          point.x >= rect.left &&
          point.x <= rect.right &&
          point.y >= rect.top &&
          point.y <= rect.bottom
        ) {
          return zone.id;
        }
      }
    }
    return null;
  };

  const handleDragStart = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, isDragging: true } : item
    ));
    initAudio(); // Ensure audio context is ready
  };

  const handleDragMove = (point: { x: number, y: number }) => {
    const hoveredZone = checkCollision(point);
    if (hoveredZone !== activeZone) {
      setActiveZone(hoveredZone);
    }
  };

  const handleDragEnd = (id: string, info: any) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const droppedZone = checkCollision(info.point);

    if (droppedZone) {
      const isCorrect = droppedZone === item.category;
      
      // Trigger Audio
      playSound(isCorrect ? 'correct' : 'wrong');

      // Trigger Visual Feedback
      setFeedbacks(prev => [...prev, {
        id: Math.random().toString(),
        type: isCorrect ? 'correct' : 'wrong',
        x: info.point.x,
        y: info.point.y
      }]);
      
      const record: GameHistoryRecord = {
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        content: item.text,
        selectedCategory: droppedZone,
        correctCategory: item.category,
        result: isCorrect ? 'Đúng' : 'Sai'
      };
      setHistory(prev => [...prev, record]);

      if (isCorrect) {
        setScore(s => s + 10);
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        setLives(l => Math.max(0, l - 1));
        setItems(prev => prev.map(i => 
          i.id === id ? { ...i, isDragging: false } : i
        ));
      }
    } else {
      setItems(prev => prev.map(i => 
        i.id === id ? { ...i, isDragging: false } : i
      ));
    }
    
    setActiveZone(null);
  };

  const startGame = () => {
    if (!playerInfo.name.trim() || !playerInfo.className.trim()) return;
    initAudio();
    setScore(0);
    setLives(5);
    setTimeLeft(GAME_DURATION_SEC);
    setItems([]);
    setHistory([]);
    setSubmitStatus('IDLE');
    setGameState('PLAYING');
  };

  const exportToCSV = () => {
    const headers = ['Thời gian', 'Họ tên', 'Lớp', 'Nội dung', 'Đã chọn', 'Đáp án đúng', 'Kết quả'];
    const rows = history.map(row => [
      row.timestamp,
      `"${playerInfo.name}"`,
      `"${playerInfo.className}"`,
      `"${row.content.replace(/"/g, '""')}"`,
      `"${row.selectedCategory}"`,
      `"${row.correctCategory}"`,
      row.result
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ket_qua_${playerInfo.name}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-indigo-50 via-white to-rose-50 overflow-hidden select-none font-sans">
      
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full bg-blue-200/20 blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-red-200/20 blur-3xl"></div>
        <div className="absolute top-[40%] left-[20%] w-64 h-64 rounded-full bg-green-200/20 blur-3xl"></div>
      </div>

      {/* Header / HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 z-40 flex justify-between items-start pointer-events-none">
        
        {/* Left Side: Score & Lives */}
        <div className="flex gap-4 items-start">
          <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/50 mt-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Award className="text-yellow-600 w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase font-extrabold tracking-wider">Điểm số</span>
              <span className="text-2xl font-black text-slate-800 leading-none">{score}</span>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/50 mt-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <Heart className="text-red-500 w-6 h-6 fill-red-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase font-extrabold tracking-wider">Số lần</span>
              <div className="flex gap-1.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Heart 
                    key={i} 
                    className={`w-5 h-5 transition-all duration-300 ${i < lives ? 'fill-red-500 text-red-500 scale-100 drop-shadow-sm' : 'fill-slate-200 text-slate-200 scale-90'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Player Info Display in Game */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-24 right-4 pointer-events-none text-right opacity-90 bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white shadow-sm">
            <div className="font-bold text-slate-800 text-lg">{playerInfo.name}</div>
            <div className="text-sm font-semibold text-slate-500">{playerInfo.className}</div>
          </div>
        )}

        {/* Timer */}
        <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/50 mt-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Timer className="text-blue-600 w-6 h-6" />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-500 uppercase font-extrabold tracking-wider">Thời gian</span>
            <span className={`text-2xl font-black leading-none tabular-nums ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Game Area Background Items */}
      <div ref={gameContainerRef} className="absolute inset-0 z-10 pointer-events-none">
         <AnimatePresence>
           {items.map(item => (
             <div key={item.id} className="pointer-events-auto">
                <FloatingCard 
                  item={item} 
                  onDragStart={handleDragStart}
                  onDrag={handleDragMove}
                  onDragEnd={handleDragEnd}
                />
             </div>
           ))}
         </AnimatePresence>
      </div>

      {/* Visual Feedback Layer */}
      <AnimatePresence>
        {feedbacks.map(fb => (
          <Feedback 
            key={fb.id}
            x={fb.x}
            y={fb.y}
            type={fb.type}
            onComplete={() => setFeedbacks(prev => prev.filter(p => p.id !== fb.id))}
          />
        ))}
      </AnimatePresence>

      {/* Drop Zones */}
      <div className="absolute bottom-0 left-0 right-0 h-[38%] z-20 p-6 pb-8 flex gap-8 items-end justify-center bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-auto">
        <div className="w-1/3 h-full max-w-sm transform hover:-translate-y-2 transition-transform duration-300">
          <DropZone ref={contentRef} category={Category.CONTENT} highlight={activeZone === Category.CONTENT}/>
        </div>
        <div className="w-1/3 h-full max-w-sm transform hover:-translate-y-2 transition-transform duration-300">
          <DropZone ref={artRef} category={Category.ART} highlight={activeZone === Category.ART}/>
        </div>
        <div className="w-1/3 h-full max-w-sm transform hover:-translate-y-2 transition-transform duration-300">
          <DropZone ref={lessonRef} category={Category.LESSON} highlight={activeZone === Category.LESSON}/>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {gameState === 'MENU' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center"
          >
            <div className="bg-white/95 p-12 rounded-[2rem] shadow-2xl text-center max-w-lg mx-4 w-full border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-green-500 to-red-500"></div>
              
              <div className="mt-8"></div>
              
              <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">Phân Loại Văn Học</h1>
              <p className="text-slate-500 mb-8 font-medium">Trường THPT Thái Phiên - Hải Phòng</p>
              
              <div className="space-y-5 mb-10 text-left">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Họ và Tên</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="text" 
                      value={playerInfo.name}
                      onChange={(e) => setPlayerInfo(p => ({...p, name: e.target.value}))}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                      placeholder="Nhập họ tên của bạn..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Lớp</label>
                  <div className="relative group">
                    <School className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input 
                      type="text" 
                      value={playerInfo.className}
                      onChange={(e) => setPlayerInfo(p => ({...p, className: e.target.value}))}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                      placeholder="Ví dụ: 12A1"
                    />
                  </div>
                </div>
              </div>
              
              <button 
                onClick={startGame}
                disabled={!playerInfo.name || !playerInfo.className}
                className="w-full group relative inline-flex items-center justify-center px-8 py-4 font-black text-white transition-all duration-200 bg-gradient-to-r from-red-600 to-red-500 text-lg rounded-2xl hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 focus:outline-none ring-offset-2 focus:ring-4 ring-red-200"
              >
                <Play className="w-6 h-6 mr-2 fill-current" />
                BẮT ĐẦU TRÒ CHƠI
              </button>
            </div>
          </motion.div>
        )}

        {(gameState === 'GAME_OVER' || gameState === 'VICTORY') && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center"
          >
             <div className={`bg-white p-12 rounded-[2.5rem] shadow-2xl text-center max-w-md mx-4 relative overflow-hidden`}>
              {/* Background Status Light */}
              <div className={`absolute top-0 left-0 right-0 h-3 ${gameState === 'VICTORY' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-red-400 to-red-600'}`}></div>

              <div className="mb-6 inline-flex p-4 rounded-full bg-slate-50 shadow-inner">
                {gameState === 'VICTORY' ? (
                   <Award className="w-16 h-16 text-emerald-500" />
                ) : (
                   <AlertCircle className="w-16 h-16 text-red-500" />
                )}
              </div>

              <h2 className="text-4xl font-black text-slate-800 mb-2">
                {gameState === 'VICTORY' ? 'Xuất Sắc!' : 'Cố Gắng Lên!'}
              </h2>
              
              <div className="flex items-baseline justify-center gap-2 mb-4">
                <span className={`text-7xl font-black tracking-tighter ${gameState === 'VICTORY' ? 'text-emerald-500 drop-shadow-sm' : 'text-slate-800'}`}>
                  {score}
                </span>
                <span className="text-xl font-bold text-slate-400 uppercase">điểm</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-8">
                 <p className="text-slate-500 text-sm font-bold uppercase mb-1">Người chơi</p>
                 <p className="text-lg font-bold text-slate-800">{playerInfo.name}</p>
                 <p className="text-slate-500">{playerInfo.className}</p>
              </div>

              {/* Submission Status */}
              <div className="mb-8 flex items-center justify-center gap-3">
                {submitStatus === 'SENDING' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-bold animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang gửi kết quả...
                  </div>
                )}
                {submitStatus === 'SUCCESS' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold">
                    <CheckCircle className="w-4 h-4" />
                    Đã lưu kết quả
                  </div>
                )}
                {submitStatus === 'ERROR' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-full text-sm font-bold">
                    <AlertCircle className="w-4 h-4" />
                    Lỗi kết nối
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 justify-center">
                 <button 
                  onClick={handleShare}
                  className="inline-flex items-center justify-center px-4 py-4 font-bold text-blue-600 bg-blue-100 rounded-2xl hover:bg-blue-200 transition-all"
                  title="Chia sẻ link"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={exportToCSV}
                  className="flex-1 inline-flex items-center justify-center px-6 py-4 font-bold text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 hover:text-slate-800 transition-all"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Lưu CSV
                </button>
                <button 
                  onClick={startGame}
                  className={`flex-1 inline-flex items-center justify-center px-6 py-4 font-bold text-white rounded-2xl transition-all shadow-lg hover:-translate-y-1 hover:shadow-xl ${gameState === 'VICTORY' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-slate-800 hover:bg-slate-700 shadow-slate-300'}`}
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Chơi Lại
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}