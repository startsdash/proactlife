import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Note, SynapticLink } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, RefreshCw, Maximize2 } from 'lucide-react';
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

const NOTE_PEEK_VARIANTS = {
    hidden: { opacity: 0, scale: 0.9, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 10 }
};

const SynapticWeb: React.FC<Props> = ({ notes, links, onAddLink, onRemoveLink, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [nodes, setNodes] = useState<PhysicsNode[]>([]);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [activeNote, setActiveNote] = useState<Note | null>(null);
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
            x: Math.random() * (clientWidth - 40) + 20,
            y: Math.random() * (clientHeight - 40) + 20,
            vx: (Math.random() - 0.5) * 0.2, // Slow drift
            vy: (Math.random() - 0.5) * 0.2,
            note
        }));
        setNodes(newNodes);
        generateRandomConnections(newNodes);
    }, [notes.length]); // Re-init only if notes count changes significantly

    const generateRandomConnections = (currentNodes: PhysicsNode[]) => {
        if (currentNodes.length < 2) return;
        const count = Math.min(7, Math.floor(currentNodes.length / 2));
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
                // Freeze if hovered
                if (node.id === hoveredNodeId) return node;

                let { x, y, vx, vy } = node;
                
                x += vx;
                y += vy;

                // Bounce off walls
                if (x <= 10 || x >= dimensions.width - 10) vx *= -1;
                if (y <= 10 || y >= dimensions.height - 10) vy *= -1;

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
    }, [dimensions, hoveredNodeId]);

    // 3. Render Helpers
    const getNode = (id: string) => nodes.find(n => n.id === id);

    const handleStarLink = (sourceId: string, targetId: string) => {
        // Check if already exists
        const exists = links.find(l => (l.sourceId === sourceId && l.targetId === targetId) || (l.sourceId === targetId && l.targetId === sourceId));
        if (exists) return;

        onAddLink({
            id: Date.now().toString(),
            sourceId,
            targetId,
            createdAt: Date.now()
        });
    };

    const isLinkPersisted = (n1: string, n2: string) => {
        return links.some(l => (l.sourceId === n1 && l.targetId === n2) || (l.sourceId === n2 && l.targetId === n1));
    };

    return (
        <div ref={containerRef} className="absolute inset-0 bg-gradient-to-br from-[#121212] to-[#1A1A1A] overflow-hidden z-50">
            
            {/* Grain Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            {/* Header Controls */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-50 pointer-events-none">
                <div>
                    <h1 className="text-white/80 font-mono text-xs uppercase tracking-[0.3em] backdrop-blur-md px-3 py-1 rounded-full border border-white/10 inline-block">
                        SYNAPTIC_WEB // ACTIVE
                    </h1>
                </div>
                <div className="flex gap-4 pointer-events-auto">
                    <button 
                        onClick={() => generateRandomConnections(nodes)}
                        className="group flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all backdrop-blur-md"
                    >
                        <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                        <span className="font-mono text-[9px] uppercase tracking-wider">Re-Shuffle</span>
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/20 text-white transition-all backdrop-blur-md"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* 1. Persistent Links */}
                {links.map(link => {
                    const source = getNode(link.sourceId);
                    const target = getNode(link.targetId);
                    if (!source || !target) return null;
                    return (
                        <line 
                            key={link.id}
                            x1={source.x} y1={source.y}
                            x2={target.x} y2={target.y}
                            stroke="rgba(255, 255, 255, 0.4)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* 2. Random Links (Hypothesis) */}
                {randomPairs.map(([id1, id2], i) => {
                    const source = getNode(id1);
                    const target = getNode(id2);
                    if (!source || !target) return null;
                    if (isLinkPersisted(id1, id2)) return null; // Don't draw if already solid

                    const key = `${id1}-${id2}`;
                    const isHovered = hoveredLineKey === key;
                    const midX = (source.x + target.x) / 2;
                    const midY = (source.y + target.y) / 2;

                    return (
                        <g key={key} className="pointer-events-auto" onMouseEnter={() => setHoveredLineKey(key)} onMouseLeave={() => setHoveredLineKey(null)}>
                            {/* Invisible thick hit area */}
                            <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="transparent" strokeWidth="20" className="cursor-crosshair" />
                            {/* Visible dotted line */}
                            <line 
                                x1={source.x} y1={source.y} 
                                x2={target.x} y2={target.y} 
                                stroke="rgba(255, 255, 255, 0.15)" 
                                strokeWidth="0.5" 
                                strokeDasharray="4 4" 
                                className="transition-all duration-300"
                                style={{ stroke: isHovered ? 'rgba(255,255,255,0.5)' : undefined }}
                            />
                            {/* Star Trigger */}
                            {isHovered && (
                                <foreignObject x={midX - 10} y={midY - 10} width="20" height="20">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleStarLink(id1, id2); }}
                                        className="w-5 h-5 flex items-center justify-center bg-black border border-white/50 rounded-full text-white hover:text-yellow-400 hover:border-yellow-400 transition-colors animate-in zoom-in duration-200 cursor-pointer"
                                    >
                                        <Star size={10} fill="currentColor" />
                                    </button>
                                </foreignObject>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* DOM Nodes */}
            {nodes.map(node => (
                <div
                    key={node.id}
                    className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border border-white/40 cursor-pointer transition-all duration-300 hover:scale-150 hover:bg-white hover:border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10"
                    style={{ transform: `translate3d(${node.x}px, ${node.y}px, 0)` }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => setActiveNote(node.note)}
                />
            ))}

            {/* Note Peek (Modal) */}
            <AnimatePresence>
                {activeNote && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-[2px]" onClick={() => setActiveNote(null)}>
                        <motion.div
                            variants={NOTE_PEEK_VARIANTS}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative w-full max-w-lg p-8 md:p-12 rounded-[2px] border border-white/20 bg-white/5 backdrop-blur-[45px] shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button onClick={() => setActiveNote(null)} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                                <X size={20} strokeWidth={1} />
                            </button>

                            <div className="font-serif italic text-xl md:text-2xl text-white/90 leading-relaxed tracking-wide">
                                <ReactMarkdown components={{ p: ({node, ...props}: any) => <p className="mb-4 last:mb-0" {...props} /> }}>
                                    {activeNote.content}
                                </ReactMarkdown>
                            </div>

                            <div className="mt-12 pt-4 border-t border-white/10 flex justify-between items-end">
                                <div className="font-mono text-[9px] text-white/40 uppercase tracking-widest">
                                    ID_{activeNote.id.slice(-4)} // {new Date(activeNote.createdAt).toLocaleDateString()}
                                </div>
                                <div className="flex gap-2">
                                    {activeNote.tags.map(t => (
                                        <span key={t} className="font-mono text-[9px] text-white/60 bg-white/10 px-2 py-1 rounded">
                                            #{t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default SynapticWeb;