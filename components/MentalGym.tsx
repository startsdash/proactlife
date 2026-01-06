

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Flashcard, Task } from '../types';
import { Gem, X, RotateCw, Trash2, Plus, Minus, Move, Search, Disc, Diamond, BrainCircuit, Activity, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { SPHERES } from '../constants';

interface Props {
  flashcards: Flashcard[];
  tasks: Task[];
  deleteFlashcard: (id: string) => void;
  toggleFlashcardStar: (id: string) => void;
}

// --- UTILS ---
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-4 last:mb-0 text-base leading-relaxed" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-white/90" {...props} />,
    em: ({node, ...props}: any) => <em className="italic font-serif text-white/80" {...props} />,
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
    phase: number; // For breathing animation offset
}

// --- COLORS ---
const MINT = '#10b981';   // Emerald
const CORAL = '#f43f5e';  // Rose
const LAVENDER = '#818cf8'; // Indigo/Violet
const GRAPHITE = '#94a3b8'; // Slate

// --- CONSTANTS ---
const SPHERE_CENTERS: Record<string, { x: number, y: number }> = {
    productivity: { x: 0.25, y: 0.25 }, // Top Left
    growth: { x: 0.75, y: 0.25 },       // Top Right
    relationships: { x: 0.5, y: 0.75 }, // Bottom Center
    default: { x: 0.5, y: 0.5 }         // Center
};

