
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { MOOD_TAGS, SPHERES, ICON_MAP } from '../constants';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';
import { Book, Plus, Trash2, Edit2, X, Sparkles, Calendar, Search, Link2, Gem, BrainCircuit, Check, ChevronDown, Filter, MoreHorizontal, Bot, ArrowRight, Quote } from 'lucide-react';

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

const MOODS = [
    { value: 1, label: 'Ужасно', emoji: '😖', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { value: 2, label: 'Плохо', emoji: '😕', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { value: 3, label: 'Нормально', emoji: '😐', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { value: 4, label: 'Хорошо', emoji: '🙂', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    { value: 5, label: 'Отлично', emoji: '🤩', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
];

const JournalEntrySphereSelector = ({ entry, updateEntry, align = 'right', direction = 'down' }: { entry: JournalEntry, updateEntry: (e: JournalEntry) => void, align?: 'left' | 'right', direction?: 'up' | 'down' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSphere = (sphereId: string) => {
        const current = entry.spheres || [];
        const newSpheres = current.includes(sphereId) 
            ? current.filter(s => s !== sphereId)
            : [...current, sphereId];
        updateEntry({ ...entry, spheres: newSpheres });
    };

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors ${entry.spheres?.length ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 hover:text-slate-500'}`}
            >
                {entry.spheres?.length ? (
                    <div className="flex -space-x-1">
                        {entry.spheres.map(s => {
                            const sphere = SPHERES.find(sp => sp.id === s);
                            return sphere ? <div key={s} className={`w-2 h-2 rounded-full ${sphere.bg.replace('50', '400').replace('/30','')}`} /> : null;
                        })}
                    </div>
                ) : <Filter size={12} />}
                <span>{entry.spheres?.length ? '' : 'Сфера'}</span>
            </button>

            {isOpen && (
                <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} ${align === 'right' ? 'right-0' : 'left-0'} w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5`}>
                    {SPHERES.map(s => {
                        const isSelected = entry.spheres?.includes(s.id);
                        const Icon = ICON_MAP[s.icon];
                        return (
                            <button
                                key={s.id}
                                onClick={(e) => { e.stopPropagation(); toggleSphere(s.id); }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                {Icon && <Icon size={12} className={isSelected ? s.text : 'text-slate-400'} />}
                                <span className="flex-1">{s.label}</span>
                                {isSelected && <Check size={12} className="text-indigo-500" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

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
    const [content, setContent] = useState('');
    const [mood, setMood] = useState<number | undefined>(undefined);
    const [moodTags, setMoodTags] = useState<string[]>([]);
    const [linkedTaskId, setLinkedTaskId] = useState<string | null>(initialTaskId || null);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Initial Task Handling
    useEffect(() => {
        if (initialTaskId) {
            setLinkedTaskId(initialTaskId);
            setIsExpanded(true);
            onClearInitialTask?.();
        }
    }, [initialTaskId, onClearInitialTask]);

    const handleSave = () => {
        if (!content.trim()) return;

        if (editingId) {
            const entry = entries.find(e => e.id === editingId);
            if (entry) {
                updateEntry({
                    ...entry,
                    content,
                    mood,
                    moodTags,
                    linkedTaskId: linkedTaskId || undefined
                });
            }
            setEditingId(null);
        } else {
            addEntry({
                id: Date.now().toString(),
                date: Date.now(),
                content,
                mood,
                moodTags,
                linkedTaskId: linkedTaskId || undefined,
                isInsight: false
            });
        }
        resetForm();
        setIsExpanded(false);
    };

    const resetForm = () => {
        setContent('');
        setMood(undefined);
        setMoodTags([]);
        setLinkedTaskId(null);
        setEditingId(null);
    };

    const startEditing = (entry: JournalEntry) => {
        setContent(entry.content);
        setMood(entry.mood);
        setMoodTags(entry.moodTags || []);
        setLinkedTaskId(entry.linkedTaskId || null);
        setEditingId(entry.id);
        setIsExpanded(true);
    };

    const handleAnalyze = async () => {
        if (entries.length < 3) {
            alert('Нужно минимум 3 записи для анализа');
            return;
        }
        setIsAnalyzing(true);
        try {
            const result = await analyzeJournalPath(entries, config);
            addMentorAnalysis({
                id: Date.now().toString(),
                date: Date.now(),
                content: result,
                mentorName: 'AI Mentor'
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleInsight = (entry: JournalEntry) => {
        updateEntry({ ...entry, isInsight: !entry.isInsight });
    };

    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const activeLinkedTask = tasks.find(t => t.id === linkedTaskId);

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            
            {/* Header */}
            <div className="shrink-0 p-4 md:p-8 pb-4">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники Пути</p>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Поиск записей..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <Tooltip content="Анализ пути (ИИ)">
                            <button 
                                onClick={handleAnalyze} 
                                disabled={isAnalyzing}
                                className="p-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-all disabled:opacity-50"
                            >
                                {isAnalyzing ? <Sparkles size={20} className="animate-spin" /> : <BrainCircuit size={20} />}
                            </button>
                        </Tooltip>
                    </div>
                </header>

                {/* Create/Edit Area */}
                <div className={`bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300 overflow-hidden ${isExpanded ? 'p-4 md:p-6 ring-2 ring-indigo-50 dark:ring-indigo-900/20' : 'p-2'}`}>
                    {!isExpanded ? (
                        <div onClick={() => setIsExpanded(true)} className="flex items-center gap-3 p-2 cursor-text text-slate-400">
                            <Edit2 size={18} />
                            <span className="text-sm font-medium">Новая запись...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2">
                            <textarea 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="О чем думаешь?"
                                className="w-full min-h-[120px] bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-base font-serif leading-relaxed placeholder:text-slate-300 resize-none"
                                autoFocus
                            />
                            
                            {activeLinkedTask && (
                                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg text-xs text-indigo-700 dark:text-indigo-300">
                                    <Link2 size={12} />
                                    <span className="truncate flex-1 font-medium">{activeLinkedTask.title || activeLinkedTask.content}</span>
                                    <button onClick={() => setLinkedTaskId(null)} className="hover:bg-indigo-100 dark:hover:bg-indigo-800 p-1 rounded transition-colors"><X size={12}/></button>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-1 mr-4">
                                    {MOODS.map(m => (
                                        <button 
                                            key={m.value}
                                            onClick={() => setMood(mood === m.value ? undefined : m.value)}
                                            className={`text-lg p-1 transition-transform hover:scale-125 ${mood === m.value ? 'scale-125 grayscale-0' : 'grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
                                            title={m.label}
                                        >
                                            {m.emoji}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex-1" />
                                <button onClick={() => { resetForm(); setIsExpanded(false); }} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors">Отмена</button>
                                <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">
                                    {editingId ? 'Сохранить' : 'Записать'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-12">
                <div className="max-w-3xl mx-auto space-y-8">
                    
                    {/* Mentor Analyses */}
                    {mentorAnalyses.length > 0 && (
                        <div className="space-y-4 mb-8">
                            {mentorAnalyses.map(analysis => (
                                <div key={analysis.id} className="bg-gradient-to-br from-violet-50 to-white dark:from-violet-900/20 dark:to-[#1e293b] p-6 rounded-2xl border border-violet-100 dark:border-violet-800/50 shadow-sm relative group">
                                    <div className="flex items-center gap-2 mb-4 text-violet-600 dark:text-violet-400">
                                        <Bot size={18} />
                                        <span className="text-xs font-bold uppercase tracking-widest">{analysis.mentorName}</span>
                                        <span className="text-xs opacity-50 ml-auto">{new Date(analysis.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none font-serif">
                                        <ReactMarkdown>{analysis.content}</ReactMarkdown>
                                    </div>
                                    <button 
                                        onClick={() => deleteMentorAnalysis(analysis.id)}
                                        className="absolute top-4 right-4 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredEntries.length === 0 ? (
                        <div className="py-12">
                            <EmptyState icon={Book} title="Чистая страница" description="История начинается с первого слова" color="cyan" />
                        </div>
                    ) : (
                        <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 md:ml-8 space-y-8 pl-8 md:pl-12 py-4">
                            {filteredEntries.map(entry => {
                                const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
                                const moodConfig = entry.mood ? MOODS[entry.mood - 1] : null;

                                return (
                                    <div key={entry.id} className="relative group">
                                        {/* Timeline Node */}
                                        <div className={`absolute -left-[41px] md:-left-[57px] top-0 w-5 h-5 rounded-full border-4 border-[#f8fafc] dark:border-[#0f172a] ${entry.isInsight ? 'bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]' : 'bg-slate-300 dark:bg-slate-700'}`} />
                                        
                                        <div className={`bg-white dark:bg-[#1e293b] rounded-2xl p-6 border transition-all hover:shadow-md ${entry.isInsight ? 'border-indigo-200 dark:border-indigo-900 shadow-indigo-100 dark:shadow-none' : 'border-slate-200 dark:border-slate-700 shadow-sm'}`}>
                                            
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                                                        {new Date(entry.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {entry.isInsight && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                            <Gem size={10} /> Insight
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEditing(entry)} className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"><Edit2 size={16} /></button>
                                                    <button onClick={() => { if(confirm('Удалить?')) deleteEntry(entry.id) }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </div>

                                            {/* Linked Task Context */}
                                            {linkedTask && (
                                                <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => onNavigateToTask?.(linkedTask.id)}>
                                                    <Link2 size={14} className="text-indigo-400 shrink-0" />
                                                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">{linkedTask.content}</span>
                                                    <ArrowRight size={12} className="text-slate-300 ml-auto" />
                                                </div>
                                            )}

                                            {/* Content */}
                                            <div className="prose prose-sm dark:prose-invert max-w-none font-serif text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                                                <ReactMarkdown>{entry.content}</ReactMarkdown>
                                            </div>

                                            {/* Footer */}
                                            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                <div className="flex items-center gap-3">
                                                    {moodConfig && (
                                                        <span className="text-lg" title={moodConfig.label}>{moodConfig.emoji}</span>
                                                    )}
                                                    {entry.moodTags?.map(tagId => {
                                                        const tag = MOOD_TAGS.find(t => t.id === tagId);
                                                        return tag ? <span key={tagId} className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{tag.label}</span> : null;
                                                    })}
                                                </div>
                                                
                                                <div className="flex items-center gap-4">
                                                    <JournalEntrySphereSelector entry={entry} updateEntry={updateEntry} align="right" direction="up" />
                                                    
                                                    <button 
                                                        onClick={() => toggleInsight(entry)} 
                                                        className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${entry.isInsight ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 hover:text-slate-500'}`}
                                                    >
                                                        <Gem size={14} className={entry.isInsight ? "fill-current" : ""} />
                                                        {entry.isInsight ? 'INSIGHT' : 'MARK INSIGHT'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Journal;
