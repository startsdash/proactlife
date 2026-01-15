
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, Habit, JournalEntry } from '../types';
import { generateTaskChallenge } from '../services/geminiService';
import { 
  Orbit, 
  Zap, 
  Flame, 
  Book, 
  Kanban as KanbanIcon, 
  BrainCircuit, 
  X, 
  Terminal, 
  Activity, 
  CheckCircle2, 
  ArrowRight,
  User
} from 'lucide-react';
import { ICON_MAP } from '../constants';

interface Props {
  note: Note;
  config: AppConfig;
  stats: {
    notesCount: number;
    actionsCount: number;
  };
  onClose: () => void;
  onAddTask: (task: Task) => void;
  onAddHabit: (habit: Habit) => void;
  onAddJournalEntry: (entry: JournalEntry) => void;
}

const ORBIT_DURATION = 60; // Seconds for full rotation

// Helper component moved outside
const RenderOrbitItem = ({ 
    angle, 
    radius, 
    icon: Icon, 
    label, 
    color, 
    onClick, 
    delay = 0,
    isProcessing
}: { 
    angle: number, 
    radius: number, 
    icon: any, 
    label: string, 
    color: string, 
    onClick: () => void, 
    delay?: number,
    isProcessing: boolean
}) => {
    // Convert angle to position
    const rad = (angle * Math.PI) / 180;
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;

    return (
        <motion.div
            className="absolute"
            style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay, type: 'spring' }}
        >
            <button 
                onClick={onClick}
                disabled={isProcessing}
                className={`relative group flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${isProcessing ? 'opacity-50 grayscale' : 'hover:scale-110'}`}
            >
                <div className={`w-12 h-12 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:border-${color.split('-')[1]}-500 transition-colors`}>
                    <Icon className={`${color}`} size={20} />
                </div>
                <div className={`absolute top-full mt-2 text-[9px] font-mono uppercase tracking-widest text-slate-400 bg-black/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap`}>
                    {label}
                </div>
            </button>
        </motion.div>
    );
};

