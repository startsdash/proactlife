
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, Task, Habit, JournalEntry } from '../types';
import { X, Zap, Target, Book, Flame, Activity, CheckCircle2, Lock, Terminal, Cpu, Radio, ShieldCheck } from 'lucide-react';
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

// --- SYSTEM LOG COMPONENT ---
const SystemLogs = ({ logs }: { logs: string[] }) => {
    return (
        <div className="font-mono text-[9px] text-emerald-500/80 p-4 border-r border-emerald-500/20 bg-black/20 h-full overflow-hidden flex flex-col justify-end">
            <div className="mb-2 text-xs font-bold text-emerald-400 opacity-50 uppercase tracking-widest">System_Log_v2.4</div>
            <div className="space-y-1">
                {logs.map((log, i) => (
                    <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1 - (logs.length - 1 - i) * 0.15, x: 0 }} 
                        className="truncate"
                    >
                        <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString([], {hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                        {log}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// --- ACTION TERMINAL BUTTON ---
const ActionTerminal = ({ 
    label, 
    subLabel, 
    icon: Icon, 
    onClick, 
    active, 
    disabled, 
    colorClass 
}: { 
    label: string, 
    subLabel: string, 
    icon: any, 
    onClick: () => void, 
    active: boolean, 
    disabled?: boolean, 
    colorClass: string 
}) => {
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`
                w-full p-4 border-l-2 transition-all duration-300 group relative overflow-hidden text-left
                ${active 
                    ? `bg-${colorClass}-500/10 border-${colorClass}-500` 
                    : 'bg-transparent border-slate-700 hover:bg-slate-800 hover:border-slate-500'}
                ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
            `}
        >
            <div className="flex justify-between items-center relative z-10">
                <div>
                    <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${active ? `text-${colorClass}-400` : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {subLabel}
                    </div>
                    <div className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                        {label}
                    </div>
                </div>
                <Icon size={18} className={`${active ? `text-${colorClass}-400` : 'text-slate-600'} transition-colors`} />
            </div>
            
            {/* Scanline Effect */}
            {active && (
                <motion.div 
                    className={`absolute inset-0 bg-gradient-to-r from-transparent via-${colorClass}-500/20 to-transparent`}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
            )}
        </button>
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
  // Task Done: 30% | Habit > 3 days: 30% | Insight: 40%
  const transformationScore = useMemo(() => {
      let score = 0;
      if (isTaskDone) score += 30;
      if (isHabitEstablished) score += 30;
      if (hasInsight) score += 40;
      return score;
  }, [isTaskDone, isHabitEstablished, hasInsight]);

  // --- LOGS ---
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
      const initLogs = [
          "INITIALIZING NEURAL LINK...",
          `TARGET ID: ${note.id.slice(-4)}`,
          "SCANNING SECTORS...",
      ];
      let delay = 0;
      initLogs.forEach((log, i) => {
          delay += 500;
          setTimeout(() => setLogs(prev => [...prev.slice(-5), log]), delay);
      });

      if (linkedTask) setTimeout(() => setLogs(prev => [...prev.slice(-5), `KANBAN LINK DETECTED: [${linkedTask.column.toUpperCase()}]`]), delay + 600);
      if (linkedHabit) setTimeout(() => setLogs(prev => [...prev.slice(-5), `RITUAL LINK DETECTED: [STREAK ${linkedHabit.streak}]`]), delay + 800);
      if (hasInsight) setTimeout(() => setLogs(prev => [...prev.slice(-5), `INSIGHT ACQUIRED. CORE STABLE.`]), delay + 1000);

  }, []);

  // --- HANDLERS ---
  const handleCreateTask = () => {
      onCreateTask({
          id: Date.now().toString(),
          title: note.title || 'Новая миссия',
          content: note.content,
          column: 'todo',
          createdAt: Date.now(),
          originNoteId: note.id
      });
      setLogs(prev => [...prev.slice(-5), "PROTOCOL INITIATED: SPRINT CREATED"]);
  };

  const handleCreateHabit = () => {
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
      setLogs(prev => [...prev.slice(-5), "PROTOCOL INITIATED: RITUAL STARTED"]);
  };

  const handleCreateEntry = () => {
      onCreateEntry({
          id: Date.now().toString(),
          date: Date.now(),
          content: `Рефлексия по заметке: ${note.title || 'Без названия'}`,
          linkedNoteId: note.id,
          linkedNoteIds: [note.id]
      });
      setLogs(prev => [...prev.slice(-5), "DATA LOG OPENED: JOURNAL ENTRY"]);
  };

  // --- RADAR CONFIG ---
  const cx = 300;
  const cy = 300;
  
  // Orbits
  const r1 = 60; // Core
  const r2 = 120; // Inner
  const r3 = 180; // Middle
  const r4 = 240; // Outer

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
        
        {/* MAIN HUD CONTAINER */}
        <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-6xl h-[85vh] bg-[#020617] border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col md:flex-row"
        >
            {/* --- LEFT PANEL: SYSTEM --- */}
            <div className="hidden md:flex w-64 flex-col border-r border-slate-800/50 bg-[#020617]/50 backdrop-blur-md z-10 relative">
                <div className="p-6 border-b border-slate-800/50">
                    <div className="flex items-center gap-2 text-emerald-500 mb-2">
                        <Terminal size={16} />
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">System Status</span>
                    </div>
                    <div className="text-2xl text-white font-light tracking-tight">Online</div>
                </div>
                
                {/* Note Info */}
                <div className="p-6 border-b border-slate-800/50 flex-1 overflow-y-auto custom-scrollbar-ghost">
                    <div className="mb-4">
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Source ID</div>
                        <div className="font-mono text-emerald-500 text-xs">{note.id.slice(-8)}</div>
                    </div>
                    <div className="mb-4">
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Content Preview</div>
                        <div className="text-slate-400 text-xs font-serif italic line-clamp-6 opacity-70">
                            {note.content}
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Creation Date</div>
                        <div className="font-mono text-slate-400 text-xs">{new Date(note.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Logs Area */}
                <div className="h-40 shrink-0">
                    <SystemLogs logs={logs} />
                </div>
            </div>

            {/* --- CENTER: THE RADAR --- */}
            <div className="flex-1 relative flex flex-col overflow-hidden">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
                    <div>
                        <h2 className="text-white text-lg font-bold uppercase tracking-wider flex items-center gap-3">
                            <Radio className="text-indigo-500 animate-pulse" size={18} />
                            Transformation Radar
                        </h2>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">OBJECT: {note.title?.toUpperCase() || 'UNTITLED'}</p>
                    </div>
                    <button onClick={onClose} className="pointer-events-auto p-2 rounded-full border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* SVG RADAR */}
                <div className="flex-1 flex items-center justify-center relative">
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)] pointer-events-none" />
                    
                    <svg viewBox="0 0 600 600" className="w-full h-full max-w-[600px] max-h-[600px] p-8 overflow-visible">
                        <defs>
                            <radialGradient id="coreGradient">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                            </radialGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>

                        {/* --- ORBITS --- */}
                        {/* Outer Ring (Call) */}
                        <circle cx={cx} cy={cy} r={r4} fill="none" stroke="#1e293b" strokeWidth="1" />
                        <motion.circle cx={cx} cy={cy} r={r4} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 8" animate={{ rotate: 360 }} transition={{ duration: 120, repeat: Infinity, ease: "linear" }} />
                        
                        {/* Middle Ring (Trials) */}
                        <circle cx={cx} cy={cy} r={r3} fill="none" stroke="#1e293b" strokeWidth="1" />
                        <motion.circle cx={cx} cy={cy} r={r3} fill="none" stroke="#475569" strokeWidth="1" strokeDasharray="10 20" animate={{ rotate: -360 }} transition={{ duration: 90, repeat: Infinity, ease: "linear" }} />

                        {/* Inner Ring (Threshold) */}
                        <circle cx={cx} cy={cy} r={r2} fill="none" stroke="#1e293b" strokeWidth="1" />
                        
                        {/* --- CONNECTIONS (RAYS) --- */}
                        
                        {/* NORTH RAY (Tasks) */}
                        {linkedTask && (
                            <motion.line 
                                x1={cx} y1={cy - r1} x2={cx} y2={cy - r4} 
                                stroke="#10b981" strokeWidth="2"
                                strokeDasharray="4 4"
                                animate={{ strokeDashoffset: [0, -8] }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                filter="url(#glow)"
                            />
                        )}
                        {/* Status Marker North */}
                        <circle cx={cx} cy={cy - r4} r="4" fill={isTaskDone ? "#10b981" : "#1e293b"} stroke="#10b981" strokeWidth="2" />
                        <text x={cx} y={cy - r4 - 15} textAnchor="middle" fill="#10b981" className="text-[10px] font-mono font-bold uppercase tracking-widest">SPRINT</text>

                        {/* EAST RAY (Habits) */}
                        {linkedHabit && (
                            <motion.line 
                                x1={cx + r1} y1={cy} x2={cx + r4} y2={cy} 
                                stroke="#f59e0b" strokeWidth="2"
                                strokeDasharray="4 4"
                                animate={{ strokeDashoffset: [0, -8] }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                filter="url(#glow)"
                            />
                        )}
                        {/* Status Marker East */}
                        <circle cx={cx + r4} cy={cy} r="4" fill={isHabitEstablished ? "#f59e0b" : "#1e293b"} stroke="#f59e0b" strokeWidth="2" />
                        <text x={cx + r4 + 25} y={cy + 4} textAnchor="start" fill="#f59e0b" className="text-[10px] font-mono font-bold uppercase tracking-widest">RITUAL</text>

                        {/* SOUTH RAY (Journal) */}
                        {linkedEntries.length > 0 && (
                            <motion.line 
                                x1={cx} y1={cy + r1} x2={cx} y2={cy + r4} 
                                stroke="#06b6d4" strokeWidth="2"
                                strokeDasharray="4 4"
                                animate={{ strokeDashoffset: [0, -8] }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                filter="url(#glow)"
                            />
                        )}
                        {/* Status Marker South */}
                        <circle cx={cx} cy={cy + r4} r="4" fill={hasInsight ? "#06b6d4" : "#1e293b"} stroke="#06b6d4" strokeWidth="2" />
                        <text x={cx} y={cy + r4 + 20} textAnchor="middle" fill="#06b6d4" className="text-[10px] font-mono font-bold uppercase tracking-widest">INSIGHT</text>

                        {/* --- THE CORE --- */}
                        <g filter="url(#glow)">
                            <motion.circle 
                                cx={cx} cy={cy} r={r1} 
                                fill="#1e1b4b" 
                                stroke="#6366f1" strokeWidth="2" 
                                animate={{ 
                                    r: [r1, r1 + 5, r1],
                                    strokeOpacity: [0.5, 1, 0.5]
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.circle 
                                cx={cx} cy={cy} r={r1 / 2} 
                                fill="url(#coreGradient)"
                                animate={{ opacity: [0.5, 0.8, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            />
                            {/* Core Text */}
                            <text x={cx} y={cy} dy="0.3em" textAnchor="middle" fill="white" className="text-xs font-bold font-mono tracking-widest pointer-events-none">
                                {transformationScore}%
                            </text>
                        </g>
                    </svg>
                </div>

                {/* BOTTOM: PROGRESS BAR */}
                <div className="p-6 bg-slate-900/50 border-t border-slate-800">
                    <div className="flex justify-between items-end mb-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Personality Transformation Status
                        </div>
                        <div className="font-mono text-xl text-indigo-400 font-bold">{transformationScore}/100</div>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${transformationScore}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </div>
                </div>
            </div>

            {/* --- RIGHT PANEL: ACTIONS --- */}
            <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-slate-800/50 bg-[#020617]/50 backdrop-blur-md flex flex-col">
                <div className="p-6 border-b border-slate-800/50">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                        <Cpu size={16} className="text-indigo-500" /> Control Deck
                    </h3>
                </div>
                
                <div className="flex-1 flex flex-col">
                    <ActionTerminal 
                        label="INITIATE SPRINT"
                        subLabel="ACTION PROTOCOL"
                        icon={Target}
                        onClick={handleCreateTask}
                        active={!!linkedTask}
                        disabled={!!linkedTask}
                        colorClass="emerald"
                    />
                    
                    <ActionTerminal 
                        label="ESTABLISH RITUAL"
                        subLabel="SYSTEM PROTOCOL"
                        icon={Flame}
                        onClick={handleCreateHabit}
                        active={!!linkedHabit}
                        disabled={!!linkedHabit}
                        colorClass="amber"
                    />
                    
                    <ActionTerminal 
                        label="LOG REFLECTION"
                        subLabel="DATA ENTRY"
                        icon={Book}
                        onClick={handleCreateEntry}
                        active={linkedEntries.length > 0}
                        colorClass="cyan"
                    />

                    {/* Completion Badge */}
                    {transformationScore === 100 && (
                        <div className="mt-auto m-4 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                            <ShieldCheck size={32} className="mx-auto text-indigo-400 mb-2" />
                            <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">Evolution Complete</div>
                            <div className="text-[10px] text-indigo-400/60">New Neural Pathway Established</div>
                        </div>
                    )}
                </div>
            </div>

        </motion.div>
    </div>
  );
};

export default HeroJourney;
