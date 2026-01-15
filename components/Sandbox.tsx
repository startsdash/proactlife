
// ... imports ... (Keep existing imports)
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
  
  // Crystallization Animation State
  const [crystallizationState, setCrystallizationState] = useState<'idle' | 'collapsing' | 'shooting' | 'done'>('idle');

  const incomingNotes = useMemo(() => notes.filter(n => n.status === 'sandbox'), [notes]);
  const activeNote = useMemo(() => notes.find(n => n.id === selectedNoteId), [notes, selectedNoteId]);

  const flowData = useMemo(() => {
      const recentTasks = tasks.filter(t => t.createdAt > Date.now() - 7 * 86400000).length;
      return [2, 4, 3, 5, recentTasks, 4, 6]; 
  }, [tasks, flashcards]);

  const handleAnalyze = async () => {
      if (!activeNote) return;
      setIsAnalyzing(true);
      try {
        const result = await analyzeSandboxItem(activeNote.content, mentorId, config);
        // Only set result if we are still analyzing (user didn't cancel)
        setIsAnalyzing(prev => {
            if (prev) {
                setAnalysis(result);
                return false;
            }
            return false;
        });
      } catch (e) {
        setIsAnalyzing(false);
      }
  };

  const handleStopAnalysis = () => {
      setIsAnalyzing(false);
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
    
    // UPDATED: Keep note in sandbox, just notify user
    alert("Задача создана");
  };

  const handleAcceptCard = () => {
    if (!analysis) return;
    
    // Start Animation Sequence
    setCrystallizationState('collapsing');
    
    setTimeout(() => {
        setCrystallizationState('shooting');
        
        // Finalize Logic
        setTimeout(() => {
            onAddFlashcard({
              id: Date.now().toString(),
              front: analysis.suggestedFlashcardFront,
              back: analysis.suggestedFlashcardBack,
              level: 0,
              nextReview: Date.now()
            });
            setCrystallizationState('done');
            setTimeout(() => {
                setCrystallizationState('idle');
                setAnalysis(null); // Reset UI
            }, 500);
        }, 800); // Wait for shooting animation
    }, 1000); // Wait for collapse
  };

  return (
    <div className="flex h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden relative">
        <DotGridBackground />
        
        {/* ANIMATION OVERLAY */}
        <AnimatePresence>
            {crystallizationState !== 'idle' && (
                <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                    {crystallizationState === 'collapsing' && (
                        <motion.div
                            initial={{ scale: 2, opacity: 0 }}
                            animate={{ scale: 0.1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.8, ease: "anticipate" }}
                            className="w-32 h-32 bg-white dark:bg-white rounded-full shadow-[0_0_50px_rgba(255,255,255,0.8)] blur-md flex items-center justify-center"
                        >
                            <div className="w-full h-full bg-indigo-500 rounded-full animate-ping" />
                        </motion.div>
                    )}
                    
                    {crystallizationState === 'shooting' && (
                        <motion.div
                            initial={{ width: 0, opacity: 1, x: 0 }}
                            animate={{ width: 1000, opacity: 0, x: -500 }} // Shoot left towards sidebar
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-1 bg-gradient-to-l from-white via-indigo-400 to-transparent shadow-[0_0_20px_white]"
                        />
                    )}
                </div>
            )}
        </AnimatePresence>

        {/* XYZ TRACKER (Subjectivity Counter) */}
        <div className="absolute top-6 right-6 z-30 flex flex-col items-end pointer-events-none select-none">
            <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-1 opacity-70">Transformation Ratio</span>
            <div className="font-mono text-xl text-slate-700 dark:text-slate-300">
                {String(notes.length).padStart(2,'0')} <span className="text-slate-300 dark:text-slate-600">/</span> {String(flashcards.length).padStart(2,'0')}
            </div>
        </div>

        {/* LEFT PANEL: HUB (Vertical Timeline) */}
        <div className="w-80 flex flex-col border-r border-slate-200/50 dark:border-white/5 bg-white/30 dark:bg-[#0f172a]/30 backdrop-blur-sm z-10">
            <div className="px-6 pt-8 pb-6 border-b border-slate-100 dark:border-white/5">
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Хаб</h1>
                <div className="flex justify-between items-center mt-2">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">Коворкинг с лучшими</p>
                    <span className="font-mono text-[10px] text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{incomingNotes.length}</span>
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
                            
                            {/* Delete Button */}
                            <Tooltip 
                                content="Удалить мысль"
                                className="absolute right-0 top-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if(confirm('Удалить мысль?')) {
                                            deleteNote(note.id);
                                            if (selectedNoteId === note.id) {
                                                setSelectedNoteId(null);
                                                setAnalysis(null);
                                            }
                                        }
                                    }}
                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </Tooltip>

                            <button 
                                onClick={() => { setSelectedNoteId(note.id); setAnalysis(null); }}
                                className={`text-left w-full transition-all duration-300 pr-6 ${selectedNoteId === note.id ? 'opacity-100' : 'opacity-60 hover:opacity-90'}`}
                            >
                                <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-2">
                                    {new Date(note.createdAt).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}
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
                            {/* NOTE CONTENT - INCOMING THOUGHT BLOCK */}
                            <GlassPod className="mb-12 relative p-8">
                                <div className="font-sans text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                    <Box size={12} />
                                    Входящая мысль
                                </div>
                                <div className="font-serif text-xl md:text-2xl leading-relaxed text-slate-800 dark:text-slate-100">
                                    <ReactMarkdown components={markdownComponents}>{activeNote?.content || ''}</ReactMarkdown>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    {activeNote?.tags.map(t => (
                                        <span key={t} className="font-mono text-[10px] text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </GlassPod>

                            {/* MENTOR SELECTION */}
                            {!analysis && !isAnalyzing && (
                                <div className="flex flex-col items-center gap-8 mb-12 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex flex-wrap gap-6 justify-center max-w-2xl">
                                        {config.mentors.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setMentorId(m.id)}
                                                className={`group flex flex-col items-center gap-2 transition-all duration-300 ${mentorId === m.id ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                                            >
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-800 border-2 shadow-sm transition-colors ${mentorId === m.id ? 'border-indigo-500 dark:border-indigo-400 shadow-indigo-500/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                                    {React.createElement(ICON_MAP[m.icon] || ICON_MAP['User'], { 
                                                        size: 20, 
                                                        className: m.color,
                                                        strokeWidth: 1.5 
                                                    })}
                                                </div>
                                                <div className={`text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${mentorId === m.id ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}>
                                                    {m.name}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <button 
                                        onClick={handleAnalyze}
                                        className="px-8 py-4 border border-slate-300 dark:border-slate-600 rounded-full text-xs font-mono uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all duration-500 active:scale-95 flex items-center gap-3"
                                    >
                                        [ СИНТЕЗ ]
                                    </button>
                                </div>
                            )}

                            {/* UPDATED LOADING STATE */}
                            {isAnalyzing && (
                                <div 
                                    className="flex flex-col items-center py-12 cursor-pointer group" 
                                    onClick={handleStopAnalysis}
                                    title="Нажмите, чтобы остановить"
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-2 border-indigo-100 dark:border-slate-800 animate-ping absolute inset-0" />
                                        <div className="w-12 h-12 rounded-full border-2 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin group-hover:border-t-red-500 transition-colors" />
                                    </div>
                                    <div className="mt-4 font-mono text-[10px] text-slate-400 uppercase tracking-widest animate-pulse group-hover:text-red-400 transition-colors">
                                        Остановить
                                    </div>
                                </div>
                            )}

                            {/* ANALYSIS RESULT */}
                            {analysis && crystallizationState === 'idle' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-8"
                                >
                                    {/* Verdict */}
                                    <GlassPod className="p-8 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                                        <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white mb-4">
                                            Вердикт
                                        </h3>
                                        <div className="font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200">
                                            <ReactMarkdown components={markdownComponents}>{analysis.analysis}</ReactMarkdown>
                                        </div>
                                        <div className="mt-6 flex justify-end">
                                            <Tooltip content="Сменить ментора">
                                                <button onClick={() => setAnalysis(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                                                    <RotateCw size={16} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </GlassPod>

                                    {/* Artifacts */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                        {/* Task Artifact */}
                                        <motion.div 
                                            whileHover={{ y: -4, scale: 1.01 }}
                                            className="group bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-emerald-400/50 transition-all shadow-sm hover:shadow-lg relative overflow-hidden cursor-default h-full flex flex-col justify-between"
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Zap size={80} />
                                            </div>
                                            <div className="relative z-10 flex-1 flex flex-col">
                                                <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-3">Протокол действия</div>
                                                <div className="font-serif italic text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 line-clamp-4 flex-1">
                                                    <ReactMarkdown components={markdownComponents}>{analysis.suggestedTask}</ReactMarkdown>
                                                </div>
                                                <button onClick={handleAcceptTask} className="w-full py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 transition-all flex items-center justify-center gap-2">
                                                    Принять задачу <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        </motion.div>

                                        {/* Skill Artifact */}
                                        <motion.div 
                                            whileHover={{ y: -4, scale: 1.01 }}
                                            className="group bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 hover:border-indigo-400/50 transition-all shadow-sm hover:shadow-lg relative overflow-hidden cursor-default h-full flex flex-col justify-between"
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                <Diamond size={80} />
                                            </div>
                                            <div className="relative z-10 flex-1 flex flex-col">
                                                <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Нейросвязь</div>
                                                <div className="flex-1 flex flex-col">
                                                    <div className="font-serif text-lg text-slate-800 dark:text-slate-100 mb-2">{analysis.suggestedFlashcardFront}</div>
                                                    <div className="h-px w-full bg-slate-100 dark:bg-white/5 my-3" />
                                                    <div className="font-serif italic text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-3">{analysis.suggestedFlashcardBack}</div>
                                                </div>
                                                
                                                <button onClick={handleAcceptCard} className="w-full py-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 transition-all flex items-center justify-center gap-2">
                                                    КРИСТАЛЛИЗОВАТЬ <Diamond size={14} />
                                                </button>
                                            </div>
                                        </motion.div>
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
