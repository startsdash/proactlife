import React, { useMemo } from 'react';
import { Note, Task, Habit, JournalEntry, Module, Flashcard } from '../types';
import { motion } from 'framer-motion';
import { 
  Zap, 
  BrainCircuit, 
  Activity,
  Flame,
  Sparkles,
  Dna,
  Radar,
  Trophy
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
const GLASS_PANEL = "bg-white/40 dark:bg-[#0f172a]/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] transition-all duration-500 hover:border-white/40 dark:hover:border-white/20 group relative overflow-hidden";

const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Neon Palette
const NEON = {
    blue: '#4D77FF',  // Дело / Productivity
    green: '#00D26A', // Рост / Growth
    red: '#F83062',   // Люди / Relationships
    default: '#94a3b8'
};

// --- WIDGETS ---

// 1. KINETIC RADAR INTERFACE
const KineticRadar = ({ tasks, habits, journal, notes }: { tasks: Task[], habits: Habit[], journal: JournalEntry[], notes: Note[] }) => {
    const todayStr = getLocalDateKey(new Date());
    
    // Stats Calc
    const activeHabits = habits.filter(h => !h.isArchived);
    const habitsDoneToday = activeHabits.filter(h => h.history[todayStr]).length;
    const ritualRate = activeHabits.length > 0 ? (habitsDoneToday / activeHabits.length) : 0;

    const activeSprintTasks = tasks.filter(t => !t.isArchived);
    const doneSprintTasks = activeSprintTasks.filter(t => t.column === 'done').length;
    const taskRate = activeSprintTasks.length > 0 ? (doneSprintTasks / activeSprintTasks.length) : 0;

    const recentNotes = notes.filter(n => n.createdAt > Date.now() - 7 * 86400000);
    const synapseVolume = Math.min(recentNotes.length / 20, 1);

    const recentJournal = journal.filter(j => j.date > Date.now() - 7 * 86400000);
    const insightCount = recentJournal.filter(j => j.isInsight).length;
    const insightDepth = Math.min(insightCount / 5, 1);

    // Sphere Logic for Telemetry
    const counts: Record<string, number> = { productivity: 0, growth: 0, relationships: 0 };
    [...tasks.filter(t => t.column === 'done'), ...habits.filter(h => !h.isArchived)].forEach(item => {
        item.spheres?.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
    });
    
    let minCount = Infinity;
    let laggingSphere = SPHERES[0];
    SPHERES.forEach(s => {
        const val = counts[s.id] || 0;
        if (val < minCount) { minCount = val; laggingSphere = s; }
    });

    const energyScore = Math.round(((ritualRate * 0.3) + (taskRate * 0.3) + (synapseVolume * 0.2) + (insightDepth * 0.2)) * 100);

    // Visuals
    const size = 260;
    const center = size / 2;
    const radius = 90;
    
    const p1 = { x: center, y: center - (radius * ritualRate) };
    const p2 = { x: center + (radius * taskRate), y: center };
    const p3 = { x: center, y: center + (radius * synapseVolume) };
    const p4 = { x: center - (radius * insightDepth), y: center };
    
    const radarPath = `M ${p1.x},${p1.y} L ${p2.x},${p2.y} L ${p3.x},${p3.y} L ${p4.x},${p4.y} Z`;

    let statusColor = "text-[#A0A0A0]";
    if (energyScore < 30) statusColor = "text-[#F83062]"; // Red
    else if (energyScore > 70) statusColor = "text-[#00D26A]"; // Green

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[24px] flex flex-col`}>
            {/* Header */}
            <div className="absolute top-6 left-6 flex items-center gap-2 z-20">
                <Radar size={16} className={`${statusColor} animate-pulse`} />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Kinetic Radar</span>
            </div>

            <div className="absolute top-6 right-6 z-20">
                <span className={`text-xl font-mono font-bold ${statusColor}`}>{energyScore}%</span>
            </div>

            {/* Radar Visual */}
            <div className="flex-1 relative flex items-center justify-center min-h-[220px]">
                {/* HUD Elements */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                    <div className="w-[180px] h-[180px] border border-slate-500 rounded-full" />
                    <div className="absolute w-[240px] h-[1px] bg-slate-500" />
                    <div className="absolute w-[1px] h-[240px] bg-slate-500" />
                </div>

                <svg width={size} height={size} className="relative z-10 overflow-visible">
                    <defs>
                        <radialGradient id="radarGradient" cx="0.5" cy="0.5" r="0.5">
                            <stop offset="0%" stopColor="#4D77FF" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#00D26A" stopOpacity="0.1" />
                        </radialGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Grid */}
                    <path d={`M ${center},${center-radius} L ${center+radius},${center} L ${center},${center+radius} L ${center-radius},${center} Z`} fill="none" stroke="#E0E0E0" strokeOpacity="0.2" strokeWidth="0.5" />
                    
                    {/* Labels */}
                    <text x={center} y={center - radius - 10} textAnchor="middle" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">RITUALS</text>
                    <text x={center + radius + 15} y={center + 3} textAnchor="start" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">TASKS</text>
                    <text x={center} y={center + radius + 15} textAnchor="middle" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">SYNAPSES</text>
                    <text x={center - radius - 15} y={center + 3} textAnchor="end" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">INSIGHTS</text>

                    {/* Shape */}
                    <motion.path 
                        d={radarPath} 
                        fill="url(#radarGradient)" 
                        stroke="url(#radarGradient)"
                        strokeWidth="1.5"
                        filter="url(#glow)"
                        initial={{ d: `M ${center},${center} L ${center},${center} L ${center},${center} L ${center},${center} Z` }}
                        animate={{ d: radarPath }}
                        transition={{ type: "spring", stiffness: 50, damping: 15 }}
                    />
                    
                    <circle cx={p1.x} cy={p1.y} r="2" className="fill-white" />
                    <circle cx={p2.x} cy={p2.y} r="2" className="fill-white" />
                    <circle cx={p3.x} cy={p3.y} r="2" className="fill-white" />
                    <circle cx={p4.x} cy={p4.y} r="2" className="fill-white" />
                </svg>
            </div>

            {/* Telemetry Log */}
            <div className="p-6 pt-0 mt-auto relative z-20">
                <div className="bg-black/5 dark:bg-black/40 rounded-xl p-4 border border-slate-200/20 dark:border-white/5 font-mono text-[9px] md:text-[10px] leading-relaxed shadow-inner backdrop-blur-md">
                    <div className={`font-bold mb-2 ${statusColor} opacity-90`}>
                        [SYSTEM_LOG_V2.0]
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 space-y-1.5">
                        <div className="flex gap-2">
                            <span className="opacity-30">{">"}</span>
                            <span>[STATUS]: {energyScore > 50 ? 'NOMINAL' : 'ATTENTION REQUIRED'}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="opacity-30">{">"}</span>
                            <span>[BIOMETRIC_SCAN]: СЕКТОР "{laggingSphere.label.toUpperCase()}" — КРИТИЧЕСКИЙ УРОВЕНЬ ФЛЮИДА.</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="opacity-30">{">"}</span>
                            <span className="opacity-70 italic text-[9px]">[SYNC]: RECALIBRATING...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 2. HABIT HEARTBEAT
const HabitHeartbeat = ({ habits }: { habits: Habit[] }) => {
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

    const height = 50;
    const width = 200;
    const step = width / 6;
    let path = `M 0,${height} `;
    
    data.forEach((d, i) => {
        const x = i * step;
        const spikeHeight = d.percent * height * 0.8;
        const baseY = height - 5;
        if (d.percent > 0) {
            path += `L ${x + step * 0.2},${baseY} L ${x + step * 0.4},${baseY - spikeHeight} L ${x + step * 0.6},${baseY + 5} L ${x + step * 0.8},${baseY} `;
        } else {
            path += `L ${x + step},${baseY} `;
        }
    });

    const isAlive = data[6].percent > 0;

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[24px] p-5 flex flex-col justify-between`}>
            <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <Activity size={14} className={`${isAlive ? 'text-[#00D26A]' : 'text-slate-400'} animate-pulse`} />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Rhythm</span>
                </div>
            </div>

            <div className="h-16 w-full relative flex items-end my-2">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    <motion.path 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2, ease: "linear" }}
                        d={path} 
                        fill="none" 
                        stroke={isAlive ? "#00D26A" : "#94a3b8"} 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        filter="url(#glow)"
                    />
                </svg>
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

