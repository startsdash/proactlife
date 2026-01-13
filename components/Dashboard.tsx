
import React, { useMemo, useState, useEffect } from 'react';
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
  Users,
  Radar,
  Crosshair,
  AlertTriangle,
  Terminal,
  Droplets
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
const GLASS_PANEL = "bg-white/40 dark:bg-[#0f172a]/60 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] transition-all duration-500 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] hover:border-white/40 dark:hover:border-white/10 group";

const NEON_PALETTE: Record<string, string> = {
    productivity: '#4D77FF', // Electric Blue
    growth: '#00D26A',       // Mint Green
    relationships: '#F83062' // Neon Red
};

const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- WIDGETS ---

// 1. KINETIC RADAR INTERFACE
const KineticRadar = ({ tasks, habits, journal, notes }: { tasks: Task[], habits: Habit[], journal: JournalEntry[], notes: Note[] }) => {
    const todayStr = getLocalDateKey(new Date());
    
    // --- DATA CALCULATION ---
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

    const energyScore = Math.round(((ritualRate * 0.3) + (taskRate * 0.3) + (synapseVolume * 0.2) + (insightDepth * 0.2)) * 100);

    // --- VISUALIZATION CONSTANTS ---
    const size = 260;
    const center = size / 2;
    const radius = 90;
    
    const p1 = { x: center, y: center - (radius * ritualRate) };
    const p2 = { x: center + (radius * taskRate), y: center };
    const p3 = { x: center, y: center + (radius * synapseVolume) };
    const p4 = { x: center - (radius * insightDepth), y: center };
    
    const radarPath = `M ${p1.x},${p1.y} L ${p2.x},${p2.y} L ${p3.x},${p3.y} L ${p4.x},${p4.y} Z`;

    let statusColor = "text-[#A0A0A0]";
    let statusTitle = "ЛОГ_СИСТЕМЫ_V2.0";
    let statusText = "СТАТУС: НОМИНАЛЬНЫЙ";
    
    if (energyScore < 30) {
        statusColor = "text-[#FF4B2B]";
        statusTitle = "СБОЙ_ЯДРА";
        statusText = "ТРЕБУЕТСЯ ДОЗАПРАВКА";
    } else if (energyScore > 70) {
        statusColor = "text-emerald-400";
        statusTitle = "ПИКОВАЯ_НАГРУЗКА";
        statusText = "СОСТОЯНИЕ: ПРЕВОСХОДНО";
    }

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] relative overflow-hidden flex flex-col`}>
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
                {/* Active Orbitals (Background) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                        className="w-[200px] h-[200px] border border-dashed border-slate-400 rounded-full"
                    />
                    <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                        className="absolute w-[140px] h-[140px] border border-dotted border-slate-500 rounded-full opacity-50"
                    />
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

                    {/* Grid Lines (Diamond) */}
                    <path d={`M ${center},${center-radius} L ${center+radius},${center} L ${center},${center+radius} L ${center-radius},${center} Z`} fill="none" stroke="#E0E0E0" strokeOpacity="0.2" strokeWidth="0.5" />
                    <path d={`M ${center},${center-radius*0.5} L ${center+radius*0.5},${center} L ${center},${center+radius*0.5} L ${center-radius*0.5},${center} Z`} fill="none" stroke="#E0E0E0" strokeOpacity="0.1" strokeWidth="0.5" />
                    
                    {/* Axes */}
                    <line x1={center} y1={center-radius} x2={center} y2={center+radius} stroke="#E0E0E0" strokeOpacity="0.1" />
                    <line x1={center-radius} y1={center} x2={center+radius} y2={center} stroke="#E0E0E0" strokeOpacity="0.1" />

                    {/* Labels */}
                    <text x={center} y={center - radius - 10} textAnchor="middle" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">Rituals</text>
                    <text x={center + radius + 15} y={center + 3} textAnchor="start" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">Tasks</text>
                    <text x={center} y={center + radius + 15} textAnchor="middle" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">Synapses</text>
                    <text x={center - radius - 15} y={center + 3} textAnchor="end" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">Insights</text>

                    {/* The Data Shape */}
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
                    
                    {/* Data Points */}
                    <circle cx={p1.x} cy={p1.y} r="2" className="fill-white" />
                    <circle cx={p2.x} cy={p2.y} r="2" className="fill-white" />
                    <circle cx={p3.x} cy={p3.y} r="2" className="fill-white" />
                    <circle cx={p4.x} cy={p4.y} r="2" className="fill-white" />
                </svg>
            </div>

            {/* Telemetry Log */}
            <div className="p-6 pt-0 mt-auto relative z-20">
                <div className="bg-black/5 dark:bg-black/40 rounded-xl p-4 border border-slate-200/20 dark:border-white/5 font-mono text-[9px] md:text-[10px] leading-relaxed shadow-inner">
                    <div className={`font-bold mb-1 ${statusColor} opacity-90`}>
                        [{statusTitle}]
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 space-y-1">
                        <div className="flex gap-2">
                            <span className="opacity-50">{">"}</span>
                            <span>{statusText}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="opacity-50">{">"}</span>
                            <span className="text-slate-500">[BIOMETRIC_SCAN]: СЕКТОР "ЛЮДИ" — КРИТИЧЕСКИЙ УРОВЕНЬ ФЛЮИДА.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 2. HABIT HEARTBEAT
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

// 3. NEURAL SPARK FIELD
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

// 4. BIOMETRIC SYNC (Chronos + BioBalance Test Tubes)
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
    
    const sphereData = SPHERES.map(s => {
        const val = totalSphere > 0 ? (counts[s.id] || 0) / totalSphere : 0;
        return { ...s, val };
    });

    const maxVal = Math.max(...sphereData.map(s => s.val), 0.01);
    const minVal = Math.min(...sphereData.map(s => s.val));

    return (
        <div className={`h-full ${GLASS_PANEL} rounded-[32px] p-6 relative flex flex-col gap-4 overflow-hidden`}>
            <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
                <Dna size={16} className="text-[#F83062]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Biometric Sync</span>
            </div>

            <div className="flex-1 flex gap-8 items-center mt-6">
                
                {/* Left: Chronos Dial (Enlarged) */}
                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                        {/* Clock Face Dots */}
                        {Array.from({length: 12}).map((_, i) => (
                            <div 
                                key={i} 
                                className="absolute w-0.5 h-0.5 bg-slate-400 dark:bg-slate-600 rounded-full"
                                style={{ transform: `rotate(${i * 30}deg) translateY(-60px)` }}
                            />
                        ))}
                        
                        {/* Hour Bars */}
                        {hours.map((count, h) => {
                            const sunAngle = ((h - 12) / 24) * 360 - 90; 
                            const barHeight = (count / maxHour) * 24 + 4;
                            const isGolden = h >= 0 && h < 4;
                            return (
                                <motion.div
                                    key={h}
                                    className={`absolute w-0.5 rounded-full origin-bottom ${isGolden ? 'bg-[#4D77FF] shadow-[0_0_4px_#4D77FF]' : 'bg-slate-300 dark:bg-slate-700'}`}
                                    style={{
                                        height: `${barHeight}px`,
                                        left: '50%',
                                        top: '50%',
                                        transform: `rotate(${sunAngle + 90}deg) translateY(-40px)`
                                    }}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${barHeight}px` }}
                                    transition={{ delay: h * 0.02 }}
                                />
                            );
                        })}
                        
                        {/* Center Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {isNightOwl ? <Sparkles size={20} className="text-[#4D77FF] animate-pulse" /> : <Flame size={20} className="text-[#F83062] animate-pulse" />}
                        </div>
                    </div>
                    <div className="text-[9px] uppercase font-bold text-slate-500 mt-4 tracking-wider">{isNightOwl ? 'Night Owl' : 'Day Walker'}</div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-40 bg-gradient-to-b from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

                {/* Right: Bio-Balance Fluorescent Tubes */}
                <div className="w-2/5 flex flex-col justify-center gap-5">
                    {sphereData.map(s => {
                        const isLeader = s.val === maxVal && s.val > 0;
                        const isLagging = s.val === minVal || s.val === 0;
                        const neonColor = NEON_PALETTE[s.id] || NEON_PALETTE.productivity;

                        return (
                            <div key={s.id} className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{s.label}</span>
                                    <span className="text-[9px] font-mono text-slate-500">{Math.round(s.val * 100)}%</span>
                                </div>
                                {/* Glass Tube */}
                                <div className="w-full h-3 bg-slate-200/20 dark:bg-slate-800/30 rounded-full relative overflow-hidden backdrop-blur-md border border-white/20 dark:border-white/5 shadow-inner">
                                    {/* Neon Liquid Fill */}
                                    <motion.div 
                                        className="h-full absolute left-0 top-0 rounded-full relative"
                                        style={{ 
                                            background: `linear-gradient(90deg, ${neonColor}44 0%, ${neonColor} 100%)`,
                                            boxShadow: `0 0 10px ${neonColor}66`
                                        }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(s.val * 100, 5)}%` }} // Minimum visual width
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                    >
                                        {/* Meniscus / Leading Edge Highlight */}
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/80 blur-[1px] rounded-full" />
                                        
                                        {/* Breathing Glow for Leader */}
                                        {isLeader && (
                                            <motion.div 
                                                className="absolute inset-0 bg-white/20"
                                                animate={{ opacity: [0, 0.4, 0] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                            />
                                        )}
                                        
                                        {/* Glitching Arc for Lagging */}
                                        {isLagging && (
                                            <motion.div 
                                                className="absolute right-0 top-0 bottom-0 w-2 bg-white z-10"
                                                animate={{ opacity: [0, 1, 0, 1, 0] }}
                                                transition={{ duration: 0.2, repeat: Infinity, repeatDelay: Math.random() * 2 + 1 }}
                                                style={{ boxShadow: `0 0 8px white` }}
                                            />
                                        )}
                                    </motion.div>
                                    
                                    {/* Glass Gloss Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-full" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

const Dashboard: React.FC<Props> = ({ notes, tasks, habits, journal, onNavigate }) => {
  const victoryPoints = tasks.filter(t => t.isChallengeCompleted).length;

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
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#4D77FF]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#00D26A]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-6 lg:p-8 relative z-10">
            <div className="max-w-7xl mx-auto h-full flex flex-col">
                <header className="mb-6 flex flex-col md:flex-row justify-between items-start gap-4 shrink-0 relative">
                    <div>
                        <h1 className="text-4xl font-extralight text-slate-800 dark:text-white tracking-tight">
                            Control Deck
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-mono uppercase tracking-widest">
                            System Status: Online
                        </p>
                    </div>
                    {/* XP Badge - Positioned Top Right */}
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/20 dark:border-white/10 shadow-sm md:absolute md:top-2 md:right-0">
                        <Trophy size={14} className="text-amber-500 fill-amber-500" />
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-amber-200">{victoryPoints} XP</span>
                    </div>
                </header>

                {/* 3-COLUMN COMPACT LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4 h-full">
                    
                    {/* LEFT COLUMN: KINETIC RADAR */}
                    <div className="lg:col-span-1 h-auto lg:h-[520px]">
                        <KineticRadar tasks={tasks} habits={habits} journal={journal} notes={notes} />
                    </div>

                    {/* RIGHT COLUMN: MODULES GRID */}
                    <div className="lg:col-span-2 flex flex-col gap-4 lg:h-[520px]">
                        
                        {/* ROW 1: RHYTHM & SYNAPSES */}
                        <div className="grid grid-cols-2 gap-4 h-[180px] shrink-0">
                            <HabitHeartbeat habits={habits} />
                            <NeuralField notes={notes} />
                        </div>

                        {/* ROW 2: BIOMETRIC SYNC */}
                        <div className="flex-1">
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
