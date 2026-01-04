import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserProfileConfig, IdentityRole, Note, Task, Habit, JournalEntry, Flashcard } from '../types';
import { Diamond, Activity, Target, Edit3, Save, Compass, Anchor, Cpu } from 'lucide-react';

interface Props {
  notes: Note[];
  tasks: Task[];
  habits: Habit[];
  journal: JournalEntry[];
  flashcards: Flashcard[];
  config: UserProfileConfig;
  onUpdateConfig: (config: UserProfileConfig) => void;
}

const ROLES: { id: IdentityRole; label: string; color: string; icon: React.ElementType; desc: string }[] = [
    { id: 'hero', label: 'ГЕРОЙ', color: 'text-amber-500 border-amber-500 shadow-amber-500/50', icon: Target, desc: 'Действие через преодоление' },
    { id: 'explorer', label: 'ИССЛЕДОВАТЕЛЬ', color: 'text-emerald-500 border-emerald-500 shadow-emerald-500/50', icon: Compass, desc: 'Поиск новых смыслов' },
    { id: 'architect', label: 'АРХИТЕКТОР', color: 'text-indigo-500 border-indigo-500 shadow-indigo-500/50', icon: Cpu, desc: 'Создание устойчивых систем' },
];

const NeuralSilhouette = ({ flashcards, roleColor }: { flashcards: Flashcard[], roleColor: string }) => {
    // Generate a simple constellation based on flashcards
    const nodes = useMemo(() => {
        return flashcards.slice(0, 15).map((_, i) => ({
            x: Math.random() * 200,
            y: Math.random() * 200,
            size: Math.random() * 4 + 2,
            id: i
        }));
    }, [flashcards.length]);

    const activeColor = roleColor.split(' ')[0].replace('text-', 'bg-');

    return (
        <div className="relative w-64 h-64 mx-auto my-8 group">
            <div className="absolute inset-0 rounded-full border border-slate-200/50 dark:border-slate-700/50 bg-white/10 dark:bg-black/20 backdrop-blur-[60px] shadow-2xl flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 200 200" className="w-full h-full p-4 opacity-70 group-hover:opacity-100 transition-opacity duration-700">
                    {/* Connections */}
                    {nodes.map((node, i) => (
                        i > 0 && (
                            <line 
                                key={`l-${i}`} 
                                x1={nodes[i-1].x} y1={nodes[i-1].y} 
                                x2={node.x} y2={node.y} 
                                stroke="currentColor" 
                                strokeWidth="0.5" 
                                className="text-slate-300 dark:text-slate-600"
                            />
                        )
                    ))}
                    {/* Nodes */}
                    {nodes.map((node) => (
                        <circle 
                            key={`n-${node.id}`} 
                            cx={node.x} cy={node.y} r={node.size} 
                            className={`${activeColor} opacity-80`}
                        />
                    ))}
                </svg>
                
                {/* 3D Reflection Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none rounded-full" />
            </div>
            
            <div className="absolute -bottom-10 w-full text-center">
                <div className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Архитектура Субъекта
                </div>
            </div>
        </div>
    );
};

const Profile: React.FC<Props> = ({ notes, tasks, habits, journal, flashcards, config, onUpdateConfig }) => {
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bioText, setBioText] = useState(config.manifesto);

    const activeRole = ROLES.find(r => r.id === config.role) || ROLES[2];

    const synthesisRate = notes.length > 0 ? Math.round((flashcards.length / notes.length) * 100) : 0;
    
    const rhythmStability = useMemo(() => {
        if (habits.length === 0) return 0;
        const totalStreak = habits.reduce((acc, h) => acc + h.streak, 0);
        return Math.round(totalStreak / habits.length);
    }, [habits]);

    const insightDepth = journal.filter(j => j.isInsight).length;

    const journeyLog = useMemo(() => {
        return tasks
            .filter(t => t.column === 'done' || t.isArchived)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 10);
    }, [tasks]);

    const handleRoleChange = (role: IdentityRole) => {
        onUpdateConfig({ ...config, role });
    };

    const handleBioSave = () => {
        onUpdateConfig({ ...config, manifesto: bioText });
        setIsEditingBio(false);
    };

    return (
        <div className="h-full overflow-y-auto custom-scrollbar-light bg-[#f8fafc] dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 p-6 md:p-12 relative flex flex-col items-center">
            
            {/* 1. Identity Selection Header */}
            <div className="flex gap-4 mb-12 flex-wrap justify-center">
                {ROLES.map(role => (
                    <button
                        key={role.id}
                        onClick={() => handleRoleChange(role.id)}
                        className={`
                            px-6 py-2 border rounded-full font-mono text-xs uppercase tracking-widest transition-all duration-300
                            ${config.role === role.id 
                                ? `${role.color} bg-white dark:bg-slate-900 shadow-lg` 
                                : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300'}
                        `}
                    >
                        [ {role.label} ]
                    </button>
                ))}
            </div>

            {/* 2. The Core: Neural Silhouette */}
            <NeuralSilhouette flashcards={flashcards} roleColor={activeRole.color} />

            {/* 3. Meta-Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 my-16 w-full max-w-4xl">
                <div className="flex flex-col items-center text-center">
                    <div className="text-4xl md:text-5xl font-mono font-light text-slate-800 dark:text-slate-100 mb-2">
                        {synthesisRate}%
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Synthesis Rate</div>
                </div>
                
                <div className="flex flex-col items-center text-center">
                    <div className="h-12 flex items-center justify-center mb-2 w-full">
                        <svg viewBox="0 0 100 20" className="w-24 h-full overflow-visible">
                            <path d="M0,10 Q25,0 50,10 T100,10" fill="none" stroke="currentColor" strokeWidth="2" className={activeRole.color.split(' ')[0]} />
                        </svg>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Stability: {rhythmStability}</div>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-2">
                        <Diamond size={24} strokeWidth={1} className={activeRole.color.split(' ')[0]} />
                        <span className="text-4xl md:text-5xl font-serif italic text-slate-800 dark:text-slate-100">{insightDepth}</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Insights Mined</div>
                </div>
            </div>

            {/* 4. Journey Log */}
            <div className="w-full max-w-2xl mb-16">
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">Архив Путешествий</span>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                </div>
                
                <div className="space-y-4">
                    {journeyLog.length === 0 ? (
                        <div className="text-center text-slate-400 font-serif italic opacity-50 py-8">Путь только начинается...</div>
                    ) : (
                        journeyLog.map(task => (
                            <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800/50 group">
                                <div className="flex items-center gap-4 mb-1 md:mb-0">
                                    <span className="font-mono text-[10px] text-slate-300 dark:text-slate-600">
                                        {new Date(task.createdAt).toLocaleDateString()}
                                    </span>
                                    {task.spheres?.[0] && (
                                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                            {task.spheres[0]}
                                        </span>
                                    )}
                                </div>
                                <div className="font-serif text-sm text-slate-600 dark:text-slate-300 group-hover:text-indigo-500 transition-colors truncate max-w-md">
                                    {task.title || task.content}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 5. Global Bio (The Manifesto) */}
            <div className="w-full max-w-xl text-center relative group">
                {isEditingBio ? (
                    <div className="relative">
                        <textarea 
                            value={bioText}
                            onChange={(e) => setBioText(e.target.value)}
                            className="w-full bg-transparent text-center font-serif italic text-xl md:text-2xl text-slate-800 dark:text-slate-200 outline-none resize-none p-4 border-b border-indigo-500"
                            rows={3}
                            autoFocus
                        />
                        <button 
                            onClick={handleBioSave}
                            className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-600 flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1 rounded-full shadow-sm"
                        >
                            <Save size={12} /> Сохранить
                        </button>
                    </div>
                ) : (
                    <div 
                        onClick={() => setIsEditingBio(true)}
                        className="cursor-pointer relative py-8 px-4"
                    >
                        <span className="absolute top-4 left-0 text-4xl text-slate-200 dark:text-slate-700 font-serif">“</span>
                        <p className="font-serif italic text-xl md:text-2xl text-slate-800 dark:text-slate-200 leading-relaxed">
                            {config.manifesto}
                        </p>
                        <span className="absolute bottom-4 right-0 text-4xl text-slate-200 dark:text-slate-700 font-serif">”</span>
                        
                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit3 size={14} className="text-slate-300" />
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Profile;