// 3. NEURAL SPARK FIELD
const NeuralField = ({ notes }: { notes: Note[] }) => {
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
        <div className={`h-full ${GLASS_PANEL} rounded-[24px] p-5 flex flex-col justify-between`}>
            <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-2">
                    <BrainCircuit size={14} className="text-[#4D77FF]" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Synapses</span>
                </div>
                <div className="text-xl font-light text-slate-800 dark:text-white">{sparks.length}</div>
            </div>

            <div className="absolute inset-0 z-0 top-8 bottom-4 left-4 right-4">
                {sparks.map(spark => (
                    <motion.div
                        key={spark.id}
                        className="absolute rounded-full bg-[#4D77FF] shadow-[0_0_6px_#4D77FF]"
                        style={{ left: `${spark.x}%`, top: `${spark.y}%`, width: spark.size, height: spark.size }}
                        animate={{ opacity: [0.2, spark.opacity, 0.2], scale: [1, 1.5, 1] }}
                        transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: spark.delay, ease: "easeInOut" }}
                    />
                ))}
            </div>
        </div>
    );
};

// 4. BIOMETRIC SYNC (Redesigned)
const BiometricSync = ({ tasks, habits }: { tasks: Task[], habits: Habit[] }) => {
    // Chronos Data
    const hours = new Array(24).fill(0);
    tasks.filter(t => t.column === 'done').forEach(t => {
        hours[new Date(t.createdAt).getHours()]++;
    });
    const maxHour = Math.max(...hours, 1);
    const isNightOwl = hours.slice(0, 5).reduce((a,b) => a+b, 0) > hours.slice(8, 18).reduce((a,b) => a+b, 0) * 0.5;

    // BioBalance Data (3 Spheres)
    const counts: Record<string, number> = { productivity: 0, growth: 0, relationships: 0 };
    let totalSphere = 0;
    [...tasks.filter(t => t.column === 'done'), ...habits.filter(h => !h.isArchived)].forEach(item => {
        item.spheres?.forEach(s => { counts[s] = (counts[s] || 0) + 1; totalSphere++; });
    });
    
    // Map data to colors
    const sphereConfig = [
        { id: 'productivity', label: 'Дело', color: NEON.blue, val: 0 },
        { id: 'growth', label: 'Рост', color: NEON.green, val: 0 },
        { id: 'relationships', label: 'Люди', color: NEON.red, val: 0 }
    ];

    sphereConfig.forEach(s => {
        s.val = totalSphere > 0 ? (counts[s.id] || 0) / totalSphere : 0;
    });

    const maxVal = Math.max(...sphereConfig.map(s => s.val), 0.01);
    const minVal = Math.min(...sphereConfig.map(s => s.val));

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[24px] p-6 relative flex gap-8 items-center`}>
            {/* Header Overlay */}
            <div className="absolute top-5 left-6 z-20 flex items-center gap-2">
                <Dna size={16} className="text-[#F83062]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Biometric Sync</span>
            </div>

            {/* Left: Chronos Dial (Enlarged) */}
            <div className="w-[45%] flex flex-col items-center justify-center relative mt-6">
                <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Dial Ring */}
                    <div className="absolute inset-0 rounded-full border border-slate-200 dark:border-slate-800 opacity-50" />
                    
                    {/* Hour Bars */}
                    {hours.map((count, h) => {
                        const sunAngle = ((h - 12) / 24) * 360 - 90; 
                        const barHeight = (count / maxHour) * 24 + 4;
                        const isGolden = h >= 0 && h < 4; // Night owl hours
                        return (
                            <motion.div
                                key={h}
                                className={`absolute w-1 rounded-full origin-bottom ${isGolden ? 'bg-[#4D77FF] shadow-[0_0_6px_#4D77FF]' : 'bg-slate-300 dark:bg-slate-700'}`}
                                style={{
                                    height: `${barHeight}px`,
                                    left: '50%',
                                    top: '50%',
                                    transform: `rotate(${sunAngle + 90}deg) translateY(-50px)`
                                }}
                                initial={{ height: 0 }}
                                animate={{ height: `${barHeight}px` }}
                                transition={{ delay: h * 0.02 }}
                            />
                        );
                    })}
                    
                    {/* Center Icon */}
                    <div className="absolute inset-0 flex items-center justify-center bg-white/10 dark:bg-black/20 backdrop-blur-sm rounded-full m-8 border border-white/10">
                        {isNightOwl ? <Sparkles size={24} className="text-[#4D77FF] animate-pulse" /> : <Flame size={24} className="text-[#F83062] animate-pulse" />}
                    </div>
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-500 mt-2 tracking-widest">{isNightOwl ? 'Night Owl' : 'Day Walker'}</div>
            </div>

            {/* Divider */}
            <div className="w-px h-40 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

            {/* Right: Fluorescent Test Tubes */}
            <div className="flex-1 flex flex-col justify-center gap-5 pr-2">
                {sphereConfig.map(s => {
                    const isLeader = s.val === maxVal && s.val > 0;
                    const isLagging = s.val === minVal || s.val === 0;
                    
                    return (
                        <div key={s.id} className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{s.label}</span>
                                <span className="text-[9px] font-mono text-slate-500">{Math.round(s.val * 100)}%</span>
                            </div>
                            
                            {/* Glass Tube Container */}
                            <div className="w-full h-3 bg-slate-200/20 dark:bg-slate-800/30 rounded-full relative overflow-hidden backdrop-blur-md border border-white/30 dark:border-white/5 shadow-inner">
                                {/* Liquid Core */}
                                <motion.div 
                                    className="h-full absolute left-0 top-0 rounded-full"
                                    style={{ 
                                        backgroundColor: s.color,
                                        boxShadow: `0 0 12px ${s.color}aa, inset 0 1px 0 rgba(255,255,255,0.4)`
                                    }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(s.val * 100, 5)}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                >
                                    {/* Internal Glow (Breathing for Leader) */}
                                    {isLeader && (
                                        <motion.div 
                                            className="absolute inset-0 bg-white/40"
                                            animate={{ opacity: [0, 0.5, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                    )}
                                </motion.div>
                                
                                {/* Meniscus / Unstable Tip (Flicker for Lagging) */}
                                {isLagging && (
                                    <motion.div 
                                        className="absolute h-full w-1 bg-white shadow-[0_0_8px_white] z-10 top-1/2 -translate-y-1/2 rounded-full"
                                        style={{ left: `${Math.max(s.val * 100, 5)}%` }}
                                        animate={{ opacity: [0.2, 1, 0.2], height: ['60%', '100%', '60%'] }}
                                        transition={{ duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 2 }}
                                    />
                                )}
                                
                                {/* Glass Reflection Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<Props> = ({ notes, tasks, habits, journal, flashcards, onNavigate }) => {
  const victoryPoints = tasks.filter(t => t.isChallengeCompleted).length;

  return (
    <div className="h-full w-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden flex flex-col font-sans">
        {/* Ambient Backdrops */}
        <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#4D77FF]/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#00D26A]/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-6 lg:p-8 relative z-10">
            <div className="max-w-[1600px] mx-auto h-full flex flex-col relative">
                
                {/* GLOBAL XP BADGE (Absolute Top Right) */}
                <div className="absolute top-0 right-0 z-30 flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/20 dark:border-white/10 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <Trophy size={14} className="text-[#F83062] fill-[#F83062]" />
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{victoryPoints} XP</span>
                </div>

                <header className="mb-8">
                    <h1 className="text-4xl font-extralight text-slate-800 dark:text-white tracking-tight">
                        Control Deck
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-mono uppercase tracking-widest">
                        System Status: Online
                    </p>
                </header>

                {/* ZERO-SCROLL GRID LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[580px]">
                    
                    {/* LEFT COLUMN: KINETIC RADAR (4 cols) */}
                    <div className="lg:col-span-4 h-full">
                        <KineticRadar tasks={tasks} habits={habits} journal={journal} notes={notes} />
                    </div>

                    {/* RIGHT COLUMN: MODULES GRID (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col gap-6 h-full">
                        
                        {/* TOP ROW: RHYTHM & SYNAPSES */}
                        <div className="grid grid-cols-2 gap-6 h-[200px] shrink-0">
                            <HabitHeartbeat habits={habits} />
                            <NeuralField notes={notes} />
                        </div>

                        {/* BOTTOM ROW: BIOMETRIC SYNC (Fills remaining height) */}
                        <div className="flex-1 min-h-[300px]">
                            <BiometricSync tasks={tasks} habits={habits} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;