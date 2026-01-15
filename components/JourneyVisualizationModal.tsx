
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, Task, Habit, JournalEntry, AppConfig } from '../types';
import { Zap, Repeat, Book, BrainCircuit, X, ArrowRight, Check, Target, Calendar, MessageCircle } from 'lucide-react';
import { ICON_MAP } from '../constants';

interface Props {
  note: Note;
  config: AppConfig;
  onClose: () => void;
  onCreateTask: (task: Task) => void;
  onCreateHabit: (habit: Habit) => void;
  onCreateEntry: (entry: JournalEntry) => void;
  onConsultMentor: (content: string, mentorId: string) => void; // Navigates to Sandbox/Hub
}

type PathType = 'action' | 'ritual' | 'reflection' | 'mentor' | null;

const PATHS = [
    { id: 'action', label: 'Действие', sub: 'В Спринты', icon: Zap, color: 'cyan', glow: 'shadow-[0_0_30px_rgba(34,211,238,0.4)]', border: 'border-cyan-400', text: 'text-cyan-600' },
    { id: 'ritual', label: 'Ритуал', sub: 'В Трекер', icon: Repeat, color: 'emerald', glow: 'shadow-[0_0_30px_rgba(52,211,153,0.4)]', border: 'border-emerald-400', text: 'text-emerald-600' },
    { id: 'reflection', label: 'Синтез', sub: 'В Дневник', icon: Book, color: 'fuchsia', glow: 'shadow-[0_0_30px_rgba(232,121,249,0.4)]', border: 'border-fuchsia-400', text: 'text-fuchsia-600' },
    { id: 'mentor', label: 'Мудрость', sub: 'К Ментору', icon: BrainCircuit, color: 'amber', glow: 'shadow-[0_0_30px_rgba(251,191,36,0.4)]', border: 'border-amber-400', text: 'text-amber-600' },
];

