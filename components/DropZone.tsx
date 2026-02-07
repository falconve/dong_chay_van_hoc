import React, { forwardRef } from "react";
import { Category } from "../types";
import { BookOpen, Palette, Lightbulb } from "lucide-react";

interface DropZoneProps {
  category: Category;
  slug: string;
  highlight: boolean;
}

const ICONS = {
  [Category.CONTENT]: BookOpen,
  [Category.ART]: Palette,
  [Category.LESSON]: Lightbulb,
};

const THEMES = {
  [Category.CONTENT]: {
    bg: "from-blue-600/5 to-indigo-600/10",
    border: "border-blue-400/30",
    active: "bg-blue-500/20 border-blue-400 shadow-lg",
    text: "text-blue-700",
    iconBg: "bg-blue-100 text-blue-600",
  },
  [Category.ART]: {
    bg: "from-purple-600/5 to-pink-600/10",
    border: "border-purple-400/30",
    active: "bg-purple-500/20 border-purple-400 shadow-lg",
    text: "text-purple-700",
    iconBg: "bg-purple-100 text-purple-600",
  },
  [Category.LESSON]: {
    bg: "from-amber-600/5 to-orange-600/10",
    border: "border-amber-400/30",
    active: "bg-amber-500/20 border-amber-400 shadow-lg",
    text: "text-amber-700",
    iconBg: "bg-amber-100 text-amber-600",
  },
};

export const DropZone = forwardRef<HTMLDivElement, DropZoneProps>(
  ({ category, slug, highlight }, ref) => {
    const Icon = ICONS[category];
    const theme = THEMES[category];

    return (
      <div
        ref={ref}
        id={`zone-${slug}`}
        className={`
        relative h-full w-full rounded-2xl md:rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center justify-center
        bg-gradient-to-br backdrop-blur-md overflow-hidden
        ${highlight ? theme.active + " scale-[1.03]" : theme.bg + " " + theme.border + " border-dashed"}
      `}
      >
        <div
          className={`p-1.5 md:p-3 rounded-lg mb-1 transition-transform duration-300 ${highlight ? "scale-110 " + theme.iconBg : "bg-white/40 text-slate-400"}`}
        >
          <Icon className="w-5 h-5 md:w-8 md:h-8" />
        </div>

        <h3
          className={`text-[10px] md:text-lg font-black uppercase tracking-tighter text-center leading-none ${highlight ? "text-indigo-900" : theme.text}`}
        >
          {category}
        </h3>

        <p
          className={`mt-0.5 text-[7px] md:text-[9px] font-black uppercase tracking-widest opacity-40 ${highlight ? "text-indigo-800" : "text-slate-400"}`}
        >
          {highlight ? "THẢ!" : "KÉO VÀO"}
        </p>

        {/* Trang trí góc siêu mảnh */}
        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l border-current opacity-10" />
        <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r border-current opacity-10" />
      </div>
    );
  },
);

DropZone.displayName = "DropZone";
