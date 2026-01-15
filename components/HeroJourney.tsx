
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, Task, Habit, JournalEntry, Module } from '../types';
import { X, Zap, Target, Book, Flame, BrainCircuit, CheckCircle2, Circle, ArrowRight, Activity, Diamond, LayoutGrid, Radio, Plus, Check } from 'lucide-react';
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

  // Calculate elapsed time formatted
  const elapsedDays = Math.floor((Date.now() - (note.journeyStartedAt || note.createdAt)) / (1000 * 60 * 60 * 24));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* BACKDROP */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-[40px]"
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
            className="relative w-full max-w-7xl h-[90vh] grid grid-cols-1 md:grid-cols-4 grid-rows-4 md:grid-rows-2 gap-4 md:gap-0 overflow-hidden rounded-[40px] border border-white/10 bg-slate-900/50 shadow-2xl p-4 md:p-0"
            onClick={e => e.stopPropagation()}
        >
            {/* Header / Control Deck Label */}
            <div className="absolute top-8 left-8 z-30 pointer-events-none hidden md:block">
                <div className="flex items-center gap-3 text-emerald-400 mb-1">
                    <Activity size={16} className="animate-pulse" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Protocol: HERO_JOURNEY</span>
                </div>
            </div>
            
            <button onClick={onClose} className="absolute top-8 right-8 z-30 p-3 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/10">
                <X size={24} strokeWidth={1} />
            </button>

            {/* SECTOR 1: INITIATION (Top Left) */}
            <div className="md:col-span-1 md:row-span-1 border-b md:border-r border-white/10 p-6 flex flex-col justify-end relative bg-slate-900/40">
                <div className="absolute top-4 left-4 font-mono text-[9px] text-slate-500 uppercase tracking-widest">SECTOR 1: INITIATION</div>
                
                <div className="font-mono text-xs text-slate-400 space-y-4">
                    <div>
                        <div className="text-slate-600 mb-1">SUBJECT</div>
                        <div className="text-white font-bold truncate">{note.title || 'Untitled Idea'}</div>
                    </div>
                    <div>
                        <div className="text-slate-600 mb-1">START_DATE</div>
                        <div className="text-emerald-400">{new Date(note.journeyStartedAt || note.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div>
                        <div className="text-slate-600 mb-1">TIME_ELAPSED</div>
                        <div className="text-emerald-400">{elapsedDays} DAYS</div>
                    </div>
                    <div>
                        <div className="text-slate-600 mb-1">STATUS</div>
                        <div className="text-amber-400 animate-pulse">ACTIVE</div>
                    </div>
                </div>
            </div>

            {/* CENTER ORBIT (Spans center area visually, absolutely positioned) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] pointer-events-none z-0 flex items-center justify-center">
                 {/* Connection Lines to Sectors */}
                 <svg className="absolute inset-0 w-full h-full opacity-30">
                    <line x1="0" y1="0" x2="50%" y2="50%" stroke="white" strokeDasharray="4 4" />
                    <line x1="100%" y1="0" x2="50%" y2="50%" stroke="white" strokeDasharray="4 4" />
                    <line x1="0" y1="100%" x2="50%" y2="50%" stroke="white" strokeDasharray="4 4" />
                    <line x1="100%" y1="100%" x2="50%" y2="50%" stroke="white" strokeDasharray="4 4" />
                 </svg>

                 {/* Orbital System */}
                 <motion.div variants={orbitVariants} animate="animate" className="absolute inset-0 rounded-full border border-dashed border-slate-600 opacity-50" />
                 <div className="absolute inset-[15%] rounded-full border border-white/10" />
                 
                 {/* Quantum Core */}
                 <div className="relative w-40 h-40 md:w-64 md:h-64 rounded-full bg-slate-950 border border-emerald-500/30 flex items-center justify-center p-6 text-center shadow-[0_0_50px_rgba(16,185,129,0.1)] z-10 pointer-events-auto">
                    <div className="text-[8px] font-mono text-emerald-500 mb-2 uppercase tracking-widest absolute top-6">Quantum Core</div>
                    <div className="text-slate-300 font-serif text-xs md:text-sm leading-relaxed line-clamp-4 mix-blend-lighten overflow-hidden">
                        <ReactMarkdown>{note.content}</ReactMarkdown>
                    </div>
                 </div>
            </div>

            {/* SECTOR 2: CHOICE (Top Right) */}
            <div className="md:col-start-4 md:row-start-1 border-b border-l border-white/10 p-6 flex flex-col relative bg-slate-900/40 z-10">
                <div className="absolute top-4 right-4 font-mono text-[9px] text-slate-500 uppercase tracking-widest text-right">SECTOR 2: CHOICE</div>
                
                <div className="mt-auto space-y-3">
                    <button 
                        onClick={handleCreateTask}
                        disabled={!!linkedTask}
                        className="w-full p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-400">MISSION</span>
                            {linkedTask ? <Check size={12} className="text-emerald-500" /> : <Plus size={12} className="text-slate-500" />}
                        </div>
                        <div className="text-[10px] text-slate-500">Create Task</div>
                    </button>

                    <button 
                        onClick={handleCreateHabit}
                        disabled={!!linkedHabit}
                        className="w-full p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-300 group-hover:text-orange-400">RITUAL</span>
                            {linkedHabit ? <Check size={12} className="text-orange-500" /> : <Plus size={12} className="text-slate-500" />}
                        </div>
                        <div className="text-[10px] text-slate-500">Form Habit</div>
                    </button>

                    <button 
                        onClick={handleCreateEntry}
                        className="w-full p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition-all text-left group"
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-300 group-hover:text-cyan-400">LOG</span>
                            <Plus size={12} className="text-slate-500" />
                        </div>
                        <div className="text-[10px] text-slate-500">Add Reflection</div>
                    </button>
                </div>
            </div>

            {/* SECTOR 3: TRANSFORMATION (Bottom Left) */}
            <div className="md:col-start-1 md:row-start-2 border-r border-t border-white/10 p-6 flex flex-col relative bg-slate-900/40 z-10">
                <div className="absolute bottom-4 left-4 font-mono text-[9px] text-slate-500 uppercase tracking-widest">SECTOR 3: TRANSFORMATION</div>
                
                <div className="mb-auto flex items-center justify-center h-full">
                    {hasInsight ? (
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)] animate-pulse">
                                <Diamond size={32} className="text-indigo-400 fill-current" />
                            </div>
                            <div className="mt-4 font-bold text-indigo-300 tracking-widest text-sm">INSIGHT ACQUIRED</div>
                            <div className="text-[10px] text-indigo-400/60 mt-1">Synthesis Complete</div>
                        </div>
                    ) : (
                        <div className="text-center opacity-30">
                            <div className="w-20 h-20 mx-auto bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                                <Diamond size={32} className="text-slate-600" />
                            </div>
                            <div className="mt-4 font-bold text-slate-500 tracking-widest text-sm">AWAITING INSIGHT</div>
                        </div>
                    )}
                </div>
            </div>

            {/* SECTOR 4: MONITORING (Bottom Right) */}
            <div className="md:col-start-4 md:row-start-2 border-l border-t border-white/10 p-6 flex flex-col relative bg-slate-900/40 z-10">
                <div className="absolute bottom-4 right-4 font-mono text-[9px] text-slate-500 uppercase tracking-widest text-right">SECTOR 4: MONITORING</div>
                
                <div className="mb-auto space-y-4 pt-4">
                    {/* Task Monitor */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Target size={14} className="text-slate-400" />
                            <span className="text-xs text-slate-300 font-bold">TASK LINK</span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${linkedTask ? (isTaskDone ? 'bg-emerald-500 w-full' : 'bg-emerald-500 w-1/2 animate-pulse') : 'w-0'}`} />
                        </div>
                    </div>

                    {/* Habit Monitor */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Flame size={14} className="text-slate-400" />
                            <span className="text-xs text-slate-300 font-bold">HABIT LINK</span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${linkedHabit ? 'bg-orange-500' : 'w-0'}`} 
                                style={{ width: linkedHabit ? `${Math.min(habitStreak * 10, 100)}%` : '0%' }} 
                            />
                        </div>
                    </div>

                    {/* Journal Monitor */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Book size={14} className="text-slate-400" />
                            <span className="text-xs text-slate-300 font-bold">ENTRIES</span>
                        </div>
                        <span className="font-mono text-xs text-cyan-400">{linkedEntries.length} LOGS</span>
                    </div>
                </div>
            </div>

            {/* Footer Exit Button */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
                <button 
                    onClick={onClose}
                    className="px-6 py-2 rounded-full border border-white/20 hover:bg-white/10 text-[10px] font-bold text-white uppercase tracking-[0.2em] transition-all backdrop-blur-md"
                >
                    ВЕРНУТЬСЯ К СПИСКУ ПУТЕЙ
                </button>
            </div>
        </motion.div>
    </div>
  );
};

export default HeroJourney;
