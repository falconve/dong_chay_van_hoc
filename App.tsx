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
  "https://script.google.com/macros/s/AKfycbwtnEJ0A_JHUOcdQZ1bPuvIeMp8SDIWvf2sKD3o1ADFxNuee8hdA3xHwCpc79mmqpk/exec";
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

  const lastSpawnTime = useRef(0);
  const requestRef = useRef<number>(0);
  const deckRef = useRef<GameItemData[]>([]);
  const sessionIdRef = useRef<string>("");
  const scoreRef = useRef(0);
  const playerInfoRef = useRef<PlayerInfo>({ name: "", className: "" });

  // Cập nhật ref để sendData luôn có dữ liệu mới nhất
  useEffect(() => {
    playerInfoRef.current = playerInfo;
  }, [playerInfo]);

  const fetchDashboardData = useCallback(async () => {
    setIsLoadingResults(true);
    try {
      const response = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=getResults&t=${Date.now()}`,
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setLeaderboard(
          data
            .filter((i) => i.name)
            .sort((a, b) => Number(b.score) - Number(a.score)),
        );
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const newRoute = window.location.hash || "#/";
      setRoute(newRoute);
      if (newRoute === "#/results") fetchDashboardData();
    };
    window.addEventListener("hashchange", handleHashChange);
    if (window.location.hash === "#/results") fetchDashboardData();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [fetchDashboardData]);

  const sendData = useCallback(async (currentScore: number, status: string) => {
    const info = playerInfoRef.current;
    if (!sessionIdRef.current || !info.name) return;

    const payload = {
      sessionId: sessionIdRef.current,
      name: `${info.name} - ${info.className}`,
      score: currentScore,
      result: status,
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("Gửi dữ liệu lỗi:", e);
    }
  }, []);

  const startGame = () => {
    if (!playerInfo.name.trim() || !playerInfo.className.trim()) return;

    // Reset game
    sessionIdRef.current = "SID-" + Date.now();
    deckRef.current = [...DEFAULT_GAME_DATA].sort(() => Math.random() - 0.5);
    scoreRef.current = 0;
    setScore(0);
    setLives(5);
    setTimeLeft(GAME_DURATION_SEC);
    setItems([]);
    setGameState("PLAYING");

    // Gửi dữ liệu ngay khi bắt đầu
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
        y: 15 + Math.random() * 45,
        speed: 0.22 + scoreRef.current / 10000,
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
              if (nextX > 110) {
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

  // Tìm vùng thả bằng elementFromPoint - Độ chính xác tuyệt đối
  const getZoneFromPoint = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    const zoneElement = element.closest('[id^="zone-"]');
    if (!zoneElement) return null;

    const id = zoneElement.id;
    if (id.includes("content")) return Category.CONTENT;
    if (id.includes("art")) return Category.ART;
    if (id.includes("lesson")) return Category.LESSON;
    return null;
  };

  const handleDragEnd = (id: string, info: any) => {
    const droppedCategory = getZoneFromPoint(info.point.x, info.point.y);

    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;

      if (droppedCategory) {
        if (!item.isCorrect) {
          // Kiến thức sai
          setLives((l) => Math.max(0, l - 1));
          setFeedbacks((f) => [
            ...f,
            {
              id: Math.random().toString(),
              type: "wrong",
              x: info.point.x,
              y: info.point.y,
              message: "Kiến thức sai!",
            },
          ]);
          return prev.filter((i) => i.id !== id);
        } else if (droppedCategory === item.category) {
          // Đúng mục
          const newScore = scoreRef.current + 10;
          scoreRef.current = newScore;
          setScore(newScore);
          sendData(newScore, "Đang thi");
          setFeedbacks((f) => [
            ...f,
            {
              id: Math.random().toString(),
              type: "correct",
              x: info.point.x,
              y: info.point.y,
            },
          ]);
          return prev.filter((i) => i.id !== id);
        } else {
          // Sai mục
          setLives((l) => Math.max(0, l - 1));
          setFeedbacks((f) => [
            ...f,
            {
              id: Math.random().toString(),
              type: "wrong",
              x: info.point.x,
              y: info.point.y,
              message: "Sai mục!",
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
    const zone = getZoneFromPoint(point.x, point.y);
    setActiveZone(zone);
  };

  return (
    <div className="relative w-full h-screen bg-slate-50 overflow-hidden select-none touch-none">
      {/* UI Lớp phủ game */}
      <AnimatePresence>
        {gameState === "PLAYING" && (
          <motion.div
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            className="absolute top-8 left-6 right-6 z-40 flex justify-between pointer-events-none"
          >
            <div className="flex gap-4 pointer-events-auto">
              <div className="bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-xl flex items-center gap-4 border border-white">
                <Award className="text-indigo-600" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none">
                    Điểm
                  </p>
                  <p className="text-2xl font-black tabular-nums leading-none mt-1">
                    {score}
                  </p>
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-xl flex items-center gap-4 border border-white">
                <Heart className="text-rose-500" fill="currentColor" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none">
                    Mạng
                  </p>
                  <p className="text-2xl font-black tabular-nums leading-none mt-1">
                    {lives}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/90 backdrop-blur-xl p-4 px-8 rounded-3xl text-white flex items-center gap-4 border border-white/10 shadow-2xl pointer-events-auto">
              <Timer
                className={
                  timeLeft < 30
                    ? "text-rose-400 animate-pulse"
                    : "text-indigo-400"
                }
              />
              <p className="text-2xl font-mono font-black tabular-nums">
                {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vùng thả DropZone */}
      <div className="absolute bottom-0 left-0 right-0 h-[38%] z-20 p-8 grid grid-cols-3 gap-8 bg-gradient-to-t from-white via-white/80 to-transparent">
        {Object.entries(CATEGORY_SLUGS).map(([cat, slug]) => (
          <DropZone
            key={cat}
            category={cat as Category}
            slug={slug}
            highlight={activeZone === cat}
          />
        ))}
      </div>

      {/* Thẻ trôi nổi */}
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

      {/* Phản hồi điểm số/sai lỗi */}
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

      {/* Màn hình Menu/Kết quả */}
      <AnimatePresence>
        {gameState === "MENU" && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-6 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-12 rounded-[40px] shadow-2xl max-w-lg w-full border border-white"
            >
              <h1 className="text-6xl font-black text-slate-800 mb-2 tracking-tighter">
                Dòng Chảy
              </h1>
              <p className="text-slate-500 font-bold mb-10 uppercase tracking-widest text-[10px]">
                Phân loại kiến thức văn học
              </p>
              <div className="space-y-4 mb-10 text-left">
                <input
                  type="text"
                  value={playerInfo.name}
                  placeholder="Họ và tên học sinh..."
                  onChange={(e) =>
                    setPlayerInfo((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full p-5 bg-slate-100 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all"
                />
                <input
                  type="text"
                  value={playerInfo.className}
                  placeholder="Lớp học..."
                  onChange={(e) =>
                    setPlayerInfo((p) => ({ ...p, className: e.target.value }))
                  }
                  className="w-full p-5 bg-slate-100 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all"
                />
              </div>
              <button
                onClick={startGame}
                disabled={!playerInfo.name || !playerInfo.className}
                className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl shadow-xl disabled:opacity-50 active:scale-95 transition-all hover:bg-indigo-500"
              >
                BẮT ĐẦU CHƠI
              </button>
              <button
                onClick={() => (window.location.hash = "#/results")}
                className="w-full mt-4 py-4 bg-slate-100 rounded-2xl font-black text-slate-600 hover:bg-slate-200 transition-all"
              >
                XEM BẢNG VÀNG
              </button>
            </motion.div>
          </div>
        )}

        {(gameState === "GAME_OVER" || gameState === "VICTORY") && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-white p-12 rounded-[50px] shadow-2xl text-center max-w-sm w-full"
            >
              <h2 className="text-4xl font-black mb-4 text-slate-800 uppercase tracking-tighter">
                {gameState === "VICTORY" ? "HOÀN THÀNH!" : "KẾT THÚC"}
              </h2>
              <div className="text-8xl font-black text-indigo-600 mb-8 tracking-tighter">
                {score}
              </div>
              <div className="mb-8 font-black uppercase tracking-widest text-xs">
                {score >= PASSING_SCORE ? (
                  <span className="text-green-600 bg-green-50 px-8 py-3 rounded-2xl border border-green-200 shadow-sm">
                    ĐẠT YÊU CẦU
                  </span>
                ) : (
                  <span className="text-rose-500 bg-rose-50 px-8 py-3 rounded-2xl border border-rose-200 shadow-sm">
                    CHƯA ĐẠT
                  </span>
                )}
              </div>
              <button
                onClick={() => setGameState("MENU")}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-black active:scale-95 transition-all"
              >
                CHƠI LẠI
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bảng xếp hạng */}
      {route === "#/results" && (
        <div className="absolute inset-0 z-[60] bg-[#020617] text-white p-6 md:p-12 overflow-y-auto">
          <header className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-black flex items-center gap-4">
              <Trophy className="text-amber-400" /> BẢNG VÀNG
            </h1>
            <div className="flex gap-4">
              <button
                onClick={() => (window.location.hash = "#/")}
                className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold flex items-center gap-2 hover:bg-white/10"
              >
                {" "}
                <ArrowLeft size={18} /> QUAY LẠI{" "}
              </button>
              <button
                onClick={() => fetchDashboardData()}
                disabled={isLoadingResults}
                className={`p-3 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all ${isLoadingResults ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoadingResults ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <RefreshCw size={20} />
                )}
              </button>
            </div>
          </header>

          <div className="max-w-4xl mx-auto space-y-4">
            {isLoadingResults && leaderboard.length === 0 ? (
              <div className="flex flex-col items-center py-20 opacity-50">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs">
                  Đang tải bảng xếp hạng...
                </p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-[40px] border border-white/5">
                <Trophy size={48} className="mx-auto mb-4 text-slate-700" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                  Chưa có dữ liệu nào
                </p>
              </div>
            ) : (
              leaderboard.map((p, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i}
                  className="bg-white/5 p-6 rounded-3xl flex justify-between items-center border border-white/5 group hover:bg-white/[0.08] transition-all"
                >
                  <div className="flex items-center gap-6">
                    <span
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${i === 0 ? "bg-amber-400 text-slate-900 shadow-[0_0_20px_rgba(251,191,36,0.4)]" : i === 1 ? "bg-slate-300 text-slate-900" : i === 2 ? "bg-orange-400 text-slate-900" : "bg-slate-800 text-slate-400"}`}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-xl font-black text-slate-200 group-hover:text-white transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        {p.timestamp}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-indigo-400 tabular-nums">
                      {p.score}
                    </p>
                    <p
                      className={`text-[10px] uppercase font-black px-3 py-1 rounded-full mt-2 inline-block ${p.result === "Đang thi" ? "text-amber-500 bg-amber-500/10 animate-pulse" : p.result === "Đạt" ? "text-green-500 bg-green-500/10" : "text-slate-500 bg-white/5"}`}
                    >
                      {p.result}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
