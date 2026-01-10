import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { SPHERES, ICON_MAP } from '../constants';
import { Book, Gem, X, Check, Search, Calendar, Filter, Plus, Trash2, Edit3, Sparkles, Bot, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-500 hover:underline" {...props} />,
};

const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
    const Icon = ICON_MAP[name] || ICON_MAP['User'];
    return <Icon className={className} />;
};

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const formatTimelineDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const day = d.getDate();
    const month = d.toLocaleDateString('ru-RU', { month: 'short' });
    return `${day} ${month}`;
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
    const [searchQuery, setSearchQuery] = useState('');
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showInsightsOnly, setShowInsightsOnly] = useState(false);

    useEffect(() => {
        if (initialTaskId) {
            setSearchQuery(`task:${initialTaskId}`);
            // Logic to clear initial task id can be handled when search is cleared or component unmounts
            // For now, we just set the filter.
        }
    }, [initialTaskId]);

    const displayedEntries = useMemo(() => {
        let filtered = entries.sort((a, b) => b.date - a.date);

        if (initialTaskId) {
             // Specific filtering logic if initialTaskId is present, 
             // although we just set searchQuery above, cleaner to filter directly if prop exists
             filtered = filtered.filter(e => e.linkedTaskId === initialTaskId);
        } else if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(e => 
                e.content.toLowerCase().includes(q) ||
                (e.linkedTaskId && tasks.find(t => t.id === e.linkedTaskId)?.title?.toLowerCase().includes(q))
            );
        }

        if (showInsightsOnly) {
            filtered = filtered.filter(e => e.isInsight);
        }

        return filtered;
    }, [entries, searchQuery, showInsightsOnly, initialTaskId, tasks]);

    const hasActiveDateFilter = false; // Placeholder if date filtering is added later

    const handleCreate = () => {
        if (!newContent.trim()) return;
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: newContent,
            isInsight: false
        };
        addEntry(newEntry);
        setNewContent('');
        setIsInputExpanded(false);
    };

    const toggleInsight = (entry: JournalEntry) => {
        updateEntry({ ...entry, isInsight: !entry.isInsight });
    };

    const startEditing = (entry: JournalEntry) => {
        setEditingId(entry.id);
        setEditContent(entry.content);
    };

    const saveEdit = (entry: JournalEntry) => {
        updateEntry({ ...entry, content: editContent });
        setEditingId(null);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent('');
    };

    const handleAIAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const analysis = await analyzeJournalPath(entries, config);
            addMentorAnalysis({
                id: Date.now().toString(),
                date: Date.now(),
                content: analysis,
                mentorName: 'AI Mentor'
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a]">
            {/* Header */}
            <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-6 shrink-0">
                <header className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники пути</p>
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setShowInsightsOnly(!showInsightsOnly)}
                            className={`p-2 rounded-xl border transition-colors ${showInsightsOnly ? 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-400' : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'}`}
                         >
                             <Gem size={20} />
                         </button>
                         <button 
                            onClick={handleAIAnalysis}
                            disabled={isAnalyzing}
                            className="p-2 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition-colors disabled:opacity-50"
                         >
                             {isAnalyzing ? <RefreshCw size={20} className="animate-spin"/> : <Sparkles size={20} />}
                         </button>
                    </div>
                </header>

                <div className="relative mb-6">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Поиск по записям..." 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); if(onClearInitialTask && initialTaskId) onClearInitialTask(); }}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-shadow shadow-sm placeholder:text-slate-400" 
                    />
                    {initialTaskId && (
                        <button onClick={() => { if(onClearInitialTask) onClearInitialTask(); setSearchQuery(''); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* New Entry Input */}
                <div className={`bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300 ${isInputExpanded ? 'p-4' : 'p-2'}`}>
                    {isInputExpanded ? (
                        <div className="flex flex-col gap-3">
                            <textarea 
                                autoFocus
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                placeholder="О чем думаешь?"
                                className="w-full h-32 bg-transparent resize-none outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 font-serif leading-relaxed"
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsInputExpanded(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Отмена</button>
                                <button onClick={handleCreate} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors">Записать</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsInputExpanded(true)} className="w-full text-left px-4 py-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-3">
                            <Plus size={20} />
                            <span>Новая запись...</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light pb-20">
                {displayedEntries.length === 0 ? (
                    <div className="py-10 px-4 md:px-8">
                        <EmptyState 
                            icon={Book} 
                            title="Страницы пусты" 
                            description={searchQuery || hasActiveDateFilter ? 'Ничего не найдено по вашему запросу' : 'Записывай свои мысли, связывай их с задачами, чтобы отслеживать свой путь'}
                            color="cyan"
                        />
                    </div>
                ) : (
                    <div className="w-full px-4 md:px-8">
                        <div className="max-w-3xl mx-auto w-full relative">
                            {/* The Ghost Line */}
                            <div className="absolute left-[3rem] md:left-[4rem] top-8 bottom-8 border-l border-slate-900/5 dark:border-white/5 width-px" />

                            <div className="space-y-8">
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
                                        <div key={entry.id} className="relative pl-20 md:pl-28 group">
                                            {/* Time Label */}
                                            <div className="absolute left-0 top-[2.25rem] w-[2.5rem] md:w-[3.5rem] text-right pr-2 select-none">
                                                <span className="font-mono text-[9px] text-slate-300 dark:text-slate-600 font-bold tracking-tighter block leading-none">
                                                    {formatTimelineDate(entry.date).split(' ')[0]}
                                                </span>
                                                <span className="font-mono text-slate-300 dark:text-slate-600 font-bold tracking-tighter block leading-none text-[8px] uppercase">
                                                    {formatTimelineDate(entry.date).split(' ')[1]}
                                                </span>
                                            </div>

                                            {/* Node Marker */}
                                            <div className="absolute left-[3rem] md:left-[4rem] top-[2.25rem] -translate-x-1/2 -translate-y-1/2 z-10 bg-[#f8fafc] dark:bg-[#0f172a] p-1.5 transition-colors duration-300">
                                                {entry.isInsight ? (
                                                    <Gem size={10} strokeWidth={2} className={iconColorClass} />
                                                ) : (
                                                    <div className={`w-1.5 h-1.5 rounded-full bg-transparent border-[1.5px] ${nodeColorClass}`} />
                                                )}
                                            </div>

                                            {/* Entry Card */}
                                            <div 
                                                onClick={() => setSelectedEntryId(entry.id)} 
                                                className={`relative p-6 md:p-8 rounded-2xl border transition-all duration-300 group cursor-default
                                                    ${entry.isInsight 
                                                        ? 'bg-gradient-to-br from-violet-50/80 via-fuchsia-50/50 to-white dark:from-violet-900/20 dark:via-fuchsia-900/10 dark:to-[#1e293b] border-violet-200/50 dark:border-violet-800/30 shadow-sm' 
                                                        : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                                                    }
                                                `}
                                            >
                                            
                                                {/* CARD HEADER - ALIGNED */}
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 tracking-widest uppercase flex items-center gap-2">
                                                        <span>{formatDate(entry.date)}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                        {!isEditing && (
                                                            <>
                                                                <button 
                                                                    onClick={() => toggleInsight(entry)} 
                                                                    className={`p-1.5 rounded-lg transition-all ${
                                                                        entry.isInsight 
                                                                        ? "text-violet-600 dark:text-violet-300 bg-gradient-to-tr from-violet-100 via-fuchsia-50 to-cyan-50 dark:from-violet-900/30 dark:via-fuchsia-900/20 dark:to-cyan-900/20 shadow-[0_0_12px_rgba(139,92,246,0.3)]" 
                                                                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                    }`}
                                                                >
                                                                    <Gem 
                                                                        size={16} 
                                                                        strokeWidth={1.5} 
                                                                        className={entry.isInsight ? "fill-violet-200/50" : "fill-transparent"} 
                                                                    />
                                                                </button>
                                                                <button onClick={() => startEditing(entry)} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><Edit3 size={16} /></button>
                                                                <button onClick={() => { if(confirm("Удалить запись?")) deleteEntry(entry.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {isEditing ? (
                                                    <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                                                        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 resize-none font-mono" placeholder="Markdown..." />
                                                        <div className="flex flex-col-reverse md:flex-row justify-end gap-2 mt-2">
                                                            <button onClick={cancelEditing} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center justify-center gap-1 w-full md:w-auto"><X size={12} /> Отмена</button>
                                                            <button onClick={() => saveEdit(entry)} className="px-3 py-1.5 text-xs font-medium bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-700 rounded flex items-center justify-center gap-1 w-full md:w-auto"><Check size={12} /> Сохранить</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="font-serif text-[#2F3437] dark:text-slate-300 leading-relaxed text-base">
                                                        <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                                    </div>
                                                )}

                                                {/* Context Link */}
                                                {linkedTask && !isEditing && (
                                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); if(onNavigateToTask) onNavigateToTask(linkedTask.id); }}
                                                            className="font-mono text-[10px] text-[#6B6E70] dark:text-slate-500 hover:text-indigo-500 transition-colors flex items-center gap-2 group/ctx w-full"
                                                        >
                                                            <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                                                                [ CONTEXT: <span className="truncate max-w-[200px] inline-block align-bottom">{linkedTask.content}</span> ]
                                                            </span>
                                                        </button>
                                                    </div>
                                                )}

                                                {entry.aiFeedback && (
                                                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-3 relative mt-3 border border-slate-100 dark:border-slate-700/50">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className={`p-0.5 rounded ${mentor?.color || 'text-slate-500'}`}><RenderIcon name={mentor?.icon || 'User'} className="w-3 h-3" /></div>
                                                            <span className={`text-[10px] font-bold uppercase ${mentor?.color || 'text-slate-500'}`}>{mentor?.name || 'Ментор'}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed pl-1 font-serif"><ReactMarkdown components={markdownComponents}>{entry.aiFeedback}</ReactMarkdown></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Journal;
