
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { SketchItem } from '../types';
import { Shuffle, Image as ImageIcon, Type, Trash2, X, Plus, Sparkles, Orbit, Move, Zap } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface Props {
  items: SketchItem[];
  addItem: (item: SketchItem) => void;
  deleteItem: (id: string) => void;
  updateItem: (item: SketchItem) => void;
}

// Canvas Constants
const CANVAS_WIDTH = 3000;
const CANVAS_HEIGHT = 2000;
const CARD_WIDTH = 220; // Approx card width for collision
const CARD_HEIGHT = 180; // Approx card height

const Sketchpad: React.FC<Props> = ({ items, addItem, deleteItem, updateItem }) => {
  const [textInput, setTextInput] = useState('');
  const [isShuffling, setIsShuffling] = useState(false);
  const [focusItem, setFocusItem] = useState<SketchItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [collisions, setCollisions] = useState<Set<string>>(new Set());

  // Initialize random positions for items that don't have them
  useEffect(() => {
    let hasUpdates = false;
    const updatedItems = items.map(item => {
        if (item.x === undefined || item.y === undefined) {
            hasUpdates = true;
            return {
                ...item,
                x: Math.random() * (window.innerWidth - 300) + 50, // Initial viewport-ish placement
                y: Math.random() * (window.innerHeight - 300) + 50
            };
        }
        return item;
    });

    if (hasUpdates) {
        // We can't batch update easily with single updateItem, so we just let them render with defaults 
        // or trigger updates. For stability, let's just update local state if we had one, 
        // but here we rely on props. We'll effectively "migrate" them on first drag or shuffle.
        // Or we can auto-recombine once.
    }
  }, []); // Run once

  // --- PASTE LISTENER ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

        const clipboardItems = e.clipboardData?.items;
        if (!clipboardItems) return;

        for (let i = 0; i < clipboardItems.length; i++) {
            if (clipboardItems[i].type.indexOf('image') !== -1) {
                const blob = clipboardItems[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        handleAddImage(base64);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleAddImage = (base64: string) => {
      // Center in current view if possible, otherwise random
      const centerX = containerRef.current ? containerRef.current.scrollLeft + window.innerWidth / 2 : CANVAS_WIDTH / 2;
      const centerY = containerRef.current ? containerRef.current.scrollTop + window.innerHeight / 2 : CANVAS_HEIGHT / 2;

      const newItem: SketchItem = {
          id: Date.now().toString(),
          type: 'image',
          content: base64,
          createdAt: Date.now(),
          rotation: Math.random() * 6 - 3,
          x: centerX - 100 + (Math.random() * 40 - 20),
          y: centerY - 100 + (Math.random() * 40 - 20)
      };
      addItem(newItem);
  };

  const handleAddText = () => {
      if (!textInput.trim()) return;
      const centerX = containerRef.current ? containerRef.current.scrollLeft + window.innerWidth / 2 : CANVAS_WIDTH / 2;
      const centerY = containerRef.current ? containerRef.current.scrollTop + window.innerHeight / 2 : CANVAS_HEIGHT / 2;

      const newItem: SketchItem = {
          id: Date.now().toString(),
          type: 'text',
          content: textInput,
          createdAt: Date.now(),
          rotation: Math.random() * 4 - 2,
          x: centerX - 100 + (Math.random() * 40 - 20),
          y: centerY - 100 + (Math.random() * 40 - 20)
      };
      addItem(newItem);
      setTextInput('');
  };

  // --- RECOMBINATION LOGIC ---
  const handleRecombine = () => {
      setIsShuffling(true);
      
      // Calculate a "Safe Zone" in the middle of the canvas
      const padding = 100;
      const cols = Math.ceil(Math.sqrt(items.length));
      const cellWidth = (window.innerWidth - padding * 2) / cols;
      const cellHeight = (window.innerHeight - padding * 2) / cols;

      items.forEach((item, i) => {
          // Semi-random grid layout to ensure visibility but chaos
          const col = i % cols;
          const row = Math.floor(i / cols);
          
          const noiseX = Math.random() * 100 - 50;
          const noiseY = Math.random() * 100 - 50;

          // Target current scroll center
          const scrollX = containerRef.current?.scrollLeft || 0;
          const scrollY = containerRef.current?.scrollTop || 0;

          const targetX = scrollX + padding + col * cellWidth + noiseX;
          const targetY = scrollY + padding + row * cellHeight + noiseY;

          updateItem({
              ...item,
              rotation: Math.random() * 20 - 10,
              x: targetX,
              y: targetY
          });
      });

      setTimeout(() => setIsShuffling(false), 800);
  };

  // --- COLLISION DETECTION ---
  const checkCollisions = (activeId: string, x: number, y: number) => {
      const newCollisions = new Set(collisions);
      let hasCollision = false;

      items.forEach(item => {
          if (item.id === activeId) return;
          const ix = item.x || 0;
          const iy = item.y || 0;
          
          const dx = x - ix;
          const dy = y - iy;
          const distance = Math.sqrt(dx*dx + dy*dy);

          if (distance < 150) { // Threshold for collision
              newCollisions.add(activeId);
              newCollisions.add(item.id);
              hasCollision = true;
          } else {
              // Only remove if it's not colliding with *anything* else (simplified here)
              // Ideally we check all pairs, but for perf we check active against others
          }
      });

      // Cleanup: If active item isn't colliding, remove it from set
      if (!hasCollision) {
          newCollisions.delete(activeId);
      }
      
      setCollisions(newCollisions);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) handleAddImage(ev.target.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleCreateInsight = () => {
      const collidingItems = items.filter(i => collisions.has(i.id));
      if (collidingItems.length < 2) return;
      
      const combinedText = collidingItems
        .map(i => i.type === 'text' ? i.content : '[Image]')
        .join(' + ');
      
      // Create new synthesis note
      const centerX = collidingItems.reduce((sum, i) => sum + (i.x || 0), 0) / collidingItems.length;
      const centerY = collidingItems.reduce((sum, i) => sum + (i.y || 0), 0) / collidingItems.length;

      const newItem: SketchItem = {
          id: Date.now().toString(),
          type: 'text',
          content: `⚡ INSIGHT: ${combinedText}`,
          createdAt: Date.now(),
          x: centerX,
          y: centerY - 100,
          rotation: 0,
          color: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100'
      };
      addItem(newItem);
      setCollisions(new Set()); // Reset
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
      
      {/* HEADER HUD */}
      <div className="absolute top-0 left-0 w-full p-6 z-30 pointer-events-none flex justify-between items-start">
          <div>
              <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2 pointer-events-auto">
                  Quantum Field <span className="px-1.5 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">Sketchpad</span>
              </h1>
          </div>
          <div className="pointer-events-auto flex items-center gap-3">
              <Tooltip content="Вставить (Ctrl+V)">
                  <label className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 cursor-pointer text-slate-400 hover:text-indigo-500 hover:border-indigo-200 transition-all active:scale-95">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      <ImageIcon size={18} />
                  </label>
              </Tooltip>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
              <button 
                onClick={handleRecombine} 
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl hover:shadow-2xl transition-all active:scale-95 ${isShuffling ? 'opacity-80' : ''}`}
              >
                  <Shuffle size={14} className={isShuffling ? "animate-spin" : ""} />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest">Рекомбинация</span>
              </button>
          </div>
      </div>

      {/* CANVAS */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto relative cursor-grab active:cursor-grabbing custom-scrollbar-ghost"
        style={{
            backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            backgroundAttachment: 'local' // Key for scrolling grid
        }}
      >
          <div 
            className="relative min-w-[200vw] min-h-[200vh]"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          >
              <AnimatePresence>
                  {items.map((item) => {
                      const isColliding = collisions.has(item.id);
                      
                      return (
                          <motion.div
                              key={item.id}
                              layoutId={item.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ 
                                  x: item.x || 100, 
                                  y: item.y || 100, 
                                  rotate: item.rotation,
                                  scale: 1,
                                  opacity: 1,
                                  zIndex: isColliding ? 20 : 1
                              }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              drag
                              dragMomentum={false}
                              onDrag={(e, info) => checkCollisions(item.id, info.point.x + (containerRef.current?.scrollLeft || 0), info.point.y + (containerRef.current?.scrollTop || 0))}
                              onDragEnd={(e, info) => {
                                  // Update position in state
                                  const parentRect = containerRef.current?.getBoundingClientRect();
                                  const scrollX = containerRef.current?.scrollLeft || 0;
                                  const scrollY = containerRef.current?.scrollTop || 0;
                                  
                                  // Simply allow free drag, update final pos
                                  // Framer motion uses transform, we need to sync state to avoid jumps on recombine
                                  // For simplicity in this demo, we'll assume visual pos is enough until recombine resets
                                  // But ideally:
                                  updateItem({
                                      ...item,
                                      x: item.x! + info.offset.x,
                                      y: item.y! + info.offset.y
                                  });
                                  setCollisions(new Set()); // Clear collision highlight on drop
                              }}
                              className={`absolute max-w-[240px] group`}
                          >
                              {item.type === 'image' ? (
                                  <div 
                                    className={`
                                        p-1.5 bg-white dark:bg-slate-800 shadow-xl transition-all duration-500
                                        ${isColliding ? 'ring-4 ring-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.4)] scale-105' : 'hover:scale-105 hover:shadow-2xl grayscale hover:grayscale-0'}
                                    `}
                                    onDoubleClick={() => setFocusItem(item)}
                                  >
                                      <img src={item.content} alt="sketch" className="w-full h-auto object-cover pointer-events-none" />
                                  </div>
                              ) : (
                                  <div 
                                    className={`
                                        p-6 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border transition-all duration-300
                                        ${isColliding 
                                            ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)]' 
                                            : 'border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md'
                                        }
                                    `}
                                    onDoubleClick={() => setFocusItem(item)}
                                  >
                                      <p className="font-serif text-slate-800 dark:text-slate-200 text-sm leading-relaxed pointer-events-none select-none">
                                          {item.content}
                                      </p>
                                  </div>
                              )}

                              {/* CONTROLS */}
                              <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                  <button 
                                      onClick={() => deleteItem(item.id)}
                                      className="p-2 bg-white dark:bg-slate-800 text-red-400 hover:text-red-500 rounded-full shadow-sm border border-slate-100 dark:border-slate-700"
                                  >
                                      <Trash2 size={12} />
                                  </button>
                              </div>
                          </motion.div>
                      );
                  })}
              </AnimatePresence>
          </div>
      </div>

      {/* FOOTER CONTROLS */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4">
          <AnimatePresence>
              {collisions.size >= 2 && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: -60, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-4"
                  >
                      <button 
                        onClick={handleCreateInsight}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 transition-all font-bold text-xs uppercase tracking-widest animate-pulse"
                      >
                          <Zap size={16} fill="currentColor" /> Create Insight
                      </button>
                  </motion.div>
              )}
          </AnimatePresence>

          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-2xl flex items-center gap-2">
              <input 
                  type="text" 
                  className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 text-sm font-medium"
                  placeholder="Добавить мысль в поле..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
              />
              <button 
                  onClick={handleAddText}
                  disabled={!textInput.trim()}
                  className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
              >
                  <Plus size={20} />
              </button>
          </div>
      </div>

      {/* FOCUS MODAL */}
      <AnimatePresence>
          {focusItem && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
                  onClick={() => setFocusItem(null)}
              >
                  <motion.div 
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.9 }}
                      className="relative max-w-4xl max-h-full p-8 outline-none"
                      onClick={(e) => e.stopPropagation()}
                  >
                      {focusItem.type === 'image' ? (
                          <img src={focusItem.content} alt="Focus" className="rounded-sm shadow-2xl max-h-[80vh] object-contain" />
                      ) : (
                          <div className={`p-16 md:p-24 bg-white dark:bg-black border border-slate-100 dark:border-slate-800 shadow-2xl text-3xl md:text-5xl font-serif text-center leading-tight text-slate-900 dark:text-white max-w-3xl`}>
                              {focusItem.content}
                          </div>
                      )}
                      
                      <button onClick={() => setFocusItem(null)} className="absolute top-0 right-0 p-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                          <X size={32} strokeWidth={1} />
                      </button>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

    </div>
  );
};

export default Sketchpad;
