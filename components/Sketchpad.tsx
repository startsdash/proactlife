
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { SketchItem } from '../types';
import { Shuffle, Image as ImageIcon, Type, Trash2, X, Plus, Sparkles, Move } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface Props {
  items: SketchItem[];
  addItem: (item: SketchItem) => void;
  deleteItem: (id: string) => void;
  updateItem: (item: SketchItem) => void;
}

const QuantumSketchpad: React.FC<Props> = ({ items, addItem, deleteItem, updateItem }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeCollision, setActiveCollision] = useState<{ ids: string[], cx: number, cy: number } | null>(null);
  
  // Mouse position for Parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Background Parallax Transforms (Subtle movement opposite to mouse)
  const gridX = useTransform(mouseX, [-500, 500], [15, -15]);
  const gridY = useTransform(mouseY, [-500, 500], [15, -15]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    mouseX.set(clientX - innerWidth / 2);
    mouseY.set(clientY - innerHeight / 2);
  };

  // --- COLLISION LOGIC ---
  const handleDrag = useCallback((id: string, info: any) => {
      // Very basic collision detection based on positions
      // In a real app, we'd use bounding client rects, but here we estimate based on x/y state
      const currentItem = items.find(i => i.id === id);
      if (!currentItem) return;

      // Approximate center of dragged item (assuming default width ~200px)
      const cx = (currentItem.x || 0) + info.offset.x + 100; 
      const cy = (currentItem.y || 0) + info.offset.y + 100;

      const threshold = 120; // Distance to trigger collision
      let collisionFound = false;

      for (const other of items) {
          if (other.id === id) continue;
          // Approximate center of other items
          const ocx = (other.x || 0) + 100;
          const ocy = (other.y || 0) + 100;
          
          const dist = Math.sqrt(Math.pow(cx - ocx, 2) + Math.pow(cy - ocy, 2));
          
          if (dist < threshold) {
              setActiveCollision({ 
                  ids: [id, other.id], 
                  cx: (cx + ocx) / 2, 
                  cy: (cy + ocy) / 2 
              });
              collisionFound = true;
              break;
          }
      }

      if (!collisionFound) setActiveCollision(null);
  }, [items]);

  const handleDragEnd = (id: string, info: any) => {
      const item = items.find(i => i.id === id);
      if (item) {
          updateItem({
              ...item,
              x: (item.x || 0) + info.offset.x,
              y: (item.y || 0) + info.offset.y
          });
      }
      setActiveCollision(null);
  };

  // --- ACTIONS ---
  const recombine = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      
      items.forEach(item => {
          updateItem({
              ...item,
              x: Math.random() * (clientWidth - 250),
              y: Math.random() * (clientHeight - 250),
              rotation: Math.random() * 10 - 5
          });
      });
  };

  const addTextNote = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const newItem: SketchItem = {
          id: Date.now().toString(),
          type: 'text',
          content: 'Новая мысль...',
          createdAt: Date.now(),
          x: clientWidth / 2 - 100 + (Math.random() * 40 - 20),
          y: clientHeight / 2 - 100 + (Math.random() * 40 - 20),
          rotation: Math.random() * 4 - 2,
      };
      addItem(newItem);
  };

  const handleImagePaste = (e: React.ClipboardEvent) => {
      const clipboardItems = e.clipboardData.items;
      for (let i = 0; i < clipboardItems.length; i++) {
          if (clipboardItems[i].type.indexOf('image') !== -1) {
              const blob = clipboardItems[i].getAsFile();
              if (blob) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                      if (ev.target?.result && containerRef.current) {
                          const { clientWidth, clientHeight } = containerRef.current;
                          addItem({
                              id: Date.now().toString(),
                              type: 'image',
                              content: ev.target.result as string,
                              createdAt: Date.now(),
                              x: clientWidth / 2 - 100,
                              y: clientHeight / 2 - 100,
                              rotation: Math.random() * 6 - 3,
                          });
                      }
                  };
                  reader.readAsDataURL(blob);
              }
          }
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && containerRef.current) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result && containerRef.current) {
                    const { clientWidth, clientHeight } = containerRef.current;
                    addItem({
                        id: Date.now().toString(),
                        type: 'image',
                        content: ev.target.result as string,
                        createdAt: Date.now(),
                        x: clientWidth / 2 - 100,
                        y: clientHeight / 2 - 100,
                        rotation: Math.random() * 6 - 3,
                    });
                }
            };
            reader.readAsDataURL(file);
        }
  };

  const triggerInsight = () => {
      if (window.confetti && activeCollision) {
          window.confetti({
              particleCount: 100,
              spread: 70,
              origin: { x: activeCollision.cx / window.innerWidth, y: activeCollision.cy / window.innerHeight }
          });
          setActiveCollision(null);
          // Here you could visually merge them or open a modal
          alert("Инсайт зафиксирован! (Концептуально)");
      }
  };

  return (
    <div 
        className="relative w-full h-full overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a] select-none" 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onPaste={handleImagePaste}
        tabIndex={0} // Allow paste focus
    >
        {/* PARALLAX DOT GRID */}
        <motion.div 
            className="absolute inset-[-100px] pointer-events-none opacity-40 dark:opacity-20 z-0"
            style={{ 
                backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
                backgroundSize: '32px 32px',
                x: gridX,
                y: gridY
            }} 
        />

        {/* CONTROLS (Floating) */}
        <div className="absolute top-6 left-6 z-50 flex flex-col gap-4">
            <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight select-none pointer-events-none">
                Quantum Field
            </h1>
            <div className="flex gap-2">
                <button 
                    onClick={addTextNote}
                    className="p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-full shadow-sm hover:scale-110 transition-transform text-slate-600 dark:text-slate-300"
                    title="Add Text (Type)"
                >
                    <Type size={20} />
                </button>
                <label className="p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-full shadow-sm hover:scale-110 transition-transform text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <ImageIcon size={20} />
                </label>
            </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
            <button 
                onClick={recombine}
                className="group flex items-center gap-3 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            >
                <Shuffle size={14} className="group-hover:rotate-180 transition-transform duration-700" />
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold">Рекомбинация</span>
            </button>
        </div>

        {/* CANVAS ITEMS */}
        <AnimatePresence>
            {items.map((item) => {
                const isColliding = activeCollision?.ids.includes(item.id);
                
                return (
                    <motion.div
                        key={item.id}
                        layout // Critical for Recombine animation
                        drag
                        dragMomentum={false}
                        onDrag={(_, info) => handleDrag(item.id, info)}
                        onDragEnd={(_, info) => handleDragEnd(item.id, info)}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ 
                            opacity: 1, 
                            scale: 1, 
                            x: item.x || 100, 
                            y: item.y || 100, 
                            rotate: item.rotation || 0,
                            boxShadow: isColliding 
                                ? "0 0 30px rgba(99,102,241,0.6), 0 0 10px rgba(99,102,241,0.8)" 
                                : "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                        }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ 
                            type: "spring", stiffness: 200, damping: 25, 
                            layout: { duration: 0.8, ease: [0.2, 0.8, 0.2, 1] } 
                        }}
                        className={`absolute cursor-grab active:cursor-grabbing group`}
                        style={{ width: 220 }}
                    >
                        {item.type === 'text' ? (
                            <div className="bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-[20px] border border-white/40 dark:border-white/10 p-6 min-h-[140px] flex items-center justify-center text-center relative overflow-hidden rounded-sm">
                                {/* Paper Texture Hint */}
                                <div className="absolute inset-0 opacity-50 pointer-events-none mix-blend-multiply bg-slate-50" />
                                <div 
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => updateItem({...item, content: e.target.innerText})}
                                    className="relative z-10 font-serif text-slate-800 dark:text-slate-200 text-lg leading-relaxed outline-none min-w-[100px]"
                                >
                                    {item.content}
                                </div>
                            </div>
                        ) : (
                            <div className="p-1 bg-white dark:bg-slate-800 shadow-sm transition-all">
                                <img 
                                    src={item.content} 
                                    alt="fragment" 
                                    className="w-full h-auto object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" 
                                />
                            </div>
                        )}

                        {/* Controls on Hover */}
                        <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                className="bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    </motion.div>
                );
            })}
        </AnimatePresence>

        {/* INSIGHT BUTTON (COLLISION EVENT) */}
        <AnimatePresence>
            {activeCollision && (
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, x: activeCollision.cx, y: activeCollision.cy }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute z-[100] -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                    style={{ left: 0, top: 0 }} // Position handled by motion animate x/y
                >
                    <button 
                        onClick={triggerInsight}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-[0_0_20px_rgba(79,70,229,0.6)] animate-pulse hover:animate-none hover:scale-110 transition-transform"
                    >
                        <Sparkles size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">Create Insight</span>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>

    </div>
  );
};

export default QuantumSketchpad;
