
import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, Task, Flashcard, AppConfig } from '../types';
import { analyzeSandboxItem, SandboxAnalysis } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import { Sparkles, Diamond, ArrowRight, Zap, Loader2, RotateCw, X, Trash2, Box, Briefcase, Sprout, Heart, Grid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from './Tooltip';

interface Props {
  notes: Note[];
  tasks: Task[];
  flashcards: Flashcard[];
  config: AppConfig;
  onProcessNote: (noteId: string) => void;
  onAddTask: (task: Task) => void;
  onAddFlashcard: (card: Flashcard) => void;
  deleteNote: (id: string) => void;
}

// --- UTILS ---
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-4 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed font-serif text-lg" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-500 underline decoration-1 underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400 font-serif" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400 font-serif" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="text-2xl font-serif font-bold mt-6 mb-3 text-slate-900 dark:text-white tracking-tight" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl font-serif font-bold mt-5 mb-2 text-slate-900 dark:text-white tracking-tight" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-indigo-500/30 pl-4 py-1 my-4 text-slate-500 italic font-serif" {...props} />,
};

// --- VISUAL COMPONENTS ---

const DotGridBackground = () => (
    <div 
        className="absolute inset-0 pointer-events-none opacity-[0.4] dark:opacity-[0.1]" 
        style={{ 
            backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', 
            backgroundSize: '24px 24px'
        }} 
    />
);

interface AuraRingProps {
    sphere: typeof SPHERES[0];
    activeCount: number;
    colorClass: string;
}

