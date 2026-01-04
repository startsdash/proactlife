
import React, { useState, useEffect, useMemo } from 'react';
import { Note, Task, Habit, JournalEntry, Module, Flashcard } from '../types';
import { motion } from 'framer-motion';
import { Gem, Activity, Diamond, ArrowRight, Zap, Target, BrainCircuit } from 'lucide-react';

interface Props {
  notes: Note[];
  tasks: Task[];
  habits: Habit[];
  journal: JournalEntry[];
  onNavigate: (module: Module) => void;
  // Assuming flashcards might be passed in future updates or accessed via context, 
  // but for now we'll stick to the existing props unless we change App.tsx.
  // Wait, I need flashcards for "Neural Connection". 
  // Checking App.tsx, Dashboard props are: notes, tasks, habits, journal.
  // I will assume flashcards are NOT available in props currently based on previous file content.
  // I will modify App.tsx to pass flashcards to Dashboard as well.
}

// Extension to props to include flashcards
interface ExtendedProps extends Props {
    flashcards?: Flashcard[];
}

// --- VISUAL CONSTANTS ---
const DOT_GRID_STYLE = {
    backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
    backgroundSize: '32px 32px'
};

const GLASS_PANEL = "bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-[35px] border border-slate-200/60 dark:border-slate-700/60 shadow-sm";

// --- WIDGETS ---

const CurrentPulse = ({ tasks }: { tasks: Task[] }) => {
    // Calculate weekly progress
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    startOfWeek.setHours(0,0,0,0);
    
    const activeTasks = tasks.filter(t => !t.isArchived && t.column !== 'done');
    const doneTasks = tasks.filter(t => t.column === 'done' && t.createdAt >= startOfWeek.getTime());
    const total = activeTasks.length + doneTasks.length;
    const progress = total === 0 ? 0 : Math.round((doneTasks.length / total) * 100);
    
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className={`relative w-full h-full flex flex-col items-center justify-center ${GLASS_PANEL} rounded-full aspect-square max-w-[300px] mx-auto`}>
            <svg className="absolute inset-0 w-full h-full transform -rotate-90 p-4">
                <circle cx="50%" cy="50%" r={radius} fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-800" />
                <motion.circle 
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx="50%" cy="50%" r={radius} 
                    fill="none" stroke="currentColor" strokeWidth="2" 
                    className="text-indigo-500 dark:text-indigo-400"
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                />
            </svg>
            
            <div className="z-10 text-center flex flex-col items-center">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-2">Current Pulse</div>
                <h2 className="text-2xl font-bold font-sans text-slate-900 dark:text-white tracking-tight">КРИСТАЛЛИЗАЦИЯ</h2>
                <div className="mt-2 font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                    [ PRG: {progress}% ]
                </div>
            </div>
        </div>
    );
};

