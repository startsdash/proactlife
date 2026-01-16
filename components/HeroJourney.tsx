
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, Task, Habit, JournalEntry, JourneySession } from '../types';
import { Terminal, Cpu, Zap, Activity, CheckCircle2, ArrowRight, Shield, Database, X, Crosshair } from 'lucide-react';
import { applyTypography } from '../constants';

interface Props {
    session: JourneySession;
    onClose: () => void;
    onComplete: (actionType: 'task' | 'habit' | 'journal', payload: any) => void;
}

const CYBER_YELLOW = '#fcee0a';
const CYBER_CYAN = '#00f0ff';
const CYBER_RED = '#ff003c';
const DARK_BG = '#050505';

const GlitchText = ({ text, className = "" }: { text: string, className?: string }) => {
    return (
        <div className={`relative inline-block group ${className}`}>
            <span className="relative z-10">{text}</span>
            <span className="absolute top-0 left-0 -z-10 w-full h-full text-red-500 opacity-70 animate-pulse translate-x-[1px]">{text}</span>
            <span className="absolute top-0 left-0 -z-10 w-full h-full text-cyan-500 opacity-70 animate-pulse -translate-x-[1px]">{text}</span>
        </div>
    );
};

const Typewriter = ({ text, onComplete }: { text: string, onComplete?: () => void }) => {
    const [displayed, setDisplayed] = useState('');
    
    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            setDisplayed(text.substring(0, i));
            i++;
            if (i > text.length) {
                clearInterval(timer);
                onComplete?.();
            }
        }, 15); // Fast typing
        return () => clearInterval(timer);
    }, [text]);

    return <span>{displayed}<span className="animate-pulse">_</span></span>;
};

const CyberButton = ({ onClick, children, color = 'yellow', className = "" }: any) => {
    const borderColor = color === 'yellow' ? 'border-[#fcee0a]' : color === 'cyan' ? 'border-[#00f0ff]' : 'border-[#ff003c]';
    const textColor = color === 'yellow' ? 'text-[#fcee0a]' : color === 'cyan' ? 'text-[#00f0ff]' : 'text-[#ff003c]';
    const bgHover = color === 'yellow' ? 'hover:bg-[#fcee0a]/10' : color === 'cyan' ? 'hover:bg-[#00f0ff]/10' : 'hover:bg-[#ff003c]/10';

    return (
        <button 
            onClick={onClick}
            className={`
                relative px-8 py-4 border-2 ${borderColor} ${textColor} font-mono uppercase tracking-widest font-bold 
                ${bgHover} transition-all duration-200 active:scale-95 group overflow-hidden
                clip-path-polygon ${className}
            `}
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
        >
            <div className={`absolute top-0 left-0 w-full h-full bg-current opacity-0 group-hover:opacity-5 transition-opacity`} />
            <div className="flex items-center gap-3 relative z-10">
                {children}
            </div>
        </button>
    )
}

