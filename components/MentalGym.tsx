
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Flashcard, Task } from '../types';
import { Gem, X, RotateCw, Trash2, Plus, Minus, Move, Search, Disc, Diamond, BrainCircuit, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { SPHERES } from '../constants';

interface Props {
  flashcards: Flashcard[];
  tasks: Task[];
  deleteFlashcard: (id: string) => void;
}

// --- UTILS ---
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-4 last:mb-0 text-base leading-relaxed" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-indigo-600 dark:text-indigo-400" {...props} />,
    em: ({node, ...props}: any) => <em className="italic font-serif" {...props} />,
};

// --- TYPES FOR VISUALIZATION ---
interface VisualNode extends Flashcard {
    x: number;
    y: number;
    vx: number;
    vy: number;
    connections: string[]; 
    color: string;
    sphereId?: string;
}

// --- CONSTANTS ---
const SPHERE_CENTERS: Record<string, { x: number, y: number }> = {
    productivity: { x: 0.25, y: 0.25 }, // Top Left
    growth: { x: 0.75, y: 0.25 },       // Top Right
    relationships: { x: 0.5, y: 0.75 }, // Bottom Center
    default: { x: 0.5, y: 0.5 }         // Center
};

const MentalGym: React.FC<Props> = ({ flashcards, tasks, deleteFlashcard }) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Canvas State
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1000, height: 800 });
  const [simulationTick, setSimulationTick] = useState(0); // Trigger re-render
  
  // Simulation Data Ref (Mutable for performance)
  const simulationRef = useRef<{ nodes: VisualNode[], running: boolean }>({ nodes: [], running: false });

  // Initialize Simulation Data
  useEffect(() => {
      const nodes: VisualNode[] = flashcards.map(card => {
          // Identify primary sphere from tasks if not on card directly
          const randomSphere = SPHERES[Math.floor(Math.random() * SPHERES.length)];
          const sphereId = randomSphere.id; 
          const color = randomSphere.color === 'indigo' ? '#6366f1' : randomSphere.color === 'emerald' ? '#10b981' : '#f43f5e';

          return {
              ...card,
              x: Math.random() * 800 + 100,
              y: Math.random() * 600 + 100,
              vx: 0,
              vy: 0,
              connections: [],
              color,
              sphereId
          };
      });

      // Create connections based on shared Sphere
      nodes.forEach((node, i) => {
          nodes.forEach((target, j) => {
              if (i !== j && node.sphereId === target.sphereId) {
                  if (Math.abs(i - j) < 3) {
                      node.connections.push(target.id);
                  }
              }
          });
      });

      simulationRef.current.nodes = nodes;
      simulationRef.current.running = true;
  }, [flashcards]);

  // Physics Loop
  useEffect(() => {
      if (!simulationRef.current.running) return;

      const tick = () => {
          const { nodes } = simulationRef.current;
          const { width, height } = containerSize;
          
          nodes.forEach(node => {
              // 1. Gravity towards Sphere Center
              const center = SPHERE_CENTERS[node.sphereId || 'default'] || SPHERE_CENTERS.default;
              const targetX = center.x * width;
              const targetY = center.y * height;
              
              node.vx += (targetX - node.x) * 0.005;
              node.vy += (targetY - node.y) * 0.005;

              // 2. Repulsion
              nodes.forEach(other => {
                  if (node.id !== other.id) {
                      const dx = node.x - other.x;
                      const dy = node.y - other.y;
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      if (dist < 100 && dist > 0) {
                          const force = 50 / dist; // Repulsion strength
                          node.vx += (dx / dist) * force;
                          node.vy += (dy / dist) * force;
                      }
                  }
              });

              // 3. Damping & Update
              node.vx *= 0.9;
              node.vy *= 0.9;
              node.x += node.vx;
              node.y += node.vy;

              // 4. Bounds
              node.x = Math.max(50, Math.min(width - 50, node.x));
              node.y = Math.max(50, Math.min(height - 50, node.y));
          });

          setSimulationTick(prev => prev + 1);
          requestAnimationFrame(tick);
      };

      const animId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(animId);
  }, [containerSize]);

  // Handle Resize
  useEffect(() => {
      if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          setContainerSize({ width: clientWidth, height: clientHeight });
      }
  }, []);

  const handleNodeClick = (id: string) => {
      setSelectedCardId(id);
      setIsFlipped(false);
  };

  const activeCard = flashcards.find(c => c.id === selectedCardId);
  
  // Calculate Links for SVG
  const links = useMemo(() => {
      const lines: React.ReactNode[] = [];
      const nodes = simulationRef.current.nodes;
      const nodeMap = new Map<string, VisualNode>(nodes.map(n => [n.id, n]));

      nodes.forEach(node => {
          node.connections.forEach(targetId => {
              const target = nodeMap.get(targetId);
              if (target) {
                  lines.push(
                      <line 
                          key={`${node.id}-${target.id}`}
                          x1={node.x} y1={node.y}
                          x2={target.x} y2={target.y}
                          className="stroke-slate-300 dark:stroke-slate-700/50"
                          strokeWidth="0.5"
                          strokeDasharray="4 4" 
                      />
                  );
              }
          });
      });
      return lines;
  }, [simulationTick]);

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a] select-none" ref={containerRef}>
        
        {/* HUD UI */}
        <div className="absolute top-6 left-6 md:left-8 z-10 pointer-events-none">
            <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans flex items-center gap-3">
                <BrainCircuit size={28} className="text-indigo-500" strokeWidth={1} />
                NEURAL_WEB
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-[10px] font-mono uppercase tracking-widest pl-1">
                NODES_DETECTED: {flashcards.length}
            </p>
        </div>

        {/* SPHERE LABELS (Background Guides) */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 text-[80px] font-bold text-slate-100 dark:text-slate-800/30 select-none pointer-events-none">
            WORK
        </div>
        <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 text-[80px] font-bold text-slate-100 dark:text-slate-800/30 select-none pointer-events-none">
            GROWTH
        </div>
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 text-[80px] font-bold text-slate-100 dark:text-slate-800/30 select-none pointer-events-none">
            PEOPLE
        </div>

        {/* CANVAS LAYER */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {links}
        </svg>

        {/* NODES LAYER */}
        {simulationRef.current.nodes.map(node => (
            <div
                key={node.id}
                className="absolute flex items-center justify-center cursor-pointer group"
                style={{
                    left: node.x,
                    top: node.y,
                    transform: 'translate(-50%, -50%)',
                    zIndex: hoveredNodeId === node.id ? 20 : 10
                }}
                onClick={() => handleNodeClick(node.id)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
            >
                {/* Node Body */}
                <div className={`
                    w-4 h-4 rounded-full border-2 bg-white dark:bg-[#0f172a] shadow-[0_0_15px_rgba(0,0,0,0.1)]
                    transition-all duration-300 group-hover:scale-125
                `}
                style={{ borderColor: node.color, boxShadow: `0 0 10px ${node.color}40` }}
                >
                    <div className="absolute inset-0 m-1 rounded-full bg-current opacity-50" style={{ color: node.color }} />
                </div>

                {/* Pulsing Aura - Subtle & Slow */}
                {hoveredNodeId === node.id && (
                    <motion.div 
                        initial={{ opacity: 0.6, scale: 1 }}
                        animate={{ opacity: 0, scale: 2 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full border pointer-events-none"
                        style={{ borderColor: node.color }}
                    />
                )}

                {/* Tooltip (Preview) */}
                <AnimatePresence>
                    {hoveredNodeId === node.id && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute bottom-full mb-3 px-3 py-2 bg-slate-900/90 text-white text-xs rounded-lg whitespace-nowrap backdrop-blur-md border border-white/10 shadow-xl pointer-events-none"
                        >
                            <span className="font-mono text-[9px] text-indigo-300 mr-2">ID_{node.id.slice(-4)}</span>
                            <span className="font-sans font-medium">{node.front.substring(0, 30)}...</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        ))}

        {/* NEURAL NODE INTERFACE (MODAL) */}
        <AnimatePresence>
            {activeCard && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setSelectedCardId(null)}>
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
                            {/* FRONT SIDE (A) - The Stimulus */}
                            <div className="absolute inset-0 backface-hidden bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-[40px] border border-white/40 dark:border-white/10 rounded-2xl shadow-2xl p-8 flex flex-col overflow-hidden">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-12">
                                    <div className="font-mono text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Activity size={12} className="text-indigo-500 animate-pulse" />
                                        NEURAL_NODE // {activeCard.id.slice(-4)}
                                    </div>
                                    <button onClick={() => setSelectedCardId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                        <X size={20} strokeWidth={1} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col justify-center text-center relative z-10">
                                    {/* Pulse Visual behind text - Slow Breath */}
                                    <motion.div 
                                        className="absolute inset-0 bg-indigo-500/5 rounded-full blur-3xl scale-75" 
                                        animate={{ opacity: [0.5, 1, 0.5], scale: [0.7, 0.8, 0.7] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                    
                                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight font-sans relative z-10">
                                        {activeCard.front}
                                    </h2>
                                </div>

                                {/* Footer Trigger */}
                                <div className="mt-auto pt-8 flex justify-center">
                                    <button 
                                        onClick={() => setIsFlipped(true)}
                                        className="group px-6 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:border-indigo-500 transition-all flex items-center gap-3"
                                    >
                                        [ ACCESS_INSIGHT ] <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* BACK SIDE (B) - The Insight */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900/95 dark:bg-black/95 backdrop-blur-[40px] border border-white/10 rounded-2xl shadow-2xl p-8 flex flex-col text-slate-200 overflow-hidden">
                                {/* Decor */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                                    <Diamond size={100} strokeWidth={0.5} />
                                </div>

                                {/* Header Actions */}
                                <div className="flex justify-end mb-6">
                                    <button onClick={() => { if(confirm("Дефрагментировать (удалить) узел?")) { deleteFlashcard(activeCard.id); setSelectedCardId(null); } }} className="text-slate-600 hover:text-red-500 transition-colors p-2">
                                        <Trash2 size={16} strokeWidth={1.5} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar-ghost pr-2">
                                    <div className="font-serif text-lg md:text-xl leading-relaxed text-slate-300">
                                        <ReactMarkdown components={markdownComponents}>
                                            {activeCard.back}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                {/* Mastery Footer */}
                                <div className="mt-8 pt-6 border-t border-white/10">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Mastery Level</span>
                                        <span className="font-mono text-[9px] text-indigo-400">{activeCard.level * 20}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, activeCard.level * 20)}%` }}
                                            className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]"
                                        />
                                    </div>
                                    
                                    <div className="mt-6 flex justify-center">
                                        <button 
                                            onClick={() => setIsFlipped(false)}
                                            className="text-xs font-mono text-slate-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                                        >
                                            <RotateCw size={12} /> REBOOT_NODE
                                        </button>
                                    </div>
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

// Helper Arrow Icon
function ArrowRight(props: any) {
    return (
        <svg
          {...props}
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
    )
}

export default MentalGym;
