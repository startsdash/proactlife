
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JourneySession } from '../types';
import { 
    Cpu, 
    X, 
    Zap, 
    Activity, 
    Database, 
    ScanFace, 
    ArrowRight, 
    Crosshair, 
    Hexagon,
    Terminal,
    Fingerprint
} from 'lucide-react';

interface Props {
    session: JourneySession;
    onClose: () => void;
    onComplete: (actionType: 'task' | 'habit' | 'journal', payload: any) => void;
}

// --- VISUAL CONSTANTS ---
const COLORS = {
    background: '#050505',
    primary: '#fcee0a', // Cyber Yellow
    accent: '#00f0ff',  // Cyber Cyan
    danger: '#ff003c',  // Cyber Red
    core: '#ffffff',
    dim: 'rgba(255, 255, 255, 0.1)'
};

// --- HELPER COMPONENTS ---

const GlitchText = ({ text, active = false }: { text: string, active?: boolean }) => (
    <div className="relative inline-block group">
        <span className="relative z-10">{text}</span>
        {active && (
            <>
                <span className="absolute top-0 left-0 -z-10 w-full h-full text-red-500 opacity-70 animate-pulse translate-x-[2px] clip-path-inset-1">{text}</span>
                <span className="absolute top-0 left-0 -z-10 w-full h-full text-cyan-500 opacity-70 animate-pulse -translate-x-[2px] clip-path-inset-2">{text}</span>
            </>
        )}
    </div>
);

const HexButton = ({ onClick, icon: Icon, label, subLabel, color, active, recommended }: any) => {
    return (
        <motion.button
            onClick={onClick}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: active ? 1 : 0.3 }}
            whileHover={{ scale: 1.05, opacity: 1 }}
            className={`
                relative w-32 h-32 md:w-40 md:h-40 flex flex-col items-center justify-center
                group transition-all duration-500
            `}
        >
            {/* Hexagon Background */}
            <div className={`
                absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity
                ${active ? 'opacity-20' : ''}
            `}>
                <svg viewBox="0 0 100 100" className="w-full h-full fill-current" style={{ color }}>
                    <path d="M50 0 L93.3 25 V75 L50 100 L6.7 75 V25 Z" />
                </svg>
            </div>
            
            {/* Border */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full fill-none stroke-current" style={{ color, strokeWidth: active ? 2 : 1 }}>
                <path d="M50 0 L93.3 25 V75 L50 100 L6.7 75 V25 Z" />
            </svg>

            {/* Recommendation Marker */}
            {recommended && (
                <div className="absolute -top-4 text-[10px] font-mono bg-white text-black px-2 py-0.5 font-bold uppercase tracking-wider animate-bounce">
                    Совет системы
                </div>
            )}

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-2 text-center p-2">
                <Icon size={24} style={{ color }} className={active ? "drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" : ""} />
                <div className="font-mono font-bold text-xs uppercase tracking-widest text-white">{label}</div>
                <div className="font-sans text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-8 w-48 bg-black/80 backdrop-blur border border-white/10 p-2 rounded">
                    {subLabel}
                </div>
            </div>
        </motion.button>
    );
};

