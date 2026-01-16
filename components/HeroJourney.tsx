
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, Task, Habit } from '../types';
import { analyzeJourneyPath, JourneyRecommendation } from '../services/geminiService';
import { AppConfig } from '../types';
import { Map as MapIcon, Kanban, Flame, Box, X, Zap, Sparkles, Activity, CircleDashed } from 'lucide-react';

interface Props {
  note: Note;
  config: AppConfig;
  onClose: () => void;
  onCreateTask: (task: Task) => void;
  onCreateHabit: (habit: Habit) => void;
  onMoveToHub: (noteId: string) => void;
  onUpdateNote: (note: Note) => void;
}

const STAGES = [
    { id: 1, label: "Обыденный мир", desc: "Мысль записана" },
    { id: 2, label: "Зов", desc: "Инициация пути" },
    { id: 3, label: "Порог", desc: "Выбор воплощения" },
    { id: 4, label: "Трансформация", desc: "Интеграция" }
];

const HeroJourney: React.FC<Props> = ({ note, config, onClose, onCreateTask, onCreateHabit, onMoveToHub }) => {
  const [currentStage, setCurrentStage] = useState(1);
  const [recommendation, setRecommendation] = useState<JourneyRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [syncProgress, setSyncProgress] = useState(0);
  const [selectedPath, setSelectedPath] = useState<'task' | 'habit' | 'hub' | null>(null);

  // Initial Animation Sequence
  useEffect(() => {
    // 1. Animate Sync
    const interval = setInterval(() => {
        setSyncProgress(prev => {
            if (prev >= 100) {
                clearInterval(interval);
                return 100;
            }
            return prev + Math.random() * 5;
        });
    }, 100);

    // 2. Move to Call stage
    setTimeout(() => setCurrentStage(2), 500);

    // 3. AI Analysis
    const runAnalysis = async () => {
        try {
            const result = await analyzeJourneyPath(note.content, config);
            setRecommendation(result);
            setTimeout(() => {
                setCurrentStage(3);
                setIsAnalyzing(false);
            }, 1000);
        } catch (e) {
            console.error("Hero Journey Analysis Failed", e);
            // Fallback
            setRecommendation({ bestPath: 'hub', reason: 'System offline', suggestedTitle: note.title });
            setIsAnalyzing(false);
            setCurrentStage(3);
        }
    };
    runAnalysis();

    return () => clearInterval(interval);
  }, []);

  const handleSelectPath = (path: 'task' | 'habit' | 'hub') => {
      setSelectedPath(path);
      // Trigger Transformation
      setCurrentStage(4);

      setTimeout(() => {
          executeTransformation(path);
      }, 2000); // Wait for animation
  };

  const executeTransformation = (path: 'task' | 'habit' | 'hub') => {
      const title = recommendation?.suggestedTitle || note.title || "Новая трансформация";
      
      if (path === 'task') {
          const newTask: Task = {
              id: Date.now().toString(),
              title: title,
              content: note.content,
              description: "Создано из заметки (Путь Героя)",
              column: 'todo',
              createdAt: Date.now(),
              spheres: note.tags?.filter(t => ['productivity', 'growth', 'relationships'].includes(t.replace('#','')))
          };
          onCreateTask(newTask);
      } else if (path === 'habit') {
          const newHabit: Habit = {
              id: Date.now().toString(),
              title: title,
              description: note.content.substring(0, 100) + "...",
              createdAt: Date.now(),
              history: {},
              streak: 0,
              bestStreak: 0,
              frequency: 'daily',
              reminders: [],
              color: 'emerald',
              icon: 'Zap'
          };
          onCreateHabit(newHabit);
      } else if (path === 'hub') {
          onMoveToHub(note.id);
      }

      setTimeout(() => {
          onClose();
      }, 500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#020617]/90 backdrop-blur-xl"
            onClick={onClose}
        >
            <div className="absolute inset-0 overflow-hidden opacity-30 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-indigo-400 rounded-full animate-ping" style={{ animationDuration: '5s' }} />
                <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            </div>
        </motion.div>

        {/* Main Panel */}
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-5xl aspect-square md:aspect-[16/9] bg-slate-900/50 rounded-[40px] border border-white/10 shadow-[0_0_100px_rgba(99,102,241,0.15)] overflow-hidden flex flex-col md:flex-row"
            onClick={e => e.stopPropagation()}
        >
            {/* LEFT: THE MAP */}
            <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 p-8 flex flex-col relative bg-gradient-to-b from-slate-900/50 to-indigo-950/20">
                <div className="flex items-center gap-3 mb-10">
                    <MapIcon size={20} className="text-cyan-400" />
                    <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-white/80">Карта Пути</h2>
                </div>

                {/* Timeline */}
                <div className="flex-1 relative pl-4">
                    <div className="absolute left-[19px] top-2 bottom-10 w-0.5 bg-white/10" />
                    
                    {STAGES.map((stage) => {
                        const isActive = currentStage === stage.id;
                        const isPast = currentStage > stage.id;
                        
                        return (
                            <div key={stage.id} className="relative flex items-start gap-6 mb-12 last:mb-0 group">
                                {/* Node */}
                                <motion.div 
                                    className={`
                                        w-10 h-10 rounded-full border-2 flex items-center justify-center relative z-10 shrink-0
                                        ${isActive 
                                            ? 'border-cyan-400 bg-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.5)]' 
                                            : isPast 
                                                ? 'border-indigo-500 bg-indigo-500 text-white' 
                                                : 'border-white/10 bg-slate-900 text-white/20'
                                        }
                                    `}
                                    animate={{ scale: isActive ? 1.1 : 1 }}
                                >
                                    {isPast ? (
                                        <div className="w-3 h-3 bg-white rounded-full" />
                                    ) : (
                                        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-white/20'}`} />
                                    )}
                                </motion.div>

                                {/* Info */}
                                <div className={`pt-2 transition-opacity duration-500 ${isActive || isPast ? 'opacity-100' : 'opacity-30'}`}>
                                    <div className="text-[10px] font-mono uppercase tracking-widest text-white/60 mb-1">Этап 0{stage.id}</div>
                                    <div className="text-lg font-serif text-white">{stage.label}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Biometrics Footer */}
                <div className="mt-auto pt-6 border-t border-white/5">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[9px] font-mono uppercase text-cyan-400/60">Neural Sync</span>
                        <span className="text-lg font-mono text-cyan-400">{Math.round(syncProgress)}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-cyan-400 shadow-[0_0_10px_cyan]" 
                            initial={{ width: 0 }}
                            animate={{ width: `${syncProgress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* RIGHT: THE STAGE */}
            <div className="flex-1 relative flex flex-col">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-white/30 hover:text-white transition-colors z-20">
                    <X size={24} />
                </button>

                {/* Background Grid */}
                <div 
                    className="absolute inset-0 opacity-10 pointer-events-none" 
                    style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
                />

                <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 relative z-10">
                    
                    <AnimatePresence mode="wait">
                        
                        {/* STAGE 1 & 2: INTRO & CALL */}
                        {currentStage <= 2 && (
                            <motion.div
                                key="intro"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
                                className="flex flex-col items-center text-center"
                            >
                                {/* The Orb */}
                                <div className="relative mb-12">
                                    <motion.div 
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-[-20px] border border-cyan-500/30 rounded-full border-dashed"
                                    />
                                    <motion.div 
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                        className="w-32 h-32 rounded-full bg-cyan-500/20 blur-2xl absolute inset-0"
                                    />
                                    <div className="w-32 h-32 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center relative shadow-[0_0_50px_rgba(34,211,238,0.2)]">
                                        <Sparkles size={48} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                                    </div>
                                </div>

                                <h2 className="text-3xl md:text-4xl font-light text-white mb-6 tracking-tight">
                                    Мысль пробуждается...
                                </h2>
                                <p className="text-slate-400 max-w-md font-serif italic text-lg leading-relaxed">
                                    "{note.content.substring(0, 100)}{note.content.length > 100 ? '...' : ''}"
                                </p>
                            </motion.div>
                        )}

                        {/* STAGE 3: CHOICE (THRESHOLD) */}
                        {currentStage === 3 && (
                            <motion.div
                                key="choice"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="w-full max-w-3xl"
                            >
                                <div className="text-center mb-12">
                                    <h2 className="text-3xl font-light text-white mb-2">Выбор Пути</h2>
                                    <div className="flex items-center justify-center gap-2 text-sm text-cyan-400 font-mono uppercase tracking-widest">
                                        <Zap size={14} /> AI Recommendation: {recommendation?.bestPath.toUpperCase()}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Option 1: Task */}
                                    <button 
                                        onClick={() => handleSelectPath('task')}
                                        className={`group relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-6 text-center ${recommendation?.bestPath === 'task' ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                    >
                                        <div className="p-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                                            <Kanban size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">Спринт</h3>
                                            <p className="text-xs text-slate-400">Превратить в конкретное действие</p>
                                        </div>
                                        {recommendation?.bestPath === 'task' && (
                                            <div className="absolute top-3 right-3 text-indigo-400 animate-pulse"><CircleDashed size={16} /></div>
                                        )}
                                    </button>

                                    {/* Option 2: Habit */}
                                    <button 
                                        onClick={() => handleSelectPath('habit')}
                                        className={`group relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-6 text-center ${recommendation?.bestPath === 'habit' ? 'bg-emerald-500/20 border-emerald-400/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                    >
                                        <div className="p-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                                            <Flame size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">Ритуал</h3>
                                            <p className="text-xs text-slate-400">Внедрить как регулярную практику</p>
                                        </div>
                                        {recommendation?.bestPath === 'habit' && (
                                            <div className="absolute top-3 right-3 text-emerald-400 animate-pulse"><CircleDashed size={16} /></div>
                                        )}
                                    </button>

                                    {/* Option 3: Hub */}
                                    <button 
                                        onClick={() => handleSelectPath('hub')}
                                        className={`group relative p-6 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-6 text-center ${recommendation?.bestPath === 'hub' ? 'bg-amber-500/20 border-amber-400/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                                    >
                                        <div className="p-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg group-hover:scale-110 transition-transform">
                                            <Box size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">Хаб</h3>
                                            <p className="text-xs text-slate-400">Исследовать с Ментором</p>
                                        </div>
                                        {recommendation?.bestPath === 'hub' && (
                                            <div className="absolute top-3 right-3 text-amber-400 animate-pulse"><CircleDashed size={16} /></div>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* STAGE 4: TRANSFORMATION */}
                        {currentStage === 4 && (
                            <motion.div
                                key="transform"
                                className="flex flex-col items-center justify-center text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0.1, opacity: 0 }}
                                    animate={{ scale: [0.1, 1.5, 30], opacity: [0, 1, 0] }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                    className={`w-20 h-20 rounded-full bg-white blur-xl absolute`}
                                />
                                
                                <div className="relative z-10">
                                    <Activity size={64} className="text-white mb-8 animate-bounce" />
                                    <h2 className="text-4xl font-bold text-white tracking-tight uppercase">Интеграция...</h2>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>

                </div>
            </div>
        </motion.div>
    </div>
  );
};

export default HeroJourney;