const HeroJourney: React.FC<Props> = ({ session, onClose, onComplete }) => {
    const [stage, setStage] = useState<'boot' | 'briefing' | 'choice' | 'action' | 'result'>('boot');
    const [logs, setLogs] = useState<string[]>(['> INIT_SYSTEM_V2.04...', '> CONNECTING_NEURAL_LINK...', '> ESTABLISHED.']);
    const [selectedProtocol, setSelectedProtocol] = useState<'task' | 'habit' | 'journal' | null>(null);
    
    // Action State
    const [inputVal1, setInputVal1] = useState(session.sourceNote.title || '');
    const [inputVal2, setInputVal2] = useState(''); // Detail/Habit Desc
    const [inputVal3, setInputVal3] = useState(''); // Extra

    // Boot Sequence
    useEffect(() => {
        if (stage === 'boot') {
            const timeouts = [
                setTimeout(() => setLogs(p => [...p, '> DECRYPTING_SOURCE_DATA...']), 500),
                setTimeout(() => setLogs(p => [...p, '> PATTERN_RECOGNIZED: "Potential Narrative"']), 1200),
                setTimeout(() => setStage('briefing'), 2000),
            ];
            return () => timeouts.forEach(clearTimeout);
        }
    }, [stage]);

    const handleProtocolSelect = (protocol: 'task' | 'habit' | 'journal') => {
        setSelectedProtocol(protocol);
        setLogs(p => [...p, `> PROTOCOL_SELECTED: [${protocol.toUpperCase()}]`, '> INITIALIZING_FORM...']);
        
        // Pre-fill logic based on protocol
        if (protocol === 'task') {
            setInputVal1(session.sourceNote.title || 'Новая миссия');
            setInputVal2(session.sourceNote.content.substring(0, 100) + '...');
        } else if (protocol === 'habit') {
            setInputVal1('Новый ритуал');
            setInputVal2('Ежедневно');
        } else if (protocol === 'journal') {
            setInputVal1(session.sourceNote.title || 'Рефлексия');
            setInputVal2('Анализ данных...');
        }

        setTimeout(() => setStage('action'), 800);
    };

    const handleExecute = () => {
        if (!selectedProtocol) return;
        
        setLogs(p => [...p, '> EXECUTING_PROTOCOL...', '> SYNCHRONIZING_DATABASE...']);
        
        // Prepare Payload
        let payload;
        if (selectedProtocol === 'task') {
            payload = {
                title: inputVal1,
                description: session.sourceNote.content, // Full content
                content: inputVal2 // Just summary for now or edit
            };
        } else if (selectedProtocol === 'habit') {
            payload = {
                title: inputVal1,
                description: inputVal2
            };
        } else {
            payload = {
                title: inputVal1,
                content: session.sourceNote.content // Link original content
            };
        }

        setTimeout(() => {
            setStage('result');
            onComplete(selectedProtocol, payload);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#050505] text-slate-200 font-sans overflow-hidden flex flex-col">
            {/* SCANLINES & VIGNETTE */}
            <div className="absolute inset-0 pointer-events-none z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            <div className="absolute inset-0 pointer-events-none z-50 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]" />
            <div className="absolute inset-0 pointer-events-none z-40 bg-gradient-to-b from-transparent via-transparent to-[#00f0ff]/5 opacity-50" style={{ backgroundSize: '100% 4px' }} />

            {/* HUD HEADER */}
            <header className="relative z-50 p-6 flex justify-between items-center border-b border-white/10 bg-[#050505]/80 backdrop-blur">
                <div className="flex items-center gap-4">
                    <Cpu size={24} className="text-[#fcee0a]" />
                    <div>
                        <h1 className="font-mono font-bold text-xl tracking-[0.2em] text-white">HERO_JOURNEY</h1>
                        <div className="flex items-center gap-2 text-[10px] text-cyan-500 font-mono">
                            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                            SESSION_ID: {session.id.slice(-6).toUpperCase()}
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded text-red-500 transition-colors">
                    <X size={24} />
                </button>
            </header>

            {/* MAIN INTERFACE */}
            <main className="flex-1 relative z-10 flex flex-col md:flex-row">
                
                {/* LEFT: LOGS & SOURCE DATA */}
                <div className="w-full md:w-1/3 border-r border-white/10 p-6 flex flex-col bg-[#0a0a0a]">
                    <div className="mb-6 border border-white/20 p-4 relative">
                        <div className="absolute top-0 left-0 bg-[#fcee0a] text-black text-[10px] font-bold px-2 py-0.5 font-mono">SOURCE_DATA</div>
                        <div className="mt-4 font-serif text-sm text-slate-400 italic leading-relaxed line-clamp-[10]">
                            "{session.sourceNote.content}"
                        </div>
                    </div>

                    <div className="flex-1 font-mono text-xs text-cyan-500/80 p-4 bg-black border border-cyan-900/30 overflow-y-auto font-bold space-y-1">
                        {logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                        <div className="animate-pulse">_</div>
                    </div>
                </div>

                {/* RIGHT: INTERACTIVE AREA */}
                <div className="flex-1 p-8 flex flex-col justify-center items-center relative">
                    
                    {/* BACKGROUND GRID */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" 
                        style={{ 
                            backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.3) 1px, transparent 1px)', 
                            backgroundSize: '40px 40px' 
                        }} 
                    />

                    {stage === 'boot' && (
                        <div className="text-center">
                            <div className="text-4xl font-mono font-bold text-[#fcee0a] mb-4 tracking-widest glitch-effect">INITIALIZING</div>
                            <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden mx-auto">
                                <motion.div 
                                    className="h-full bg-[#fcee0a]" 
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                />
                            </div>
                        </div>
                    )}

                    {stage === 'briefing' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl w-full"
                        >
                            <h2 className="text-2xl font-mono text-[#00f0ff] mb-6 tracking-widest uppercase border-b border-[#00f0ff]/30 pb-2">
                                <GlitchText text="Mission Briefing" />
                            </h2>
                            <div className="text-lg text-slate-300 font-light mb-12 leading-relaxed">
                                <Typewriter text="Обнаружен фрагмент смысла. Его потенциал нестабилен. Требуется немедленная интеграция в структуру личности для предотвращения энтропии." />
                            </div>
                            
                            <div className="flex justify-center">
                                <CyberButton onClick={() => setStage('choice')} color="yellow">
                                    INITIATE_PROTOCOL <ArrowRight size={20} />
                                </CyberButton>
                            </div>
                        </motion.div>
                    )}

                    {stage === 'choice' && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-4xl"
                        >
                            <h2 className="text-center text-xl font-mono text-slate-400 mb-12 uppercase tracking-[0.3em]">Выберите Путь Интеграции</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <button 
                                    onClick={() => handleProtocolSelect('task')}
                                    className="group border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#fcee0a] p-8 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity text-[#fcee0a]"><Crosshair size={40} /></div>
                                    <div className="text-[#fcee0a] text-sm font-mono font-bold mb-2">PROTOCOL: EXECUTE</div>
                                    <div className="text-2xl font-bold text-white mb-4">Взять Квест</div>
                                    <p className="text-xs text-slate-400">Превратить мысль в конкретную задачу (Kanban).</p>
                                </button>

                                <button 
                                    onClick={() => handleProtocolSelect('habit')}
                                    className="group border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#00f0ff] p-8 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity text-[#00f0ff]"><Activity size={40} /></div>
                                    <div className="text-[#00f0ff] text-sm font-mono font-bold mb-2">PROTOCOL: RITUAL</div>
                                    <div className="text-2xl font-bold text-white mb-4">Принять Ритуал</div>
                                    <p className="text-xs text-slate-400">Внедрить системную привычку (Rituals).</p>
                                </button>

                                <button 
                                    onClick={() => handleProtocolSelect('journal')}
                                    className="group border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#ff003c] p-8 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity text-[#ff003c]"><Database size={40} /></div>
                                    <div className="text-[#ff003c] text-sm font-mono font-bold mb-2">PROTOCOL: ENGRAM</div>
                                    <div className="text-2xl font-bold text-white mb-4">Зафиксировать</div>
                                    <p className="text-xs text-slate-400">Сохранить как инсайт или рефлексию (Journal).</p>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {stage === 'action' && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="max-w-xl w-full bg-black/50 border border-white/20 p-8 relative backdrop-blur-xl"
                        >
                            <div className="absolute -top-3 left-4 bg-[#050505] px-2 text-[#fcee0a] text-xs font-mono font-bold">PARAMETER_INPUT</div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-mono text-cyan-500 mb-2 uppercase">Target_Identifier (Title)</label>
                                    <input 
                                        type="text" 
                                        value={inputVal1}
                                        onChange={(e) => setInputVal1(e.target.value)}
                                        className="w-full bg-[#111] border-b-2 border-slate-700 focus:border-[#fcee0a] text-white p-3 font-mono outline-none transition-colors"
                                    />
                                </div>
                                
                                {selectedProtocol !== 'habit' && (
                                    <div>
                                        <label className="block text-xs font-mono text-cyan-500 mb-2 uppercase">Context_Data</label>
                                        <textarea 
                                            value={inputVal2}
                                            onChange={(e) => setInputVal2(e.target.value)}
                                            rows={4}
                                            className="w-full bg-[#111] border-b-2 border-slate-700 focus:border-[#fcee0a] text-white p-3 font-mono outline-none transition-colors resize-none"
                                        />
                                    </div>
                                )}

                                {selectedProtocol === 'habit' && (
                                    <div>
                                        <label className="block text-xs font-mono text-cyan-500 mb-2 uppercase">Frequency_Modulation</label>
                                        <input 
                                            type="text" 
                                            value={inputVal2}
                                            onChange={(e) => setInputVal2(e.target.value)}
                                            className="w-full bg-[#111] border-b-2 border-slate-700 focus:border-[#fcee0a] text-white p-3 font-mono outline-none transition-colors"
                                        />
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end">
                                    <CyberButton onClick={handleExecute} color="cyan">
                                        EXECUTE_CMD <Terminal size={18} />
                                    </CyberButton>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {stage === 'result' && (
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                            <div className="mb-8 relative inline-block">
                                <div className="absolute inset-0 bg-[#00f0ff] blur-2xl opacity-20 rounded-full animate-pulse" />
                                <CheckCircle2 size={120} className="text-[#00f0ff] relative z-10" strokeWidth={1} />
                            </div>
                            <h2 className="text-3xl font-mono font-bold text-white mb-2 tracking-widest">INTEGRATION_COMPLETE</h2>
                            <p className="text-slate-400 font-mono text-sm mb-12">XP GAINED: 50</p>
                            
                            <CyberButton onClick={onClose} color="yellow">
                                CLOSE_SESSION
                            </CyberButton>
                        </motion.div>
                    )}

                </div>
            </main>
        </div>
    );
};

export default HeroJourney;
