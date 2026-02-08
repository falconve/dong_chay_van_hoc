
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, Heart, Timer, RefreshCw, ArrowLeft, Trophy, Loader2, RotateCw, BookOpen, Users, CheckCircle2, XCircle, Trash2, Volume2, VolumeX
} from 'lucide-react';
import { Category, ActiveItem, GameState, PlayerInfo, GameItemData } from './types';
import { DEFAULT_GAME_DATA, DEFAULT_SPAWN_INTERVAL } from './constants';
import { DropZone } from './components/DropZone';
import { FloatingCard } from './components/FloatingCard';
import { Feedback } from './components/Feedback';

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwzjxKgbB_wouQS2Ak4jJg3x2HeRNs0I3UzVH1W6PCfkw_-Tbl7ljpEQ3kY7iN9sO5_/exec";
const BACKGROUND_MUSIC_URL = "https://mrfalcon.top/mp3_game/Nha%CC%A3c%20gio%CC%9B%CC%81i%20thie%CC%A3%CC%82u%20%C4%91a%CC%A3i%20bie%CC%82%CC%89u%201.mp3"; // Nhạc thắng cuộc/vinh danh
const GAME_DURATION_SEC = 180;
const PASSING_SCORE = 80;
const MAX_SCORE = 100;

const CATEGORY_SLUGS = {
  [Category.CONTENT]: 'content',
  [Category.ART]: 'art',
  [Category.LESSON]: 'lesson'
};

