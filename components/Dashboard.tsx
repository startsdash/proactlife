
import React, { useMemo, useEffect, useState } from 'react';
import { Note, Task, Habit, JournalEntry, Module, Flashcard } from '../types';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Target, 
  BrainCircuit, 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Trophy, 
  Activity,
  Flame,
  ArrowRight,
  Sparkles,
  Layout,
  Dumbbell,
  RotateCw as RotateCwIcon // Renamed to avoid collision with helper if needed, or just use as is
} from 'lucide-react';
import { SPHERES } from '../constants';

interface Props {
  notes: Note[];
  tasks: Task[];
  habits: Habit[];
  journal: JournalEntry[];
  flashcards?: Flashcard[];
  onNavigate: (module: Module) => void;
}

// --- CONSTANTS ---
const GLASS_PANEL = "bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-white/60 dark:hover:border-white/10";

// --- UTILS ---
const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- WIDGETS ---

// 1. ENERGY PULSAR (HERO)
const EnergyPulsar = ({ tasks, habits, journal }: { tasks: Task[], habits: Habit[], journal: JournalEntry[] }) => {
    const todayStr = getLocalDateKey(new Date());
    
    // Metrics
    const completedTasksToday = tasks.filter(t => t.column === 'done' && getLocalDateKey(new Date(t.createdAt)) === todayStr).length; 
    
    const totalTasks = tasks.filter(t => !t.isArchived).length;
    const doneTasks = tasks.filter(t => t.column === 'done' && !t.isArchived).length;
    const taskRate = totalTasks > 0 ? (doneTasks / totalTasks) : 0;

    // Habits Today
    const activeHabits = habits.filter(h => !h.isArchived);
    const habitsDoneToday = activeHabits.filter(h => h.history[todayStr]).length;
    const habitRate = activeHabits.length > 0 ? (habitsDoneToday / activeHabits.length) : 0;

    // Journal Pulse
    const hasJournalEntry = journal.some(j => getLocalDateKey(new Date(j.date)) === todayStr);
    const journalRate = hasJournalEntry ? 1 : 0;

    // Composite Energy Score (0-100)
    const energyScore = Math.round(((taskRate * 0.4) + (habitRate * 0.4) + (journalRate * 0.2)) * 100);

    // Dominant Sphere Color
    const counts: Record<string, number> = { productivity: 0, growth: 0, relationships: 0 };
    tasks.filter(t => t.column === 'done').forEach(t => t.spheres?.forEach(s => counts[s] = (counts[s] || 0) + 1));
    const dominantSphere = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'productivity');
    
    let ringColor = '#6366f1'; // Indigo
    if (dominantSphere === 'growth') ringColor = '#10b981'; // Emerald
    if (dominantSphere === 'relationships') ringColor = '#f43f5e'; // Rose

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-8 relative overflow-hidden flex flex-col items-center justify-center group`}>
            <div className="absolute top-4 left-6 flex items-center gap-2">
                <Zap size={16} className="text-amber-500 fill-amber-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Энергия дня</span>
            </div>

            <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Background Glow */}
                <div 
                    className="absolute inset-0 rounded-full blur-3xl opacity-20 transition-colors duration-1000"
                    style={{ backgroundColor: ringColor }}
                />

                <svg className="w-full h-full transform -rotate-90">
                    {/* Track */}
                    <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />
                    <circle cx="96" cy="96" r="72" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />
                    <circle cx="96" cy="96" r="56" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700" />

                    {/* Progress Rings */}
                    {/* Habits Ring (Outer) */}
                    <motion.circle 
                        cx="96" cy="96" r="88" fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round"
                        initial={{ pathLength: 0 }} animate={{ pathLength: habitRate }} transition={{ duration: 1.5, ease: "circOut" }}
                        className="opacity-80"
                    />
                    {/* Tasks Ring (Middle) */}
                    <motion.circle 
                        cx="96" cy="96" r="72" fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round"
                        initial={{ pathLength: 0 }} animate={{ pathLength: taskRate }} transition={{ duration: 1.5, delay: 0.2, ease: "circOut" }}
                        className="opacity-60"
                    />
                    {/* Journal Ring (Inner) */}
                    <motion.circle 
                        cx="96" cy="96" r="56" fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round"
                        initial={{ pathLength: 0 }} animate={{ pathLength: journalRate }} transition={{ duration: 1.5, delay: 0.4, ease: "circOut" }}
                        className="opacity-40"
                    />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl md:text-5xl font-light text-slate-800 dark:text-white tracking-tighter">
                        {energyScore}%
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Заряд</span>
                </div>
            </div>

            <div className="mt-8 text-center max-w-[200px]">
                <p className="text-sm font-serif italic text-slate-500 dark:text-slate-400 leading-relaxed">
                    {energyScore < 30 ? "Начинаем разгон..." : energyScore < 70 ? "Хороший темп, так держать!" : "Пиковая производительность!"}
                </p>
            </div>
        </div>
    );
};

// 2. HABIT EQUALIZER (UPDATED: Kinetic Reactors)
const HabitEqualizer = ({ habits }: { habits: Habit[] }) => {
    // Last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { date: d, key: getLocalDateKey(d) };
    });

    const activeHabits = habits.filter(h => !h.isArchived);
    
    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 flex flex-col relative`}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Flame size={16} className="text-orange-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Ритм привычек</span>
                </div>
            </div>

            <div className="flex-1 flex items-end justify-between gap-3 px-1">
                {days.map((day, i) => {
                    let completed = 0;
                    activeHabits.forEach(h => {
                        if (h.history[day.key]) completed++;
                    });
                    const total = activeHabits.length;
                    const percent = total > 0 ? (completed / total) : 0;
                    const isToday = i === 6;
                    
                    // Kinetic Energy Colors
                    let gradient = "from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-600";
                    
                    if (percent > 0) {
                        gradient = "from-orange-500 via-amber-500 to-yellow-400";
                    }
                    if (percent >= 0.8) {
                        gradient = "from-rose-600 via-orange-500 to-amber-300";
                    }

                    return (
                        <div key={day.key} className="flex-1 h-full flex flex-col items-center gap-2 group min-w-[20px]">
                            {/* Reactor Tube */}
                            <div className="relative w-full h-full min-h-[60px] bg-slate-100/50 dark:bg-slate-800/30 rounded-full border border-slate-200/50 dark:border-white/5 overflow-hidden backdrop-blur-sm shadow-inner transition-all duration-500 hover:border-white/20">
                                {/* Inner Glow (Container) */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent dark:from-black/20 pointer-events-none" />
                                
                                {/* Liquid Fill */}
                                <div className="absolute bottom-0 left-0 right-0 top-0 flex items-end p-[3px]">
                                    <motion.div 
                                        className={`w-full rounded-full bg-gradient-to-t ${gradient} relative overflow-hidden`}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${percent * 100}%` }}
                                        transition={{ duration: 1.2, type: "spring", bounce: 0, delay: i * 0.05 }}
                                    >
                                        {/* Pulse Core if active */}
                                        {percent > 0 && (
                                            <motion.div 
                                                className="absolute inset-0 bg-white/30 blur-md"
                                                animate={{ opacity: [0, 0.5, 0] }}
                                                transition={{ duration: 2 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
                                            />
                                        )}
                                        
                                        {/* Bubbles / Energy Particles (CSS) */}
                                        {percent > 0.5 && (
                                            <div className="absolute inset-0 w-full h-full opacity-50">
                                                <div className="absolute bottom-0 left-1/4 w-1 h-1 bg-white rounded-full animate-[rise_2s_infinite_linear]" />
                                                <div className="absolute bottom-0 right-1/4 w-1 h-1 bg-white rounded-full animate-[rise_3s_infinite_linear_0.5s]" />
                                            </div>
                                        )}

                                        {/* Top surface highlight */}
                                        <div className="absolute top-0 left-1 right-1 h-[2px] bg-white/60 rounded-full blur-[1px]" />
                                    </motion.div>
                                </div>
                                
                                {/* Glass Reflection */}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent pointer-events-none rounded-full" />
                            </div>

                            {/* Label */}
                            <div className="text-center h-4 flex items-center justify-center">
                                <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${isToday ? 'text-orange-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'}`}>
                                    {day.date.toLocaleDateString('ru-RU', { weekday: 'short' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <style>{`
                @keyframes rise {
                    0% { transform: translateY(100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(-200%); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

// 3. MIND SPARKLINE
const MindSparkline = ({ notes }: { notes: Note[] }) => {
    // Last 7 days note counts
    const data = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = getLocalDateKey(d);
        const count = notes.filter(n => getLocalDateKey(new Date(n.createdAt)) === key).length;
        return count;
    });

    const totalLast7 = data.reduce((a,b) => a + b, 0);
    const max = Math.max(...data, 1);
    
    // SVG Path
    const width = 100;
    const height = 40;
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (val / max) * height;
        return `${x},${y}`;
    }).join(' ');

    const areaPath = `${points} L ${width},${height} L 0,${height} Z`;

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 flex flex-col justify-between`}>
            <div className="flex items-center gap-2">
                <BrainCircuit size={16} className="text-violet-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Мысли</span>
            </div>

            <div>
                <div className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tighter mb-1">
                    {totalLast7}
                </div>
                <div className="text-[9px] text-slate-400">за 7 дней</div>
            </div>

            <div className="h-12 w-full relative overflow-hidden">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="mindGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <motion.path 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
                        d={`M ${points}`} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                    />
                    <motion.path 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
                        d={areaPath} fill="url(#mindGradient)" vectorEffect="non-scaling-stroke"
                    />
                </svg>
            </div>
        </div>
    );
};

// 4. CHRONOS RADAR
const ChronosRadar = ({ tasks }: { tasks: Task[] }) => {
    // Buckets: 0-4, 4-8, 8-12, 12-16, 16-20, 20-24
    const buckets = [0, 0, 0, 0, 0, 0]; 
    const labels = ["00", "04", "08", "12", "16", "20"];
    
    tasks.filter(t => t.column === 'done').forEach(t => {
        // Use completion time if available (using createdAt as proxy if not, but ideally should be updatedAt or completedAt)
        // Since we don't have completedAt, let's pretend createdAt is the activity time for now or use current time if just moved. 
        // For accurate history, we need a 'completedAt' field. 
        // Assuming createdAt reflects 'activity' for analysis purposes in this demo context.
        const hour = new Date(t.createdAt).getHours();
        const bucketIdx = Math.floor(hour / 4);
        buckets[bucketIdx]++;
    });

    const max = Math.max(...buckets, 1);
    const normalized = buckets.map(v => v / max);

    // Radar Points Calculation
    const center = 50;
    const radius = 40;
    const angleStep = (Math.PI * 2) / 6;
    
    const points = normalized.map((val, i) => {
        const angle = i * angleStep - Math.PI / 2; // Start at top
        // Min radius 10% so it's visible
        const r = (val * 0.9 + 0.1) * radius; 
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
    }).join(' ');

    // Find Peak
    const peakIdx = buckets.indexOf(Math.max(...buckets));
    const peakLabel = labels[peakIdx];
    const nextLabel = labels[(peakIdx + 1) % 6];

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 relative flex flex-col md:flex-row items-center gap-6`}>
            <div className="absolute top-6 left-6 flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Хронотип активности</span>
                <button className="ml-auto text-slate-400 hover:text-slate-600"><RotateCw size={12} /></button>
            </div>

            <div className="flex-1 flex items-center justify-center w-full h-48 md:h-auto mt-8 md:mt-0">
                <svg viewBox="0 0 100 100" className="w-48 h-48 overflow-visible">
                    {/* Grid Levels */}
                    {[0.33, 0.66, 1].map((scale, i) => (
                        <polygon 
                            key={i}
                            points={Array.from({length: 6}).map((_, j) => {
                                const angle = j * angleStep - Math.PI / 2;
                                const r = radius * scale;
                                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                            }).join(' ')}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="0.5"
                            className="text-slate-200 dark:text-slate-700"
                            strokeDasharray={i < 2 ? "2 2" : ""}
                        />
                    ))}
                    
                    {/* Axes */}
                    {Array.from({length: 6}).map((_, i) => {
                        const angle = i * angleStep - Math.PI / 2;
                        const x = center + radius * Math.cos(angle);
                        const y = center + radius * Math.sin(angle);
                        return (
                            <g key={i}>
                                <line x1={center} y1={center} x2={x} y2={y} stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-700" />
                                <text x={x * 1.15 - 7} y={y * 1.15 - 7} className="text-[4px] font-mono fill-slate-400 font-bold">{labels[i]}</text>
                            </g>
                        );
                    })}

                    {/* Data Blob */}
                    <motion.polygon 
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                        transition={{ duration: 1, type: "spring" }}
                        points={points}
                        fill="rgba(99,102,241, 0.2)"
                        stroke="#6366f1"
                        strokeWidth="1.5"
                    />
                    {/* Points */}
                    {normalized.map((val, i) => {
                        const angle = i * angleStep - Math.PI / 2;
                        const r = (val * 0.9 + 0.1) * radius; 
                        const x = center + r * Math.cos(angle);
                        const y = center + r * Math.sin(angle);
                        return <circle key={i} cx={x} cy={y} r="1.5" className="fill-indigo-500" />
                    })}
                </svg>
            </div>

            <div className="w-full md:w-40 flex flex-col justify-center items-center md:items-start text-center md:text-left gap-1 pb-4 md:pb-0">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Пик продуктивности</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-white">
                    {peakLabel}:00 <span className="text-slate-400 text-sm font-normal">– {nextLabel}:00</span>
                </div>
                <div className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Ваше «золотое время». Планируйте сложные задачи именно на этот слот.
                </div>
            </div>
        </div>
    );
};

// 5. CHALLENGES WIDGET
const ChallengesWidget = ({ tasks }: { tasks: Task[] }) => {
    const activeChallenges = tasks.filter(t => t.activeChallenge && !t.isChallengeCompleted && !t.isArchived);
    const completedChallenges = tasks.reduce((acc, t) => acc + (t.challengeHistory?.length || 0) + (t.isChallengeCompleted ? 1 : 0), 0);

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 flex flex-col`}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <Zap size={16} className="text-indigo-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Вызовы</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center text-center gap-2 py-4">
                {activeChallenges.length > 0 ? (
                    <div className="w-full space-y-4">
                        {activeChallenges.slice(0, 2).map(t => (
                            <div key={t.id} className="text-left bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="text-[10px] font-bold text-indigo-500 uppercase mb-1 truncate">Active Challenge</div>
                                <div className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 font-serif italic">
                                    {t.activeChallenge?.split('\n')[0].replace(/^[#\-* ]+/, '')}
                                </div>
                            </div>
                        ))}
                        {activeChallenges.length > 2 && (
                            <div className="text-[10px] text-slate-400">и еще {activeChallenges.length - 2} активных</div>
                        )}
                    </div>
                ) : (
                    <div className="opacity-50">
                        <Trophy size={48} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" strokeWidth={1} />
                        <div className="text-xs text-slate-400">Нет активных вызовов</div>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Зал славы: {completedChallenges} побед</span>
            </div>
        </div>
    );
};

// 6. BALANCE SPHERES MINI
const BalanceMini = ({ tasks, habits }: { tasks: Task[], habits: Habit[] }) => {
    // Count items by sphere
    const counts: Record<string, number> = { productivity: 0, growth: 0, relationships: 0 };
    let total = 0;
    
    // Count done tasks & active habits
    tasks.filter(t => t.column === 'done').forEach(t => t.spheres?.forEach(s => { counts[s] = (counts[s]||0)+1; total++; }));
    habits.filter(h => !h.isArchived).forEach(h => h.spheres?.forEach(s => { counts[s] = (counts[s]||0)+1; total++; }));

    const data = SPHERES.map(s => ({
        ...s,
        percent: total > 0 ? (counts[s.id] || 0) / total * 100 : 0
    }));

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 flex flex-col justify-between`}>
            <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Баланс (7 дн)</span>
            </div>
            
            <div className="space-y-3">
                {data.map(s => (
                    <div key={s.id} className="space-y-1">
                        <div className="flex justify-between text-[9px] uppercase font-bold text-slate-500">
                            <span>{s.label}</span>
                            <span>{Math.round(s.percent)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                                className={`h-full rounded-full ${s.bg.replace('50', '500').replace('/30','')}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${s.percent}%` }}
                                transition={{ duration: 1 }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD ---

const Dashboard: React.FC<Props> = ({ notes, tasks, habits, journal, onNavigate, flashcards }) => {
  return (
    <div className="h-full w-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden flex flex-col">
        {/* Background Grid */}
        <div 
            className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-10" 
            style={{ 
                backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
                backgroundSize: '32px 32px'
            }} 
        />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-8 relative z-10">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Обзор</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Пульс твоей продуктивности</p>
                    </div>
                </header>

                {/* BENTO GRID LAYOUT */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
                    
                    {/* Hero: Energy Pulsar (Tall) */}
                    <div className="lg:col-span-1 lg:row-span-2 min-h-[350px]">
                        <EnergyPulsar tasks={tasks} habits={habits} journal={journal} />
                    </div>

                    {/* Habit Rhythm (Wide) */}
                    <div className="lg:col-span-2 min-h-[180px]">
                        <HabitEqualizer habits={habits} />
                    </div>

                    {/* Mind Sparkline (Small) */}
                    <div className="lg:col-span-1 min-h-[180px]">
                        <MindSparkline notes={notes} />
                    </div>

                    {/* Chronos Radar (Wide) */}
                    <div className="lg:col-span-2 min-h-[250px]">
                        <ChronosRadar tasks={tasks} />
                    </div>

                    {/* Challenges (Small) */}
                    <div className="lg:col-span-1 min-h-[250px]">
                        <ChallengesWidget tasks={tasks} />
                    </div>

                    {/* Extra Row: Quick Links or Balance */}
                    <div className="lg:col-span-1 min-h-[180px]">
                        <BalanceMini tasks={tasks} habits={habits} />
                    </div>
                    
                    {/* Insights Button (Banner) */}
                    <div className="lg:col-span-3 min-h-[180px]">
                        <button 
                            onClick={() => onNavigate(Module.JOURNAL)}
                            className="w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-lg hover:shadow-indigo-500/30 transition-all"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-700">
                                <Sparkles size={120} />
                            </div>
                            <div className="relative z-10 flex flex-col justify-between h-full items-start">
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Наставник</div>
                                    <h3 className="text-3xl font-light">Инсайты</h3>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium bg-white/20 px-4 py-2 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors">
                                    Перейти в Дневник <ArrowRight size={16} />
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* SKILLS SHORTCUT (Simple) */}
                    <div className="lg:col-span-1 lg:col-start-1 min-h-[100px]">
                         <button 
                            onClick={() => onNavigate(Module.MENTAL_GYM)}
                            className={`w-full h-full ${GLASS_PANEL} rounded-[32px] p-6 flex items-center justify-between group`}
                        >
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">База знаний</span>
                                <span className="text-xl font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 transition-colors">Скиллы</span>
                            </div>
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                <Dumbbell size={24} />
                            </div>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

// Helper for rotate button (mock refresh)
function RotateCw({size, className}: {size:number, className?: string}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
    )
}

export default Dashboard;
