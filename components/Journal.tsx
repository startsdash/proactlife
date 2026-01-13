import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { Book, Plus, Search, Calendar, Sparkles, X, ChevronRight, Hash, Trash2, Edit2, Save, Bot, History, BrainCircuit, Link, ChevronLeft, RefreshCw } from 'lucide-react';

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
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
  onNavigateToTask?: (taskId: string) => void;
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
    const [newEntryContent, setNewEntryContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingContent, setEditingContent] = useState('');
    const [linkedTaskId, setLinkedTaskId] = useState<string | null>(initialTaskId || null);
    
    // Analysis State
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        if (initialTaskId) {
            setIsWriting(true);
            setLinkedTaskId(initialTaskId);
            onClearInitialTask?.();
        }
    }, [initialTaskId, onClearInitialTask]);

    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const handleSave = () => {
        if (!newEntryContent.trim()) return;
        const entry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: applyTypography(newEntryContent),
            linkedTaskId: linkedTaskId || undefined,
            isInsight: false
        };
        addEntry(entry);
        setNewEntryContent('');
        setLinkedTaskId(null);
        setIsWriting(false);
    };

    const handleUpdate = () => {
        if (!selectedEntry || !editingContent.trim()) return;
        updateEntry({ ...selectedEntry, content: applyTypography(editingContent) });
        setIsEditing(false);
        setSelectedEntry(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Удалить запись?")) {
            deleteEntry(id);
            if (selectedEntry?.id === id) setSelectedEntry(null);
        }
    };

    const runAnalysis = async () => {
        if (entries.length < 3) {
            alert("Нужно хотя бы 3 записи для анализа");
            return;
        }
        setIsAnalyzing(true);
        setIsAnalysisOpen(true);
        try {
            const result = await analyzeJournalPath(entries, config);
            setAnalysisResult(result);
        } catch (e) {
            setAnalysisResult("Ошибка анализа. Попробуйте позже.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveAnalysis = () => {
        if (!analysisResult) return;
        const analysis: MentorAnalysis = {
            id: Date.now().toString(),
            date: Date.now(),
            content: analysisResult,
            mentorName: 'AI Mentor'
        };
        addMentorAnalysis(analysis);
        setAnalysisResult(null);
        setIsAnalysisOpen(false);
        setShowHistory(true);
    };

    const getLinkedTaskTitle = (id?: string) => {
        if (!id) return null;
        const t = tasks.find(task => task.id === id);
        return t ? (t.title || 'Задача без названия') : 'Неизвестная задача';
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-8 pb-0 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 z-10">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники пути</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowHistory(!showHistory)} className={`p-3 rounded-2xl border transition-all ${showHistory ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-600' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                        <History size={20} />
                    </button>
                    <button onClick={runAnalysis} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm group">
                        <Sparkles size={18} className="group-hover:text-indigo-500 transition-colors" />
                        <span className="text-sm font-bold uppercase tracking-wider">Анализ</span>
                    </button>
                    <button onClick={() => setIsWriting(true)} className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl hover:scale-105 transition-transform shadow-lg">
                        <Plus size={20} />
                        <span className="text-sm font-bold uppercase tracking-wider">Запись</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            {!isWriting && !showHistory && (
                <div className="px-4 md:px-8 py-6 z-10">
                    <div className="relative max-w-md">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск по записям..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:border-indigo-400 transition-colors placeholder:text-slate-400 text-slate-800 dark:text-slate-200"
                        />
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20 relative z-0">
                {/* Timeline Line */}
                <div className="absolute left-8 md:left-12 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />

                <AnimatePresence mode="wait">
                    {showHistory ? (
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="max-w-3xl mx-auto space-y-8 py-8"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <ChevronLeft size={24} className="text-slate-400" />
                                </button>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">История менторства</h2>
                            </div>
                            
                            {mentorAnalyses.length === 0 ? (
                                <EmptyState icon={BrainCircuit} title="История пуста" description="Запросите анализ у ИИ-ментора, чтобы получить инсайты" />
                            ) : (
                                mentorAnalyses.map(analysis => (
                                    <div key={analysis.id} className="bg-white dark:bg-[#1e293b] rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm relative group">
                                        <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => deleteMentorAnalysis(analysis.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                                <Bot size={24} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{new Date(analysis.date).toLocaleDateString()}</div>
                                                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{analysis.mentorName}</div>
                                            </div>
                                        </div>
                                        <div className="prose dark:prose-invert prose-sm max-w-none text-slate-600 dark:text-slate-300 font-serif leading-relaxed">
                                            <ReactMarkdown>{analysis.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    ) : filteredEntries.length === 0 ? (
                        <div className="pl-12 py-12">
                            <EmptyState icon={Book} title="Дневник пуст" description="Самое время записать свои мысли" color="cyan" />
                        </div>
                    ) : (
                        <div className="space-y-12 py-8">
                            {filteredEntries.map(entry => (
                                <motion.div 
                                    key={entry.id} 
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative pl-12 md:pl-16 group"
                                >
                                    {/* Timeline Dot */}
                                    <div className="absolute left-0 top-0 w-8 md:w-10 text-right">
                                        <div className="text-xl font-bold text-slate-300 dark:text-slate-600 font-serif">{new Date(entry.date).getDate()}</div>
                                        <div className="text-[9px] uppercase font-bold text-slate-300 dark:text-slate-600">{new Date(entry.date).toLocaleDateString('ru-RU', { month: 'short' })}</div>
                                    </div>
                                    <div className="absolute left-[31px] md:left-[47px] top-3 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-[#f8fafc] dark:ring-[#0f172a]" />

                                    <div onClick={() => { setSelectedEntry(entry); setEditingContent(entry.content); setIsEditing(false); }} className="cursor-pointer">
                                        <div className="text-lg md:text-xl font-serif text-slate-800 dark:text-slate-200 leading-relaxed mb-3 line-clamp-4 hover:line-clamp-none transition-all">
                                            <ReactMarkdown className="prose dark:prose-invert max-w-none">{entry.content}</ReactMarkdown>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="text-xs font-mono text-slate-400">{new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            {entry.linkedTaskId && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs text-slate-500 max-w-[200px] truncate" title={getLinkedTaskTitle(entry.linkedTaskId) || ''}>
                                                    <Link size={12} />
                                                    <span className="truncate">{getLinkedTaskTitle(entry.linkedTaskId)}</span>
                                                </div>
                                            )}
                                            {entry.mood && (
                                                <div className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md text-xs font-bold">
                                                    Настроение: {entry.mood}/5
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Editor Modal */}
            <AnimatePresence>
                {isWriting && (
                    <motion.div 
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        className="fixed inset-0 z-50 bg-white dark:bg-[#0f172a] md:inset-x-auto md:inset-y-0 md:right-0 md:w-[600px] shadow-2xl flex flex-col"
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                    <Edit2 size={20} className="text-slate-600 dark:text-slate-300" />
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-slate-200">Новая запись</h3>
                            </div>
                            <button onClick={() => { setIsWriting(false); setLinkedTaskId(null); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 p-6 overflow-y-auto">
                            {linkedTaskId && (
                                <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <Link size={16} className="text-indigo-500 shrink-0" />
                                        <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200 truncate">
                                            {getLinkedTaskTitle(linkedTaskId)}
                                        </span>
                                    </div>
                                    <button onClick={() => setLinkedTaskId(null)} className="text-indigo-400 hover:text-indigo-600 p-1">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            <textarea 
                                autoFocus
                                className="w-full h-full bg-transparent border-none outline-none text-lg font-serif text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none leading-relaxed"
                                placeholder="О чем ты думаешь?..."
                                value={newEntryContent}
                                onChange={(e) => setNewEntryContent(e.target.value)}
                            />
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-[#0f172a]/50 backdrop-blur-sm">
                            <button 
                                onClick={handleSave}
                                disabled={!newEntryContent.trim()}
                                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                            >
                                Сохранить
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Entry Details Modal */}
            <AnimatePresence>
                {selectedEntry && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSelectedEntry(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                                <div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        {new Date(selectedEntry.date).toLocaleDateString()} • {new Date(selectedEntry.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </div>
                                    {selectedEntry.linkedTaskId && onNavigateToTask && (
                                        <button 
                                            onClick={() => { onNavigateToTask(selectedEntry.linkedTaskId!); setSelectedEntry(null); }}
                                            className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-600 text-sm font-medium transition-colors mt-2"
                                        >
                                            <Link size={14} />
                                            {getLinkedTaskTitle(selectedEntry.linkedTaskId)} <ChevronRight size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {!isEditing && (
                                        <>
                                            <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(selectedEntry.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => setSelectedEntry(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar-light">
                                {isEditing ? (
                                    <textarea 
                                        className="w-full h-full min-h-[300px] bg-transparent border-none outline-none font-serif text-lg text-slate-800 dark:text-slate-200 resize-none leading-relaxed"
                                        value={editingContent}
                                        onChange={(e) => setEditingContent(e.target.value)}
                                    />
                                ) : (
                                    <div className="prose dark:prose-invert max-w-none font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200">
                                        <ReactMarkdown>{selectedEntry.content}</ReactMarkdown>
                                    </div>
                                )}
                            </div>

                            {isEditing && (
                                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                                    <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium">Отмена</button>
                                    <button onClick={handleUpdate} className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg">Сохранить</button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Analysis Modal */}
            <AnimatePresence>
                {isAnalysisOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl"
                            onClick={() => !isAnalyzing && setIsAnalysisOpen(false)}
                        />
                        
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-3xl bg-white dark:bg-[#1e293b] rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[80vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse" />
                                        <BrainCircuit size={64} className="text-indigo-500 animate-pulse relative z-10" />
                                    </div>
                                    <h3 className="text-xl font-light text-slate-800 dark:text-white tracking-tight">Синтез паттернов...</h3>
                                    <p className="text-sm text-slate-400 mt-2 font-mono uppercase tracking-widest animate-pulse">Анализирую записи</p>
                                </div>
                            ) : (
                                <>
                                    <div className="p-8 pb-0 flex justify-between items-start shrink-0">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 dark:text-indigo-400">
                                                <Bot size={24} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI MENTOR</div>
                                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Анализ Пути</h3>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsAnalysisOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="p-8 overflow-y-auto custom-scrollbar-light">
                                        <div className="prose dark:prose-invert max-w-none font-serif text-lg leading-relaxed">
                                            <ReactMarkdown>{analysisResult || ''}</ReactMarkdown>
                                        </div>
                                    </div>

                                    {/* HOLOGRAM FOOTER */}
                                    <div className="p-8 pt-8 flex justify-center shrink-0 border-t border-slate-100 dark:border-slate-800">
                                        <button 
                                            onClick={handleSaveAnalysis} 
                                            className="group flex items-center gap-3 px-8 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-300"
                                        >
                                            <Save size={16} />
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Сохранить в историю</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Journal;