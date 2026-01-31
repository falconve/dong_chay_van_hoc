import React from 'react';
import { motion, PanInfo } from 'framer-motion';
import { ActiveItem } from '../types';
import { CATEGORY_COLORS } from '../constants';

interface FloatingCardProps {
  item: ActiveItem;
  onDragStart: (id: string) => void;
  onDrag: (point: { x: number, y: number }) => void;
  onDragEnd: (id: string, info: PanInfo) => void;
}

export const FloatingCard: React.FC<FloatingCardProps> = ({ item, onDragStart, onDrag, onDragEnd }) => {
  return (
    <motion.div
      drag
      dragSnapToOrigin={true} 
      dragElastic={0.2}
      whileDrag={{ scale: 1.05, cursor: 'grabbing', zIndex: 100 }}
      onDragStart={() => onDragStart(item.id)}
      onDrag={(_, info) => onDrag(info.point)}
      onDragEnd={(_, info) => onDragEnd(item.id, info)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
      }}
      style={{
        position: 'absolute',
        left: `${item.x}%`,
        top: `${item.y}%`,
        zIndex: item.isDragging ? 100 : 10,
        touchAction: 'none', 
      }}
      className={`
        cursor-grab
        w-80 p-5 rounded-xl shadow-lg border-l-8 bg-white
        text-3xl font-bold leading-snug
        select-none
        transition-shadow
        ${item.isDragging ? 'shadow-2xl ring-4 ring-blue-400' : 'shadow-lg'}
      `}
    >
      {item.text}
    </motion.div>
  );
};