import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Mentor } from '../types';
import { ICON_MAP } from '../constants';
import { generateJourneyChallenge } from '../services/geminiService';
import { 
  X, Map, Kanban, Flame, Book, ArrowRight, Zap, 
  Loader2, Radio, Target, Sparkles, Orbit, Activity 
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface Props {
  note: Note;
  config: AppConfig;
  stats: {
    syncRatio: string; // e.g. "137 / 41"
    percent: number;
  };
  onClose: () => void;
  actions: {
    createTask: (content: string, title?: string) => void;
    createHabit: (title: string) => void;
    createJournal: (content: string) => void;
  };
}

const ORBIT_RADIUS_INNER = 100;
const ORBIT_RADIUS_OUTER = 180;

const JourneyMap: React.FC<Props> = ({ note, config, stats, onClose, actions }) => {
  const [stage, setStage] = useState<'selection' | 'processing' | 'result'>('selection');
  const [activeMentorId, setActiveMentorId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(['> SYSTEM_READY. Waiting for path selection...']);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-3), `> ${msg}`]);
  };

  const handleSoloPath = (type: 'task' | 'habit' | 'journal') => {
    setLoading(true);
    setStage('processing');
    addLog(`Protocol initiated: ${type.toUpperCase()}_PATH`);
    
    setTimeout(() => {
        if (type === 'task') {
            actions.createTask(note.content, note.title);
            addLog('Task created in Sprints.');
        } else if (type === 'habit') {
            actions.createHabit(note.title || 'Новая привычка');
            addLog('Ritual integrated into Reactor.');
        } else if (type === 'journal') {
            actions.createJournal(note.content);
            addLog('Reflection recorded in Database.');
        }
        setLoading(false);
        setStage('result');
    }, 1500);
  };

  const handleMentorPath = async (mentor: Mentor) => {
      setLoading(true);
      setStage('processing');
      setActiveMentorId(mentor.id);
      addLog(`Connecting to Neural Node: ${mentor.name.toUpperCase()}...`);

      try {
          const challenge = await generateJourneyChallenge(note.content, mentor.id, config);
          actions.createTask(challenge, `Вызов от ${mentor.name}`);
          addLog('Challenge generated and assigned.');
          setLoading(false);
          setStage('result');
      } catch (e) {
          addLog('ERROR: Connection failed.');
          setLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-[20px]"
        onClick={onClose}
      />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-4xl aspect-video max-h-[80vh] bg-slate-900/40 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{ 
                 backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)',
                 backgroundSize: '40px 40px' 
             }} 
        />

        {/* --- UI LAYER --- */}
        
        {/* Header: Sync Status */}
        <div className="absolute top-8 right-8 flex flex-col items-end pointer-events-none z-20">
            <div className="flex items-center gap-2 mb-1 opacity-70">
                <Activity size={12} className="text-cyan-400 animate-pulse" />
                <span className="font-mono text-[10px] text-cyan-200 uppercase tracking-widest">Transformation Ratio</span>
            </div>
            <div className="font-mono text-xl text-white">
                {stats.syncRatio}
            </div>
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-8 left-8 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-30 border border-white/5">
            <X size={20} />
        </button>

        {/* CENTER STAGE: THE ORBITAL SYSTEM */}
        <div className="flex-1 relative flex items-center justify-center">
            
            {/* STAGE A: CORE (The Note) */}
            <motion.div 
                className="absolute z-10 w-48 h-48 rounded-full bg-slate-900/80 border border-white/20 backdrop-blur-xl flex flex-col items-center justify-center text-center p-6 shadow-[0_0_50px_rgba(255,255,255,0.05)] group cursor-default"
                animate={{ 
                    scale: loading ? [1, 0.95, 1] : 1,
                    boxShadow: loading ? "0 0 80px rgba(99,102,241,0.3)" : "0 0 50px rgba(255,255,255,0.05)"
                }}
                transition={{ duration: 2, repeat: loading ? Infinity : 0 }}
            >
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Source Node</div>
                <div className="text-sm font-serif text-slate-200 line-clamp-3 italic opacity-90">
                    {note.content}
                </div>
            </motion.div>

            {/* ORBIT RINGS (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                <circle cx="50%" cy="50%" r={ORBIT_RADIUS_INNER} fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 4" className="animate-[spin_60s_linear_infinite]" />
                <circle cx="50%" cy="50%" r={ORBIT_RADIUS_OUTER} fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="2 4" className="animate-[spin_120s_linear_infinite_reverse]" />
            </svg>

            {/* STAGE B: SELECTORS (Gateways) */}
            {stage === 'selection' && (
                <>
                    {/* LEFT SATELLITES: SOLO PATH */}
                    <div className="absolute w-full h-full pointer-events-none">
                        {/* Task */}
                        <div className="absolute top-1/2 left-[calc(50%-180px)] -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                            <Tooltip content="Превратить в Задачу" side="left">
                                <motion.button 
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    onClick={() => handleSoloPath('task')}
                                    className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/50 hover:bg-rose-500 hover:border-rose-500 text-rose-500 hover:text-white transition-all flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.2)] hover:shadow-[0_0_30px_rgba(244,63,94,0.6)]"
                                >
                                    <Kanban size={20} strokeWidth={1.5} />
                                </motion.button>
                            </Tooltip>
                        </div>
                        {/* Habit */}
                        <div className="absolute top-1/2 left-[calc(50%-140px)] -translate-x-1/2 -translate-y-[140px] pointer-events-auto">
                            <Tooltip content="Создать Привычку" side="top">
                                <motion.button 
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    onClick={() => handleSoloPath('habit')}
                                    className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/50 hover:bg-amber-500 hover:border-amber-500 text-amber-500 hover:text-white transition-all flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]"
                                >
                                    <Flame size={20} strokeWidth={1.5} />
                                </motion.button>
                            </Tooltip>
                        </div>
                        {/* Journal */}
                        <div className="absolute top-1/2 left-[calc(50%-140px)] -translate-x-1/2 translate-y-[100px] pointer-events-auto">
                            <Tooltip content="Записать в Дневник" side="bottom">
                                <motion.button 
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    onClick={() => handleSoloPath('journal')}
                                    className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/50 hover:bg-cyan-500 hover:border-cyan-500 text-cyan-500 hover:text-white transition-all flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
                                >
                                    <Book size={20} strokeWidth={1.5} />
                                </motion.button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* RIGHT SATELLITES: MENTOR PATH */}
                    <div className="absolute w-full h-full pointer-events-none">
                        {config.mentors.slice(0, 3).map((mentor, i) => {
                            const angle = -30 + (i * 30); // Distribution arc
                            const rad = angle * (Math.PI / 180);
                            const x = Math.cos(rad) * 180;
                            const y = Math.sin(rad) * 180;
                            const Icon = ICON_MAP[mentor.icon] || ICON_MAP['User'];

                            return (
                                <div 
                                    key={mentor.id}
                                    className="absolute top-1/2 left-1/2 pointer-events-auto"
                                    style={{ transform: `translate(${x}px, ${y}px) translate(-50%, -50%)` }}
                                >
                                    <Tooltip content={`Вызов от: ${mentor.name}`} side="right">
                                        <motion.button 
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.4 + (i * 0.1) }}
                                            onClick={() => handleMentorPath(mentor)}
                                            className="w-14 h-14 rounded-full bg-violet-600/10 border border-violet-500/50 hover:bg-violet-600 hover:border-violet-500 text-violet-400 hover:text-white transition-all flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] group"
                                        >
                                            <Icon size={24} strokeWidth={1.5} />
                                        </motion.button>
                                    </Tooltip>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* STAGE C: RESULT */}
            {stage === 'result' && (
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute z-20 flex flex-col items-center gap-6"
                >
                    <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                        <Radio size={40} className="text-white animate-pulse" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Путь начат</h3>
                        <p className="text-sm text-slate-400 font-mono">Объект успешно ассимилирован системой.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 rounded-full border border-white/20 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-[0.2em] transition-all"
                    >
                        [ CLOSE MAP ]
                    </button>
                </motion.div>
            )}

        </div>

        {/* FOOTER: SYSTEM LOG */}
        <div className="h-32 bg-black/40 border-t border-white/5 backdrop-blur-md p-6 font-mono text-[10px] text-emerald-500/80 overflow-hidden flex flex-col justify-end">
            <div className="flex items-center gap-2 mb-2 opacity-50 border-b border-emerald-500/20 pb-2">
                <Target size={12} />
                <span>JOURNEY_LOG_TERMINAL</span>
            </div>
            {logs.map((log, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    {log}
                </motion.div>
            ))}
        </div>

      </motion.div>
    </div>
  );
};

export default JourneyMap;