const JourneyMap: React.FC<Props> = ({ note, config, stats, onClose, onAddTask, onAddHabit, onAddJournalEntry }) => {
  const [logs, setLogs] = useState<string[]>(['> SYSTEM_READY. Waiting for vector selection...']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState<'ordinary' | 'call' | 'trials'>('call');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-3), `> ${msg}`]);

  // --- ACTIONS ---

  const handleSoloPath = (type: 'sprint' | 'ritual' | 'journal') => {
    setSelectedPath(type);
    setActiveStage('trials');
    
    setTimeout(() => {
        if (type === 'sprint') {
            onAddTask({
                id: Date.now().toString(),
                title: note.title || 'Новая задача из заметки',
                content: note.content,
                column: 'todo',
                createdAt: Date.now(),
                spheres: []
            });
            addLog('Task Protocol initiated.');
        } else if (type === 'ritual') {
            onAddHabit({
                id: Date.now().toString(),
                title: note.title || 'Новая привычка',
                description: 'Основано на заметке',
                color: 'indigo',
                icon: 'Zap',
                frequency: 'daily',
                history: {},
                streak: 0,
                bestStreak: 0,
                reminders: [],
                createdAt: Date.now()
            });
            addLog('Kinetic Loop established.');
        } else if (type === 'journal') {
            onAddJournalEntry({
                id: Date.now().toString(),
                date: Date.now(),
                content: note.content,
                title: note.title,
                linkedNoteId: note.id,
                isInsight: true
            });
            addLog('Deep Reflection archived.');
        }
        
        setTimeout(() => onClose(), 1000);
    }, 800);
  };

  const handleMentorPath = async (mentorId: string) => {
      const mentor = config.mentors.find(m => m.id === mentorId);
      if (!mentor) return;

      setSelectedPath(mentorId);
      setIsProcessing(true);
      addLog(`Connecting to Neural Net: ${mentor.name}...`);

      try {
          const challenge = await generateTaskChallenge(note.content, config); // We use general challenge gen for now, scoped to mentor via prompt in future if needed
          
          onAddTask({
              id: Date.now().toString(),
              title: `Вызов от ${mentor.name}`,
              content: note.content,
              activeChallenge: challenge,
              column: 'todo',
              createdAt: Date.now(),
              spheres: []
          });
          
          addLog('Challenge generated successfully.');
          setActiveStage('trials');
          setTimeout(() => onClose(), 1500);
      } catch (e) {
          addLog('ERROR: Signal lost.');
          setIsProcessing(false);
          setSelectedPath(null);
      }
  };

  // --- RENDER HELPERS ---

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[20px]"
            onClick={onClose}
        >
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </motion.div>

        {/* Main Interface */}
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-5xl aspect-square md:aspect-video flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {/* --- HUD ELEMENTS --- */}
            
            {/* Sync Status */}
            <div className="absolute top-10 right-10 flex flex-col items-end z-20">
                <div className="flex items-center gap-2 mb-1">
                    <Activity size={14} className="text-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Sync Status</span>
                </div>
                <div className="text-3xl font-light text-white font-mono">
                    {stats.actionsCount} <span className="text-slate-600">/</span> {stats.notesCount}
                </div>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Actions / Ideas</div>
            </div>

            {/* System Log */}
            <div className="absolute bottom-10 left-10 right-10 md:w-1/3 z-20">
                <div className="bg-black/80 backdrop-blur-md border border-slate-800 rounded-lg p-3 font-mono text-[10px] text-green-400 shadow-2xl">
                    <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-1 text-slate-500">
                        <Terminal size={10} />
                        <span>JOURNEY_LOG</span>
                    </div>
                    <div className="flex flex-col gap-1 h-12 justify-end overflow-hidden">
                        {logs.map((log, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="truncate">
                                {log}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Close */}
            <button onClick={onClose} className="absolute top-10 left-10 text-white/20 hover:text-white transition-colors z-20">
                <X size={24} />
            </button>


            {/* --- ORBITAL SYSTEM --- */}
            <div className="relative flex items-center justify-center w-[600px] h-[600px]">
                
                {/* Center Core (The Note) */}
                <div className="absolute z-10 w-48 h-48 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-center p-6 shadow-[0_0_50px_rgba(255,255,255,0.05)] group">
                    <div className="absolute inset-0 rounded-full border border-white/20 border-dashed animate-spin-slow opacity-30" style={{ animationDuration: '30s' }} />
                    <div className="relative overflow-hidden max-h-full">
                        <div className="text-[9px] font-mono text-slate-500 uppercase mb-2">Ordinary World</div>
                        <div className="text-xs text-slate-300 font-serif italic line-clamp-4">
                            {note.content}
                        </div>
                    </div>
                    {/* Core Pulse */}
                    <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-2xl -z-10 animate-pulse" />
                </div>

                {/* Inner Orbit (Solo Path) */}
                <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '60s' }}>
                    <div className="absolute inset-0 rounded-full border border-white/5" />
                    
                    <RenderOrbitItem 
                        angle={0} radius={180} delay={0.1}
                        icon={KanbanIcon} label="Спринты" color="text-rose-400"
                        onClick={() => handleSoloPath('sprint')}
                        isProcessing={isProcessing}
                    />
                    <RenderOrbitItem 
                        angle={120} radius={180} delay={0.2}
                        icon={Flame} label="Ритуалы" color="text-orange-400"
                        onClick={() => handleSoloPath('ritual')}
                        isProcessing={isProcessing}
                    />
                    <RenderOrbitItem 
                        angle={240} radius={180} delay={0.3}
                        icon={Book} label="Дневник" color="text-cyan-400"
                        onClick={() => handleSoloPath('journal')}
                        isProcessing={isProcessing}
                    />
                </div>

                {/* Outer Orbit (Mentors) */}
                <div className="absolute inset-[-100px] animate-spin-slow" style={{ animationDuration: '90s', animationDirection: 'reverse' }}>
                    <div className="absolute inset-0 rounded-full border border-white/5 border-dashed" />
                    
                    {config.mentors.slice(0, 4).map((mentor, i) => {
                        const Icon = ICON_MAP[mentor.icon] || User;
                        const angle = (360 / Math.min(config.mentors.length, 4)) * i;
                        return (
                            <RenderOrbitItem 
                                key={mentor.id}
                                angle={angle} radius={280} delay={0.4 + (i * 0.1)}
                                icon={Icon} label={mentor.name} color="text-violet-400"
                                onClick={() => handleMentorPath(mentor.id)}
                                isProcessing={isProcessing}
                            />
                        );
                    })}
                </div>

                {/* Connection Arcs (Visual Feedback) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <circle cx="50%" cy="50%" r="180" fill="none" stroke="url(#gradientArc)" strokeWidth="0.5" opacity="0.3" />
                    <defs>
                        <linearGradient id="gradientArc" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="transparent" />
                            <stop offset="50%" stopColor="white" />
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                    </defs>
                    
                    {/* Active Path Beam */}
                    {activeStage === 'trials' && (
                        <motion.line 
                            x1="50%" y1="50%" x2="50%" y2="0%"
                            stroke="#818cf8" strokeWidth="2"
                            strokeDasharray="4 4"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1, rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                    )}
                </svg>

            </div>

        </motion.div>
    </div>
  );
};

export default JourneyMap;
