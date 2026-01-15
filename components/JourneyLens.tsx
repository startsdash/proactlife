
import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, PanInfo, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, Habit, JournalEntry, Mentor } from '../types';
import { ICON_MAP, SPHERES } from '../constants';
import { analyzeSandboxItem } from '../services/geminiService';
import { X, Target, Flame, Book, Zap, Activity, BrainCircuit, CheckCircle2, Lock, ArrowUpRight } from 'lucide-react';

interface Props {
  note: Note;
  config: AppConfig;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  onAddHabit: (habit: Habit) => void;
  onAddJournalEntry: (entry: JournalEntry) => void;
}

const ORBIT_RADII = [0, 140, 220, 300]; // Center, Task, Habit, Journal
const ZONES = [
    { id: 'core', label: 'ЗОВ', radius: 0, icon: BrainCircuit, color: '#a78bfa' },
    { id: 'threshold', label: 'ПОРОГ (ЗАДАЧА)', radius: 140, icon: Target, color: '#34d399' },
    { id: 'trials', label: 'ИСПЫТАНИЯ (РИТУАЛ)', radius: 220, icon: Flame, color: '#fb923c' },
    { id: 'transformation', label: 'ТРАНСФОРМАЦИЯ (ДНЕВНИК)', radius: 300, icon: Book, color: '#22d3ee' },
];

