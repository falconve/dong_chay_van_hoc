
import React, { forwardRef } from 'react';
import { Category } from '../types';
import { CATEGORY_BG } from '../constants';
import { BookOpen, Palette, Lightbulb } from 'lucide-react';

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
  [Category.CONTENT]: 'from-blue-400/20 to-indigo-500/20 text-indigo-700 border-indigo-200',
  [Category.ART]: 'from-purple-400/20 to-pink-500/20 text-purple-700 border-purple-200',
  [Category.LESSON]: 'from-amber-400/20 to-orange-500/20 text-amber-700 border-amber-200',
};

const GLOWS = {
  [Category.CONTENT]: 'shadow-[0_0_40px_rgba(99,102,241,0.4)] border-indigo-400',
  [Category.ART]: 'shadow-[0_0_40px_rgba(168,85,247,0.4)] border-purple-400',
  [Category.LESSON]: 'shadow-[0_0_40px_rgba(245,158,11,0.4)] border-amber-400',
};

export const DropZone = forwardRef<HTMLDivElement, DropZoneProps>(({ category, highlight }, ref) => {
  const Icon = ICONS[category];

  return (
    <div
      ref={ref}
      className={`
        relative h-full w-full rounded-3xl border-4 transition-all duration-500 flex flex-col items-center justify-center
        bg-gradient-to-br ${COLORS[category]} backdrop-blur-md
        ${highlight ? `${GLOWS[category]} scale-[1.02] bg-white` : 'border-dashed opacity-80'}
      `}
    >
      <div className={`p-4 rounded-2xl shadow-sm mb-3 transition-transform duration-300 ${highlight ? 'scale-110 bg-white' : 'bg-white/50'}`}>
        <Icon className={`w-10 h-10 ${highlight ? 'animate-bounce' : ''}`} />
      </div>
      <h3 className="text-xl md:text-2xl font-black uppercase tracking-widest text-center px-4">
        {category}
      </h3>
      
      {/* Visual hint for dragging */}
      <div className={`mt-2 text-xs font-bold uppercase tracking-tighter opacity-40 transition-opacity ${highlight ? 'opacity-100' : ''}`}>
        Thả tại đây
      </div>

      {/* Animated corner accents */}
      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-current opacity-20" />
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-current opacity-20" />
    </div>
  );
});

DropZone.displayName = 'DropZone';
