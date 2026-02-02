import React, { forwardRef } from "react";
import { Category } from "../types";
import { BookOpen, Palette, Lightbulb } from "lucide-react";

interface DropZoneProps {
  category: Category;
  highlight: boolean;
}

const ICONS = {
  [Category.CONTENT]: BookOpen,
  [Category.ART]: Palette,
  [Category.LESSON]: Lightbulb,
};

const THEMES = {
  [Category.CONTENT]: {
    bg: "from-blue-600/10 to-indigo-600/20",
    border: "border-blue-400/50",
    active:
      "bg-blue-500/30 border-blue-400 shadow-[0_0_40px_rgba(59,130,246,0.5)]",
    text: "text-blue-700",
    iconBg: "bg-blue-100 text-blue-600",
  },
  [Category.ART]: {
    bg: "from-purple-600/10 to-pink-600/20",
    border: "border-purple-400/50",
    active:
      "bg-purple-500/30 border-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.5)]",
    text: "text-purple-700",
    iconBg: "bg-purple-100 text-purple-600",
  },
  [Category.LESSON]: {
    bg: "from-amber-600/10 to-orange-600/20",
    border: "border-amber-400/50",
    active:
      "bg-amber-500/30 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.5)]",
    text: "text-amber-700",
    iconBg: "bg-amber-100 text-amber-600",
  },
};

export const DropZone = forwardRef<HTMLDivElement, DropZoneProps>(
  ({ category, highlight }, ref) => {
    const Icon = ICONS[category];
    const theme = THEMES[category];

    return (
      <div
        ref={ref}
        className={`
        relative h-full w-full rounded-[2rem] border-4 transition-all duration-500 flex flex-col items-center justify-center
        bg-gradient-to-br backdrop-blur-xl overflow-hidden
        ${highlight ? theme.active + " scale-105" : theme.bg + " " + theme.border + " border-dashed"}
      `}
      >
        {/* Hiệu ứng sóng chảy phía sau */}
        {highlight && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-white/20 to-transparent animate-bounce" />
          </div>
        )}

        <div
          className={`p-4 md:p-6 rounded-2xl shadow-sm mb-2 transition-transform duration-300 ${highlight ? "scale-110 " + theme.iconBg : "bg-white/50 text-slate-600"}`}
        >
          <Icon
            size={highlight ? 48 : 32}
            className={highlight ? "animate-spin-slow" : ""}
          />
        </div>

        <h3
          className={`text-sm md:text-3xl font-black uppercase tracking-tighter md:tracking-widest text-center px-4 leading-none ${highlight ? "text-white" : theme.text}`}
        >
          {category}
        </h3>

        <p
          className={`mt-2 text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-60 ${highlight ? "text-white" : "text-slate-400"}`}
        >
          {highlight ? "Thả ngay!" : "Phân loại vào đây"}
        </p>

        {/* Trang trí góc */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-current opacity-20" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-current opacity-20" />
      </div>
    );
  },
);

DropZone.displayName = "DropZone";