const AuraRing: React.FC<AuraRingProps> = ({ sphere, activeCount, colorClass }) => {
    // Pulse animation intensity based on count
    const pulseScale = 1 + Math.min(0.2, activeCount * 0.02);
    
    return (
        <div className="flex flex-col items-center gap-3 relative group cursor-default">
            <div className="relative w-16 h-16 flex items-center justify-center">
                {/* Glow */}
                <motion.div 
                    animate={{ scale: [1, pulseScale, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute inset-0 rounded-full blur-xl ${sphere.bg.replace('50', '200').replace('dark:bg-', 'dark:bg-').replace('/30', '/20')}`}
                />
                
                {/* Ring */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-800" />
                    <motion.circle 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: Math.min(1, activeCount / 10) }} // 10 tasks = full ring
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        cx="32" cy="32" r="30" 
                        fill="none" stroke="currentColor" strokeWidth="1.5" 
                        className={colorClass}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Icon */}
                <div className={`absolute inset-0 flex items-center justify-center ${colorClass}`}>
                    {React.createElement(ICON_MAP[sphere.icon], { size: 20, strokeWidth: 1.5 })}
                </div>
            </div>
            
            <div className="text-center">
                <div className="font-sans text-[10px] font-bold uppercase tracking-widest text-slate-400">{sphere.label}</div>
                <div className="font-mono text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">{String(activeCount).padStart(2, '0')} ACT</div>
            </div>
        </div>
    );
};

interface GlassPodProps {
    children?: React.ReactNode;
    className?: string;
}

const GlassPod: React.FC<GlassPodProps> = ({ children, className = "" }) => (
    <div className={`bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-3xl shadow-sm ${className}`}>
        {children}
    </div>
);

// --- MAIN COMPONENT ---

const Sandbox: React.FC<Props> = ({ notes, tasks, flashcards, config, onProcessNote, onAddTask, onAddFlashcard, deleteNote }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SandboxAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mentorId, setMentorId] = useState<string>(config.mentors[0]?.id || 'peterson');

  const incomingNotes = useMemo(() => notes.filter(n => n.status === 'sandbox'), [notes]);
  const activeNote = useMemo(() => notes.find(n => n.id === selectedNoteId), [notes, selectedNoteId]);

  // Sphere Stats Calculation
  const sphereStats = useMemo(() => {
      const stats = { productivity: 0, growth: 0, relationships: 0 };
      // Count active tasks per sphere
      tasks.forEach(t => {
          if (!t.isArchived && t.column !== 'done') {
              t.spheres?.forEach(s => {
                  if (stats[s as keyof typeof stats] !== undefined) {
                      stats[s as keyof typeof stats]++;
                  }
              });
          }
      });
      return stats;
  }, [tasks]);

  // Transformation Flow Data (Mock for now, or derived)
  const flowData = useMemo(() => {
      // Simple logic: Tasks created last 7 days from Sandbox notes?
      // Just visually represent "Recent Creations"
      const recentTasks = tasks.filter(t => t.createdAt > Date.now() - 7 * 86400000).length;
      const recentSkills = flashcards.length; // Simplified
      return [2, 4, 3, 5, recentTasks, 4, 6]; // Mock curve
  }, [tasks, flashcards]);

  const handleAnalyze = async () => {
      if (!activeNote) return;
      setIsAnalyzing(true);
      try {
        const result = await analyzeSandboxItem(activeNote.content, mentorId, config);
        setAnalysis(result);
      } finally {
        setIsAnalyzing(false);
      }
  };

  const handleAcceptTask = () => {
    if (!analysis || !activeNote) return;
    onAddTask({
      id: Date.now().toString(),
      title: analysis.suggestedTask.split('\n')[0].substring(0, 50),
      content: analysis.suggestedTask,
      description: activeNote.content,
      column: 'todo',
      createdAt: Date.now()
    });
    // Archive note after processing? Optional. Keeping in Sandbox for now or user manually archives.
    if(confirm("Задача создана. Архивировать мысль?")) {
        onProcessNote(activeNote.id);
        setSelectedNoteId(null);
        setAnalysis(null);
    }
  };

  const handleAcceptCard = () => {
    if (!analysis) return;
    onAddFlashcard({
      id: Date.now().toString(),
      front: analysis.suggestedFlashcardFront,
      back: analysis.suggestedFlashcardBack,
      level: 0,
      nextReview: Date.now()
    });
    alert("Навык добавлен в ментальный спортзал.");
  };

  return (
    <div className="flex h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden relative">
        <DotGridBackground />
        
        {/* LEFT PANEL: KNOWLEDGE INCUBATOR (Vertical Timeline) */}
        <div className="w-80 flex flex-col border-r border-slate-200/50 dark:border-white/5 bg-white/30 dark:bg-[#0f172a]/30 backdrop-blur-sm z-10">
            <div className="p-6 pb-2 border-b border-slate-100 dark:border-white/5">
                <h2 className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-1">Инкубатор</h2>
                <div className="flex justify-between items-center">
                    <span className="font-sans text-[10px] uppercase tracking-widest text-slate-400">Входящие мысли</span>
                    <span className="font-mono text-[10px] text-slate-300 dark:text-slate-600">{incomingNotes.length}</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar-ghost p-6 relative">
                {/* Timeline Line */}
                <div className="absolute left-9 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/5" />
                
                {incomingNotes.length === 0 ? (
                    <div className="text-center py-10 opacity-40">
                        <Box size={24} className="mx-auto mb-2 text-slate-400" strokeWidth={1} />
                        <p className="text-xs font-serif text-slate-500">Пустота</p>
                    </div>
                ) : (
                    incomingNotes.map((note, idx) => (
                        <div key={note.id} className="relative pl-8 mb-8 group">
                            {/* Node Point */}
                            <div 
                                className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 z-10 ${selectedNoteId === note.id ? 'bg-indigo-500 border-indigo-500 scale-125' : 'bg-[#f8fafc] dark:bg-[#0f172a] border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}`}
                            />
                            
                            <button 
                                onClick={() => { setSelectedNoteId(note.id); setAnalysis(null); }}
                                className={`text-left w-full transition-all duration-300 ${selectedNoteId === note.id ? 'opacity-100' : 'opacity-60 hover:opacity-90'}`}
                            >
                                <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-2">
                                    {new Date(note.createdAt).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}
                                    <Sparkles size={8} className={selectedNoteId === note.id ? "text-indigo-500" : "text-transparent"} />
                                </div>
                                <div className={`text-sm font-serif leading-snug line-clamp-3 ${selectedNoteId === note.id ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {note.content}
                                </div>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* MAIN PANEL: THE WORKBENCH */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
            
            {/* SPHERES DASHBOARD (Floating Top) */}
            <div className="shrink-0 pt-8 px-8 pb-4 flex justify-center z-20">
                <GlassPod className="px-10 py-6 flex gap-12 md:gap-16 items-center">
                    {SPHERES.map(sphere => (
                        <AuraRing 
                            key={sphere.id} 
                            sphere={sphere} 
                            activeCount={sphereStats[sphere.id as keyof typeof sphereStats]} 
                            colorClass={sphere.text}
                        />
                    ))}
                </GlassPod>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light p-8 pb-24 relative z-10 flex flex-col items-center">
                
                <AnimatePresence mode="wait">
                    {!selectedNoteId ? (
                        <motion.div 
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl"
                        >
                            <div className="text-center mb-12">
                                <h1 className="font-serif text-3xl md:text-4xl text-slate-800 dark:text-slate-200 mb-2 tracking-tight">Точка Сборки</h1>
                                <p className="font-sans text-xs uppercase tracking-[0.2em] text-slate-400">Лаборатория смыслов</p>
                            </div>

                            {/* Minimalist Flow Chart */}
                            <div className="w-full h-32 relative">
                                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="transparent" />
                                            <stop offset="50%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="transparent" />
                                        </linearGradient>
                                    </defs>
                                    <path 
                                        d={`M 0,100 ${flowData.map((v, i) => `L ${i * (100 / (flowData.length - 1))}%,${100 - v * 15}`).join(' ')}`}
                                        fill="none" 
                                        stroke="url(#lineGrad)" 
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                    {flowData.map((v, i) => (
                                        <circle 
                                            key={i} 
                                            cx={`${i * (100 / (flowData.length - 1))}%`} 
                                            cy={100 - v * 15} 
                                            r="2" 
                                            className="fill-slate-900 dark:fill-white"
                                        />
                                    ))}
                                </svg>
                                <div className="text-center mt-4 font-mono text-[9px] text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                                    Transformation Flow (7 Days)
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="workbench"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-3xl"
                        >
                            {/* NOTE CONTENT */}
                            <div className="mb-12 relative">
                                <div className="absolute -left-6 top-0 bottom-0 border-l border-indigo-500/20" />
                                <div className="font-serif text-xl md:text-2xl leading-relaxed text-slate-800 dark:text-slate-100 pl-6">
                                    <ReactMarkdown components={markdownComponents}>{activeNote?.content || ''}</ReactMarkdown>
                                </div>
                                <div className="pl-6 mt-4 flex gap-2">
                                    {activeNote?.tags.map(t => (
                                        <span key={t} className="font-mono text-[10px] text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* MENTOR SELECTION */}
                            {!analysis && !isAnalyzing && (
                                <div className="flex flex-col items-center gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex gap-4 overflow-x-auto pb-4 max-w-full justify-center">
                                        {config.mentors.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setMentorId(m.id)}
                                                className={`group relative p-1 rounded-full transition-all duration-300 ${mentorId === m.id ? 'scale-110 ring-1 ring-indigo-200 dark:ring-indigo-800' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm ${mentorId === m.id ? 'shadow-indigo-500/20' : ''}`}>
                                                    {/* Ideally abstract shape, using Icon for now but styled cleanly */}
                                                    {React.createElement(ICON_MAP[m.icon] || ICON_MAP['User'], { 
                                                        size: 18, 
                                                        className: m.color,
                                                        strokeWidth: 1.5 
                                                    })}
                                                </div>
                                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-slate-500">
                                                    {m.name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <button 
                                        onClick={handleAnalyze}
                                        className="group flex items-center gap-3 px-8 py-3 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Синтез</span>
                                    </button>
                                </div>
                            )}

                            {/* LOADING */}
                            {isAnalyzing && (
                                <div className="flex flex-col items-center py-12">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-2 border-indigo-100 dark:border-slate-800 animate-ping absolute inset-0" />
                                        <div className="w-12 h-12 rounded-full border-2 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                                    </div>
                                    <div className="mt-4 font-mono text-[10px] text-slate-400 uppercase tracking-widest animate-pulse">
                                        Processing Logic...
                                    </div>
                                </div>
                            )}

                            {/* ANALYSIS RESULT */}
                            {analysis && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-8"
                                >
                                    {/* Verdict */}
                                    <GlassPod className="p-8 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                                        <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-indigo-500 mb-4 flex items-center gap-2">
                                            <Zap size={14} /> Вердикт
                                        </h3>
                                        <div className="font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200">
                                            <ReactMarkdown components={markdownComponents}>{analysis.analysis}</ReactMarkdown>
                                        </div>
                                        <div className="mt-6 flex justify-end">
                                            <button onClick={() => setAnalysis(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                                                <RotateCw size={16} />
                                            </button>
                                        </div>
                                    </GlassPod>

                                    {/* Artifacts */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Task Artifact */}
                                        <div className="group bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-emerald-400/50 transition-colors relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Zap size={80} />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-3">Action Protocol</div>
                                                <div className="font-sans text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-6 line-clamp-4">
                                                    <ReactMarkdown components={markdownComponents}>{analysis.suggestedTask}</ReactMarkdown>
                                                </div>
                                                <button onClick={handleAcceptTask} className="w-full py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 transition-all flex items-center justify-center gap-2">
                                                    Принять задачу <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Skill Artifact */}
                                        <div className="group bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-indigo-400/50 transition-colors relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Diamond size={80} />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Neural Node</div>
                                                <div className="font-serif text-lg text-slate-800 dark:text-slate-100 mb-2">{analysis.suggestedFlashcardFront}</div>
                                                <div className="h-px w-full bg-slate-100 dark:bg-white/5 my-3" />
                                                <div className="font-serif text-sm text-slate-500 italic mb-6 line-clamp-3">{analysis.suggestedFlashcardBack}</div>
                                                
                                                <button onClick={handleAcceptCard} className="w-full py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 transition-all flex items-center justify-center gap-2">
                                                    Кристаллизовать <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    </div>
  );
};

export default Sandbox;
