import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';
import { Plus, Trash2, Calendar, Search, Sparkles, History, Loader2, X, ChevronRight, Hash, Link2, PenTool } from 'lucide-react';
import { MOOD_TAGS } from '../constants';

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
    entries, mentorAnalyses, tasks, config, 
    addEntry, deleteEntry, updateEntry, 
    addMentorAnalysis, deleteMentorAnalysis,
    initialTaskId, onClearInitialTask, onNavigateToTask
}) => {
    const [isWriting, setIsWriting] = useState(false);
    const [content, setContent] = useState('');
    const [linkedTaskId, setLinkedTaskId] = useState<string | null>(initialTaskId || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Auto-open writer if initialTaskId is set
    useEffect(() => {
        if (initialTaskId) {
            setLinkedTaskId(initialTaskId);
            setIsWriting(true);
            onClearInitialTask?.();
        }
    }, [initialTaskId, onClearInitialTask]);

    const hasMentorTool = useMemo(() => config.aiTools.some(t => t.id === 'journal_mentor'), [config.aiTools]);

    const handleSave = () => {
        if (!content.trim()) return;
        
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: content.trim(),
            linkedTaskId: linkedTaskId || undefined,
            isInsight: false
        };
        
        addEntry(newEntry);
        setContent('');
        setLinkedTaskId(null);
        setIsWriting(false);
    };

    const handleAnalyzePath = async () => {
        setIsAnalyzing(true);
        try {
            // Analyze last 10 entries
            const recentEntries = entries
                .sort((a, b) => b.date - a.date)
                .slice(0, 10)
                .reverse();
            
            if (recentEntries.length === 0) {
                alert("Нечего анализировать. Добавьте записи.");
                setIsAnalyzing(false);
                return;
            }

            const analysisResult = await analyzeJournalPath(recentEntries, config);
            
            const analysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: analysisResult,
                mentorName: 'AI Mentor'
            };
            
            addMentorAnalysis(analysis);
            setShowHistory(true); // Switch to history to see result
        } catch (e) {
            console.error(e);
            alert("Ошибка анализа");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const actionButtonStyle = "p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800";

    if (showHistory) {
        return (
            <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8">
                <header className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowHistory(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                            <X size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Архив Наставника</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Анализ пути и инсайты</p>
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar-light space-y-6 max-w-3xl mx-auto w-full">
                    {mentorAnalyses.length === 0 ? (
                        <EmptyState icon={Sparkles} title="Пусто" description="Здесь появятся результаты анализа вашего пути." />
                    ) : (
                        mentorAnalyses.sort((a, b) => b.date - a.date).map(analysis => (
                            <div key={analysis.id} className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={16} className="text-indigo-500" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{new Date(analysis.date).toLocaleDateString()}</span>
                                    </div>
                                    <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="prose dark:prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{analysis.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative">
            <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-8 pb-24">
                <header className="max-w-3xl mx-auto w-full mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Хроника мыслей и событий</p>
                    </div>
                    <div className="flex gap-2">
                         {hasMentorTool && (
                            <>
                                <Tooltip content={isAnalyzing ? "Анализирую..." : "Анализ пути (ИИ)"} side="bottom">
                                    <button 
                                        onClick={handleAnalyzePath}
                                        disabled={isAnalyzing || entries.length === 0}
                                        className={`p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all ${isAnalyzing ? 'animate-pulse' : ''}`}
                                    >
                                        {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                    </button>
                                </Tooltip>
                                <Tooltip content="Архив анализа" side="bottom">
                                    <button onClick={() => setShowHistory(true)} className="p-3 rounded-xl bg-white dark:bg-[#1e293b] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                                        <History size={20} />
                                    </button>
                                </Tooltip>
                            </>
                        )}
                    </div>
                </header>

                <div className="max-w-3xl mx-auto w-full space-y-6">
                    {/* Write Box */}
                    <div className={`bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300 overflow-hidden ${isWriting ? 'p-4 ring-2 ring-indigo-500/20' : 'p-0'}`}>
                        {isWriting ? (
                            <div className="space-y-4">
                                <textarea
                                    className="w-full bg-transparent resize-none outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 min-h-[150px] font-serif text-lg leading-relaxed"
                                    placeholder="О чем вы думаете?"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2">
                                        {linkedTaskId && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-medium">
                                                <Link2 size={12} />
                                                <span className="truncate max-w-[150px]">
                                                    {tasks.find(t => t.id === linkedTaskId)?.title || 'Задача'}
                                                </span>
                                                <button onClick={() => setLinkedTaskId(null)} className="hover:text-indigo-800"><X size={12}/></button>
                                            </div>
                                        )}
                                        {!linkedTaskId && (
                                            <div className="relative group">
                                                <button className="flex items-center gap-1 text-slate-400 hover:text-indigo-500 text-xs font-medium transition-colors px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                                                    <Link2 size={14} /> Привязать задачу
                                                </button>
                                                {/* Simple Task Picker Dropdown */}
                                                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 hidden group-hover:block p-1 max-h-48 overflow-y-auto">
                                                    {tasks.filter(t => t.column !== 'done').map(t => (
                                                        <button 
                                                            key={t.id} 
                                                            onClick={() => setLinkedTaskId(t.id)}
                                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs truncate text-slate-700 dark:text-slate-300"
                                                        >
                                                            {t.title || t.content.substring(0, 30)}
                                                        </button>
                                                    ))}
                                                    {tasks.filter(t => t.column !== 'done').length === 0 && <div className="p-2 text-xs text-slate-400 text-center">Нет активных задач</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsWriting(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm transition-colors">Отмена</button>
                                        <button onClick={handleSave} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors">Записать</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsWriting(true)}
                                className="w-full p-4 flex items-center gap-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                                    <PenTool size={18} />
                                </div>
                                <span className="text-lg font-light">Добавить запись...</span>
                            </button>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск по записям..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    {/* Timeline */}
                    <div className="space-y-8 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-slate-200 dark:before:bg-slate-700 before:z-0">
                        {filteredEntries.map((entry) => {
                            const linkedTask = entry.linkedTaskId ? tasks.find(t => t.id === entry.linkedTaskId) : null;
                            const mood = entry.mood ? MOOD_TAGS.find(m => m.id === entry.moodTags?.[0]) : null;

                            return (
                                <div key={entry.id} className="relative pl-12 group">
                                    {/* Timeline Dot */}
                                    <div className="absolute left-[11px] top-6 w-2.5 h-2.5 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-full z-10 group-hover:border-indigo-500 transition-colors" />
                                    
                                    <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{new Date(entry.date).toLocaleDateString()}</span>
                                                <span className="text-xs text-slate-300 dark:text-slate-600 font-mono">{new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded hover:bg-slate-50 dark:hover:bg-slate-800"><Trash2 size={14}/></button>
                                            </div>
                                        </div>

                                        <div className="prose dark:prose-invert prose-sm max-w-none font-serif text-slate-700 dark:text-slate-300">
                                            <ReactMarkdown>{entry.content}</ReactMarkdown>
                                        </div>

                                        {entry.mood && (
                                            <div className="mt-4 flex gap-2">
                                                {entry.moodTags?.map(tagId => {
                                                    const tag = MOOD_TAGS.find(t => t.id === tagId);
                                                    if(!tag) return null;
                                                    return (
                                                        <span key={tagId} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                                                            <span>{tag.emoji}</span> {tag.label}
                                                        </span>
                                                    );
                                                })}
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/20 text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                                                    Оценка: {entry.mood}/5
                                                </span>
                                            </div>
                                        )}

                                        {linkedTask && (
                                            <div 
                                                onClick={() => onNavigateToTask && onNavigateToTask(linkedTask.id)}
                                                className="mt-4 flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors group/task"
                                            >
                                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-indigo-500 shadow-sm">
                                                    <Hash size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Контекст</div>
                                                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover/task:text-indigo-600 dark:group-hover/task:text-indigo-400 transition-colors">{linkedTask.title || linkedTask.content}</div>
                                                </div>
                                                <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {filteredEntries.length === 0 && (
                            <div className="pl-12 py-10">
                                <p className="text-slate-400 italic">Записей не найдено.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Journal;