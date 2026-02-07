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
  ({ category, slug, highlight }, ref) => {
    const Icon = ICONS[category];
    const theme = THEMES[category];

    return (
      <div
        ref={ref}
        id={`zone-${slug}`}
        className={`
        relative h-full w-full rounded-2xl md:rounded-[2.5rem] border-2 md:border-4 transition-all duration-300 flex flex-col items-center justify-center
        bg-gradient-to-br backdrop-blur-xl overflow-hidden
        ${highlight ? theme.active + " scale-[1.02]" : theme.bg + " " + theme.border + " border-dashed"}
      `}
      >
        <div
          className={`p-2 md:p-4 rounded-xl mb-1 md:mb-4 transition-transform duration-300 ${highlight ? "scale-110 " + theme.iconBg : "bg-white/50 text-slate-400"}`}
        >
          <Icon className="w-6 h-6 md:w-10 md:h-10 lg:w-14 lg:h-14" />
        </div>

        <h3
          className={`text-xs md:text-xl lg:text-3xl font-black uppercase tracking-tighter text-center leading-none ${highlight ? "text-indigo-900" : theme.text}`}
        >
          {category}
        </h3>

        <p
          className={`hidden sm:block mt-1 md:mt-3 text-[8px] md:text-xs font-black uppercase tracking-widest opacity-40 ${highlight ? "text-indigo-800" : "text-slate-400"}`}
        >
          {highlight ? "THẢ RA!" : "KÉO VÀO"}
        </p>

        {/* Trang trí góc */}
        <div className="absolute top-2 left-2 md:top-6 md:left-6 w-2 h-2 md:w-4 md:h-4 border-t-2 border-l-2 border-current opacity-10" />
        <div className="absolute bottom-2 right-2 md:bottom-6 md:right-6 w-2 h-2 md:w-4 md:h-4 border-b-2 border-r-2 border-current opacity-10" />
      </div>
    );
  },
);

DropZone.displayName = "DropZone";
