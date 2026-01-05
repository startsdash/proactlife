
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SketchItem } from '../types';
import { LayoutGrid, Image as ImageIcon, Type, Trash2, X, Plus, Scan, Scaling, Move, Link2, Zap, Palette, Shuffle, Activity } from 'lucide-react';

interface Props {
  items: SketchItem[];
  addItem: (item: SketchItem) => void;
  deleteItem: (id: string) => void;
  updateItem: (item: SketchItem) => void;
}

const Sketchpad: React.FC<Props> = ({ items, addItem, deleteItem, updateItem }) => {
  const [textInput, setTextInput] = useState('');
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [focusItem, setFocusItem] = useState<SketchItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Chaos & Visual State
  const [isChaos, setIsChaos] = useState(false);
  const [flash, setFlash] = useState(false);
  const [activeColorImages, setActiveColorImages] = useState<Set<string>>(new Set());

  // Chaos transforms memoization
  const chaosTransforms = useMemo(() => {
      if (!isChaos) return {};
      const map: Record<string, { rotate: number, x: number, y: number, z: number }> = {};
      items.forEach(item => {
          map[item.id] = {
              rotate: (Math.random() - 0.5) * 30, // -15 to 15 deg
              x: (Math.random() - 0.5) * 60, // visual offset
              y: (Math.random() - 0.5) * 60,
              z: Math.floor(Math.random() * 20) // z-index variance
          };
      });
      return map;
  }, [isChaos, items.length]);

  const toggleChaos = () => {
      if (isChaos) {
          // Restore Order (Synthesis)
          setIsChaos(false);
          setFlash(true);
          setTimeout(() => setFlash(false), 800);
          
          // Re-align grid data if needed (optional, keeping it purely visual for now preserves user layout)
      } else {
          // Break Order (Entropy)
          setIsChaos(true);
      }
  };

  const toggleImageColor = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newSet = new Set(activeColorImages);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setActiveColorImages(newSet);
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
          rotation: 0,
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
          rotation: 0,
          widthClass: 'col-span-1 row-span-1'
      };
      addItem(newItem);
      setTextInput('');
      setIsInputOpen(false);
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
        className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#050505] relative overflow-hidden font-sans transition-colors duration-700" 
        ref={containerRef}
    >
      {/* SYNTHESIS FLASH */}
      <AnimatePresence>
          {flash && (
              <motion.div 
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute inset-0 bg-white z-[100] pointer-events-none mix-blend-overlay"
              />
          )}
      </AnimatePresence>

      {/* ARCHITECTURAL GRID BACKGROUND */}
      <div 
        className={`absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${isChaos ? 'opacity-20' : 'opacity-100'}`}
        style={{
            backgroundImage: `
                linear-gradient(to right, rgba(100,100,100,0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(100,100,100,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
        }} 
      />
      <div 
        className={`absolute inset-0 pointer-events-none z-0 transition-all duration-1000 ${isChaos ? 'opacity-10 scale-110 blur-sm' : 'opacity-30 dark:opacity-10 scale-100'}`}
        style={{
            backgroundImage: `
                linear-gradient(to right, rgba(100,100,100,0.08) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(100,100,100,0.08) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px'
        }} 
      />

      {/* HEADER CONTROLS */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-4">
          <div className="hidden md:block font-mono text-[9px] text-slate-400 uppercase tracking-widest mr-2 select-none">
              {isChaos ? 'ENTROPY STATE // ACTIVE' : 'LIGHT TABLE // STABLE'}
          </div>
          <button 
            onClick={toggleChaos}
            className={`
                group flex items-center gap-2 px-4 py-2 border rounded-full transition-all shadow-sm active:translate-y-0.5 backdrop-blur-md
                ${isChaos 
                    ? 'bg-rose-500/10 border-rose-500/50 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20' 
                    : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'}
            `}
          >
              {isChaos ? <Shuffle size={14} /> : <LayoutGrid size={14} className="text-slate-500 dark:text-slate-400" />}
              <span className="font-mono text-[9px] uppercase tracking-widest font-bold">
                  {isChaos ? 'RESTORE_ORDER' : 'BREAK_ORDER //'}
              </span>
          </button>
      </div>

      {/* CANVAS AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-none p-8 md:p-16 relative z-10">
          
          {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 select-none">
                  <div className="w-24 h-24 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center mb-6 rounded-3xl">
                      <Plus size={24} className="text-slate-300 dark:text-slate-600" strokeWidth={1} />
                  </div>
                  <h2 className="text-xl font-serif text-slate-800 dark:text-slate-200 tracking-tight">Drafting Surface</h2>
                  <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-slate-400">Workspace Clear</p>
                  <div className="mt-8 flex gap-4">
                      <span className="text-[10px] font-mono text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded">CTRL+V for Images</span>
                  </div>
              </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8 auto-rows-[minmax(150px,auto)] pb-32 max-w-[1920px] mx-auto">
                  <AnimatePresence mode='popLayout'>
                      {items.map((item, i) => {
                          const chaosParams = chaosTransforms[item.id] || { rotate: 0, x: 0, y: 0, z: 0 };
                          const isImageActive = activeColorImages.has(item.id);

                          return (
                          <motion.div
                              layout={!isChaos} // Disable layout animation during chaos so we can control transforms manually
                              drag
                              dragConstraints={containerRef}
                              dragElastic={0.2}
                              whileDrag={{ scale: 1.05, zIndex: 100, boxShadow: "0 20px 40px rgba(0,0,0,0.2)", cursor: 'grabbing' }}
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ 
                                  opacity: 1, 
                                  scale: 1, 
                                  rotate: isChaos ? chaosParams.rotate : 0,
                                  x: isChaos ? chaosParams.x : 0,
                                  y: isChaos ? chaosParams.y : 0,
                                  zIndex: isChaos ? chaosParams.z : 1
                              }}
                              exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                              transition={{ 
                                  type: "spring", stiffness: isChaos ? 100 : 300, damping: 20
                              }}
                              className={`
                                  relative group cursor-grab active:cursor-grabbing
                                  ${item.widthClass || 'col-span-1'}
                                  ${item.type === 'image' ? 'row-span-2' : ''}
                                  backdrop-blur-xl backdrop-saturate-150 rounded-2xl
                                  border border-white/40 dark:border-white/10
                                  shadow-sm hover:shadow-lg transition-shadow duration-300
                              `}
                              style={{ 
                                  background: 'rgba(255, 255, 255, 0.4)', // Glass base
                                  // Dark mode override via tailwind class if needed, but inline style for rgba specific opacity
                                  // Let's use tailwind utility for theme awareness of the background color
                              }}
                              onClick={() => setFocusItem(item)}
                          >
                              {/* Dark mode tint override */}
                              <div className="absolute inset-0 bg-white/40 dark:bg-black/40 rounded-2xl -z-10 pointer-events-none" />

                              {item.type === 'image' ? (
                                  <div className="relative h-full w-full p-2 flex flex-col group/image">
                                      <div className="flex-1 relative overflow-hidden rounded-xl bg-slate-100/50 dark:bg-slate-800/50 border border-white/20 dark:border-white/5">
                                          <img 
                                            src={item.content} 
                                            alt="sketch" 
                                            className={`
                                                w-full h-full object-cover transition-all duration-700
                                                ${isImageActive ? 'grayscale-0' : 'grayscale group-hover/image:grayscale-0'}
                                            `} 
                                          />
                                          
                                          {/* COLOR FLUX TOGGLE */}
                                          <button 
                                            onClick={(e) => toggleImageColor(e, item.id)}
                                            className={`
                                                absolute bottom-2 right-2 p-1.5 rounded-lg backdrop-blur-md border transition-all duration-300
                                                ${isImageActive 
                                                    ? 'bg-white/80 text-indigo-600 border-indigo-200' 
                                                    : 'bg-black/40 text-white/70 border-white/10 opacity-0 group-hover/image:opacity-100'}
                                            `}
                                          >
                                              <Palette size={12} />
                                          </button>
                                      </div>
                                      <div className="h-6 flex items-center justify-between mt-2 px-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                          <span className="font-mono text-[8px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">IMG_{item.id.slice(-4)}</span>
                                          <div className={`w-1.5 h-1.5 rounded-full ${isImageActive ? 'bg-indigo-500 shadow-[0_0_5px_currentColor]' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                      </div>
                                  </div>
                              ) : (
                                  <div className="h-full w-full p-6 flex flex-col justify-between relative overflow-hidden">
                                      {/* Content */}
                                      <p className="font-serif text-base md:text-lg text-slate-800 dark:text-slate-300 leading-relaxed select-none mix-blend-hard-light">
                                          {item.content}
                                      </p>
                                      
                                      {/* Metadata Footer */}
                                      <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-900/5 dark:border-white/5">
                                          <span className="font-mono text-[8px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                              NOTE_{item.id.slice(-4)}
                                          </span>
                                          <Link2 size={12} className="text-slate-300 dark:text-slate-600" />
                                      </div>
                                  </div>
                              )}
                              
                              {/* HOVER ACTIONS - Minimalist Glass Buttons */}
                              <button 
                                  onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                  className="absolute -top-2 -right-2 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-20 rounded-full"
                              >
                                  <X size={12} />
                              </button>
                          </motion.div>
                      )})}
                  </AnimatePresence>
              </div>
          )}
      </div>

      {/* INPUT DOCK - Minimalist Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-30 pointer-events-none flex justify-center">
          <div className="bg-white/80 dark:bg-[#151921]/80 backdrop-blur-[20px] border border-slate-200/60 dark:border-slate-700/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-full p-2 flex items-center gap-2 pointer-events-auto transition-all duration-300 max-w-2xl w-full">
              
              <button 
                  onClick={() => setIsInputOpen(!isInputOpen)}
                  className={`p-3 rounded-full transition-all ${isInputOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                  <Type size={18} strokeWidth={1.5} />
              </button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

              <div className="flex-1 relative">
                  <input 
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter') { handleAddText(); } }}
                      placeholder="Capture a thought..."
                      className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 font-serif text-sm placeholder:text-slate-400 placeholder:font-sans"
                  />
              </div>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

              <label className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <ImageIcon size={18} strokeWidth={1.5} />
              </label>

              <button 
                  onClick={handleAddText}
                  disabled={!textInput.trim()}
                  className="p-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-md"
              >
                  <Plus size={18} strokeWidth={2} />
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
                  className="fixed inset-0 z-50 bg-white/95 dark:bg-[#020617]/95 backdrop-blur-md flex items-center justify-center p-8 md:p-16 cursor-zoom-out"
                  onClick={() => setFocusItem(null)}
              >
                  <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="relative max-w-5xl max-h-full cursor-default shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                  >
                      {focusItem.type === 'image' ? (
                          <div className="relative border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-2 rounded-xl">
                              <img src={focusItem.content} alt="Focus" className="max-h-[80vh] object-contain rounded-lg" />
                          </div>
                      ) : (
                          <div className="p-16 md:p-24 bg-white dark:bg-[#151921] border border-slate-200 dark:border-slate-700 text-3xl md:text-5xl font-serif text-center leading-relaxed max-w-4xl text-slate-900 dark:text-slate-100 min-w-[300px] rounded-xl shadow-2xl">
                              {focusItem.content}
                          </div>
                      )}
                      
                      <button 
                        onClick={() => setFocusItem(null)} 
                        className="absolute -top-16 right-0 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                      >
                          <X size={24} strokeWidth={1} />
                      </button>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

    </div>
  );
};

export default Sketchpad;
