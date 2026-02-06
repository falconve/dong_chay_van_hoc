import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Heart,
  Timer,
  RefreshCw,
  ArrowLeft,
  Trophy,
} from "lucide-react";
import {
  Category,
  ActiveItem,
  GameState,
  PlayerInfo,
  SubmitStatus,
  GameItemData,
} from "./types";
import { DEFAULT_GAME_DATA, DEFAULT_SPAWN_INTERVAL } from "./constants";
import { DropZone } from "./components/DropZone";
import { FloatingCard } from "./components/FloatingCard";
import { Feedback } from "./components/Feedback";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzEcv9f90oQDqALOvyv_7B3SzhqO51qgemywr17EFSvbmNXb6Gj820EInkauSYzuxmw/exec";
const GAME_DURATION_SEC = 180;
const PASSING_SCORE = 80;

interface LeaderboardEntry {
  name: string;
  score: number | string;
  timestamp: string;
  result: string;
  sessionId?: string;
}

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || "#/");
  const [gameData, setGameData] = useState<GameItemData[]>(DEFAULT_GAME_DATA);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
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
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);

  const lastSpawnTime = useRef(0);
  const requestRef = useRef<number>(0);
  const deckRef = useRef<GameItemData[]>([]);
  const sessionIdRef = useRef<string>("");

  const fetchQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    try {
      const response = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=getQuestions&t=${Date.now()}`,
      );
      if (!response.ok) throw new Error("CORS or Network Error");
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const formattedData: GameItemData[] = data.map((item: any) => ({
          id: item.id || Math.random().toString(36).substr(2, 9),
          text: item.text,
          category: item.category as Category,
          isCorrect:
            item.isCorrect === true ||
            item.isCorrect === "true" ||
            item.isCorrect === "TRUE" ||
            item.isCorrect === "✅",
        }));
        setGameData(formattedData);
      }
    } catch (error) {
      console.warn("Sử dụng dữ liệu Local do lỗi kết nối Sheet:", error);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", handleHashChange);
    fetchQuestions();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [fetchQuestions]);

  const sendData = async (currentScore: number, status: string) => {
    if (!GOOGLE_SCRIPT_URL || !sessionIdRef.current || !playerInfo.name) return;
    const payload = {
      action: "saveResult",
      sessionId: sessionIdRef.current,
      timestamp: new Date().toISOString(),
      name: `${playerInfo.name} - ${playerInfo.className}`,
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
      console.error("Sync error:", e);
    }
  };

  const startGame = () => {
    if (!playerInfo.name.trim() || !playerInfo.className.trim()) return;
    sessionIdRef.current =
      "SID-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
    deckRef.current = [...gameData].sort(() => Math.random() - 0.5); // Trộn bộ câu hỏi
    setScore(0);
    setLives(5);
    setTimeLeft(GAME_DURATION_SEC);
    setItems([]);
    setGameState("PLAYING");
    sendData(0, "Đang thi");
  };

  const spawnItem = useCallback(() => {
    if (deckRef.current.length === 0) return; // Không còn câu hỏi để bốc

    const template = deckRef.current.pop(); // Lấy 1 thẻ và XÓA khỏi bộ deck
    if (!template) return;

    const newItem: ActiveItem = {
      ...template,
      id: Math.random().toString(36).substr(2, 9),
      x: -30,
      y: 15 + Math.random() * 45,
      speed: 0.22 + score / 4000,
      isDragging: false,
    };
    setItems((prev) => [...prev, newItem]);
  }, [score]);

  const updateGame = useCallback(
    (time: number) => {
      if (gameState !== "PLAYING") return;
      if (time - lastSpawnTime.current > DEFAULT_SPAWN_INTERVAL) {
        spawnItem();
        lastSpawnTime.current = time;
      }
      setItems((prev) => {
        return prev
          .map((item) => {
            if (item.isDragging) return item;
            const nextX = item.x + item.speed;
            if (nextX > 110) {
              // Nếu thẻ trôi mất mà là kiến thức đúng -> Mất mạng
              if (item.isCorrect) setLives((l) => Math.max(0, l - 1));
              return null;
            }
            return { ...item, x: nextX };
          })
          .filter(Boolean) as ActiveItem[];
      });
      requestRef.current = requestAnimationFrame(updateGame);
    },
    [gameState, spawnItem],
  );

  useEffect(() => {
    if (gameState === "PLAYING")
      requestRef.current = requestAnimationFrame(updateGame);
    else cancelAnimationFrame(requestRef.current);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, updateGame]);

  useEffect(() => {
    if (gameState === "PLAYING") {
      const timer = setInterval(
        () =>
          setTimeLeft((t) => {
            if (t <= 1) {
              const finalStatus =
                score >= PASSING_SCORE ? "Đạt" : "Chưa đạt (Hết giờ)";
              setGameState(score >= PASSING_SCORE ? "VICTORY" : "GAME_OVER");
              sendData(score, finalStatus);
              return 0;
            }
            return t - 1;
          }),
        1000,
      );
      return () => clearInterval(timer);
    }
  }, [gameState, score]);

  useEffect(() => {
    if (lives <= 0 && gameState === "PLAYING") {
      const finalStatus =
        score >= PASSING_SCORE ? "Đạt" : "Chưa đạt (Hết mạng)";
      setGameState(score >= PASSING_SCORE ? "VICTORY" : "GAME_OVER");
      sendData(score, finalStatus);
    }
  }, [lives, gameState, score]);

  const handleDragEnd = (id: string, info: any) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const zones = [
      {
        id: Category.CONTENT,
        rect: document
          .getElementById(`zone-${Category.CONTENT}`)
          ?.getBoundingClientRect(),
      },
      {
        id: Category.ART,
        rect: document
          .getElementById(`zone-${Category.ART}`)
          ?.getBoundingClientRect(),
      },
      {
        id: Category.LESSON,
        rect: document
          .getElementById(`zone-${Category.LESSON}`)
          ?.getBoundingClientRect(),
      },
    ];

    const droppedOn = zones.find(
      (z) =>
        z.rect &&
        info.point.x >= z.rect.left &&
        info.point.x <= z.rect.right &&
        info.point.y >= z.rect.top &&
        info.point.y <= z.rect.bottom,
    );

    if (droppedOn) {
      if (!item.isCorrect) {
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
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        if (droppedOn.id === item.category) {
          const newScore = score + 10;
          setScore(newScore);
          setFeedbacks((f) => [
            ...f,
            {
              id: Math.random().toString(),
              type: "correct",
              x: info.point.x,
              y: info.point.y,
            },
          ]);
          setItems((prev) => prev.filter((i) => i.id !== id));
          sendData(newScore, "Đang thi"); // Cập nhật điểm thời gian thực
        } else {
          setLives((l) => Math.max(0, l - 1));
          setFeedbacks((f) => [
            ...f,
            {
              id: Math.random().toString(),
              type: "wrong",
              x: info.point.x,
              y: info.point.y,
              message: "Sai vị trí!",
            },
          ]);
          setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, isDragging: false } : i)),
          );
        }
      }
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isDragging: false } : i)),
      );
    }
    setActiveZone(null);
  };

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshingDashboard(true);
    try {
      const response = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=getResults&t=${Date.now()}`,
      );
      const data = await response.json();
      if (Array.isArray(data))
        setLeaderboard(
          data
            .filter((i) => i.name)
            .sort((a, b) => Number(b.score || 0) - Number(a.score || 0)),
        );
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingDashboard(false);
    }
  }, []);

  if (route === "#/results") {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white p-6 md:p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
            <Trophy className="text-amber-400" /> BẢNG VÀNG
          </h1>
          <div className="flex gap-4">
            <button
              onClick={() => (window.location.hash = "#/")}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold flex items-center gap-2"
            >
              {" "}
              <ArrowLeft size={18} /> QUAY LẠI{" "}
            </button>
            <button
              onClick={() => fetchDashboardData()}
              className={`p-3 bg-indigo-600 rounded-xl ${isRefreshingDashboard ? "animate-spin" : ""}`}
            >
              {" "}
              <RefreshCw size={20} />{" "}
            </button>
          </div>
        </header>
        <div className="max-w-4xl mx-auto space-y-4">
          {leaderboard.map((p, i) => (
            <div
              key={i}
              className="bg-white/5 p-6 rounded-3xl flex justify-between items-center border border-white/5"
            >
              <div className="flex items-center gap-6">
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${i < 3 ? "bg-amber-400 text-slate-900" : "bg-slate-800"}`}
                >
                  {i + 1}
                </span>
                <h3 className="text-xl font-black">{p.name}</h3>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-indigo-400">{p.score}</p>
                <p
                  className={`text-[10px] uppercase font-black ${p.result === "Đang thi" ? "text-amber-500 animate-pulse" : "text-slate-500"}`}
                >
                  {p.result}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-slate-50 overflow-hidden select-none touch-none">
      <AnimatePresence>
        {gameState === "PLAYING" && (
          <motion.div
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            className="absolute top-6 left-6 right-6 z-40 flex justify-between pointer-events-none"
          >
            <div className="flex gap-4 pointer-events-auto">
              <div className="bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-xl flex items-center gap-4 border border-white">
                <Award className="text-indigo-600" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Điểm
                  </p>
                  <p className="text-2xl font-black">{score}</p>
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-xl flex items-center gap-4 border border-white">
                <Heart className="text-rose-500" fill="currentColor" />
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Mạng
                  </p>
                  <p className="text-2xl font-black">{lives}</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/90 backdrop-blur-xl p-4 px-8 rounded-3xl text-white flex items-center gap-4 border border-white/10">
              <Timer
                className={
                  timeLeft < 30
                    ? "text-rose-400 animate-pulse"
                    : "text-indigo-400"
                }
              />
              <p className="text-2xl font-mono font-black">
                {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 h-[35%] z-20 p-8 grid grid-cols-3 gap-8 bg-gradient-to-t from-white to-transparent">
        <DropZone
          category={Category.CONTENT}
          highlight={activeZone === Category.CONTENT}
        />
        <DropZone
          category={Category.ART}
          highlight={activeZone === Category.ART}
        />
        <DropZone
          category={Category.LESSON}
          highlight={activeZone === Category.LESSON}
        />
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
            onDrag={(point) => {
              const zones = [Category.CONTENT, Category.ART, Category.LESSON];
              const z = zones.find((cat) => {
                const r = document
                  .getElementById(`zone-${cat}`)
                  ?.getBoundingClientRect();
                return (
                  r &&
                  point.x >= r.left &&
                  point.x <= r.right &&
                  point.y >= r.top &&
                  point.y <= r.bottom
                );
              });
              setActiveZone(z || null);
            }}
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

      <AnimatePresence>
        {gameState === "MENU" && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white p-12 rounded-[40px] shadow-2xl max-w-lg w-full text-center border border-white"
            >
              <h1 className="text-5xl font-black text-slate-800 mb-2 tracking-tighter">
                Dòng Chảy
              </h1>
              <p className="text-slate-500 font-bold mb-10">
                Phân loại kiến thức (Đạt khi ≥ {PASSING_SCORE}đ)
              </p>
              <div className="space-y-4 mb-10">
                <input
                  type="text"
                  value={playerInfo.name}
                  placeholder="Họ và tên..."
                  onChange={(e) =>
                    setPlayerInfo((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full p-5 bg-slate-100 rounded-2xl font-bold text-center outline-none"
                />
                <input
                  type="text"
                  value={playerInfo.className}
                  placeholder="Lớp..."
                  onChange={(e) =>
                    setPlayerInfo((p) => ({ ...p, className: e.target.value }))
                  }
                  className="w-full p-5 bg-slate-100 rounded-2xl font-bold text-center outline-none"
                />
              </div>
              <button
                onClick={startGame}
                disabled={
                  !playerInfo.name ||
                  !playerInfo.className ||
                  isLoadingQuestions
                }
                className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl shadow-xl disabled:opacity-50"
              >
                {isLoadingQuestions ? "ĐANG TẢI..." : "BẮT ĐẦU CHƠI"}
              </button>
              <button
                onClick={() => {
                  fetchDashboardData();
                  window.location.hash = "#/results";
                }}
                className="w-full mt-4 py-4 bg-slate-100 rounded-2xl font-black text-slate-600"
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
              <h2 className="text-4xl font-black mb-4">KẾT THÚC</h2>
              <div className="text-7xl font-black text-indigo-600 mb-6">
                {score}
              </div>
              <div className="mb-8">
                {score >= PASSING_SCORE ? (
                  <span className="text-green-600 bg-green-50 px-6 py-2 rounded-xl font-black border border-green-200">
                    ĐẠT YÊU CẦU
                  </span>
                ) : (
                  <span className="text-rose-500 bg-rose-50 px-6 py-2 rounded-xl font-black border border-rose-200">
                    CHƯA ĐẠT
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setGameState("MENU");
                  fetchQuestions();
                }}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl"
              >
                CHƠI LẠI
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
