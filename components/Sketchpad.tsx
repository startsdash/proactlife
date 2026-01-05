
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, PanInfo } from 'framer-motion';
import { SketchItem } from '../types';
import { Shuffle, Image as ImageIcon, Trash2, X, Plus, Sparkles, Diamond, ArrowUpRight } from 'lucide-react';

interface Props {
  items: SketchItem[];
  addItem: (item: SketchItem) => void;
  deleteItem: (id: string) => void;
  updateItem: (item: SketchItem) => void;
}

const DOT_GRID_STYLE = {
    backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
    backgroundSize: '32px 32px'
};

const Sketchpad: React.FC<Props> = ({ items, addItem, deleteItem, updateItem }) => {
  const [textInput, setTextInput] = useState('');
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [focusItem, setFocusItem] = useState<SketchItem | null>(null);
  const [collisionTargetId, setCollisionTargetId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  
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

  // --- COLLISION LOGIC ---
  const handleDragStart = (id: string) => {
      setDraggedItemId(id);
  };

  const handleDrag = (id: string) => {
      const draggedEl = itemsMap.current.get(id);
      if (!draggedEl) return;

      const r1 = draggedEl.getBoundingClientRect();
      let foundCollision = null;

      for (const [otherId, otherEl] of itemsMap.current) {
          if (id === otherId) continue;
          const r2 = otherEl.getBoundingClientRect();

          const xOverlap = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
          const yOverlap = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
          const intersectionArea = xOverlap * yOverlap;
          const minArea = Math.min(r1.width * r1.height, r2.width * r2.height);

          // Overlap threshold > 20%
          if (intersectionArea > minArea * 0.2) {
              foundCollision = otherId;
              break; // Found one
          }
      }
      setCollisionTargetId(foundCollision);
  };

  const handleDragEnd = () => {
      setDraggedItemId(null);
      setCollisionTargetId(null);
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
          widthClass: 'col-span-1 row-span-2'
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
          widthClass: 'col-span-1 row-span-1'
      };
      addItem(newItem);
      setTextInput('');
      setIsInputOpen(false);
  };

  const handleShuffle = () => {
      // Fluid Flow: Modifying dimensions triggers layout animation
      items.forEach(item => {
          updateItem({
              ...item,
              rotation: (Math.random() * 3) - 1.5,
              // Randomly toggle size for layout shift
              widthClass: Math.random() > 0.8 ? 'col-span-2 row-span-1' : 'col-span-1 row-span-1'
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
        className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] relative overflow-hidden" 
        ref={containerRef}
        onMouseMove={handleMouseMove}
    >
      {/* QUANTUM FIELD BACKGROUND */}
      <motion.div 
        className="absolute inset-[-50px] pointer-events-none opacity-30 dark:opacity-10 z-0" 
        style={{ 
            ...DOT_GRID_STYLE,
            x: bgX,
            y: bgY
        }} 
      />
      
      {/* VIGNETTE */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.05)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] z-0" />

      {/* HEADER CONTROLS */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-4">
          <div className="hidden md:block font-mono text-[9px] text-slate-400 uppercase tracking-widest mr-2 select-none">
              Quantum Field / Active
          </div>
          <button 
            onClick={handleShuffle}
            className="group flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-black/50 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-full hover:bg-white dark:hover:bg-white/10 transition-all active:scale-95"
          >
              <Shuffle size={14} className="text-slate-600 dark:text-slate-300 group-hover:rotate-180 transition-transform duration-500" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600 dark:text-slate-300 font-bold">Рекомбинация</span>
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
                  <h2 className="mt-6 text-2xl font-serif text-slate-800 dark:text-slate-200 tracking-tight">Чистое Сознание</h2>
                  <p className="mt-2 text-xs font-mono uppercase tracking-widest text-slate-400">Поле готово для наблюдений</p>
                  <p className="mt-8 text-xs text-slate-400 opacity-50">Ctrl+V для изображений</p>
              </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 auto-rows-[minmax(150px,auto)] pb-32 max-w-[1920px] mx-auto">
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
                              dragElastic={0.1}
                              dragMomentum={false}
                              onDragStart={() => handleDragStart(item.id)}
                              onDrag={() => handleDrag(item.id)}
                              onDragEnd={handleDragEnd}
                              whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing', boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.8, y: 50 }}
                              animate={{ 
                                  opacity: 1, 
                                  scale: 1, 
                                  y: 0, 
                                  rotate: item.rotation || 0,
                                  borderColor: isColliding ? 'rgba(99,102,241,0.5)' : 'rgba(0,0,0,0)'
                              }}
                              exit={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
                              transition={{ 
                                  layout: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] },
                                  opacity: { duration: 0.4 }
                              }}
                              className={`
                                  relative group cursor-grab active:cursor-grabbing
                                  ${item.widthClass || 'col-span-1'}
                                  ${item.type === 'image' ? 'row-span-2' : ''}
                              `}
                              style={{ zIndex: 1 }}
                              onClick={() => setFocusItem(item)}
                          >
                              {/* Collision Bridge UI */}
                              <AnimatePresence>
                                  {isTarget && (
                                      <motion.div 
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0 }}
                                        className="absolute -top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 pointer-events-none"
                                      >
                                          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/50">
                                              <Diamond size={10} className="text-white fill-current" />
                                          </div>
                                          <div className="bg-black/80 text-white text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded-md whitespace-nowrap backdrop-blur-md">
                                              [ FUSE_INTO_INSIGHT? ]
                                          </div>
                                      </motion.div>
                                  )}
                              </AnimatePresence>

                              {/* Glow Border for Collision */}
                              {isTarget && (
                                  <motion.div 
                                    layoutId="collisionGlow"
                                    className="absolute inset-[-4px] rounded-lg border-2 border-indigo-400/50 z-40 pointer-events-none animate-pulse"
                                  />
                              )}

                              {item.type === 'image' ? (
                                  <div className="relative h-full w-full bg-white dark:bg-black p-1 shadow-lg group-hover:shadow-2xl transition-all duration-500 rounded-sm border border-slate-200 dark:border-white/10 transform group-hover:-translate-y-1 overflow-hidden">
                                      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 -z-10" />
                                      {/* Enhanced Image Styling */}
                                      <img 
                                        src={item.content} 
                                        alt="sketch" 
                                        className="w-full h-full object-cover brightness-[1.05] contrast-[1.1] transition-all duration-700 ease-in-out" 
                                      />
                                      {/* Glass Overlay for Thickness */}
                                      <div className="absolute inset-0 ring-1 ring-white/20 ring-inset pointer-events-none" />
                                      
                                      {/* Minimal Frame Marker */}
                                      <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/50 drop-shadow-md" />
                                      <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/50 drop-shadow-md" />
                                  </div>
                              ) : (
                                  <div className="h-full w-full bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-black/5 dark:border-white/10 p-6 md:p-8 shadow-sm hover:shadow-xl transition-all duration-500 rounded-sm flex flex-col justify-center items-center text-center group-hover:-translate-y-1 relative overflow-hidden">
                                      {/* Paper Texture Overlay */}
                                      <div className="absolute inset-0 opacity-[0.03] bg-noise pointer-events-none" />
                                      
                                      <p className="font-serif italic text-lg md:text-xl text-slate-800 dark:text-slate-200 leading-relaxed select-none">
                                          {item.content}
                                      </p>
                                      
                                      {/* Hover Glow */}
                                      <div className="absolute inset-0 border border-indigo-500/0 group-hover:border-indigo-500/20 transition-colors duration-500 pointer-events-none" />
                                  </div>
                              )}
                              
                              {/* HOVER ACTIONS */}
                              <div className="absolute -top-3 -right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 scale-90 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto z-50">
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                      className="p-2 bg-white dark:bg-slate-800 text-red-500 rounded-full shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors border border-slate-100 dark:border-slate-700"
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
      <div className="absolute bottom-8 right-8 z-30 flex flex-col items-end gap-4 pointer-events-none">
          <AnimatePresence>
              {isInputOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="bg-white/80 dark:bg-black/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xl w-80 pointer-events-auto mb-2 origin-bottom-right"
                  >
                      <textarea 
                          autoFocus
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddText(); } }}
                          placeholder="Новая мысль..."
                          className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 font-serif italic text-lg resize-none placeholder:text-slate-400 placeholder:font-sans placeholder:not-italic min-h-[100px]"
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
              <label className="group flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg cursor-pointer hover:scale-110 transition-all hover:border-indigo-500/50">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <ImageIcon size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
              </label>
              
              <button 
                  onClick={() => setIsInputOpen(!isInputOpen)}
                  className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all hover:scale-110 ${isInputOpen ? 'bg-slate-900 dark:bg-white text-white dark:text-black rotate-45' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'}`}
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
                  className="fixed inset-0 z-50 bg-white/90 dark:bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
                  onClick={() => setFocusItem(null)}
              >
                  <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      className="relative max-w-5xl max-h-full cursor-default"
                      onClick={(e) => e.stopPropagation()}
                  >
                      {focusItem.type === 'image' ? (
                          <div className="relative shadow-2xl rounded-sm overflow-hidden border-8 border-white dark:border-slate-900">
                              <img src={focusItem.content} alt="Focus" className="max-h-[85vh] object-contain" />
                          </div>
                      ) : (
                          <div className="p-16 md:p-24 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 shadow-2xl text-3xl md:text-5xl font-serif italic text-center leading-relaxed max-w-4xl text-slate-900 dark:text-slate-100">
                              {focusItem.content}
                          </div>
                      )}
                      
                      <button 
                        onClick={() => setFocusItem(null)} 
                        className="absolute -top-12 right-0 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
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
