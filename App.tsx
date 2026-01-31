import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  RotateCcw,
  Award,
  Heart,
  Timer,
  AlertCircle,
  User,
  School,
} from "lucide-react";
import { Category, ActiveItem, GameState, PlayerInfo } from "./types";
import { GAME_DATA } from "./constants";
import { DropZone } from "./components/DropZone";
import { FloatingCard } from "./components/FloatingCard";
import { Feedback } from "./components/Feedback";

const SPAWN_INTERVAL_MS = 5000;
const GAME_DURATION_SEC = 180;
const MOVEMENT_SPEED = 0.38;

interface FeedbackItem {
  id: string;
  type: "correct" | "wrong";
  x: number;
  y: number;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>("MENU");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [items, setItems] = useState<ActiveItem[]>([]);
  const [activeZone, setActiveZone] = useState<Category | null>(null);

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>({
    name: "",
    className: "",
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const lessonRef = useRef<HTMLDivElement>(null);
  const lastSpawnTime = useRef(0);
  const requestRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
  };

  const playSound = (type: "correct" | "wrong") => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === "correct") {
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
    } else {
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
    }
    osc.start(now);
    osc.stop(now + 0.3);
  };

  const spawnItem = useCallback(() => {
    const template = GAME_DATA[Math.floor(Math.random() * GAME_DATA.length)];
    const newItem: ActiveItem = {
      ...template,
      id: Math.random().toString(36).substr(2, 9),
      x: -30,
      y: 15 + Math.random() * 40,
      speed: MOVEMENT_SPEED,
      isDragging: false,
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  const updateGame = useCallback(
    (time: number) => {
      if (gameState !== "PLAYING") return;

      if (time - lastSpawnTime.current > SPAWN_INTERVAL_MS) {
        spawnItem();
        lastSpawnTime.current = time;
      }

      setItems((prevItems) => {
        const nextItems: ActiveItem[] = [];
        let missed = false;
        prevItems.forEach((item) => {
          if (item.isDragging) {
            nextItems.push(item);
            return;
          }
          const nextX = item.x + item.speed;
          if (nextX > 110) missed = true;
          else nextItems.push({ ...item, x: nextX });
        });

        if (missed) {
          setLives((l) => {
            const newLives = Math.max(0, l - 1);
            if (newLives < l) playSound("wrong");
            return newLives;
          });
        }
        return nextItems;
      });

      requestRef.current = requestAnimationFrame(updateGame);
    },
    [gameState, spawnItem],
  );

  useEffect(() => {
    if (gameState === "PLAYING") {
      lastSpawnTime.current = performance.now();
      requestRef.current = requestAnimationFrame(updateGame);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, updateGame]);

  useEffect(() => {
    if (gameState !== "PLAYING") return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameState(score > 50 ? "VICTORY" : "GAME_OVER");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, score]);

  useEffect(() => {
    if (lives <= 0 && gameState === "PLAYING") setGameState("GAME_OVER");
  }, [lives, gameState]);

  const checkCollision = (point: { x: number; y: number }): Category | null => {
    const zones = [
      { id: Category.CONTENT, ref: contentRef },
      { id: Category.ART, ref: artRef },
      { id: Category.LESSON, ref: lessonRef },
    ];
    for (const zone of zones) {
      if (zone.ref.current) {
        const rect = zone.ref.current.getBoundingClientRect();
        // Give a bit of buffer for mobile touch
        const buffer = 15;
        if (
          point.x >= rect.left - buffer &&
          point.x <= rect.right + buffer &&
          point.y >= rect.top - buffer &&
          point.y <= rect.bottom + buffer
        ) {
          return zone.id;
        }
      }
    }
    return null;
  };

  const handleDragStart = (id: string) => {
    initAudio();
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isDragging: true } : item,
      ),
    );
  };

  const handleDragMove = (point: { x: number; y: number }) => {
    const hovered = checkCollision(point);
    if (hovered !== activeZone) setActiveZone(hovered);
  };

  const handleDragEnd = (id: string, info: any) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const dropped = checkCollision(info.point);
    if (dropped) {
      const isCorrect = dropped === item.category;
      playSound(isCorrect ? "correct" : "wrong");
      setFeedbacks((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: isCorrect ? "correct" : "wrong",
          x: info.point.x,
          y: info.point.y,
        },
      ]);

      if (isCorrect) {
        setScore((s) => s + 10);
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        setLives((l) => Math.max(0, l - 1));
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isDragging: false } : i)),
        );
      }
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isDragging: false } : i)),
      );
    }
    setActiveZone(null);
  };

  const startGame = () => {
    if (!playerInfo.name.trim() || !playerInfo.className.trim()) return;
    setScore(0);
    setLives(5);
    setTimeLeft(GAME_DURATION_SEC);
    setItems([]);
    setGameState("PLAYING");
  };

  return (
    <div className="relative w-full h-screen bg-[#f8fafc] overflow-hidden select-none touch-none font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-200 rounded-full blur-[100px] animate-pulse delay-700" />
      </div>

      {/* HUD - Compact on mobile */}
      <div className="absolute top-3 md:top-6 left-3 md:left-6 right-3 md:right-6 z-40 flex justify-between items-center pointer-events-none">
        <div className="flex gap-2 md:gap-4">
          <div className="bg-white/70 backdrop-blur-lg border border-white/40 px-3 py-1.5 md:px-6 md:py-3 rounded-xl shadow-lg flex items-center gap-2 md:gap-4">
            <Award className="w-4 h-4 md:w-6 md:h-6 text-indigo-500" />
            <div>
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
                Score
              </p>
              <p className="text-sm md:text-2xl font-black text-slate-800">
                {score}
              </p>
            </div>
          </div>
          <div className="bg-white/70 backdrop-blur-lg border border-white/40 px-3 py-1.5 md:px-6 md:py-3 rounded-xl shadow-lg flex items-center gap-2 md:gap-4">
            <Heart
              className={`w-4 h-4 md:w-6 md:h-6 text-rose-500 fill-rose-500`}
            />
            <div>
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
                Lives
              </p>
              <div className="flex gap-0.5 mt-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 md:w-3 md:h-3 rounded-full ${i < lives ? "bg-rose-500" : "bg-slate-200"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-lg border border-slate-700 px-3 py-1.5 md:px-8 md:py-3 rounded-xl shadow-lg flex items-center gap-2 md:gap-4 text-white">
          <Timer
            className={`w-4 h-4 md:w-6 md:h-6 ${timeLeft < 30 ? "text-rose-400 animate-pulse" : "text-indigo-400"}`}
          />
          <div className="text-right">
            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
              Time
            </p>
            <p className="text-sm md:text-2xl font-mono font-black leading-none">
              {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>

      {/* Cards Canvas */}
      <div className="absolute inset-0 z-10">
        <AnimatePresence>
          {items.map((item) => (
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
        {feedbacks.map((fb) => (
          <Feedback
            key={fb.id}
            x={fb.x}
            y={fb.y}
            type={fb.type}
            onComplete={() =>
              setFeedbacks((prev) => prev.filter((p) => p.id !== fb.id))
            }
          />
        ))}
      </AnimatePresence>

      {/* Bottom Drop Zones - Fixed Height for Mobile */}
      <div className="absolute bottom-0 left-0 right-0 h-[22%] md:h-[32%] z-20 p-2 md:p-8 flex gap-2 md:gap-8 items-stretch justify-center bg-gradient-to-t from-white via-white/90 to-transparent">
        <div className="flex-1 max-w-[120px] md:max-w-sm">
          <DropZone
            ref={contentRef}
            category={Category.CONTENT}
            highlight={activeZone === Category.CONTENT}
          />
        </div>
        <div className="flex-1 max-w-[120px] md:max-w-sm">
          <DropZone
            ref={artRef}
            category={Category.ART}
            highlight={activeZone === Category.ART}
          />
        </div>
        <div className="flex-1 max-w-[120px] md:max-w-sm">
          <DropZone
            ref={lessonRef}
            category={Category.LESSON}
            highlight={activeZone === Category.LESSON}
          />
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {gameState === "MENU" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-lg flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-6 md:p-12 rounded-[32px] md:rounded-[40px] shadow-2xl text-center max-w-lg w-full border border-white"
            >
              <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-2 tracking-tight">
                Dòng Chảy Văn Học
              </h1>
              <p className="text-slate-500 mb-6 md:mb-8 text-sm md:text-lg font-medium">
                Thử thách phân loại kiến thức
              </p>

              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                <div className="relative group">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500"
                    size={18}
                  />
                  <input
                    type="text"
                    value={playerInfo.name}
                    placeholder="Họ và tên..."
                    onChange={(e) =>
                      setPlayerInfo((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-700"
                  />
                </div>
                <div className="relative group">
                  <School
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500"
                    size={18}
                  />
                  <input
                    type="text"
                    value={playerInfo.className}
                    placeholder="Lớp (VD: 12A1)..."
                    onChange={(e) =>
                      setPlayerInfo((p) => ({
                        ...p,
                        className: e.target.value,
                      }))
                    }
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-slate-700"
                  />
                </div>
              </div>

              <button
                onClick={startGame}
                disabled={
                  !playerInfo.name.trim() || !playerInfo.className.trim()
                }
                className="w-full py-4 md:py-5 font-black text-white bg-indigo-600 rounded-xl md:rounded-2xl hover:bg-indigo-700 shadow-xl disabled:opacity-50 transition-all active:scale-95"
              >
                BẮT ĐẦU CHƠI
              </button>
            </motion.div>
          </motion.div>
        )}

        {(gameState === "GAME_OVER" || gameState === "VICTORY") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white p-8 md:p-12 rounded-[32px] md:rounded-[40px] shadow-2xl text-center max-w-md w-full"
            >
              <h2 className="text-2xl md:text-4xl font-black text-slate-800 mb-2">
                {gameState === "VICTORY" ? "Tuyệt Vời!" : "Kết Thúc!"}
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-sm mb-4">
                Điểm của bạn
              </p>
              <div className="text-5xl md:text-7xl font-black text-indigo-600 mb-8">
                {score}
              </div>

              <button
                onClick={startGame}
                className="w-full py-4 md:py-5 font-black text-lg md:text-xl text-white bg-slate-800 rounded-xl md:rounded-2xl hover:bg-slate-900 flex items-center justify-center gap-3"
              >
                <RotateCcw size={20} /> CHƠI LẠI
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
