
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
  Fingerprint,
  Users
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
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 relative overflow-hidden flex flex-col items-center justify-center`}>
            <div className="absolute top-6 left-6 flex items-center gap-2 z-20">
                <Atom size={16} className={`${coreColor} animate-spin-slow`} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Core Reactor</span>
            </div>

            <div className="relative w-full max-w-[200px] aspect-square flex items-center justify-center">
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
                            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Orbit 1 */}
                    <motion.circle 
                        cx="50%" cy="50%" r="40%" 
                        fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8"
                        className={`${coreColor} opacity-30`}
                        animate={{ rotate: -360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        style={{ transformOrigin: 'center' }}
                    />
                    
                    {/* Orbit 2 */}
                    <motion.circle 
                        cx="50%" cy="50%" r="30%" 
                        fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 40"
                        className={`${coreColor} opacity-50`}
                        animate={{ rotate: 180 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        style={{ transformOrigin: 'center' }}
                    />

                    {/* The Core */}
                    <motion.circle 
                        cx="50%" cy="50%" r={20 + (energyScore * 0.1)} 
                        fill={`url(#grad-${energyScore})`} 
                        filter="url(#plasmaGlow)"
                        className={`${coreColor} fill-current`}
                        animate={{ r: [20, 22 + (energyScore * 0.05), 20], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                </svg>

                {/* Data Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none mix-blend-difference text-white">
                    <span className="text-5xl font-thin tracking-tighter filter drop-shadow-lg">
                        {energyScore}%
                    </span>
                    <span className="text-[8px] font-mono font-bold uppercase tracking-[0.3em] opacity-80 mt-1">Output</span>
                </div>
            </div>

            <div className="mt-2 text-center z-10 max-w-[200px]">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${energyScore > 50 ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                        {energyScore < 30 ? "SYSTEM_LOW" : energyScore < 70 ? "SYSTEM_NOMINAL" : "SYSTEM_PEAK"}
                    </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono opacity-70 leading-relaxed uppercase tracking-wide">
                    {energyScore < 30 ? ">> REFUEL REQUIRED" : energyScore < 70 ? ">> REACTOR STABLE" : ">> MAX POWER OUTPUT"}
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
    const height = 50;
    const width = 200;
    const step = width / 6;
    
    let path = `M 0,${height} `;
    
    data.forEach((d, i) => {
        const x = i * step;
        const spikeHeight = d.percent * height * 0.8;
        const baseY = height - 5;
        
        if (d.percent > 0) {
            path += `L ${x + step * 0.2},${baseY} `;
            path += `L ${x + step * 0.4},${baseY - spikeHeight} `;
            path += `L ${x + step * 0.6},${baseY + 5} `;
            path += `L ${x + step * 0.8},${baseY} `;
        } else {
            path += `L ${x + step},${baseY} `;
        }
    });

    const isAlive = data[6].percent > 0;

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-5 flex flex-col justify-between relative overflow-hidden`}>
            <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <Activity size={14} className={`${isAlive ? 'text-emerald-500' : 'text-slate-400'} animate-pulse`} />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Rhythm</span>
                </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <div className="w-full h-px bg-emerald-500" />
            </div>

            <div className="h-16 w-full relative flex items-end my-2">
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
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        filter="url(#glow)"
                    />
                </svg>
                {/* Scanning line animation */}
                <motion.div 
                    className="absolute top-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_8px_white]"
                    animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
            </div>
            
            <div className="flex justify-between px-1">
                {data.map((d, i) => (
                    <div key={i} className="text-[7px] font-bold text-slate-400 uppercase">{d.date.toLocaleDateString('ru-RU', {weekday: 'short'})[0]}</div>
                ))}
            </div>
        </div>
    );
};

// 3. NEURAL SPARK FIELD (Notes)
const NeuralField = ({ notes }: { notes: Note[] }) => {
    // Generate spark points
    const sparks = useMemo(() => {
        const limit = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentNotes = notes.filter(n => n.createdAt > limit);
        
        return recentNotes.map(n => ({
            id: n.id,
            x: Math.random() * 100, 
            y: Math.random() * 100,
            size: Math.random() * 2 + 1,
            opacity: Math.random() * 0.5 + 0.5,
            delay: Math.random() * 2
        }));
    }, [notes.length]);

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-5 flex flex-col justify-between relative overflow-hidden group`}>
            <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-2">
                    <BrainCircuit size={14} className="text-violet-500" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Synapses</span>
                </div>
                <div className="text-xl font-light text-slate-800 dark:text-white">{sparks.length}</div>
            </div>

            {/* The Field */}
            <div className="absolute inset-0 z-0 top-8 bottom-4 left-4 right-4">
                {sparks.map(spark => (
                    <motion.div
                        key={spark.id}
                        className="absolute rounded-full bg-violet-400 shadow-[0_0_4px_rgba(167,139,250,0.8)]"
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
                {/* Connecting Lines (Electric) */}
                <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
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
                                className="drop-shadow-[0_0_2px_rgba(167,139,250,0.8)]"
                            />
                        )
                    })}
                </svg>
            </div>
        </div>
    );
};

// 4. BIOMETRIC SYNC (Chronos + BioBalance)
const BiometricSync = ({ tasks, habits }: { tasks: Task[], habits: Habit[] }) => {
    // Chronos Data
    const hours = new Array(24).fill(0);
    tasks.filter(t => t.column === 'done').forEach(t => {
        const h = new Date(t.createdAt).getHours();
        hours[h]++;
    });
    const maxHour = Math.max(...hours, 1);
    const isNightOwl = hours.slice(0, 5).reduce((a,b) => a+b, 0) > hours.slice(8, 18).reduce((a,b) => a+b, 0) * 0.5;

    // BioBalance Data
    const counts: Record<string, number> = { productivity: 0, growth: 0, relationships: 0 };
    let totalSphere = 0;
    [...tasks.filter(t => t.column === 'done'), ...habits.filter(h => !h.isArchived)].forEach(item => {
        item.spheres?.forEach(s => { counts[s] = (counts[s] || 0) + 1; totalSphere++; });
    });
    const sphereData = SPHERES.map(s => ({ ...s, val: totalSphere > 0 ? (counts[s.id] || 0) / totalSphere : 0 }));

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 relative flex flex-col gap-4 overflow-hidden`}>
            <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
                <Dna size={16} className="text-rose-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Biometric Sync</span>
            </div>

            <div className="flex-1 flex gap-6 items-center mt-6">
                
                {/* Left: Chronos Dial */}
                <div className="w-1/2 flex flex-col items-center relative">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        {/* Clock Face Dots */}
                        {Array.from({length: 12}).map((_, i) => (
                            <div 
                                key={i} 
                                className="absolute w-0.5 h-0.5 bg-slate-400 dark:bg-slate-600 rounded-full"
                                style={{ transform: `rotate(${i * 30}deg) translateY(-40px)` }}
                            />
                        ))}
                        
                        {/* Hour Bars */}
                        {hours.map((count, h) => {
                            const sunAngle = ((h - 12) / 24) * 360 - 90; 
                            const barHeight = (count / maxHour) * 15 + 2;
                            const isGolden = h >= 0 && h < 4;
                            return (
                                <motion.div
                                    key={h}
                                    className={`absolute w-0.5 rounded-full origin-bottom ${isGolden ? 'bg-indigo-500 shadow-[0_0_4px_#6366f1]' : 'bg-slate-300 dark:bg-slate-700'}`}
                                    style={{
                                        height: `${barHeight}px`,
                                        left: '50%',
                                        top: '50%',
                                        transform: `rotate(${sunAngle + 90}deg) translateY(-28px)`
                                    }}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${barHeight}px` }}
                                    transition={{ delay: h * 0.02 }}
                                />
                            );
                        })}
                        
                        {/* Center Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {isNightOwl ? <Sparkles size={16} className="text-indigo-400" /> : <Flame size={16} className="text-amber-500" />}
                        </div>
                    </div>
                    <div className="text-[9px] uppercase font-bold text-slate-500 mt-1">{isNightOwl ? 'Night Owl' : 'Day Walker'}</div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-20 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

                {/* Right: Bio-Balance Bars */}
                <div className="w-1/2 flex flex-col justify-center gap-2">
                    {sphereData.map(s => (
                        <div key={s.id} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{s.label}</span>
                                <span className="text-[8px] font-mono text-slate-500">{Math.round(s.val * 100)}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
        </div>
    );
};

// 5. STRATEGIC INTELLIGENCE (Bottom Banner)
const StrategicIntelligence = ({ tasks, onNavigate }: { tasks: Task[], onNavigate: (m: Module) => void }) => {
    const victoryPoints = tasks.filter(t => t.isChallengeCompleted).length;

    return (
        <button 
            onClick={() => onNavigate(Module.JOURNAL)}
            className="w-full h-full bg-gradient-to-r from-[#0f172a] to-[#1e293b] dark:from-indigo-950 dark:to-slate-900 rounded-[32px] p-6 text-white relative overflow-hidden group shadow-xl hover:shadow-2xl transition-all border border-white/10 flex flex-col justify-between"
        >
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-1000">
                <Target size={100} />
            </div>

            {/* Victory Points Badge */}
            <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <Trophy size={14} className="text-amber-400" />
                <span className="text-xs font-mono font-bold text-amber-200">{victoryPoints} XP</span>
            </div>
            
            <div className="relative z-10 text-left">
                <div className="flex items-center gap-2 mb-2 text-indigo-300">
                    <Fingerprint size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Strategic Intelligence</span>
                </div>
                <h3 className="text-2xl font-light tracking-wide text-white/90">Deep Dive Protocol</h3>
            </div>

            <div className="relative z-10 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors border border-white/10 w-fit mt-4">
                Initiate Reflection <ArrowRight size={12} />
            </div>
        </button>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<Props> = ({ notes, tasks, habits, journal, onNavigate }) => {
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

        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-6 lg:p-8 relative z-10">
            <div className="max-w-7xl mx-auto h-full flex flex-col">
                <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
                    <div>
                        <h1 className="text-4xl font-extralight text-slate-800 dark:text-white tracking-tight">
                            Control Deck
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-mono uppercase tracking-widest">
                            System Status: Online
                        </p>
                    </div>
                </header>

                {/* 3-COLUMN COMPACT LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4 h-full">
                    
                    {/* LEFT COLUMN: CORE REACTOR (Full Height) */}
                    <div className="lg:col-span-1 h-[400px] lg:h-auto min-h-[400px]">
                        <EnergyPlasma tasks={tasks} habits={habits} journal={journal} />
                    </div>

                    {/* RIGHT COLUMN: MODULES GRID */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        
                        {/* ROW 1: RHYTHM & SYNAPSES */}
                        <div className="grid grid-cols-2 gap-4 h-[180px]">
                            <HabitHeartbeat habits={habits} />
                            <NeuralField notes={notes} />
                        </div>

                        {/* ROW 2: BIOMETRIC SYNC */}
                        <div className="h-[180px]">
                            <BiometricSync tasks={tasks} habits={habits} />
                        </div>

                        {/* ROW 3: STRATEGIC INTELLIGENCE */}
                        <div className="flex-1 min-h-[140px]">
                            <StrategicIntelligence tasks={tasks} onNavigate={onNavigate} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;
