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
        x: -20,
        y: 10 + Math.random() * 35, // Giới hạn y thấp hơn cho màn hình ngang
        speed: 0.22 + scoreRef.current / 5000,
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
              message: "Kiến thức sai!",
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
    const zone = getCategoryAtPoint(point.x, point.y);
    setActiveZone(zone);
  };

  return (
    <div className="relative w-full h-screen bg-slate-50 overflow-hidden select-none touch-none">
      {/* Cảnh báo xoay màn hình */}
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
            <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">
              Vui lòng xoay ngang điện thoại
            </h2>
            <p className="text-slate-400 font-bold text-sm">
              Trò chơi được thiết kế để chơi tốt nhất trên màn hình ngang.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD: Score & Lives */}
      <AnimatePresence>
        {gameState === "PLAYING" && !isPortrait && (
          <motion.div
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            className="absolute top-4 left-4 right-4 z-40 flex justify-between items-start pointer-events-none"
          >
            <div className="flex gap-2 md:gap-4 pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-xl p-2 md:p-4 rounded-2xl md:rounded-3xl shadow-lg flex items-center gap-2 md:gap-4 border border-white">
                <Award className="text-indigo-600 w-5 h-5 md:w-6 md:h-6" />
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase leading-none">
                    Điểm
                  </p>
                  <p className="text-lg md:text-2xl font-black tabular-nums leading-none mt-1">
                    {score}
                  </p>
                </div>
              </div>
              <div className="bg-white/95 backdrop-blur-xl p-2 md:p-4 rounded-2xl md:rounded-3xl shadow-lg flex items-center gap-2 md:gap-4 border border-white">
                <Heart
                  className="text-rose-500 w-5 h-5 md:w-6 md:h-6"
                  fill="currentColor"
                />
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase leading-none">
                    Mạng
                  </p>
                  <p className="text-lg md:text-2xl font-black tabular-nums leading-none mt-1">
                    {lives}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/90 backdrop-blur-xl p-2 px-4 md:p-4 md:px-8 rounded-2xl md:rounded-3xl text-white flex items-center gap-2 md:gap-4 border border-white/10 shadow-2xl pointer-events-auto">
              <Timer
                className={`w-5 h-5 md:w-6 md:h-6 ${timeLeft < 30 ? "text-rose-400 animate-pulse" : "text-indigo-400"}`}
              />
              <p className="text-lg md:text-2xl font-mono font-black tabular-nums">
                {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vùng thả DropZones - Điều chỉnh độ cao cho màn hình ngang */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%] md:h-[35%] z-20 p-4 md:p-8 grid grid-cols-3 gap-4 md:gap-8 bg-gradient-to-t from-white via-white/80 to-transparent">
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

      {/* MENU - Tối ưu cho màn hình ngang */}
      <AnimatePresence>
        {gameState === "MENU" && !isPortrait && (
          <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[40px] shadow-2xl max-w-2xl w-full border border-white flex flex-col md:flex-row gap-8 items-center"
            >
              <div className="text-center md:text-left flex-1">
                <h1 className="text-4xl md:text-6xl font-black text-slate-800 mb-1 tracking-tighter italic">
                  Dòng Chảy
                </h1>
                <p className="text-slate-500 font-bold mb-6 uppercase tracking-widest text-[8px] md:text-[10px]">
                  Phân loại kiến thức văn học
                </p>
                <div className="hidden md:block space-y-2 text-slate-400 text-xs font-medium">
                  <p>• Kéo thẻ kiến thức trôi dạt vào đúng mục.</p>
                  <p>• Tránh các thẻ có nội dung sai lệch.</p>
                  <p>• Đạt {PASSING_SCORE} điểm để hoàn thành nhiệm vụ.</p>
                </div>
              </div>

              <div className="flex-1 w-full space-y-4">
                <div className="space-y-3">
                  <input
                    type="text"
                    value={playerInfo.name}
                    placeholder="Họ và tên..."
                    onChange={(e) =>
                      setPlayerInfo((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full p-3 md:p-4 bg-slate-100 rounded-xl md:rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-sm"
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
                    className="w-full p-3 md:p-4 bg-slate-100 rounded-xl md:rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
                <button
                  onClick={startGame}
                  disabled={!playerInfo.name || !playerInfo.className}
                  className="w-full py-4 md:py-6 bg-indigo-600 text-white rounded-xl md:rounded-[2rem] font-black text-lg md:text-2xl shadow-xl disabled:opacity-50 active:scale-95 transition-all hover:bg-indigo-500"
                >
                  BẮT ĐẦU CHƠI
                </button>
                <button
                  onClick={() => (window.location.hash = "#/results")}
                  className="w-full py-2 md:py-3 bg-slate-100 rounded-xl font-black text-slate-600 hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                >
                  XEM BẢNG VÀNG
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {(gameState === "GAME_OVER" || gameState === "VICTORY") && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-white p-8 md:p-12 rounded-[40px] md:rounded-[50px] shadow-2xl text-center max-w-sm w-full"
            >
              <h2 className="text-3xl md:text-4xl font-black mb-2 text-slate-800 uppercase tracking-tighter">
                {gameState === "VICTORY" ? "HOÀN THÀNH!" : "KẾT THÚC"}
              </h2>
              <div className="text-6xl md:text-8xl font-black text-indigo-600 mb-6 md:mb-8 tracking-tighter">
                {score}
              </div>
              <div className="mb-6 md:mb-8 font-black uppercase tracking-widest text-[10px]">
                {score >= PASSING_SCORE ? (
                  <span className="text-green-600 bg-green-50 px-6 py-2 rounded-xl border border-green-200 shadow-sm font-bold">
                    ĐẠT YÊU CẦU
                  </span>
                ) : (
                  <span className="text-rose-500 bg-rose-50 px-6 py-2 rounded-xl border border-rose-200 shadow-sm font-bold">
                    CHƯA ĐẠT
                  </span>
                )}
              </div>
              <button
                onClick={() => setGameState("MENU")}
                className="w-full py-4 md:py-6 bg-slate-900 text-white rounded-xl md:rounded-[2rem] font-black text-lg md:text-xl hover:bg-black active:scale-95 transition-all"
              >
                CHƠI LẠI
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bảng Xếp Hạng - Tối ưu scroll trên mobile ngang */}
      {route === "#/results" && (
        <div className="absolute inset-0 z-[60] bg-[#020617] text-white p-4 md:p-12 overflow-y-auto">
          <header className="flex justify-between items-center mb-6 md:mb-10 max-w-4xl mx-auto">
            <h1 className="text-xl md:text-3xl font-black flex items-center gap-4">
              <Trophy className="text-amber-400 w-6 h-6 md:w-8 md:h-8" /> BẢNG
              VÀNG
            </h1>
            <div className="flex gap-2 md:gap-4">
              <button
                onClick={() => (window.location.hash = "#/")}
                className="px-4 py-2 md:px-6 md:py-3 bg-white/5 border border-white/10 rounded-xl font-bold flex items-center gap-2 hover:bg-white/10 text-xs md:text-base"
              >
                {" "}
                <ArrowLeft size={16} /> QUAY LẠI{" "}
              </button>
              <button
                onClick={() => fetchDashboardData()}
                disabled={isLoadingResults}
                className={`p-2 md:p-3 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all ${isLoadingResults ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isLoadingResults ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
              </button>
            </div>
          </header>

          <div className="max-w-4xl mx-auto space-y-3 pb-10">
            {leaderboard.length === 0 && !isLoadingResults ? (
              <div className="text-center py-10 md:py-20 bg-white/5 rounded-[30px] border border-white/5">
                <Trophy size={48} className="mx-auto mb-4 text-slate-700" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  Chưa có kết quả nào.
                </p>
              </div>
            ) : (
              leaderboard.map((p, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i}
                  className="bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl flex justify-between items-center border border-white/5 group hover:bg-white/[0.08] transition-all"
                >
                  <div className="flex items-center gap-4 md:gap-6">
                    <span
                      className={`w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-2xl flex items-center justify-center font-black text-sm md:text-xl ${i === 0 ? "bg-amber-400 text-slate-900" : i === 1 ? "bg-slate-300 text-slate-900" : i === 2 ? "bg-orange-400 text-slate-900" : "bg-slate-800 text-slate-400"}`}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-sm md:text-xl font-black text-slate-200 group-hover:text-white transition-colors truncate max-w-[150px] md:max-w-md">
                        {p.name}
                      </h3>
                      <p className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 md:mt-1">
                        {p.timestamp}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl md:text-4xl font-black text-indigo-400 tabular-nums">
                      {p.score}
                    </p>
                    <p
                      className={`text-[7px] md:text-[10px] uppercase font-black px-2 py-0.5 md:px-3 md:py-1 rounded-full mt-1 md:mt-2 inline-block ${p.result === "Đang thi" ? "text-amber-500 bg-amber-500/10 animate-pulse" : p.result === "Đạt" ? "text-green-500 bg-green-500/10" : "text-slate-400 bg-white/5"}`}
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
