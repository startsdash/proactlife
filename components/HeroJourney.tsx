
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, Task, Habit, JournalEntry, Module } from '../types';
import { classifyNoteAction } from '../services/geminiService';
import { AppConfig } from '../types';
import { Rocket, Kanban as KanbanIcon, Flame, Book, Box, ArrowRight, BrainCircuit, Check, X, Sparkles, User, Orbit, Fingerprint } from 'lucide-react';

interface Props {
    note: Note;
    config: AppConfig;
    onClose: () => void;
    onCommit: (action: 'task' | 'habit' | 'journal' | 'sandbox', payload?: any) => void;
}

const STAGES = [
    { id: 1, label: 'Обыденный мир', desc: 'Исходная мысль' },
    { id: 2, label: 'Призыв', desc: 'Анализ потенциала' },
    { id: 3, label: 'Выбор пути', desc: 'Принятие решения' },
    { id: 4, label: 'Трансформация', desc: 'Интеграция в систему' }
];

const HeroJourney: React.FC<Props> = ({ note, config, onClose, onCommit }) => {
    const [stage, setStage] = useState(1);
    const [aiSuggestion, setAiSuggestion] = useState<{ action: string, reason: string } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [bioSync, setBioSync] = useState(0);

    // Initial Animation Sequence
    useEffect(() => {
        // Stage 1 -> 2
        setTimeout(() => setStage(2), 1500);
        
        // Stage 2: Bio Sync & AI Analysis
        setTimeout(() => {
            const interval = setInterval(() => {
                setBioSync(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        return 100;
                    }
                    return prev + Math.floor(Math.random() * 10) + 5;
                });
            }, 100);
            
            setIsAnalyzing(true);
            classifyNoteAction(note.content, config).then(result => {
                setAiSuggestion(result);
                setIsAnalyzing(false);
                setStage(3); // Move to Selection
            });
        }, 2000);
    }, []);

    const handlePathSelect = (path: string) => {
        setSelectedPath(path);
        setStage(4); // Transformation
        
        // Commit after animation
        setTimeout(() => {
            onCommit(path as any);
        }, 2500);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Cosmic Background */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#020410] overflow-hidden"
            >
                {/* Stars */}
                {[...Array(50)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute bg-white rounded-full opacity-60"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            width: `${Math.random() * 2 + 1}px`,
                            height: `${Math.random() * 2 + 1}px`,
                            animation: `twinkle ${Math.random() * 5 + 2}s infinite`
                        }}
                    />
                ))}
                {/* Nebula */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[80px]" />
            </motion.div>

            {/* Main Content Container */}
            <motion.div 
                layout
                className="relative z-10 w-full max-w-4xl h-[80vh] flex flex-col items-center justify-center"
            >
                
                {/* HEADER: Timeline */}
                <div className="absolute top-0 w-full flex justify-between px-8 py-6">
                    {STAGES.map((s, i) => (
                        <div key={s.id} className="flex flex-col items-center gap-2 relative">
                            <div className={`
                                w-3 h-3 rounded-full border-2 transition-all duration-500 z-10
                                ${stage >= s.id ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_10px_#6366f1]' : 'bg-transparent border-slate-700'}
                                ${stage === s.id ? 'scale-125' : ''}
                            `} />
                            {i < STAGES.length - 1 && (
                                <div className={`absolute top-1.5 left-1/2 w-[calc(100%_+_2rem)] h-0.5 -z-0 transition-colors duration-700 ${stage > s.id ? 'bg-indigo-500/50' : 'bg-slate-800'}`} />
                            )}
                            <span className={`text-[9px] uppercase tracking-widest font-mono transition-colors duration-300 ${stage >= s.id ? 'text-indigo-300' : 'text-slate-600'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* STAGE 1: INTRO (Living Note) */}
                <AnimatePresence>
                    {stage === 1 && (
                        <motion.div 
                            key="stage1"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            className="text-center max-w-lg"
                        >
                            <div className="mb-8 relative">
                                <motion.div 
                                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full"
                                />
                                <Rocket size={64} className="text-white relative z-10 mx-auto" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-light text-white mb-4 tracking-tight">Мысль обретает форму</h2>
                            <p className="text-indigo-200/60 font-serif italic text-lg">"{note.content.substring(0, 100)}..."</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* STAGE 2: ANALYSIS (Biometrics) */}
                <AnimatePresence>
                    {stage === 2 && (
                        <motion.div 
                            key="stage2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-8 text-center"
                        >
                            <div className="flex justify-center mb-6">
                                <div className="relative w-24 h-24 flex items-center justify-center">
                                    <svg className="w-full h-full absolute inset-0 animate-spin-slow">
                                        <circle cx="48" cy="48" r="46" stroke="#312e81" strokeWidth="1" fill="none" strokeDasharray="10 10" />
                                    </svg>
                                    <Fingerprint size={40} className="text-indigo-400 animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-mono text-indigo-300 mb-1">
                                        <span>BIO_SYNC_STATUS</span>
                                        <span>{bioSync}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-indigo-900/50 rounded-full overflow-hidden">
                                        <motion.div 
                                            className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${bioSync}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 font-mono animate-pulse">
                                    > ANALYZING_CONTEXT... <br/>
                                    > CALCULATING_TRAJECTORY...
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* STAGE 3: SELECTION (The Crossroad) */}
                <AnimatePresence>
                    {stage === 3 && (
                        <motion.div 
                            key="stage3"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4"
                        >
                            {/* AI Suggestion Banner */}
                            <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-center mb-8">
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full flex items-center gap-3">
                                    <Sparkles size={16} className="text-yellow-400" />
                                    <span className="text-sm text-white font-medium">
                                        AI рекомендует: <span className="text-indigo-300 font-bold uppercase">{aiSuggestion?.action || '...'}</span> — {aiSuggestion?.reason}
                                    </span>
                                </div>
                            </div>

                            {/* Option 1: Task */}
                            <button 
                                onClick={() => handlePathSelect('task')}
                                className={`group relative p-6 rounded-2xl bg-gradient-to-br from-blue-900/40 to-slate-900/40 border transition-all duration-300 hover:scale-105 ${aiSuggestion?.action === 'task' ? 'border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.3)]' : 'border-white/10 hover:border-blue-400/50'}`}
                            >
                                <div className="mb-4 p-3 bg-blue-500/20 rounded-xl w-fit group-hover:bg-blue-500 transition-colors">
                                    <KanbanIcon size={24} className="text-blue-300 group-hover:text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Действие</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">Превратить в конкретную задачу для Спринта.</p>
                            </button>

                            {/* Option 2: Habit */}
                            <button 
                                onClick={() => handlePathSelect('habit')}
                                className={`group relative p-6 rounded-2xl bg-gradient-to-br from-emerald-900/40 to-slate-900/40 border transition-all duration-300 hover:scale-105 ${aiSuggestion?.action === 'habit' ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'border-white/10 hover:border-emerald-400/50'}`}
                            >
                                <div className="mb-4 p-3 bg-emerald-500/20 rounded-xl w-fit group-hover:bg-emerald-500 transition-colors">
                                    <Flame size={24} className="text-emerald-300 group-hover:text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Ритуал</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">Внедрить как регулярную привычку в Трекер.</p>
                            </button>

                            {/* Option 3: Journal */}
                            <button 
                                onClick={() => handlePathSelect('journal')}
                                className={`group relative p-6 rounded-2xl bg-gradient-to-br from-cyan-900/40 to-slate-900/40 border transition-all duration-300 hover:scale-105 ${aiSuggestion?.action === 'journal' ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'border-white/10 hover:border-cyan-400/50'}`}
                            >
                                <div className="mb-4 p-3 bg-cyan-500/20 rounded-xl w-fit group-hover:bg-cyan-500 transition-colors">
                                    <Book size={24} className="text-cyan-300 group-hover:text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Рефлексия</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">Сохранить в Дневник для анализа и инсайтов.</p>
                            </button>

                            {/* Option 4: Sandbox */}
                            <button 
                                onClick={() => handlePathSelect('sandbox')}
                                className={`group relative p-6 rounded-2xl bg-gradient-to-br from-amber-900/40 to-slate-900/40 border transition-all duration-300 hover:scale-105 ${aiSuggestion?.action === 'sandbox' ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]' : 'border-white/10 hover:border-amber-400/50'}`}
                            >
                                <div className="mb-4 p-3 bg-amber-500/20 rounded-xl w-fit group-hover:bg-amber-500 transition-colors">
                                    <Box size={24} className="text-amber-300 group-hover:text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Проработка</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">Отправить в Хаб для работы с Ментором.</p>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* STAGE 4: TRANSFORMATION (Warp Speed) */}
                <AnimatePresence>
                    {stage === 4 && (
                        <motion.div 
                            key="stage4"
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            {/* Implosion/Explosion Effect */}
                            <motion.div 
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [0, 1.5, 30], opacity: [0, 1, 0] }}
                                transition={{ duration: 1.5, times: [0, 0.5, 1], ease: "easeInOut" }}
                                className="w-32 h-32 bg-white rounded-full blur-xl"
                            />
                            
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="z-20 text-center"
                            >
                                <h1 className="text-4xl md:text-6xl font-light text-white tracking-widest uppercase mb-4">
                                    Синтез завершен
                                </h1>
                                <p className="text-indigo-300 font-mono text-sm">
                                    МЫСЛЬ ИНТЕГРИРОВАНА В ЛИЧНОСТЬ
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>

            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
                <X size={24} />
            </button>
        </div>
    );
};

export default HeroJourney;
