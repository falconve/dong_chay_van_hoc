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
        dragElastic={0.1}
        whileDrag={{
          scale: 1.02,
          rotate: [0, -0.5, 0.5, 0],
          cursor: "grabbing",
          zIndex: 100,
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
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
        w-[50vw] sm:w-[40vw] md:w-80 lg:w-96 p-2 md:p-5 rounded-xl md:rounded-2xl shadow-lg border-l-4 md:border-l-[10px] border-indigo-500 bg-white/95 backdrop-blur-sm
        text-[10px] md:text-xl lg:text-2xl font-bold leading-tight md:leading-snug text-slate-800
        select-none transition-shadow duration-200
        ${item.isDragging ? "ring-2 md:ring-4 ring-indigo-400/30" : ""}
      `}
      >
        <div className="absolute top-1 right-2 text-[6px] md:text-[9px] uppercase tracking-widest text-slate-300 font-black">
          LITERARY
        </div>
        <div className="line-clamp-3 md:line-clamp-none">{item.text}</div>
      </motion.div>
    );
  },
);

FloatingCard.displayName = "FloatingCard";
