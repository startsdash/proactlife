
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { SketchItem } from '../types';
import { Shuffle, Image as ImageIcon, Trash2, X, Plus, Sparkles, Diamond, Maximize2 } from 'lucide-react';

interface Props {
  items: SketchItem[];
  addItem: (item: SketchItem) => void;
  deleteItem: (id: string) => void;
  updateItem: (item: SketchItem) => void;
}

// --- VISUAL CONSTANTS ---
const DOT_GRID_STYLE = {
    backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', // Darker Slate for Graphite feel
    backgroundSize: '32px 32px'
};

interface ConnectionLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    midX: number;
    midY: number;
}

const Sketchpad: React.FC<Props> = ({ items, addItem, deleteItem, updateItem }) => {
  const [textInput, setTextInput] = useState('');
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [focusItem, setFocusItem] = useState<SketchItem | null>(null);
  const [collisionTargetId, setCollisionTargetId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionLine | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Parallax Mouse Effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);
  
  const bgX = useTransform(springX, [-1000, 1000], [20, -20]);
  const bgY = useTransform(springY, [-1000, 1000], [20, -20]);

  const handleMouseMove = (e: React.MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      mouseX.set(clientX - innerWidth / 2);
      mouseY.set(clientY - innerHeight / 2);
  };

  // --- COLLISION PHYSICS & VISUALS ---
  const handleDragStart = (id: string) => {
      setDraggedItemId(id);
  };

  const handleDrag = (id: string) => {
      const draggedEl = itemsMap.current.get(id);
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (!draggedEl || !containerRect) return;

      const r1 = draggedEl.getBoundingClientRect();
      let foundCollision = null;
      let newConnection: ConnectionLine | null = null;

      for (const [otherId, otherEl] of itemsMap.current) {
          if (id === otherId) continue;
          const r2 = otherEl.getBoundingClientRect();

          const xOverlap = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
          const yOverlap = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
          const intersectionArea = xOverlap * yOverlap;
          const minArea = Math.min(r1.width * r1.height, r2.width * r2.height);

          // Overlap threshold > 10% for sensitivity
          if (intersectionArea > minArea * 0.1) {
              foundCollision = otherId;
              
              // Calculate Centers relative to container
              const c1 = { 
                  x: (r1.left + r1.width/2) - containerRect.left + containerRef.current!.scrollLeft, 
                  y: (r1.top + r1.height/2) - containerRect.top + containerRef.current!.scrollTop 
              };
              const c2 = { 
                  x: (r2.left + r2.width/2) - containerRect.left + containerRef.current!.scrollLeft, 
                  y: (r2.top + r2.height/2) - containerRect.top + containerRef.current!.scrollTop 
              };

              newConnection = {
                  x1: c1.x, y1: c1.y,
                  x2: c2.x, y2: c2.y,
                  midX: (c1.x + c2.x) / 2,
                  midY: (c1.y + c2.y) / 2
              };
              break; // One collision at a time
          }
      }
      setCollisionTargetId(foundCollision);
      setConnection(newConnection);
  };

  const handleDragEnd = () => {
      setDraggedItemId(null);
      setCollisionTargetId(null);
      setConnection(null);
  };

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
      const newItem: SketchItem = {
          id: Date.now().toString(),
          type: 'image',
          content: base64,
          createdAt: Date.now(),
          rotation: (Math.random() * 3) - 1.5,
          widthClass: 'col-span-1 row-span-2',
          x: 0,
          y: 0
      };
      addItem(newItem);
  };

  const handleAddText = () => {
      if (!textInput.trim()) return;
      const newItem: SketchItem = {
          id: Date.now().toString(),
          type: 'text',
          content: textInput,
          createdAt: Date.now(),
          rotation: (Math.random() * 3) - 1.5,
          widthClass: 'col-span-1 row-span-1',
          x: 0,
          y: 0
      };
      addItem(newItem);
      setTextInput('');
      setIsInputOpen(false);
  };

  const handleShuffle = () => {
      // Recombine Logic: Randomized Offsets to force natural overlap (Physicality)
      items.forEach((item, index) => {
          // Every 3rd item gets a stronger offset to ensure overlaps
          const intensity = index % 3 === 0 ? 60 : 30;
          
          updateItem({
              ...item,
              rotation: (Math.random() * 6) - 3, // More tilt (-3 to 3)
              x: (Math.random() * intensity * 2) - intensity, // Random X offset
              y: (Math.random() * intensity * 2) - intensity, // Random Y offset
          });
      });
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

  return (
    <div 
        className="flex flex-col h-full bg-[#e2e8f0] dark:bg-[#0f172a] relative overflow-hidden" 
        ref={containerRef}
        onMouseMove={handleMouseMove}
    >
      {/* 1. QUANTUM FIELD BACKGROUND */}
      <motion.div 
        className="absolute inset-[-50px] pointer-events-none opacity-20 dark:opacity-10 z-0" 
        style={{ 
            ...DOT_GRID_STYLE,
            x: bgX,
            y: bgY
        }} 
      />
      
      {/* 2. COLLISION VISUALS LAYER (SVG Overlay) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40 overflow-visible">
          {connection && (
              <>
                  {/* Dotted Line */}
                  <line 
                    x1={connection.x1} y1={connection.y1} 
                    x2={connection.x2} y2={connection.y2} 
                    stroke="#6366f1" 
                    strokeWidth="1.5" 
                    strokeDasharray="4 4"
                    className="opacity-80"
                  />
                  {/* Luminous Node */}
                  <circle cx={connection.midX} cy={connection.midY} r="3" fill="#fff" stroke="#6366f1" strokeWidth="2" className="animate-pulse" />
              </>
          )}
      </svg>

      {/* 3. FLOATING LABEL (HTML Overlay) */}
      <AnimatePresence>
          {connection && (
              <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute z-50 pointer-events-none bg-black/80 text-white px-2 py-1 rounded text-[9px] font-mono uppercase tracking-widest backdrop-blur-md border border-white/20 shadow-xl"
                  style={{ left: connection.midX, top: connection.midY - 20, transform: 'translateX(-50%)' }}
              >
                  [ DETECTED_RELATION ]
              </motion.div>
          )}
      </AnimatePresence>

      {/* HEADER CONTROLS */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
          <div className="hidden md:block font-mono text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest mr-2 select-none">
              Aether / Physical
          </div>
          <button 
            onClick={handleShuffle}
            className="group flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-black/50 backdrop-blur-md border border-slate-300 dark:border-white/10 rounded-full hover:bg-white dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm"
          >
              <Shuffle size={14} className="text-slate-700 dark:text-slate-300 group-hover:rotate-180 transition-transform duration-500" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-700 dark:text-slate-300 font-bold">Recombine</span>
          </button>
      </div>

      {/* CANVAS AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-none p-4 md:p-12 relative z-10">
          
          {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 select-none">
                  <div className="relative">
                      <Sparkles size={64} className="text-indigo-200 dark:text-slate-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150 blur-sm" />
                      <Sparkles size={48} className="relative z-10 text-slate-300 dark:text-slate-600" strokeWidth={1} />
                  </div>
                  <h2 className="mt-6 text-2xl font-serif text-slate-700 dark:text-slate-200 tracking-tight">Чистое Поле</h2>
                  <p className="mt-2 text-xs font-mono uppercase tracking-widest text-slate-400">Ctrl+V для изображений</p>
              </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 auto-rows-[minmax(180px,auto)] pb-32 max-w-[1920px] mx-auto">
                  <AnimatePresence mode='popLayout'>
                      {items.map((item, i) => {
                          const isColliding = collisionTargetId === item.id || draggedItemId === item.id && collisionTargetId !== null;
                          const isTarget = collisionTargetId === item.id;

                          return (
                          <motion.div
                              layout
                              ref={el => { if(el) itemsMap.current.set(item.id, el); else itemsMap.current.delete(item.id); }}
                              drag
                              dragConstraints={containerRef}
                              dragElastic={0.2}
                              dragMomentum={false}
                              onDragStart={() => handleDragStart(item.id)}
                              onDrag={() => handleDrag(item.id)}
                              onDragEnd={handleDragEnd}
                              whileDrag={{ scale: 1.1, zIndex: 100, cursor: 'grabbing', boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}
                              whileHover={{ scale: 1.02, zIndex: 10 }}
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.8, y: 50 }}
                              animate={{ 
                                  opacity: 1, 
                                  scale: isColliding ? 1.05 : 1, 
                                  x: item.x || 0,
                                  y: item.y || 0,
                                  rotate: item.rotation || 0,
                                  borderColor: isColliding ? 'rgba(99,102,241,0.8)' : 'rgba(71,85,105,0.3)' // Slate-400/30 default -> Indigo on collision
                              }}
                              exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                              transition={{ 
                                  layout: { duration: 0.6, type: "spring", bounce: 0.2 },
                                  opacity: { duration: 0.4 }
                              }}
                              className={`
                                  relative group cursor-grab active:cursor-grabbing
                                  ${item.widthClass || 'col-span-1'}
                                  ${item.type === 'image' ? 'row-span-2' : ''}
                                  rounded-[3px]
                              `}
                              style={{ zIndex: 1 }}
                              onClick={() => setFocusItem(item)}
                          >
                              {item.type === 'image' ? (
                                  <div className="relative h-full w-full bg-white dark:bg-[#111] p-1.5 shadow-md group-hover:shadow-2xl transition-all duration-500 rounded-[3px] border border-slate-300 dark:border-slate-700/50 overflow-hidden group-hover:border-indigo-500/30">
                                      {/* Anti-Gray: Full Color, Boosted Contrast */}
                                      <img 
                                        src={item.content} 
                                        alt="sketch" 
                                        className="w-full h-full object-cover brightness-[1.02] contrast-[1.05] rounded-[1px] pointer-events-none" 
                                      />
                                      {/* Physical Gloss */}
                                      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50 pointer-events-none" />
                                  </div>
                              ) : (
                                  <div className="h-full w-full bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-md border border-slate-300 dark:border-slate-700 p-6 shadow-sm hover:shadow-xl transition-all duration-500 rounded-[3px] flex flex-col justify-center items-center text-center group-hover:border-indigo-500/30 relative overflow-hidden">
                                      {/* Paper Noise */}
                                      <div className="absolute inset-0 opacity-[0.05] bg-noise pointer-events-none" />
                                      
                                      <p className="font-serif italic text-xl text-slate-900 dark:text-slate-100 leading-relaxed select-none pointer-events-none drop-shadow-sm">
                                          {item.content}
                                      </p>
                                  </div>
                              )}
                              
                              {/* HOVER ACTIONS */}
                              <div className="absolute -top-3 -right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 scale-90 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto z-50">
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                      className="p-2 bg-white dark:bg-slate-800 text-red-500 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors border border-slate-200 dark:border-slate-700"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          </motion.div>
                      )})}
                  </AnimatePresence>
              </div>
          )}
      </div>

      {/* INPUT DOCK */}
      <div className="absolute bottom-8 right-8 z-50 flex flex-col items-end gap-4 pointer-events-none">
          <AnimatePresence>
              {isInputOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-300 dark:border-slate-700 p-4 rounded-xl shadow-2xl w-80 pointer-events-auto mb-2 origin-bottom-right"
                  >
                      <textarea 
                          autoFocus
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddText(); } }}
                          placeholder="Новая мысль..."
                          className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 font-serif italic text-lg resize-none placeholder:text-slate-400 placeholder:font-sans placeholder:not-italic min-h-[100px]"
                      />
                      <div className="flex justify-between items-center mt-2 border-t border-slate-200/50 dark:border-white/10 pt-3">
                          <span className="text-[9px] font-mono text-slate-400">ENTER TO SAVE</span>
                          <button onClick={handleAddText} className="p-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity">
                              <Plus size={16} />
                          </button>
                      </div>
                  </motion.div>
              )}
          </AnimatePresence>

          <div className="flex items-center gap-3 pointer-events-auto">
              <label className="group flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 shadow-lg cursor-pointer hover:scale-110 transition-all hover:border-indigo-500">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <ImageIcon size={20} className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </label>
              
              <button 
                  onClick={() => setIsInputOpen(!isInputOpen)}
                  className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all hover:scale-110 ${isInputOpen ? 'bg-slate-900 dark:bg-white text-white dark:text-black rotate-45' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600'}`}
              >
                  <Plus size={24} strokeWidth={1.5} />
              </button>
          </div>
      </div>

      {/* FOCUS MODAL (LIGHTBOX) */}
      <AnimatePresence>
          {focusItem && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-white/95 dark:bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
                  onClick={() => setFocusItem(null)}
              >
                  <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="relative max-w-7xl max-h-full cursor-default flex flex-col items-center"
                      onClick={(e) => e.stopPropagation()}
                  >
                      {focusItem.type === 'image' ? (
                          <div className="relative shadow-2xl rounded-sm overflow-hidden border-[12px] border-white dark:border-[#111]">
                              <img src={focusItem.content} alt="Focus" className="max-h-[85vh] object-contain brightness-[1.02] contrast-[1.05]" />
                          </div>
                      ) : (
                          <div className="p-16 md:p-24 bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 shadow-2xl text-4xl md:text-6xl font-serif italic text-center leading-tight max-w-5xl text-slate-900 dark:text-slate-100 rounded-sm">
                              {focusItem.content}
                          </div>
                      )}
                      
                      <button 
                        onClick={() => setFocusItem(null)} 
                        className="absolute -top-16 right-0 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2"
                      >
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
