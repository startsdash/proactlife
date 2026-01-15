
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, Task, Habit, JournalEntry } from '../types';
import { X, Target, Book, Flame, CheckCircle2, Terminal, Radio, BrainCircuit, Activity, Cpu, Scan, Hexagon } from 'lucide-react';

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

// --- SUB-COMPONENTS ---

const SystemLogs = ({ logs }: { logs: string[] }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="font-mono text-[10px] text-emerald-500/80 h-full flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
            <div className="p-4 border-b border-emerald-500/20 mb-2 flex items-center justify-between backdrop-blur-sm bg-black/20">
                <div className="flex items-center gap-2 text-emerald-400 opacity-70 uppercase tracking-widest font-bold">
                    <Terminal size={12} />
                    <span>SYS_LOG</span>
                </div>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
                </div>
            </div>
            <div ref={scrollRef} className="space-y-1.5 overflow-y-auto custom-scrollbar-none flex-1 p-4 pt-0 mask-linear-fade-bottom">
                <AnimatePresence initial={false}>
                    {logs.map((log, i) => (
                        <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            className="break-words leading-relaxed"
                        >
                            <span className="opacity-30 mr-2 text-xs">[{formatTime()}]</span>
                            <span className="text-emerald-300/90">{log}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

const ReactorCore = ({ score }: { score: number }) => {
    const isComplete = score === 100;
    const activeColor = isComplete ? '#fbbf24' : '#6366f1'; // Gold / Indigo
    
    return (
        <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Outer Rotating Ring */}
            <motion.div 
                className="absolute inset-0 rounded-full border border-dashed opacity-30"
                style={{ borderColor: activeColor }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            <motion.div 
                className="absolute inset-4 rounded-full border border-dotted opacity-20"
                style={{ borderColor: activeColor }}
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />

            {/* Pulsing Aura */}
            <motion.div 
                className="absolute inset-8 rounded-full blur-2xl opacity-20"
                style={{ backgroundColor: activeColor }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Inner Core */}
            <motion.div 
                className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                style={{ 
                    boxShadow: `0 0 20px ${activeColor}40, inset 0 0 20px ${activeColor}20`,
                    backgroundColor: `${activeColor}10`
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold font-mono text-white tracking-tighter" style={{ textShadow: `0 0 10px ${activeColor}` }}>
                        {score}%
                    </span>
                    <span className="text-[8px] uppercase tracking-widest text-white/50">Sync</span>
                </div>
            </motion.div>
        </div>
    );
};

const OrbitalPort = ({ 
    x, y, icon: Icon, label, subLabel, color, active, completed, onClick 
}: { 
    x: number, y: number, icon: any, label: string, subLabel?: string, color: string, active: boolean, completed?: boolean, onClick: () => void 
}) => {
    // Tailwind safeguard for dynamic colors
    const colorMap: Record<string, string> = {
        emerald: 'text-emerald-400 border-emerald-500 shadow-emerald-500/30',
        amber: 'text-amber-400 border-amber-500 shadow-amber-500/30',
        cyan: 'text-cyan-400 border-cyan-500 shadow-cyan-500/30',
        violet: 'text-violet-400 border-violet-500 shadow-violet-500/30',
    };
    const themeClass = colorMap[color] || colorMap.emerald;
    const baseColor = themeClass.split(' ')[0].replace('text-', ''); // e.g. emerald-400

    return (
        <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 group z-30 cursor-pointer"
            style={{ left: x, top: y }}
            onClick={onClick}
        >
            {/* Label (Always visible but dimmed) */}
            <div className={`
                absolute -top-8 left-1/2 -translate-x-1/2 text-center transition-all duration-300 w-32 pointer-events-none
                ${active ? 'opacity-100 translate-y-0' : 'opacity-50 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'}
            `}>
                <div className={`text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap mb-0.5 ${active ? `text-${baseColor}` : 'text-slate-500 group-hover:text-slate-300'}`}>{label}</div>
                {subLabel && <div className="text-[8px] font-mono text-slate-600 group-hover:text-slate-400">{subLabel}</div>}
            </div>

            {/* Port Interface */}
            <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`
                    relative w-16 h-16 rounded-full flex items-center justify-center 
                    bg-black/40 backdrop-blur-md border transition-all duration-500
                    ${active ? `border-${color}-500/50 shadow-[0_0_20px_rgba(0,0,0,0.3)]` : 'border-slate-800 hover:border-slate-600'}
                `}
                style={{ 
                    boxShadow: active ? `0 0 30px ${baseColor}20` : undefined
                }}
            >
                {/* Rotating Ring on Active/Hover */}
                {(active || completed) && (
                    <motion.div 
                        className={`absolute -inset-1 rounded-full border border-dashed opacity-40 border-${color}-500`}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    />
                )}

                {/* Status Indicator */}
                {completed && (
                    <div className="absolute -top-1 -right-1 bg-emerald-500 text-black rounded-full p-0.5 z-20 shadow-lg border border-black">
                        <CheckCircle2 size={10} strokeWidth={3} />
                    </div>
                )}

                <Icon 
                    size={24} 
                    strokeWidth={1.5}
                    className={`transition-colors duration-300 ${active ? `text-${color}-400` : 'text-slate-600 group-hover:text-slate-300'}`} 
                />
                
                {/* Hover Particles (Simplified Visual) */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-0.5 h-0.5 bg-${color}-400 rounded-full shadow-[0_0_5px_currentColor]`} />
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 -mb-1 w-0.5 h-0.5 bg-${color}-400 rounded-full shadow-[0_0_5px_currentColor]`} />
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 -ml-1 w-0.5 h-0.5 bg-${color}-400 rounded-full shadow-[0_0_5px_currentColor]`} />
                    <div className={`absolute right-0 top-1/2 -translate-y-1/2 -mr-1 w-0.5 h-0.5 bg-${color}-400 rounded-full shadow-[0_0_5px_currentColor]`} />
                </div>
            </motion.div>
        </div>
    );
};

const ConnectionLine = ({ x1, y1, x2, y2, color, active }: { x1: number, y1: number, x2: number, y2: number, color: string, active: boolean }) => {
    return (
        <g>
            <defs>
                <filter id={`glow-${color}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            
            {/* Background Trace */}
            <line 
                x1={x1} y1={y1} x2={x2} y2={y2} 
                stroke={active ? color : "#334155"} 
                strokeWidth={active ? 2 : 1} 
                strokeOpacity={active ? 0.2 : 0.1}
                strokeDasharray={active ? "none" : "4 4"}
            />
            
            {/* Energy Pulse */}
            {active && (
                <>
                    <motion.line 
                        x1={x1} y1={y1} x2={x2} y2={y2} 
                        stroke={color} 
                        strokeWidth={2}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.6 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        strokeLinecap="round"
                        filter={`url(#glow-${color})`}
                    />
                    <circle r="3" fill={color} filter={`url(#glow-${color})`}>
                        <animateMotion 
                            dur="2s" 
                            repeatCount="indefinite"
                            path={`M${x1},${y1} L${x2},${y2}`}
                            keyPoints="0;1"
                            keyTimes="0;1"
                        />
                    </circle>
                </>
            )}
        </g>
    );
};

const HUDCorner = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
    const styleMap = {
        tl: "top-0 left-0 border-t border-l rounded-tl-xl",
        tr: "top-0 right-0 border-t border-r rounded-tr-xl",
        bl: "bottom-0 left-0 border-b border-l rounded-bl-xl",
        br: "bottom-0 right-0 border-b border-r rounded-br-xl",
    };
    return <div className={`absolute w-8 h-8 border-slate-700/50 ${styleMap[position]} pointer-events-none`} />;
};

const HeroJourney: React.FC<Props> = ({ 
  note, tasks, habits, journal, 
  onClose, onCreateTask, onCreateHabit, onCreateEntry, onNavigateToSandbox 
}) => {
  
  // --- MOUSE TRACKING ---
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
      if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setMousePos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
          });
      }
  };

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
      if (linkedTask) score += 10;
      if (isTaskDone) score += 20;
      if (linkedHabit) score += 10;
      if (isHabitEstablished) score += 20;
      if (linkedEntries.length > 0) score += 10;
      if (hasInsight) score += 30;
      return Math.min(100, score);
  }, [linkedTask, isTaskDone, linkedHabit, isHabitEstablished, linkedEntries, hasInsight]);

  // --- LOGS ---
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
      const initLogs = [
          "INIT_NEURAL_LINK...",
          `TARGET_ID: ${note.id.slice(-4)}`,
          "SCANNING_ARCHIVES...",
      ];
      let delay = 0;
      initLogs.forEach((log) => {
          delay += 400;
          setTimeout(() => addLog(log), delay);
      });

      if (linkedTask) setTimeout(() => addLog(`DETECTED_SPRINT: [${linkedTask.column.toUpperCase()}]`), delay + 600);
      if (linkedHabit) setTimeout(() => addLog(`DETECTED_RITUAL: [STREAK ${linkedHabit.streak}]`), delay + 800);
      if (hasInsight) setTimeout(() => addLog(`INSIGHT_LOCKED. CORE_STABLE.`), delay + 1000);
      
      if (transformationScore === 100 && window.confetti) {
          setTimeout(() => {
              window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#fbbf24', '#6366f1'] });
              addLog("TRANSFORMATION_COMPLETE.");
          }, delay + 1500);
      }
  }, []);

  // --- CANVAS CONFIG ---
  const size = 600;
  const center = size / 2;
  const coreRadius = 70;
  const dist = 180;
  
  // Coordinates
  const posSprint = { x: center, y: center - dist }; // North
  const posRitual = { x: center + dist, y: center }; // East
  const posJournal = { x: center, y: center + dist }; // South
  const posHub = { x: center - dist, y: center }; // West

  // --- HANDLERS ---
  const handleCreateTask = () => {
      if (linkedTask) return;
      onCreateTask({
          id: Date.now().toString(),
          title: note.title || 'Задача из Пути',
          content: note.content,
          column: 'todo',
          createdAt: Date.now(),
          originNoteId: note.id
      });
  };

  const handleCreateHabit = () => {
      if (linkedHabit) return;
      onCreateHabit({
          id: Date.now().toString(),
          title: note.title || 'Ритуал',
          description: 'Из Пути Героя',
          frequency: 'daily',
          color: 'indigo',
          icon: 'Zap',
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
          content: `Рефлексия: ${note.title || '...'}\n\n`,
          linkedNoteId: note.id,
          linkedNoteIds: [note.id],
          isInsight: false
      });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        
        {/* MAIN HUD CONTAINER */}
        <motion.div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-6xl h-[85vh] bg-[#020617] border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col md:flex-row isolate"
        >
            {/* --- BACKGROUND FX --- */}
            <div 
                className="absolute inset-0 pointer-events-none transition-opacity duration-300 -z-10"
                style={{ 
                    background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(29, 78, 216, 0.08), transparent 40%)`
                }} 
            />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none -z-10 brightness-100 contrast-150" />
            
            {/* HUD CORNERS */}
            <div className="absolute inset-4 pointer-events-none z-50">
                <HUDCorner position="tl" />
                <HUDCorner position="tr" />
                <HUDCorner position="bl" />
                <HUDCorner position="br" />
                
                {/* Top Center Status */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-black/40 border-b border-x border-slate-800/50 rounded-b-lg backdrop-blur-md">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-500/80 tracking-widest">
                        <Activity size={10} className="animate-pulse" />
                        <span>SYSTEM_ONLINE</span>
                    </div>
                </div>
            </div>

            {/* --- LEFT PANEL: CONTEXT --- */}
            <div className="hidden md:flex w-80 flex-col border-r border-slate-800/50 bg-[#020617]/50 backdrop-blur-md z-20 relative">
                <div className="p-8 border-b border-slate-800/50">
                    <div className="flex items-center gap-2 text-indigo-500 mb-4">
                        <Scan size={16} />
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold">Signal_Source</span>
                    </div>
                    <h2 className="text-xl text-white font-light tracking-tight leading-snug line-clamp-3 font-serif">
                        {note.title || 'Безымянная мысль'}
                    </h2>
                    <div className="mt-4 flex gap-2">
                        {note.tags?.map(t => (
                            <span key={t} className="text-[9px] px-2 py-1 rounded border border-slate-700 text-slate-400 font-mono">{t}</span>
                        ))}
                    </div>
                </div>
                
                {/* Note Content Preview */}
                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar-ghost relative">
                    <div className="text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap opacity-80 border-l border-slate-800 pl-4">
                        {note.content}
                    </div>
                </div>

                {/* Logs Area */}
                <div className="h-48 shrink-0 relative border-t border-slate-800/50">
                    <SystemLogs logs={logs} />
                </div>
            </div>

            {/* --- CENTER: THE VOID MAP --- */}
            <div className="flex-1 relative flex flex-col overflow-hidden">
                
                {/* Header Actions */}
                <div className="absolute top-0 right-0 p-8 z-50 flex justify-between w-full pointer-events-none">
                    <div className="pointer-events-auto"></div>
                    <button 
                        onClick={onClose} 
                        className="pointer-events-auto p-3 rounded-full border border-slate-700/50 hover:bg-slate-800 hover:text-white text-slate-500 transition-all bg-black/20 backdrop-blur-sm group"
                    >
                        <X size={20} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>

                {/* SCANNERS DECORATION */}
                <div className="absolute bottom-8 right-8 z-10 pointer-events-none opacity-50 hidden md:block">
                    <div className="flex flex-col gap-1 text-[8px] font-mono text-emerald-500/40 text-right">
                        <div>COORDS: {mousePos.x.toFixed(0)}, {mousePos.y.toFixed(0)}</div>
                        <div>MEM_ALLOC: {Math.floor(Math.random() * 40 + 20)}%</div>
                        <div>UPTIME: {Math.floor(performance.now() / 1000)}s</div>
                    </div>
                </div>

                {/* SVG & NODES LAYER */}
                <div className="flex-1 relative flex items-center justify-center">
                    
                    {/* REACTOR CORE (HTML LAYER for better shadows) */}
                    <div className="absolute z-10 pointer-events-none">
                        <ReactorCore score={transformationScore} />
                    </div>

                    {/* CONNECTIONS (SVG LAYER) */}
                    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 pointer-events-none z-0">
                        {/* Static Orbit Rings */}
                        <circle cx={center} cy={center} r={dist} fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                        <circle cx={center} cy={center} r={coreRadius + 30} fill="none" stroke="#1e293b" strokeWidth="1" opacity="0.3" />

                        {/* Connections */}
                        <ConnectionLine x1={center} y1={center - coreRadius} x2={posSprint.x} y2={posSprint.y + 30} color="#10b981" active={!!linkedTask} />
                        <ConnectionLine x1={center + coreRadius} y1={center} x2={posRitual.x - 30} y2={posRitual.y} color="#f59e0b" active={!!linkedHabit} />
                        <ConnectionLine x1={center} y1={center + coreRadius} x2={posJournal.x} y2={posJournal.y - 30} color="#06b6d4" active={linkedEntries.length > 0} />
                        <ConnectionLine x1={center - coreRadius} y1={center} x2={posHub.x + 30} y2={posHub.y} color="#8b5cf6" active={false} />
                    </svg>

                    {/* NODES (HTML INTERACTIVE LAYER) */}
                    <div className="absolute inset-0 w-full h-full pointer-events-none">
                        <div className="w-full h-full max-w-[600px] max-h-[600px] mx-auto relative pointer-events-auto">
                            
                            {/* NORTH: SPRINT */}
                            <OrbitalPort 
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
                            <OrbitalPort 
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
                            <OrbitalPort 
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
                            <OrbitalPort 
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

                {/* BOTTOM: PROGRESS BAR */}
                <div className="p-8 bg-slate-900/30 border-t border-slate-800/50 backdrop-blur-md relative z-20">
                    <div className="flex justify-between items-end mb-3">
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">
                                Sync_Progress
                            </div>
                            <div className={`text-sm tracking-wide ${transformationScore === 100 ? 'text-amber-400 font-bold shadow-amber-500/50 drop-shadow-sm' : 'text-slate-300'}`}>
                                {transformationScore === 100 ? 'COMPLETE_INTEGRATION' : transformationScore > 50 ? 'ACTIVE_PHASE' : 'INITIALIZING...'}
                            </div>
                        </div>
                    </div>
                    
                    {/* Tech Bar */}
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 flex gap-1">
                            {Array.from({length: 20}).map((_, i) => (
                                <div key={i} className="flex-1 bg-slate-900 border-r border-black/50 last:border-0" />
                            ))}
                        </div>
                        <motion.div 
                            className={`h-full shadow-[0_0_15px_currentColor] ${transformationScore === 100 ? 'bg-amber-400 text-amber-400' : 'bg-indigo-500 text-indigo-500'}`}
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
