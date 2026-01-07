import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note } from '../types';
import { BrainCircuit, Play, Pause, Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const allowDataUrls = (url: string) => url;

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-800 dark:text-slate-200" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
};

interface VisualNode extends Note {
    x: number;
    y: number;
    vx: number;
    vy: number;
    phase: number;
    hexColor: string;
}

interface Props {
    notes: Note[];
    onUpdateNote: (note: Note) => void;
}

const Ether: React.FC<Props> = ({ notes, onUpdateNote }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const simulationRef = useRef<{ nodes: VisualNode[], suggestedLinks: { source: string, target: string }[] }>({ nodes: [], suggestedLinks: [] });
    const [tick, setTick] = useState(0);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [activeNote, setActiveNote] = useState<Note | null>(null);

    // Init Simulation
    useEffect(() => {
        if (!containerRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });

        const getColorHex = (colorId?: string) => colors.find(c => c.id === colorId)?.hex || '#94a3b8';

        // 1. Create Nodes (Preserve existing positions if id matches)
        const currentNodes = simulationRef.current.nodes;
        const visualNodes: VisualNode[] = notes.map(n => {
            const existing = currentNodes.find(en => en.id === n.id);
            return {
                ...n,
                x: existing ? existing.x : Math.random() * clientWidth,
                y: existing ? existing.y : Math.random() * clientHeight,
                vx: existing ? existing.vx : (Math.random() - 0.5) * 0.5,
                vy: existing ? existing.vy : (Math.random() - 0.5) * 0.5,
                phase: existing ? existing.phase : Math.random() * Math.PI * 2,
                hexColor: getColorHex(n.color)
            };
        });

        // 2. Generate Random "Suggested" Links only if we need more or re-init
        let suggestedLinks = simulationRef.current.suggestedLinks;
        if (suggestedLinks.length === 0 && visualNodes.length > 2) {
            const linkCount = Math.min(visualNodes.length, 5); // Suggest up to 5 connections
            const usedIndices = new Set<number>();
            
            for (let i = 0; i < linkCount; i++) {
                let idx1 = Math.floor(Math.random() * visualNodes.length);
                let idx2 = Math.floor(Math.random() * visualNodes.length);
                
                let attempts = 0;
                while ((idx1 === idx2 || usedIndices.has(idx1)) && attempts < 10) {
                    idx2 = Math.floor(Math.random() * visualNodes.length);
                    attempts++;
                }
                
                if (idx1 !== idx2) {
                    suggestedLinks.push({ 
                        source: visualNodes[idx1].id, 
                        target: visualNodes[idx2].id 
                    });
                    usedIndices.add(idx1);
                }
            }
        }

        simulationRef.current = { nodes: visualNodes, suggestedLinks };

    }, [notes]);

    // Physics Loop
    useEffect(() => {
        let animationFrameId: number;

        const loop = () => {
            const { width, height } = dimensions;
            const { nodes } = simulationRef.current;

            if (!isPaused) {
                nodes.forEach(node => {
                    // Gentle floating
                    node.x += node.vx;
                    node.y += node.vy;

                    // Wall bounce with damping
                    if (node.x <= 0 || node.x >= width) node.vx *= -1;
                    if (node.y <= 0 || node.y >= height) node.vy *= -1;

                    // Central Gravity (Keep them somewhat together)
                    const dx = (width / 2) - node.x;
                    const dy = (height / 2) - node.y;
                    node.vx += dx * 0.00005;
                    node.vy += dy * 0.00005;
                });
            }

            setTick(t => t + 1);
            animationFrameId = requestAnimationFrame(loop);
        };
        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [dimensions, isPaused]);

    // Combine Suggested and Saved Links
    const allLinks = useMemo(() => {
        const { nodes, suggestedLinks } = simulationRef.current;
        const links: { source: VisualNode, target: VisualNode, type: 'suggested' | 'starred', id: string }[] = [];
        
        // 1. Saved Links (Starred)
        const savedLinksSet = new Set<string>();
        nodes.forEach(node => {
            if (node.connectedNoteIds) {
                node.connectedNoteIds.forEach(targetId => {
                    const target = nodes.find(n => n.id === targetId);
                    if (target) {
                        const linkId = [node.id, targetId].sort().join('-');
                        if (!savedLinksSet.has(linkId)) {
                            links.push({ source: node, target, type: 'starred', id: linkId });
                            savedLinksSet.add(linkId);
                        }
                    }
                });
            }
        });

        // 2. Suggested Links (Only if not already saved)
        suggestedLinks.forEach(link => {
            const source = nodes.find(n => n.id === link.source);
            const target = nodes.find(n => n.id === link.target);
            if (source && target) {
                const linkId = [source.id, target.id].sort().join('-');
                if (!savedLinksSet.has(linkId)) {
                    links.push({ source, target, type: 'suggested', id: linkId });
                }
            }
        });

        return links;
    }, [tick, notes]); 

    const toggleConnection = (sourceId: string, targetId: string) => {
        const sourceNote = notes.find(n => n.id === sourceId);
        if (!sourceNote) return;

        const currentConnections = sourceNote.connectedNoteIds || [];
        let newConnections;

        if (currentConnections.includes(targetId)) {
            newConnections = currentConnections.filter(id => id !== targetId);
        } else {
            newConnections = [...currentConnections, targetId];
        }

        onUpdateNote({ ...sourceNote, connectedNoteIds: newConnections });
    };

    return (
        <div className="flex h-full w-full relative bg-[#0f172a] overflow-hidden">
            <div ref={containerRef} className="absolute inset-0 overflow-hidden">
                {/* Header / Controls */}
                <div className="absolute top-6 left-8 z-20 flex items-start gap-4">
                    <div>
                        <h2 className="text-white/80 font-serif text-2xl tracking-tight flex items-center gap-3">
                            <BrainCircuit size={24} className="text-indigo-400" />
                            ETHER_WEB
                        </h2>
                        <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mt-1">
                            Поиск скрытых связей // {notes.length} NODES
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsPaused(!isPaused)}
                        className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        title={isPaused ? "Возобновить Хаос" : "Остановить Хаос (Пауза)"}
                    >
                        {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                    </button>
                </div>

                {/* Links Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {allLinks.map((link) => {
                        const isStarred = link.type === 'starred';
                        return (
                            <g key={link.id}>
                                <line 
                                    x1={link.source.x} y1={link.source.y} 
                                    x2={link.target.x} y2={link.target.y} 
                                    stroke={isStarred ? "#fbbf24" : "white"}
                                    strokeWidth={isStarred ? 1.5 : 1} 
                                    strokeDasharray={isStarred ? "none" : "4 4"} 
                                    strokeOpacity={isStarred ? 0.6 : 0.2} 
                                />
                                {/* Running Dot/Spark */}
                                <circle r="2" fill={isStarred ? "#fbbf24" : "white"}>
                                    <animateMotion 
                                        dur="4s"
                                        repeatCount="indefinite"
                                        path={`M${link.source.x},${link.source.y} L${link.target.x},${link.target.y}`}
                                    />
                                </circle>
                            </g>
                        );
                    })}
                </svg>

                {/* Interaction Layer (Stars) */}
                <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {allLinks.map((link) => {
                        const mx = (link.source.x + link.target.x) / 2;
                        const my = (link.source.y + link.target.y) / 2;
                        const isStarred = link.type === 'starred';
                        
                        return (
                            <div 
                                key={`star-${link.id}`}
                                className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 p-2 hover:scale-125 transition-transform group"
                                style={{ left: mx, top: my }}
                                onClick={() => toggleConnection(link.source.id, link.target.id)}
                            >
                                <div className={`p-1 rounded-full backdrop-blur-sm ${isStarred ? 'bg-yellow-500/10' : 'bg-white/5 hover:bg-white/10'}`}>
                                    <Star 
                                        size={12} 
                                        className={`transition-colors ${isStarred ? 'text-yellow-400 fill-yellow-400' : 'text-white/40 hover:text-white'}`} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Nodes Layer */}
                {simulationRef.current.nodes.map(node => (
                    <div
                        key={node.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                        style={{ left: node.x, top: node.y }}
                        onClick={() => setActiveNote(node)}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                    >
                        {/* Glow */}
                        <div 
                            className={`absolute inset-0 rounded-full blur-md opacity-40 group-hover:opacity-80 transition-opacity duration-300 ${isPaused ? 'animate-pulse' : ''}`}
                            style={{ backgroundColor: node.hexColor, width: 24, height: 24, transform: 'translate(-25%, -25%)' }}
                        />
                        
                        {/* Core */}
                        <div 
                            className="w-3 h-3 rounded-full border border-white/50 bg-white/20 backdrop-blur-sm relative z-10 group-hover:scale-150 transition-transform duration-300"
                            style={{ borderColor: node.hexColor }}
                        />

                        {/* Label on Hover */}
                        <AnimatePresence>
                            {hoveredNodeId === node.id && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-2 rounded-lg text-white w-48 z-30 pointer-events-none"
                                >
                                    <div className="text-[10px] font-mono text-indigo-300 mb-1 opacity-70">
                                        {new Date(node.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs font-serif line-clamp-2 leading-relaxed">
                                        {node.title || node.content.substring(0, 50)}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* Lightbox Modal for Note Content */}
            <AnimatePresence>
                {activeNote && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setActiveNote(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl p-6 md:p-8 relative overflow-y-auto max-h-[90vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {activeNote.coverUrl && (
                                <div className="mb-6 rounded-xl overflow-hidden -mx-6 -mt-6 md:-mx-8 md:-mt-8">
                                    <img src={activeNote.coverUrl} alt="Cover" className="w-full h-40 object-cover" />
                                </div>
                            )}
                            
                            <div className="flex flex-col gap-1 mb-4">
                                <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                    <span>{new Date(activeNote.createdAt).toLocaleDateString()}</span>
                                    <span className="opacity-50 mx-2">|</span>
                                    <span>ID // {activeNote.id.slice(-5).toLowerCase()}</span>
                                </div>
                                {activeNote.title && <h2 className="font-sans text-2xl font-bold text-slate-900 dark:text-slate-100">{activeNote.title}</h2>}
                            </div>

                            <div className="text-slate-700 dark:text-slate-300 font-serif text-base leading-relaxed mb-6">
                                <ReactMarkdown 
                                    components={markdownComponents} 
                                    urlTransform={allowDataUrls} 
                                    remarkPlugins={[remarkGfm]} 
                                    rehypePlugins={[rehypeRaw]}
                                >
                                    {activeNote.content.replace(/\n/g, '  \n')}
                                </ReactMarkdown>
                            </div>

                            {activeNote.tags && activeNote.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    {activeNote.tags.map(tag => (
                                        <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md font-mono uppercase tracking-wider">
                                            #{tag.replace(/^#/, '')}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Ether;
