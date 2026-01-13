
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Note, Task, Habit, JournalEntry, Module, Flashcard } from '../types';
import { motion, useAnimation, useMotionValue, useSpring, useTransform } from 'framer-motion';
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
  Star
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

    const pendingTasks = activeSprintTasks.filter(t => t.column !== 'done').length;
    
    let statusColor = "text-[#A0A0A0]";
    let statusTitle = "ЛОГ_СИСТЕМЫ_V2.0";
    let statusText = "СТАТУС: НОМИНАЛЬНЫЙ";
    let statusDetail = `СИНХРОНИЗАЦИЯ: МЫСЛИ (${recentNotes.length}) >> ИНСАЙТЫ (${insightCount})`;
    let statusNote = "ЗАМЕТКА: ТЕМП РОСТА В ПРЕДЕЛАХ НОРМЫ.";

    if (energyScore < 30) {
        statusColor = "text-[#FF4B2B]";
        statusTitle = "КРИТИЧЕСКИЙ_СБОЙ_ЯДРА";
        statusText = "СТАТУС: ТРЕБУЕТСЯ ДОЗАПРАВКА";
        statusDetail = `ВНИМАНИЕ: ЗАДАЧИ ПРОСТАИВАЮТ (ЦУ: +${pendingTasks})`;
        statusNote = "РЕКОМЕНДАЦИЯ: ВЫПОЛНИТЕ БЛИЖАЙШИЙ РИТУАЛ.";
    } else if (energyScore > 70) {
        statusColor = "text-emerald-400";
        statusTitle = "ПРОТОКОЛ_ПИКОВОЙ_НАГРУЗКИ";
        statusText = "СТАТУС: ПРЕВОСХОДНО";
        statusDetail = "ЭНЕРГИЯ: МАКСИМАЛЬНЫЙ ВЫХОД";
        statusNote = "ВНИМАНИЕ: ОБНАРУЖЕНА ВЫСОКАЯ КОНЦЕНТРАЦИЯ ПОБЕД.";
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
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#34d399" stopOpacity="0.1" />
                        </radialGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>

                    <path d={`M ${center},${center-radius} L ${center+radius},${center} L ${center},${center+radius} L ${center-radius},${center} Z`} fill="none" stroke="#E0E0E0" strokeOpacity="0.2" strokeWidth="0.5" />
                    <path d={`M ${center},${center-radius*0.5} L ${center+radius*0.5},${center} L ${center},${center+radius*0.5} L ${center-radius*0.5},${center} Z`} fill="none" stroke="#E0E0E0" strokeOpacity="0.1" strokeWidth="0.5" />
                    
                    <line x1={center} y1={center-radius} x2={center} y2={center+radius} stroke="#E0E0E0" strokeOpacity="0.1" />
                    <line x1={center-radius} y1={center} x2={center+radius} y2={center} stroke="#E0E0E0" strokeOpacity="0.1" />

                    <text x={center} y={center - radius - 10} textAnchor="middle" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">Rituals</text>
                    <text x={center + radius + 15} y={center + 3} textAnchor="start" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">Tasks</text>
                    <text x={center} y={center + radius + 15} textAnchor="middle" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">Synapses</text>
                    <text x={center - radius - 15} y={center + 3} textAnchor="end" className="text-[8px] fill-slate-400 uppercase font-mono tracking-widest">Insights</text>

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

            <div className="p-6 pt-0 mt-auto relative z-20">
                <div className="bg-black/5 dark:bg-black/40 rounded-xl p-4 border border-slate-200/20 dark:border-white/5 font-mono text-[10px] leading-relaxed shadow-inner">
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
                            <span>{statusDetail}</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="opacity-50">{">"}</span>
                            <span className="opacity-80 italic">{statusNote}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 2. HABIT HEARTBEAT (ECG)
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
                        stroke={isAlive ? "#10b981" : "#94a3b8"} 
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

// 3. REACTIVE NEURAL FIELD (Physics + Impulse)
interface NodePoint {
    id: string;
    x: number;
    y: number;
    size: number;
    opacity: number;
    delay: number;
    isInsight: boolean;
    isNew: boolean;
}

const NeuralField = ({ notes }: { notes: Note[] }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const [points, setPoints] = useState<NodePoint[]>([]);
    const [links, setLinks] = useState<{source: NodePoint, target: NodePoint, id: string}[]>([]);
    const prevNotesLength = useRef(notes.length);

    // Activity level for impulse speed (High notes count = Faster)
    const isHighActivity = useMemo(() => {
        const recentCount = notes.filter(n => n.createdAt > Date.now() - 24 * 60 * 60 * 1000).length;
        return recentCount > 5;
    }, [notes]);

    // Handle Mouse Move for Repulsion
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    };

    // Generate Topology
    useEffect(() => {
        const limit = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentNotes = notes.filter(n => n.createdAt > limit).slice(0, 15); // Limit visual noise
        
        // Detect New Note
        const isNewNoteAdded = notes.length > prevNotesLength.current;
        prevNotesLength.current = notes.length;

        // Generate Nodes
        const newPoints = recentNotes.map((n, i) => {
            // Check if it's the newest one
            const isNew = isNewNoteAdded && i === 0;
            // Insight Heuristic: Tagged notes or long notes
            const isInsight = (n.tags && n.tags.length > 1) || n.content.length > 500;

            return {
                id: n.id,
                x: Math.random() * 80 + 10, // 10-90% padding
                y: Math.random() * 80 + 10,
                size: isInsight ? 6 : Math.random() * 2 + 3,
                opacity: Math.random() * 0.5 + 0.5,
                delay: Math.random() * 2,
                isInsight,
                isNew
            };
        });

        // Generate Links (Nearest Neighbors)
        const newLinks: {source: NodePoint, target: NodePoint, id: string}[] = [];
        newPoints.forEach((p1, i) => {
            // Find closest neighbor
            let closest = null;
            let minDist = Infinity;
            
            newPoints.forEach((p2, j) => {
                if (i === j) return;
                const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
                if (dist < minDist) {
                    minDist = dist;
                    closest = p2;
                }
            });

            if (closest && minDist < 40) { // Only connect if relatively close
                // Avoid duplicates
                const id = [p1.id, closest.id].sort().join('-');
                if (!newLinks.find(l => l.id === id)) {
                    newLinks.push({ source: p1, target: closest, id });
                }
            }
        });

        setPoints(newPoints);
        setLinks(newLinks);

    }, [notes]);

    return (
        <div 
            className={`h-full ${GLASS_PANEL} rounded-[32px] p-5 flex flex-col justify-between relative overflow-hidden group`}
            onMouseMove={handleMouseMove}
            ref={containerRef}
        >
            <div className="flex justify-between items-start z-10 pointer-events-none">
                <div className="flex items-center gap-2">
                    <BrainCircuit size={14} className="text-violet-500" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Synapses</span>
                </div>
                <div className="text-xl font-light text-slate-800 dark:text-white">{points.length}</div>
            </div>

            {/* The Field */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Connections */}
                    {links.map((link) => (
                        <g key={link.id}>
                            <motion.path
                                d={`M ${link.source.x}% ${link.source.y}% L ${link.target.x}% ${link.target.y}%`}
                                stroke="#a78bfa"
                                strokeWidth="0.5"
                                strokeOpacity="0.3"
                                fill="none"
                            />
                            {/* Neural Impulse */}
                            <circle r="1.5" fill="#fff">
                                <animateMotion 
                                    dur={isHighActivity ? "2s" : "5s"} 
                                    repeatCount="indefinite" 
                                    path={`M ${link.source.x}% ${link.source.y}% L ${link.target.x}% ${link.target.y}%`}
                                    calcMode="linear"
                                />
                            </circle>
                        </g>
                    ))}
                </svg>

                {/* Nodes */}
                {points.map(point => (
                    <NeuralNode 
                        key={point.id} 
                        point={point} 
                        mouseX={mouseX} 
                        mouseY={mouseY}
                        containerRef={containerRef}
                    />
                ))}
            </div>
        </div>
    );
};