const MentalGym: React.FC<Props> = ({ flashcards, tasks, deleteFlashcard, toggleFlashcardStar }) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // Ref for the physics loop to access latest hover state without re-binding
  const hoveredNodeRef = useRef<string | null>(null);
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
          // Identify primary sphere logic
          // Random assignment for visual distribution if not linked (mock for now)
          // In a real app, derive sphereId from card tags or linked tasks if available
          // Here we use a stable hash-like assignment based on ID char for consistency
          const sphereIndex = card.id.charCodeAt(card.id.length - 1) % SPHERES.length;
          const sphereId = SPHERES[sphereIndex]?.id || 'default';
          
          let color = GRAPHITE;
          if (sphereId === 'productivity') color = LAVENDER;
          else if (sphereId === 'growth') color = MINT;
          else if (sphereId === 'relationships') color = CORAL;

          // Preserve existing position if updating data, else random
          const existing = simulationRef.current.nodes.find(n => n.id === card.id);

          return {
              ...card,
              x: existing ? existing.x : Math.random() * 800 + 100,
              y: existing ? existing.y : Math.random() * 600 + 100,
              vx: existing ? existing.vx : 0,
              vy: existing ? existing.vy : 0,
              connections: [],
              color,
              sphereId,
              phase: Math.random() * Math.PI * 2 // Random pulse start
          };
      });

      // Create connections based on shared Sphere
      nodes.forEach((node, i) => {
          nodes.forEach((target, j) => {
              if (i !== j && node.sphereId === target.sphereId) {
                  // Connect if close in array index (simulating chronological or topical proximity)
                  if (Math.abs(i - j) < 2) {
                      node.connections.push(target.id);
                  }
              }
          });
      });

      simulationRef.current.nodes = nodes;
      simulationRef.current.running = true;
  }, [flashcards]);

  // Physics Loop (Liquid Motion)
  useEffect(() => {
      if (!simulationRef.current.running) return;

      const tick = () => {
          const { nodes } = simulationRef.current;
          const { width, height } = containerSize;
          
          nodes.forEach(node => {
              // ANCHOR PROTOCOL: Freeze if hovered
              if (node.id === hoveredNodeRef.current) {
                  node.vx = 0;
                  node.vy = 0;
                  return;
              }

              // 1. Gravity towards Sphere Center (Gentle Current)
              const center = SPHERE_CENTERS[node.sphereId || 'default'] || SPHERE_CENTERS.default;
              const targetX = center.x * width;
              const targetY = center.y * height;
              
              node.vx += (targetX - node.x) * 0.0005; // Very low gravity
              node.vy += (targetY - node.y) * 0.0005;

              // 2. Repulsion (Soft Buffer)
              nodes.forEach(other => {
                  if (node.id !== other.id) {
                      const dx = node.x - other.x;
                      const dy = node.y - other.y;
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      const minDist = 120; // Increased spacing
                      
                      if (dist < minDist && dist > 0) {
                          const force = (minDist - dist) * 0.02; // Soft push
                          node.vx += (dx / dist) * force;
                          node.vy += (dy / dist) * force;
                      }
                  }
              });

              // 3. Ether Damping (High Viscosity)
              node.vx *= 0.92; // High friction prevents jitter
              node.vy *= 0.92;
              
              // 4. Update Position
              node.x += node.vx;
              node.y += node.vy;

              // 5. Bounds (Soft Containment)
              const margin = 80;
              if (node.x < margin) node.vx += 0.05;
              if (node.x > width - margin) node.vx -= 0.05;
              if (node.y < margin) node.vy += 0.05;
              if (node.y > height - margin) node.vy -= 0.05;
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

  const handleMouseEnter = (id: string) => {
      setHoveredNodeId(id);
      hoveredNodeRef.current = id;
  };

  const handleMouseLeave = () => {
      setHoveredNodeId(null);
      hoveredNodeRef.current = null;
  };

  const activeCard = flashcards.find(c => c.id === selectedCardId);
  
  // Find color for active card
  const activeCardColor = useMemo(() => {
      if (!activeCard) return LAVENDER;
      const node = simulationRef.current.nodes.find(n => n.id === activeCard.id);
      return node ? node.color : LAVENDER;
  }, [activeCard, simulationTick]);

  // Calculate Links for SVG
  const links = useMemo(() => {
      const lines: React.ReactNode[] = [];
      const nodes = simulationRef.current.nodes;
      const nodeMap = new Map<string, VisualNode>(nodes.map(n => [n.id, n]));

      // Use a set to avoid duplicate lines (A-B and B-A)
      const drawnConnections = new Set<string>();

      nodes.forEach(node => {
          node.connections.forEach(targetId => {
              const linkKey = [node.id, targetId].sort().join('-');
              if (drawnConnections.has(linkKey)) return;
              drawnConnections.add(linkKey);

              const target = nodeMap.get(targetId);
              if (target) {
                  // Check if either is active (hovered or starred)
                  const isNodeActive = hoveredNodeId === node.id || node.isStarred;
                  const isTargetActive = hoveredNodeId === target.id || target.isStarred;
                  const isActive = isNodeActive || isTargetActive;

                  lines.push(
                      <g key={linkKey}>
                          {/* Base Line */}
                          <line 
                              x1={node.x} y1={node.y}
                              x2={target.x} y2={target.y}
                              className="transition-all duration-500"
                              stroke={isActive ? (node.isStarred || target.isStarred ? '#fbbf24' : '#ffffff') : '#94a3b8'}
                              strokeWidth={isActive ? 0.5 : 0.5}
                              strokeOpacity={isActive ? 0.4 : 0.05}
                              strokeDasharray={isActive ? "2 2" : "none"}
                          />
                          {/* Flow Particle (Only if active) */}
                          {isActive && (
                              <circle r="1" fill={node.isStarred || target.isStarred ? '#fbbf24' : '#ffffff'}>
                                  <animateMotion 
                                      dur="4s" 
                                      repeatCount="indefinite"
                                      path={`M${node.x},${node.y} L${target.x},${target.y}`}
                                  />
                              </circle>
                          )}
                      </g>
                  );
              }
          });
      });
      return lines;
  }, [simulationTick, hoveredNodeId]);

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#020617] select-none" ref={containerRef}>
        
        {/* HUD UI */}
        <div className="absolute top-6 left-6 md:left-8 z-10 pointer-events-none">
            <h1 className="text-3xl font-light text-slate-200 tracking-tight font-sans flex items-center gap-3">
                <BrainCircuit size={28} className="text-indigo-400" strokeWidth={1} />
                <span className="opacity-80">ETHER_WEB</span>
            </h1>
            <p className="text-slate-500 mt-1 text-[10px] font-mono uppercase tracking-widest pl-1">
                NODES_DETECTED: {flashcards.length} // SYSTEM_STABLE
            </p>
        </div>

        {/* SPHERE LABELS (Background Guides) */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 text-[80px] font-bold text-slate-800/20 select-none pointer-events-none blur-sm">WORK</div>
        <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 text-[80px] font-bold text-slate-800/20 select-none pointer-events-none blur-sm">GROWTH</div>
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 text-[80px] font-bold text-slate-800/20 select-none pointer-events-none blur-sm">PEOPLE</div>

        {/* CANVAS LAYER (Receding Effect) */}
        <motion.div 
            className="absolute inset-0 w-full h-full"
            animate={{ 
                scale: activeCard ? 0.95 : 1,
                opacity: activeCard ? 0.3 : 1,
                filter: activeCard ? 'blur(4px)' : 'none'
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
        >
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
                    onMouseEnter={() => handleMouseEnter(node.id)}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Visual Orb */}
                    <div className="relative transition-transform duration-300 group-hover:scale-115">
                        {/* Breathing Glow */}
                        <motion.div 
                            className="absolute inset-0 rounded-full blur-md"
                            style={{ backgroundColor: node.color }}
                            animate={{ 
                                opacity: [0.2, 0.5, 0.2],
                                scale: [1, 1.5, 1] 
                            }}
                            transition={{ 
                                duration: 3 + Math.random(), 
                                repeat: Infinity, 
                                ease: "easeInOut",
                                delay: node.phase // Async pulsing
                            }}
                        />
                        
                        {/* Core Node */}
                        <div 
                            className={`
                                relative w-3 h-3 rounded-full border border-white/20 
                                bg-white/10 backdrop-blur-sm shadow-inner
                                transition-all duration-300 group-hover:bg-white/30 group-hover:border-white/50 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]
                            `}
                            style={{ boxShadow: node.isStarred ? '0 0 10px #fbbf24' : undefined, borderColor: node.isStarred ? '#fbbf24' : undefined }}
                        />

                        {/* Star Flash Effect */}
                        {node.isStarred && (
                            <motion.div 
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                animate={{ rotate: 360, scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                            >
                                <Star size={8} className="text-amber-300 fill-amber-300 blur-[1px]" />
                            </motion.div>
                        )}
                    </div>

                    {/* Hover Label */}
                    <AnimatePresence>
                        {hoveredNodeId === node.id && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute bottom-full mb-4 px-3 py-2 bg-black/80 text-white text-xs rounded border border-white/10 whitespace-nowrap backdrop-blur-md pointer-events-none z-30"
                            >
                                <span className="font-mono text-[9px] text-indigo-300 mr-2 opacity-70">ID_{node.id.slice(-4)}</span>
                                <span className="font-serif tracking-wide">{node.front.substring(0, 30)}...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </motion.div>

        {/* NEURAL NODE INTERFACE (MODAL) - GLASS ETHER STYLE */}
        <AnimatePresence>
            {activeCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={() => setSelectedCardId(null)}>
                    
                    {/* The Card Container */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative w-full max-w-md aspect-[3/4] perspective-1000"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.div 
                            className="w-full h-full relative transform-style-3d transition-transform duration-700"
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                        >
                            {/* FRONT SIDE (A) - Ultra Glass */}
                            <div className="absolute inset-0 backface-hidden bg-white/5 backdrop-blur-[40px] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 flex flex-col overflow-hidden">
                                {/* Gradient Tint */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
                                
                                {/* Header */}
                                <div className="flex justify-between items-start mb-12 relative z-10">
                                    <div className="font-mono text-[9px] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Activity size={12} className="text-indigo-400 animate-pulse" />
                                        NEURAL_NODE // {activeCard.id.slice(-4)}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleFlashcardStar(activeCard.id); }}
                                            className={`p-2 rounded-full transition-all group ${activeCard.isStarred ? 'text-amber-400' : 'text-slate-600 hover:text-amber-200'}`}
                                        >
                                            <Star size={16} fill={activeCard.isStarred ? "currentColor" : "none"} strokeWidth={1} className={activeCard.isStarred ? "animate-pulse" : ""} />
                                        </button>
                                        <button onClick={() => setSelectedCardId(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                            <X size={20} strokeWidth={1} />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex flex-col justify-center text-center relative z-10">
                                    {/* Subtle Center Glow */}
                                    <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
                                    
                                    <h2 className="text-2xl md:text-3xl font-serif text-slate-100 leading-tight drop-shadow-lg relative z-10 selection:bg-indigo-500/30">
                                        {activeCard.front}
                                    </h2>
                                </div>

                                {/* Footer Trigger */}
                                <div className="mt-auto pt-8 flex justify-center relative z-10">
                                    <button 
                                        onClick={() => setIsFlipped(true)}
                                        className="group px-6 py-3 rounded-full border border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5 text-[9px] font-mono uppercase tracking-[0.15em] text-slate-300 hover:text-white transition-all flex items-center gap-3 backdrop-blur-md"
                                    >
                                        [ ACCESS_DATA ] <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* BACK SIDE (B) - Mirror Glass */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white/5 backdrop-blur-[40px] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 flex flex-col overflow-hidden">
                                {/* Gradient Tint same as A */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
                                
                                {/* Decor */}
                                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                                    <Diamond size={120} strokeWidth={0.5} />
                                </div>

                                {/* Header Actions */}
                                <div className="flex justify-end mb-6 relative z-10">
                                    <button onClick={() => { if(confirm("Дефрагментировать (удалить) узел?")) { deleteFlashcard(activeCard.id); setSelectedCardId(null); } }} className="text-slate-600 hover:text-red-500 transition-colors p-2">
                                        <Trash2 size={16} strokeWidth={1} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar-ghost pr-2 relative z-10">
                                    <div className="font-serif text-lg md:text-xl leading-relaxed text-slate-100 drop-shadow-md">
                                        <ReactMarkdown components={markdownComponents}>
                                            {activeCard.back}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                {/* Mastery Footer - Sync Bar */}
                                <div className="mt-8 pt-6 relative z-10">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">Sync Level</span>
                                        <span className="font-mono text-[9px]" style={{ color: activeCardColor }}>{activeCard.level * 20}%</span>
                                    </div>
                                    {/* Fine Line Bar */}
                                    <div className="w-full h-px bg-white/10 rounded-full overflow-hidden relative">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, activeCard.level * 20)}%` }}
                                            className="h-full absolute top-0 left-0"
                                            style={{ backgroundColor: activeCardColor, boxShadow: `0 0 10px ${activeCardColor}` }}
                                        />
                                    </div>
                                    
                                    <div className="mt-6 flex justify-center">
                                        <button 
                                            onClick={() => setIsFlipped(false)}
                                            className="px-6 py-3 rounded-full border border-white/20 hover:border-white/40 bg-transparent hover:bg-white/5 text-[9px] font-mono uppercase tracking-[0.15em] text-slate-300 hover:text-white transition-all flex items-center gap-3"
                                        >
                                            <RotateCw size={12} /> [ FLIP_BACK ]
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