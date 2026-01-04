
import React, { useState, useEffect, useMemo } from 'react';
import { Note, Task, Habit, JournalEntry, Module, Flashcard } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Activity, Diamond, ArrowRight, Zap, Target, BrainCircuit, GripVertical } from 'lucide-react';
import { SPHERES } from '../constants';

interface Props {
  notes: Note[];
  tasks: Task[];
  habits: Habit[];
  journal: JournalEntry[];
  onNavigate: (module: Module) => void;
}

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

const CrystallizationPillar = ({ 
    tasks, 
    journal, 
    impact, 
    scale 
}: { 
    tasks: Task[], 
    journal: JournalEntry[], 
    impact: { active: boolean, color: string, label: string } | null,
    scale: number 
}) => {
    // Logic: Tasks entering (Top) -> Crystallization (Process) -> Insights emerging (Bottom)
    
    const activeTasks = tasks.filter(t => !t.isArchived && t.column !== 'done');
    const doneTasks = tasks.filter(t => t.column === 'done'); 
    const totalTasks = activeTasks.length + doneTasks.length;
    const insightsCount = journal.filter(j => j.isInsight).length;
    const fillPercent = totalTasks === 0 ? 0 : Math.round((doneTasks.length / totalTasks) * 100);
    const isIdle = totalTasks === 0;

    return (
        <motion.div 
            animate={{ scale: scale }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
            className={`
                relative w-16 h-[280px] md:h-[320px] rounded-full 
                ${GLASS_PANEL} 
                flex flex-col items-center justify-between 
                overflow-hidden border-2 
                transition-colors duration-300 z-10
                ${!isIdle ? 'shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]' : ''}
            `}
            style={{
                borderColor: impact?.active ? impact.color : undefined,
                boxShadow: impact?.active ? `0 0 30px ${impact.color}80` : undefined
            }}
        >
            
            {/* 1. The Core (Vertical Axis) */}
            <div className="absolute top-4 bottom-4 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-slate-300/50 via-indigo-500/50 to-slate-300/50 dark:from-slate-700 dark:via-indigo-400/50 dark:to-slate-700 z-10" />

            {/* 2. The Crystal Level (Fluid Fill) */}
            <motion.div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-indigo-500/20 via-indigo-400/10 to-transparent backdrop-blur-sm z-0"
                initial={{ height: '0%' }}
                animate={{ height: `${fillPercent}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
            />
            
            {/* Active Glow Pulse */}
            {!isIdle && (
                <motion.div 
                    className="absolute inset-0 bg-indigo-400/5 z-0"
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            {/* 3. Data Overlay (Top - Inputs) */}
            <div className="relative z-20 mt-6 flex flex-col items-center gap-1">
                <span className="text-[8px] font-mono uppercase tracking-widest text-slate-400">INPUT</span>
                <span className="font-mono text-lg font-bold text-slate-700 dark:text-slate-200">{String(totalTasks).padStart(2, '0')}</span>
            </div>

            {/* 4. The Label (Vertical) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 rotate-[-90deg] whitespace-nowrap pointer-events-none">
                <span className={`font-mono text-[8px] uppercase tracking-[0.3em] font-bold ${isIdle ? 'text-slate-300 dark:text-slate-700' : 'text-indigo-500 dark:text-indigo-300 animate-pulse'}`}>
                    {isIdle ? 'IDLE' : 'CRYSTAL_CORE'}
                </span>
            </div>

            {/* 5. Data Overlay (Bottom - Outputs) */}
            <div className="relative z-20 mb-6 flex flex-col items-center gap-1">
                <span className={`font-mono text-xl font-bold ${insightsCount > 0 ? 'text-indigo-600 dark:text-indigo-400 drop-shadow-sm' : 'text-slate-300 dark:text-slate-700'}`}>
                    {String(insightsCount).padStart(2, '0')}
                </span>
                <span className="text-[8px] font-mono uppercase tracking-widest text-slate-400">OUTPUT</span>
            </div>

            {/* Impact Micro-Copy */}
            <AnimatePresence>
                {impact?.active && (
                    <motion.div
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 0, y: -20 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap"
                    >
                        <span className="font-mono text-[7px] font-bold uppercase tracking-widest bg-white dark:bg-black px-1 py-0.5 rounded shadow-sm" style={{ color: impact.color }}>
                            {impact.label}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Glass Reflections */}
            <div className="absolute top-4 left-4 right-8 h-[40%] bg-gradient-to-b from-white/20 to-transparent rounded-full opacity-50 pointer-events-none z-30" />
        </motion.div>
    );
};

const NeuralBridge = ({ sparks }: { sparks: { id: number, lane: number, color: string }[] }) => {
    const paths = Array.from({ length: 7 });
    
    return (
        <div className="relative w-24 md:w-32 h-[180px] flex flex-col justify-between py-8 px-0 z-0">
            {paths.map((_, i) => (
                <div key={i} className="relative w-full h-px bg-slate-400/10 dark:bg-white/5 overflow-visible">
                    {/* Render sparks on this lane */}
                    <AnimatePresence>
                        {sparks.filter(s => s.lane === i).map(spark => (
                            <motion.div
                                key={spark.id}
                                initial={{ left: '100%', opacity: 0, scale: 0 }}
                                animate={{ left: '0%', opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }} // Custom cubic-bezier
                                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] z-20"
                                style={{ backgroundColor: spark.color, color: spark.color }}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
};

const SpectralBalanceFiller = ({ tasks, habits }: { tasks: Task[], habits: Habit[] }) => {
    const stats = useMemo(() => {
        const counts: Record<string, number> = { productivity: 0, growth: 0, relationships: 0 };
        let total = 0;

        tasks.filter(t => !t.isArchived && t.column !== 'done').forEach(t => {
            if (t.spheres && t.spheres.length > 0) {
                t.spheres.forEach(s => { if (counts[s] !== undefined) { counts[s]++; total++; } });
            }
        });

        habits.filter(h => !h.isArchived).forEach(h => {
             if (h.spheres && h.spheres.length > 0) {
                h.spheres.forEach(s => { if (counts[s] !== undefined) { counts[s]++; total++; } });
            }
        });

        return { counts, total };
    }, [tasks, habits]);

    // Calculate segments
    const segments = SPHERES.map(sphere => {
        const count = stats.counts[sphere.id] || 0;
        const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
        return { ...sphere, percent, count };
    });

    const dominantSegment = segments.reduce((prev, current) => (prev.percent > current.percent) ? prev : current);
    const isImbalanced = dominantSegment.percent > 70 && stats.total > 2;
    
    // Warning Color
    const warnColor = isImbalanced ? (dominantSegment.id === 'productivity' ? 'indigo' : dominantSegment.id === 'growth' ? 'emerald' : 'rose') : '';
    const shadowClass = isImbalanced ? `shadow-[0_0_25px_-5px_var(--tw-shadow-color)]` : '';
    const borderColorClass = isImbalanced 
        ? (warnColor === 'indigo' ? 'border-indigo-500/50 shadow-indigo-500/30' : warnColor === 'emerald' ? 'border-emerald-500/50 shadow-emerald-500/30' : 'border-rose-500/50 shadow-rose-500/30')
        : 'border-white/20 dark:border-white/5';

    return (
        <div className="relative flex items-center gap-4">
            {/* The Capsule */}
            <div className={`
                relative w-16 h-[280px] md:h-[320px] rounded-full 
                ${GLASS_PANEL} 
                flex flex-col-reverse
                overflow-hidden border-2 
                transition-all duration-700 z-10
                ${borderColorClass}
                ${shadowClass}
            `}>
                {segments.map((seg, i) => (
                    <motion.div
                        key={seg.id}
                        initial={{ height: 0 }}
                        animate={{ height: `${seg.percent}%` }}
                        transition={{ duration: 1, delay: i * 0.2, ease: "circOut" }}
                        className={`w-full relative transition-all duration-500 ${seg.bg.replace('50', '200').replace('/30', '')}`}
                        style={{
                            opacity: seg.count > 0 ? 0.8 : 0.1,
                            boxShadow: seg.count > 0 ? `0 0 15px ${seg.color === 'indigo' ? '#6366f1' : seg.color === 'emerald' ? '#10b981' : '#f43f5e'}` : 'none'
                        }}
                    >
                        {/* Internal Texture */}
                        {seg.count > 0 && <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-30" />}
                    </motion.div>
                ))}

                {/* Vertical Label */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 rotate-[-90deg] whitespace-nowrap pointer-events-none mix-blend-difference">
                    <span className="font-mono text-[8px] uppercase tracking-[0.3em] font-bold text-white/80">
                        ENERGY_SOURCE
                    </span>
                </div>
                
                {/* Warning Pulse */}
                {isImbalanced && (
                    <motion.div 
                        className={`absolute inset-0 border-4 rounded-full pointer-events-none ${warnColor === 'indigo' ? 'border-indigo-500' : warnColor === 'emerald' ? 'border-emerald-500' : 'border-rose-500'}`}
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}
            </div>

            {/* Typography Legend (Desktop Only) */}
            <div className="hidden xl:flex flex-col gap-2 h-full justify-center">
                {segments.map(seg => (
                    <div key={seg.id} className="flex items-center gap-2">
                        <div className={`w-1 h-1 rounded-full ${seg.bg.replace('50', '500').replace('/30','')}`} />
                        <span className="font-mono text-[8px] text-slate-400 uppercase tracking-wider">
                            {seg.label.substring(0,3)}: {Math.round(seg.percent)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DualCoreReactor = ({ tasks, journal, habits }: { tasks: Task[], journal: JournalEntry[], habits: Habit[] }) => {
    const [sparks, setSparks] = useState<{ id: number, lane: number, color: string }[]>([]);
    const [impact, setImpact] = useState<{ active: boolean, color: string, label: string } | null>(null);
    const [pillarScale, setPillarScale] = useState(1);

    // Synthesis Simulation Loop
    useEffect(() => {
        // Only run if there is actual data to synthesize
        if (tasks.length === 0 && journal.length === 0) return;

        const spawnSpark = () => {
            const randomSphere = SPHERES[Math.floor(Math.random() * SPHERES.length)];
            const color = randomSphere.color === 'indigo' ? '#6366f1' : randomSphere.color === 'emerald' ? '#10b981' : '#f43f5e';
            const lane = Math.floor(Math.random() * 7);
            const id = Date.now() + Math.random();

            setSparks(prev => [...prev, { id, lane, color }]);

            // Schedule impact (0.8s travel time)
            setTimeout(() => {
                triggerImpact(color);
                setSparks(prev => prev.filter(s => s.id !== id));
            }, 800);
        };

        // Determine frequency based on "Activity" level
        const activityLevel = (tasks.filter(t => t.column === 'done').length + journal.length) / 5;
        const intervalTime = Math.max(2000, 8000 - (activityLevel * 1000)); // Faster if more activity

        const interval = setInterval(spawnSpark, intervalTime);
        return () => clearInterval(interval);
    }, [tasks.length, journal.length]);

    const triggerImpact = (color: string) => {
        // Impact Effect
        setImpact({ active: true, color, label: '[ +SYNTHESIS ]' });
        setPillarScale(1.02);

        // Reset
        setTimeout(() => {
            setImpact(null);
            setPillarScale(1);
        }, 1200); // 1.2s fade out
    };

    return (
        <div className="flex items-center relative">
             <CrystallizationPillar tasks={tasks} journal={journal} impact={impact} scale={pillarScale} />
             <NeuralBridge sparks={sparks} />
             <SpectralBalanceFiller tasks={tasks} habits={habits} />
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
                                <p className="font-serif italic text-sm text-slate-600 dark:text-slate-300 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors line-clamp-2">
                                    "{entry.content}"
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
                    
                    {/* COL 1: The Dual Core Reactor */}
                    <div className="md:col-span-1 lg:col-span-1 flex items-center justify-center py-8 md:py-0 order-first md:order-none">
                        <DualCoreReactor tasks={tasks} journal={journal} habits={habits} />
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

                    {/* COL 3: Quick Stats / Meta (Right Sidebar) */}
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
