
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, Task, Habit, JournalEntry } from '../types';
import { X, Zap, Target, Book, Flame, Activity, CheckCircle2, Lock, Terminal, Cpu, Radio, ShieldCheck, Box, ArrowRight, BrainCircuit } from 'lucide-react';
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

// --- UTILS ---
const formatTime = () => new Date().toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'});

// --- COMPONENTS ---

const SystemLogs = ({ logs }: { logs: string[] }) => {
    const scrollRef = React.useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="font-mono text-[10px] text-emerald-500/80 p-4 border-t border-emerald-500/20 bg-black/40 backdrop-blur-md h-full flex flex-col">
            <div className="mb-2 text-[9px] font-bold text-emerald-400 opacity-50 uppercase tracking-widest flex items-center gap-2">
                <Terminal size={10} />
                Протокол_Синхронизации_v2.4
            </div>
            <div ref={scrollRef} className="space-y-1 overflow-y-auto custom-scrollbar-none flex-1">
                <AnimatePresence initial={false}>
                    {logs.map((log, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            className="truncate"
                        >
                            <span className="opacity-40 mr-2">[{formatTime()}]</span>
                            {log}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

const OrbitalNode = ({ 
    x, y, icon: Icon, label, subLabel, color, active, completed, onClick, size = 60 
}: { 
    x: number, y: number, icon: any, label: string, subLabel?: string, color: string, active: boolean, completed?: boolean, onClick: () => void, size?: number 
}) => {
    return (
        <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 group z-30"
            style={{ left: x, top: y }}
        >
            {/* Label (Hover) */}
            <div className={`
                absolute top-full left-1/2 -translate-x-1/2 mt-3 text-center transition-all duration-300 pointer-events-none
                ${active ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'}
            `}>
                <div className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-${color}-400 mb-0.5`}>{label}</div>
                {subLabel && <div className="text-[9px] font-mono text-slate-500">{subLabel}</div>}
            </div>

            {/* Button */}
            <motion.button
                onClick={onClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`
                    rounded-full flex items-center justify-center border-2 transition-all duration-500 relative
                    ${active 
                        ? `bg-[#020617] border-${color}-500 shadow-[0_0_20px_rgba(0,0,0,0.5)]` 
                        : 'bg-[#020617]/80 border-slate-700 hover:border-slate-500'}
                `}
                style={{ 
                    width: size, 
                    height: size,
                    boxShadow: active ? `0 0 20px ${color}` : undefined // Fallback if tailwind color interpolation fails
                }}
            >
                {/* Ping Ring */}
                {active && !completed && (
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-20 bg-${color}-500`} />
                )}
                
                {/* Completed Badge */}
                {completed && (
                    <div className="absolute -top-1 -right-1 bg-emerald-500 text-black rounded-full p-0.5 z-10">
                        <CheckCircle2 size={12} />
                    </div>
                )}

                <Icon 
                    size={size * 0.4} 
                    className={`transition-colors duration-300 ${active ? `text-${color}-400` : 'text-slate-500 group-hover:text-slate-300'}`} 
                />
            </motion.button>
        </div>
    );
};

const ConnectionLine = ({ x1, y1, x2, y2, color, active, dashed = false }: { x1: number, y1: number, x2: number, y2: number, color: string, active: boolean, dashed?: boolean }) => {
    return (
        <g>
            {/* Base Line (faint) */}
            <line 
                x1={x1} y1={y1} x2={x2} y2={y2} 
                stroke={active ? color : "#1e293b"} 
                strokeWidth={1} 
                strokeOpacity={active ? 0.3 : 1}
                strokeDasharray={dashed ? "4 4" : "none"}
            />
            {/* Active Beam */}
            {active && (
                <motion.line 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke={color} 
                    strokeWidth={2}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    strokeLinecap="round"
                />
            )}
            {/* Energy Particle */}
            {active && (
                <circle r="2" fill={color}>
                    <animateMotion 
                        dur="3s" 
                        repeatCount="indefinite"
                        path={`M${x1},${y1} L${x2},${y2}`}
                    />
                </circle>
            )}
        </g>
    );
};

const HeroJourney: React.FC<Props> = ({ 
  note, tasks, habits, journal, 
  onClose, onCreateTask, onCreateHabit, onCreateEntry, onNavigateToSandbox 
}) => {
  
  // --- DATA PROCESSING ---
  const linkedTask = useMemo(() => tasks.find(t => t.originNoteId === note.id), [tasks, note.id]);
  const linkedHabit = useMemo(() => habits.find(h => h.originNoteId === note.id), [habits, note.id]);
  const linkedEntries = useMemo(() => journal.filter(j => j.linkedNoteId === note.id || j.linkedNoteIds?.includes(note.id)), [journal, note.id]);
  
  const hasInsight = linkedEntries.some(j => j.isInsight);
  const isTaskDone = linkedTask?.column === 'done';
  const habitStreak = linkedHabit?.streak || 0;
  const isHabitEstablished = habitStreak > 3;

  // --- TRANSFORMATION SCORE ---
  const transformationScore = useMemo(() => {
      let score = 0;
      if (linkedTask) score += 10; // Started
      if (isTaskDone) score += 20; // Finished
      if (linkedHabit) score += 10; // Started
      if (isHabitEstablished) score += 20; // Established
      if (linkedEntries.length > 0) score += 10; // Reflected
      if (hasInsight) score += 30; // Insight
      return Math.min(100, score);
  }, [linkedTask, isTaskDone, linkedHabit, isHabitEstablished, linkedEntries, hasInsight]);

  // --- LOGS ---
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
      const initLogs = [
          "ИНИЦИАЛИЗАЦИЯ НЕЙРО-СВЯЗИ...",
          `ОБЪЕКТ: ${note.id.slice(-4)}`,
          "СКАНИРОВАНИЕ ПОТЕНЦИАЛА...",
      ];
      let delay = 0;
      initLogs.forEach((log) => {
          delay += 400;
          setTimeout(() => addLog(log), delay);
      });

      if (linkedTask) setTimeout(() => addLog(`ОБНАРУЖЕН СПРИНТ: [${linkedTask.column.toUpperCase()}]`), delay + 600);
      if (linkedHabit) setTimeout(() => addLog(`ОБНАРУЖЕН РИТУАЛ: [СТРИК ${linkedHabit.streak}]`), delay + 800);
      if (hasInsight) setTimeout(() => addLog(`ИНСАЙТ ЗАФИКСИРОВАН. ЯДРО СТАБИЛЬНО.`), delay + 1000);
      
      if (transformationScore === 100 && window.confetti) {
          setTimeout(() => {
              window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#fbbf24', '#6366f1'] });
              addLog("ТРАНСФОРМАЦИЯ ЗАВЕРШЕНА.");
          }, delay + 1500);
      }

  }, []);

  // --- HANDLERS ---
  const handleCreateTask = () => {
      if (linkedTask) return; // Navigate?
      onCreateTask({
          id: Date.now().toString(),
          title: note.title || 'Новая миссия',
          content: note.content,
          column: 'todo',
          createdAt: Date.now(),
          originNoteId: note.id
      });
      addLog("ПРОТОКОЛ АКТИВИРОВАН: НОВЫЙ СПРИНТ");
  };

  const handleCreateHabit = () => {
      if (linkedHabit) return;
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
      addLog("СИСТЕМА ЗАПУЩЕНА: НОВЫЙ РИТУАЛ");
  };

  const handleCreateEntry = () => {
      onCreateEntry({
          id: Date.now().toString(),
          date: Date.now(),
          content: `Рефлексия по заметке: ${note.title || 'Без названия'}\n\n#рефлексия`,
          linkedNoteId: note.id,
          linkedNoteIds: [note.id]
      });
      addLog("ЖУРНАЛ: ЗАПИСЬ СОЗДАНА");
  };

  // --- CANVAS CONFIG ---
  const size = 600;
  const center = size / 2;
  const coreRadius = 60;
  
  // Node Positions (Distance from center)
  const dist = 180;
  // Coordinates
  const posSprint = { x: center, y: center - dist }; // North
  const posRitual = { x: center + dist, y: center }; // East
  const posJournal = { x: center, y: center + dist }; // South
  const posHub = { x: center - dist, y: center }; // West

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
        
        {/* MAIN HUD CONTAINER */}
        <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-6xl h-[85vh] bg-[#020617] border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col md:flex-row"
        >
            {/* BACKGROUND GRID */}
            <div className="absolute inset-0 pointer-events-none opacity-20" 
                 style={{ 
                     backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(99,102,241,0.15) 1px, transparent 0)',
                     backgroundSize: '40px 40px'
                 }} 
            />

            {/* --- LEFT PANEL: CONTEXT --- */}
            <div className="hidden md:flex w-72 flex-col border-r border-slate-800/50 bg-[#020617]/80 backdrop-blur-md z-10 relative">
                <div className="p-6 border-b border-slate-800/50">
                    <div className="flex items-center gap-2 text-indigo-500 mb-2">
                        <Radio size={16} className="animate-pulse" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold">Сигнал</span>
                    </div>
                    <h2 className="text-xl text-white font-light tracking-tight leading-tight line-clamp-2">
                        {note.title || 'Безымянная мысль'}
                    </h2>
                </div>
                
                {/* Note Content Preview */}
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar-ghost relative">
                    <div className="text-xs text-slate-400 font-serif italic leading-relaxed whitespace-pre-wrap opacity-80">
                        {note.content.substring(0, 500)}{note.content.length > 500 && '...'}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-800/50">
                        <div className="flex justify-between text-[9px] font-mono uppercase text-slate-600">
                            <span>ID: {note.id.slice(-6)}</span>
                            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Logs Area */}
                <div className="h-48 shrink-0 relative">
                    <SystemLogs logs={logs} />
                </div>
            </div>

            {/* --- CENTER: THE STAR MAP --- */}
            <div className="flex-1 relative flex flex-col overflow-hidden">
                
                {/* Header Actions */}
                <div className="absolute top-0 right-0 p-6 z-30 flex justify-between w-full pointer-events-none">
                    <div className="pointer-events-auto">
                        {/* Mobile Title Placeholder if needed */}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="pointer-events-auto p-3 rounded-full border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors bg-black/20 backdrop-blur-sm"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* SVG INTERACTIVE LAYER */}
                <div className="flex-1 relative">
                    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 pointer-events-none">
                        <defs>
                            <radialGradient id="coreGradient">
                                <stop offset="0%" stopColor={transformationScore === 100 ? "#fbbf24" : "#6366f1"} stopOpacity="0.6" />
                                <stop offset="100%" stopColor={transformationScore === 100 ? "#fbbf24" : "#6366f1"} stopOpacity="0" />
                            </radialGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Orbits */}
                        <circle cx={center} cy={center} r={dist} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                        <circle cx={center} cy={center} r={coreRadius + 20} fill="none" stroke="#1e293b" strokeWidth="1" />

                        {/* Connections */}
                        <ConnectionLine x1={center} y1={center - coreRadius} x2={posSprint.x} y2={posSprint.y + 30} color="#10b981" active={!!linkedTask} />
                        <ConnectionLine x1={center + coreRadius} y1={center} x2={posRitual.x - 30} y2={posRitual.y} color="#f59e0b" active={!!linkedHabit} />
                        <ConnectionLine x1={center} y1={center + coreRadius} x2={posJournal.x} y2={posJournal.y - 30} color="#06b6d4" active={linkedEntries.length > 0} />
                        <ConnectionLine x1={center - coreRadius} y1={center} x2={posHub.x + 30} y2={posHub.y} color="#8b5cf6" active={false} dashed />

                        {/* The Core */}
                        <g filter="url(#glow)">
                            <motion.circle 
                                cx={center} cy={center} r={coreRadius} 
                                fill="url(#coreGradient)"
                                animate={{ r: [coreRadius, coreRadius + 5, coreRadius] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <circle cx={center} cy={center} r={coreRadius * 0.6} fill="#0f172a" stroke={transformationScore === 100 ? "#fbbf24" : "#6366f1"} strokeWidth="2" />
                            <text x={center} y={center} dy="0.3em" textAnchor="middle" fill="white" className="font-mono text-lg font-bold">
                                {transformationScore}%
                            </text>
                        </g>
                    </svg>

                    {/* INTERACTIVE NODES (HTML Overlay) */}
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                        <div className="w-full h-full max-w-[600px] max-h-[600px] mx-auto relative pointer-events-auto">
                            
                            {/* NORTH: SPRINT */}
                            <OrbitalNode 
                                x={posSprint.x} y={posSprint.y} 
                                icon={Target} 
                                label="Действие" 
                                subLabel={linkedTask ? (isTaskDone ? "Выполнено" : "В работе") : "Начать"}
                                color="emerald" 
                                active={!!linkedTask}
                                completed={isTaskDone}
                                onClick={handleCreateTask}
                            />

                            {/* EAST: RITUAL */}
                            <OrbitalNode 
                                x={posRitual.x} y={posRitual.y} 
                                icon={Flame} 
                                label="Система" 
                                subLabel={linkedHabit ? `Стрик: ${habitStreak}` : "Внедрить"}
                                color="amber" 
                                active={!!linkedHabit}
                                completed={isHabitEstablished}
                                onClick={handleCreateHabit}
                            />

                            {/* SOUTH: JOURNAL */}
                            <OrbitalNode 
                                x={posJournal.x} y={posJournal.y} 
                                icon={Book} 
                                label="Синтез" 
                                subLabel={hasInsight ? "Инсайт" : "Записать"}
                                color="cyan" 
                                active={linkedEntries.length > 0}
                                completed={hasInsight}
                                onClick={handleCreateEntry}
                            />

                            {/* WEST: HUB (Navigation) */}
                            <OrbitalNode 
                                x={posHub.x} y={posHub.y} 
                                icon={BrainCircuit} 
                                label="Анализ" 
                                subLabel="AI Lab"
                                color="violet" 
                                active={false} 
                                onClick={() => onNavigateToSandbox(note.id)}
                            />

                        </div>
                    </div>
                </div>

                {/* BOTTOM: PROGRESS BAR & STATUS */}
                <div className="p-6 bg-slate-900/50 border-t border-slate-800 backdrop-blur-md relative z-20">
                    <div className="flex justify-between items-end mb-3">
                        <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                Статус Трансформации
                            </div>
                            <div className={`text-sm ${transformationScore === 100 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                                {transformationScore === 100 ? 'ПОЛНАЯ ИНТЕГРАЦИЯ' : transformationScore > 50 ? 'АКТИВНАЯ ФАЗА' : 'ИНИЦИАЛИЗАЦИЯ'}
                            </div>
                        </div>
                        <div className="font-mono text-xl text-indigo-400 font-bold">{transformationScore}/100</div>
                    </div>
                    
                    {/* Visual Accumulator Bar */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                        {/* Background segments */}
                        <div className="absolute inset-0 flex">
                            <div className="flex-1 border-r border-slate-900/50" />
                            <div className="flex-1 border-r border-slate-900/50" />
                            <div className="flex-1" />
                        </div>
                        {/* Active Bar */}
                        <motion.div 
                            className={`h-full shadow-[0_0_10px_currentColor] ${transformationScore === 100 ? 'bg-amber-400 text-amber-400' : 'bg-indigo-500 text-indigo-500'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${transformationScore}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                </div>
            </div>

        </motion.div>
    </div>
  );
};

export default HeroJourney;
