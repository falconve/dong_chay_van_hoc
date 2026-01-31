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

export const DropZone = forwardRef<HTMLDivElement, DropZoneProps>(({ category, highlight }, ref) => {
  const Icon = ICONS[category];

  return (
    <div
      ref={ref}
      className={`
        relative h-full w-full rounded-xl border-4 transition-all duration-300 flex flex-col items-center justify-start pt-4
        ${CATEGORY_BG[category]}
        ${highlight ? 'scale-105 shadow-[0_0_30px_rgba(255,255,255,0.6)] ring-4 ring-white' : 'border-dashed opacity-90'}
      `}
    >
      <div className="bg-white p-3 rounded-full shadow-md mb-2">
        <Icon className="w-8 h-8 text-gray-700" />
      </div>
      <h3 className="text-2xl font-black uppercase tracking-wider text-gray-800 text-center px-2">
        {category}
      </h3>
      <div className="absolute bottom-4 text-base text-gray-500 font-bold">
        Kéo thả vào đây
      </div>
    </div>
  );
});

DropZone.displayName = 'DropZone';