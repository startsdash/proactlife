import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

type Position = 'top' | 'bottom' | 'left' | 'right';
type Color = 'slate' | 'indigo' | 'emerald' | 'amber' | 'red' | 'purple' | 'cyan' | 'orange';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: Position;
  color?: Color;
  delay?: number;
  className?: string;
}

const colorMap: Record<Color, string> = {
  slate: 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
  indigo: 'border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300',
  emerald: 'border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-emerald-300',
  amber: 'border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-300',
  red: 'border-red-200 dark:border-red-700 text-red-500 dark:text-red-400',
  purple: 'border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-300',
  cyan: 'border-cyan-200 dark:border-cyan-700 text-cyan-600 dark:text-cyan-300',
  orange: 'border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-300',
};

const TooltipPortal: React.FC<{
  coords: { top: number; left: number; width: number; height: number };
  position: Position;
  content: React.ReactNode;
  color: Color;
}> = ({ coords, position, content, color }) => {
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      setTooltipSize({
        width: ref.current.offsetWidth,
        height: ref.current.offsetHeight,
      });
    }
  }, [content]);

  let top = 0;
  let left = 0;
  const gap = 8;

  switch (position) {
    case 'top':
      top = coords.top - tooltipSize.height - gap;
      left = coords.left + coords.width / 2 - tooltipSize.width / 2;
      break;
    case 'bottom':
      top = coords.top + coords.height + gap;
      left = coords.left + coords.width / 2 - tooltipSize.width / 2;
      break;
    case 'left':
      top = coords.top + coords.height / 2 - tooltipSize.height / 2;
      left = coords.left - tooltipSize.width - gap;
      break;
    case 'right':
      top = coords.top + coords.height / 2 - tooltipSize.height / 2;
      left = coords.left + coords.width + gap;
      break;
  }

  // Initial animation states based on position
  const initialMap = {
    top: { opacity: 0, y: 5, scale: 0.95 },
    bottom: { opacity: 0, y: -5, scale: 0.95 },
    left: { opacity: 0, x: 5, scale: 0.95 },
    right: { opacity: 0, x: -5, scale: 0.95 },
  };

  return createPortal(
    <motion.div
      ref={ref}
      initial={initialMap[position]}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{ top, left, position: 'fixed', zIndex: 9999 }}
      className={`
        px-3 py-1.5 rounded-xl border shadow-xl backdrop-blur-md
        bg-white/95 dark:bg-slate-900/95
        text-xs font-semibold whitespace-nowrap pointer-events-none
        ${colorMap[color]}
      `}
    >
      {content}
    </motion.div>,
    document.body
  );
};

export const Tooltip: React.FC<TooltipProps> = ({ 
  children, 
  content, 
  position = 'top', 
  color = 'slate',
  delay = 200,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  if (!content) return <>{children}</>;

  return (
    <>
      <div 
        className={className || "inline-flex"} // inline-flex preserves layout better than inline-block usually
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <TooltipPortal 
            coords={coords} 
            position={position} 
            content={content} 
            color={color}
          />
        )}
      </AnimatePresence>
    </>
  );
};