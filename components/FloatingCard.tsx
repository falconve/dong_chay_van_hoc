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
        dragElastic={0.15}
        whileDrag={{
          scale: 1.05,
          rotate: [0, -1, 1, 0],
          cursor: "grabbing",
          zIndex: 100,
          boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.3)",
        }}
        onDragStart={() => onDragStart(item.id)}
        onDrag={(_, info) => onDrag(info.point)}
        onDragEnd={(_, info) => onDragEnd(item.id, info)}
        initial={{ scale: 0.8, opacity: 0 }}
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
        w-[70vw] md:w-96 p-3 md:p-6 rounded-2xl shadow-xl border-l-[6px] md:border-l-[10px] border-indigo-500 bg-white/95 backdrop-blur-sm
        text-sm md:text-2xl font-bold leading-tight md:leading-snug text-slate-800
        select-none transition-shadow duration-200
        ${item.isDragging ? "ring-4 ring-indigo-400/30" : ""}
      `}
      >
        <div className="absolute top-1 right-3 text-[7px] md:text-[10px] uppercase tracking-widest text-slate-300 font-black">
          LITERARY FLOW
        </div>
        {item.text}
      </motion.div>
    );
  },
);

FloatingCard.displayName = "FloatingCard";
