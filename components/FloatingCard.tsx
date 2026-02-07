import React, { memo } from "react";
import { motion, PanInfo } from "framer-motion";
import { ActiveItem } from "../types";

interface FloatingCardProps {
  item: ActiveItem;
  onDragStart: (id: string) => void;
  onDrag: (point: { x: number; y: number }) => void;
  onDragEnd: (id: string, info: PanInfo) => void;
}

export const FloatingCard = memo(
  ({ item, onDragStart, onDrag, onDragEnd }: FloatingCardProps) => {
    return (
      <motion.div
        drag
        dragSnapToOrigin={true}
        dragElastic={0.05}
        whileDrag={{
          scale: 1.05,
          cursor: "grabbing",
          zIndex: 100,
          boxShadow: "0 15px 30px -10px rgba(0, 0, 0, 0.3)",
        }}
        onDragStart={() => onDragStart(item.id)}
        onDrag={(_, info) => onDrag(info.point)}
        onDragEnd={(_, info) => onDragEnd(item.id, info)}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        style={{
          position: "absolute",
          left: `${item.x}%`,
          top: `${item.y}%`,
          zIndex: item.isDragging ? 100 : 10,
          touchAction: "none",
        }}
        className={`
        cursor-grab
        w-[280px] sm:w-[320px] md:w-[380px] p-3 md:p-4 rounded-xl md:rounded-2xl shadow-md border-l-[6px] md:border-l-[8px] border-indigo-500 bg-white/95 backdrop-blur-md
        text-[12px] md:text-lg font-bold leading-tight text-slate-800
        select-none transition-shadow duration-200 border border-slate-100
        ${item.isDragging ? "ring-2 ring-indigo-400/20" : ""}
      `}
      >
        <div className="absolute -top-2 right-3 px-2 py-0.5 bg-indigo-500 text-[6px] md:text-[8px] uppercase tracking-widest text-white font-black rounded-full shadow-sm">
          LITERARY
        </div>
        <div className="line-clamp-2 md:line-clamp-3">{item.text}</div>
      </motion.div>
    );
  },
);

FloatingCard.displayName = "FloatingCard";
