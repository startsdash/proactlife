
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, Task, Flashcard, AppConfig } from '../types';
import { analyzeSandboxItem, SandboxAnalysis } from '../services/geminiService';
import { ICON_MAP, applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { CheckSquare, Library, Loader2, Quote, BrainCircuit, ArrowLeft, Tag, Archive, Trash2, Dumbbell, Box, Cpu, Grid, Layers, Terminal, Activity, Zap, Aperture, Disc, Hexagon, Triangle, Square, Circle, RotateCw, Play, Sparkles, Send, ArrowRight } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  notes: Note[];
  config: AppConfig;
  onProcessNote: (noteId: string) => void;
  onAddTask: (task: Task) => void;
  onAddFlashcard: (card: Flashcard) => void;
  deleteNote: (id: string) => void;
}

// --- TYPOGRAPHY & UTILS ---
const cleanHeader = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') return children.replace(/:\s*$/, '');
    if (Array.isArray(children)) {
        return React.Children.map(children, (child, i) => {
             return i === React.Children.count(children) - 1 ? cleanHeader(child) : child;
        });
    }
    if (React.isValidElement(children)) {
        return React.cloneElement(children, {
             // @ts-ignore
            children: cleanHeader(children.props.children)
        });
    }
    return children;
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-3 last:mb-0 text-slate-600 dark:text-slate-300 leading-relaxed font-sans" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 underline decoration-1 underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-300 font-sans" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-300 font-sans" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-2xl font-serif font-bold mt-6 mb-3 text-slate-900 dark:text-slate-100" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-xl font-serif font-bold mt-5 mb-2 text-slate-900 dark:text-slate-100" {...props}>{cleanHeader(children)}</h2>,
    h3: ({node, children, ...props}: any) => <h3 className="text-lg font-serif font-bold mt-4 mb-2 text-slate-900 dark:text-slate-100" {...props}>{cleanHeader(children)}</h3>,
    h4: ({node, children, ...props}: any) => <h4 className="text-base font-serif font-bold mt-4 mb-2 text-slate-800 dark:text-slate-200" {...props}>{cleanHeader(children)}</h4>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-indigo-200 pl-4 py-1 my-4 text-slate-500 italic font-serif" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wide" {...props}>{children}</code>
            : <code className="block bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 p-4 rounded-xl text-xs font-mono my-4 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

// --- NEO-MINIMALIST 3D SHAPES ---
// Material: Semi-transparent "Frosted Glass" with subtle inner glow.
// Animation: "Breathe & Flow" (4-6s cycle).