// Sub-component for individual Node Physics
const NeuralNode = ({ point, mouseX, mouseY, containerRef }: { point: NodePoint, mouseX: any, mouseY: any, containerRef: React.RefObject<HTMLDivElement> }) => {
    // Physics: Repulsion
    const x = useTransform(mouseX, (mx: number) => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const px = (point.x / 100) * rect.width;
        const dist = mx - px;
        // Repel if within 100px
        if (Math.abs(dist) < 100) return -dist * 0.2; 
        return 0;
    });

    const y = useTransform(mouseY, (my: number) => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const py = (point.y / 100) * rect.height;
        const dist = my - py;
        if (Math.abs(dist) < 100) return -dist * 0.2;
        return 0;
    });

    // Spring physics for smooth movement
    const springX = useSpring(x, { stiffness: 150, damping: 20 });
    const springY = useSpring(y, { stiffness: 150, damping: 20 });

    return (
        <motion.div
            style={{ 
                left: `${point.x}%`, 
                top: `${point.y}%`, 
                x: springX,
                y: springY
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
        >
            {/* New Thought Shockwave */}
            {point.isNew && (
                <motion.div 
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 4, opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border border-violet-400"
                />
            )}

            {/* The Node Itself */}
            <motion.div 
                animate={{ 
                    scale: point.isInsight ? [1, 1.2, 1] : 1,
                    opacity: point.isInsight ? [0.8, 1, 0.8] : [0.4, 0.7, 0.4],
                    y: [0, -3, 0] // Floating effect
                }}
                transition={{
                    opacity: { duration: point.delay + 2, repeat: Infinity, repeatType: "reverse" },
                    scale: { duration: 2, repeat: Infinity, repeatType: "reverse" },
                    y: { duration: 4 + point.delay, repeat: Infinity, ease: "easeInOut" }
                }}
                className={`
                    relative flex items-center justify-center
                    ${point.isInsight ? 'text-violet-500' : 'bg-violet-400'}
                `}
                initial={point.isNew ? { scale: 0 } : { scale: 1 }}
            >
                {point.isInsight ? (
                    <div className="relative">
                        <div className="absolute inset-0 bg-violet-500 blur-sm opacity-50 rounded-full" />
                        <Star size={10} fill="currentColor" strokeWidth={0} />
                    </div>
                ) : (
                    <div 
                        className="rounded-full shadow-[0_0_4px_rgba(167,139,250,0.8)]" 
                        style={{ width: point.size, height: point.size }} 
                    />
                )}
            </motion.div>
        </motion.div>
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
            <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse">
                <Trophy size={14} className="text-amber-400 fill-amber-400" />
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
                    
                    {/* LEFT COLUMN: KINETIC RADAR (Full Height) */}
                    <div className="lg:col-span-1 h-auto lg:h-[520px] min-h-[400px]">
                        <KineticRadar tasks={tasks} habits={habits} journal={journal} notes={notes} />
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
