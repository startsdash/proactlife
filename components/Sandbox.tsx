
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, Task, Flashcard, AppConfig } from '../types';
import { analyzeSandboxItem, SandboxAnalysis } from '../services/geminiService';
import { ICON_MAP } from '../constants';
import EmptyState from './EmptyState';
import { CheckSquare, Library, Loader2, Quote, BrainCircuit, ArrowLeft, Tag, Archive, Trash2, Dumbbell, Box, Cpu, Grid, Layers, Terminal, Activity, Zap, Aperture, Disc, Hexagon, Triangle, Square, Circle } from 'lucide-react';
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

// --- UTILS ---
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
    p: ({node, ...props}: any) => <p className="mb-3 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed font-light" {...props} />,
    a: ({node, ...props}: any) => <a className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 underline decoration-1 underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-none pl-0 mb-4 space-y-2 text-slate-700 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-slate-700 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-4 border-l border-slate-200 dark:border-slate-700" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-lg font-medium mt-6 mb-3 text-slate-900 dark:text-white uppercase tracking-widest font-mono" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-base font-medium mt-5 mb-2 text-slate-900 dark:text-white uppercase tracking-widest font-mono opacity-80" {...props}>{cleanHeader(children)}</h2>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-cyan-500/50 pl-4 py-1 my-4 text-slate-600 dark:text-slate-400 italic bg-cyan-500/5 dark:bg-cyan-500/10" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-white/10 uppercase tracking-wide" {...props}>{children}</code>
            : <code className="block bg-slate-900 dark:bg-black text-slate-50 p-4 rounded-none border-l-2 border-cyan-500 text-xs font-mono my-4 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

// --- 3D SHAPE COMPONENTS ---
// Procedural SVG shapes to represent mentors abstractly
const MentorShape = ({ type, color, isActive }: { type: string, color: string, isActive: boolean }) => {
    // Map Tailwind text colors to hex for SVG fills
    const getColorHex = (twClass: string) => {
        if (twClass.includes('indigo')) return '#6366f1';
        if (twClass.includes('emerald')) return '#10b981';
        if (twClass.includes('amber')) return '#f59e0b';
        if (twClass.includes('blue')) return '#3b82f6';
        if (twClass.includes('purple')) return '#a855f7';
        if (twClass.includes('red')) return '#ef4444';
        if (twClass.includes('cyan')) return '#06b6d4';
        return '#94a3b8'; // slate
    };

    const baseColor = getColorHex(color);
    
    return (
        <div className={`relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center transition-all duration-500 ${isActive ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'opacity-70 grayscale hover:grayscale-0 hover:opacity-100'}`}>
            <motion.div
                animate={{ 
                    y: isActive ? [0, -5, 0] : 0,
                    rotate: isActive ? [0, 5, -5, 0] : 0
                }}
                transition={{ 
                    repeat: Infinity, 
                    duration: 4, 
                    ease: "easeInOut" 
                }}
            >
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id={`grad-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={baseColor} stopOpacity="0.8" />
                            <stop offset="100%" stopColor={baseColor} stopOpacity="0.2" />
                        </linearGradient>
                        <filter id="glass">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
                            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                        </filter>
                    </defs>
                    
                    {/* CUBE (Structure/Order) */}
                    {type === 'cube' && (
                        <g transform="translate(50, 50)">
                            <path d="M0,-30 L26,-15 L26,15 L0,30 L-26,15 L-26,-15 Z" fill={`url(#grad-${type})`} stroke={baseColor} strokeWidth="1" className="dark:stroke-white/20" />
                            <path d="M0,-30 L26,-15 M0,0 L26,15 M0,0 L-26,15 M0,0 L0,-30" stroke={baseColor} strokeWidth="0.5" className="dark:stroke-white/40" />
                        </g>
                    )}

                    {/* SPHERE (Wholeness/Spirit) */}
                    {type === 'sphere' && (
                        <circle cx="50" cy="50" r="28" fill={`url(#grad-${type})`} stroke={baseColor} strokeWidth="1" className="dark:stroke-white/20" />
                    )}

                    {/* PYRAMID (Hierarchy/Power) */}
                    {type === 'pyramid' && (
                        <g transform="translate(50, 55)">
                            <path d="M0,-35 L30,15 L-30,15 Z" fill={`url(#grad-${type})`} stroke={baseColor} strokeWidth="1" className="dark:stroke-white/20" />
                            <path d="M0,-35 L0,15" stroke={baseColor} strokeWidth="0.5" className="dark:stroke-white/40" />
                        </g>
                    )}

                    {/* OCTAHEDRON (Complexity/Strategy) */}
                    {type === 'octahedron' && (
                        <g transform="translate(50, 50)">
                            <path d="M0,-35 L25,0 L0,35 L-25,0 Z" fill={`url(#grad-${type})`} stroke={baseColor} strokeWidth="1" className="dark:stroke-white/20" />
                            <path d="M-25,0 L25,0 M0,-35 L0,35" stroke={baseColor} strokeWidth="0.5" className="dark:stroke-white/40" />
                        </g>
                    )}

                    {/* CYLINDER (Stoicism/Endurance) */}
                    {type === 'cylinder' && (
                        <g transform="translate(50, 50)">
                            <ellipse cx="0" cy="-20" rx="20" ry="8" fill="none" stroke={baseColor} strokeWidth="1" className="dark:stroke-white/20" />
                            <path d="M-20,-20 L-20,20 A20,8 0 0,0 20,20 L20,-20" fill={`url(#grad-${type})`} stroke={baseColor} strokeWidth="1" className="dark:stroke-white/20" />
                            <ellipse cx="0" cy="-20" rx="20" ry="8" fill={`url(#grad-${type})`} className="opacity-50" />
                        </g>
                    )}
                </svg>
            </motion.div>
        </div>
    );
};

