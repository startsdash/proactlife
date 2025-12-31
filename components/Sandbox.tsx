
import React, { useState, useId } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, Task, Flashcard, AppConfig } from '../types';
import { analyzeSandboxItem, SandboxAnalysis } from '../services/geminiService';
import { applyTypography } from '../constants';
import { Box, Grid, Loader2, Sparkles, Zap, Lightbulb, BrainCircuit, ArrowRight, RotateCw, Dumbbell } from 'lucide-react';
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

// --- MENTOR OBJECTS (TACTILE MINIMALISM) ---
const AbstractShape = ({ type, color, isActive, isThinking }: { type: string, color: string, isActive: boolean, isThinking: boolean }) => {
    const uid = useId();
    
    // Convert Tailwind class to Hex for SVG
    const getBaseColor = (twClass: string) => {
        if (twClass.includes('indigo')) return '#6366f1';
        if (twClass.includes('emerald')) return '#10b981';
        if (twClass.includes('amber')) return '#f59e0b';
        if (twClass.includes('rose') || twClass.includes('red')) return '#f43f5e';
        if (twClass.includes('blue')) return '#3b82f6';
        if (twClass.includes('purple')) return '#a855f7';
        if (twClass.includes('cyan')) return '#06b6d4';
        return '#64748b'; // Slate
    };

    const c = getBaseColor(color);
    
    // Animation Config
    const cycleDuration = 4.5;
    const ease = "easeInOut";

    // 1. MONOLITH (Stability & Logic)
    // Vertical rounded block. Tilts slightly.
    const Monolith = () => (
        <motion.g
            animate={{ rotate: [0, 2, 0, -2, 0] }}
            transition={{ duration: cycleDuration, ease, repeat: Infinity }}
            style={{ transformOrigin: "50% 80%" }}
        >
            <defs>
                <linearGradient id={`grad-mono-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor={c} />
                </linearGradient>
            </defs>
            <rect x="32" y="20" width="36" height="60" rx="8" fill={`url(#grad-mono-${uid})`} stroke={c} strokeWidth="0.5" strokeOpacity="0.3" />
            {/* Highlight line */}
            <motion.rect 
                x="32" y="20" width="36" height="60" rx="8" 
                fill="url(#grad-mono-shine)" opacity="0.3"
                animate={{ opacity: [0.1, 0.4, 0.1] }}
                transition={{ duration: cycleDuration, ease, repeat: Infinity }}
            />
        </motion.g>
    );

    // 2. CAPSULE (Life & Psychology)
    // Horizontal pill. Breaths.
    const Capsule = () => (
        <motion.g
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: cycleDuration, ease, repeat: Infinity }}
            style={{ transformOrigin: "50% 50%" }}
        >
            <defs>
                <linearGradient id={`grad-cap-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor={c} />
                </linearGradient>
            </defs>
            <rect x="20" y="35" width="60" height="30" rx="15" fill={`url(#grad-cap-${uid})`} stroke={c} strokeWidth="0.5" strokeOpacity="0.3" />
            <ellipse cx="35" cy="42" rx="8" ry="3" fill="white" opacity="0.6" />
        </motion.g>
    );

    // 3. ORBITAL (Balance & Focus)
    // Thick ring with floating core.
    const Orbital = () => (
        <g>
            <defs>
                <linearGradient id={`grad-orb-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor={c} stopOpacity="0.5" />
                </linearGradient>
            </defs>
            {/* Ring */}
            <circle cx="50" cy="50" r="28" stroke={`url(#grad-orb-${uid})`} strokeWidth="10" fill="none" />
            {/* Core */}
            <motion.circle 
                cx="50" cy="50" r="10" fill={c}
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: cycleDuration, ease, repeat: Infinity }}
            />
        </g>
    );

    // 4. STACK (Structure & Knowledge)
    // 3 plates expanding.
    const Stack = () => (
        <g>
            <motion.rect 
                x="25" y="25" width="50" height="10" rx="2" fill={c} opacity="0.4"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: cycleDuration, ease, repeat: Infinity, delay: 0.2 }}
            />
            <motion.rect 
                x="25" y="45" width="50" height="10" rx="2" fill={c} opacity="0.7"
                animate={{ y: [0, 0, 0] }} // Center stays
                transition={{ duration: cycleDuration, ease, repeat: Infinity }}
            />
            <motion.rect 
                x="25" y="65" width="50" height="10" rx="2" fill={c} opacity="1"
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: cycleDuration, ease, repeat: Infinity, delay: 0.2 }}
            />
        </g>
    );

    // 5. LENS (Vision & Creativity)
    // Convex disk with breathing glow.
    const Lens = () => (
        <g>
            <defs>
                <radialGradient id={`grad-lens-${uid}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
                    <stop offset="100%" stopColor={c} stopOpacity="0.8"/>
                </radialGradient>
            </defs>
            <motion.circle 
                cx="50" cy="50" r="32" fill={`url(#grad-lens-${uid})`} 
                stroke={c} strokeWidth="1" strokeOpacity="0.5"
                animate={{ r: [32, 34, 32] }}
                transition={{ duration: cycleDuration, ease, repeat: Infinity }}
            />
            {/* Glint */}
            <circle cx="38" cy="38" r="6" fill="white" opacity="0.4" />
        </g>
    );

    const renderShape = () => {
        switch(type) {
            case 'monolith': return <Monolith />;
            case 'capsule': return <Capsule />;
            case 'orbital': return <Orbital />;
            case 'stack': return <Stack />;
            case 'lens': return <Lens />;
            default: return <Lens />;
        }
    };

    return (
        <div className={`relative w-20 h-20 flex items-center justify-center transition-all duration-500 ${isActive ? 'scale-110' : 'opacity-85 grayscale-[0.3] hover:grayscale-0 hover:scale-105'}`}>
            <motion.div
                animate={isThinking ? { rotate: 360 } : { rotate: 0 }}
                transition={isThinking ? { duration: 2, ease: "linear", repeat: Infinity } : { duration: 0.5 }}
                className="w-full h-full"
            >
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible drop-shadow-md">
                    <defs>
                        <filter id={`shadow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                            <feOffset dx="0" dy="4" result="offsetblur" />
                            <feComponentTransfer>
                                <feFuncA type="linear" slope="0.3" />
                            </feComponentTransfer>
                            <feMerge>
                                <feMergeNode />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    
                    {/* Ambient Shadow Base */}
                    <ellipse cx="50" cy="92" rx="20" ry="4" fill="black" opacity="0.15" filter="blur(4px)" />

                    {/* Shape Content */}
                    {renderShape()}
                    
                    {/* Activity Indicator Dot */}
                    {isActive && (
                        <motion.circle 
                            cx="50" cy="92" r="2" fill={c}
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                        />
                    )}
                </svg>
            </motion.div>
        </div>
    );
};

const getMentorShapeType = (id: string): string => {
    // Structure & Logic
    if (id.includes('peterson') || id.includes('structure')) return 'monolith';
    if (id.includes('greene') || id.includes('power')) return 'stack';
    
    // Vision & Wisdom
    if (id.includes('bible') || id.includes('spirit') || id.includes('epictetus') || id.includes('aurelius') || id.includes('seneca') || id.includes('pageau')) return 'lens';
    
    // Chaos & Perspective
    if (id.includes('taleb') || id.includes('chaos') || id.includes('Carlin')) return 'orbital';
    
    // Psychology & Life
    if (id.includes('psycholog') || id.includes('beta') || id.includes('capsule')) return 'capsule';
    
    return 'lens'; // Default fallback
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
                    В Спринты <ArrowRight size={14} fill="currentColor" />
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
                                                color={m.color} 
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
                                            <div className="font-serif text-lg md:text-xl leading-relaxed text-slate-800 dark:text-slate-100">
                                                <ReactMarkdown components={markdownComponents}>
                                                    {analysis.analysis.trim().replace(/^[-"']+\s*/, '')}
                                                </ReactMarkdown>
                                            </div>
                                            <div className="mt-6 flex justify-end">
                                                <Tooltip content="Сбросить анализ">
                                                    <button onClick={() => setAnalysis(null)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
                                                        <RotateCw size={18} />
                                                    </button>
                                                </Tooltip>
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
