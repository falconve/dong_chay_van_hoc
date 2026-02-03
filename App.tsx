import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  RotateCcw,
  Award,
  Heart,
  Timer,
  User,
  School,
  Loader2,
  CheckCircle,
  Settings,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Lock,
  ArrowLeft,
  Trophy,
  Activity,
  WifiOff,
  Info,
  ExternalLink,
  BarChart3,
  Database,
  Zap,
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
const GAME_DURATION_SEC = 180;
const PASSING_SCORE = 50;
const ADMIN_PASSWORD = "123";

interface LeaderboardEntry {
  name: string;
  className: string;
  score: number | string;
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
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>({
    name: "",
    className: "",
  });
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("IDLE");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [showFixGuide, setShowFixGuide] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState<Category>(Category.CONTENT);

  const lastSpawnTime = useRef(0);
  const requestRef = useRef<number>(0);
  const deckRef = useRef<GameItemData[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const initAudio = () => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
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
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
    } else {
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
    }
    osc.start(now);
    osc.stop(now + 0.3);
  };

  // --- API LOGIC ---
  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshingDashboard(true);
    setDashboardError(null);
    try {
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getResults`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error("CORS Error detected", e);
      if (!silent) setDashboardError("Lỗi kết nối dữ liệu.");
    } finally {
      if (!silent) setIsRefreshingDashboard(false);
    }
  }, []);

  // Tự động làm mới bảng điểm mỗi 10 giây khi đang ở trang Kết quả
  useEffect(() => {
    if (route === "#/results") {
      fetchDashboardData(); // Lần đầu tiên vào trang
      const interval = setInterval(() => {
        fetchDashboardData(true); // Tự động làm mới "ngầm"
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [route, fetchDashboardData]);

  const sendData = async (finalScore: number | string, status: string) => {
    if (!GOOGLE_SCRIPT_URL) return;
    const payload = {
      timestamp: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      name: playerInfo.name,
      className: playerInfo.className,
      score: finalScore,
      result: status,
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (status !== "Đang thi") setSubmitStatus("SUCCESS");
    } catch (error) {
      if (status !== "Đang thi") setSubmitStatus("ERROR");
    }
  };

  // --- GAME LOGIC ---
  const startGame = () => {
    if (!playerInfo.name.trim() || !playerInfo.className.trim()) return;
    initAudio();

    // GỬI THÔNG TIN LÊN SHEETS NGAY LẬP TỨC KHI NHẤN BẮT ĐẦU
    sendData("---", "Đang thi");

    setScore(0);
    setLives(5);
    setTimeLeft(GAME_DURATION_SEC);
    setItems([]);
    setSubmitStatus("IDLE");
    setGameState("PLAYING");
  };

  const spawnItem = useCallback(() => {
    if (gameData.length === 0) return;
    if (deckRef.current.length === 0)
      deckRef.current = [...gameData].sort(() => Math.random() - 0.5);
    const template = deckRef.current.pop();
    if (!template) return;

    const newItem: ActiveItem = {
      ...template,
      id: Math.random().toString(36).substr(2, 9),
      x: -40,
      y: 20 + Math.random() * 40,
      speed: 0.2 + score / 1000,
      isDragging: false,
    };
    setItems((prev) => [...prev, newItem]);
  }, [gameData, score]);

  const updateGame = useCallback(
    (time: number) => {
      if (gameState !== "PLAYING") return;
      if (time - lastSpawnTime.current > spawnInterval) {
        spawnItem();
        lastSpawnTime.current = time;
      }

      setItems((prev) => {
        let missed = false;
        const next = prev
          .map((item) => {
            if (item.isDragging) return item;
            const nextX = item.x + item.speed;
            if (nextX > 110) {
              missed = true;
              return null;
            }
            return { ...item, x: nextX };
          })
          .filter(Boolean) as ActiveItem[];

        if (missed) {
          setLives((l) => {
            const nl = Math.max(0, l - 1);
            if (nl < l) playSound("wrong");
            return nl;
          });
        }
        return next;
      });
      requestRef.current = requestAnimationFrame(updateGame);
    },
    [gameState, spawnItem, spawnInterval],
  );

  useEffect(() => {
    if (gameState === "PLAYING")
      requestRef.current = requestAnimationFrame(updateGame);
    else cancelAnimationFrame(requestRef.current);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, updateGame]);

  useEffect(() => {
    if (gameState === "PLAYING") {
      const timer = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setGameState(score >= PASSING_SCORE ? "VICTORY" : "GAME_OVER");
            sendData(score, score >= PASSING_SCORE ? "Đạt" : "Chưa đạt");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, score]);

  useEffect(() => {
    if (lives <= 0 && gameState === "PLAYING") {
      setGameState("GAME_OVER");
      sendData(score, "Chưa đạt (Hết mạng)");
    }
  }, [lives, gameState, score]);

  const handleDragEnd = (id: string, info: any) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const zones = [
      {
        id: Category.CONTENT,
        rect: document.getElementById("zone-CONTENT")?.getBoundingClientRect(),
      },
      {
        id: Category.ART,
        rect: document.getElementById("zone-ART")?.getBoundingClientRect(),
      },
      {
        id: Category.LESSON,
        rect: document.getElementById("zone-LESSON")?.getBoundingClientRect(),
      },
    ];

    const droppedOn = zones.find((z) => {
      if (!z.rect) return false;
      return (
        info.point.x >= z.rect.left &&
        info.point.x <= z.rect.right &&
        info.point.y >= z.rect.top &&
        info.point.y <= z.rect.bottom
      );
    });

    if (droppedOn) {
      const isCorrect = droppedOn.id === item.category;
      playSound(isCorrect ? "correct" : "wrong");
      setFeedbacks((f) => [
        ...f,
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

  // --- RENDER ROUTING ---
  if (route === "#/results") {
    return (
      <div className="min-h-screen bg-[#0f172a] text-white p-6 md:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <Trophy size={32} />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase">
                BẢNG VÀNG
              </h1>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">
                  ĐANG ĐỒNG BỘ TRỰC TUYẾN
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            {dashboardError && (
              <button
                onClick={() => setShowFixGuide(true)}
                className="px-4 py-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 text-xs font-black animate-pulse flex items-center gap-2"
              >
                <WifiOff size={16} /> LỖI KẾT NỐI - CÁCH SỬA
              </button>
            )}
            <button
              onClick={() => (window.location.hash = "#/")}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 flex items-center gap-2 transition-all"
            >
              {" "}
              <ArrowLeft size={18} /> QUAY LẠI{" "}
            </button>
            <button
              onClick={() => fetchDashboardData()}
              className={`p-3 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all ${isRefreshingDashboard ? "animate-spin" : ""}`}
            >
              {" "}
              <RefreshCw size={20} />{" "}
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
          <section className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-black flex items-center gap-3 uppercase tracking-widest">
              {" "}
              <Zap className="text-amber-400 fill-amber-400" size={24} /> DANH
              SÁCH THÍ SINH{" "}
            </h2>

            {isRefreshingDashboard && leaderboard.length === 0 ? (
              <div className="bg-white/5 rounded-3xl p-12 flex flex-col items-center justify-center border border-dashed border-white/10">
                <Loader2
                  size={48}
                  className="animate-spin text-indigo-500 mb-4"
                />
                <p className="text-slate-400 font-bold">
                  Đang tải dữ liệu từ máy chủ...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaderboard.length === 0 && !isRefreshingDashboard && (
                  <div className="bg-white/5 rounded-3xl p-12 text-center border border-white/10">
                    <Database
                      size={48}
                      className="mx-auto text-slate-600 mb-4 opacity-20"
                    />
                    <p className="text-slate-500 font-bold italic">
                      Chưa có lượt chơi nào được ghi nhận.
                    </p>
                  </div>
                )}
                {leaderboard.map((p, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    key={i}
                    className={`bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:border-indigo-500/50 transition-all hover:bg-white/[0.08] group ${p.result === "Đang thi" ? "border-amber-500/30 bg-amber-500/5" : ""}`}
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl transition-transform group-hover:scale-110 ${p.result === "Đang thi" ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-400"}`}
                      >
                        {" "}
                        {i + 1}{" "}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black group-hover:text-indigo-400 transition-colors">
                            {p.name}
                          </h3>
                          {p.result === "Đang thi" && (
                            <span className="bg-amber-500/20 text-amber-500 text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                              ĐANG THI
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                          {p.className}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-3xl font-black transition-transform ${p.result === "Đang thi" ? "text-amber-500" : "text-indigo-400"}`}
                      >
                        {p.score}
                      </p>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-tighter">
                        {p.timestamp}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-slate-900/50 border border-white/5 p-8 rounded-[40px] h-fit sticky top-12">
            <h2 className="text-xl font-black mb-8 flex items-center gap-3 uppercase tracking-widest">
              {" "}
              <BarChart3 className="text-pink-400" /> THỐNG KÊ NHANH{" "}
            </h2>
            <div className="space-y-6">
              <div className="p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">
                  Tổng lượt tham gia
                </p>
                <p className="text-5xl font-black text-indigo-400">
                  {leaderboard.length}
                </p>
              </div>
              <div className="p-6 bg-green-500/10 rounded-3xl border border-green-500/20">
                <p className="text-slate-400 text-xs font-bold uppercase mb-1">
                  Tỷ lệ đạt
                </p>
                <p className="text-5xl font-black text-green-400">
                  {leaderboard.length > 0
                    ? Math.round(
                        (leaderboard.filter((p) => p.result === "Đạt").length /
                          leaderboard.length) *
                          100,
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="pt-8 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-3 text-slate-500 text-xs font-bold uppercase">
                  {" "}
                  <Zap size={16} /> Tự động{" "}
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed italic">
                  Bảng này tự động làm mới sau mỗi 10 giây. Thông tin thí sinh
                  sẽ xuất hiện ngay khi họ nhấn nút "Bắt đầu chơi".
                </p>
              </div>
            </div>
          </section>
        </main>

        <AnimatePresence>
          {showFixGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-950/95 p-8 flex items-center justify-center"
            >
              <div className="max-w-3xl w-full bg-slate-900 border border-white/10 rounded-[40px] p-10 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between mb-8">
                  <h2 className="text-3xl font-black text-rose-400">
                    SỬA LỖI CORS (GOOGLE SCRIPT)
                  </h2>
                  <button
                    onClick={() => setShowFixGuide(false)}
                    className="p-2 hover:bg-white/10 rounded-full"
                  >
                    {" "}
                    <X size={32} />{" "}
                  </button>
                </div>
                <p className="mb-6 text-slate-400">
                  Bạn cần cập nhật mã Google Script để cho phép ứng dụng truy
                  cập dữ liệu:
                </p>
                <pre className="bg-black/50 p-6 rounded-2xl text-green-400 text-xs overflow-x-auto mb-6 leading-relaxed">
                  {`function doGet(e) {
  var action = e.parameter.action;
  if (action === 'getResults') {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    var results = [];
    // Lấy từ dưới lên để thấy người mới nhất trước
    for(var i=rows.length-1; i>=1; i--) {
      results.push({
        timestamp: rows[i][0], name: rows[i][1],
        className: rows[i][2], score: rows[i][3], result: rows[i][4]
      });
    }
    return ContentService.createTextOutput(JSON.stringify(results))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                </pre>
                <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20 text-sm text-blue-200">
                  <p>
                    <b>Lưu ý:</b> Sau khi sửa, chọn <b>Triển khai mới</b>, đặt
                    quyền là <b>Anyone</b> và copy URL mới.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // --- ADMIN VIEW ---
  if (route === "#/admin") {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-12 rounded-[40px] w-full max-w-sm text-center shadow-[0_0_60px_rgba(79,70,229,0.3)]"
          >
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
              {" "}
              <Lock className="text-indigo-600" size={40} />{" "}
            </div>
            <h2 className="text-2xl font-black mb-2 text-slate-800">
              Quyền Giáo Viên
            </h2>
            <p className="text-slate-400 text-sm font-bold mb-8">
              Vui lòng nhập mật khẩu quản trị
            </p>
            <input
              type="password"
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (adminPasswordInput === ADMIN_PASSWORD
                  ? setIsAdminAuthenticated(true)
                  : alert("Sai mật khẩu!"))
              }
              placeholder="Mật khẩu..."
              className="w-full p-5 bg-slate-100 rounded-2xl mb-6 text-center font-bold text-xl outline-none focus:ring-4 ring-indigo-500/20 border-2 border-transparent focus:border-indigo-500 transition-all"
              autoFocus
            />
            <button
              onClick={() =>
                adminPasswordInput === ADMIN_PASSWORD
                  ? setIsAdminAuthenticated(true)
                  : alert("Sai mật khẩu!")
              }
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              XÁC NHẬN
            </button>
            <button
              onClick={() => (window.location.hash = "#/")}
              className="mt-4 text-slate-400 font-bold hover:text-indigo-600 transition-colors"
            >
              Quay lại
            </button>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200">
                {" "}
                <Settings className="text-slate-800" size={32} />{" "}
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-800">
                  QUẢN LÝ NỘI DUNG
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                  Cấu hình bài tập phân loại
                </p>
              </div>
            </div>
            <button
              onClick={() => (window.location.hash = "#/")}
              className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              {" "}
              <ArrowLeft size={18} /> QUAY LẠI GAME{" "}
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                {" "}
                <Plus size={20} className="text-indigo-600" /> THÊM CÂU HỎI
                MỚI{" "}
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                    Phân loại
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Category)}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500"
                  >
                    {Object.values(Category).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                    Nội dung kiến thức
                  </label>
                  <textarea
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl min-h-[160px] font-medium outline-none focus:ring-2 ring-indigo-500 transition-all"
                    placeholder="Ví dụ: Nghệ thuật trùng điệp tạo nên giọng điệu và âm hưởng hùng hồn..."
                  />
                </div>
                <button
                  onClick={() => {
                    if (!newQuestion.trim()) return;
                    setGameData((prev) => [
                      ...prev,
                      {
                        id: Math.random().toString(36).substr(2, 9),
                        text: newQuestion,
                        category: newCategory,
                      },
                    ]);
                    setNewQuestion("");
                  }}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  {" "}
                  LƯU VÀO DANH SÁCH{" "}
                </button>
              </div>
            </section>

            <section className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black flex items-center gap-2">
                  {" "}
                  DANH SÁCH CÂU HỎI{" "}
                  <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg text-sm">
                    {gameData.length}
                  </span>
                </h2>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {gameData.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-start group hover:bg-white hover:border-indigo-200 transition-all"
                  >
                    <div className="flex-1 mr-4">
                      <span
                        className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter mb-2 inline-block ${q.category === Category.CONTENT ? "bg-blue-100 text-blue-600" : q.category === Category.ART ? "bg-purple-100 text-purple-600" : "bg-amber-100 text-amber-600"}`}
                      >
                        {" "}
                        {q.category}{" "}
                      </span>
                      <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                        {q.text}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm("Xóa câu hỏi này?"))
                          setGameData((prev) =>
                            prev.filter((i) => i.id !== q.id),
                          );
                      }}
                      className="text-slate-300 p-2 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all"
                    >
                      {" "}
                      <Trash2 size={20} />{" "}
                    </button>
                  </div>
                ))}
                {gameData.length === 0 && (
                  <div className="text-center py-20">
                    <p className="text-slate-400 font-bold italic">
                      Chưa có dữ liệu nào.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN GAME UI ---
  return (
    <div className="relative w-full h-screen bg-slate-50 overflow-hidden select-none touch-none">
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#c7d2fe_0%,transparent_50%)]" />
      </div>

      <AnimatePresence>
        {gameState === "PLAYING" && (
          <motion.div
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            className="absolute top-6 left-6 right-6 z-40 flex justify-between items-start pointer-events-none"
          >
            <div className="flex gap-4 pointer-events-auto">
              <div className="bg-white/80 backdrop-blur-xl border border-white p-4 rounded-3xl shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                  {" "}
                  <Award size={24} />{" "}
                </div>
                <div>
                  {" "}
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Điểm số
                  </p>{" "}
                  <p className="text-3xl font-black text-slate-800 leading-none">
                    {score}
                  </p>{" "}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-xl border border-white p-4 rounded-3xl shadow-xl flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                  {" "}
                  <Heart size={24} fill="currentColor" />{" "}
                </div>
                <div>
                  {" "}
                  <p className="text-[10px] font-black text-slate-400 uppercase">
                    Mạng
                  </p>{" "}
                  <div className="flex gap-1 mt-1">
                    {" "}
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${i < lives ? "bg-rose-500" : "bg-slate-200"}`}
                      />
                    ))}{" "}
                  </div>{" "}
                </div>
              </div>
            </div>
            <div className="bg-slate-900/90 backdrop-blur-xl p-4 px-8 rounded-3xl shadow-2xl text-white pointer-events-auto flex items-center gap-4">
              <Timer
                className={
                  timeLeft < 30
                    ? "text-rose-400 animate-pulse"
                    : "text-indigo-400"
                }
                size={28}
              />
              <div className="text-right">
                {" "}
                <p className="text-[10px] font-black text-slate-500 uppercase">
                  Thời gian
                </p>{" "}
                <p className="text-3xl font-mono font-black">
                  {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
                </p>{" "}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 h-[35%] z-20 p-8 grid grid-cols-3 gap-8 items-stretch bg-gradient-to-t from-white via-white/80 to-transparent">
        <div id="zone-CONTENT" className="h-full">
          {" "}
          <DropZone
            category={Category.CONTENT}
            highlight={activeZone === Category.CONTENT}
          />{" "}
        </div>
        <div id="zone-ART" className="h-full">
          {" "}
          <DropZone
            category={Category.ART}
            highlight={activeZone === Category.ART}
          />{" "}
        </div>
        <div id="zone-LESSON" className="h-full">
          {" "}
          <DropZone
            category={Category.LESSON}
            highlight={activeZone === Category.LESSON}
          />{" "}
        </div>
      </div>

      <div className="absolute inset-0 z-10 overflow-hidden">
        <AnimatePresence>
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
                const z = [
                  {
                    id: Category.CONTENT,
                    rect: document
                      .getElementById("zone-CONTENT")
                      ?.getBoundingClientRect(),
                  },
                  {
                    id: Category.ART,
                    rect: document
                      .getElementById("zone-ART")
                      ?.getBoundingClientRect(),
                  },
                  {
                    id: Category.LESSON,
                    rect: document
                      .getElementById("zone-LESSON")
                      ?.getBoundingClientRect(),
                  },
                ].find(
                  (z) =>
                    z.rect &&
                    point.x >= z.rect.left &&
                    point.x <= z.rect.right &&
                    point.y >= z.rect.top &&
                    point.y <= z.rect.bottom,
                );
                setActiveZone(z ? z.id : null);
              }}
              onDragEnd={handleDragEnd}
            />
          ))}
        </AnimatePresence>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-12 rounded-[40px] shadow-2xl max-w-lg w-full text-center border border-white"
            >
              <h1 className="text-5xl font-black text-slate-800 mb-2 tracking-tighter">
                Dòng Chảy
              </h1>
              <p className="text-slate-500 font-bold mb-10 text-lg">
                Phân loại kiến thức văn học
              </p>
              <div className="space-y-4 mb-10">
                <input
                  type="text"
                  value={playerInfo.name}
                  placeholder="Họ và tên..."
                  onChange={(e) =>
                    setPlayerInfo((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full p-5 bg-slate-100 rounded-2xl font-bold text-center outline-none focus:ring-4 ring-indigo-500/20 border-2 border-transparent focus:border-indigo-500 transition-all"
                />
                <input
                  type="text"
                  value={playerInfo.className}
                  placeholder="Lớp (VD: 12A1)..."
                  onChange={(e) =>
                    setPlayerInfo((p) => ({ ...p, className: e.target.value }))
                  }
                  className="w-full p-5 bg-slate-100 rounded-2xl font-bold text-center outline-none focus:ring-4 ring-indigo-500/20 border-2 border-transparent focus:border-indigo-500 transition-all"
                />
              </div>
              <button
                onClick={startGame}
                disabled={!playerInfo.name || !playerInfo.className}
                className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                {" "}
                <Play fill="currentColor" /> BẮT ĐẦU CHƠI{" "}
              </button>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => (window.location.hash = "#/results")}
                  className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-slate-600 hover:bg-slate-200 transition-all"
                >
                  {" "}
                  <BarChart3 className="inline mr-2" size={18} /> KẾT QUẢ{" "}
                </button>
                <button
                  onClick={() => (window.location.hash = "#/admin")}
                  className="p-4 bg-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all"
                >
                  {" "}
                  <Settings size={20} />{" "}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {(gameState === "GAME_OVER" || gameState === "VICTORY") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-white p-12 rounded-[50px] shadow-2xl text-center max-w-sm w-full border border-white"
            >
              <h2
                className={`text-4xl font-black mb-4 ${gameState === "VICTORY" ? "text-green-500" : "text-slate-800"}`}
              >
                {" "}
                {gameState === "VICTORY" ? "TUYỆT VỜI!" : "KẾT THÚC"}{" "}
              </h2>
              <p className="text-slate-400 font-black uppercase text-xs tracking-widest mb-2">
                Điểm đạt được
              </p>
              <div className="text-7xl font-black text-indigo-600 mb-8 tracking-tighter">
                {score}
              </div>
              <div className="mb-8 min-h-[40px]">
                {submitStatus === "SENDING" && (
                  <div className="flex items-center justify-center gap-2 text-indigo-500 font-bold">
                    {" "}
                    <Loader2 className="animate-spin" /> Đang lưu kết
                    quả...{" "}
                  </div>
                )}
                {submitStatus === "SUCCESS" && (
                  <div className="text-green-500 font-bold">
                    {" "}
                    <CheckCircle className="inline mr-2" /> Đã cập nhật thành
                    công!{" "}
                  </div>
                )}
                {submitStatus === "ERROR" && (
                  <div className="text-rose-500 font-bold">
                    {" "}
                    Lỗi khi cập nhật kết quả.{" "}
                  </div>
                )}
              </div>
              <button
                onClick={() => setGameState("MENU")}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-black transition-all shadow-xl"
              >
                {" "}
                <RotateCcw className="inline mr-2" size={24} /> CHƠI LẠI{" "}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
