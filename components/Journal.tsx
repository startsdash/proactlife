import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { Book, Plus, Calendar, Edit3, Trash2, Zap, BrainCircuit, X, Search, ChevronRight, PenTool, Link, Sparkles, Filter, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';
import { applyTypography } from '../constants';

interface Props {
  entries: JournalEntry[];
  mentorAnalyses: MentorAnalysis[];
  tasks: Task[];
  config: AppConfig;
  addEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (entry: JournalEntry) => void;
  addMentorAnalysis: (analysis: MentorAnalysis) => void;
  deleteMentorAnalysis: (id: string) => void;
  initialTaskId: string | null;
  onClearInitialTask: () => void;
  onNavigateToTask: (taskId: string) => void;
}

const Journal: React.FC<Props> = ({ 
    entries, 
    mentorAnalyses, 
    tasks, 
    config, 
    addEntry, 
    deleteEntry, 
    updateEntry, 
    addMentorAnalysis, 
    deleteMentorAnalysis,
    initialTaskId,
    onClearInitialTask,
    onNavigateToTask
}) => {
    const [isWriting, setIsWriting] = useState(false);
    const [content, setContent] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [linkedTaskId, setLinkedTaskId] = useState<string | null>(initialTaskId);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentAnalysis, setCurrentAnalysis] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (initialTaskId) {
            setLinkedTaskId(initialTaskId);
            setIsWriting(true);
            onClearInitialTask();
        }
    }, [initialTaskId, onClearInitialTask]);

    const sortedEntries = useMemo(() => 
        entries.filter(e => 
            e.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (e.title && e.title.toLowerCase().includes(searchQuery.toLowerCase()))
        ).sort((a, b) => b.date - a.date), 
    [entries, searchQuery]);

    const handleSave = () => {
        if (!content.trim()) return;
        
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: applyTypography(content),
            linkedTaskId: linkedTaskId || undefined,
            isInsight: false
        };
        addEntry(newEntry);
        setContent('');
        setLinkedTaskId(null);
        setIsWriting(false);
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setCurrentAnalysis(null);
        setShowAnalysisModal(true);
        
        try {
            const result = await analyzeJournalPath(entries, config);
            setCurrentAnalysis(result);
        } catch (e) {
            console.error(e);
            setCurrentAnalysis("Не удалось провести анализ. Попробуйте позже.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveAnalysis = () => {
        if (currentAnalysis) {
            addMentorAnalysis({
                id: Date.now().toString(),
                date: Date.now(),
                content: currentAnalysis,
                mentorName: 'AI Mentor'
            });
            setShowAnalysisModal(false);
            setCurrentAnalysis(null);
        }
    };

    const getTaskTitle = (id?: string) => {
        if (!id) return null;
        const task = tasks.find(t => t.id === id);
        return task ? (task.title || 'Задача без названия') : 'Неизвестная задача';
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-6 z-10 shrink-0">
                <header className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроника пути</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleAnalyze} 
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                        >
                            <BrainCircuit size={16} /> Анализ пути
                        </button>
                        <button 
                            onClick={() => setIsWriting(true)} 
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-medium hover:shadow-lg transition-all"
                        >
                            <Plus size={16} /> Новая запись
                        </button>
                    </div>
                </header>

                <div className="relative max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Поиск по записям..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
                {isWriting && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 bg-white dark:bg-[#1e293b] rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Новая запись</h3>
                            <button onClick={() => setIsWriting(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={18} /></button>
                        </div>
                        
                        {linkedTaskId && (
                            <div className="mb-4 flex items-center gap-2 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-lg w-fit">
                                <Link size={12} />
                                <span>Контекст: {getTaskTitle(linkedTaskId)}</span>
                                <button onClick={() => setLinkedTaskId(null)} className="ml-2 hover:text-indigo-800 dark:hover:text-indigo-200"><X size={12} /></button>
                            </div>
                        )}

                        <textarea 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="О чем ты думаешь?..."
                            className="w-full h-40 bg-transparent border-none outline-none resize-none text-base text-slate-800 dark:text-slate-200 font-serif leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            autoFocus
                        />
                        
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                                Сохранить
                            </button>
                        </div>
                    </motion.div>
                )}

                {sortedEntries.length === 0 ? (
                    <EmptyState 
                        icon={Book} 
                        title="Чистая страница" 
                        description="История твоих побед и открытий начинается здесь" 
                        actionLabel="Написать"
                        onAction={() => setIsWriting(true)}
                        color="cyan"
                    />
                ) : (
                    <div className="max-w-3xl mx-auto space-y-8">
                        {sortedEntries.map(entry => (
                            <div key={entry.id} className="relative group">
                                <div className="absolute left-[-28px] top-4 w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-[#f8fafc] dark:border-[#0f172a] z-10" />
                                <div className="absolute left-[-23px] top-6 bottom-[-32px] w-px bg-slate-200 dark:bg-slate-700 last:hidden" />
                                
                                <div className="bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-[#1e293b] hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                                                {new Date(entry.date).toLocaleDateString()}
                                            </span>
                                            <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">
                                                {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => updateEntry({...entry, isInsight: !entry.isInsight})}
                                                className={`p-1.5 rounded-lg transition-colors ${entry.isInsight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                                            >
                                                <Zap size={14} className={entry.isInsight ? "fill-current" : ""} />
                                            </button>
                                            <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {entry.linkedTaskId && (
                                        <div 
                                            className="mb-4 inline-flex items-center gap-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                            onClick={() => onNavigateToTask(entry.linkedTaskId!)}
                                        >
                                            <Link size={10} />
                                            <span>{getTaskTitle(entry.linkedTaskId)}</span>
                                            <ChevronRight size={10} />
                                        </div>
                                    )}

                                    <div className="prose prose-sm dark:prose-invert font-serif leading-relaxed text-slate-700 dark:text-slate-300 max-w-none">
                                        <ReactMarkdown>{entry.content}</ReactMarkdown>
                                    </div>
                                    
                                    {entry.mood && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                            <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                Mood: {entry.mood}/5
                                            </div>
                                            {entry.moodTags?.map(tag => (
                                                <div key={tag} className="px-2 py-1 bg-slate-50 dark:bg-slate-800/50 rounded text-[10px] text-slate-400">
                                                    #{tag}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ANALYSIS MODAL */}
            <AnimatePresence>
                {showAnalysisModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowAnalysisModal(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-2xl max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                        <BrainCircuit size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">Анализ Пути</h3>
                                        <p className="text-xs text-slate-500">AI Mentor Insight</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAnalysisModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar-light">
                                {isAnalyzing ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                        <RefreshCw size={32} className="animate-spin mb-4 text-indigo-500" />
                                        <p className="text-sm">Анализирую записи...</p>
                                    </div>
                                ) : currentAnalysis ? (
                                    <div className="prose prose-sm dark:prose-invert font-serif max-w-none leading-relaxed">
                                        <ReactMarkdown>{currentAnalysis}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        <p>Нет данных для отображения.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
                                <button onClick={() => setShowAnalysisModal(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium">Закрыть</button>
                                {currentAnalysis && (
                                    <button 
                                        onClick={handleSaveAnalysis}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                                    >
                                        <Sparkles size={16} /> Сохранить в историю
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Journal;