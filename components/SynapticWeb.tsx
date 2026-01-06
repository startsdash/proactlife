
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Note, SynapticLink } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, RefreshCw, Maximize2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
    notes: Note[];
    links: SynapticLink[];
    onAddLink: (link: SynapticLink) => void;
    onRemoveLink: (linkId: string) => void;
    onClose: () => void;
}

interface PhysicsNode {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    note: Note;
}

interface Spark {
    id: number;
    pathId: string; // "sourceId-targetId"
    startTime: number;
}

const NOTE_PEEK_VARIANTS = {
    hidden: { opacity: 0, scale: 0.95, y: 10, filter: 'blur(10px)' },
    visible: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 0.95, y: 10, filter: 'blur(10px)' }
};

const SynapticWeb: React.FC<Props> = ({ notes, links, onAddLink, onRemoveLink, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [nodes, setNodes] = useState<PhysicsNode[]>([]);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    
    // Interaction State
    const [primaryFocusId, setPrimaryFocusId] = useState<string | null>(null); // First Click
    const [secondaryFocusId, setSecondaryFocusId] = useState<string | null>(null); // Second Click (Neighbor)
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    
    // Graph State
    const [transientLinks, setTransientLinks] = useState<[string, string][]>([]); // Random pairs
    const [sparks, setSparks] = useState<Spark[]>([]);
    
    const requestRef = useRef<number | null>(null);
    const sparkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // --- 1. INITIALIZATION & GRAPH GENERATION ---
    useEffect(() => {
        if (!containerRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });

        const newNodes = notes.map(note => ({
            id: note.id,
            x: Math.random() * (clientWidth - 100) + 50,
            y: Math.random() * (clientHeight - 100) + 50,
            vx: (Math.random() - 0.5) * 0.15, // Drift velocity
            vy: (Math.random() - 0.5) * 0.15,
            note
        }));
        setNodes(newNodes);
        generateTransientWeb(newNodes);
    }, [notes.length]);

    const generateTransientWeb = (currentNodes: PhysicsNode[]) => {
        if (currentNodes.length < 2) return;
        const count = Math.min(notes.length * 1.5, 15); // Density control
        const pairs: [string, string][] = [];
        const ids = currentNodes.map(n => n.id);
        
        const existingSignatures = new Set<string>();

        for (let i = 0; i < count; i++) {
            const idx1 = Math.floor(Math.random() * ids.length);
            let idx2 = Math.floor(Math.random() * ids.length);
            while (idx1 === idx2) idx2 = Math.floor(Math.random() * ids.length);
            
            const id1 = ids[idx1];
            const id2 = ids[idx2];
            const signature = [id1, id2].sort().join('-');
            
            if (!existingSignatures.has(signature)) {
                pairs.push([id1, id2]);
                existingSignatures.add(signature);
            }
        }
        setTransientLinks(pairs);
    };

    // --- 2. PHYSICS ENGINE (THE ETHER) ---
    const animate = () => {
        setNodes(prevNodes => {
            // Identify locked nodes based on focus state
            const lockedNodeIds = new Set<string>();
            if (primaryFocusId) {
                lockedNodeIds.add(primaryFocusId);
                // Lock neighbors connected via transient links
                transientLinks.forEach(([n1, n2]) => {
                    if (n1 === primaryFocusId) lockedNodeIds.add(n2);
                    if (n2 === primaryFocusId) lockedNodeIds.add(n1);
                });
                // Lock neighbors via persistent links
                links.forEach(l => {
                    if (l.sourceId === primaryFocusId) lockedNodeIds.add(l.targetId);
                    if (l.targetId === primaryFocusId) lockedNodeIds.add(l.sourceId);
                });
            }

            return prevNodes.map(node => {
                // LOCK LOGIC: Completely freeze if focused or neighbor of focused
                if (lockedNodeIds.has(node.id) || node.id === hoveredNodeId) {
                    return node; 
                }

                let { x, y, vx, vy } = node;

                // RIGID PAIR LOGIC (For persistent links)
                // Apply a spring force to keep persistent pairs at ideal distance
                // Note: simplified flocking for visual effect
                links.forEach(link => {
                    const otherId = link.sourceId === node.id ? link.targetId : link.sourceId === node.id ? link.targetId : null;
                    if (otherId) return; // Logic handled in pair processing? simpler: just drift
                });

                x += vx;
                y += vy;

                // Soft bounce off walls
                const margin = 20;
                if (x <= margin || x >= dimensions.width - margin) vx *= -1;
                if (y <= margin || y >= dimensions.height - margin) vy *= -1;

                return { ...node, x, y, vx, vy };
            });
        });
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (dimensions.width > 0) {
            requestRef.current = requestAnimationFrame(animate);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [dimensions, primaryFocusId, hoveredNodeId, transientLinks, links]);

    // --- 3. SPARK SYSTEM ---
    useEffect(() => {
        sparkIntervalRef.current = setInterval(() => {
            if (transientLinks.length === 0) return;
            // Pick random transient link
            const pairIndex = Math.floor(Math.random() * transientLinks.length);
            const [n1, n2] = transientLinks[pairIndex];
            const pathId = [n1, n2].sort().join('-');
            
            const newSpark: Spark = {
                id: Date.now(),
                pathId,
                startTime: Date.now()
            };
            
            setSparks(prev => [...prev, newSpark]);
            
            // Cleanup spark after animation
            setTimeout(() => {
                setSparks(prev => prev.filter(s => s.id !== newSpark.id));
            }, 2000); // Matches CSS animation duration
        }, 1500); // Frequency

        return () => {
            if (sparkIntervalRef.current) clearInterval(sparkIntervalRef.current);
        };
    }, [transientLinks]);

    // --- 4. INTERACTION HANDLERS ---
    const handleNodeClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        
        if (!primaryFocusId) {
            // First Click -> Activate
            setPrimaryFocusId(id);
        } else if (primaryFocusId === id) {
            // Click self -> Toggle Note View (handled by modal rendering logic check)
        } else {
            // Click other
            // Check if connected via transient link
            const isConnected = transientLinks.some(pair => pair.includes(primaryFocusId) && pair.includes(id));
            if (isConnected) {
                setSecondaryFocusId(id);
            } else {
                // Switch focus
                setPrimaryFocusId(id);
                setSecondaryFocusId(null);
            }
        }
    };

    const handleBackgroundClick = () => {
        setPrimaryFocusId(null);
        setSecondaryFocusId(null);
    };

    const handleCommitLink = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (primaryFocusId && secondaryFocusId) {
            onAddLink({
                id: Date.now().toString(),
                sourceId: primaryFocusId,
                targetId: secondaryFocusId,
                createdAt: Date.now()
            });
            // Keep focus but maybe show success feedback
            setSecondaryFocusId(null); // Reset secondary to allow new connections
        }
    };

    const handleRemoveLink = (e: React.MouseEvent, linkId: string) => {
        e.stopPropagation();
        onRemoveLink(linkId);
    };

    // --- 5. RENDER HELPERS ---
    const getNode = (id: string) => nodes.find(n => n.id === id);

    // Filter displayed note
    const activeNote = primaryFocusId ? notes.find(n => n.id === primaryFocusId) : null;

    return (
        <div ref={containerRef} className="absolute inset-0 bg-[#050505] overflow-hidden z-50" onClick={handleBackgroundClick}>
            
            {/* Ambient Void Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#101010] to-black opacity-80 pointer-events-none" />
            
            {/* Header */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-50 pointer-events-none">
                <div>
                    <h1 className="text-white/40 font-mono text-[10px] uppercase tracking-[0.3em] backdrop-blur-md px-3 py-1 rounded-full border border-white/5 inline-block">
                        SYNAPTIC_ETHER // {nodes.length} NODES
                    </h1>
                </div>
                <div className="flex gap-4 pointer-events-auto">
                    <button 
                        onClick={(e) => { e.stopPropagation(); generateTransientWeb(nodes); }}
                        className="group flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all backdrop-blur-md"
                    >
                        <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/20 text-white/60 hover:text-white transition-all backdrop-blur-md"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <radialGradient id="sparkGradient">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* LAYER 1: TRANSIENT LINKS (Faint) */}
                {transientLinks.map(([id1, id2]) => {
                    const source = getNode(id1);
                    const target = getNode(id2);
                    if (!source || !target) return null;
                    
                    // Logic: Is this link connected to Primary Focus?
                    const isFocusConnection = (id1 === primaryFocusId || id2 === primaryFocusId);
                    const isSelectedPair = (id1 === primaryFocusId && id2 === secondaryFocusId) || (id2 === primaryFocusId && id1 === secondaryFocusId);
                    
                    // Don't draw if persistent link exists
                    const isPersisted = links.some(l => (l.sourceId === id1 && l.targetId === id2) || (l.sourceId === id2 && l.targetId === id1));
                    if (isPersisted) return null;

                    const opacity = isSelectedPair ? 0.8 : isFocusConnection ? 0.3 : 0.05;
                    const strokeWidth = isSelectedPair ? 1.5 : isFocusConnection ? 1 : 0.5;
                    const color = isSelectedPair ? '#fbbf24' : '#ffffff';

                    const midX = (source.x + target.x) / 2;
                    const midY = (source.y + target.y) / 2;

                    return (
                        <g key={`${id1}-${id2}`}>
                            <line 
                                x1={source.x} y1={source.y} 
                                x2={target.x} y2={target.y} 
                                stroke={color} 
                                strokeWidth={strokeWidth}
                                strokeOpacity={opacity}
                                className="transition-all duration-500 ease-out"
                            />
                            
                            {/* THE STAR (Crystallization Trigger) */}
                            {isSelectedPair && (
                                <foreignObject x={midX - 12} y={midY - 12} width="24" height="24" className="overflow-visible pointer-events-auto">
                                    <button 
                                        onClick={handleCommitLink}
                                        className="w-6 h-6 flex items-center justify-center bg-black border border-amber-400/50 rounded-full text-amber-400 hover:bg-amber-400 hover:text-black transition-all animate-in zoom-in duration-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                                    >
                                        <Star size={12} fill="currentColor" />
                                    </button>
                                </foreignObject>
                            )}
                        </g>
                    );
                })}

                {/* LAYER 2: SPARKS (Animated Pulse) */}
                {sparks.map(spark => {
                    const ids = spark.pathId.split('-');
                    const source = getNode(ids[0]);
                    const target = getNode(ids[1]);
                    if (!source || !target) return null;

                    return (
                        <circle key={spark.id} r="2" fill="url(#sparkGradient)" filter="url(#glow)">
                            <animateMotion 
                                dur="2s" 
                                repeatCount="1"
                                path={`M${source.x},${source.y} L${target.x},${target.y}`}
                            />
                        </circle>
                    );
                })}

                {/* LAYER 3: PERSISTENT LINKS (Solid) */}
                {links.map(link => {
                    const source = getNode(link.sourceId);
                    const target = getNode(link.targetId);
                    if (!source || !target) return null;

                    const midX = (source.x + target.x) / 2;
                    const midY = (source.y + target.y) / 2;

                    return (
                        <g key={link.id} className="group">
                            <line 
                                x1={source.x} y1={source.y} 
                                x2={target.x} y2={target.y} 
                                stroke="#6366f1" 
                                strokeWidth="1.5"
                                strokeOpacity="0.6"
                                className="transition-all duration-300"
                            />
                            {/* Hover Delete Action */}
                            <foreignObject x={midX - 8} y={midY - 8} width="16" height="16" className="overflow-visible pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => handleRemoveLink(e, link.id)}
                                    className="w-4 h-4 flex items-center justify-center bg-black border border-red-500/50 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                >
                                    <X size={8} />
                                </button>
                            </foreignObject>
                        </g>
                    );
                })}
            </svg>

            {/* DOM LAYER: NODES */}
            {nodes.map(node => {
                const isPrimary = node.id === primaryFocusId;
                const isSecondary = node.id === secondaryFocusId;
                const isHovered = node.id === hoveredNodeId;
                const isLocked = isPrimary || isSecondary;

                return (
                    <div
                        key={node.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                        style={{ left: node.x, top: node.y }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        onClick={(e) => handleNodeClick(e, node.id)}
                    >
                        {/* Node Body */}
                        <div className={`
                            relative rounded-full border transition-all duration-300
                            ${isLocked ? 'w-4 h-4 bg-white border-white shadow-[0_0_20px_rgba(255,255,255,0.5)]' : 'w-2 h-2 bg-black border-white/40 hover:bg-white/20 hover:border-white hover:scale-150'}
                        `}>
                            {isPrimary && (
                                <div className="absolute inset-0 rounded-full border border-white animate-ping opacity-50" />
                            )}
                        </div>

                        {/* Label on Hover/Lock */}
                        {(isHovered || isLocked) && (
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                                <span className="text-[9px] font-mono text-white/70 bg-black/50 backdrop-blur-md px-2 py-1 rounded border border-white/10 uppercase tracking-wider">
                                    {node.note.title || 'UNTITLED_THOUGHT'}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* NOTE PREVIEW MODAL (Ultra Glass) */}
            <AnimatePresence>
                {activeNote && !secondaryFocusId && (
                    <motion.div
                        className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-xl z-20 px-6 pointer-events-auto"
                        variants={NOTE_PEEK_VARIANTS}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal
                    >
                        <div className="bg-white/10 dark:bg-black/40 backdrop-blur-[45px] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                            
                            {/* Glass Reflection */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="font-mono text-[9px] text-white/40 uppercase tracking-[0.2em]">
                                        ID // {activeNote.id.slice(-4)}
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setPrimaryFocusId(null); }}
                                        className="text-white/40 hover:text-white transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="max-h-[40vh] overflow-y-auto custom-scrollbar-ghost pr-2">
                                    <div className="font-serif text-lg md:text-xl text-white/90 leading-relaxed tracking-wide mix-blend-screen">
                                        <ReactMarkdown components={{ p: ({node, ...props}: any) => <p className="mb-4 last:mb-0" {...props} /> }}>
                                            {activeNote.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/5 flex gap-2 flex-wrap">
                                    {activeNote.tags.map(t => (
                                        <span key={t} className="font-mono text-[9px] text-white/60 bg-white/5 px-2 py-1 rounded border border-white/5">
                                            #{t}
                                        </span>
                                    ))}
                                    {activeNote.tags.length === 0 && <span className="font-mono text-[9px] text-white/20 italic">NO_TAGS</span>}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default SynapticWeb;