const ThoughtCore = ({ text, phase }: { text: string, phase: string }) => {
    const isActive = phase === 'choice' || phase === 'execution';
    
    return (
        <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center">
            {/* Core Glow */}
            <motion.div 
                animate={{ 
                    scale: isActive ? [1, 1.1, 1] : [1, 1.05, 1],
                    opacity: isActive ? 0.8 : 0.5
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-white/5 rounded-full blur-3xl"
            />

            {/* Data Rings */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute w-full h-full border border-dashed border-slate-700 rounded-full opacity-30"
            />
            <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute w-[80%] h-[80%] border border-dotted border-slate-600 rounded-full opacity-40"
            />

            {/* The Text Cloud */}
            <div className="relative z-10 text-center p-6 mix-blend-screen max-w-xs">
                {phase === 'materialize' ? (
                    <div className="font-mono text-xs text-green-500 animate-pulse">
                        <GlitchText text="DECRYPTING_SOURCE..." active />
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, filter: "blur(10px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        className="font-serif italic text-lg md:text-xl text-slate-200 leading-relaxed drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                    >
                        "{text.length > 150 ? text.substring(0, 150) + '...' : text}"
                    </motion.div>
                )}
            </div>
        </div>
    );
};

const HeroJourney: React.FC<Props> = ({ session, onClose, onComplete }) => {
    // Phases: boot -> materialize (text forms) -> idle (wait for user) -> choice (nodes appear) -> execution
    const [phase, setPhase] = useState<'boot' | 'materialize' | 'idle' | 'choice' | 'execution'>('boot');
    const [recommendedNode, setRecommendedNode] = useState<string | null>(null);
    const [systemMessage, setSystemMessage] = useState<string>('');

    // Determine recommendation based on simple heuristics
    useEffect(() => {
        const text = session.sourceNote.content;
        if (text.length < 50) setRecommendedNode('action'); // Short -> Action
        else if (text.includes('?')) setRecommendedNode('mirror'); // Question -> Mirror/Sandbox
        else if (text.length > 200) setRecommendedNode('reflection'); // Long -> Journal
        else setRecommendedNode('rhythm'); // Default -> Habit
    }, [session.sourceNote.content]);

    // Sequencing
    useEffect(() => {
        let mounted = true;
        
        const runSequence = async () => {
            if (!mounted) return;
            
            // Boot
            await new Promise(r => setTimeout(r, 1000));
            if (!mounted) return;
            setPhase('materialize');
            
            // Materialize Text
            await new Promise(r => setTimeout(r, 1500));
            if (!mounted) return;
            setPhase('idle');
            setSystemMessage('Мысль зафиксирована. Она может исчезнуть. Или пройти путь.');
        };

        runSequence();
        return () => { mounted = false; };
    }, []);

    const handleContinue = () => {
        setPhase('choice');
        setSystemMessage('Выбери, как ты хочешь работать с этой мыслью.');
    };

    const handleNodeSelect = (type: 'action' | 'rhythm' | 'reflection' | 'mirror') => {
        setPhase('execution');
        
        // Prepare payload based on selection
        let payload: any = {
            title: session.sourceNote.title || 'Новая сущность',
            content: session.sourceNote.content
        };

        if (type === 'action') {
            // Mapping to Kanban
            onComplete('task', {
                title: session.sourceNote.title || 'Новая задача',
                description: session.sourceNote.content,
                content: 'Сформулируйте первый шаг...' 
            });
        } else if (type === 'rhythm') {
            // Mapping to Rituals
            onComplete('habit', {
                title: session.sourceNote.title || 'Новый ритуал',
                description: 'Основано на мысли: ' + session.sourceNote.content.substring(0, 50) + '...'
            });
        } else if (type === 'reflection') {
            // Mapping to Journal
            onComplete('journal', {
                title: session.sourceNote.title || 'Рефлексия',
                content: session.sourceNote.content
            });
        } else if (type === 'mirror') {
            // Mapping to Sandbox (as Task for now, but conceptualized as Sandbox interaction)
            // Ideally this would open Sandbox with context, but for MVP we route to Journal or Task
            // Let's route to Journal with "Insight" flag for Mirror
            onComplete('journal', {
                title: 'Диалог с Зеркалом',
                content: `### Контекст\n${session.sourceNote.content}\n\n### Анализ\n...`,
                isInsight: true
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#050505] text-slate-200 font-sans overflow-hidden flex flex-col perspective-1000">
            {/* --- ENVIRONMENT LAYERS --- */}
            
            {/* 1. Static Noise & Grid */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-20" 
                style={{ 
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', 
                    backgroundSize: '40px 40px' 
                }} 
            />
            <div className="absolute inset-0 pointer-events-none z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
            
            {/* 2. Radial Gradient (Vignette) */}
            <div className="absolute inset-0 pointer-events-none z-10 bg-radial-gradient from-transparent to-[#050505]" />

            {/* --- HUD INTERFACE --- */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-50 pointer-events-none">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#fcee0a]">
                        <Cpu size={14} />
                        <span>SYSTEM_ID: {session.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="h-0.5 w-24 bg-[#fcee0a]/30" />
                </div>
                <button 
                    onClick={onClose} 
                    className="pointer-events-auto text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                >
                    <X size={24} />
                </button>
            </div>

            {/* --- MAIN STAGE --- */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-30">
                
                {/* 1. THOUGHT CORE (CENTER) */}
                <div className="relative z-20 transition-all duration-1000" style={{ transform: phase === 'choice' ? 'scale(0.8)' : 'scale(1)' }}>
                    <ThoughtCore text={session.sourceNote.content} phase={phase} />
                </div>

                {/* 2. SYSTEM MESSAGE */}
                <div className="absolute bottom-32 md:bottom-24 w-full text-center px-4 z-30">
                    <AnimatePresence mode='wait'>
                        {systemMessage && (
                            <motion.div
                                key={systemMessage}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="font-mono text-xs md:text-sm text-cyan-400 uppercase tracking-widest bg-black/50 backdrop-blur-md inline-block px-6 py-3 rounded-full border border-cyan-900/50 shadow-[0_0_20px_rgba(0,240,255,0.1)]"
                            >
                                <span className="animate-pulse mr-2">{">"}</span>
                                {systemMessage}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 3. CONTINUE BUTTON (IDLE PHASE) */}
                <AnimatePresence>
                    {phase === 'idle' && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={handleContinue}
                            className="absolute bottom-12 md:bottom-12 z-40 group"
                        >
                            <div className="relative px-8 py-4 bg-[#fcee0a] text-black font-bold font-mono uppercase tracking-widest hover:bg-white transition-colors clip-path-polygon" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                                <span className="flex items-center gap-2">
                                    ПРОДОЛЖИТЬ <ArrowRight size={16} />
                                </span>
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* 4. RADIAL NODES (CHOICE PHASE) */}
                <AnimatePresence>
                    {phase === 'choice' && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                            {/* ACTION (Top) */}
                            <div className="absolute -translate-y-48 md:-translate-y-64 pointer-events-auto">
                                <HexButton 
                                    label="Действие" 
                                    subLabel="Создать задачу в Спринтах (Kanban)"
                                    icon={Crosshair} 
                                    color="#ff003c" 
                                    active 
                                    recommended={recommendedNode === 'action'}
                                    onClick={() => handleNodeSelect('action')}
                                />
                            </div>

                            {/* RHYTHM (Right) */}
                            <div className="absolute translate-x-36 translate-y-16 md:translate-x-64 md:translate-y-0 pointer-events-auto">
                                <HexButton 
                                    label="Ритм" 
                                    subLabel="Создать привычку (Rituals)"
                                    icon={Activity} 
                                    color="#00f0ff" 
                                    active 
                                    recommended={recommendedNode === 'rhythm'}
                                    onClick={() => handleNodeSelect('rhythm')}
                                />
                            </div>

                            {/* REFLECTION (Bottom) */}
                            <div className="absolute translate-y-48 md:translate-y-64 pointer-events-auto">
                                <HexButton 
                                    label="Осмысление" 
                                    subLabel="Записать в Дневник (Journal)"
                                    icon={Database} 
                                    color="#fcee0a" 
                                    active 
                                    recommended={recommendedNode === 'reflection'}
                                    onClick={() => handleNodeSelect('reflection')}
                                />
                            </div>

                            {/* MIRROR (Left) */}
                            <div className="absolute -translate-x-36 translate-y-16 md:-translate-x-64 md:translate-y-0 pointer-events-auto">
                                <HexButton 
                                    label="Зеркало" 
                                    subLabel="Диалог с AI-учителем (Sandbox)"
                                    icon={ScanFace} 
                                    color="#a855f7" 
                                    active 
                                    recommended={recommendedNode === 'mirror'}
                                    onClick={() => handleNodeSelect('mirror')}
                                />
                            </div>
                        </div>
                    )}
                </AnimatePresence>

            </div>

            {/* --- FOOTER DECORATION --- */}
            <div className="absolute bottom-0 w-full h-1 bg-gradient-to-r from-transparent via-[#fcee0a] to-transparent opacity-20" />
        </div>
    );
};

export default HeroJourney;
