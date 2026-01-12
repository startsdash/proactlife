
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { SPHERES, ICON_MAP, applyTypography } from '../constants';
import { Gem, Edit3, Trash2, Calendar, Search, Sparkles, Book, Link, ArrowRight, X, ChevronRight, Filter, Plus, Save, RotateCcw, BrainCircuit, Bot, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';

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

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const getJournalColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const formatTimelineDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
};

const findFirstUrl = (text: string): string | null => {
    const match = text.match(/(https?:\/\/[^\s\)]+)/);
    return match ? match[0] : null;
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-800 dark:text-slate-200 leading-relaxed font-serif" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
};

const Journal: React.FC<Props> = ({ 
    entries, mentorAnalyses, tasks, config, 
    addEntry, deleteEntry, updateEntry, 
    addMentorAnalysis, deleteMentorAnalysis,
    initialTaskId, onClearInitialTask, onNavigateToTask 
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [newEntryContent, setNewEntryContent] = useState('');
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    
    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

    // Initial Task Effect
    useEffect(() => {
        if (initialTaskId) {
            const task = tasks.find(t => t.id === initialTaskId);
            if (task) {
                setNewEntryContent(`\n\n> Рефлексия по задаче: **${task.title || 'Без названия'}**\n`);
                setIsInputExpanded(true);
            }
            onClearInitialTask?.();
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    const displayedEntries = useMemo(() => {
        return entries
            .filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const handleCreateEntry = () => {
        if (!newEntryContent.trim()) return;
        
        const entry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: newEntryContent,
            isInsight: false,
            linkedTaskId: initialTaskId || undefined
        };
        addEntry(entry);
        setNewEntryContent('');
        setIsInputExpanded(false);
    };

    const handleSaveEdit = () => {
        if (editingId) {
            const entry = entries.find(e => e.id === editingId);
            if (entry) {
                updateEntry({ ...entry, content: editContent });
            }
            setEditingId(null);
            setEditContent('');
        }
    };

    const startEditing = (entry: JournalEntry) => {
        setEditingId(entry.id);
        setEditContent(entry.content);
    };

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const analysisText = await analyzeJournalPath(entries, config);
            const analysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: analysisText,
                mentorName: 'AI Mentor'
            };
            addMentorAnalysis(analysis);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 z-10">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроника пути</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative group">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Поиск записей..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-colors w-full md:w-64"
                            />
                        </div>
                        <Tooltip content="Анализ пути (ИИ)">
                            <button 
                                onClick={runAnalysis}
                                disabled={isAnalyzing || entries.length < 3}
                                className="p-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-indigo-600 dark:text-indigo-400 hover:border-indigo-300 transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {isAnalyzing ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={20} />}
                            </button>
                        </Tooltip>
                    </div>
                </header>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
                {/* NEW ENTRY INPUT */}
                <div className={`mb-8 transition-all duration-300 ${isInputExpanded ? 'shadow-lg' : ''}`}>
                    {!isInputExpanded ? (
                        <div 
                            onClick={() => setIsInputExpanded(true)}
                            className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl p-4 cursor-text text-slate-400 flex items-center gap-3 hover:border-indigo-300 transition-colors shadow-sm"
                        >
                            <Edit3 size={18} />
                            <span>Записать мысль...</span>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#1e293b] border border-indigo-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                            <textarea 
                                className="w-full bg-transparent outline-none text-slate-800 dark:text-slate-200 font-serif text-base resize-none min-h-[120px] placeholder:text-slate-400"
                                placeholder="О чем думаешь?"
                                value={newEntryContent}
                                onChange={(e) => setNewEntryContent(e.target.value)}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                <button onClick={() => setIsInputExpanded(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Отмена</button>
                                <button onClick={handleCreateEntry} disabled={!newEntryContent.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">Сохранить</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* TIMELINE */}
                <div className="w-full relative">
                    {/* The Ghost Line */}
                    <div className="absolute left-[2rem] md:left-[3rem] top-8 bottom-8 border-l border-slate-900/5 dark:border-white/5 width-px" />

                    <div className="space-y-8">
                        {displayedEntries.length === 0 && mentorAnalyses.length === 0 ? (
                            <EmptyState icon={Book} title="Дневник пуст" description="Начни записывать свои мысли и наблюдения" />
                        ) : null}

                        {/* MENTOR ANALYSES */}
                        {mentorAnalyses.map(analysis => (
                            <div key={analysis.id} className="relative pl-14 md:pl-20 group">
                                <div className="absolute left-0 top-[2.25rem] w-[2rem] md:w-[3rem] text-right pr-2 select-none">
                                    <span className="font-mono text-[9px] text-violet-500 font-bold tracking-tighter block leading-none">AI</span>
                                </div>
                                <div className="absolute left-[2rem] md:left-[3rem] top-[2.25rem] -translate-x-1/2 -translate-y-1/2 z-10 bg-[#f8fafc] dark:bg-[#0f172a] p-1.5">
                                    <Bot size={16} className="text-violet-500" />
                                </div>
                                <div className="relative rounded-2xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/50 dark:bg-violet-900/10 p-6 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={14} className="text-violet-500" />
                                            <span className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">Анализ Ментора</span>
                                        </div>
                                        <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                    <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-serif">
                                        <ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown>
                                    </div>
                                    <div className="mt-4 text-[10px] text-violet-400 font-mono text-right">
                                        {new Date(analysis.date).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* ENTRIES */}
                        {displayedEntries.map(entry => {
                            const mentor = config.mentors.find(m => m.id === entry.mentorId);
                            const isEditing = editingId === entry.id;
                            const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
                            
                            const primarySphereId = entry.spheres?.[0];
                            const sphereConfig = SPHERES.find(s => s.id === primarySphereId);
                            const nodeColorClass = sphereConfig 
                                ? sphereConfig.text.replace('text-', 'border-') 
                                : 'border-slate-300 dark:border-slate-600';
                            const iconColorClass = 'text-violet-500';

                            return (
                                <div key={entry.id} className="relative pl-14 md:pl-20 group">
                                    {/* Time Label */}
                                    <div className="absolute left-0 top-[2.25rem] w-[2rem] md:w-[3rem] text-right pr-2 select-none">
                                        <span className="font-mono text-[9px] text-slate-300 dark:text-slate-600 font-bold tracking-tighter block leading-none">
                                            {formatTimelineDate(entry.date).split(' ')[0]}
                                        </span>
                                        <span className="font-mono text-slate-300 dark:text-slate-600 font-bold tracking-tighter block leading-none text-[8px] uppercase">
                                            {formatTimelineDate(entry.date).split(' ')[1]}
                                        </span>
                                    </div>

                                    {/* Node Marker */}
                                    <div className="absolute left-[2rem] md:left-[3rem] top-[2.25rem] -translate-x-1/2 -translate-y-1/2 z-10 bg-[#f8fafc] dark:bg-[#0f172a] p-1.5 transition-colors duration-300">
                                        {entry.isInsight ? (
                                            <Gem size={10} strokeWidth={2} className={iconColorClass} />
                                        ) : (
                                            <div className={`w-1.5 h-1.5 rounded-full bg-transparent border-[1.5px] ${nodeColorClass}`} />
                                        )}
                                    </div>

                                    {/* Entry Card */}
                                    <div 
                                        onClick={() => setSelectedEntryId(entry.id)} 
                                        className={`relative rounded-2xl border transition-all duration-300 group cursor-default overflow-hidden
                                            ${entry.isInsight 
                                                ? 'bg-gradient-to-br from-violet-50/80 via-fuchsia-50/50 to-white dark:from-violet-900/20 dark:via-fuchsia-900/10 dark:to-[#1e293b] border-violet-200/50 dark:border-violet-800/30 shadow-sm' 
                                                : `${getJournalColorClass(entry.color)} border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md`
                                            }
                                        `}
                                    >
                                        {entry.coverUrl && (
                                            <div className="h-32 w-full overflow-hidden relative">
                                                <img src={entry.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                            </div>
                                        )}

                                        <div className="p-5 md:p-6">
                                            {isEditing ? (
                                                <div className="flex flex-col gap-2">
                                                    <textarea 
                                                        className="w-full bg-transparent outline-none text-slate-800 dark:text-slate-200 font-serif text-base resize-none min-h-[100px]"
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-slate-500 hover:bg-black/5 rounded">Отмена</button>
                                                        <button onClick={handleSaveEdit} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Сохранить</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    {entry.title && <h3 className="font-sans text-lg font-bold text-slate-900 dark:text-white mb-2">{entry.title}</h3>}
                                                    <div className="text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed font-serif whitespace-pre-wrap">
                                                        <ReactMarkdown components={markdownComponents}>{applyTypography(entry.content)}</ReactMarkdown>
                                                    </div>
                                                    
                                                    {linkedTask && (
                                                        <div 
                                                            className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 cursor-pointer group/link"
                                                            onClick={(e) => { e.stopPropagation(); onNavigateToTask?.(linkedTask.id); }}
                                                        >
                                                            <Link size={12} className="text-indigo-400" />
                                                            <span className="text-xs font-mono text-slate-500 group-hover/link:text-indigo-500 transition-colors">Задача: {linkedTask.title || 'Untitled'}</span>
                                                            <ArrowRight size={10} className="text-slate-300 -ml-1 opacity-0 group-hover/link:opacity-100 group-hover/link:ml-0 transition-all" />
                                                        </div>
                                                    )}

                                                    {entry.mood && (
                                                        <div className="mt-4 flex flex-wrap gap-2">
                                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                                Mood: {entry.mood}/5
                                                            </span>
                                                            {entry.moodTags?.map(tag => (
                                                                <span key={tag} className="px-2 py-1 bg-slate-50 dark:bg-slate-800/50 rounded text-[10px] text-slate-400">#{tag}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {mentor && (
                                                        <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                                                            <span>Inspired by {mentor.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg p-1">
                                            <button onClick={(e) => { e.stopPropagation(); updateEntry({...entry, isInsight: !entry.isInsight}); }} className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${entry.isInsight ? 'text-violet-500' : 'text-slate-400'}`}>
                                                <Gem size={14} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); startEditing(entry); }} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                                                <Edit3 size={14} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); if(confirm("В архив?")) deleteEntry(entry.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Journal;
