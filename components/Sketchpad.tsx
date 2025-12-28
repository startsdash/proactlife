
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SketchItem, AppConfig } from '../types'; // Added AppConfig
import { Shuffle, Image as ImageIcon, Type, Trash2, X, Plus, Maximize2, Sparkles, AlertCircle, Wand2 } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { generateSketchpadIdea } from '../services/geminiService'; // Import Service

interface Props {
  items: SketchItem[];
  addItem: (item: SketchItem) => void;
  deleteItem: (id: string) => void;
  updateItem: (item: SketchItem) => void;
  config: AppConfig; // Added Prop
}

const COLORS = [
    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100',
    'bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-100',
    'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100',
    'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100',
    'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100',
];

const Sketchpad: React.FC<Props> = ({ items, addItem, deleteItem, updateItem, config }) => {
  const [textInput, setTextInput] = useState('');
  const [isShuffling, setIsShuffling] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Loading state
  const [focusItem, setFocusItem] = useState<SketchItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- PASTE LISTENER ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        // Prevent default if focusing on text input to allow normal pasting there
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
          rotation: Math.random() * 6 - 3, // Random tilt -3 to 3 deg
          widthClass: Math.random() > 0.7 ? 'md:col-span-2' : 'md:col-span-1'
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
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rotation: Math.random() * 4 - 2,
          widthClass: 'md:col-span-1'
      };
      addItem(newItem);
      setTextInput('');
  };

  // --- SHUFFLE LOGIC ---
  const handleShuffle = () => {
      setIsShuffling(true);
      items.forEach(item => {
          updateItem({
              ...item,
              rotation: Math.random() * 10 - 5, // More chaotic tilt
              widthClass: Math.random() > 0.8 ? 'md:col-span-2' : 'md:col-span-1'
          });
      });
      setTimeout(() => setIsShuffling(false), 600);
  };

  // --- AI GENERATION LOGIC ---
  const handleGenerateIdea = async () => {
      if (items.length === 0) {
          alert("Добавь что-нибудь на холст для вдохновения!");
          return;
      }
      setIsGenerating(true);
      
      const idea = await generateSketchpadIdea(items, config);
      
      const newItem: SketchItem = {
          id: Date.now().toString(),
          type: 'text',
          content: idea,
          createdAt: Date.now(),
          color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-900 dark:text-cyan-100 border border-cyan-200 dark:border-cyan-700', // Distinct AI Color
          rotation: 0,
          widthClass: 'md:col-span-2' // Make it prominent
      };
      
      addItem(newItem);
      setIsGenerating(false);
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden" ref={containerRef}>
      
      {/* HEADER */}
      <header className="p-4 md:p-6 shrink-0 flex justify-between items-center z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div>
              <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2">
                  Sketchpad <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider dark:bg-indigo-900 dark:text-indigo-300">Beta</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">Вставляй картинки (Ctrl+V), пиши мысли, смешивай контексты.</p>
          </div>
          <div className="flex items-center gap-2">
              <Tooltip content="Синтез идей (AI)">
                  <button 
                    onClick={handleGenerateIdea} 
                    disabled={isGenerating}
                    className={`p-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                      {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wand2 size={20} />}
                  </button>
              </Tooltip>
              <Tooltip content="Перемешать (Инсайт)">
                  <button 
                    onClick={handleShuffle} 
                    className={`p-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all active:scale-95 ${isShuffling ? 'animate-spin' : ''}`}
                  >
                      <Shuffle size={20} />
                  </button>
              </Tooltip>
          </div>
      </header>

      {/* CANVAS AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-8 relative">
          
          {/* BACKGROUND MESH */}
          <div className="fixed inset-0 pointer-events-none opacity-30 dark:opacity-10 z-0">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-300 rounded-full blur-[120px]" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-300 rounded-full blur-[120px]" />
              <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-pink-300 rounded-full blur-[100px]" />
          </div>

          {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 z-10 relative">
                  <Sparkles size={48} className="mb-4 text-indigo-300 opacity-50" />
                  <p className="text-lg font-light text-center max-w-sm leading-relaxed">
                      Пустота — начало творчества.<br/>
                      <span className="text-sm opacity-70">Нажми Ctrl+V чтобы вставить картинку из буфера или напиши что-нибудь.</span>
                  </p>
              </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 auto-rows-max relative z-10 pb-24">
                  <AnimatePresence>
                      {items.map((item) => (
                          <motion.div
                              layout
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.8, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0, rotate: item.rotation }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                              className={`
                                  relative group cursor-pointer
                                  ${item.type === 'text' ? item.widthClass || 'md:col-span-1' : item.widthClass || 'md:col-span-1'}
                                  ${item.type === 'image' ? 'row-span-2' : 'row-span-1'}
                              `}
                              onClick={() => setFocusItem(item)}
                          >
                              {item.type === 'image' ? (
                                  <div className="bg-white p-2 pb-8 shadow-xl hover:shadow-2xl transition-shadow transform hover:-translate-y-1 duration-300 rounded-sm">
                                      <img src={item.content} alt="sketch" className="w-full h-full object-cover aspect-[4/5] bg-slate-100" />
                                  </div>
                              ) : (
                                  <div className={`p-4 shadow-lg hover:shadow-xl transition-shadow transform hover:-translate-y-1 duration-300 aspect-square flex items-center justify-center text-center font-medium text-sm md:text-base leading-snug break-words overflow-hidden ${item.color || 'bg-yellow-100 text-yellow-900'} mask-tape`}>
                                      {item.content}
                                  </div>
                              )}
                              
                              {/* HOVER DELETE */}
                              <button 
                                  onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 z-20"
                              >
                                  <X size={12} />
                              </button>
                          </motion.div>
                      ))}
                  </AnimatePresence>
              </div>
          )}
      </div>

      {/* INPUT BAR */}
      <div className="shrink-0 p-4 md:p-6 z-20 relative">
          <div className="max-w-3xl mx-auto bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 flex items-center gap-2">
              <label className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer text-slate-400 hover:text-indigo-500 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <ImageIcon size={20} />
              </label>
              <div className="flex-1 relative">
                  <input 
                      type="text" 
                      className="w-full bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 text-sm md:text-base"
                      placeholder="Быстрая мысль..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
                  />
              </div>
              <button 
                  onClick={handleAddText}
                  disabled={!textInput.trim()}
                  className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:bg-slate-300 dark:disabled:bg-slate-700"
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
                  className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-12"
                  onClick={() => setFocusItem(null)}
              >
                  <motion.div 
                      initial={{ scale: 0.8, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.8, y: 20 }}
                      className="relative max-w-4xl max-h-full"
                      onClick={(e) => e.stopPropagation()}
                  >
                      {focusItem.type === 'image' ? (
                          <img src={focusItem.content} alt="Focus" className="rounded-lg shadow-2xl max-h-[80vh] object-contain bg-white p-2" />
                      ) : (
                          <div className={`p-12 md:p-20 rounded-lg shadow-2xl text-2xl md:text-4xl font-bold text-center leading-relaxed max-w-2xl ${focusItem.color || 'bg-white'}`}>
                              {focusItem.content}
                          </div>
                      )}
                      
                      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-4">
                          <button onClick={() => { deleteItem(focusItem.id); setFocusItem(null); }} className="p-3 bg-white/10 hover:bg-red-500/20 text-white rounded-full border border-white/20 transition-colors">
                              <Trash2 size={24} />
                          </button>
                          <button onClick={() => setFocusItem(null)} className="p-3 bg-white text-slate-900 rounded-full shadow-lg hover:scale-105 transition-transform">
                              <X size={24} />
                          </button>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>

    </div>
  );
};

export default Sketchpad;
