import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Heart,
  Timer,
  RefreshCw,
  ArrowLeft,
  Trophy,
  Loader2,
  RotateCw,
  BookOpen,
} from "lucide-react";
import {
  Category,
  ActiveItem,
  GameState,
  PlayerInfo,
  GameItemData,
} from "./types";
import { DEFAULT_GAME_DATA, DEFAULT_SPAWN_INTERVAL } from "./constants";
import { DropZone } from "./components/DropZone";
import { FloatingCard } from "./components/FloatingCard";
import { Feedback } from "./components/Feedback";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwzjxKgbB_wouQS2Ak4jJg3x2HeRNs0I3UzVH1W6PCfkw_-Tbl7ljpEQ3kY7iN9sO5_/exec";
const GAME_DURATION_SEC = 180;
const PASSING_SCORE = 80;

const CATEGORY_SLUGS = {
  [Category.CONTENT]: "content",
  [Category.ART]: "art",
  [Category.LESSON]: "lesson",
};

interface LeaderboardEntry {
  name: string;
  score: number | string;
  timestamp: string;
  result: string;
}

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || "#/");
  const [gameState, setGameState] = useState<GameState>("MENU");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SEC);
  const [items, setItems] = useState<ActiveItem[]>([]);
  const [activeZone, setActiveZone] = useState<Category | null>(null);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>({
    name: "",
    className: "",
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isPortrait, setIsPortrait] = useState(
    window.innerHeight > window.innerWidth,
  );

  const lastSpawnTime = useRef(0);
  const requestRef = useRef<number>(0);
  const deckRef = useRef<GameItemData[]>([]);
  const sessionIdRef = useRef<string>("");
  const scoreRef = useRef(0);
  const playerInfoRef = useRef<PlayerInfo>({ name: "", className: "" });

  useEffect(() => {
    const handleResize = () =>
      setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    playerInfoRef.current = playerInfo;
  }, [playerInfo]);

  const fetchDashboardData = useCallback(async () => {
    if (route !== "#/results" && route !== "/results") return;
    setIsLoadingResults(true);
    try {
      const response = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=getResults&t=${Date.now()}`,
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        const cleanData = data
          .filter((i) => i.name || i["Họ Tên"])
          .map((i) => ({
            name: i.name || i["Họ Tên"],
            score: i.score || i["Điểm"],
            timestamp: i.timestamp || i["Cập nhật lúc"],
            result: i.result || i["Trạng thái"],
          }))
          .sort((a, b) => Number(b.score) - Number(a.score));
        setLeaderboard(cleanData);
      }
    } catch (e) {
      console.error("Lỗi tải bảng xếp hạng:", e);
    } finally {
      setIsLoadingResults(false);
    }
  }, [route]);

  useEffect(() => {
    if (route === "#/results") {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 10000);
      return () => clearInterval(interval);
    }
  }, [route, fetchDashboardData]);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const sendData = useCallback(async (currentScore: number, status: string) => {
    const info = playerInfoRef.current;
    if (!sessionIdRef.current || !info.name) return;

    const payload = {
      SessionID: sessionIdRef.current,
      "Họ Tên": `${info.name} - ${info.className}`,
      Điểm: currentScore,
      "Cập nhật lúc": new Date().toLocaleString("vi-VN"),
      "Trạng thái": status,
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("Lỗi gửi dữ liệu:", e);
    }
  }, []);

  const startGame = () => {
    if (!playerInfo.name.trim() || !playerInfo.className.trim()) return;

    sessionIdRef.current =
      "S-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    deckRef.current = [...DEFAULT_GAME_DATA].sort(() => Math.random() - 0.5);
    scoreRef.current = 0;
    setScore(0);
    setLives(5);
    setTimeLeft(GAME_DURATION_SEC);
    setItems([]);
    setGameState("PLAYING");
    sendData(0, "Đang thi");
  };

  const spawnItem = useCallback(() => {
    if (deckRef.current.length === 0) {
      deckRef.current = [...DEFAULT_GAME_DATA].sort(() => Math.random() - 0.5);
    }
    const template = deckRef.current.pop();
    if (!template) return;

    setItems((prev) => [
      ...prev,
      {
        ...template,
        id: Math.random().toString(36).substr(2, 9),
        x: -30,
        y: 12 + Math.random() * 28, // Khu vực xuất hiện thẻ trung tâm hơn
        speed: 0.25 + scoreRef.current / 6000,
        isDragging: false,
      },
    ]);
  }, []);

  const updateGame = useCallback(
    (time: number) => {
      if (gameState !== "PLAYING") return;

      if (time - lastSpawnTime.current > DEFAULT_SPAWN_INTERVAL) {
        spawnItem();
        lastSpawnTime.current = time;
      }

      setItems(
        (prev) =>
          prev
            .map((item) => {
              if (item.isDragging) return item;
              const nextX = item.x + item.speed;
              if (nextX > 115) {
                if (item.isCorrect) setLives((l) => Math.max(0, l - 1));
                return null;
              }
              return { ...item, x: nextX };
            })
            .filter(Boolean) as ActiveItem[],
      );

      requestRef.current = requestAnimationFrame(updateGame);
    },
    [gameState, spawnItem],
  );

  useEffect(() => {
    if (gameState === "PLAYING") {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, updateGame]);

  useEffect(() => {
    if (gameState === "PLAYING") {
      const timer = setInterval(
        () =>
          setTimeLeft((t) => {
            if (t <= 1) {
              const finalScore = scoreRef.current;
              const finalStatus =
                finalScore >= PASSING_SCORE ? "Đạt" : "Chưa đạt";
              sendData(finalScore, finalStatus);
              setGameState(
                finalScore >= PASSING_SCORE ? "VICTORY" : "GAME_OVER",
              );
              return 0;
            }
            return t - 1;
          }),
        1000,
      );
      return () => clearInterval(timer);
    }
  }, [gameState, sendData]);

  useEffect(() => {
    if (lives <= 0 && gameState === "PLAYING") {
      const finalScore = scoreRef.current;
      const finalStatus = finalScore >= PASSING_SCORE ? "Đạt" : "Chưa đạt";
      setGameState(finalScore >= PASSING_SCORE ? "VICTORY" : "GAME_OVER");
      sendData(finalScore, finalStatus);
    }
  }, [lives, gameState, sendData]);

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
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        ) {
          return zone.cat;
        }
      }
    }
    return null;
  };

  const handleDragEnd = (id: string, info: any) => {
    const dropX = info.point.x;
    const dropY = info.point.y;
    const droppedCategory = getCategoryAtPoint(dropX, dropY);

    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;

      if (droppedCategory) {
        if (!item.isCorrect) {
          setLives((l) => Math.max(0, l - 1));
          setFeedbacks((f) => [
            ...f,
            {
              id: Math.random().toString(),
              type: "wrong",
              x: dropX,
              y: dropY,
              message: "Sai!",
            },
          ]);
          return prev.filter((i) => i.id !== id);
        } else if (droppedCategory === item.category) {
          const newScore = scoreRef.current + 10;
          scoreRef.current = newScore;
          setScore(newScore);
          sendData(newScore, "Đang thi");
          setFeedbacks((f) => [
            ...f,
            {
              id: Math.random().toString(),
              type: "correct",
              x: dropX,
              y: dropY,
            },
          ]);
          return prev.filter((i) => i.id !== id);
        } else {
          setLives((l) => Math.max(0, l - 1));
          setFeedbacks((f) => [
            ...f,
            {
              id: Math.random().toString(),
              type: "wrong",
              x: dropX,
              y: dropY,
              message: "Mục!",
            },
          ]);
          return prev.map((i) =>
            i.id === id ? { ...i, isDragging: false } : i,
          );
        }
      }
      return prev.map((i) => (i.id === id ? { ...i, isDragging: false } : i));
    });

    setActiveZone(null);
  };

  const handleDrag = (point: { x: number; y: number }) => {
    const zone = getCategoryAtPoint(point.x, point.y);
    setActiveZone(zone);
  };

  return (
    <div className="relative w-full h-[100svh] bg-slate-50 overflow-hidden select-none touch-none">
      {/* Portrait Warning */}
      <AnimatePresence>
        {isPortrait && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-10 text-center text-white"
          >
            <RotateCw
              size={64}
              className="mb-6 animate-spin-slow text-indigo-400"
            />
            <h2 className="text-xl font-black mb-2 uppercase tracking-tighter">
              XOAY NGANG ĐIỆN THOẠI
            </h2>
            <p className="text-slate-400 font-bold text-xs">
              Vui lòng xoay ngang để có trải nghiệm chơi tốt nhất.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adjusted HUD: Score, Lives & Timer - Lowered further for better visibility */}
      <AnimatePresence>
        {gameState === "PLAYING" && !isPortrait && (
          <motion.div
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            className="absolute top-6 left-6 right-6 z-40 flex justify-between items-center pointer-events-none"
          >
            <div className="flex gap-2 pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg flex items-center gap-3 border border-white/60">
                <div className="bg-indigo-50 p-1.5 rounded-lg">
                  <Award className="text-indigo-600 w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <p className="text-[7px] font-black text-slate-400 uppercase leading-none">
                    Điểm
                  </p>
                  <p className="text-sm font-black tabular-nums leading-none mt-0.5">
                    {score}
                  </p>
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg flex items-center gap-3 border border-white/60">
                <div className="bg-rose-50 p-1.5 rounded-lg">
                  <Heart
                    className="text-rose-500 w-4 h-4"
                    fill="currentColor"
                  />
                </div>
                <div className="flex flex-col">
                  <p className="text-[7px] font-black text-slate-400 uppercase leading-none">
                    Mạng
                  </p>
                  <p className="text-sm font-black tabular-nums leading-none mt-0.5">
                    {lives}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/90 backdrop-blur-md px-5 py-2 rounded-2xl text-white flex items-center gap-3 border border-white/10 shadow-xl pointer-events-auto">
              <Timer
                className={`w-4 h-4 ${timeLeft < 30 ? "text-rose-400 animate-pulse" : "text-indigo-400"}`}
              />
              <p className="text-sm font-mono font-black">
                {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop Zones - Height remains at ~28-30% for iPhone landscape */}
      <div className="absolute bottom-0 left-0 right-0 h-[28%] md:h-[32%] z-20 px-4 pb-[env(safe-area-inset-bottom,16px)] pt-2 grid grid-cols-3 gap-3 bg-gradient-to-t from-white via-white/90 to-transparent">
        {Object.entries(CATEGORY_SLUGS).map(([cat, slug]) => (
          <DropZone
            key={cat}
            category={cat as Category}
            slug={slug}
            highlight={activeZone === cat}
          />
        ))}
      </div>

      <div className="absolute inset-0 z-10 overflow-hidden">
        {items.map((item) => (
          <FloatingCard
            key={item.id}
            item={item}
            onDragStart={(id) =>
              setItems((p) =>
                p.map((i) => (i.id === id ? { ...i, isDragging: true } : i)),
              )
            }
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      <AnimatePresence>
        {feedbacks.map((f) => (
          <Feedback
            key={f.id}
            {...f}
            onComplete={() =>
              setFeedbacks((p) => p.filter((i) => i.id !== f.id))
            }
          />
        ))}
      </AnimatePresence>

      {/* MENU - Landscape Optimized Two-Column Layout */}
      <AnimatePresence>
        {gameState === "MENU" && !isPortrait && (
          <div className="absolute inset-0 z-50 bg-slate-900/20 backdrop-blur-lg flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl max-w-3xl w-full border border-white flex gap-8 items-center overflow-hidden"
            >
              <div className="hidden sm:flex flex-col items-center justify-center w-1/3 text-center border-r border-slate-100 pr-8">
                <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-indigo-200">
                  <BookOpen size={32} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-slate-800 mb-1 italic tracking-tight">
                  Dòng Chảy
                </h1>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Phân loại văn học
                </p>
              </div>

              <div className="flex-1 space-y-4">
                <div className="sm:hidden text-center mb-2">
                  <h1 className="text-2xl font-black text-slate-800 italic">
                    Dòng Chảy
                  </h1>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={playerInfo.name}
                    placeholder="Họ và tên..."
                    onChange={(e) =>
                      setPlayerInfo((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-xs"
                  />
                  <input
                    type="text"
                    value={playerInfo.className}
                    placeholder="Lớp học..."
                    onChange={(e) =>
                      setPlayerInfo((p) => ({
                        ...p,
                        className: e.target.value,
                      }))
                    }
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-xs"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={startGame}
                    disabled={!playerInfo.name || !playerInfo.className}
                    className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg disabled:opacity-50 active:scale-95 transition-all hover:bg-indigo-500 flex-1"
                  >
                    BẮT ĐẦU CHƠI
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {(gameState === "GAME_OVER" || gameState === "VICTORY") && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-white p-6 rounded-[3rem] shadow-2xl text-center max-w-sm w-full"
            >
              <h2 className="text-2xl font-black mb-1 text-slate-800 uppercase tracking-tighter">
                {gameState === "VICTORY" ? "HOÀN THÀNH!" : "KẾT THÚC"}
              </h2>
              <div className="text-6xl font-black text-indigo-600 mb-4 tracking-tighter">
                {score}
              </div>
              <div className="mb-6">
                <span
                  className={`px-5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${score >= PASSING_SCORE ? "text-green-600 bg-green-50 border-green-200" : "text-rose-500 bg-rose-50 border-rose-200"}`}
                >
                  {score >= PASSING_SCORE ? "ĐẠT YÊU CẦU" : "CHƯA ĐẠT"}
                </span>
              </div>
              <button
                onClick={() => setGameState("MENU")}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black active:scale-95 transition-all"
              >
                CHƠI LẠI
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bảng Xếp Hạng - Landscape Optimization */}
      {route === "#/results" && (
        <div className="absolute inset-0 z-[60] bg-[#020617] text-white p-4 md:px-12 overflow-y-auto">
          <header className="flex justify-between items-center mb-6 max-w-4xl mx-auto sticky top-0 bg-[#020617]/90 backdrop-blur py-2 z-10">
            <h1 className="text-xl font-black flex items-center gap-3">
              <Trophy className="text-amber-400 w-5 h-5" /> BẢNG VÀNG
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => (window.location.hash = "#/")}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl font-bold flex items-center gap-2 hover:bg-white/10 text-xs"
              >
                {" "}
                <ArrowLeft size={14} />{" "}
              </button>
              <button
                onClick={() => fetchDashboardData()}
                disabled={isLoadingResults}
                className={`p-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all ${isLoadingResults ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoadingResults ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
              </button>
            </div>
          </header>

          <div className="max-w-4xl mx-auto space-y-2 pb-10">
            {leaderboard.map((p, i) => (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={i}
                className="bg-white/5 p-3 rounded-2xl flex justify-between items-center border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${i === 0 ? "bg-amber-400 text-slate-900" : i === 1 ? "bg-slate-300 text-slate-900" : "bg-slate-800 text-slate-400"}`}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-bold text-slate-200 truncate max-w-[140px] md:max-w-md">
                    {p.name}
                  </h3>
                </div>
                <div className="flex items-center gap-6">
                  <p className="text-lg font-black text-indigo-400 tabular-nums">
                    {p.score}
                  </p>
                  <p
                    className={`hidden sm:block text-[8px] font-black px-2 py-0.5 rounded-full ${p.result === "Đạt" ? "text-green-500 bg-green-500/10" : "text-slate-400 bg-white/5"}`}
                  >
                    {p.result}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
