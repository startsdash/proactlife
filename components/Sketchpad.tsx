
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SketchItem } from '../types';
import { LayoutGrid, Image as ImageIcon, Type, Trash2, X, Plus, Scan, Scaling, Move, Link2 } from 'lucide-react';

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

  const handleShuffle = () => {
      // Grid Shuffle: Align everything to strict grid, removing rotations/irregularities
      items.forEach(item => {
          updateItem({
              ...item,
              rotation: 0, 
              widthClass: item.type === 'image' ? 'col-span-1 row-span-2' : 'col-span-1 row-span-1'
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
        className="flex flex-col h-full bg-[#fdfdfd] dark:bg-[#0b0c10] relative overflow-hidden font-sans" 
        ref={containerRef}
    >
      {/* ARCHITECTURAL GRID BACKGROUND */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
            backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
        }} 
      />
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-50 dark:opacity-20"
        style={{
            backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px'
        }} 
      />

      {/* HEADER CONTROLS */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-4">
          <div className="hidden md:block font-mono text-[9px] text-slate-400 uppercase tracking-widest mr-2 select-none">
              Light Table / Active
          </div>
          <button 
            onClick={handleShuffle}
            className="group flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm active:translate-y-0.5"
          >
              <LayoutGrid size={14} className="text-slate-500 dark:text-slate-400" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-slate-600 dark:text-slate-300 font-bold">Align Grid</span>
          </button>
      </div>

      {/* CANVAS AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-none p-8 md:p-16 relative z-10">
          
          {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 select-none">
                  <div className="w-24 h-24 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center mb-6">
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
                      {items.map((item, i) => (
                          <motion.div
                              layout
                              drag
                              dragConstraints={containerRef}
                              dragElastic={0.1}
                              dragMomentum={false}
                              whileDrag={{ scale: 1.02, zIndex: 50, boxShadow: "5px 5px 0px rgba(0,0,0,0.05)", cursor: 'grabbing' }}
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1, rotate: item.rotation || 0 }}
                              exit={{ opacity: 0, scale: 0.9, filter: 'blur(5px)' }}
                              transition={{ 
                                  layout: { duration: 0.4, ease: "easeInOut" },
                                  opacity: { duration: 0.3 }
                              }}
                              className={`
                                  relative group cursor-grab active:cursor-grabbing bg-white dark:bg-[#151921] border border-slate-200 dark:border-slate-700 shadow-sm
                                  ${item.widthClass || 'col-span-1'}
                                  ${item.type === 'image' ? 'row-span-2' : ''}
                              `}
                              style={{ zIndex: 1 }}
                              onClick={() => setFocusItem(item)}
                          >
                              {item.type === 'image' ? (
                                  <div className="relative h-full w-full p-2 flex flex-col">
                                      <div className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                          <img 
                                            src={item.content} 
                                            alt="sketch" 
                                            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" 
                                          />
                                      </div>
                                      <div className="h-6 flex items-center justify-between mt-2 px-1">
                                          <span className="font-mono text-[8px] text-slate-300 dark:text-slate-600 uppercase tracking-wider">IMG_{item.id.slice(-4)}</span>
                                          <div className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                      </div>
                                  </div>
                              ) : (
                                  <div className="h-full w-full p-6 flex flex-col justify-between relative overflow-hidden">
                                      {/* Content */}
                                      <p className="font-serif text-base md:text-lg text-slate-800 dark:text-slate-300 leading-relaxed select-none">
                                          {item.content}
                                      </p>
                                      
                                      {/* Metadata Footer */}
                                      <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/50">
                                          <span className="font-mono text-[8px] text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                                              NOTE_{item.id.slice(-4)}
                                          </span>
                                          <Link2 size={12} className="text-slate-200 dark:text-slate-700" />
                                      </div>
                                  </div>
                              )}
                              
                              {/* HOVER ACTIONS - Minimalist */}
                              <button 
                                  onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                  className="absolute -top-2 -right-2 p-1.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-20"
                              >
                                  <X size={12} />
                              </button>
                          </motion.div>
                      ))}
                  </AnimatePresence>
              </div>
          )}
      </div>

      {/* INPUT DOCK - Minimalist Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-30 pointer-events-none flex justify-center">
          <div className="bg-white/90 dark:bg-[#151921]/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] rounded-full p-2 flex items-center gap-2 pointer-events-auto transition-all duration-300 max-w-2xl w-full">
              
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
                      placeholder="Type a thought..."
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

      {/* FOCUS MODAL (LIGHTBOX) - Precise & Clean */}
      <AnimatePresence>
          {focusItem && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-white/95 dark:bg-[#020617]/95 backdrop-blur-sm flex items-center justify-center p-8 md:p-16 cursor-zoom-out"
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
                          <div className="relative border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-2">
                              <img src={focusItem.content} alt="Focus" className="max-h-[80vh] object-contain" />
                          </div>
                      ) : (
                          <div className="p-16 md:p-24 bg-white dark:bg-[#151921] border border-slate-200 dark:border-slate-700 text-3xl md:text-5xl font-serif text-center leading-relaxed max-w-4xl text-slate-900 dark:text-slate-100 min-w-[300px]">
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
    