const JourneyLens: React.FC<Props> = ({ note, config, onClose, onAddTask, onAddHabit, onAddJournalEntry }) => {
  const [logs, setLogs] = useState<string[]>(['[SYSTEM]: NEURAL_LINK_ESTABLISHED', '[STATUS]: WAITING_FOR_VECTOR...']);
  const [activeZone, setActiveZone] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mentorResponse, setMentorResponse] = useState<string | null>(null);
  
  const controls = useAnimation();
  const coreRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-3), msg]);

  const handleDrag = (_: any, info: PanInfo) => {
      const dist = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
      
      // Determine active zone based on distance
      let zoneIndex = 0;
      if (dist > 80 && dist < 180) zoneIndex = 1;
      else if (dist >= 180 && dist < 260) zoneIndex = 2;
      else if (dist >= 260) zoneIndex = 3;
      
      if (zoneIndex !== activeZone) {
          setActiveZone(zoneIndex);
          if (zoneIndex > 0) {
              // Haptic feedback if available
              if (navigator.vibrate) navigator.vibrate(10);
              addLog(`[TARGET_LOCKED]: ${ZONES[zoneIndex].label}`);
          }
      }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
      const dist = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
      
      if (activeZone === 1) {
          // Create Task
          createTask();
      } else if (activeZone === 2) {
          // Create Habit
          createHabit();
      } else if (activeZone === 3) {
          // Create Journal
          createJournal();
      }

      // Reset position
      controls.start({ x: 0, y: 0, scale: 1 });
      setActiveZone(0);
  };

  const createTask = () => {
      addLog('[PROTOCOL]: INITIATING SPRINT TASK...');
      const task: Task = {
          id: Date.now().toString(),
          title: note.title || 'Новая задача из Пути',
          content: note.content,
          column: 'todo',
          createdAt: Date.now(),
          spheres: [], // User needs to classify later or we guess
          activeChallenge: mentorResponse || undefined
      };
      onAddTask(task);
      addLog('[SUCCESS]: TASK_MATERIALIZED');
      setTimeout(() => alert('Задача создана в Спринтах!'), 100);
  };

  const createHabit = () => {
      addLog('[PROTOCOL]: BUILDING NEURAL PATHWAY...');
      const habit: Habit = {
          id: Date.now().toString(),
          title: note.title || 'Новая привычка',
          description: 'Интегрировано из Путешествия мысли',
          color: 'indigo',
          icon: 'Zap',
          frequency: 'daily',
          history: {},
          streak: 0,
          bestStreak: 0,
          reminders: [],
          createdAt: Date.now()
      };
      onAddHabit(habit);
      addLog('[SUCCESS]: HABIT_ENCODED');
      setTimeout(() => alert('Привычка добавлена в Трекер!'), 100);
  };

  const createJournal = () => {
      addLog('[PROTOCOL]: SYNTHESIZING EXPERIENCE...');
      const entry: JournalEntry = {
          id: Date.now().toString(),
          date: Date.now(),
          content: note.content,
          title: note.title || 'Инсайт Путешествия',
          isInsight: true,
          linkedNoteId: note.id,
          aiFeedback: mentorResponse || undefined
      };
      onAddJournalEntry(entry);
      addLog('[SUCCESS]: INSIGHT_ARCHIVED');
      setTimeout(() => alert('Запись создана в Дневнике!'), 100);
  };

  const handleMentorConsult = async (mentor: Mentor) => {
      if (isProcessing) return;
      setIsProcessing(true);
      addLog(`[CONNECTION]: UPLOADING TO ${mentor.name.toUpperCase()}...`);
      
      try {
          const result = await analyzeSandboxItem(note.content, mentor.id, config);
          if (result) {
              setMentorResponse(result.suggestedTask); // Using suggested task as the "Challenge" text
              addLog(`[INCOMING]: DATA RECEIVED FROM ${mentor.name.toUpperCase()}`);
          }
      } catch (e) {
          addLog('[ERROR]: CONNECTION_LOST');
      } finally {
          setIsProcessing(false);
      }
  };

  const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
    const Icon = ICON_MAP[name] || ICON_MAP['User'];
    return <Icon className={className} />;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden">
        {/* Backdrop */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-[40px]"
            onClick={onClose}
        />

        {/* Main Lens Container */}
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative w-full max-w-5xl aspect-square md:aspect-video flex items-center justify-center pointer-events-none"
        >
            {/* --- ORBITAL SYSTEM (VISUALS) --- */}
            <div className="absolute inset-0 flex items-center justify-center">
                {ZONES.slice(1).map((zone, i) => (
                    <motion.div
                        key={zone.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`absolute rounded-full border border-dashed flex items-center justify-center transition-all duration-500
                            ${activeZone === i + 1 
                                ? 'border-white/60 shadow-[0_0_30px_currentColor] opacity-100' 
                                : 'border-slate-600/30 opacity-40'}
                        `}
                        style={{ 
                            width: zone.radius * 2, 
                            height: zone.radius * 2,
                            color: zone.color
                        }}
                    >
                        {/* Orbit Label/Icon placed at top */}
                        <div className="absolute -top-3 bg-[#0f172a] px-2 flex items-center gap-2">
                            <zone.icon size={12} className={activeZone === i + 1 ? "animate-pulse" : ""} />
                            <span className="text-[9px] font-mono font-bold tracking-widest">{zone.label}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* --- THE CORE (INTERACTIVE) --- */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto" ref={coreRef}>
                <motion.div
                    drag
                    dragConstraints={coreRef}
                    dragElastic={0.1}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    animate={controls}
                    whileHover={{ scale: 1.05, cursor: 'grab' }}
                    whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
                    className="relative z-50 w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center text-center p-4 shadow-[0_0_50px_rgba(139,92,246,0.4)] group"
                >
                    {/* Core Gradient Sphere */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 animate-pulse-slow" />
                    <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-sm border border-white/20" />
                    
                    {/* Content Preview */}
                    <div className="relative z-10 text-white select-none pointer-events-none">
                        <BrainCircuit size={24} className="mx-auto mb-2 opacity-80" />
                        <div className="text-[10px] md:text-xs font-serif leading-tight line-clamp-3 opacity-90">
                            {note.content}
                        </div>
                    </div>

                    {/* Drag Hint */}
                    <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono text-cyan-300 uppercase tracking-widest whitespace-nowrap">
                        Drag to Orbit
                    </div>
                </motion.div>
                
                {/* Connecting Line (Visual Aid when dragging) */}
                {activeZone > 0 && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                        <line 
                            x1="50%" y1="50%" 
                            x2="50%" y2="50%" // In a real implementation we'd track mouse pos relative to center
                            stroke={ZONES[activeZone].color} 
                            strokeWidth="2" 
                            strokeDasharray="4 4"
                        />
                    </svg>
                )}
            </div>

            {/* --- MENTOR SECTOR (LEFT HUB) --- */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto">
                <div className="text-[9px] font-mono text-slate-500 -rotate-90 origin-center absolute -left-8 top-1/2 w-32 text-center uppercase tracking-[0.2em]">
                    Облако Смыслов
                </div>
                {config.mentors.filter(m => !m.isDisabled).slice(0, 4).map((mentor, i) => (
                    <motion.button
                        key={mentor.id}
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                        onClick={() => handleMentorConsult(mentor)}
                        className={`w-12 h-12 rounded-full border border-slate-700 bg-slate-900/50 flex items-center justify-center transition-all hover:scale-110 hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] group relative ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        <div className={`text-slate-400 group-hover:text-indigo-400`}>
                            <RenderIcon name={mentor.icon} className="w-5 h-5" />
                        </div>
                        {/* Tooltip */}
                        <div className="absolute left-full ml-3 px-2 py-1 bg-black border border-slate-800 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                            {mentor.name}
                        </div>
                    </motion.button>
                ))}
            </div>

            {/* --- MENTOR RESPONSE PREVIEW --- */}
            <AnimatePresence>
                {mentorResponse && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute top-8 right-8 max-w-xs bg-black/60 border border-indigo-500/30 backdrop-blur-xl p-4 rounded-xl pointer-events-auto"
                    >
                        <div className="flex items-center gap-2 mb-2 text-indigo-400">
                            <Zap size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Вызов сгенерирован</span>
                        </div>
                        <p className="text-xs text-slate-300 font-serif italic leading-relaxed">
                            {mentorResponse}
                        </p>
                        <button 
                            onClick={() => setMentorResponse(null)}
                            className="absolute top-2 right-2 text-slate-500 hover:text-white"
                        >
                            <X size={12} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- SYSTEM CONTROL DECK (BOTTOM) --- */}
            <div className="absolute bottom-8 w-full max-w-2xl px-8 pointer-events-auto">
                <div className="bg-black/40 backdrop-blur-md border border-slate-800/50 rounded-lg p-3 font-mono text-[10px] text-emerald-500/80 shadow-inner flex flex-col-reverse h-24 overflow-hidden">
                    {logs.map((log, i) => (
                        <div key={i} className="truncate">{log}</div>
                    ))}
                </div>
            </div>

            {/* --- CLOSE BUTTON --- */}
            <button 
                onClick={onClose}
                className="absolute top-8 right-8 p-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors pointer-events-auto border border-white/5"
            >
                <X size={24} strokeWidth={1} />
            </button>

        </motion.div>
    </div>
  );
};

export default JourneyLens;
