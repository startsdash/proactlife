
import React, { useMemo } from 'react';
import { Note, Task, Habit, JournalEntry, Module, Flashcard } from '../types';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Target, 
  BrainCircuit, 
  TrendingUp, 
  Clock, 
  Trophy, 
  Activity,
  Flame,
  ArrowRight,
  Sparkles,
  Dumbbell,
  Atom,
  Dna,
  Fingerprint
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
const GLASS_PANEL = "bg-white/40 dark:bg-[#0f172a]/60 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-xl transition-all duration-500 hover:shadow-2xl hover:border-white/40 dark:hover:border-white/10 group";

const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- WIDGETS ---

// 1. ENERGY PLASMA CORE
const EnergyPlasma = ({ tasks, habits, journal }: { tasks: Task[], habits: Habit[], journal: JournalEntry[] }) => {
    const todayStr = getLocalDateKey(new Date());
    
    // Metrics
    const totalTasks = tasks.filter(t => !t.isArchived).length;
    const doneTasks = tasks.filter(t => t.column === 'done' && !t.isArchived).length;
    const taskRate = totalTasks > 0 ? (doneTasks / totalTasks) : 0;

    const activeHabits = habits.filter(h => !h.isArchived);
    const habitsDoneToday = activeHabits.filter(h => h.history[todayStr]).length;
    const habitRate = activeHabits.length > 0 ? (habitsDoneToday / activeHabits.length) : 0;

    const hasJournalEntry = journal.some(j => getLocalDateKey(new Date(j.date)) === todayStr);
    const journalRate = hasJournalEntry ? 1 : 0;

    const energyScore = Math.round(((taskRate * 0.4) + (habitRate * 0.4) + (journalRate * 0.2)) * 100);

    // Color Logic based on Energy
    let coreColor = "text-indigo-500";
    let glowColor = "rgba(99,102,241,"; // Indigo
    
    if (energyScore > 75) {
        coreColor = "text-emerald-400";
        glowColor = "rgba(52,211,153,"; // Emerald
    } else if (energyScore > 40) {
        coreColor = "text-amber-400";
        glowColor = "rgba(251,191,36,"; // Amber
    } else {
        coreColor = "text-rose-500";
        glowColor = "rgba(244,63,94,"; // Rose
    }

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[40px] p-8 relative overflow-hidden flex flex-col items-center justify-center`}>
            <div className="absolute top-6 left-6 flex items-center gap-2 z-20">
                <Atom size={16} className={`${coreColor} animate-spin-slow`} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Core Reactor</span>
            </div>

            <div className="relative w-64 h-64 flex items-center justify-center">
                {/* Outer Field */}
                <motion.div 
                    animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                    transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
                    className="absolute inset-0 rounded-full blur-3xl opacity-20"
                    style={{ background: `radial-gradient(circle, ${glowColor}0.8) 0%, transparent 70%)` }}
                />
                
                {/* Plasma Layers */}
                <svg className="w-full h-full relative z-10 overflow-visible">
                    <defs>
                        <filter id="plasmaGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Orbit 1 */}
                    <motion.circle 
                        cx="128" cy="128" r="80" 
                        fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8"
                        className={`${coreColor} opacity-30`}
                        animate={{ rotate: -360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    />
                    
                    {/* Orbit 2 */}
                    <motion.circle 
                        cx="128" cy="128" r="60" 
                        fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 40"
                        className={`${coreColor} opacity-50`}
                        animate={{ rotate: 180 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    />

                    {/* The Core */}
                    <motion.circle 
                        cx="128" cy="128" r={40 + (energyScore * 0.2)} 
                        fill={`url(#grad-${energyScore})`} 
                        filter="url(#plasmaGlow)"
                        className={`${coreColor} fill-current`}
                        animate={{ r: [40, 45 + (energyScore * 0.1), 40], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                </svg>

                {/* Data Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none mix-blend-difference text-white">
                    <span className="text-6xl font-thin tracking-tighter filter drop-shadow-lg">
                        {energyScore}%
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] opacity-80 mt-2">Output</span>
                </div>
            </div>

            <div className="mt-4 text-center z-10 max-w-[240px]">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${energyScore > 50 ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        {energyScore < 30 ? "SYSTEM_LOW" : energyScore < 70 ? "SYSTEM_NOMINAL" : "SYSTEM_PEAK"}
                    </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-serif italic opacity-80">
                    {energyScore < 30 ? "Необходима дозаправка. Выполни ритуал." : energyScore < 70 ? "Реактор стабилен. Наращивай темп." : "Энергия переполняет. Время для прорыва."}
                </p>
            </div>
        </div>
    );
};

// 2. HABIT HEARTBEAT (ECG)
const HabitHeartbeat = ({ habits }: { habits: Habit[] }) => {
    // Generate data for last 7 days
    const activeHabits = habits.filter(h => !h.isArchived);
    const data = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = getLocalDateKey(d);
        
        let completed = 0;
        activeHabits.forEach(h => { if(h.history[key]) completed++; });
        
        const total = activeHabits.length;
        const percent = total > 0 ? completed / total : 0;
        
        return { date: d, percent };
    });

    // Generate Path
    const height = 60;
    const width = 280;
    const step = width / 6;
    
    // ECG Logic: Flat if 0, Spike if > 0. Height of spike depends on percent.
    let path = `M 0,${height} `;
    
    data.forEach((d, i) => {
        const x = i * step;
        const spikeHeight = d.percent * height * 0.8; // Max 80% height
        const baseY = height - 5;
        
        // Create a "pulse" shape for each day
        if (d.percent > 0) {
            path += `L ${x + step * 0.2},${baseY} `; // Start of beat
            path += `L ${x + step * 0.4},${baseY - spikeHeight} `; // Peak
            path += `L ${x + step * 0.6},${baseY + 5} `; // Dip
            path += `L ${x + step * 0.8},${baseY} `; // Return
        } else {
            path += `L ${x + step},${baseY} `; // Flatline
        }
    });

    const isAlive = data[6].percent > 0;

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden`}>
            <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <Activity size={16} className={`${isAlive ? 'text-emerald-500' : 'text-slate-400'} animate-pulse`} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Rhythm</span>
                </div>
                <div className="font-mono text-[10px] text-slate-500">7 DAYS</div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <div className="w-full h-px bg-emerald-500" />
            </div>

            <div className="h-20 w-full relative flex items-end">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>
                    <motion.path 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, ease: "linear" }}
                        d={path} 
                        fill="none" 
                        stroke={isAlive ? "#10b981" : "#94a3b8"} 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        filter="url(#glow)"
                    />
                </svg>
                {/* Scanning line animation */}
                <motion.div 
                    className="absolute top-0 bottom-0 w-[2px] bg-white/50 shadow-[0_0_10px_white]"
                    animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
            </div>
            
            <div className="flex justify-between px-1 mt-2">
                {data.map((d, i) => (
                    <div key={i} className="text-[8px] font-bold text-slate-400 uppercase">{d.date.toLocaleDateString('ru-RU', {weekday: 'short'})}</div>
                ))}
            </div>
        </div>
    );
};

// 3. NEURAL SPARK FIELD (Notes)
const NeuralField = ({ notes }: { notes: Note[] }) => {
    // Generate spark points
    const sparks = useMemo(() => {
        // Last 7 days
        const limit = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentNotes = notes.filter(n => n.createdAt > limit);
        
        return recentNotes.map(n => ({
            id: n.id,
            // Random positions for "Field" effect
            x: Math.random() * 100, 
            y: Math.random() * 100,
            size: Math.random() * 3 + 2,
            opacity: Math.random() * 0.5 + 0.5,
            delay: Math.random() * 2
        }));
    }, [notes.length]);

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden group`}>
            <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-2">
                    <BrainCircuit size={16} className="text-violet-500" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Synapses</span>
                </div>
                <div className="text-2xl font-light text-slate-800 dark:text-white">{sparks.length}</div>
            </div>

            {/* The Field */}
            <div className="absolute inset-0 z-0">
                {sparks.map(spark => (
                    <motion.div
                        key={spark.id}
                        className="absolute rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]"
                        style={{ 
                            left: `${spark.x}%`, 
                            top: `${spark.y}%`, 
                            width: spark.size, 
                            height: spark.size 
                        }}
                        animate={{ 
                            opacity: [0.2, spark.opacity, 0.2],
                            scale: [1, 1.5, 1]
                        }}
                        transition={{ 
                            duration: 3 + Math.random() * 2, 
                            repeat: Infinity, 
                            delay: spark.delay,
                            ease: "easeInOut"
                        }}
                    />
                ))}
                {/* Connecting Lines (Fake Constellation) */}
                <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
                    {sparks.slice(0, 5).map((s, i) => {
                        if (i === sparks.length - 1) return null;
                        const next = sparks[i+1];
                        return (
                            <line 
                                key={i}
                                x1={`${s.x}%`} y1={`${s.y}%`} 
                                x2={`${next.x}%`} y2={`${next.y}%`} 
                                stroke="#a78bfa" 
                                strokeWidth="0.5" 
                            />
                        )
                    })}
                </svg>
            </div>
            
            <div className="z-10 mt-auto">
                <div className="text-[9px] text-slate-400 text-right">Last 7 Days</div>
            </div>
        </div>
    );
};

// 4. CHRONOS SUN-PATH
const ChronosSun = ({ tasks }: { tasks: Task[] }) => {
    // Distribute completed tasks into 24 hours
    const hours = new Array(24).fill(0);
    tasks.filter(t => t.column === 'done').forEach(t => {
        const h = new Date(t.createdAt).getHours();
        hours[h]++;
    });
    
    const max = Math.max(...hours, 1);
    
    // Golden Time (00-04) highlight
    const isNightOwl = hours.slice(0, 5).reduce((a,b) => a+b, 0) > hours.slice(8, 18).reduce((a,b) => a+b, 0) * 0.5;

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 relative flex flex-col md:flex-row items-center gap-6 overflow-hidden`}>
            {/* Background Gradient for Day/Night */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-amber-500/5 pointer-events-none" />

            <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
                <Clock size={16} className="text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Chronos</span>
            </div>

            <div className="flex-1 flex items-center justify-center w-full h-48 md:h-auto mt-8 md:mt-0 relative z-10">
                {/* Sun Path Visualization */}
                <div className="relative w-40 h-40">
                    {/* Ring */}
                    <div className="absolute inset-0 rounded-full border border-slate-200 dark:border-slate-700" />
                    
                    {/* Hour Bars */}
                    {hours.map((count, h) => {
                        const angle = (h / 24) * 360 - 90; // Start at 12 AM (top) -> No, standard clock 0 is usually top but 00:00 is midnight.
                        // Let's put 00:00 at bottom (Night) and 12:00 at top (Day)?
                        // Or standard 24h clock: 0 at top.
                        // Let's do 0 at bottom (Midnight) for "Sun Path" metaphor.
                        // So 12 (Noon) is Top.
                        const sunAngle = ((h - 12) / 24) * 360 - 90; 
                        
                        const height = (count / max) * 20 + 5;
                        const isGolden = h >= 0 && h < 4; // 00-04

                        return (
                            <motion.div
                                key={h}
                                className={`absolute w-1 rounded-full origin-bottom ${isGolden ? 'bg-indigo-500 shadow-[0_0_8px_#6366f1]' : 'bg-slate-300 dark:bg-slate-600'}`}
                                style={{
                                    height: `${height}px`,
                                    left: '50%',
                                    top: '50%',
                                    transform: `rotate(${sunAngle + 90}deg) translateY(-50px)` // Push out from center radius 50
                                }}
                                initial={{ height: 0 }}
                                animate={{ height: `${height}px` }}
                                transition={{ delay: h * 0.05 }}
                            />
                        );
                    })}
                    
                    {/* Central Star */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-200 to-amber-100 dark:from-indigo-900 dark:to-slate-800 shadow-inner flex items-center justify-center">
                            {isNightOwl ? <Sparkles size={24} className="text-indigo-400" /> : <Flame size={24} className="text-amber-500" />}
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-32 flex flex-col justify-center items-center md:items-start text-center md:text-left gap-1 pb-4 md:pb-0 z-10">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Active Mode</div>
                <div className="text-lg font-bold text-slate-800 dark:text-white">
                    {isNightOwl ? "Night Owl" : "Day Walker"}
                </div>
                <div className="text-[10px] text-slate-500 leading-relaxed mt-1">
                    {isNightOwl ? "Фокус в тишине ночи. Глубокая работа." : "Энергия солнца. Социальная активность."}
                </div>
            </div>
        </div>
    );
};

// 5. BIO-BALANCE DNA
const BioBalance = ({ tasks, habits }: { tasks: Task[], habits: Habit[] }) => {
    // Calculate Sphere Distribution
    const counts: Record<string, number> = { productivity: 0, growth: 0, relationships: 0 };
    let total = 0;
    
    [...tasks.filter(t => t.column === 'done'), ...habits.filter(h => !h.isArchived)].forEach(item => {
        item.spheres?.forEach(s => {
            counts[s] = (counts[s] || 0) + 1;
            total++;
        });
    });

    const data = SPHERES.map(s => ({
        ...s,
        val: total > 0 ? (counts[s.id] || 0) / total : 0
    }));

    // DNA Animation Lines
    // Simplified visual: 3 intertwining sine waves
    const width = 200;
    const height = 100;
    
    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 flex flex-col justify-between relative overflow-hidden`}>
            <div className="flex items-center gap-2 mb-2 z-10">
                <Dna size={16} className="text-rose-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Bio-Balance</span>
            </div>
            
            {/* DNA Visualization */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                 <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                     {[0, 1, 2].map(i => {
                         const sphere = data[i];
                         const amplitude = 30 * (sphere.val + 0.2); // Min amplitude
                         const offset = i * (Math.PI * 2 / 3);
                         const color = sphere.id === 'productivity' ? '#6366f1' : sphere.id === 'growth' ? '#10b981' : '#f43f5e';
                         
                         // Generate Path
                         let d = `M 0,${height/2} `;
                         for(let x=0; x<=width; x+=5) {
                             const y = height/2 + Math.sin(x * 0.05 + offset) * amplitude;
                             d += `L ${x},${y} `;
                         }

                         return (
                             <motion.path 
                                key={sphere.id}
                                d={d}
                                fill="none"
                                stroke={color}
                                strokeWidth={2 + sphere.val * 4}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: sphere.val > 0 ? 1 : 0.2 }}
                                transition={{ duration: 2, ease: "easeInOut" }}
                             />
                         )
                     })}
                 </svg>
            </div>

            <div className="space-y-3 z-10 mt-auto">
                {data.map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                                className={`h-full ${s.bg.replace('50', '500').replace('/30','')}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${s.val * 100}%` }}
                                transition={{ duration: 1 }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<Props> = ({ notes, tasks, habits, journal, onNavigate, flashcards }) => {
  return (
    <div className="h-full w-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden flex flex-col">
        {/* Kinetic Grid Background */}
        <div 
            className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-15" 
            style={{ 
                backgroundImage: 'radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)',
                backgroundSize: '32px 32px'
            }} 
        />
        
        {/* Ambient Depth Glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-8 relative z-10">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-extralight text-slate-800 dark:text-white tracking-tight">
                            Control Deck
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-mono uppercase tracking-widest">
                            System Status: Online
                        </p>
                    </div>
                </header>

                {/* KINETIC GRID LAYOUT */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-24">
                    
                    {/* 1. PLASMA CORE (Large Hero) */}
                    <div className="lg:col-span-1 lg:row-span-2 min-h-[400px]">
                        <EnergyPlasma tasks={tasks} habits={habits} journal={journal} />
                    </div>

                    {/* 2. HABIT HEARTBEAT (Wide) */}
                    <div className="lg:col-span-2 min-h-[200px]">
                        <HabitHeartbeat habits={habits} />
                    </div>

                    {/* 3. NEURAL FIELD (Compact) */}
                    <div className="lg:col-span-1 min-h-[200px]">
                        <NeuralField notes={notes} />
                    </div>

                    {/* 4. CHRONOS SUN (Wide) */}
                    <div className="lg:col-span-2 min-h-[260px]">
                        <ChronosSun tasks={tasks} />
                    </div>

                    {/* 5. CHALLENGES & WINS (Standard) */}
                    <div className="lg:col-span-1 min-h-[260px]">
                        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 flex flex-col justify-center items-center text-center gap-4`}>
                            <Trophy size={48} className="text-amber-400 drop-shadow-md" strokeWidth={1} />
                            <div>
                                <div className="text-3xl font-bold text-slate-800 dark:text-white">
                                    {tasks.filter(t => t.isChallengeCompleted).length}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Victory Points</div>
                            </div>
                        </div>
                    </div>

                    {/* 6. BIO BALANCE (Compact) */}
                    <div className="lg:col-span-1 min-h-[200px]">
                        <BioBalance tasks={tasks} habits={habits} />
                    </div>

                    {/* 7. INSIGHTS BANNER (Full Width Action) */}
                    <div className="lg:col-span-3 min-h-[160px]">
                        <button 
                            onClick={() => onNavigate(Module.JOURNAL)}
                            className="w-full h-full bg-gradient-to-r from-[#0f172a] to-[#1e293b] dark:from-indigo-900 dark:to-purple-900 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-xl hover:shadow-2xl transition-all border border-white/10"
                        >
                            {/* Stars BG */}
                            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                            
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                                <Sparkles size={120} />
                            </div>
                            
                            <div className="relative z-10 flex flex-col justify-between h-full items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 text-indigo-300">
                                        <Fingerprint size={16} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Mentor Access</span>
                                    </div>
                                    <h3 className="text-3xl font-light tracking-wide">Deep Dive Protocol</h3>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest bg-white/10 px-5 py-3 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors border border-white/10">
                                    Initiate Reflection <ArrowRight size={14} />
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* 8. SKILLS SHORTCUT */}
                    <div className="lg:col-span-1 lg:col-start-1 min-h-[100px]">
                         <button 
                            onClick={() => onNavigate(Module.MENTAL_GYM)}
                            className={`w-full h-full ${GLASS_PANEL} rounded-[32px] p-6 flex items-center justify-between group`}
                        >
                            <div className="flex flex-col text-left">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Database</span>
                                <span className="text-xl font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 transition-colors">Skills</span>
                            </div>
                            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                                <Dumbbell size={20} />
                            </div>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;
