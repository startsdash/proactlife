import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import { Plus, Trash2, Edit3, Save, X, Bot, Zap, Search, Gem, Check, ChevronRight, Book } from 'lucide-react';
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

const JournalEntrySphereSelector = ({ entry, updateEntry, align = 'right', direction = 'down' }: { entry: JournalEntry, updateEntry: (e: JournalEntry) => void, align?: 'left' | 'right', direction?: 'up' | 'down' }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const toggleSphere = (sphereId: string) => {
        const current = entry.spheres || [];
        const newSpheres = current.includes(sphereId) 
            ? current.filter(s => s !== sphereId)
            : [...current, sphereId];
        updateEntry({ ...entry, spheres: newSpheres });
    };

    return (
        <div className="relative">
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center gap-2 group"
            >
                <div className="flex -space-x-1">
                    {(entry.spheres && entry.spheres.length > 0) ? entry.spheres.map(s => {
                        const sp = SPHERES.find(x => x.id === s);
                        return sp ? <div key={s} className={`w-3 h-3 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`} /> : null;
                    }) : <div className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600" />}
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    Spheres
                </span>
            </button>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
                    <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} ${align === 'right' ? 'right-0' : 'left-0'} w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5`} onClick={e => e.stopPropagation()}>
                        {SPHERES.map(s => {
                            const isSelected = entry.spheres?.includes(s.id);
                            const Icon = ICON_MAP[s.icon];
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => toggleSphere(s.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    {Icon && <Icon size={12} className={isSelected ? s.text : 'text-slate-400'} />}
                                    <span className="flex-1">{s.label}</span>
                                    {isSelected && <Check size={12} className="text-indigo-500" />}
                                </button>
                            );
                        })}
                    </div>
                </>
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
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAnalysisMode, setIsAnalysisMode] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Filter Logic
    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => {
                if (!searchQuery) return true;
                return e.content.toLowerCase().includes(searchQuery.toLowerCase());
            })
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    // Initialize from Task (Context)
    useEffect(() => {
        if (initialTaskId) {
            const newEntry: JournalEntry = {
                id: Date.now().toString(),
                date: Date.now(),
                content: '',
                linkedTaskId: initialTaskId,
                isInsight: false
            };
            addEntry(newEntry);
            setSelectedEntryId(newEntry.id);
            setEditContent('');
            setIsEditing(true);
            onClearInitialTask?.();
        }
    }, [initialTaskId, addEntry, onClearInitialTask]);

    const handleCreateEntry = () => {
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: '',
            isInsight: false
        };
        addEntry(newEntry);
        setSelectedEntryId(newEntry.id);
        setEditContent('');
        setIsEditing(true);
    };

    const handleSave = () => {
        if (selectedEntryId) {
            const entry = entries.find(e => e.id === selectedEntryId);
            if (entry) {
                if (!editContent.trim()) {
                    deleteEntry(selectedEntryId);
                    setSelectedEntryId(null);
                } else {
                    updateEntry({ ...entry, content: applyTypography(editContent) });
                }
            }
        }
        setIsEditing(false);
    };

    const handleDelete = (id: string) => {
        if (confirm("Удалить запись?")) {
            deleteEntry(id);
            if (selectedEntryId === id) setSelectedEntryId(null);
        }
    };

    const toggleInsight = (entry: JournalEntry) => {
        updateEntry({ ...entry, isInsight: !entry.isInsight });
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const result = await analyzeJournalPath(entries, config);
            addMentorAnalysis({
                id: Date.now().toString(),
                date: Date.now(),
                content: result,
                mentorName: 'AI Mentor'
            });
            setIsAnalysisMode(true); // Switch to analysis view
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const selectedEntry = entries.find(e => e.id === selectedEntryId);
    const selectedLinkedTask = selectedEntry?.linkedTaskId ? tasks.find(t => t.id === selectedEntry.linkedTaskId) : null;

    // Derived state for editing mode
    const editingId = isEditing ? selectedEntryId : null;

    // Render Components
    const markdownComponents = {
        p: ({node, ...props}: any) => <p className="mb-4 last:mb-0 text-slate-800 dark:text-slate-200 leading-relaxed font-serif text-lg" {...props} />,
        a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
        ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-800 dark:text-slate-200 font-serif" {...props} />,
        ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-slate-800 dark:text-slate-200 font-serif" {...props} />,
        blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-indigo-500/30 pl-4 py-2 my-4 text-slate-500 italic font-serif" {...props} />,
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            
            {/* SIDEBAR LIST */}
            <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 ${selectedEntryId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-light text-slate-800 dark:text-slate-200 font-sans tracking-tight">Дневник</h2>
                        <div className="flex gap-2">
                            <Tooltip content="Анализ Пути (ИИ)">
                                <button onClick={handleAnalyze} disabled={isAnalyzing} className={`p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all ${isAnalyzing ? 'animate-pulse text-indigo-500' : ''}`}>
                                    <Zap size={20} strokeWidth={1.5} />
                                </button>
                            </Tooltip>
                            <Tooltip content="Новая запись">
                                <button onClick={handleCreateEntry} className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity">
                                    <Plus size={20} strokeWidth={1.5} />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-ghost p-2 space-y-2">
                    {/* Mentor Analyses Links */}
                    {mentorAnalyses.length > 0 && (
                        <div className="mb-4">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Отчеты Ментора</div>
                            {mentorAnalyses.map(analysis => (
                                <button 
                                    key={analysis.id}
                                    onClick={() => { setSelectedEntryId(null); setIsAnalysisMode(true); }}
                                    className="w-full p-3 rounded-xl flex items-center gap-3 text-left hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                >
                                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500"><Bot size={16} /></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Анализ Пути</div>
                                        <div className="text-[10px] text-slate-400">{new Date(analysis.date).toLocaleDateString()}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredEntries.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <Book size={24} className="mx-auto mb-2 text-slate-300" strokeWidth={1} />
                            <p className="text-xs text-slate-400">Нет записей</p>
                        </div>
                    ) : (
                        filteredEntries.map(entry => (
                            <button 
                                key={entry.id}
                                onClick={() => { setSelectedEntryId(entry.id); setIsAnalysisMode(false); setIsEditing(false); }}
                                className={`w-full p-4 rounded-2xl text-left transition-all border group relative ${selectedEntryId === entry.id ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-900 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-mono text-[10px] text-slate-400">{new Date(entry.date).toLocaleDateString(undefined, {weekday: 'short', day:'numeric', month:'short'})}</span>
                                    {entry.isInsight && <Gem size={10} className="text-violet-500 fill-current" />}
                                </div>
                                <div className={`text-sm font-serif line-clamp-2 leading-relaxed ${selectedEntryId === entry.id ? 'text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {entry.content || <span className="italic opacity-50">Пустая запись...</span>}
                                </div>
                                {entry.spheres && entry.spheres.length > 0 && (
                                    <div className="flex gap-1 mt-2">
                                        {entry.spheres.map(s => {
                                            const sp = SPHERES.find(x => x.id === s);
                                            return sp ? <div key={s} className={`w-1.5 h-1.5 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`} /> : null;
                                        })}
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className={`flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative transition-all duration-300 ${!selectedEntryId && !isAnalysisMode ? 'hidden md:flex' : 'flex'}`}>
                
                {/* Mobile Back Button */}
                <div className="md:hidden p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <button onClick={() => { setSelectedEntryId(null); setIsAnalysisMode(false); }} className="text-slate-500">
                        <ChevronRight size={24} className="rotate-180" />
                    </button>
                    <span className="font-bold text-slate-700 dark:text-slate-200">Назад</span>
                </div>

                {isAnalysisMode ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar-light p-8 md:p-12">
                        <div className="max-w-3xl mx-auto">
                            <h2 className="text-2xl font-serif text-slate-800 dark:text-slate-100 mb-8 flex items-center gap-3">
                                <Bot size={24} className="text-indigo-500" /> 
                                Анализ Пути
                            </h2>
                            {mentorAnalyses.map(analysis => (
                                <div key={analysis.id} className="mb-12 last:mb-0">
                                    <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <Zap size={100} />
                                        </div>
                                        <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest mb-6">
                                            {new Date(analysis.date).toLocaleDateString()} • {analysis.mentorName}
                                        </div>
                                        <div className="font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200">
                                            <ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown>
                                        </div>
                                        <div className="mt-8 flex justify-end">
                                            <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : selectedEntry ? (
                    <div className="flex-1 flex flex-col h-full relative">
                        {/* Editor/Reader Header */}
                        <div className="shrink-0 p-6 md:p-8 flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-serif text-slate-900 dark:text-white mb-2">
                                    {new Date(selectedEntry.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
                                </h1>
                                <div className="flex items-center gap-3 text-slate-400 text-sm">
                                    <span>{new Date(selectedEntry.date).toLocaleDateString(undefined, { weekday: 'long' })}</span>
                                    <span>•</span>
                                    <span>{new Date(selectedEntry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isEditing && (
                                    <>
                                        <Tooltip content="Редактировать">
                                            <button onClick={() => { setEditContent(selectedEntry.content); setIsEditing(true); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                                                <Edit3 size={20} strokeWidth={1.5} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Удалить">
                                            <button onClick={() => handleDelete(selectedEntry.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                <Trash2 size={20} strokeWidth={1.5} />
                                            </button>
                                        </Tooltip>
                                    </>
                                )}
                                {isEditing && (
                                    <>
                                        <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors">
                                            <X size={20} strokeWidth={1.5} />
                                        </button>
                                        <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium text-sm">
                                            <Save size={16} /> Сохранить
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar-light px-6 md:px-8 pb-20">
                            <div className="max-w-3xl mx-auto h-full flex flex-col">
                                {isEditing ? (
                                    <textarea 
                                        className="w-full h-full bg-transparent border-none outline-none resize-none font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        placeholder="Начни писать..."
                                        autoFocus
                                    />
                                ) : (
                                    <div className="font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200">
                                        <ReactMarkdown components={markdownComponents}>
                                            {selectedEntry.content}
                                        </ReactMarkdown>
                                    </div>
                                )}

                                {/* AETHER FOOTER REPLICA */}
                                <div className="mt-auto pt-10 border-t border-black/5 dark:border-white/5 flex flex-col gap-6 shrink-0">
                                    {selectedLinkedTask && !editingId && (
                                        <div className="font-mono text-[10px] text-slate-400 flex items-center gap-2 group/ctx">
                                            <span className="opacity-50">[ CONTEXT: </span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onNavigateToTask?.(selectedLinkedTask.id); }}
                                                className="hover:text-indigo-500 underline decoration-dotted underline-offset-4 truncate max-w-[200px] transition-colors"
                                            >
                                                {selectedLinkedTask.content}
                                            </button>
                                            <span className="opacity-50"> ]</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center">
                                        <JournalEntrySphereSelector entry={selectedEntry} updateEntry={updateEntry} align="left" direction="up" />
                                        
                                        {!editingId && (
                                            <button 
                                                onClick={() => toggleInsight(selectedEntry)} 
                                                className={`font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 ${selectedEntry.isInsight ? 'text-violet-500' : 'text-slate-300 hover:text-slate-500'}`}
                                            >
                                                <Gem size={12} className={selectedEntry.isInsight ? "fill-current" : ""} />
                                                {selectedEntry.isInsight ? "Insight" : "Mark Insight"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <EmptyState 
                        icon={Book} 
                        title="Дневник" 
                        description="Выбери запись из списка или создай новую" 
                        actionLabel="Создать запись" 
                        onAction={handleCreateEntry} 
                        color="indigo"
                    />
                )}
            </div>
        </div>
    );
};

export default Journal;