const getMentorShapeType = (id: string): string => {
    if (id.includes('peterson') || id.includes('structure')) return 'cube';
    if (id.includes('bible') || id.includes('spirit')) return 'sphere';
    if (id.includes('greene') || id.includes('power')) return 'pyramid';
    if (id.includes('taleb') || id.includes('chaos')) return 'octahedron';
    return 'cylinder'; // Default
};

const Sandbox: React.FC<Props> = ({ notes, config, onProcessNote, onAddTask, onAddFlashcard, deleteNote }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SandboxAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mentorId, setMentorId] = useState<string>(config.mentors[0]?.id || 'peterson');

  const incomingNotes = notes.filter(n => n.status === 'sandbox');

  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
      if (!selectedNoteId) return;
      const note = notes.find(n => n.id === selectedNoteId);
      if (!note) return;

      setIsAnalyzing(true);
      const result = await analyzeSandboxItem(note.content, mentorId, config);
      setAnalysis(result);
      setIsAnalyzing(false);
  };

  const handleAcceptTask = () => {
    if (!analysis || !selectedNoteId) return;
    const originalNote = notes.find(n => n.id === selectedNoteId);
    onAddTask({
      id: Date.now().toString(),
      content: analysis.suggestedTask,
      description: originalNote ? originalNote.content : undefined,
      column: 'todo',
      createdAt: Date.now()
    });
    alert("Protocol Initiated: Task Created.");
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
    alert("Knowledge Encoded: Skill Created.");
  };
  
  const handleArchive = () => {
      if (selectedNoteId) {
          if (window.confirm("Archive raw data?")) {
            onProcessNote(selectedNoteId);
            setAnalysis(null);
            setSelectedNoteId(null);
          }
      }
  };

  const currentMentor = config.mentors.find(m => m.id === mentorId);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#050505] text-slate-800 dark:text-slate-200 overflow-hidden font-sans relative">
        
        {/* GRID BACKGROUND */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
             style={{ backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(to right, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />

        {/* HEADER */}
        <header className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center z-10 bg-white/50 dark:bg-black/50 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg">
                    <Aperture size={20} />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-widest uppercase font-mono">Laboratory <span className="text-cyan-600 dark:text-cyan-400">//</span> Neural Link</h1>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider">SECURE CONNECTION ESTABLISHED</p>
                </div>
            </div>
            
            {selectedNoteId && (
                <div className="hidden md:flex items-center gap-4">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Target ID: {selectedNoteId.slice(-6)}</span>
                    <button onClick={handleArchive} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                        <Archive size={14} /> Archive Raw Data
                    </button>
                </div>
            )}
        </header>

        <div className="flex flex-1 overflow-hidden z-10">
            
            {/* LEFT PANEL: DATA FEED (INBOX) */}
            <div className={`${selectedNoteId ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 flex-col border-r border-slate-200 dark:border-white/10 bg-white/30 dark:bg-black/20 backdrop-blur-sm transition-all duration-500`}>
                <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono flex items-center gap-2">
                        <Activity size={12} className="text-cyan-500" /> Input Stream
                    </span>
                    <span className="text-[10px] font-mono bg-slate-200 dark:bg-white/10 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{incomingNotes.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar-light p-2 space-y-1">
                    {incomingNotes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <Disc size={32} className="mb-2 animate-spin-slow" />
                            <span className="text-xs font-mono uppercase">No Signal</span>
                        </div>
                    ) : (
                        incomingNotes.map(note => (
                            <div 
                                key={note.id} 
                                onClick={() => handleSelectNote(note)} 
                                className={`group p-3 rounded border cursor-pointer transition-all relative overflow-hidden ${selectedNoteId === note.id ? 'bg-white dark:bg-white/10 border-cyan-500/50 shadow-lg' : 'bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/5'}`}
                            >
                                {selectedNoteId === note.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-500 shadow-[0_0_10px_#06b6d4]" />}
                                <div className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 font-mono mb-2 leading-relaxed opacity-80 group-hover:opacity-100">
                                    {note.content}
                                </div>
                                <div className="flex justify-between items-center opacity-50 group-hover:opacity-100 transition-opacity">
                                    <div className="flex gap-1">
                                        {note.tags.slice(0,2).map(t => <span key={t} className="text-[9px] uppercase font-bold tracking-wider text-cyan-600 dark:text-cyan-400">#{t.replace('#','')}</span>)}
                                    </div>
                                    <span className="text-[9px] font-mono">{new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: SYNTHESIS CHAMBER */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50 dark:bg-black/40">
                
                {/* 1. MENTOR SELECTION (TOP) */}
                <div className="h-32 md:h-40 border-b border-slate-200 dark:border-white/10 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-100/50 dark:to-black/50 pointer-events-none" />
                    
                    <div className="flex items-center gap-4 md:gap-12 px-8 overflow-x-auto scrollbar-none snap-x w-full justify-center">
                        {config.mentors.map(m => {
                            const isActive = mentorId === m.id;
                            const shapeType = getMentorShapeType(m.id);
                            return (
                                <button 
                                    key={m.id} 
                                    onClick={() => setMentorId(m.id)}
                                    className="snap-center flex flex-col items-center gap-2 group outline-none focus:outline-none"
                                >
                                    <MentorShape type={shapeType} color={m.color} isActive={isActive} />
                                    <div className={`text-[10px] font-bold uppercase tracking-widest transition-all duration-300 font-mono ${isActive ? 'text-slate-900 dark:text-white translate-y-0 opacity-100' : 'text-slate-400 translate-y-2 opacity-0 group-hover:opacity-50 group-hover:translate-y-0'}`}>
                                        {m.name}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. WORKBENCH (CENTER) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar-light relative p-4 md:p-12">
                    {!selectedNoteId ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-700 select-none pointer-events-none">
                            <Grid size={64} strokeWidth={0.5} className="mb-4 opacity-50" />
                            <p className="text-sm font-mono uppercase tracking-widest opacity-50">Select Data Stream to Initialize</p>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto w-full space-y-12">
                            
                            {/* ACTION BAR */}
                            {!analysis && !isAnalyzing && (
                                <div className="flex flex-col items-center justify-center py-10 animate-in fade-in slide-in-from-bottom-4">
                                    <button 
                                        onClick={handleAnalyze} 
                                        className="group relative px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-black font-mono text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform duration-300 shadow-xl"
                                    >
                                        <span className="relative z-10 flex items-center gap-2">
                                            <Zap size={16} /> Initiate Synthesis
                                        </span>
                                        <div className="absolute inset-0 bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    </button>
                                    <p className="mt-4 text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                                        Active Protocol: <span className={currentMentor?.color}>{currentMentor?.name}</span>
                                    </p>
                                </div>
                            )}

                            {/* LOADING STATE */}
                            {isAnalyzing && (
                                <div className="flex flex-col items-center justify-center py-20 space-y-6">
                                    <div className="relative w-16 h-16">
                                        <div className="absolute inset-0 border-t-2 border-cyan-500 rounded-full animate-spin"></div>
                                        <div className="absolute inset-2 border-r-2 border-indigo-500 rounded-full animate-spin-reverse"></div>
                                        <div className="absolute inset-4 border-b-2 border-emerald-500 rounded-full animate-spin"></div>
                                    </div>
                                    <div className="text-center font-mono text-xs uppercase tracking-widest space-y-1">
                                        <div className="text-slate-800 dark:text-white animate-pulse">Processing Data...</div>
                                        <div className="text-slate-400 text-[10px]">Analyzing Patterns // Generating Synthesis</div>
                                    </div>
                                </div>
                            )}

                            {/* RESULTS */}
                            {analysis && (
                                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                    
                                    {/* SYNTHESIS HEADER */}
                                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
                                            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white font-mono">Data Synthesis Complete</h3>
                                        </div>
                                        <button onClick={() => setAnalysis(null)} className="text-xs font-mono text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-wider">
                                            [ Reset ]
                                        </button>
                                    </div>

                                    {/* ANALYSIS TEXT */}
                                    <div className="bg-white/50 dark:bg-white/5 border-l-2 border-slate-900 dark:border-white p-6 backdrop-blur-sm">
                                        <div className="font-sans text-base md:text-lg leading-relaxed text-slate-800 dark:text-slate-200 font-light">
                                            <ReactMarkdown components={markdownComponents}>{analysis.analysis}</ReactMarkdown>
                                        </div>
                                    </div>

                                    {/* ACTION CARDS */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        
                                        {/* BLUEPRINT CARD (Path of Knowledge) */}
                                        <div className="relative group bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 flex flex-col justify-between min-h-[280px] overflow-hidden">
                                            {/* Grid Background */}
                                            <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0" 
                                                 style={{ backgroundImage: 'linear-gradient(to right, #808080 1px, transparent 1px), linear-gradient(to bottom, #808080 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
                                            />
                                            
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-500 border border-blue-500/30 px-2 py-1 bg-blue-500/10">
                                                        Fig 1.1 // Blueprint
                                                    </div>
                                                    <BrainCircuit className="text-blue-500/50" size={24} />
                                                </div>
                                                
                                                <div className="mb-4">
                                                    <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Concept (Side A)</div>
                                                    <div className="font-sans text-sm text-slate-800 dark:text-white font-medium">
                                                        <ReactMarkdown components={markdownComponents}>{analysis.suggestedFlashcardFront}</ReactMarkdown>
                                                    </div>
                                                </div>
                                                <div className="w-full h-px bg-slate-300 dark:bg-white/10 my-4 relative">
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-slate-400 rounded-full" />
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-slate-400 rounded-full" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">Principle (Side B)</div>
                                                    <div className="font-sans text-sm text-slate-600 dark:text-slate-300">
                                                        <ReactMarkdown components={markdownComponents}>{analysis.suggestedFlashcardBack}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={handleAcceptCard} 
                                                className="mt-6 w-full py-3 border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 relative z-10"
                                            >
                                                <Dumbbell size={14} /> Construct Skill
                                            </button>
                                        </div>

                                        {/* PROCESS CARD (Path of Action) */}
                                        <div className="relative group bg-slate-900 dark:bg-black border border-slate-800 dark:border-white/10 p-6 flex flex-col justify-between min-h-[280px]">
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                                        <span className="w-2 h-2 bg-emerald-500 animate-pulse" />
                                                        Process::Running
                                                    </div>
                                                    <Terminal className="text-emerald-500/50" size={24} />
                                                </div>

                                                <div className="font-mono text-xs text-emerald-500/70 mb-2">$ cat actionable_step.txt</div>
                                                <div className="font-mono text-sm text-slate-200 leading-relaxed border-l-2 border-emerald-500 pl-4 py-1 mb-6">
                                                    <ReactMarkdown components={{...markdownComponents, p: ({node, ...props}: any) => <p className="mb-0 text-slate-200" {...props} />}}>{analysis.suggestedTask}</ReactMarkdown>
                                                </div>
                                                
                                                <div className="grid grid-cols-4 gap-1 opacity-30">
                                                    <div className="h-1 bg-emerald-500 rounded-full" />
                                                    <div className="h-1 bg-emerald-500 rounded-full" />
                                                    <div className="h-1 bg-emerald-500 rounded-full" />
                                                    <div className="h-1 bg-slate-700 rounded-full" />
                                                </div>
                                            </div>

                                            <button 
                                                onClick={handleAcceptTask} 
                                                className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white transition-colors font-mono text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                            >
                                                <CheckSquare size={14} /> Execute Protocol
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
export default Sandbox;
