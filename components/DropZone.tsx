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

const COLORS = {
  [Category.CONTENT]:
    "from-blue-400/20 to-indigo-500/20 text-indigo-700 border-indigo-200",
  [Category.ART]:
    "from-purple-400/20 to-pink-500/20 text-purple-700 border-purple-200",
  [Category.LESSON]:
    "from-amber-400/20 to-orange-500/20 text-amber-700 border-amber-200",
};

const GLOWS = {
  [Category.CONTENT]:
    "shadow-[0_0_30px_rgba(99,102,241,0.4)] border-indigo-400",
  [Category.ART]: "shadow-[0_0_30px_rgba(168,85,247,0.4)] border-purple-400",
  [Category.LESSON]: "shadow-[0_0_30px_rgba(245,158,11,0.4)] border-amber-400",
};

export const DropZone = forwardRef<HTMLDivElement, DropZoneProps>(
  ({ category, highlight }, ref) => {
    const Icon = ICONS[category];

    return (
      <div
        ref={ref}
        className={`
        relative h-full w-full rounded-2xl md:rounded-3xl border-2 md:border-4 transition-all duration-300 flex flex-col items-center justify-center
        bg-gradient-to-br ${COLORS[category]} backdrop-blur-md overflow-hidden
        ${highlight ? `${GLOWS[category]} scale-[1.03] bg-white` : "border-dashed opacity-90"}
      `}
      >
        <div
          className={`p-2 md:p-4 rounded-xl shadow-sm mb-1 md:mb-3 transition-transform duration-300 ${highlight ? "scale-110 bg-white" : "bg-white/50"}`}
        >
          <Icon
            className={`w-6 h-6 md:w-10 md:h-10 ${highlight ? "animate-bounce" : ""}`}
          />
        </div>
        <h3 className="text-xs md:text-2xl font-black uppercase tracking-tighter md:tracking-widest text-center px-1">
          {category}
        </h3>

        <div
          className={`mt-1 text-[8px] md:text-xs font-bold uppercase tracking-tighter opacity-40 transition-opacity ${highlight ? "opacity-100" : "hidden md:block"}`}
        >
          Thả tại đây
        </div>

        <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-current opacity-20" />
        <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-current opacity-20" />
      </div>
    );
  },
);

DropZone.displayName = "DropZone";
