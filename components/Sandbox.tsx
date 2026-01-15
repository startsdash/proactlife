import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, Task, Flashcard, AppConfig } from '../types';
import { analyzeSandboxItem, SandboxAnalysis } from '../services/geminiService';
import { applyTypography, ICON_MAP } from '../constants';
import { 
  Sparkles, 
  Diamond, 
  ArrowRight, 
  Zap, 
  Loader2, 
  RotateCw, 
  X, 
  Trash2, 
  Box, 
  Briefcase, 
  Sprout, 
  Heart, 
  Grid, 
  Terminal, 
  Cpu, 
  Target, 
  Orbit, 
  Database, 
  Flame, 
  Book, 
  Kanban as KanbanIcon, 
  CheckCircle2,
  Activity
} from 'lucide-react';
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
    p: ({node, ...props}: any) => <p className="mb-4 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed font-serif text-sm md:text-base" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-500 underline decoration-1 underline-offset-4" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400 font-serif" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400 font-serif" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="text-lg font-serif font-bold mt-4 mb-2 text-slate-900 dark:text-white tracking-tight" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-base font-serif font-bold mt-3 mb-2 text-slate-900 dark:text-white tracking-tight" {...props} />,
};

// --- VISUAL COMPONENTS ---

const DotGridBackground = () => (
    <div 
        className="absolute inset-0 pointer-events-none opacity-[0.3] dark:opacity-[0.15]" 
        style={{ 
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', 
            backgroundSize: '32px 32px',
            color: '#94a3b8'
        }} 
    />
);

const NeonGlow = ({ color = 'indigo' }: { color?: string }) => {
    const colorMap: Record<string, string> = {
        indigo: 'bg-indigo-500',
        violet: 'bg-violet-500',
        cyan: 'bg-cyan-500',
        rose: 'bg-rose-500',
        amber: 'bg-amber-500',
        emerald: 'bg-emerald-500',
    };
    const bg = colorMap[color] || colorMap['indigo'];
    return (
        <div className={`absolute inset-0 ${bg} opacity-20 blur-[80px] rounded-full pointer-events-none mix-blend-screen`} />
    );
};

// --- ORBITAL SYSTEM COMPONENTS ---

