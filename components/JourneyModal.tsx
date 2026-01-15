
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, Habit, JournalEntry, HabitFrequency } from '../types';
import { analyzeHeroJourney, HeroJourneyAnalysis } from '../services/geminiService';
import { applyTypography } from '../constants';
import { Sparkles, Map, ArrowRight, X, Kanban, Flame, Book, Loader2, CheckCircle2, Target } from 'lucide-react';

interface Props {
  note: Note;
  onClose: () => void;
  addTask: (t: Task) => void;
  addHabit: (h: Habit) => void;
  addJournalEntry: (e: JournalEntry) => void;
  config: AppConfig;
}

const ArchetypeCard = ({ 
    type, 
    selected, 
    onClick, 
    icon: Icon, 
    label, 
    desc 
}: { 
    type: string; 
    selected: boolean; 
    onClick: () => void; 
    icon: React.ElementType; 
    label: string; 
    desc: string; 
}) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 w-full md:w-1/3 text-center group relative overflow-hidden ${
            selected 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
        }`}
    >
        <div className={`p-3 rounded-full mb-3 transition-colors ${selected ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
            <Icon size={24} strokeWidth={1.5} />
        </div>
        <div className={`font-bold text-sm mb-1 ${selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{label}</div>
        <div className="text-[10px] text-slate-500 leading-relaxed px-2">{desc}</div>
        {selected && <div className="absolute top-2 right-2 text-indigo-500"><CheckCircle2 size={16} /></div>}
    </button>
);

const JourneyModal: React.FC<Props> = ({ note, onClose, addTask, addHabit, addJournalEntry, config }) => {
  const [step, setStep] = useState<'analysis' | 'setup' | 'complete'>('analysis');
  const [analysis, setAnalysis] = useState<HeroJourneyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection State
  const [selectedType, setSelectedType] = useState<'task' | 'habit' | 'insight'>('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Run AI Analysis on Mount
  useEffect(() => {
      const runAnalysis = async () => {
          setIsLoading(true);
          const result = await analyzeHeroJourney(note.content, config);
          if (result) {
              setAnalysis(result);
              setSelectedType(result.archetype);
              setTitle(applyTypography(result.title));
              setDescription(applyTypography(result.essence));
          }
          setIsLoading(false);
      };
      runAnalysis();
  }, [note, config]);

  const handleCreate = () => {
      if (!title) return;

      const id = Date.now().toString();
      
      if (selectedType === 'task') {
          const newTask: Task = {
              id,
              title,
              content: `${description}\n\n---\n*Источник: Заметка "${note.title || 'Безымянная'}"*`,
              column: 'todo',
              createdAt: Date.now(),
              description: note.content // Keep original context
          };
          addTask(newTask);
      } else if (selectedType === 'habit') {
          const newHabit: Habit = {
              id,
              title,
              description: description || note.content.substring(0, 100),
              color: 'emerald',
              icon: 'Zap',
              frequency: 'daily',
              history: {},
              streak: 0,
              bestStreak: 0,
              reminders: [],
              createdAt: Date.now()
          };
          addHabit(newHabit);
      } else if (selectedType === 'insight') {
          const newEntry: JournalEntry = {
              id,
              date: Date.now(),
              title,
              content: `${description}\n\n${note.content}`,
              isInsight: true,
              linkedNoteId: note.id
          };
          addJournalEntry(newEntry);
      }

      setStep('complete');
      if(window.confetti) window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#10b981', '#f43f5e'] });
      
      setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={onClose}>
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[32px] shadow-2xl border border-white/20 dark:border-slate-700 overflow-hidden relative flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
        >
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-500/20 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/20 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-start shrink-0">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-500 mb-1">
                            <Map size={18} />
                            <span className="text-xs font-bold uppercase tracking-[0.2em]">Путешествие Героя</span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-white tracking-tight">Трансформация Смысла</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-light p-8 pt-2">
                    <AnimatePresence mode="wait">
                        {step === 'analysis' && (
                            <motion.div 
                                key="analysis"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full"
                            >
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-slate-700/50 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Исходный Материал</div>
                                    <p className="text-slate-600 dark:text-slate-300 font-serif italic text-lg leading-relaxed line-clamp-4">
                                        {note.content}
                                    </p>
                                </div>

                                {isLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                                        <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
                                        <p className="text-slate-500 font-mono text-xs uppercase tracking-widest animate-pulse">Оракул размышляет...</p>
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Sparkles size={16} className="text-violet-500" />
                                            <span className="text-xs font-bold text-violet-500 uppercase tracking-widest">Вердикт Оракула</span>
                                        </div>
                                        
                                        <div className="text-center mb-8">
                                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{analysis?.title}</h3>
                                            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">{analysis?.reasoning}</p>
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-4 mb-8">
                                            <ArchetypeCard 
                                                type="task" 
                                                selected={selectedType === 'task'} 
                                                onClick={() => setSelectedType('task')}
                                                icon={Kanban}
                                                label="Спринт"
                                                desc="Единоразовое действие. Конкретная задача с результатом."
                                            />
                                            <ArchetypeCard 
                                                type="habit" 
                                                selected={selectedType === 'habit'} 
                                                onClick={() => setSelectedType('habit')}
                                                icon={Flame}
                                                label="Ритуал"
                                                desc="Повторяющееся действие. Система, меняющая образ жизни."
                                            />
                                            <ArchetypeCard 
                                                type="insight" 
                                                selected={selectedType === 'insight'} 
                                                onClick={() => setSelectedType('insight')}
                                                icon={Book}
                                                label="Инсайт"
                                                desc="Глубокая рефлексия. Фиксация опыта в Дневнике."
                                            />
                                        </div>

                                        <div className="flex justify-center">
                                            <button 
                                                onClick={() => setStep('setup')}
                                                className="group flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold tracking-wide shadow-xl hover:scale-105 active:scale-95 transition-all"
                                            >
                                                Принять Вызов <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === 'setup' && (
                            <motion.div 
                                key="setup"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col h-full"
                            >
                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 mx-auto bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
                                        {selectedType === 'task' && <Kanban size={32} />}
                                        {selectedType === 'habit' && <Flame size={32} />}
                                        {selectedType === 'insight' && <Book size={32} />}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                        {selectedType === 'task' ? 'Создание Спринта' : selectedType === 'habit' ? 'Настройка Ритуала' : 'Фиксация Инсайта'}
                                    </h3>
                                </div>

                                <div className="space-y-6 max-w-md mx-auto w-full">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Название</label>
                                        <input 
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-medium text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                            placeholder="Назови этот шаг..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Суть (Контекст)</label>
                                        <textarea 
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 outline-none focus:border-indigo-500 transition-colors min-h-[120px] resize-none"
                                            placeholder="Опиши детали..."
                                        />
                                    </div>
                                </div>

                                <div className="mt-auto pt-8 flex justify-center gap-4">
                                    <button 
                                        onClick={() => setStep('analysis')}
                                        className="px-6 py-3 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        Назад
                                    </button>
                                    <button 
                                        onClick={handleCreate}
                                        disabled={!title}
                                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Подтвердить
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'complete' && (
                            <motion.div 
                                key="complete"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center h-full text-center"
                            >
                                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                                    <Target size={48} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Путь Начат!</h3>
                                <p className="text-slate-500">Артефакт успешно создан и добавлен в систему.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    </div>
  );
};

export default JourneyModal;