const RecentInsights = ({ journal, onClick }: { journal: JournalEntry[], onClick: () => void }) => {
    const insights = journal.filter(j => j.isInsight).slice(-3).reverse();

    return (
        <div className={`flex-1 flex flex-col p-6 rounded-3xl ${GLASS_PANEL}`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">Эхо Дневника</h3>
                <button onClick={onClick} className="text-slate-400 hover:text-indigo-500 transition-colors">
                    <ArrowRight size={14} />
                </button>
            </div>
            
            <div className="flex-1 space-y-6">
                {insights.length === 0 ? (
                    <div className="text-sm text-slate-400 italic font-serif opacity-50">Тишина в эфире...</div>
                ) : (
                    insights.map(entry => (
                        <div key={entry.id} className="group cursor-pointer" onClick={onClick}>
                            <div className="flex items-start gap-3">
                                <Gem size={12} className="mt-1.5 text-violet-400 shrink-0 group-hover:text-violet-500 transition-colors" />
                                <p className="font-serif italic text-sm text-slate-600 dark:text-slate-300 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    "{entry.content.split(' ').slice(0, 10).join(' ')}..."
                                </p>
                            </div>
                            <div className="pl-6 mt-1 text-[8px] font-mono text-slate-300 dark:text-slate-600 uppercase tracking-wider">
                                {new Date(entry.date).toLocaleDateString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const RhythmStatus = ({ habits, onClick }: { habits: Habit[], onClick: () => void }) => {
    // Get top 3 habits
    const activeHabits = habits.filter(h => !h.isArchived).slice(0, 3);
    const days = Array.from({length: 7}).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
    });

    const getLocalDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return (
        <div className={`p-6 rounded-3xl ${GLASS_PANEL} cursor-pointer group`} onClick={onClick}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">Ритмы Дня</h3>
                <Activity size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </div>

            <div className="space-y-4">
                {activeHabits.map(h => (
                    <div key={h.id} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[80px]">{h.title}</span>
                        <div className="flex gap-1.5">
                            {days.map(d => {
                                const k = getLocalDateKey(d);
                                const isDone = !!h.history[k];
                                return (
                                    <div 
                                        key={k} 
                                        className={`w-2 h-2 rounded-full transition-all ${isDone ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-slate-700'}`} 
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
                {activeHabits.length === 0 && <div className="text-xs text-slate-400">Нет активных ритмов</div>}
            </div>
        </div>
    );
};

const NeuralConnection = ({ tasks, onClick }: { tasks: Task[], onClick: () => void }) => {
    // Simulate connection: Find an active task
    const activeTask = tasks.find(t => t.column === 'doing') || tasks[0];
    
    return (
        <div className={`p-6 rounded-3xl ${GLASS_PANEL} flex flex-col justify-between cursor-pointer group`} onClick={onClick}>
            <div className="flex justify-between items-center">
                <h3 className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400">Нейросвязь</h3>
                <BrainCircuit size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </div>

            <div className="flex items-center gap-4 py-2">
                {/* Task Node */}
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center relative z-10">
                    <Zap size={16} className="text-slate-600 dark:text-slate-300" />
                </div>

                {/* Connection Line */}
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                    <motion.div 
                        className="absolute inset-0 bg-indigo-500 w-1/2"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                </div>

                {/* Skill Node */}
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center relative z-10 shadow-sm">
                    <Diamond size={16} className="text-indigo-500" />
                </div>
            </div>

            <div className="mt-2">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Active Protocol</div>
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                    {activeTask ? activeTask.content : "Ожидание ввода..."}
                </div>
            </div>
        </div>
    );
};

// --- GLOBAL HEADER ---
const GlobalHeader = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="flex justify-between items-end border-b border-slate-200/50 dark:border-slate-700/50 pb-4 mb-8">
            <div>
                <div className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    STATUS: PROACTIVE
                </div>
                <h1 className="text-xl font-light text-slate-800 dark:text-slate-200 tracking-tight">WELCOME, SUBJECT.</h1>
            </div>
            <div className="font-mono text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                {formatTime(time)}
            </div>
        </div>
    );
};

const Dashboard: React.FC<ExtendedProps> = ({ notes, tasks, habits, journal, onNavigate, flashcards }) => {
  return (
    <div className="h-full w-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden flex flex-col">
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-10" style={DOT_GRID_STYLE} />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6 md:p-12 relative z-10">
            <div className="max-w-6xl mx-auto h-full flex flex-col">
                <GlobalHeader />

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 flex-1 content-start">
                    
                    {/* COL 1: The Pulse (Large) */}
                    <div className="md:col-span-1 lg:col-span-1 flex items-center justify-center py-8 md:py-0">
                        <CurrentPulse tasks={tasks} />
                    </div>

                    {/* COL 2: Central Command */}
                    <div className="md:col-span-2 lg:col-span-2 grid grid-rows-2 gap-6">
                        {/* Upper: Insights */}
                        <RecentInsights journal={journal} onClick={() => onNavigate(Module.JOURNAL)} />
                        
                        {/* Lower: Split Widgets */}
                        <div className="grid grid-cols-2 gap-6">
                            <RhythmStatus habits={habits} onClick={() => onNavigate(Module.RITUALS)} />
                            <NeuralConnection tasks={tasks} onClick={() => onNavigate(Module.MENTAL_GYM)} />
                        </div>
                    </div>

                    {/* COL 3: Quick Stats / Meta (Optional 4th col or right sidebar feel) */}
                    <div className="md:col-span-3 lg:col-span-1 flex flex-col gap-6">
                        <div className={`flex-1 p-6 rounded-3xl ${GLASS_PANEL} flex flex-col justify-center items-center text-center`}>
                            <div className="font-mono text-4xl text-slate-800 dark:text-white mb-2">{tasks.filter(t => t.column === 'done').length}</div>
                            <div className="text-[9px] uppercase tracking-widest text-slate-400">Миссий выполнено</div>
                        </div>
                        <div className={`flex-1 p-6 rounded-3xl ${GLASS_PANEL} flex flex-col justify-center items-center text-center`}>
                            <div className="font-mono text-4xl text-slate-800 dark:text-white mb-2">{notes.length}</div>
                            <div className="text-[9px] uppercase tracking-widest text-slate-400">Мыслеформ</div>
                        </div>
                        <div className={`flex-1 p-6 rounded-3xl ${GLASS_PANEL} flex flex-col justify-center items-center text-center`}>
                            <div className="font-mono text-4xl text-slate-800 dark:text-white mb-2">{(flashcards || []).length}</div>
                            <div className="text-[9px] uppercase tracking-widest text-slate-400">Скиллов</div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;