export const JourneyVisualizationModal: React.FC<Props> = ({ note, config, onClose, onCreateTask, onCreateHabit, onCreateEntry, onConsultMentor }) => {
    const [selectedPath, setSelectedPath] = useState<PathType>(null);
    
    // Form States
    const [taskTitle, setTaskTitle] = useState(note.title || 'Новая задача');
    const [habitTitle, setHabitTitle] = useState(note.title || 'Новая привычка');
    const [habitFreq, setHabitFreq] = useState<'daily' | 'weekly'>('daily');
    const [entryContent, setEntryContent] = useState(note.content);
    const [selectedMentor, setSelectedMentor] = useState(config.mentors[0]?.id || '');

    const handleAction = () => {
        if (selectedPath === 'action') {
            onCreateTask({
                id: Date.now().toString(),
                title: taskTitle,
                content: note.content, // Preserve original context
                column: 'todo',
                createdAt: Date.now(),
                spheres: []
            });
        } else if (selectedPath === 'ritual') {
            onCreateHabit({
                id: Date.now().toString(),
                title: habitTitle,
                description: note.content.substring(0, 100) + '...',
                color: 'emerald',
                icon: 'Zap',
                frequency: habitFreq === 'daily' ? 'daily' : 'times_per_week',
                targetCount: habitFreq === 'weekly' ? 3 : undefined,
                history: {},
                streak: 0,
                bestStreak: 0,
                reminders: [],
                createdAt: Date.now()
            });
        } else if (selectedPath === 'reflection') {
            onCreateEntry({
                id: Date.now().toString(),
                date: Date.now(),
                content: entryContent,
                linkedNoteId: note.id,
                isInsight: true
            });
        } else if (selectedPath === 'mentor') {
            onConsultMentor(note.content, selectedMentor);
        }
        onClose();
    };

    const Particles = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => (
            <motion.div
                key={i}
                className="absolute rounded-full bg-slate-400/20 pointer-events-none"
                initial={{ 
                    x: Math.random() * window.innerWidth, 
                    y: Math.random() * window.innerHeight, 
                    scale: Math.random() * 0.5 + 0.5 
                }}
                animate={{ 
                    y: [null, Math.random() * window.innerHeight],
                    opacity: [0, 0.5, 0]
                }}
                transition={{ 
                    duration: Math.random() * 10 + 10, 
                    repeat: Infinity, 
                    ease: "linear" 
                }}
                style={{ width: Math.random() * 4 + 2, height: Math.random() * 4 + 2 }}
            />
        ));
    }, []);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/60 dark:bg-[#0f172a]/80 backdrop-blur-xl"
                onClick={onClose}
            >
                {Particles}
            </motion.div>

            {/* Main Container */}
            <motion.div 
                layout
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-4xl aspect-square md:aspect-video bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-white/10 rounded-[40px] shadow-2xl flex flex-col items-center justify-center overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-50">
                    <X size={24} />
                </button>

                <AnimatePresence mode="wait">
                    {selectedPath === null ? (
                        /* STATE 1: ORBIT SELECTION */
                        <motion.div 
                            key="orbit"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}
                            className="relative w-full h-full flex items-center justify-center"
                        >
                            {/* Central Node (The Note) */}
                            <motion.div 
                                className="relative z-20 w-64 aspect-[3/4] bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center text-center justify-center group cursor-default"
                                whileHover={{ scale: 1.02 }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 opacity-50 rounded-2xl" />
                                <div className="relative z-10">
                                    <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-4">Исходная Мысль</div>
                                    <h3 className="font-serif text-xl text-slate-800 dark:text-slate-100 italic leading-relaxed line-clamp-4">
                                        {note.title || note.content}
                                    </h3>
                                </div>
                                {/* Pulse Ring */}
                                <div className="absolute inset-0 rounded-2xl border-2 border-indigo-500/20 animate-pulse" />
                            </motion.div>

                            {/* Orbit Paths */}
                            {PATHS.map((path, i) => {
                                // Calculate position in a cross/X shape
                                const angle = (i * 90) + 45; 
                                const rad = angle * (Math.PI / 180);
                                const radius = 220; // Distance from center
                                const x = Math.cos(rad) * radius;
                                const y = Math.sin(rad) * radius;

                                return (
                                    <React.Fragment key={path.id}>
                                        {/* Connecting Line */}
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                                            <motion.line 
                                                x1="50%" y1="50%"
                                                x2={`calc(50% + ${x}px)`} y2={`calc(50% + ${y}px)`}
                                                stroke="currentColor"
                                                strokeWidth="1"
                                                strokeDasharray="4 4"
                                                className="text-slate-300 dark:text-slate-600"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{ duration: 1, delay: 0.2 }}
                                            />
                                        </svg>

                                        {/* Destination Node */}
                                        <motion.button
                                            onClick={() => setSelectedPath(path.id as PathType)}
                                            className={`
                                                absolute w-32 h-32 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md 
                                                border-2 ${path.border} flex flex-col items-center justify-center gap-2
                                                shadow-lg hover:scale-110 transition-all duration-300 z-30 group
                                                ${path.glow}
                                            `}
                                            style={{ 
                                                left: `calc(50% + ${x}px - 64px)`, 
                                                top: `calc(50% + ${y}px - 64px)` 
                                            }}
                                            whileHover={{ rotate: 5 }}
                                        >
                                            <path.icon size={28} className={path.text} />
                                            <div className="text-center">
                                                <div className={`text-xs font-bold uppercase tracking-wider ${path.text}`}>{path.label}</div>
                                                <div className="text-[9px] text-slate-400 font-mono mt-1">{path.sub}</div>
                                            </div>
                                        </motion.button>
                                    </React.Fragment>
                                );
                            })}
                        </motion.div>
                    ) : (
                        /* STATE 2: CONFIGURATION FORGE */
                        <motion.div 
                            key="forge"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full h-full flex flex-col items-center justify-center p-8 md:p-12 relative"
                        >
                            <button 
                                onClick={() => setSelectedPath(null)} 
                                className="absolute top-8 left-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                            >
                                <ArrowRight size={16} className="rotate-180" /> Назад к карте
                            </button>

                            <div className="w-full max-w-lg">
                                <div className="text-center mb-8">
                                    <div className={`inline-flex p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-xl mb-4 ${PATHS.find(p => p.id === selectedPath)?.border} border-2`}>
                                        {React.createElement(PATHS.find(p => p.id === selectedPath)?.icon || Zap, { size: 32, className: PATHS.find(p => p.id === selectedPath)?.text })}
                                    </div>
                                    <h2 className="text-2xl font-light text-slate-800 dark:text-white tracking-tight">
                                        {selectedPath === 'action' && 'Материализация Действия'}
                                        {selectedPath === 'ritual' && 'Внедрение в Систему'}
                                        {selectedPath === 'reflection' && 'Глубокий Синтез'}
                                        {selectedPath === 'mentor' && 'Совет Мудреца'}
                                    </h2>
                                </div>

                                <div className="bg-white/50 dark:bg-slate-800/50 rounded-3xl p-6 border border-white/50 dark:border-white/10 shadow-inner backdrop-blur-md space-y-6">
                                    
                                    {/* Action Form */}
                                    {selectedPath === 'action' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Название задачи</label>
                                                <input 
                                                    value={taskTitle}
                                                    onChange={e => setTaskTitle(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-lg outline-none focus:border-cyan-400 transition-colors"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                                                <MessageCircle size={14} />
                                                <span className="italic truncate">{note.content}</span>
                                            </div>
                                        </>
                                    )}

                                    {/* Ritual Form */}
                                    {selectedPath === 'ritual' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Название привычки</label>
                                                <input 
                                                    value={habitTitle}
                                                    onChange={e => setHabitTitle(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-lg outline-none focus:border-emerald-400 transition-colors"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => setHabitFreq('daily')}
                                                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wider transition-all ${habitFreq === 'daily' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}
                                                >
                                                    Ежедневно
                                                </button>
                                                <button 
                                                    onClick={() => setHabitFreq('weekly')}
                                                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs uppercase tracking-wider transition-all ${habitFreq === 'weekly' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}
                                                >
                                                    3 раза в неделю
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* Reflection Form */}
                                    {selectedPath === 'reflection' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Развитие мысли</label>
                                            <textarea 
                                                value={entryContent}
                                                onChange={e => setEntryContent(e.target.value)}
                                                className="w-full h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-base font-serif italic outline-none focus:border-fuchsia-400 transition-colors resize-none"
                                                autoFocus
                                            />
                                        </div>
                                    )}

                                    {/* Mentor Form */}
                                    {selectedPath === 'mentor' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-4 text-center">Выберите собеседника</label>
                                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none justify-center">
                                                {config.mentors.filter(m => !m.isDisabled).map(mentor => {
                                                    const Icon = ICON_MAP[mentor.icon] || ICON_MAP['User'];
                                                    const isSelected = selectedMentor === mentor.id;
                                                    return (
                                                        <button 
                                                            key={mentor.id}
                                                            onClick={() => setSelectedMentor(mentor.id)}
                                                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all min-w-[100px] ${isSelected ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 scale-105 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'}`}
                                                        >
                                                            <div className={`p-2 rounded-full bg-white dark:bg-slate-800 ${mentor.color}`}>
                                                                <Icon size={24} />
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{mentor.name}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleAction}
                                        className={`w-full py-4 rounded-xl text-white font-bold uppercase tracking-widest shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2
                                            ${selectedPath === 'action' ? 'bg-cyan-500 hover:bg-cyan-600' : ''}
                                            ${selectedPath === 'ritual' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                                            ${selectedPath === 'reflection' ? 'bg-fuchsia-500 hover:bg-fuchsia-600' : ''}
                                            ${selectedPath === 'mentor' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                                        `}
                                    >
                                        <Check size={18} strokeWidth={3} />
                                        Подтвердить Путь
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
