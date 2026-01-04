
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Flashcard, Task } from '../types';
import { Gem, X, RotateCw, Trash2, Plus, Minus, Move, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface Props {
  flashcards: Flashcard[];
  tasks: Task[];
  deleteFlashcard: (id: string) => void;
}

// --- UTILS ---
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-4 last:mb-0 text-lg leading-relaxed" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-indigo-600 dark:text-indigo-400" {...props} />,
    em: ({node, ...props}: any) => <em className="italic font-serif" {...props} />,
};

// --- TYPES FOR VISUALIZATION ---
interface VisualNode extends Flashcard {
    x: number;
    y: number;
    connections: string[]; // IDs of connected nodes
}

const MentalGym: React.FC<Props> = ({ flashcards, tasks, deleteFlashcard }) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Canvas State
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Generate Constellation Layout (Memoized)
  const nodes: VisualNode[] = useMemo(() => {
      if (flashcards.length === 0) return [];
      
      const center = { x: 0, y: 0 };
      // Spiral Distribution
      const generated = flashcards.map((card, i) => {
          const angle = i * 2.4; // Golden angle approx
          const radius = 80 + (i * 60); // Expanding spiral
          return {
              ...card,
              x: center.x + Math.cos(angle) * radius,
              y: center.y + Math.sin(angle) * radius,
              connections: [] as string[]
          };
      });

      // Generate Connections (Nearest Neighbors + Sequential)
      generated.forEach((node, i) => {
          // Connect to previous (Sequential Path)
          if (i > 0) {
              node.connections.push(generated[i-1].id);
          }
          // Random cross-link to create "Constellation" feel
          if (i > 2 && i % 3 === 0) {
              node.connections.push(generated[i-3].id);
          }
      });

      return generated;
  }, [flashcards]);

  // Center canvas on mount
  useEffect(() => {
      if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          setTransform({ x: width / 2, y: height / 2, scale: 1 });
      }
  }, []);

  // --- CANVAS INTERACTION HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      // e.preventDefault() is not allowed in passive event listeners (React's are passive by default for wheel)
      // but we can just handle the state update
      const scaleSensitivity = 0.001;
      const newScale = Math.min(Math.max(0.2, transform.scale - e.deltaY * scaleSensitivity), 3);
      setTransform(p => ({ ...p, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      // Only drag if clicking background
      if ((e.target as HTMLElement).closest('.interactive-node')) return;
      
      setIsDragging(true);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setTransform(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  const handleNodeClick = (id: string) => {
      setSelectedCardId(id);
      setIsFlipped(false);
  };

  const activeCard = nodes.find(n => n.id === selectedCardId);

  // --- RENDER HELPERS ---
  const renderLines = () => {
      return nodes.map(node => (
          node.connections.map(targetId => {
              const target = nodes.find(n => n.id === targetId);
              if (!target) return null;
              return (
                  <line 
                    key={`${node.id}-${targetId}`}
                    x1={node.x} y1={node.y}
                    x2={target.x} y2={target.y}
                    className="stroke-slate-300 dark:stroke-slate-700"
                    strokeWidth="0.5"
                    strokeOpacity="0.4"
                    strokeDasharray={node.level === 0 ? "4 4" : "none"} // Dashed for unmastered paths
                  />
              );
          })
      ));
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a] select-none cursor-grab active:cursor-grabbing"
         ref={containerRef}
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         onMouseLeave={handleMouseUp}
         onWheel={handleWheel}
    >
        {/* BACKGROUND GRID */}
        <div 
            className="absolute inset-0 pointer-events-none" 
            style={{ 
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                backgroundSize: '40px 40px',
                opacity: 0.5
            }} 
        />

        {/* HUD UI */}
        <div className="absolute top-6 left-6 md:left-8 z-10 pointer-events-none">
            <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">
                Созвездия
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-mono uppercase tracking-widest">
                Карта Навыков
            </p>
        </div>

        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
            <button 
                onClick={() => setTransform(p => ({ ...p, scale: Math.min(3, p.scale + 0.2) }))}
                className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
            >
                <Plus size={20} />
            </button>
            <button 
                onClick={() => setTransform(p => ({ ...p, scale: Math.max(0.2, p.scale - 0.2) }))}
                className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
            >
                <Minus size={20} />
            </button>
            <button 
                onClick={() => {
                    if (containerRef.current) {
                        const { width, height } = containerRef.current.getBoundingClientRect();
                        setTransform({ x: width / 2, y: height / 2, scale: 1 });
                    }
                }}
                className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors mt-2"
            >
                <Move size={20} />
            </button>
        </div>

        {/* CANVAS CONTENT */}
        <div 
            className="w-full h-full origin-top-left will-change-transform"
            style={{ 
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` 
            }}
        >
            {/* SVG LAYER FOR LINES */}
            <svg className="absolute top-[-5000px] left-[-5000px] w-[10000px] h-[10000px] pointer-events-none overflow-visible">
                <g transform="translate(5000, 5000)">
                    {renderLines()}
                </g>
            </svg>

            {/* DOM NODES */}
            {nodes.map(node => {
                const isMastered = node.level > 0;
                // Calculate pseudo-glow size based on mastery (level)
                const glowSize = isMastered ? 10 + (node.level * 2) : 0;
                
                return (
                    <div 
                        key={node.id}
                        className="absolute interactive-node flex flex-col items-center justify-center cursor-pointer group"
                        style={{ 
                            left: node.x, 
                            top: node.y,
                            transform: 'translate(-50%, -50%)' // Center anchor
                        }}
                        onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
                    >
                        {/* GLOW EFFECT */}
                        {isMastered && (
                            <div 
                                className="absolute rounded-full bg-indigo-500 blur-xl opacity-30 animate-pulse-slow pointer-events-none"
                                style={{ width: `${glowSize * 4}px`, height: `${glowSize * 4}px` }}
                            />
                        )}

                        {/* NODE ICON */}
                        <div className={`
                            relative z-10 transition-all duration-300
                            ${isMastered 
                                ? 'text-indigo-500 scale-125 group-hover:scale-150 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                                : 'w-3 h-3 rounded-full border border-slate-400 dark:border-slate-500 bg-[#f8fafc] dark:bg-[#0f172a] hover:border-indigo-400 hover:scale-125'
                            }
                        `}>
                            {isMastered ? <Gem size={24} strokeWidth={1.5} fill="currentColor" className="fill-indigo-500/20" /> : null}
                        </div>

                        {/* LABEL */}
                        <div className={`
                            absolute top-full mt-3 px-2 py-1 rounded bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-100 dark:border-slate-800
                            text-[8px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400
                            whitespace-nowrap transition-all duration-300 pointer-events-none
                            ${isMastered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'}
                        `}>
                            {node.front.length > 20 ? node.front.substring(0, 20) + '...' : node.front}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* OVERLAY MODAL (GLASS) */}
        <AnimatePresence>
            {activeCard && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setSelectedCardId(null)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-md aspect-[3/4] perspective-1000"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.div 
                            className="w-full h-full relative transform-style-3d transition-transform duration-700"
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                        >
                            {/* FRONT SIDE */}
                            <div className="absolute inset-0 backface-hidden bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-[40px] border border-white/40 dark:border-white/10 rounded-3xl shadow-2xl p-8 flex flex-col overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                                    <Gem size={120} />
                                </div>
                                
                                <div className="flex justify-between items-start mb-12">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">Skill Node</span>
                                        <span className="text-xs font-bold text-indigo-500 font-mono">LVL.{activeCard.level}</span>
                                    </div>
                                    <button onClick={() => setSelectedCardId(null)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
                                        <X size={20} strokeWidth={1.5} />
                                    </button>
                                </div>

                                <div className="flex-1 flex flex-col justify-center items-center text-center relative z-10">
                                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight font-sans">
                                        {activeCard.front}
                                    </h2>
                                </div>

                                <div className="mt-auto pt-8 flex justify-center">
                                    <button 
                                        onClick={() => setIsFlipped(true)}
                                        className="group flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                                    >
                                        Открыть Истину <RotateCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                                    </button>
                                </div>
                            </div>

                            {/* BACK SIDE */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900/95 dark:bg-black/90 backdrop-blur-[40px] border border-white/10 rounded-3xl shadow-2xl p-8 flex flex-col text-slate-200 overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                                
                                <div className="flex justify-end mb-8">
                                    <button onClick={() => { if(confirm("Удалить навык?")) { deleteFlashcard(activeCard.id); setSelectedCardId(null); } }} className="text-slate-600 hover:text-red-500 transition-colors p-2">
                                        <Trash2 size={18} strokeWidth={1.5} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar-ghost pr-2">
                                    <div className="font-serif text-lg md:text-xl leading-relaxed text-slate-300">
                                        <ReactMarkdown components={markdownComponents}>
                                            {activeCard.back}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
                                    <button 
                                        onClick={() => setIsFlipped(false)}
                                        className="text-xs font-mono text-slate-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                                    >
                                        <RotateCw size={12} /> Назад к вопросу
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default MentalGym;