const AbstractShape = ({ type, isActive, isThinking }: { type: string, isActive: boolean, isThinking: boolean }) => {
    
    // Config based on type
    let gradientColors = { start: "#e0f2fe", end: "#f0f9ff" }; // Default Ice Blue
    let strokeColor = "rgba(255,255,255,0.4)";
    
    if (type === 'sphere') { gradientColors = { start: "#ffedd5", end: "#fff7ed" }; } // Peach Fuzz
    if (type === 'torus') { gradientColors = { start: "#f1f5f9", end: "#f8fafc" }; strokeColor = "rgba(255,255,255,0.6)"; } // Pearl
    if (type === 'grid') { gradientColors = { start: "#e2e8f0", end: "#f8fafc" }; } // Cloud Gray
    if (type === 'flame') { gradientColors = { start: "#ccfbf1", end: "#f0fdfa" }; } // Neon Mint

    // Animation Variants
    const pulseVariant = {
        idle: { scale: [1, 1.05, 1], transition: { duration: 6, repeat: Infinity, ease: "easeInOut" } },
        thinking: { scale: [1, 0.9, 1.1, 0.95, 1], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }
    };

    const rotateVariant = {
        idle: { rotate: 360, transition: { duration: 20, repeat: Infinity, ease: "linear" } },
        thinking: { rotate: 360, scale: [1, 1.1, 1], transition: { rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } } }
    };

    const floatVariant = {
        idle: { y: [0, -5, 0], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
        thinking: { y: [0, -10, 0], opacity: [0.5, 1, 0.5], transition: { duration: 1, repeat: Infinity } }
    };

    return (
        <div className={`relative w-24 h-24 flex items-center justify-center transition-all duration-700 ${isActive ? 'opacity-100 scale-110 drop-shadow-2xl' : 'opacity-40 grayscale-[0.3] hover:opacity-80 hover:scale-105'}`}>
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id={`grad-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={gradientColors.start} stopOpacity={isActive ? 0.9 : 0.5} />
                        <stop offset="100%" stopColor={gradientColors.end} stopOpacity={isActive ? 0.6 : 0.3} />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="frosted">
                        <feGaussianBlur stdDeviation="0.5" />
                    </filter>
                </defs>

                {/* OBJECT 1: THE CRYSTAL (Octahedron) */}
                {type === 'crystal' && (
                    <motion.g 
                        variants={pulseVariant}
                        animate={isThinking ? "thinking" : "idle"}
                        style={{ transformOrigin: '50px 50px' }}
                    >
                        {/* Back faces */}
                        <path d="M50 15 L85 50 L50 85 L15 50 Z" fill={`url(#grad-${type})`} opacity="0.3" />
                        {/* Front lines */}
                        <path d="M50 10 L90 50 L50 90 L10 50 Z" fill={`url(#grad-${type})`} stroke={strokeColor} strokeWidth="0.5" filter="url(#glow)" />
                        <path d="M50 10 L50 90 M10 50 L90 50" stroke="white" strokeWidth="0.5" strokeOpacity="0.5" />
                        {isActive && <circle cx="50" cy="50" r="2" fill="white" filter="url(#glow)" />}
                    </motion.g>
                )}

                {/* OBJECT 2: THE SPHERE (Liquid) */}
                {type === 'sphere' && (
                    <motion.g
                        animate={isThinking ? { scale: [1, 0.9, 1] } : { scale: [1, 1.03, 1] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                        style={{ transformOrigin: '50px 50px' }}
                    >
                        <circle cx="50" cy="50" r="30" fill={`url(#grad-${type})`} filter="url(#glow)" />
                        {/* Liquid highlights simulation */}
                        <motion.ellipse 
                            cx="50" cy="40" rx="15" ry="10" 
                            fill="white" fillOpacity="0.2" 
                            animate={{ ry: [10, 12, 10], cy: [40, 38, 40] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <circle cx="50" cy="50" r="30" stroke={strokeColor} strokeWidth="0.5" strokeOpacity="0.5" />
                    </motion.g>
                )}

                {/* OBJECT 3: THE TORUS (Ring) */}
                {type === 'torus' && (
                    <motion.g
                        variants={rotateVariant}
                        animate={isThinking ? "thinking" : "idle"}
                        style={{ transformOrigin: '50px 50px' }}
                    >
                        <ellipse cx="50" cy="50" rx="35" ry="12" fill="none" stroke={`url(#grad-${type})`} strokeWidth="4" />
                        <ellipse cx="50" cy="50" rx="35" ry="12" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.3" />
                        {/* Shimmer effect */}
                        <motion.circle cx="85" cy="50" r="2" fill="white" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} />
                    </motion.g>
                )}

                {/* OBJECT 4: THE GRID (Cubes) */}
                {type === 'grid' && (
                    <g transform="translate(50, 50)">
                        <motion.rect 
                            x="-10" y="-10" width="20" height="20" rx="2" 
                            fill={`url(#grad-${type})`} stroke={strokeColor} strokeWidth="0.5"
                            animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        />
                        {/* Satellites */}
                        {[
                            { x: -25, y: -10 }, { x: 5, y: -10 }, { x: -10, y: -25 }, { x: -10, y: 5 }
                        ].map((pos, i) => (
                            <motion.rect 
                                key={i}
                                x={pos.x} y={pos.y} width="20" height="20" rx="2"
                                fill={`url(#grad-${type})`} opacity="0.6"
                                animate={{ 
                                    x: i % 2 === 0 ? [pos.x, pos.x - 2, pos.x] : [pos.x, pos.x + 2, pos.x],
                                    y: i < 2 ? [pos.y, pos.y, pos.y] : [pos.y, pos.y + (i===2?-2:2), pos.y]
                                }} 
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                            />
                        ))}
                    </g>
                )}

                {/* OBJECT 5: THE FLAME (Particles) */}
                {type === 'flame' && (
                    <g transform="translate(50, 50)">
                        <motion.ellipse 
                            cx="0" cy="10" rx="15" ry="25" 
                            fill={`url(#grad-${type})`} filter="url(#glow)"
                            animate={{ ry: [25, 28, 25], cy: [10, 8, 10] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        />
                        {/* Particles */}
                        {[1, 2, 3].map((i) => (
                            <motion.circle 
                                key={i}
                                r={2 - i*0.5} 
                                fill="white"
                                initial={{ y: 0, opacity: 0 }}
                                animate={{ y: -40, opacity: [0, 1, 0] }}
                                transition={{ duration: 2 + i, repeat: Infinity, ease: "linear", delay: i * 0.5 }}
                            />
                        ))}
                    </g>
                )}
            </svg>
        </div>
    );
};

const getMentorShapeType = (id: string): string => {
    const lowerId = id.toLowerCase();
    if (lowerId.includes('peterson') || lowerId.includes('structure')) return 'crystal';
    if (lowerId.includes('bible') || lowerId.includes('spirit') || lowerId.includes('god')) return 'sphere';
    if (lowerId.includes('greene') || lowerId.includes('power') || lowerId.includes('strategy')) return 'grid';
    if (lowerId.includes('taleb') || lowerId.includes('chaos') || lowerId.includes('risk')) return 'flame';
    return 'torus'; // Default
};

// --- ARTIFACT CARDS ---

const FlashcardPreview = ({ front, back, onAccept }: { front: string, back: string, onAccept: () => void }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div className="w-full flex flex-col h-full bg-white dark:bg-[#1e293b] rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Dumbbell size={16} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Путь Знания</span>
                </div>
                <div className="text-[10px] font-mono text-slate-300">ID: SKILL-GEN</div>
            </div>
            
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center relative perspective-1000 min-h-[240px]">
                {/* BLUEPRINT GRID BACKGROUND */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                     style={{ backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                </div>

                <AnimatePresence mode="wait">
                    {!isFlipped ? (
                        <motion.div 
                            key="front"
                            initial={{ opacity: 0, rotateY: -90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: 90 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 p-8 flex flex-col items-center justify-center cursor-pointer"
                            onClick={() => setIsFlipped(true)}
                        >
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Вопрос / Концепт</span>
                            <div className="font-serif text-xl font-medium text-slate-800 dark:text-slate-100 leading-snug">
                                <ReactMarkdown components={markdownComponents}>{front}</ReactMarkdown>
                            </div>
                            <span className="absolute bottom-6 text-[10px] text-indigo-400 opacity-60 animate-pulse">Нажми, чтобы перевернуть</span>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="back"
                            initial={{ opacity: 0, rotateY: 90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            exit={{ opacity: 0, rotateY: -90 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-800/50"
                            onClick={() => setIsFlipped(false)}
                        >
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">Ответ / Принцип</span>
                            <div className="font-serif text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                                <ReactMarkdown components={markdownComponents}>{back}</ReactMarkdown>
                            </div>
                            <RotateCw size={14} className="absolute bottom-6 text-slate-300" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="p-4 bg-white dark:bg-[#1e293b] border-t border-slate-100 dark:border-slate-700">
                <button 
                    onClick={onAccept}
                    className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 group-hover:border-indigo-200 group-hover:text-indigo-600"
                >
                    В Скиллы <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};

const TaskPreview = ({ content, onAccept }: { content: string, onAccept: () => void }) => {
    return (
        <div className="w-full flex flex-col h-full bg-white dark:bg-[#1e293b] rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <Zap size={16} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Путь Действия</span>
                </div>
                <div className="text-[10px] font-mono text-slate-300">ID: ACTION-PLAN</div>
            </div>
            
            <div className="flex-1 p-8 flex flex-col justify-center min-h-[240px]">
                <div className="flex items-start gap-4">
                    <div className="mt-1 w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                    <div className="font-sans text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                        <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white dark:bg-[#1e293b] border-t border-slate-100 dark:border-slate-700">
                <button 
                    onClick={onAccept}
                    className="w-full py-3 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none"
                >
                    В Спринты <Play size={14} fill="currentColor" />
                </button>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const Sandbox: React.FC<Props> = ({ notes, config, onProcessNote, onAddTask, onAddFlashcard, deleteNote }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SandboxAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mentorId, setMentorId] = useState<string>(config.mentors[0]?.id || 'peterson');

  const incomingNotes = notes.filter(n => n.status === 'sandbox');

  const handleAnalyze = async () => {
      if (!selectedNoteId) return;
      const note = notes.find(n => n.id === selectedNoteId);
      if (!note) return;

      setIsAnalyzing(true);
      try {
        const result = await analyzeSandboxItem(note.content, mentorId, config);
        setAnalysis(result);
      } finally {
        setIsAnalyzing(false);
      }
  };

  const handleAcceptTask = () => {
    if (!analysis || !selectedNoteId) return;
    const originalNote = notes.find(n => n.id === selectedNoteId);
    onAddTask({
      id: Date.now().toString(),
      title: analysis.suggestedTask.split('\n')[0].substring(0, 50), // Fallback title
      content: analysis.suggestedTask,
      description: originalNote ? originalNote.content : undefined,
      column: 'todo',
      createdAt: Date.now()
    });
    alert("Задача создана!");
  };

  const handleAcceptCard = () => {
    if (!analysis || !selectedNoteId) return;
    onAddFlashcard({
      id: Date.now().toString(),
      front: analysis.suggestedFlashcardFront,
      back: analysis.suggestedFlashcardBack,
      level: 0,
      nextReview: Date.now()
    });
    alert("Навык добавлен!");
  };
  
  const handleArchive = () => {
      if (selectedNoteId) {
          if (window.confirm("Убрать заметку из Хаба в Архив?")) {
            onProcessNote(selectedNoteId);
            setAnalysis(null);
            setSelectedNoteId(null);
          }
      }
  };

  const currentMentor = config.mentors.find(m => m.id === mentorId);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 overflow-hidden font-sans relative">
        
        {/* HEADER (Sticky Glassmorphism) */}
        <div className="absolute top-0 left-0 right-0 z-30">
            <div className="absolute inset-0 h-[120%] bg-gradient-to-b from-[#f8fafc] via-[#f8fafc]/90 to-transparent dark:from-[#0f172a] dark:via-[#0f172a]/90 dark:to-transparent pointer-events-none" />
            <div className="relative z-10 px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Хаб</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-sans">Лаборатория смыслов</p>
                </div>
                {selectedNoteId && (
                    <button onClick={handleArchive} className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors backdrop-blur-sm">
                        <Archive size={14} /> В архив
                    </button>
                )}
            </div>
        </div>

        <div className="flex flex-1 pt-24 overflow-hidden z-10 max-w-7xl mx-auto w-full">
            
            {/* LEFT PANEL: INBOX */}
            <div className={`${selectedNoteId ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 flex-col border-r border-slate-100 dark:border-white/5 bg-transparent transition-all duration-500 pr-4 pb-4 pl-4 lg:pl-6`}>
                <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-sans flex items-center justify-between">
                    <span>Входящие мысли</span>
                    <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{incomingNotes.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar-light space-y-3">
                    {incomingNotes.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center opacity-40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                            <Box size={24} className="mb-2" />
                            <span className="text-xs font-medium">Хаб пуст</span>
                        </div>
                    ) : (
                        incomingNotes.map(note => (
                            <div 
                                key={note.id} 
                                onClick={() => { setSelectedNoteId(note.id); setAnalysis(null); }} 
                                className={`group p-4 rounded-2xl cursor-pointer transition-all border relative overflow-hidden ${
                                    selectedNoteId === note.id 
                                    ? 'bg-white dark:bg-[#1e293b] border-indigo-200 dark:border-indigo-900 shadow-md ring-1 ring-indigo-50 dark:ring-indigo-900/50' 
                                    : 'bg-white/50 dark:bg-white/5 border-transparent hover:bg-white dark:hover:bg-[#1e293b] hover:shadow-sm hover:border-slate-100 dark:hover:border-slate-700'
                                }`}
                            >
                                <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 font-sans mb-3 leading-relaxed">
                                    {note.content}
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-1">
                                        {note.tags.slice(0,2).map(t => <span key={t} className="text-[9px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{t.replace('#','')}</span>)}
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: WORKBENCH */}
            <div className="flex-1 flex flex-col relative overflow-hidden pl-0 lg:pl-8 pr-4 lg:pr-6 pb-6">
                
                {!selectedNoteId ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-700 select-none">
                        <Grid size={64} strokeWidth={0.5} className="mb-6 opacity-30" />
                        <p className="text-lg font-light text-slate-400">Выберите мысль для трансформации</p>
                    </div>
                ) : (
                    <div className="h-full flex flex-col min-h-0">
                        {/* 1. MENTOR SELECTION */}
                        <div className="flex items-center justify-center py-4 shrink-0 overflow-x-auto scrollbar-none mask-fade-sides min-h-[140px]">
                            <div className="flex items-center gap-8 px-8">
                                {config.mentors.map(m => {
                                    const isActive = mentorId === m.id;
                                    const shapeType = getMentorShapeType(m.id);
                                    return (
                                        <button 
                                            key={m.id} 
                                            onClick={() => setMentorId(m.id)}
                                            className="group flex flex-col items-center gap-3 outline-none focus:outline-none transition-all duration-300"
                                        >
                                            <AbstractShape 
                                                type={shapeType} 
                                                isActive={isActive} 
                                                isThinking={isActive && isAnalyzing} 
                                            />
                                            <div className={`text-[10px] font-bold uppercase tracking-widest transition-all duration-300 font-serif ${isActive ? 'text-slate-900 dark:text-white translate-y-0 opacity-100' : 'text-slate-400 translate-y-2 opacity-0 group-hover:opacity-50 group-hover:translate-y-0'}`}>
                                                {m.name}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. CONTENT AREA */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar-light relative">
                            <div className="max-w-4xl mx-auto w-full pb-20">
                                
                                {/* ACTION BUTTON */}
                                {!analysis && !isAnalyzing && (
                                    <div className="flex flex-col items-center justify-center py-10 animate-in fade-in slide-in-from-bottom-4">
                                        <button 
                                            onClick={handleAnalyze} 
                                            className="group relative px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform duration-300 shadow-xl rounded-2xl flex items-center gap-3"
                                        >
                                            <Sparkles size={18} />
                                            <span>Анализировать мысль</span>
                                        </button>
                                        <p className="mt-4 text-[10px] text-slate-400 uppercase tracking-widest">
                                            Активный ментор: <span className="font-bold text-slate-600 dark:text-slate-300 font-serif">{currentMentor?.name}</span>
                                        </p>
                                    </div>
                                )}

                                {/* LOADING */}
                                {isAnalyzing && (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                                        <div className="text-center font-sans text-xs uppercase tracking-widest text-slate-400">
                                            Синтез идей...
                                        </div>
                                    </div>
                                )}

                                {/* RESULTS */}
                                {analysis && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-8"
                                    >
                                        {/* ANALYSIS TEXT */}
                                        <div className="bg-white/80 dark:bg-white/5 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm backdrop-blur-sm relative overflow-hidden">
                                            <Quote size={40} className="absolute top-4 left-4 text-slate-100 dark:text-slate-800 -z-10" />
                                            <div className="font-serif text-lg md:text-xl leading-relaxed text-slate-800 dark:text-slate-100">
                                                <ReactMarkdown components={markdownComponents}>{analysis.analysis}</ReactMarkdown>
                                            </div>
                                            <div className="mt-6 flex justify-end">
                                                <button onClick={() => setAnalysis(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                                    <RotateCw size={12} /> Сбросить
                                                </button>
                                            </div>
                                        </div>

                                        {/* ARTIFACTS GRID */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FlashcardPreview 
                                                front={analysis.suggestedFlashcardFront}
                                                back={analysis.suggestedFlashcardBack}
                                                onAccept={handleAcceptCard}
                                            />
                                            <TaskPreview 
                                                content={analysis.suggestedTask}
                                                onAccept={handleAcceptTask}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
export default Sandbox;
