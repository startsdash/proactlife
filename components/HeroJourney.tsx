import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroQuest, Note, Task, Habit, JournalEntry, AppConfig } from '../types';
import { generateCyberpunkQuest, CyberpunkQuestData } from '../services/geminiService';
import { Target, Zap, Activity, Book, CheckCircle2, X, Terminal, Cpu, Ghost, Map, Play, Shield, Crosshair } from 'lucide-react';

interface Props {
    note: Note;
    config: AppConfig;
    onClose: () => void;
    onStartQuest: (data: CyberpunkQuestData, type: 'manual' | 'ai') => void;
}

const HeroJourney: React.FC<Props> = ({ note, config, onClose, onStartQuest }) => {
    const [step, setStep] = useState<'decrypt' | 'choice' | 'generating' | 'briefing'>('decrypt');
    const [generatedQuest, setGeneratedQuest] = useState<CyberpunkQuestData | null>(null);
    const [manualRole, setManualRole] = useState<'corpo' | 'nomad' | 'street_kid' | null>(null);

    // DECRYPT PHASE
    useEffect(() => {
        if (step === 'decrypt') {
            const timer = setTimeout(() => setStep('choice'), 2500);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const handleAIGeneration = async () => {
        setStep('generating');
        const data = await generateCyberpunkQuest(note.content, config);
        if (data) {
            setGeneratedQuest(data);
            setStep('briefing');
        } else {
            alert("Connection Failed. Netwatch blocked the signal.");
            setStep('choice');
        }
    };

    const handleManualStart = (role: 'corpo' | 'nomad' | 'street_kid') => {
        setManualRole(role);
        // Create a basic structure based on role
        const manualData: CyberpunkQuestData = {
            title: role === 'corpo' ? "Corporate Escalation" : role === 'nomad' ? "Wasteland Run" : "Street Gig",
            briefing: `Protocol initiated: ${role.toUpperCase()}. Objective: Execute plan derived from intel.`,
            objectives: ["Define Strategy", "Execute Phase 1", "Secure Assets"],
            systemProtocol: "Daily Sitrep",
            theme: role
        };
        setGeneratedQuest(manualData);
        setStep('briefing');
    };

    const confirmQuest = () => {
        if (generatedQuest) {
            onStartQuest(generatedQuest, step === 'generating' || step === 'briefing' ? 'ai' : 'manual');
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#050505] text-[#00F0FF] font-mono flex flex-col items-center justify-center p-4 overflow-hidden">
            {/* BACKGROUND GRID */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{ 
                    backgroundImage: `linear-gradient(to right, #00F0FF 1px, transparent 1px), linear-gradient(to bottom, #00F0FF 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    perspective: '1000px',
                    transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)'
                }}
            />
            
            {/* SCANLINES */}
            <div className="absolute inset-0 pointer-events-none bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] opacity-5 mix-blend-overlay" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />

            {/* CLOSE BUTTON */}
            <button onClick={onClose} className="absolute top-8 right-8 text-[#FF003C] hover:text-white transition-colors z-50">
                <X size={32} />
            </button>

            {/* CONTENT CONTAINER */}
            <div className="relative z-10 w-full max-w-4xl border-2 border-[#FCEE0A] bg-black/80 backdrop-blur-xl p-1 shadow-[0_0_20px_rgba(252,238,10,0.3)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 100%, 0 100%)' }}>
                <div className="border border-[#00F0FF]/30 p-8 md:p-12 min-h-[60vh] flex flex-col">
                    
                    {/* DECRYPTING ANIMATION */}
                    {step === 'decrypt' && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <Terminal size={64} className="text-[#FCEE0A] animate-pulse mb-8" />
                            <h2 className="text-2xl md:text-4xl font-bold tracking-widest animate-pulse text-[#FCEE0A] mb-4">DECRYPTING INTEL...</h2>
                            <div className="w-64 h-2 bg-[#003B3D] rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-[#00F0FF]" 
                                    initial={{ width: 0 }} 
                                    animate={{ width: '100%' }} 
                                    transition={{ duration: 2 }} 
                                />
                            </div>
                            <p className="mt-4 text-xs text-[#00F0FF]/60 uppercase tracking-widest">
                                SOURCE ID: {note.id.slice(-8)}
                            </p>
                        </div>
                    )}

                    {/* CHOICE PHASE */}
                    {step === 'choice' && (
                        <div className="flex-1 flex flex-col">
                            <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">Select Protocol</h2>
                            <p className="text-[#00F0FF]/60 text-sm mb-12">How will you execute this directive?</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                                {/* MANUAL / SOLO */}
                                <button 
                                    onClick={() => handleManualStart('street_kid')}
                                    className="group relative border border-[#FF003C] bg-[#FF003C]/5 hover:bg-[#FF003C]/10 p-8 text-left transition-all hover:scale-[1.02]"
                                >
                                    <div className="absolute top-0 left-0 bg-[#FF003C] text-black text-xs font-bold px-2 py-1">SOLO RUNNER</div>
                                    <Ghost size={48} className="text-[#FF003C] mb-6 opacity-80 group-hover:opacity-100" />
                                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#FF003C] transition-colors">MANUAL MODE</h3>
                                    <p className="text-sm text-[#FF003C]/80 leading-relaxed">
                                        Define your own path. Create tasks and habits manually based on your intuition.
                                    </p>
                                </button>

                                {/* AI / NETRUNNER */}
                                <button 
                                    onClick={handleAIGeneration}
                                    className="group relative border border-[#FCEE0A] bg-[#FCEE0A]/5 hover:bg-[#FCEE0A]/10 p-8 text-left transition-all hover:scale-[1.02]"
                                >
                                    <div className="absolute top-0 left-0 bg-[#FCEE0A] text-black text-xs font-bold px-2 py-1">NETRUNNER AI</div>
                                    <Cpu size={48} className="text-[#FCEE0A] mb-6 opacity-80 group-hover:opacity-100" />
                                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#FCEE0A] transition-colors">AI GENERATION</h3>
                                    <p className="text-sm text-[#FCEE0A]/80 leading-relaxed">
                                        Let the construct analyze the intel. Auto-generate objectives, briefing, and system protocols.
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* GENERATING PHASE */}
                    {step === 'generating' && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="relative w-32 h-32 mb-8">
                                <div className="absolute inset-0 border-4 border-[#00F0FF]/30 rounded-full animate-ping" />
                                <div className="absolute inset-0 border-4 border-t-[#FCEE0A] border-r-transparent border-b-[#FF003C] border-l-transparent rounded-full animate-spin" />
                            </div>
                            <h2 className="text-xl font-bold text-white animate-pulse">COMPILING SCENARIO...</h2>
                            <p className="text-xs text-[#00F0FF]/60 mt-2">Connecting to Net...</p>
                        </div>
                    )}

                    {/* BRIEFING PHASE */}
                    {step === 'briefing' && generatedQuest && (
                        <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar-none">
                            <div className="flex items-center justify-between mb-8 border-b border-[#00F0FF]/20 pb-4">
                                <div>
                                    <div className="text-[#FCEE0A] text-xs font-bold uppercase tracking-widest mb-1">OPERATION</div>
                                    <h2 className="text-3xl font-bold text-white uppercase glitch-text" data-text={generatedQuest.title}>{generatedQuest.title}</h2>
                                </div>
                                <div className={`px-4 py-1 text-xs font-bold uppercase ${generatedQuest.theme === 'corpo' ? 'bg-blue-600' : generatedQuest.theme === 'nomad' ? 'bg-orange-600' : 'bg-pink-600'} text-white`}>
                                    {generatedQuest.theme} PATH
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div>
                                    <h3 className="text-[#00F0FF] text-xs font-bold uppercase mb-4 flex items-center gap-2"><Terminal size={14}/> MISSION BRIEF</h3>
                                    <p className="text-white/80 text-sm leading-relaxed font-sans border-l-2 border-[#00F0FF] pl-4">
                                        {generatedQuest.briefing}
                                    </p>
                                </div>
                                
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-[#FCEE0A] text-xs font-bold uppercase mb-3 flex items-center gap-2"><Crosshair size={14}/> OBJECTIVES (KANBAN)</h3>
                                        <ul className="space-y-2">
                                            {generatedQuest.objectives.map((obj, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-white/90">
                                                    <span className="text-[#FCEE0A] mt-1">[{i+1}]</span>
                                                    <span>{obj}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="text-[#FF003C] text-xs font-bold uppercase mb-3 flex items-center gap-2"><Activity size={14}/> SYSTEM PROTOCOL (HABIT)</h3>
                                        <div className="border border-[#FF003C]/30 bg-[#FF003C]/10 p-3 text-sm text-white">
                                            {generatedQuest.systemProtocol}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-8 flex justify-center">
                                <button 
                                    onClick={confirmQuest}
                                    className="bg-[#FCEE0A] text-black px-12 py-4 font-bold text-lg uppercase tracking-widest hover:bg-white hover:shadow-[0_0_30px_rgba(252,238,10,0.5)] transition-all clip-path-button flex items-center gap-4"
                                    style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)' }}
                                >
                                    <Play fill="black" /> INITIATE CONTRACT
                                </button>
                            </div>
                        </div>
                    )}

                </div>
                {/* Decorative Corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#FCEE0A]" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#FCEE0A]" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#FCEE0A]" />
            </div>
        </div>
    );
};

export default HeroJourney;