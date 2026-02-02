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
  Loader2,
  CheckCircle,
  Settings,
  X,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Lock,
  ArrowLeft,
  Trophy,
  Users,
  Activity,
  ExternalLink,
  Calendar,
  BarChart3,
  WifiOff,
  Info,
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
  "https://script.google.com/macros/s/AKfycbwOlqvZClg3IB1SsNKMW0gwcvpezNoiOBKW-zi5KSlLwQwdtxSkJcXVcXfENGBEUqxt1A/exec";
const MOVEMENT_SPEED = 0.22;
const GAME_DURATION_SEC = 180;
const PASSING_SCORE = 50;
const ADMIN_PASSWORD = "123";

interface FeedbackItem {
  id: string;
  type: "correct" | "wrong";
  x: number;
  y: number;
}

interface LeaderboardEntry {
  name: string;
  className: string;
  score: number;
  timestamp: string;
  result: string;
}

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash || "#/");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [gameData, setGameData] = useState<GameItemData[]>(() => {
    const saved = localStorage.getItem("literary_flow_data");
    return saved ? JSON.parse(saved) : DEFAULT_GAME_DATA;
  });
  const [spawnInterval, setSpawnInterval] = useState<number>(() => {
    const saved = localStorage.getItem("literary_flow_interval");
    return saved ? parseInt(saved) : DEFAULT_SPAWN_INTERVAL;
  });
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
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("IDLE");
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState<Category>(Category.CONTENT);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [showFixGuide, setShowFixGuide] = useState(false);

  const deckRef = useRef<GameItemData[]>([]);
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const contentRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const lessonRef = useRef<HTMLDivElement>(null);
  const lastSpawnTime = useRef(0);
  const requestRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    localStorage.setItem("literary_flow_data", JSON.stringify(gameData));
    deckRef.current = [];
  }, [gameData]);

  const fetchDashboardData = useCallback(async () => {
    if (!GOOGLE_SCRIPT_URL) return;
    setIsRefreshingDashboard(true);
    setDashboardError(null);
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResults`, {
        method: "GET",
        mode: "cors", // Cần mode cors để đọc dữ liệu JSON
      });
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(Array.isArray(data) ? data : []);
      } else {
        throw new Error("Không thể tải dữ liệu từ Google Script.");
      }
    } catch (e: any) {
      console.error("Dashboard Fetch Error", e);
      setDashboardError(
        "Lỗi kết nối (CORS). Vui lòng kiểm tra lại mã nguồn Google Script.",
      );
      // Chỉ set mock data nếu danh sách hiện tại đang trống để người dùng thấy giao diện mẫu
      if (leaderboard.length === 0) {
        setLeaderboard([
          {
            name: "Học sinh mẫu A",
            className: "12A1",
            score: 250,
            timestamp: "08:00",
            result: "Đạt",
          },
          {
            name: "Học sinh mẫu B",
            className: "12A1",
            score: 210,
            timestamp: "08:05",
            result: "Đạt",
          },
          {
            name: "Học sinh mẫu C",
            className: "12A2",
            score: 180,
            timestamp: "08:10",
            result: "Đạt",
          },
        ]);
      }
    } finally {
      setIsRefreshingDashboard(false);
    }
  }, [leaderboard.length]);

  useEffect(() => {
    if (route === "#/results") {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [route, fetchDashboardData]);

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
      gain.gain.setValueAtTime(0.05, now);
    } else {
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.2);
      gain.gain.setValueAtTime(0.05, now);
    }
    osc.start(now);
    osc.stop(now + 0.3);
  };

  const sendData = async (finalScore: number, finalState: GameState) => {
    if (!GOOGLE_SCRIPT_URL) return;
    setSubmitStatus("SENDING");
    const data = {
      timestamp: new Date().toLocaleString("vi-VN"),
      name: playerInfo.name,
      className: playerInfo.className,
      score: finalScore,
      result: finalScore >= PASSING_SCORE ? "Đạt" : "Chưa đạt",
      details: finalState === "VICTORY" ? "Hoàn thành" : "Thua cuộc",
    };
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", // POST dùng no-cors để bypass lỗi preflight
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setSubmitStatus("SUCCESS");
    } catch (error) {
      setSubmitStatus("ERROR");
    }
  };

  const endGame = (state: GameState) => {
    setGameState(state);
    if (submitStatus === "IDLE") sendData(score, state);
  };

  const spawnItem = useCallback(() => {
    if (gameData.length === 0) return;
    if (deckRef.current.length === 0) {
      deckRef.current = shuffleArray(gameData);
    }
    const template = deckRef.current.pop();
    if (!template) return;
    const newItem: ActiveItem = {
      ...template,
      id: Math.random().toString(36).substr(2, 9),
      x: -35,
      y: 20 + Math.random() * 35,
      speed: MOVEMENT_SPEED,
      isDragging: false,
    };
    setItems((prev) => [...prev, newItem]);
  }, [gameData]);

  const updateGame = useCallback(
    (time: number) => {
      if (gameState !== "PLAYING") return;
      if (time - lastSpawnTime.current > spawnInterval) {
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
    [gameState, spawnItem, spawnInterval],
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
          endGame(score >= PASSING_SCORE ? "VICTORY" : "GAME_OVER");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, score]);

  useEffect(() => {
    if (lives <= 0 && gameState === "PLAYING") endGame("GAME_OVER");
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
    setSubmitStatus("IDLE");
    deckRef.current = shuffleArray(gameData);
    setGameState("PLAYING");
  };

  const handleAdminLogin = () => {
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
    } else {
      alert("Sai mật khẩu!");
    }
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    const newItem: GameItemData = {
      id: Math.random().toString(36).substr(2, 9),
      text: newQuestion,
      category: newCategory,
    };
    setGameData((prev) => [...prev, newItem]);
    setNewQuestion("");
  };

  const deleteQuestion = (id: string) => {
    setGameData((prev) => prev.filter((q) => q.id !== id));
  };

  const deleteAllQuestions = () => {
    if (confirm("Bạn có chắc chắn muốn XÓA TẤT CẢ câu hỏi không?")) {
      setGameData([]);
    }
  };

  const resetToDefault = () => {
    if (confirm("Bạn có chắc muốn khôi phục dữ liệu mặc định?")) {
      setGameData(DEFAULT_GAME_DATA);
      setSpawnInterval(DEFAULT_SPAWN_INTERVAL);
    }
  };

  // --- RENDERING DASHBOARD (#/results) ---
  if (route === "#/results") {
    const sortedLeaderboard = [...leaderboard]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    const recentActivity = [...leaderboard]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 15);

    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: Math.random() * 100 + "%", y: "110%" }}
              animate={{ y: "-10%" }}
              transition={{
                duration: 10 + Math.random() * 20,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute w-1 h-1 bg-white rounded-full blur-sm"
            />
          ))}
        </div>

        <header className="relative z-10 px-10 py-8 border-b border-white/10 flex justify-between items-end backdrop-blur-xl bg-slate-950/50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/50">
                <Trophy size={24} className="text-white" />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
                BẢNG VÀNG KẾT QUẢ
              </h1>
            </div>
            <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">
              Thời gian thực • Hệ thống Dòng chảy văn học
            </p>
          </div>

          <div className="flex gap-8 items-center">
            {dashboardError && (
              <button
                onClick={() => setShowFixGuide(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 text-xs font-black animate-pulse"
              >
                <WifiOff size={16} /> LỖI KẾT NỐI (CORS) - BẤM ĐỂ XEM CÁCH SỬA
              </button>
            )}
            <div className="text-right">
              <p className="text-slate-500 font-black text-[10px] uppercase">
                Học sinh tham gia
              </p>
              <p className="text-3xl font-black text-indigo-400">
                {leaderboard.length}
              </p>
            </div>
            <div className="text-right border-l border-white/10 pl-8">
              <p className="text-slate-500 font-black text-[10px] uppercase">
                Giờ hệ thống
              </p>
              <p className="text-3xl font-mono font-black">
                {new Date().toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className={`p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${isRefreshingDashboard ? "animate-spin" : ""}`}
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </header>

        <main className="relative z-10 h-[calc(100vh-120px)] p-10 grid grid-cols-12 gap-10">
          <section className="col-span-8 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <Award className="text-amber-400" size={28} />
              <h2 className="text-2xl font-black uppercase">
                TOP 10 CHIẾN BINH
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-4 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {sortedLeaderboard.map((player, index) => {
                  const isTop3 = index < 3;
                  const colors = [
                    "border-amber-400 bg-amber-400/10 shadow-amber-500/20",
                    "border-slate-300 bg-slate-300/10 shadow-slate-300/20",
                    "border-orange-400 bg-orange-400/10 shadow-orange-500/20",
                  ];
                  return (
                    <motion.div
                      key={player.name + player.timestamp}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`group relative p-6 rounded-[24px] border-2 transition-all flex items-center justify-between ${isTop3 ? `${colors[index]} scale-[1.02]` : "border-white/5 bg-white/5 hover:border-white/20"}`}
                    >
                      <div className="flex items-center gap-8">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl ${isTop3 ? "bg-white text-slate-900" : "bg-slate-800 text-slate-400"}`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <h3
                            className={`text-2xl font-black ${isTop3 ? "text-white" : "text-slate-200"}`}
                          >
                            {player.name}
                          </h3>
                          <span className="text-slate-500 font-bold tracking-widest uppercase text-xs">
                            {player.className}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 font-black text-[10px] uppercase mb-1">
                          Điểm số
                        </p>
                        <p
                          className={`text-4xl font-black ${isTop3 ? "text-white" : "text-indigo-400"}`}
                        >
                          {player.score}
                        </p>
                      </div>
                      {isTop3 && (
                        <div className="absolute -top-3 -right-3">
                          {" "}
                          <Trophy
                            className={`${index === 0 ? "text-amber-400" : index === 1 ? "text-slate-300" : "text-orange-400"}`}
                            size={32}
                          />{" "}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>

          <section className="col-span-4 bg-slate-900/40 border border-white/5 rounded-[40px] p-8 flex flex-col shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <Activity className="text-indigo-400" size={24} />
              <h2 className="text-xl font-black uppercase">
                HÀNH LANG THI ĐẤU
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {recentActivity.map((player) => (
                  <motion.div
                    key={player.name + player.timestamp}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        {" "}
                        <User size={18} className="text-indigo-400" />{" "}
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg leading-none mb-1">
                          {player.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">
                          {player.timestamp} • LỚP {player.className}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${player.result === "Đạt" ? "bg-green-500/20 text-green-400" : "bg-rose-500/20 text-rose-400"}`}
                    >
                      {" "}
                      {player.result}{" "}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </main>

        {/* Fix Guide Modal */}
        <AnimatePresence>
          {showFixGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl p-8 overflow-y-auto"
            >
              <div className="max-w-2xl mx-auto bg-slate-900 border border-white/10 rounded-[40px] p-10 shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-3xl font-black text-rose-400">
                    HƯỚNG DẪN SỬA LỖI TRUY CẬP DỮ LIỆU
                  </h2>
                  <button
                    onClick={() => setShowFixGuide(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    {" "}
                    <X size={32} />{" "}
                  </button>
                </div>
                <p className="text-slate-300 mb-6 leading-relaxed">
                  Trình duyệt đang chặn bạn tải dữ liệu từ Google vì thiếu{" "}
                  <b>Header CORS</b>. Để Dashboard hoạt động, vui lòng cập nhật
                  hàm <b>doGet</b> trong Google Apps Script của bạn như sau:
                </p>
                <pre className="bg-black/50 p-6 rounded-2xl text-green-400 font-mono text-xs overflow-x-auto mb-8 border border-green-500/20">
                  {`function doGet(e) {
  if (e.parameter.action === 'getResults') {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var results = [];
    for (var i = 1; i < data.length; i++) {
      results.push({
        timestamp: data[i][0], name: data[i][1], className: data[i][2],
        score: data[i][3], result: data[i][4]
      });
    }
    // QUAN TRỌNG: Thêm các dòng sau để cho phép Dashboard truy cập
    var output = ContentService.createTextOutput(JSON.stringify(results))
      .setMimeType(ContentService.MimeType.JSON);
    return output;
  }
}`}
                </pre>
                <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-4">
                  <Info className="text-blue-400 shrink-0" />
                  <p className="text-sm text-blue-200">
                    Sau khi dán mã, hãy nhấn{" "}
                    <b>"Triển khai mới" (New Deployment)</b>, chọn quyền là{" "}
                    <b>"Anyone"</b> và cập nhật lại URL nếu cần.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => (window.location.hash = "#/")}
          className="absolute bottom-6 right-10 text-white/20 hover:text-white/50 transition-colors flex items-center gap-2 font-bold text-xs"
        >
          {" "}
          <ArrowLeft size={14} /> QUAY LẠI GAME{" "}
        </button>
      </div>
    );
  }

  // --- ADMIN VIEW ---
  if (route === "#/admin") {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-[40px] shadow-2xl max-w-sm w-full text-center"
          >
            <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              {" "}
              <Lock className="text-indigo-600" size={40} />{" "}
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">
              Giáo Viên
            </h1>
            <p className="text-slate-500 mb-8 font-medium">
              Vui lòng nhập mật khẩu quản lý
            </p>
            <input
              type="password"
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              placeholder="Mật khẩu..."
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none text-center font-bold text-xl mb-4"
              autoFocus
            />
            <button
              onClick={handleAdminLogin}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all mb-4"
            >
              XÁC NHẬN
            </button>
            <button
              onClick={() => (window.location.hash = "#/")}
              className="flex items-center justify-center gap-2 text-slate-400 font-bold hover:text-slate-600 transition-colors mx-auto"
            >
              {" "}
              <ArrowLeft size={18} /> Quay lại game{" "}
            </button>
          </motion.div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center">
        <div className="max-w-4xl w-full">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              {" "}
              <Settings className="text-indigo-600" /> QUẢN LÝ GAME{" "}
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => (window.location.hash = "#/results")}
                className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all"
              >
                {" "}
                <Trophy size={20} /> MỞ DASHBOARD KẾT QUẢ{" "}
              </button>
              <button
                onClick={() => (window.location.hash = "#/")}
                className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
              >
                {" "}
                <ArrowLeft size={20} /> VỀ TRANG CHỦ{" "}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 text-lg mb-6 flex items-center gap-2">
                  <Plus size={20} /> Thêm câu hỏi mới
                </h3>
                <div className="space-y-4">
                  <textarea
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Nhập nội dung câu hỏi/kiến thức..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none font-medium min-h-[100px]"
                  />
                  <div className="flex gap-4">
                    <select
                      value={newCategory}
                      onChange={(e) =>
                        setNewCategory(e.target.value as Category)
                      }
                      className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-600"
                    >
                      {Object.values(Category).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addQuestion}
                      className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      {" "}
                      <Plus size={24} /> THÊM{" "}
                    </button>
                  </div>
                </div>
              </section>
              <section className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-700 text-lg">
                    Danh sách câu hỏi ({gameData.length})
                  </h3>
                  <div className="flex gap-4">
                    <button
                      onClick={deleteAllQuestions}
                      className="text-rose-600 text-sm font-bold flex items-center gap-1 hover:underline"
                    >
                      {" "}
                      <Trash2 size={14} /> Xoá tất cả{" "}
                    </button>
                    <button
                      onClick={resetToDefault}
                      className="text-slate-500 text-sm font-bold flex items-center gap-1 hover:underline"
                    >
                      {" "}
                      <RefreshCw size={14} /> Khôi phục mặc định{" "}
                    </button>
                  </div>
                </div>
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {gameData.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all group"
                    >
                      <div className="flex-1 mr-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[10px] font-black mb-2 uppercase tracking-widest ${q.category === Category.CONTENT ? "bg-blue-100 text-blue-600" : q.category === Category.ART ? "bg-purple-100 text-purple-600" : "bg-amber-100 text-amber-600"}`}
                        >
                          {" "}
                          {q.category}{" "}
                        </span>
                        <p className="text-slate-700 text-sm font-semibold leading-relaxed">
                          {q.text}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        {" "}
                        <Trash2 size={20} />{" "}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="space-y-8">
              <section className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 text-lg mb-6 flex items-center gap-2">
                  <Timer size={20} /> Nhịp độ xuất hiện
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between font-black text-indigo-600">
                    {" "}
                    <span>Nhanh</span>{" "}
                    <span className="bg-indigo-100 px-3 py-1 rounded-full">
                      {(spawnInterval / 1000).toFixed(1)}s
                    </span>{" "}
                    <span>Chậm</span>{" "}
                  </div>
                  <input
                    type="range"
                    min="2000"
                    max="15000"
                    step="500"
                    value={spawnInterval}
                    onChange={(e) => setSpawnInterval(parseInt(e.target.value))}
                    className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- STUDENT GAME ---
  return (
    <div className="relative w-full h-screen bg-[#f8fafc] overflow-hidden select-none touch-none font-sans">
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-200 rounded-full blur-[100px]" />
      </div>

      {(gameState === "PLAYING" ||
        gameState === "VICTORY" ||
        gameState === "GAME_OVER") && (
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
              <Heart className="w-4 h-4 md:w-6 md:h-6 text-rose-500 fill-rose-500" />
              <div>
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
                  Lives
                </p>
                <div className="flex gap-0.5 mt-0.5">
                  {" "}
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 md:w-3 md:h-3 rounded-full ${i < lives ? "bg-rose-500" : "bg-slate-200"}`}
                    />
                  ))}{" "}
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
                {" "}
                {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, "0")}{" "}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-10">
        <AnimatePresence>
          {" "}
          {items.map((item) => (
            <FloatingCard
              key={item.id}
              item={item}
              onDragStart={handleDragStart}
              onDrag={handleDragMove}
              onDragEnd={handleDragEnd}
            />
          ))}{" "}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {" "}
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
        ))}{" "}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 h-[24%] md:h-[32%] z-20 p-3 md:p-8 flex gap-3 md:gap-8 items-stretch justify-center bg-gradient-to-t from-white via-white/90 to-transparent">
        <div className="flex-1 max-w-[110px] md:max-w-sm">
          {" "}
          <DropZone
            ref={contentRef}
            category={Category.CONTENT}
            highlight={activeZone === Category.CONTENT}
          />{" "}
        </div>
        <div className="flex-1 max-w-[110px] md:max-w-sm">
          {" "}
          <DropZone
            ref={artRef}
            category={Category.ART}
            highlight={activeZone === Category.ART}
          />{" "}
        </div>
        <div className="flex-1 max-w-[110px] md:max-w-sm">
          {" "}
          <DropZone
            ref={lessonRef}
            category={Category.LESSON}
            highlight={activeZone === Category.LESSON}
          />{" "}
        </div>
      </div>

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
              className="bg-white p-6 md:p-12 rounded-[32px] md:rounded-[40px] shadow-2xl text-center max-w-lg w-full border border-white relative overflow-hidden"
            >
              <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-2 tracking-tight">
                Dòng Chảy Văn Học
              </h1>
              <p className="text-slate-500 mb-6 md:mb-8 text-sm md:text-lg font-medium">
                Thử thách phân loại kiến thức
              </p>
              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8 text-left">
                <div className="relative group">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500"
                    size={18}
                  />
                  <input
                    type="text"
                    value={playerInfo.name}
                    placeholder="Họ và tên học sinh..."
                    onChange={(e) =>
                      setPlayerInfo((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-700"
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
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-700"
                  />
                </div>
              </div>
              <button
                onClick={startGame}
                disabled={
                  !playerInfo.name.trim() || !playerInfo.className.trim()
                }
                className="w-full py-4 md:py-5 font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-xl disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3 mb-4"
              >
                <Play size={24} fill="currentColor" /> BẮT ĐẦU CHƠI
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => (window.location.hash = "#/results")}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {" "}
                  <BarChart3 size={18} /> XEM KẾT QUẢ{" "}
                </button>
                <button
                  onClick={() => (window.location.hash = "#/admin")}
                  className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                >
                  {" "}
                  <Settings size={18} />{" "}
                </button>
              </div>
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
                {gameState === "VICTORY" ? "Xuất Sắc!" : "Kết Thúc!"}
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-sm mb-4 mt-4">
                Điểm của bạn
              </p>
              <div className="text-5xl md:text-7xl font-black text-indigo-600 mb-8">
                {score}
              </div>
              <div className="mb-6 h-6 flex justify-center">
                {submitStatus === "SENDING" && (
                  <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu kết
                    quả...
                  </div>
                )}
                {submitStatus === "SUCCESS" && (
                  <div className="flex items-center gap-2 text-green-500 font-bold text-sm">
                    <CheckCircle className="w-4 h-4" /> Đã nộp bài thành công!
                  </div>
                )}
              </div>
              <button
                onClick={startGame}
                className="w-full py-4 md:py-5 font-black text-lg md:text-xl text-white bg-slate-800 rounded-2xl hover:bg-slate-900 flex items-center justify-center gap-3"
              >
                {" "}
                <RotateCcw size={20} /> CHƠI LẠI{" "}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