const OrbitRing = ({ radius, speed = 20, reverse = false, opacity = 0.1, dashed = false }: { radius: number, speed?: number, reverse?: boolean, opacity?: number, dashed?: boolean }) => (
    <motion.div
        className={`absolute rounded-full border ${dashed ? 'border-dashed' : 'border-solid'} border-slate-400 dark:border-slate-500 pointer-events-none`}
        style={{ 
            width: radius * 2, 
            height: radius * 2,
            opacity: opacity
        }}
        animate={{ rotate: reverse ? -360 : 360 }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
    />
);

// --- MAIN COMPONENT ---

const Sandbox: React.FC<Props> = ({ notes, tasks, flashcards, config, onProcessNote, onAddTask, onAddFlashcard, deleteNote }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SandboxAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mentorId, setMentorId] = useState<string>(config.mentors[0]?.id || 'peterson');
  const [logs, setLogs] = useState<string[]>([]);
  
  // Stages: 'ordinary' (select note) -> 'call' (choose path) -> 'trials' (processing) -> 'return' (result)
  const [stage, setStage] = useState<'ordinary' | 'call' | 'trials' | 'return'>('ordinary');

  const incomingNotes = useMemo(() => notes.filter(n => n.status === 'sandbox'), [notes]);
  const activeNote = useMemo(() => notes.find(n => n.id === selectedNoteId), [notes, selectedNoteId]);

  const addLog = (msg: string) => {
      setLogs(prev => [...prev.slice(-4), `> ${msg}`]);
  };

  useEffect(() => {
      if (!selectedNoteId) {
          setStage('ordinary');
          setAnalysis(null);
          setLogs(['> SYSTEM_READY. Waiting for input...']);
      } else {
          setStage('call');
          addLog(`Note loaded. ID: ${selectedNoteId.slice(-4)}`);
      }
  }, [selectedNoteId]);

  const handleAnalyze = async () => {
      if (!activeNote) return;
      setStage('trials');
      setIsAnalyzing(true);
      const mentorName = config.mentors.find(m => m.id === mentorId)?.name || 'AI';
      addLog(`Initializing Neural Link... Mentor: ${mentorName}`);
      
      try {
        const result = await analyzeSandboxItem(activeNote.content, mentorId, config);
        setIsAnalyzing(prev => {
            if (prev) {
                setAnalysis(result);
                setStage('return');
                addLog('Analysis complete. Artifacts generated.');
                return false;
            }
            return false;
        });
      } catch (e) {
        setIsAnalyzing(false);
        setStage('call');
        addLog('ERROR: Connection disrupted.');
      }
  };

  const handleStopAnalysis = () => {
      setIsAnalyzing(false);
      setStage('call');
      addLog('Process aborted by user.');
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
    addLog('Protocol created: Sprints updated.');
    alert("Задача создана в Спринтах");
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
    addLog('Neural pathway reinforced: Skill added.');
    alert("Скилл добавлен в Mental Gym");
  };

  const handleArchiveNote = () => {
      if (selectedNoteId) {
          onProcessNote(selectedNoteId);
          setSelectedNoteId(null);
          addLog('Note archived to Core Memory.');
      }
  };

  // --- RENDERERS ---

  return (
    <div className="flex h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden relative font-sans">
        <DotGridBackground />
        
        {/* TRANSFORMATION RATIO (HUD) */}
        <div className="absolute top-6 right-6 z-30 flex flex-col items-end pointer-events-none select-none">
            <div className="flex items-center gap-2 mb-1 opacity-70">
                <Activity size={12} className="text-emerald-500 animate-pulse" />
                <span className="font-mono text-[10px] text-slate-400 uppercase tracking-widest">Sync Status</span>
            </div>
            <div className="font-mono text-xl text-slate-700 dark:text-slate-300">
                {String(notes.length).padStart(3,'0')} <span className="text-slate-300 dark:text-slate-600">/</span> {String(flashcards.length).padStart(3,'0')}
            </div>
        </div>

        {/* LEFT PANEL: HUB (Compact List) */}
        <div className="w-72 flex flex-col border-r border-slate-200/50 dark:border-white/5 bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-xl z-20 transition-all duration-500">
            <div className="px-6 pt-8 pb-6 border-b border-slate-100 dark:border-white/5">
                <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-2">
                    <Database size={20} className="text-indigo-500" strokeWidth={1.5} />
                    Хаб
                </h1>
                <div className="flex justify-between items-center mt-2">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-mono uppercase tracking-wider">Buffer: {incomingNotes.length}</p>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar-ghost p-4 space-y-3">
                {incomingNotes.length === 0 ? (
                    <div className="text-center py-20 opacity-40 flex flex-col items-center">
                        <Orbit size={32} className="mb-4 text-slate-400" strokeWidth={1} />
                        <p className="text-xs font-serif text-slate-500">Орбита чиста</p>
                    </div>
                ) : (
                    incomingNotes.map((note) => (
                        <motion.button 
                            key={note.id}
                            onClick={() => setSelectedNoteId(note.id)}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`w-full text-left p-3 rounded-xl border transition-all duration-300 relative group overflow-hidden ${
                                selectedNoteId === note.id 
                                ? 'bg-white dark:bg-slate-800 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20' 
                                : 'bg-white/50 dark:bg-slate-900/50 border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-mono text-[9px] text-slate-400">{new Date(note.createdAt).toLocaleDateString()}</span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if(confirm('Удалить?')) deleteNote(note.id); }}
                                        className="p-1 hover:text-red-500 text-slate-300"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                            <div className={`text-xs font-serif line-clamp-2 leading-relaxed ${selectedNoteId === note.id ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                {note.content.substring(0, 100)}
                            </div>
                            {selectedNoteId === note.id && (
                                <motion.div layoutId="activeGlow" className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
                            )}
                        </motion.button>
                    ))
                )}
            </div>
        </div>

        {/* MAIN STAGE: THE ORBITAL SYSTEM */}
        <div className="flex-1 flex flex-col relative overflow-hidden items-center justify-center">
            
            {/* SYSTEM LOG TERMINAL */}
            <div className="absolute bottom-8 left-8 right-8 z-20 pointer-events-none flex justify-center">
                <div className="bg-black/80 backdrop-blur-md text-emerald-500 font-mono text-[10px] p-4 rounded-xl border border-emerald-500/20 shadow-2xl w-full max-w-2xl overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 border-b border-emerald-500/20 pb-2 opacity-50">
                        <Terminal size={12} />
                        <span>KERNEL_LOG</span>
                    </div>
                    <div className="flex flex-col-reverse max-h-16 overflow-hidden">
                        {logs.map((log, i) => (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1 - i * 0.2, x: 0 }} 
                                className="truncate"
                            >
                                {log}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {/* STATE: ORDINARY (IDLE) */}
                {stage === 'ordinary' && (
                    <motion.div 
                        key="ordinary"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                        className="flex flex-col items-center justify-center text-center max-w-md p-8"
                    >
                        <div className="relative mb-8">
                            <OrbitRing radius={60} speed={10} opacity={0.2} />
                            <OrbitRing radius={100} speed={20} reverse opacity={0.1} dashed />
                            <div className="w-24 h-24 rounded-full bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-xl flex items-center justify-center shadow-inner relative z-10">
                                <Cpu size={32} className="text-slate-400" strokeWidth={1} />
                            </div>
                        </div>
                        <h2 className="text-2xl font-light text-slate-800 dark:text-slate-200 mb-2 font-serif">Точка Сборки</h2>
                        <p className="text-slate-500 text-sm leading-relaxed">Выберите мысль из Хаба слева, чтобы начать процесс трансформации.</p>
                    </motion.div>
                )}

                {/* STATE: CALL / TRIALS (ACTIVE) */}
                {(stage === 'call' || stage === 'trials') && activeNote && (
                    <motion.div 
                        key="active"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative w-full h-full flex items-center justify-center"
                    >
                        {/* THE CORE */}
                        <div className="relative z-10 w-[320px] md:w-[420px] aspect-square flex items-center justify-center">
                            {/* Orbital Rings */}
                            <OrbitRing radius={180} speed={60} opacity={0.1} dashed />
                            <OrbitRing radius={240} speed={90} reverse opacity={0.05} />
                            
                            {/* Glowing Aura based on stage */}
                            <NeonGlow color={isAnalyzing ? 'violet' : 'indigo'} />

                            {/* The Note Node */}
                            <motion.div 
                                layoutId="core-node"
                                className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center p-8 text-center relative z-20 overflow-hidden"
                                animate={{ scale: isAnalyzing ? [1, 1.02, 1] : 1 }}
                                transition={{ duration: 2, repeat: isAnalyzing ? Infinity : 0 }}
                            >
                                <div className="absolute top-6 left-1/2 -translate-x-1/2">
                                    <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-mono uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-slate-700">
                                        ID: {activeNote.id.slice(-4)}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar-none flex items-center">
                                    <p className="font-serif text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed italic">
                                        {activeNote.content}
                                    </p>
                                </div>
                                {isAnalyzing && (
                                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-30">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 size={32} className="text-violet-500 animate-spin" />
                                            <span className="text-xs font-mono uppercase tracking-widest text-violet-600 dark:text-violet-300 animate-pulse">
                                                Synthesizing...
                                            </span>
                                            <button 
                                                onClick={handleStopAnalysis}
                                                className="px-4 py-2 rounded-full border border-red-200 text-red-500 text-[10px] hover:bg-red-50 transition-colors"
                                            >
                                                ABORT
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>

                            {/* MENTOR SATELLITES (Top Arc) */}
                            {!isAnalyzing && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-24 w-full flex justify-center gap-4">
                                    {config.mentors.slice(0, 3).map((m, i) => (
                                        <Tooltip key={m.id} content={m.name}>
                                            <motion.button 
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: i * 0.1 }}
                                                onClick={() => { setMentorId(m.id); handleAnalyze(); }}
                                                className={`w-12 h-12 rounded-full bg-white dark:bg-slate-800 border-2 flex items-center justify-center shadow-lg hover:scale-110 transition-all ${mentorId === m.id ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-slate-200 dark:border-slate-700'}`}
                                            >
                                                {React.createElement(ICON_MAP[m.icon] || ICON_MAP['User'], { size: 20, className: m.color })}
                                            </motion.button>
                                        </Tooltip>
                                    ))}
                                </div>
                            )}

                            {/* ACTION SATELLITES (Bottom Arc) */}
                            {!isAnalyzing && (
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-24 w-full flex justify-center gap-8">
                                    <Tooltip content="В Спринты (Задача)">
                                        <motion.button 
                                            initial={{ y: -20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            onClick={() => onAddTask({ id: Date.now().toString(), title: activeNote.title, content: activeNote.content, column: 'todo', createdAt: Date.now() })}
                                            className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900 shadow-lg hover:shadow-emerald-500/20 hover:border-emerald-500 flex items-center justify-center text-emerald-500 transition-all hover:-translate-y-1"
                                        >
                                            <KanbanIcon size={24} strokeWidth={1.5} />
                                        </motion.button>
                                    </Tooltip>
                                    
                                    <Tooltip content="В Трекер (Привычка)">
                                        <motion.button 
                                            initial={{ y: -20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900 shadow-lg hover:shadow-orange-500/20 hover:border-orange-500 flex items-center justify-center text-orange-500 transition-all hover:-translate-y-1"
                                            onClick={() => alert("Функция прямой отправки в Трекер в разработке")}
                                        >
                                            <Flame size={24} strokeWidth={1.5} />
                                        </motion.button>
                                    </Tooltip>

                                    <Tooltip content="В Дневник">
                                        <motion.button 
                                            initial={{ y: -20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-cyan-200 dark:border-cyan-900 shadow-lg hover:shadow-cyan-500/20 hover:border-cyan-500 flex items-center justify-center text-cyan-500 transition-all hover:-translate-y-1"
                                            onClick={() => alert("Функция прямой отправки в Дневник в разработке")}
                                        >
                                            <Book size={24} strokeWidth={1.5} />
                                        </motion.button>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* STATE: RETURN (RESULT) */}
                {stage === 'return' && analysis && (
                    <motion.div 
                        key="return"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative z-20 w-full max-w-4xl p-8 flex flex-col h-[90%]"
                    >
                        <div className="absolute top-0 right-0 p-4">
                            <button onClick={() => setStage('call')} className="p-2 bg-white dark:bg-slate-800 rounded-full border shadow-sm text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Analysis Card */}
                        <div className="bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-white/10 shadow-2xl flex-1 flex flex-col overflow-hidden">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-gradient-to-r from-violet-500/10 to-transparent">
                                <div className="flex items-center gap-3 mb-2">
                                    <Sparkles size={18} className="text-violet-600 dark:text-violet-400" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Analysis Verdict</span>
                                </div>
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown components={markdownComponents}>{analysis.analysis}</ReactMarkdown>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-6 custom-scrollbar-light">
                                {/* Artifact 1: Task */}
                                <div className="p-6 rounded-2xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 flex flex-col">
                                    <div className="flex items-center gap-2 mb-4 text-emerald-600 dark:text-emerald-400">
                                        <Target size={20} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Protocol (Task)</span>
                                    </div>
                                    <div className="flex-1 text-sm text-slate-700 dark:text-slate-300 italic mb-6">
                                        <ReactMarkdown>{analysis.suggestedTask}</ReactMarkdown>
                                    </div>
                                    <button 
                                        onClick={handleAcceptTask}
                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                    >
                                        Accept <CheckCircle2 size={16} />
                                    </button>
                                </div>

                                {/* Artifact 2: Flashcard */}
                                <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 flex flex-col">
                                    <div className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400">
                                        <Diamond size={20} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Crystallization (Skill)</span>
                                    </div>
                                    <div className="flex-1 space-y-4 mb-6">
                                        <div className="text-sm font-medium text-slate-800 dark:text-white">{analysis.suggestedFlashcardFront}</div>
                                        <div className="h-px bg-indigo-200 dark:bg-indigo-800" />
                                        <div className="text-sm text-slate-600 dark:text-slate-400 italic">{analysis.suggestedFlashcardBack}</div>
                                    </div>
                                    <button 
                                        onClick={handleAcceptCard}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                    >
                                        Crystallize <Zap size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                                <button 
                                    onClick={() => setStage('call')} 
                                    className="text-slate-400 hover:text-slate-600 text-xs font-medium flex items-center gap-1"
                                >
                                    <RotateCw size={12} /> Retry
                                </button>
                                <button 
                                    onClick={handleArchiveNote}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-xs font-bold uppercase tracking-wide flex items-center gap-2"
                                >
                                    Archive Source Note <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    </div>
  );
};

export default Sandbox;