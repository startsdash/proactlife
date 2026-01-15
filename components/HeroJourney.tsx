
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, Task, Habit, JournalEntry, Module } from '../types';
import { X, Zap, Target, Book, Flame, BrainCircuit, CheckCircle2, Circle, ArrowRight, Activity, Diamond } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  note: Note;
  tasks: Task[];
  habits: Habit[];
  journal: JournalEntry[];
  onClose: () => void;
  onCreateTask: (task: Task) => void;
  onCreateHabit: (habit: Habit) => void;
  onCreateEntry: (entry: JournalEntry) => void;
  onNavigateToSandbox: (noteId: string) => void;
}

const HeroJourney: React.FC<Props> = ({ 
  note, tasks, habits, journal, 
  onClose, onCreateTask, onCreateHabit, onCreateEntry, onNavigateToSandbox 
}) => {
  
  // --- DATA AGGREGATION ---
  const linkedTask = useMemo(() => tasks.find(t => t.originNoteId === note.id), [tasks, note.id]);
  const linkedHabit = useMemo(() => habits.find(h => h.originNoteId === note.id), [habits, note.id]);
  const linkedEntries = useMemo(() => journal.filter(j => j.linkedNoteId === note.id || j.linkedNoteIds?.includes(note.id)), [journal, note.id]);
  
  const hasInsight = linkedEntries.some(j => j.isInsight);
  const isTaskDone = linkedTask?.column === 'done';
  const habitStreak = linkedHabit?.streak || 0;

  // --- ACTIONS ---
  const handleCreateTask = () => {
      onCreateTask({
          id: Date.now().toString(),
          title: note.title || 'Новая миссия',
          content: note.content,
          column: 'todo',
          createdAt: Date.now(),
          originNoteId: note.id
      });
  };

  const handleCreateHabit = () => {
      onCreateHabit({
          id: Date.now().toString(),
          title: note.title || 'Новый ритуал',
          color: 'indigo',
          icon: 'Zap',
          frequency: 'daily',
          history: {},
          streak: 0,
          bestStreak: 0,
          reminders: [],
          createdAt: Date.now(),
          originNoteId: note.id
      });
  };

  const handleCreateEntry = () => {
      onCreateEntry({
          id: Date.now().toString(),
          date: Date.now(),
          content: `Рефлексия по заметке: ${note.title || 'Без названия'}`,
          linkedNoteId: note.id,
          linkedNoteIds: [note.id]
      });
  };

  // --- ANIMATION VARIANTS ---
  const orbitVariants = {
      animate: { rotate: 360, transition: { duration: 60, repeat: Infinity, ease: "linear" } }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* BACKDROP */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-[20px]"
            onClick={onClose}
        >
            <div 
                className="absolute inset-0 opacity-10 pointer-events-none" 
                style={{ 
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }} 
            />
        </motion.div>

        {/* MAIN HUD */}
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-6xl h-[90vh] flex flex-col md:flex-row overflow-hidden rounded-[40px] border border-white/10 bg-slate-900/50 shadow-2xl"
            onClick={e => e.stopPropagation()}
        >
            {/* Header / Control Deck */}
            <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-30 pointer-events-none">
                <div>
                    <div className="flex items-center gap-3 text-emerald-400 mb-1">
                        <Activity size={16} className="animate-pulse" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Protocol: HERO_JOURNEY</span>
                    </div>
                    <h1 className="text-white text-2xl font-light tracking-tight">{note.title || 'Инициация Идеи'}</h1>
                </div>
                <button onClick={onClose} className="pointer-events-auto p-3 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                    <X size={24} strokeWidth={1} />
                </button>
            </div>

            {/* --- LEFT PANEL: SYNTHESIS & RETURN --- */}
            <div className="w-full md:w-1/4 border-r border-white/5 p-8 pt-32 flex flex-col justify-end relative bg-slate-900/30">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-indigo-900/20 pointer-events-none" />
                
                <div className="relative z-10 space-y-8">
                    {/* Status Module */}
                    <div>
                        <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-4">СЕКТОР 4: ТРАНСФОРМАЦИЯ</div>
                        {hasInsight ? (
                            <div className="p-6 rounded-2xl border border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                                <div className="flex items-center gap-3 text-indigo-300 mb-2">
                                    <Diamond size={20} className="fill-current animate-pulse" />
                                    <span className="font-bold tracking-wider text-sm">ИНСАЙТ ПОЛУЧЕН</span>
                                </div>
                                <p className="text-xs text-indigo-200/60 leading-relaxed">
                                    Идея интегрирована в структуру личности. Цикл завершен.
                                </p>
                            </div>
                        ) : isTaskDone ? (
                            <div className="p-6 rounded-2xl border border-emerald-500/50 bg-emerald-500/10">
                                <div className="flex items-center gap-3 text-emerald-300 mb-2">
                                    <CheckCircle2 size={20} />
                                    <span className="font-bold tracking-wider text-sm">МИССИЯ ЗАВЕРШЕНА</span>
                                </div>
                                <p className="text-xs text-emerald-200/60 leading-relaxed">
                                    Материальный результат достигнут. Ожидание рефлексии.
                                </p>
                            </div>
                        ) : (
                            <div className="p-6 rounded-2xl border border-white/5 bg-white/5 opacity-50">
                                <div className="flex items-center gap-3 text-slate-400 mb-2">
                                    <Circle size={20} />
                                    <span className="font-bold tracking-wider text-sm">В ПРОЦЕССЕ</span>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Путешествие продолжается. Ищите смыслы в действиях.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Timeline Data */}
                    <div className="font-mono text-[10px] text-slate-600 space-y-2">
                        <div className="flex justify-between">
                            <span>START_DATE:</span>
                            <span className="text-slate-400">{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>ELAPSED:</span>
                            <span className="text-slate-400">{Math.floor((Date.now() - note.createdAt) / (1000 * 60 * 60 * 24))} DAYS</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CENTER STAGE: THE ORBIT --- */}
            <div className="flex-1 relative flex items-center justify-center min-h-[400px]">
                {/* Background Grid */}
                <div 
                    className="absolute inset-0 opacity-20 pointer-events-none" 
                    style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
                />

                {/* Main Orbital System */}
                <div className="relative w-[400px] h-[400px] md:w-[600px] md:h-[600px] flex items-center justify-center">
                    {/* Outer Ring */}
                    <motion.div 
                        variants={orbitVariants}
                        animate="animate"
                        className="absolute inset-0 rounded-full border border-dashed border-slate-700 opacity-50"
                    />
                    
                    {/* Inner Ring */}
                    <div className="absolute inset-[15%] rounded-full border border-white/5" />

                    {/* The Core (Note Content) */}
                    <div className="relative z-10 w-64 h-64 md:w-80 md:h-80 rounded-full bg-slate-900 border border-white/10 flex flex-col items-center justify-center p-8 text-center shadow-2xl">
                        <div className="text-[10px] font-mono text-indigo-400 mb-4 uppercase tracking-widest">Исходная Точка</div>
                        <div className="text-slate-300 font-serif text-sm md:text-base leading-relaxed line-clamp-6 opacity-80 mix-blend-lighten">
                            <ReactMarkdown>{note.content}</ReactMarkdown>
                        </div>
                    </div>

                    {/* Orbital Nodes (Visual Only) */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
                        <div className="w-8 h-8 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        </div>
                        <div className="h-16 w-px bg-gradient-to-b from-white/20 to-transparent mx-auto" />
                    </div>
                </div>
            </div>

            {/* --- RIGHT PANEL: THRESHOLD & TRIALS --- */}
            <div className="w-full md:w-1/4 border-l border-white/5 bg-slate-900/30 flex flex-col">
                
                {/* SECTOR 2: THRESHOLD (ACTIONS) */}
                <div className="p-8 border-b border-white/5 flex-1">
                    <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-6">СЕКТОР 2: ПОРОГ (ВЫБОР)</div>
                    
                    <div className="space-y-4">
                        <h3 className="text-white text-sm font-bold flex items-center gap-2">
                            <Target size={14} className="text-emerald-400" /> Путь Одиночки
                        </h3>
                        
                        <div className="space-y-2">
                            {!linkedTask ? (
                                <button onClick={handleCreateTask} className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/50 transition-all text-left group">
                                    <div className="text-xs font-bold text-slate-300 group-hover:text-emerald-400 mb-1 flex items-center justify-between">
                                        Спринт (Задача) <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="text-[10px] text-slate-500">Превратить мысль в действие</div>
                                </button>
                            ) : (
                                <div className="w-full p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                                    <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-2">
                                        <CheckCircle2 size={12} /> Задача активна
                                    </div>
                                    <div className="h-1 w-full bg-emerald-900/50 rounded-full mt-2 overflow-hidden">
                                        <div className={`h-full bg-emerald-500 ${isTaskDone ? 'w-full' : 'w-1/3'}`} />
                                    </div>
                                </div>
                            )}

                            {!linkedHabit ? (
                                <button onClick={handleCreateHabit} className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/50 transition-all text-left group">
                                    <div className="text-xs font-bold text-slate-300 group-hover:text-orange-400 mb-1 flex items-center justify-between">
                                        Трекер (Ритуал) <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="text-[10px] text-slate-500">Внедрить в систему</div>
                                </button>
                            ) : (
                                <div className="w-full p-4 rounded-xl border border-orange-500/30 bg-orange-500/5">
                                    <div className="text-xs font-bold text-orange-400 mb-1 flex items-center gap-2">
                                        <Flame size={12} /> Ритуал запущен
                                    </div>
                                    <div className="text-[10px] text-orange-300/60 mt-1 font-mono">STREAK: {habitStreak}</div>
                                </div>
                            )}

                            <button onClick={handleCreateEntry} className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/50 transition-all text-left group">
                                <div className="text-xs font-bold text-slate-300 group-hover:text-cyan-400 mb-1 flex items-center justify-between">
                                    Дневник (Запись) <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-[10px] text-slate-500">Зафиксировать состояние</div>
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5">
                        <h3 className="text-white text-sm font-bold flex items-center gap-2 mb-4">
                            <BrainCircuit size={14} className="text-violet-400" /> Путь с Наставником
                        </h3>
                        <button 
                            onClick={() => onNavigateToSandbox(note.id)}
                            className="w-full py-3 rounded-xl border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
                        >
                            Открыть в Хабе
                        </button>
                    </div>
                </div>

                {/* SECTOR 3: TRIALS (DATA) */}
                <div className="p-8 bg-black/20">
                    <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mb-4">СЕКТОР 3: ИСПЫТАНИЯ</div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                            <div className="text-[10px] text-slate-400 mb-1">Связи</div>
                            <div className="text-xl font-light text-white">{linkedEntries.length}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                            <div className="text-[10px] text-slate-400 mb-1">Статус</div>
                            <div className={`text-xl font-light ${isTaskDone ? 'text-emerald-400' : 'text-slate-200'}`}>
                                {isTaskDone ? 'DONE' : 'ACTIVE'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    </div>
  );
};

export default HeroJourney;
