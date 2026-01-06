import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Note, SynapticLink } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, RefreshCw, LayoutGrid, Trash2, Maximize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Tooltip } from './Tooltip';

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

const NOTE_PEEK_VARIANTS = {
    hidden: { opacity: 0, scale: 0.9, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 10 }
};

const SynapticWeb: React.FC<Props> = ({ notes, links, onAddLink, onRemoveLink, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [nodes, setNodes] = useState<PhysicsNode[]>([]);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [randomPairs, setRandomPairs] = useState<[string, string][]>([]);
    const requestRef = useRef<number | null>(null);
    const [hoveredLineKey, setHoveredLineKey] = useState<string | null>(null);

    // 1. Initialize Nodes
    useEffect(() => {
        if (!containerRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });

        const newNodes = notes.map(note => ({
            id: note.id,
            x: Math.random() * (clientWidth - 100) + 50,
            y: Math.random() * (clientHeight - 100) + 50,
            vx: (Math.random() - 0.5) * 0.15, 
            vy: (Math.random() - 0.5) * 0.15,
            note
        }));
        setNodes(newNodes);
        generateRandomConnections(newNodes);
    }, [notes.length]);

    const generateRandomConnections = (currentNodes: PhysicsNode[]) => {
        if (currentNodes.length < 2) return;
        const count = Math.min(8, Math.floor(currentNodes.length / 1.5));
        const pairs: [string, string][] = [];
        const ids = currentNodes.map(n => n.id);
        
        for (let i = 0; i < count; i++) {
            const idx1 = Math.floor(Math.random() * ids.length);
            let idx2 = Math.floor(Math.random() * ids.length);
            while (idx1 === idx2) idx2 = Math.floor(Math.random() * ids.length);
            pairs.push([ids[idx1], ids[idx2]]);
        }
        setRandomPairs(pairs);
    };

    // 2. Physics Loop
    const animate = () => {
        setNodes(prevNodes => {
            return prevNodes.map(node => {
                // Freeze if hovered or selected
                if (node.id === hoveredNodeId || node.id === selectedNodeId) return node;

                let { x, y, vx, vy } = node;
                
                x += vx;
                y += vy;

                // Soft bounce off walls
                if (x <= 20 || x >= dimensions.width - 20) vx *= -1;
                if (y <= 20 || y >= dimensions.height - 20) vy *= -1;

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
    }, [dimensions, hoveredNodeId, selectedNodeId]);

    // 3. Logic Helpers
    const getNode = (id: string) => nodes.find(n => n.id === id);

    const handleStarLink = (sourceId: string, targetId: string) => {
        // Prevent duplicate logic handled by parent if needed, but here we check existence
        const exists = links.find(l => (l.sourceId === sourceId && l.targetId === targetId) || (l.sourceId === targetId && l.targetId === sourceId));
        if (exists) return;

        onAddLink({
            id: Date.now().toString(),
            sourceId,
            targetId,
            createdAt: Date.now()
        });
    };

    const handleUnstarLink = (sourceId: string, targetId: string) => {
        const link = links.find(l => (l.sourceId === sourceId && l.targetId === targetId) || (l.sourceId === targetId && l.targetId === sourceId));
        if (link) {
            onRemoveLink(link.id);
        }
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedNodeId(null);
        }
    };

    const handleNodeClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedNodeId(prev => prev === id ? null : id);
    };

    const activeNote = useMemo(() => nodes.find(n => n.id === selectedNodeId)?.note, [nodes, selectedNodeId]);

    // 4. Render Logic
    // Combine random pairs and persistent links into one visual set for rendering
    // We treat them differently for styling
    const visualLinks = useMemo(() => {
        const rendered: React.ReactNode[] = [];
        
        // A. Render Persistent Links (Starred)
        links.forEach(link => {
            const source = getNode(link.sourceId);
            const target = getNode(link.targetId);
            if (!source || !target) return;

            const key = `p-${link.id}`;
            const isHovered = hoveredLineKey === key;
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            rendered.push(
                <g key={key} onMouseEnter={() => setHoveredLineKey(key)} onMouseLeave={() => setHoveredLineKey(null)}>
                    {/* Glow */}
                    <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#fbbf24" strokeWidth={isHovered ? 2 : 1} strokeOpacity={0.6} />
                    
                    {/* Pulsing Particle */}
                    <circle r="2" fill="#fbbf24">
                        <animateMotion dur="4s" repeatCount="indefinite" path={`M${source.x},${source.y} L${target.x},${target.y}`} />
                    </circle>

                    {/* Unstar Control */}
                    {isHovered && (
                        <foreignObject x={midX - 12} y={midY - 12} width="24" height="24">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleUnstarLink(source.id, target.id); }}
                                className="w-6 h-6 flex items-center justify-center bg-black border border-amber-500 rounded-full text-amber-500 hover:text-red-500 hover:border-red-500 transition-colors cursor-pointer shadow-lg"
                            >
                                <Trash2 size={10} />
                            </button>
                        </foreignObject>
                    )}
                </g>
            );
        });

        // B. Render Random Pairs (Ephemeral)
        randomPairs.forEach(([id1, id2], i) => {
            // Skip if this pair is already persisted
            const isPersisted = links.some(l => (l.sourceId === id1 && l.targetId === id2) || (l.sourceId === id2 && l.targetId === id1));
            if (isPersisted) return;

            const source = getNode(id1);
            const target = getNode(id2);
            if (!source || !target) return;

            const key = `r-${id1}-${id2}`;
            const isHovered = hoveredLineKey === key;
            const isConnectedToSelected = selectedNodeId === id1 || selectedNodeId === id2;
            
            // Visual Style
            const strokeColor = isConnectedToSelected ? "rgba(255, 255, 255, 0.6)" : "rgba(255, 255, 255, 0.15)";
            const strokeWidth = isConnectedToSelected || isHovered ? 1 : 0.5;
            
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            rendered.push(
                <g key={key} className="pointer-events-auto" onMouseEnter={() => setHoveredLineKey(key)} onMouseLeave={() => setHoveredLineKey(null)}>
                    {/* Hit Area */}
                    <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="transparent" strokeWidth="20" className="cursor-crosshair" />
                    
                    {/* Visual Line */}
                    <line 
                        x1={source.x} y1={source.y} 
                        x2={target.x} y2={target.y} 
                        stroke={strokeColor} 
                        strokeWidth={strokeWidth}
                        strokeDasharray={isConnectedToSelected ? "none" : "4 4"}
                        className="transition-all duration-300"
                    />

                    {/* Particle (Only if connected to selected) */}
                    {isConnectedToSelected && (
                        <circle r="1.5" fill="#fff">
                            <animateMotion dur="6s" repeatCount="indefinite" path={`M${source.x},${source.y} L${target.x},${target.y}`} />
                        </circle>
                    )}

                    {/* Star Trigger */}
                    {isHovered && (
                        <foreignObject x={midX - 10} y={midY - 10} width="20" height="20">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleStarLink(id1, id2); }}
                                className="w-5 h-5 flex items-center justify-center bg-black border border-white/50 rounded-full text-white hover:text-yellow-400 hover:border-yellow-400 transition-colors animate-in zoom-in duration-200 cursor-pointer shadow-lg"
                            >
                                <Star size={10} fill="currentColor" />
                            </button>
                        </foreignObject>
                    )}
                </g>
            );
        });

        return rendered;
    }, [links, randomPairs, nodes, hoveredLineKey, selectedNodeId]);

    return (
        <div ref={containerRef} className="absolute inset-0 bg-gradient-to-br from-[#121212] to-[#1A1A1A] overflow-hidden z-50" onClick={handleBackgroundClick}>
            
            {/* Grain Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            {/* Header Controls */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-50 pointer-events-none">
                <div>
                    <h1 className="text-white/80 font-mono text-xs uppercase tracking-[0.3em] backdrop-blur-md px-3 py-1 rounded-full border border-white/10 inline-block shadow-lg">
                        SYNAPTIC_WEB // ACTIVE
                    </h1>
                </div>
                <div className="flex gap-4 pointer-events-auto">
                    <Tooltip content="Перемешать связи" side="bottom">
                        <button 
                            onClick={() => generateRandomConnections(nodes)}
                            className="group flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all backdrop-blur-md"
                        >
                            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                            <span className="font-mono text-[9px] uppercase tracking-wider hidden md:inline">Re-Shuffle</span>
                        </button>
                    </Tooltip>
                    
                    <Tooltip content="List View" side="bottom">
                        <button 
                            onClick={onClose}
                            className="group flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all backdrop-blur-md"
                        >
                            <LayoutGrid size={14} />
                            <span className="font-mono text-[9px] uppercase tracking-wider hidden md:inline">List View</span>
                        </button>
                    </Tooltip>
                </div>
            </div>

            {/* Canvas Area */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {visualLinks}
            </svg>

            {/* DOM Nodes */}
            {nodes.map(node => {
                const isSelected = selectedNodeId === node.id;
                const isHovered = hoveredNodeId === node.id;
                
                return (
                    <div
                        key={node.id}
                        className={`
                            absolute flex items-center justify-center cursor-pointer transition-all duration-300
                            ${isSelected ? 'z-40 scale-125' : isHovered ? 'z-30 scale-110' : 'z-20 scale-100'}
                        `}
                        style={{ 
                            left: node.x, 
                            top: node.y,
                            transform: 'translate(-50%, -50%)'
                        }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        onClick={(e) => handleNodeClick(e, node.id)}
                    >
                        {/* Node Body */}
                        <div className={`
                            w-3 h-3 rounded-full border transition-all duration-300
                            ${isSelected 
                                ? 'bg-white border-white shadow-[0_0_20px_rgba(255,255,255,0.8)]' 
                                : isHovered 
                                    ? 'bg-white border-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' 
                                    : 'bg-black border-white/40 shadow-none'
                            }
                        `} />

                        {/* Label (Visible on Hover/Select) */}
                        <AnimatePresence>
                            {(isHovered || isSelected) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap z-50"
                                >
                                    <div className="bg-black/80 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded text-[10px] text-white/90 font-mono max-w-[200px] truncate shadow-2xl">
                                        {node.note.content.substring(0, 30)}...
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}

            {/* Selected Note Interface (Bottom Left) */}
            <AnimatePresence>
                {activeNote && (
                    <motion.div
                        variants={NOTE_PEEK_VARIANTS}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute bottom-8 left-8 right-8 md:right-auto md:w-[400px] pointer-events-auto z-50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-black/40 backdrop-blur-[40px] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <Maximize2 size={64} />
                            </div>
                            
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="font-mono text-[9px] text-white/40 uppercase tracking-widest">
                                    ID_{activeNote.id.slice(-4)}
                                </div>
                                <button onClick={() => setSelectedNodeId(null)} className="text-white/40 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="font-serif italic text-lg md:text-xl text-white/90 leading-relaxed tracking-wide max-h-[200px] overflow-y-auto custom-scrollbar-ghost pr-2">
                                <ReactMarkdown components={{ p: ({node, ...props}: any) => <p className="mb-4 last:mb-0" {...props} /> }}>
                                    {activeNote.content}
                                </ReactMarkdown>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5 flex gap-2 flex-wrap">
                                {activeNote.tags.map(t => (
                                    <span key={t} className="font-mono text-[9px] text-white/60 bg-white/5 px-2 py-1 rounded border border-white/5">
                                        #{t.replace(/^#/,'')}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default SynapticWeb;