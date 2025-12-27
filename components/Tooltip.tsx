
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top', className = '', disabled = false }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let top = 0;
        let left = 0;
        const offset = 8; // Distance from element

        switch (side) {
            case 'right':
                top = rect.top + rect.height / 2;
                left = rect.right + offset;
                break;
            case 'left':
                top = rect.top + rect.height / 2;
                left = rect.left - offset;
                break;
            case 'bottom':
                top = rect.bottom + offset;
                left = rect.left + rect.width / 2;
                break;
            case 'top':
            default:
                top = rect.top - offset;
                left = rect.left + rect.width / 2;
                break;
        }
        setCoords({ top, left });
    }
  };

  const handleMouseEnter = () => {
      if (disabled) return;
      updatePosition();
      setVisible(true);
  };

  return (
    <>
      <div 
        ref={triggerRef} 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={() => setVisible(false)}
        className={className}
      >
        {children}
      </div>
      {visible && createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{ 
                    position: 'fixed', 
                    top: coords.top, 
                    left: coords.left,
                    zIndex: 9999,
                    // Correctly translate based on side to center or offset the tooltip
                    translateX: side === 'top' || side === 'bottom' ? '-50%' : (side === 'left' ? '-100%' : '0'),
                    translateY: side === 'right' || side === 'left' ? '-50%' : (side === 'top' ? '-100%' : '0'),
                }}
                className="pointer-events-none"
            >
                <div className="relative bg-black text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl whitespace-nowrap border border-white/10">
                    {content}
                    {/* Arrow */}
                    <div className={`absolute w-2 h-2 bg-black border-r border-b border-white/10 transform rotate-45 
                        ${side === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2' : ''}
                        ${side === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2 rotate-180 border-t border-l border-b-0 border-r-0' : ''}
                        ${side === 'left' ? '-right-1 top-1/2 -translate-y-1/2 rotate-[-45deg]' : ''}
                        ${side === 'right' ? '-left-1 top-1/2 -translate-y-1/2 rotate-[135deg]' : ''}
                    `} />
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
