import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import { Bot, Sparkles, Calendar, Search, Plus, Trash2, Edit3, Book, Target, Check, MoreHorizontal, X, Zap, Filter, Link2, ChevronRight, User } from 'lucide-react';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';

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

const JournalEntrySphereSelector: React.FC<{ 
    entry: JournalEntry, 
    updateEntry: (e: JournalEntry) => void,
    align?: 'left' | 'right',
    direction?: 'up' | 'down'
}> = ({ entry, updateEntry, align = 'right', direction = 'down' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (triggerRef.current && triggerRef.current.contains(event.target as Node)) {
                return;
            }
            if ((event.target as Element).closest('.sphere-selector-dropdown')) {
                return;
            }
            setIsOpen(false);
        };
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', () => setIsOpen(false), true);
            window.addEventListener('resize', () => setIsOpen(false));
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', () => setIsOpen(false), true);
            window.removeEventListener('resize', () => setIsOpen(false));
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const width = 192; // w-48

            let top = direction === 'down' ? rect.bottom + 8 : rect.top - 8;
            let left = align === 'left' ? rect.left : rect.right - width;

            const newStyle: React.CSSProperties = {
                position: 'fixed',
                left: left,
                zIndex: 9999,
                minWidth: width,
            };

            if (direction === 'up') {
                newStyle.top = rect.top - 8;
                newStyle.transform = 'translateY(-100%)';
            } else {
                newStyle.top = rect.bottom + 8;
            }

            setStyle(newStyle);
        }
    }, [isOpen, direction, align]);
    
    const toggleSphere = (sphereId: string) => {
        const current = entry.spheres || [];
        const newSpheres = current.includes(sphereId) 
            ? current.filter(s => s !== sphereId)
            : [...current, sphereId];
        updateEntry({ ...entry, spheres: newSpheres });
    };

    return (
        <>
            <button 
                ref={triggerRef}
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent pl-0 pr-2 py-1 rounded transition-colors uppercase tracking-widest"
            >
                {entry.spheres && entry.spheres.length > 0 ? (
                    <div className="flex -space-x-1">
                        {entry.spheres.map(s => {
                            const sp = SPHERES.find(x => x.id === s);
                            return sp ? (
                                <div 
                                    key={s} 
                                    className={`w-2 h-2 rounded-full border bg-transparent ${sp.text.replace('text-', 'border-')}`} 
                                    style={{ borderWidth: '1px' }}
                                />
                            ) : null;
                        })}
                    </div>
                ) : (
                    <Target size={10} strokeWidth={1.5} />
                )}
                <span>Сфера</span>
            </button>
            
            {isOpen && createPortal(
                <div 
                    className="sphere-selector-dropdown absolute bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5"
                    style={style}
                    onClick={e => e.stopPropagation()}
                >
                    {SPHERES.map(s => {
                        const isSelected = entry.spheres?.includes(s.id);
                        const Icon = ICON_MAP[s.icon];
                        return (
                            <button
                                key={s.id}
                                onClick={() => toggleSphere(s.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                {Icon && <Icon size={12} className={isSelected ? s.text : 'text-slate-400'} strokeWidth={1} />}
                                <span className="flex-1">{s.label}</span>
                                {isSelected && <Check size={12} className="text-indigo-500" strokeWidth={1} />}
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </>
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
    const [newEntryContent, setNewEntryContent] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSphere, setSelectedSphere] = useState<string | null>(null);
    const [showAnalyzer, setShowAnalyzer] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Initial Task Linking
    useEffect(() => {
        if (initialTaskId) {
            const task = tasks.find(t => t.id === initialTaskId);
            if (task) {
                setNewEntryContent(`[Reflect: ${task.title || 'Task'}]\n\n`);
                // Auto focus logic if needed
                onClearInitialTask?.();
            }
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            const matchesSearch = !searchQuery || entry.content.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSphere = !selectedSphere || (entry.spheres && entry.spheres.includes(selectedSphere));
            return matchesSearch && matchesSphere;
        }).sort((a, b) => b.date - a.date);
    }, [entries, searchQuery, selectedSphere]);

    const handleAddEntry = () => {
        if (!newEntryContent.trim()) return;
        
        // Check if content implies a task link (simple heuristic)
        let linkedTaskId = undefined;
        // Logic to extract task ID if hidden in text or context could be added here
        
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: applyTypography(newEntryContent),
            isInsight: false,
            spheres: selectedSphere ? [selectedSphere] : []
        };
        
        addEntry(newEntry);
        setNewEntryContent('');
    };

    const handleRunAnalysis = async () => {
        if (entries.length < 3) {
            alert("Нужно хотя бы 3 записи для анализа.");
            return;
        }
        setIsAnalyzing(true);
        try {
            const result = await analyzeJournalPath(entries, config);
            const analysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: result,
                mentorName: 'AI Mentor'
            };
            addMentorAnalysis(analysis);
            setShowAnalyzer(false);
        } catch (e) {
            console.error(e);
            alert("Ошибка анализа.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            {/* LEFT: ENTRIES FEED */}
            <div className="flex-1 flex flex-col min-w-0">
                
                {/* Header */}
                <div className="px-6 md:px-8 pt-6 pb-4 shrink-0 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-sans">Хроника пути</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip content="Анализ пути">
                            <button 
                                onClick={() => setShowAnalyzer(!showAnalyzer)}
                                className={`p-2 rounded-full transition-all ${showAnalyzer ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                <Sparkles size={20} strokeWidth={1.5} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Input Area */}
                <div className="px-6 md:px-8 mb-6 shrink-0">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-shadow focus-within:shadow-md">
                        <textarea
                            value={newEntryContent}
                            onChange={(e) => setNewEntryContent(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddEntry(); }}
                            placeholder="О чем ты думаешь? (Cmd+Enter для сохранения)"
                            className="w-full bg-transparent border-none outline-none resize-none min-h-[80px] text-slate-800 dark:text-slate-200 font-serif leading-relaxed placeholder:text-slate-400 placeholder:font-sans"
                        />
                        <div className="flex justify-between items-center mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                            <div className="flex gap-2">
                                {/* Sphere quick select could go here */}
                            </div>
                            <button 
                                onClick={handleAddEntry}
                                disabled={!newEntryContent.trim()}
                                className="bg-slate-900 dark:bg-white text-white dark:text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Записать
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-6 md:px-8 pb-4 flex items-center gap-4 overflow-x-auto scrollbar-none shrink-0">
                    <div className="relative group">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 dark:text-slate-300 w-40 transition-all focus:w-60"
                        />
                    </div>
                    
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
                    
                    <button 
                        onClick={() => setSelectedSphere(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!selectedSphere ? 'bg-slate-800 text-white dark:bg-white dark:text-black' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        Все
                    </button>
                    {SPHERES.map(s => {
                        const Icon = ICON_MAP[s.icon];
                        const isSelected = selectedSphere === s.id;
                        return (
                            <button 
                                key={s.id}
                                onClick={() => setSelectedSphere(isSelected ? null : s.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${isSelected ? `bg-white dark:bg-slate-800 ${s.text} ${s.border}` : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {Icon && <Icon size={12} />}
                                {s.label}
                            </button>
                        );
                    })}
                </div>

                {/* Entries List */}
                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto custom-scrollbar-light px-6 md:px-8 pb-12 space-y-6"
                >
                    {filteredEntries.length === 0 ? (
                        <div className="py-20">
                            <EmptyState 
                                icon={Book} 
                                title="Дневник пуст" 
                                description={searchQuery ? "Ничего не найдено" : "Начни писать свою историю"} 
                                color="cyan" 
                            />
                        </div>
                    ) : (
                        filteredEntries.map(entry => {
                            const task = entry.linkedTaskId ? tasks.find(t => t.id === entry.linkedTaskId) : null;
                            const isInsight = entry.isInsight;

                            return (
                                <div key={entry.id} className="group relative pl-8 pb-8 border-l border-slate-200 dark:border-slate-800 last:border-0 last:pb-0">
                                    {/* Timeline Dot */}
                                    <div className={`absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full border-2 bg-white dark:bg-slate-900 transition-colors ${isInsight ? 'border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}`} />

                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-xs text-slate-400 font-medium">
                                                    {new Date(entry.date).toLocaleDateString()}
                                                </span>
                                                <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">
                                                    {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                                {isInsight && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">
                                                        <Zap size={10} className="fill-current" /> Insight
                                                    </span>
                                                )}
                                                {entry.mood && (
                                                    <span className="text-xs select-none" title={`Настроение: ${entry.mood}/5`}>
                                                        {['','😖','😕','😐','🙂','🤩'][entry.mood]}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <JournalEntrySphereSelector 
                                                    entry={entry} 
                                                    updateEntry={updateEntry} 
                                                />
                                                <Tooltip content={isInsight ? "Убрать инсайт" : "Сделать инсайтом"}>
                                                    <button 
                                                        onClick={() => updateEntry({ ...entry, isInsight: !entry.isInsight })}
                                                        className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isInsight ? 'text-violet-500' : 'text-slate-400'}`}
                                                    >
                                                        <Zap size={14} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Удалить">
                                                    <button 
                                                        onClick={() => { if(confirm("Удалить запись?")) deleteEntry(entry.id); }}
                                                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        <div className="text-slate-800 dark:text-slate-200 font-serif leading-relaxed text-base whitespace-pre-wrap">
                                            <ReactMarkdown 
                                                components={{
                                                    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
                                                    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 pl-4 italic text-slate-500 my-2" {...props} />,
                                                }}
                                            >
                                                {applyTypography(entry.content)}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Task Link */}
                                        {task && (
                                            <div 
                                                className="mt-2 flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 max-w-md cursor-pointer hover:border-indigo-300 transition-colors group/task"
                                                onClick={() => onNavigateToTask?.(task.id)}
                                            >
                                                <div className="p-1 bg-white dark:bg-slate-700 rounded shadow-sm text-indigo-500">
                                                    <Link2 size={12} />
                                                </div>
                                                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate flex-1">
                                                    {task.title || "Связанная задача"}
                                                </span>
                                                <ChevronRight size={12} className="text-slate-400 group-hover/task:text-indigo-500" />
                                            </div>
                                        )}
                                        
                                        {/* Mood Tags */}
                                        {entry.moodTags && entry.moodTags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {entry.moodTags.map(tag => (
                                                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full font-medium">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* RIGHT: ANALYZER SIDEBAR (Collapsible) */}
            {showAnalyzer && (
                <div className="w-80 md:w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] shadow-xl absolute right-0 top-0 bottom-0 z-20 flex flex-col animate-in slide-in-from-right duration-300">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Bot size={18} className="text-indigo-500" />
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">AI Mentor</span>
                        </div>
                        <button onClick={() => setShowAnalyzer(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 space-y-4 bg-slate-50/50 dark:bg-[#0f172a]">
                        {/* New Analysis Button */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-center text-white shadow-lg">
                            <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                                <Sparkles size={24} />
                            </div>
                            <h3 className="font-bold text-lg mb-1">Синтез Пути</h3>
                            <p className="text-indigo-100 text-xs mb-4 leading-relaxed">
                                Проанализировать последние записи и найти скрытые паттерны.
                            </p>
                            <button 
                                onClick={handleRunAnalysis}
                                disabled={isAnalyzing}
                                className="w-full py-2 bg-white text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isAnalyzing ? 'Анализирую...' : 'Запустить анализ'}
                            </button>
                        </div>

                        {/* History */}
                        <div className="space-y-4 mt-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">История анализов</h4>
                            {mentorAnalyses.length === 0 ? (
                                <div className="text-center text-slate-400 text-sm py-4 italic">Нет данных</div>
                            ) : (
                                mentorAnalyses.sort((a,b) => b.date - a.date).map(analysis => (
                                    <div key={analysis.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm group relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-indigo-500" />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{analysis.mentorName}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-mono">{new Date(analysis.date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400 font-serif leading-relaxed">
                                            <ReactMarkdown>{applyTypography(analysis.content)}</ReactMarkdown>
                                        </div>
                                        <button 
                                            onClick={() => { if(confirm("Удалить?")) deleteMentorAnalysis(analysis.id); }}
                                            className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-700 rounded-full shadow-sm text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Journal;