interface LeaderboardEntry {
  name: string;
  score: number | string;
  timestamp: string;
  result: string;
}

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || '#/');
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [items, setItems] = useState<ActiveItem[]>([]);
  const [activeZone, setActiveZone] = useState<Category | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>({ name: '', className: '' });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [isMuted, setIsMuted] = useState(false);

  const lastSpawnTime = useRef(0);
  const requestRef = useRef<number>(0);
  const deckRef = useRef<GameItemData[]>([]); 
  const sessionIdRef = useRef<string>("");
  const scoreRef = useRef(0);
  const playerInfoRef = useRef<PlayerInfo>({ name: '', className: '' });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Khởi tạo Audio
  useEffect(() => {
    audioRef.current = new Audio(BACKGROUND_MUSIC_URL);
    audioRef.current.loop = true;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Điều khiển nhạc theo route
  useEffect(() => {
    if (audioRef.current) {
      if (route === '#/results' && !isMuted) {
        audioRef.current.play().catch(e => console.log("Audio play blocked", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [route, isMuted]);

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    playerInfoRef.current = playerInfo;
  }, [playerInfo]);

  const fetchDashboardData = useCallback(async () => {
    if (route !== '#/results' && route !== '/results') return;
    setIsLoadingResults(true);
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResults&t=${Date.now()}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const cleanData = data
          .filter(i => i.name || i["Họ Tên"])
          .map(i => ({
            name: i.name || i["Họ Tên"],
            score: i.score || i["Điểm"],
            timestamp: i.timestamp || i["Cập nhật lúc"],
            result: i.result || i["Trạng thái"]
          }))
          .sort((a,b) => Number(b.score) - Number(a.score));
        setLeaderboard(cleanData);
      }
    } catch (e) {
      console.error("Lỗi tải bảng xếp hạng:", e);
    } finally {
      setIsLoadingResults(false);
    }
  }, [route]);

  const stats = useMemo(() => {
    const total = leaderboard.length;
    if (total === 0) return { total: 0, passing: 0, failing: 0, passRate: 0, failRate: 0 };
    const passingCount = leaderboard.filter(p => p.result === 'Đạt').length;
    const failingCount = leaderboard.filter(p => p.result === 'Chưa đạt').length;
    return {
      total,
      passing: passingCount,
      failing: failingCount,
      passRate: Math.round((passingCount / total) * 100),
      failRate: Math.round((failingCount / total) * 100)
    };
  }, [leaderboard]);

  useEffect(() => {
    if (route === '#/results') {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 10000);
      return () => clearInterval(interval);
    }
  }, [route, fetchDashboardData]);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const sendData = useCallback(async (currentScore: number, status: string) => {
    const info = playerInfoRef.current;
    if (!sessionIdRef.current || !info.name) return;
    const payload = {
      "SessionID": sessionIdRef.current,
      "Họ Tên": `${info.name} - ${info.className}`,
      "Điểm": currentScore,
      "Cập nhật lúc": new Date().toLocaleString('vi-VN'),
      "Trạng thái": status
    };
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("Lỗi gửi dữ liệu:", e);
    }
  }, []);

  const resetLeaderboard = useCallback(async () => {
    if (!window.confirm("BẠN CÓ CHẮC CHẮN MUỐN XÓA TẤT CẢ KẾT QUẢ?\nDữ liệu trên Google Sheet sẽ bị xóa vĩnh viễn!")) return;
    
    setLeaderboard([]); // Xóa ngay lập tức trên UI
    setIsLoadingResults(true);
    
    try {
      // Sử dụng POST với body rõ ràng cho action reset
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'reset' }),
      });
      
      // Đợi Google Script xử lý
      setTimeout(() => {
        fetchDashboardData();
      }, 2500);
    } catch (e) {
      console.error("Lỗi khi gửi yêu cầu xóa:", e);
      setIsLoadingResults(false);
      fetchDashboardData();
    }
  }, [fetchDashboardData]);

  const finishGame = useCallback((finalScore: number) => {
    const finalStatus = finalScore >= PASSING_SCORE ? "Đạt" : "Chưa đạt";
    sendData(finalScore, finalStatus);
    setGameState(finalScore >= PASSING_SCORE ? 'VICTORY' : 'GAME_OVER');
  }, [sendData]);

  const startGame = () => {
    if (!playerInfo.name.trim() || !playerInfo.className.trim()) return;
    sessionIdRef.current = "S-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    deckRef.current = [...DEFAULT_GAME_DATA].sort(() => Math.random() - 0.5);
    scoreRef.current = 0;
    setScore(0);
    setLives(5);
    setTimeLeft(GAME_DURATION_SEC);
    setItems([]);
    setGameState('PLAYING');
    sendData(0, "Đang thi");
  };

  const spawnItem = useCallback(() => {
    if (deckRef.current.length === 0) return;
    const template = deckRef.current.pop();
    if (!template) return;
    setItems(prev => [...prev, {
      ...template,
      id: Math.random().toString(36).substr(2, 9),
      x: -35,
      y: 20 + Math.random() * 20, // Hạ thấp vùng trôi để không vướng HUD
      speed: 0.25 + (scoreRef.current / 6000), 
      isDragging: false,
    }]);
  }, []);

  const updateGame = useCallback((time: number) => {
    if (gameState !== 'PLAYING') return;
    if (time - lastSpawnTime.current > DEFAULT_SPAWN_INTERVAL) {
      spawnItem();
      lastSpawnTime.current = time;
    }
    setItems(prev => {
      const updated = prev.map(item => {
        if (item.isDragging) return item;
        const nextX = item.x + item.speed;
        if (nextX > 115) return null;
        return { ...item, x: nextX };
      }).filter(Boolean) as ActiveItem[];
      if (deckRef.current.length === 0 && updated.length === 0 && gameState === 'PLAYING') {
        setTimeout(() => finishGame(scoreRef.current), 500);
      }
      return updated;
    });
    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameState, spawnItem, finishGame]);

  useEffect(() => {
    if (gameState === 'PLAYING') requestRef.current = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, updateGame]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const timer = setInterval(() => setTimeLeft(t => {
        if (t <= 1) { finishGame(scoreRef.current); return 0; }
        return t - 1;
      }), 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, finishGame]);

  useEffect(() => {
    if (lives <= 0 && gameState === 'PLAYING') finishGame(scoreRef.current);
  }, [lives, gameState, finishGame]);

  const getCategoryAtPoint = (x: number, y: number) => {
    const zones = [
      { cat: Category.CONTENT, id: `zone-${CATEGORY_SLUGS[Category.CONTENT]}` },
      { cat: Category.ART, id: `zone-${CATEGORY_SLUGS[Category.ART]}` },
      { cat: Category.LESSON, id: `zone-${CATEGORY_SLUGS[Category.LESSON]}` },
    ];
    for (const zone of zones) {
      const el = document.getElementById(zone.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return zone.cat;
      }
    }
    return null;
  };

  const handleDragEnd = (id: string, info: any) => {
    const dropX = info.point.x;
    const dropY = info.point.y;
    const droppedCategory = getCategoryAtPoint(dropX, dropY);
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      if (droppedCategory) {
        // Chỉ tính điểm khi đúng nội dung VÀ đúng ô
        if (item.isCorrect && droppedCategory === item.category) {
          const newScore = Math.min(MAX_SCORE, scoreRef.current + 10);
          scoreRef.current = newScore;
          setScore(newScore);
          sendData(newScore, "Đang thi");
          setFeedbacks(f => [...f, { id: Math.random().toString(), type: 'correct', x: dropX, y: dropY }]);
          if (newScore >= MAX_SCORE) setTimeout(() => finishGame(MAX_SCORE), 800);
          return prev.filter(i => i.id !== id);
        } else {
          // Trừ mạng nếu: nội dung sai HOẶC nội dung đúng nhưng kéo sai ô
          setLives(l => Math.max(0, l - 1));
          setFeedbacks(f => [...f, { 
            id: Math.random().toString(), 
            type: 'wrong', 
            x: dropX, 
            y: dropY, 
            message: !item.isCorrect ? "Nội dung sai!" : "Sai mục rồi!" 
          }]);
          return prev.filter(i => i.id !== id);
        }
      }
      return prev.map(i => i.id === id ? { ...i, isDragging: false } : i);
    });
    setActiveZone(null);
  };

  const handleDrag = (point: { x: number, y: number }) => {
    const zone = getCategoryAtPoint(point.x, point.y);
    setActiveZone(zone);
  };

  return (
    <div className="relative w-full h-[100svh] bg-slate-50 overflow-hidden select-none touch-none">
      <AnimatePresence>
        {isPortrait && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-10 text-center text-white">
            <RotateCw size={64} className="mb-6 animate-spin-slow text-indigo-400" />
            <h2 className="text-xl font-black mb-2 uppercase tracking-tighter">XOAY NGANG ĐIỆN THOẠI</h2>
            <p className="text-slate-400 font-bold text-xs">Vui lòng xoay ngang để có trải nghiệm chơi tốt nhất.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameState === 'PLAYING' && !isPortrait && (
          <motion.div initial={{ y: -80 }} animate={{ y: 0 }} className="absolute top-14 left-8 right-8 z-40 flex justify-between items-center pointer-events-none pt-[env(safe-area-inset-top)]">
            <div className="flex gap-4 pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 border border-white/60">
                <div className="bg-indigo-50 p-2 rounded-xl"><Award className="text-indigo-600 w-5 h-5" /></div>
                <div className="flex flex-col"><p className="text-[9px] font-black text-slate-400 uppercase leading-none">Điểm</p><p className="text-lg font-black tabular-nums leading-none mt-1">{score}</p></div>
              </div>
              <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-3 border border-white/60">
                <div className="bg-rose-50 p-2 rounded-xl"><Heart className="text-rose-500 w-5 h-5" fill="currentColor" /></div>
                <div className="flex flex-col"><p className="text-[9px] font-black text-slate-400 uppercase leading-none">Mạng</p><p className="text-lg font-black tabular-nums leading-none mt-1">{lives}</p></div>
              </div>
            </div>
            <div className="bg-slate-900/90 backdrop-blur-md px-7 py-2.5 rounded-2xl text-white flex items-center gap-4 border border-white/10 shadow-2xl pointer-events-auto">
              <Timer className={`w-5 h-5 ${timeLeft < 30 ? 'text-rose-400 animate-pulse' : 'text-indigo-400'}`} />
              <p className="text-lg font-mono font-black tabular-nums">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 h-[28%] md:h-[32%] z-20 px-4 pb-[env(safe-area-inset-bottom,16px)] pt-2 grid grid-cols-3 gap-3 bg-gradient-to-t from-white via-white/90 to-transparent">
        {Object.entries(CATEGORY_SLUGS).map(([cat, slug]) => (
          <DropZone key={cat} category={cat as Category} slug={slug} highlight={activeZone === cat} />
        ))}
      </div>

      <div className="absolute inset-0 z-10 overflow-hidden">
        {items.map(item => (
          <FloatingCard key={item.id} item={item} onDragStart={(id) => setItems(p => p.map(i => i.id === id ? {...i, isDragging: true} : i))} onDrag={handleDrag} onDragEnd={handleDragEnd} />
        ))}
      </div>

      <AnimatePresence>{feedbacks.map(f => <Feedback key={f.id} {...f} onComplete={() => setFeedbacks(p => p.filter(i => i.id !== f.id))} />)}</AnimatePresence>

      <AnimatePresence>
        {gameState === 'MENU' && !isPortrait && (
          <div className="absolute inset-0 z-50 bg-slate-900/20 backdrop-blur-lg flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-3xl w-full border border-white flex gap-8 items-center overflow-hidden">
               <div className="hidden sm:flex flex-col items-center justify-center w-1/3 text-center border-r border-slate-100 pr-8">
                 <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-indigo-200"><BookOpen size={32} className="text-white" /></div>
                 <h1 className="text-3xl font-black text-slate-800 mb-1 italic tracking-tight">Dòng Chảy</h1>
                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Phân loại văn học</p>
               </div>
               <div className="flex-1 space-y-4">
                 <div className="sm:hidden text-center mb-2"><h1 className="text-2xl font-black text-slate-800 italic">Dòng Chảy</h1></div>
                 <div className="grid grid-cols-2 gap-3">
                   <input type="text" value={playerInfo.name} placeholder="Họ và tên..." onChange={e => setPlayerInfo(p => ({...p, name: e.target.value}))} className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-xs" />
                   <input type="text" value={playerInfo.className} placeholder="Lớp học..." onChange={e => setPlayerInfo(p => ({...p, className: e.target.value}))} className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-xs" />
                 </div>
                 <div className="flex gap-3">
                   <button onClick={startGame} disabled={!playerInfo.name || !playerInfo.className} className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg disabled:opacity-50 active:scale-95 transition-all hover:bg-indigo-500 flex-1">BẮT ĐẦU CHƠI</button>
                   <button onClick={() => window.location.hash = '#/results'} className="px-6 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-all">BẢNG VÀNG</button>
                 </div>
               </div>
            </motion.div>
          </div>
        )}

        {(gameState === 'GAME_OVER' || gameState === 'VICTORY') && (
           <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6">
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-6 rounded-[3rem] shadow-2xl text-center max-w-sm w-full">
                 <h2 className="text-2xl font-black mb-1 text-slate-800 uppercase tracking-tighter">{gameState === 'VICTORY' ? 'HOÀN THÀNH!' : 'KẾT THÚC'}</h2>
                 <div className="text-6xl font-black text-indigo-600 mb-4 tracking-tighter">{score}</div>
                 <div className="mb-6"><span className={`px-5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${score >= PASSING_SCORE ? 'text-green-600 bg-green-50 border-green-200' : 'text-rose-500 bg-rose-50 border-rose-200'}`}>{score >= PASSING_SCORE ? 'ĐẠT YÊU CẦU' : 'CHƯA ĐẠT'}</span></div>
                 <button onClick={() => setGameState('MENU')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black active:scale-95 transition-all">CHƠI LẠI</button>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {route === '#/results' && (
        <div className="absolute inset-0 z-[60] bg-[#020617] text-white p-4 md:px-12 overflow-y-auto">
          <header className="flex justify-between items-center mb-6 max-w-5xl mx-auto sticky top-0 bg-[#020617]/95 backdrop-blur-md py-4 z-10 px-2">
            <div className="flex items-center gap-4">
               <h1 className="text-xl md:text-2xl font-black flex items-center gap-3"><Trophy className="text-amber-400 w-6 h-6" /> BẢNG VÀNG</h1>
               <button onClick={() => setIsMuted(!isMuted)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                 {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
               </button>
            </div>
            <div className="flex gap-2">
              <button onClick={resetLeaderboard} disabled={isLoadingResults} className={`p-2.5 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-xl hover:bg-rose-600/40 transition-all ${isLoadingResults ? 'opacity-30 cursor-not-allowed' : 'active:scale-90'}`} title="Xóa toàn bộ dữ liệu">
                {isLoadingResults ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              </button>
              <button onClick={() => window.location.hash = '#/'} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl font-bold flex items-center gap-2 hover:bg-white/10 text-xs active:scale-95 transition-all"><ArrowLeft size={16} /> QUAY LẠI</button>
              <button onClick={() => fetchDashboardData()} disabled={isLoadingResults} className={`p-2.5 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all ${isLoadingResults ? 'opacity-50 cursor-not-allowed' : 'active:scale-90'}`}> 
                {isLoadingResults ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} 
              </button>
            </div>
          </header>

          <div className="max-w-5xl mx-auto mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400"><Users size={24} /></div>
                <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight">Tổng tham gia</p><p className="text-2xl font-black text-white tabular-nums">{stats.total}</p></div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400"><CheckCircle2 size={24} /></div>
                <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight">Tỷ lệ đạt</p><p className="text-2xl font-black text-white tabular-nums">{stats.passRate}% <span className="text-[10px] font-bold text-slate-500 ml-1">({stats.passing})</span></p></div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400"><XCircle size={24} /></div>
                <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight">Tỷ lệ chưa đạt</p><p className="text-2xl font-black text-white tabular-nums">{stats.failRate}% <span className="text-[10px] font-bold text-slate-500 ml-1">({stats.failing})</span></p></div>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto space-y-2 pb-10">
            {leaderboard.length === 0 && !isLoadingResults ? (
              <div className="text-center py-20 bg-white/5 rounded-[40px] border border-white/5">
                <Trophy size={48} className="mx-auto mb-4 text-slate-700" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Hiện tại bảng vàng đang trống.</p>
              </div>
            ) : (
              leaderboard.map((p, i) => (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={i} className="bg-white/5 p-4 rounded-3xl flex justify-between items-center border border-white/5 group hover:bg-white/[0.08] transition-all">
                  <div className="flex items-center gap-5">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-amber-400 text-slate-900' : i === 1 ? 'bg-slate-300 text-slate-900' : i === 2 ? 'bg-orange-400 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>{i+1}</span>
                    <div><h3 className="text-base font-black text-slate-200 group-hover:text-white transition-colors truncate max-w-[160px] md:max-w-md">{p.name}</h3><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{p.timestamp}</p></div>
                  </div>
                  <div className="flex items-center gap-8"><div className="text-right"><p className="text-2xl font-black text-indigo-400 tabular-nums leading-none">{p.score}</p><p className={`text-[8px] font-black px-2 py-0.5 rounded-full mt-2 inline-block ${p.result === 'Đạt' ? 'text-green-500 bg-green-500/10' : p.result === 'Đang thi' ? 'text-amber-500 bg-amber-500/10 animate-pulse' : 'text-slate-400 bg-white/5'}`}>{p.result}</p></div></div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
