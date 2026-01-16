
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note } from '../types';
import { classifyNoteAction } from '../services/geminiService';
import { AppConfig } from '../types';
import { Rocket, Kanban as KanbanIcon, Flame, Book, Box, ArrowRight, BrainCircuit, Check, X, Sparkles, User, Orbit, Fingerprint, Activity, Zap, Layers, Target, Shield, Heart } from 'lucide-react';

interface Props {
    note: Note;
    config: AppConfig;
    onClose: () => void;
    onCommit: (action: 'task' | 'habit' | 'journal' | 'sandbox', payload?: any) => void;
}

// STAGES ENUM FOR CLEAR STATE MANAGEMENT
enum Stage {
    OPENING = 1,
    MAP = 2,
    SELECTION = 3,
    FUSION = 4
}

// PATH OPTIONS
const PATHS = [
    { id: 'task', label: 'Действие', icon: KanbanIcon, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/50', desc: '+20 XP / Спринт' },
    { id: 'habit', label: 'Ритуал', icon: Flame, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', desc: '+30 XP / Трекер' },
    { id: 'journal', label: 'Рефлексия', icon: Book, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/50', desc: '+15 XP / Дневник' },
    { id: 'sandbox', label: 'Проработка', icon: Box, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/50', desc: '+25 XP / Хаб' },
];

const HeroJourney: React.FC<Props> = ({ note, config, onClose, onCommit }) => {
    const [stage, setStage] = useState<Stage>(Stage.OPENING);
    const [aiSuggestion, setAiSuggestion] = useState<{ action: string, reason: string } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [xp, setXp] = useState(0);
    const [bioSync, setBioSync] = useState(0);
    const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

    // Initial sequence
    useEffect(() => {
        // Transition to Map after initial "Morph"
        setTimeout(() => setStage(Stage.MAP), 2000);

        // Start Bio-Sync simulation
        const bioInterval = setInterval(() => {
            setBioSync(prev => {
                if (prev >= 100) {
                    clearInterval(bioInterval);
                    return 100;
                }
                return prev + 2;
            });
        }, 50);

        // Run AI Analysis in background
        setIsAnalyzing(true);
        classifyNoteAction(note.content, config).then(result => {
            setAiSuggestion(result);
            setIsAnalyzing(false);
            // Auto-advance to selection once analysis is ready if in Map stage
            // We'll let the user watch the map for a bit first though (min 3s total)
            setTimeout(() => {
                setStage(prev => prev === Stage.MAP ? Stage.SELECTION : prev);
            }, 3500); 
        });

        return () => clearInterval(bioInterval);
    }, []);

    const handlePathSelect = (pathId: string) => {
        setSelectedPathId(pathId);
        
        // Award XP
        const path = PATHS.find(p => p.id === pathId);
        const reward = path ? parseInt(path.desc.match(/\+(\d+)/)?.[1] || '0') : 0;
        
        // Animate XP
        let currentXp = xp;
        const targetXp = xp + reward;
        const xpInterval = setInterval(() => {
            currentXp += 1;
            setXp(currentXp);
            if (currentXp >= targetXp) clearInterval(xpInterval);
        }, 50);

        // Transition to Fusion
        setTimeout(() => setStage(Stage.FUSION), 800);

        // Commit and Close
        setTimeout(() => {
            onCommit(pathId as any);
        }, 3500); // Allow fusion animation to play
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 font-sans text-white overflow-hidden">
            
            {/* 1. COSMIC BACKGROUND LAYER */}
            <div className="absolute inset-0 bg-[#020410]">
                {/* Radial Haze */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0B1121]/50 to-[#020410]" />
                
                {/* Stars/Dust Particles */}
                {[...Array(60)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute bg-white rounded-full opacity-60"
                        initial={{ 
                            top: `${Math.random() * 100}%`, 
                            left: `${Math.random() * 100}%`,
                            scale: Math.random() 
                        }}
                        animate={{ 
                            opacity: [0.2, 0.8, 0.2], 
                            scale: [0.5, 1.2, 0.5] 
                        }}
                        transition={{ 
                            duration: Math.random() * 3 + 2, 
                            repeat: Infinity, 
                            delay: Math.random() * 2 
                        }}
                        style={{ width: '2px', height: '2px' }}
                    />
                ))}
                
                {/* Nebula Clouds */}
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay" 
                />
            </div>

            {/* 2. HUD INTERFACE (Always Visible) */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-50 pointer-events-none">
                {/* Bio-Monitor (Left) */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-cyan-400">
                        <Activity size={16} className="animate-pulse" />
                        <span className="text-[10px] font-mono font-bold tracking-widest">BIO_SYNC</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="h-1 w-24 bg-cyan-900/30 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                                animate={{ width: `${bioSync}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-mono text-cyan-200/50">{bioSync}%</span>
                    </div>
                </div>

                {/* XP Counter (Right) */}
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 text-amber-400">
                        <span className="text-[10px] font-mono font-bold tracking-widest">XP_EARNED</span>
                        <Shield size={16} />
                    </div>
                    <div className="text-2xl font-bold font-mono text-amber-100 tabular-nums shadow-amber-500/20 drop-shadow-lg">
                        {xp.toString().padStart(4, '0')}
                    </div>
                </div>
            </div>

            {/* 3. MAIN STAGE CONTENT */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                    
                    {/* STAGE 1: MORPHING (Opening) */}
                    {stage === Stage.OPENING && (
                        <motion.div
                            key="opening"
                            className="relative flex flex-col items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
                            transition={{ duration: 0.8 }}
                        >
                            {/* The Orb */}
                            <motion.div
                                layoutId="hero-orb"
                                className="w-32 h-32 rounded-full bg-white flex items-center justify-center relative z-20"
                                style={{
                                    background: 'radial-gradient(circle at 30% 30%, #ffffff, #6366f1, #1e1b4b)',
                                    boxShadow: '0 0 60px rgba(99,102,241,0.6), inset 0 0 20px rgba(255,255,255,0.5)'
                                }}
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 3, repeat: Infinity }}
                            >
                                <Rocket size={40} className="text-white drop-shadow-md" />
                            </motion.div>
                            
                            <motion.h2 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="mt-8 text-2xl font-light tracking-widest text-indigo-100 uppercase"
                            >
                                Инициализация
                            </motion.h2>
                        </motion.div>
                    )}

                    {/* STAGE 2: TRAJECTORY MAP */}
                    {stage === Stage.MAP && (
                        <motion.div
                            key="map"
                            className="w-full max-w-4xl relative h-[60vh] flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Central Sun (User) */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/5 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center z-10 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                                <User size={32} className="text-white/80" />
                            </div>

                            {/* Orbit Rings */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-[300px] h-[300px] border border-white/5 rounded-full animate-[spin_20s_linear_infinite]" />
                                <div className="w-[500px] h-[500px] border border-white/5 rounded-full animate-[spin_30s_linear_infinite_reverse]" />
                            </div>

                            {/* The Traveling Orb */}
                            <motion.div
                                layoutId="hero-orb"
                                className="absolute w-8 h-8 rounded-full bg-white shadow-[0_0_20px_#6366f1] z-20 flex items-center justify-center"
                                animate={{ 
                                    offsetDistance: "100%",
                                    scale: [1, 1.5, 1],
                                }}
                                style={{
                                    offsetPath: "path('M -250 0 Q -150 -150 0 -200 T 250 0')", // Bezier curve attempt in CSS logic or framer
                                    top: '50%', left: '50%', // Fallback centering
                                }}
                            >
                                <div className="w-full h-full bg-indigo-500 rounded-full blur-sm absolute inset-0" />
                                <div className="w-2 h-2 bg-white rounded-full relative z-10" />
                            </motion.div>

                            {/* System Log */}
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center space-y-2">
                                <div className="text-xs font-mono text-indigo-300 animate-pulse">
                                    &gt; SCANNING_SEMANTICS... {isAnalyzing ? 'ACTIVE' : 'DONE'}
                                </div>
                                <div className="text-xs font-mono text-cyan-300 animate-pulse delay-75">
                                    &gt; CALCULATING_TRAJECTORY...
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STAGE 3: SELECTION (Cards) */}
                    {stage === Stage.SELECTION && (
                        <motion.div
                            key="selection"
                            className="w-full max-w-5xl px-4 flex flex-col items-center"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                        >
                            {/* AI Banner */}
                            <div className="mb-12 bg-white/10 backdrop-blur-xl border border-white/20 px-8 py-4 rounded-full flex items-center gap-4 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                <Sparkles size={20} className="text-amber-400" />
                                <div className="text-sm">
                                    <span className="text-white/60 mr-2">СИСТЕМА РЕКОМЕНДУЕТ:</span>
                                    <span className="font-bold text-white uppercase tracking-wider text-lg">{aiSuggestion?.action === 'task' ? 'ДЕЙСТВИЕ' : aiSuggestion?.action === 'habit' ? 'РИТУАЛ' : aiSuggestion?.action === 'journal' ? 'РЕФЛЕКСия' : 'ПРОРАБОТКА'}</span>
                                    <span className="mx-3 text-white/30">|</span>
                                    <span className="text-indigo-200 italic">{aiSuggestion?.reason}</span>
                                </div>
                            </div>

                            {/* Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                                {PATHS.map(path => {
                                    const isRecommended = aiSuggestion?.action === path.id;
                                    
                                    return (
                                        <motion.button
                                            key={path.id}
                                            onClick={() => handlePathSelect(path.id)}
                                            whileHover={{ y: -10, scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`
                                                relative h-64 rounded-3xl border backdrop-blur-md overflow-hidden group transition-all duration-500
                                                flex flex-col items-center justify-center gap-4 p-6
                                                ${isRecommended ? `bg-white/10 ${path.border} shadow-[0_0_30px_rgba(99,102,241,0.2)]` : 'bg-white/5 border-white/10 hover:border-white/30'}
                                            `}
                                        >
                                            {/* Glow blob */}
                                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 ${path.bg} blur-[60px] rounded-full group-hover:blur-[80px] transition-all`} />
                                            
                                            <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm relative z-10 group-hover:bg-white/10 transition-colors`}>
                                                <path.icon size={32} className={`${path.color} drop-shadow-md`} />
                                            </div>
                                            
                                            <div className="relative z-10 text-center">
                                                <h3 className="text-xl font-bold text-white tracking-tight mb-1">{path.label}</h3>
                                                <div className="text-[10px] font-mono text-white/50 uppercase tracking-widest">{path.desc}</div>
                                            </div>

                                            {/* Connection Line (Visual) */}
                                            {selectedPathId === path.id && (
                                                <motion.div 
                                                    layoutId="hero-orb"
                                                    className="absolute inset-0 z-50 bg-white mix-blend-overlay"
                                                />
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* STAGE 4: FUSION (Closing) */}
                    {stage === Stage.FUSION && (
                        <motion.div
                            key="fusion"
                            className="absolute inset-0 flex items-center justify-center z-50"
                        >
                            {/* Implosion */}
                            <motion.div
                                initial={{ scale: 20, opacity: 0 }}
                                animate={{ scale: 0, opacity: 1 }}
                                transition={{ duration: 0.5, ease: "circIn" }}
                                className="absolute inset-0 bg-white z-10"
                            />
                            
                            {/* Explosion/Reveal */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6, duration: 0.8 }}
                                className="relative z-20 text-center"
                            >
                                <div className="mb-8 relative inline-block">
                                    <div className="absolute inset-0 bg-indigo-500 blur-[60px] opacity-50" />
                                    <Fingerprint size={120} className="text-white relative z-10" strokeWidth={0.5} />
                                </div>
                                <h2 className="text-5xl md:text-7xl font-light text-white uppercase tracking-widest mb-4 mix-blend-overlay">Синтез</h2>
                                <p className="text-indigo-200 font-mono text-sm tracking-[0.5em] uppercase">Мысль стала частью тебя</p>
                            </motion.div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* CLOSE BUTTON */}
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 z-[60] p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 text-white/50 hover:text-white transition-all backdrop-blur-md"
            >
                <X size={24} strokeWidth={1} />
            </button>

        </div>
    );
};

export default HeroJourney;
