
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Flashcard, Task } from '../types';
import { Gem, X, RotateCw, Trash2, Plus, Minus, Move, Search, Disc, Diamond } from 'lucide-react';
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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
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
      // Spiral Distribution with noise for organic feel
      const generated = flashcards.map((card, i) => {
          const angle = i * 2.4; // Golden angle approx
          const radius = 80 + (i * 60); // Expanding spiral
          // Add slight jitter
          const jitterX = (Math.random() - 0.5) * 40;
          const jitterY = (Math.random() - 0.5) * 40;
          
          return {
              ...card,
              x: center.x + Math.cos(angle) * radius + jitterX,
              y: center.y + Math.sin(angle) * radius + jitterY,
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
  const centerView = () => {
      if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          setTransform({ x: width / 2, y: height / 2, scale: 1 });
      }
  };

  useEffect(() => {
      centerView();
  }, []);

  // --- CANVAS INTERACTION HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      const scaleSensitivity = 0.001;
      const newScale = Math.min(Math.max(0.2, transform.scale - e.deltaY * scaleSensitivity), 3);
      setTransform(p => ({ ...p, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
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

  const handleMouseUp = () => setIsDragging(false);

  const handleNodeClick = (id: string) => {
      setSelectedCardId(id);
      setIsFlipped(false);
  };

  const activeCard = nodes.find(n => n.id === selectedCardId);
  const hoveredCard = nodes.find(n => n.id === hoveredNodeId);

  // --- SPARK ANIMATION LOGIC ---
  // We need a path string for the spark to travel
  const sparkPath = useMemo(() => {
      if (nodes.length < 2) return null;
      // Pick a random connection to animate
      const startNode = nodes[Math.floor(Math.random() * (nodes.length - 1))];
      if (startNode.connections.length === 0) return null;
      const endId = startNode.connections[0];
      const endNode = nodes.find(n => n.id === endId);
      
      if (startNode && endNode) {
          return `M ${startNode.x} ${startNode.y} L ${endNode.x} ${endNode.y}`;
      }
      return null;
  }, [nodes]); // Recalculates when nodes change, essentially static per session unless we add interval

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
                opacity: 0.3
            }} 
        />

        {/* HUD UI */}
        <div className="absolute top-6 left-6 md:left-8 z-10 pointer-events-none">
            <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">
                Созвездия
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-[10px] font-mono uppercase tracking-widest">
                Карта Навыков: {nodes.length} узлов
            </p>
        </div>

        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
            <button 
                onClick={() => setTransform(p => ({ ...p, scale: Math.min(3, p.scale + 0.2) }))}
                className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
            >
                <Plus size={20} strokeWidth={1.5} />
            </button>
            <button 
                onClick={() => setTransform(p => ({ ...p, scale: Math.max(0.2, p.scale - 0.2) }))}
                className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
            >
                <Minus size={20} strokeWidth={1.5} />
            </button>
            <button 
                onClick={centerView}
                className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors mt-2"
                title="Reset View"
            >
                <Disc size={20} strokeWidth={1.5} />
            </button>
        </div>

        {/* CANVAS CONTENT */}
        <div 
            className="w-full h-full origin-top-left will-change-transform"
            style={{ 
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` 
            }}
        >
            {/* SVG LAYER */}
            <svg className="absolute top-[-5000px] left-[-5000px] w-[10000px] h-[10000px] pointer-events-none overflow-visible">
                <g transform="translate(5000, 5000)">
                    {/* Connections */}
                    {nodes.map(node => (
                        node.connections.map(targetId => {
                            const target = nodes.find(n => n.id === targetId);
                            if (!target) return null;
                            const isMastered = node.level > 0 && (target.level > 0);
                            return (
                                <line 
                                    key={`${node.id}-${targetId}`}
                                    x1={node.x} y1={node.y}
                                    x2={target.x} y2={target.y}
                                    className={isMastered ? "stroke-indigo-400 dark:stroke-indigo-500" : "stroke-slate-300 dark:stroke-slate-700"}
                                    strokeWidth="0.5"
                                    strokeOpacity={isMastered ? "0.3" : "0.15"}
                                    strokeDasharray={isMastered ? "none" : "4 4"} 
                                />
                            );
                        })
                    ))}

                    {/* Active Spark (Background Processing) */}
                    {sparkPath && (
                        <circle r="1" fill="#6366f1" className="filter drop-shadow-[0_0_2px_#818cf8]">
                            <animateMotion 
                                dur="4s" 
                                repeatCount="indefinite"
                                path={sparkPath}
                            />
                            <animate attributeName="opacity" values="0;1;0" dur="4s" repeatCount="indefinite" />
                        </circle>
                    )}
                </g>
            </svg>

            {/* DOM NODES */}
            {nodes.map(node => {
                const lvl = node.level || 0;
                
                // --- NODE EVOLUTION LOGIC ---
                // Level 0 (Seed): Small Diamond
                // Level 1 (Growth): Medium Diamond + Glow
                // Level 2 (Mastery): Large Diamond + Glow + Orbit
                
                const sizeClass = lvl === 0 ? "w-2 h-2" : (lvl === 1 ? "w-3 h-3" : "w-4 h-4");
                const colorClass = lvl === 0 ? "bg-slate-300 dark:bg-slate-600" : (lvl === 1 ? "bg-indigo-400" : "bg-indigo-500");
                const glowClass = lvl > 0 ? "shadow-[0_0_15px_rgba(99,102,241,0.4)]" : "";
                
                return (
                    <div 
                        key={node.id}
                        className="absolute interactive-node flex items-center justify-center cursor-pointer group"
                        style={{ 
                            left: node.x, 
                            top: node.y,
                            transform: 'translate(-50%, -50%)' 
                        }}
                        onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                    >
                        {/* ORBIT RING (Level 2+) */}
                        {lvl >= 2 && (
                            <div className="absolute inset-0 -m-1.5 rounded-full border-[0.5px] border-indigo-500/30 animate-spin-slow w-[180%] h-[180%] pointer-events-none" />
                        )}

                        {/* CORE NODE (Diamond Shape) */}
                        <div className={`
                            transform rotate-45 transition-all duration-300
                            ${sizeClass} ${colorClass} ${glowClass}
                            group-hover:scale-150 group-hover:bg-indigo-400 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.6)]
                        `} />

                        {/* HOVER GLASS TOOLTIP (Preview) */}
                        <AnimatePresence>
                            {hoveredNodeId === node.id && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 z-50 pointer-events-none"
                                >
                                    <div className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border border-white/40 dark:border-white/10 shadow-xl rounded-xl p-3 text-left">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono text-[8px] uppercase tracking-widest text-indigo-500">LVL.{lvl}</span>
                                            {lvl > 0 && <Gem size={8} className="text-indigo-400" />}
                                        </div>
                                        <h4 className="font-sans font-bold text-xs text-slate-800 dark:text-white leading-tight mb-2 line-clamp-2">
                                            {node.front}
                                        </h4>
                                        <div className="h-px w-full bg-gradient-to-r from-indigo-500/20 to-transparent mb-2" />
                                        <p className="font-serif text-[9px] text-slate-500 dark:text-slate-400 line-clamp-2 italic leading-relaxed">
                                            {node.back}
                                        </p>
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/80 dark:bg-slate-900/80 border-r border-b border-white/20 dark:border-white/5 transform rotate-45 backdrop-blur-md" />
                                </motion.div>
                            )}
                        </AnimatePresence>
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
                                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                                    <Diamond size={120} strokeWidth={0.5} />
                                </div>
                                
                                <div className="flex justify-between items-start mb-12">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">Neural Node</span>
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
                                        className="group flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg"
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
