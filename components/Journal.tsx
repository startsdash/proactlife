
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, Task, AppConfig, MentorAnalysis, Mentor } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { Book, Plus, Trash2, Edit3, X, Calendar, BrainCircuit, MessageCircle, ChevronRight, Search, Filter, Gem, Target, Check, RotateCw, Sparkles, ChevronDown, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPHERES, ICON_MAP } from '../constants';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';

// Helper for Sphere Selection in Journal
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
                className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
                {entry.spheres && entry.spheres.length > 0 ? (
                    <div className="flex gap-1">
                        {entry.spheres.map(s => {
                            const sphere = SPHERES.find(sp => sp.id === s);
                            return sphere ? <div key={s} className={`w-2 h-2 rounded-full ${sphere.bg.replace('50', '400').replace('/30', '')}`} /> : null;
                        })}
                    </div>
                ) : (
                    <Target size={12} />
                )}
                <span>{entry.spheres?.length ? 'Сферы' : 'Сфера'}</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div 
                        className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} ${align === 'right' ? 'right-0' : 'left-0'} w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5`}
                    >
                        {SPHERES.map(s => {
                            const isSelected = entry.spheres?.includes(s.id);
                            const Icon = ICON_MAP[s.icon];
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => toggleSphere(s.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
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
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // New Entry State (if creating)
    const [isCreating, setIsCreating] = useState(false);
    const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);

    // Filter Logic
    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const selectedEntry = useMemo(() => entries.find(e => e.id === selectedEntryId), [entries, selectedEntryId]);
    const selectedLinkedTask = useMemo(() => selectedEntry?.linkedTaskId ? tasks.find(t => t.id === selectedEntry?.linkedTaskId) : null, [selectedEntry, tasks]);

    // Initial Task Handling
    useEffect(() => {
        if (initialTaskId) {
            setLinkedTaskId(initialTaskId);
            setIsCreating(true);
            setSelectedEntryId(null);
            onClearInitialTask?.();
        }
    }, [initialTaskId, onClearInitialTask]);

    const handleCreate = () => {
        setIsCreating(true);
        setSelectedEntryId(null);
        setEditContent('');
        setLinkedTaskId(null);
    };

    const handleSave = () => {
        if (!editContent.trim()) return;

        if (isCreating) {
            const newEntry: JournalEntry = {
                id: Date.now().toString(),
                date: Date.now(),
                content: editContent,
                linkedTaskId: linkedTaskId || undefined,
                isInsight: false
            };
            addEntry(newEntry);
            setIsCreating(false);
            setSelectedEntryId(newEntry.id);
        } else if (selectedEntry) {
            updateEntry({ ...selectedEntry, content: editContent });
            setIsEditing(false);
        }
    };

    const handleDelete = () => {
        if (selectedEntry && confirm("Удалить запись?")) {
            deleteEntry(selectedEntry.id);
            setSelectedEntryId(null);
        }
    };

    const runAnalysis = async () => {
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

    // Derived states for fragment compatibility
    const editingId = isEditing ? selectedEntryId : null; // Roughly maps to editing state in fragment logic

    return (
        <div className="flex h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
            {/* LEFT PANEL: LIST */}
            <div className="w-80 md:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl z-10">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <button onClick={handleCreate} className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full hover:scale-105 transition-transform shadow-lg">
                            <Plus size={20} />
                        </button>
                    </div>
                    
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 space-y-3">
                    {filteredEntries.map(entry => (
                        <div 
                            key={entry.id}
                            onClick={() => { setSelectedEntryId(entry.id); setIsCreating(false); setIsEditing(false); }}
                            className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedEntryId === entry.id ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-md' : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                                    {new Date(entry.date).toLocaleDateString()}
                                </span>
                                {entry.isInsight && <Gem size={12} className="text-violet-500" />}
                            </div>
                            <div className="text-sm text-slate-700 dark:text-slate-300 font-serif line-clamp-2 leading-relaxed opacity-80">
                                {entry.content}
                            </div>
                            {entry.mood && (
                                <div className="mt-2 text-xs">{['😖','😕','😐','🙂','🤩'][entry.mood - 1]}</div>
                            )}
                        </div>
                    ))}
                    {filteredEntries.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <Book size={24} className="mx-auto mb-2 text-slate-400" />
                            <p className="text-xs text-slate-500">Записей пока нет</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: EDITOR / VIEWER */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50 dark:bg-[#0f172a]">
                {/* BACKGROUND DECOR */}
                <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                {(isCreating || selectedEntry) ? (
                    <div className="flex-1 flex flex-col p-6 md:p-12 max-w-4xl mx-auto w-full relative z-10">
                        {/* Header Actions */}
                        <div className="flex justify-between items-center mb-8">
                            <div className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} />
                                {new Date(isCreating ? Date.now() : selectedEntry!.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-2">
                                {!isCreating && !isEditing && (
                                    <>
                                        <Tooltip content="Редактировать"><button onClick={() => { setIsEditing(true); setEditContent(selectedEntry!.content); }} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"><Edit3 size={18} /></button></Tooltip>
                                        <Tooltip content="Удалить"><button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button></Tooltip>
                                    </>
                                )}
                                {(isCreating || isEditing) && (
                                    <>
                                        <button onClick={() => { setIsCreating(false); setIsEditing(false); }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">Отмена</button>
                                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">Сохранить</button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Linked Task Context */}
                        {(linkedTaskId || selectedEntry?.linkedTaskId) && (
                            <div className="mb-6 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg flex items-center gap-3 text-sm text-indigo-800 dark:text-indigo-300">
                                <Target size={16} />
                                <span className="font-medium truncate flex-1">
                                    {isCreating 
                                        ? tasks.find(t => t.id === linkedTaskId)?.content 
                                        : tasks.find(t => t.id === selectedEntry?.linkedTaskId)?.content}
                                </span>
                                {isCreating && <button onClick={() => setLinkedTaskId(null)}><X size={14} /></button>}
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="flex-1 bg-white dark:bg-[#1e293b] rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 md:p-12 relative overflow-hidden flex flex-col">
                            {(isCreating || isEditing) ? (
                                <textarea 
                                    className="w-full h-full resize-none outline-none text-lg text-slate-800 dark:text-slate-200 font-serif leading-relaxed bg-transparent placeholder:text-slate-300"
                                    placeholder="О чем ты думаешь?..."
                                    value={isCreating ? editContent : (isEditing ? editContent : '')} // Controlled input needs state
                                    onChange={(e) => setEditContent(e.target.value)}
                                    autoFocus
                                />
                            ) : (
                                <>
                                    <div className="prose dark:prose-invert max-w-none font-serif text-lg leading-loose text-slate-800 dark:text-slate-200 overflow-y-auto custom-scrollbar-ghost flex-1">
                                        <ReactMarkdown>{selectedEntry!.content}</ReactMarkdown>
                                    </div>
                                    
                                    {/* AETHER FOOTER REPLICA */}
                                    <div className="mt-auto pt-10 border-t border-black/5 dark:border-white/5 flex flex-col gap-4 shrink-0">
                                        {selectedLinkedTask && !isEditing && (
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
                                            <JournalEntrySphereSelector entry={selectedEntry!} updateEntry={updateEntry} align="left" direction="up" />
                                            
                                            {!isEditing && (
                                                <button 
                                                    onClick={() => toggleInsight(selectedEntry!)} 
                                                    className={`font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 ${selectedEntry!.isInsight ? 'text-violet-500' : 'text-slate-300 hover:text-slate-500'}`}
                                                >
                                                    <Gem size={12} className={selectedEntry!.isInsight ? "fill-current" : ""} />
                                                    {selectedEntry!.isInsight ? "Insight" : "Mark Insight"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    // DASHBOARD / EMPTY STATE
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-4xl mx-auto">
                            {/* Analysis Card */}
                            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white mb-12 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                                <BrainCircuit size={24} className="text-indigo-300" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold tracking-tight">Менторский Анализ</h2>
                                                <p className="text-indigo-200 text-xs uppercase tracking-widest">AI Pattern Recognition</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={runAnalysis}
                                            disabled={isAnalyzing}
                                            className="px-6 py-2 bg-white text-indigo-900 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isAnalyzing ? <RotateCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                            {isAnalyzing ? 'Анализирую...' : 'Запустить Анализ'}
                                        </button>
                                    </div>

                                    <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar-dark pr-2">
                                        {mentorAnalyses.length > 0 ? (
                                            mentorAnalyses.sort((a,b) => b.date - a.date).map(analysis => (
                                                <div key={analysis.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <User size={12} className="text-indigo-300" />
                                                            <span className="text-xs font-bold text-indigo-200">{analysis.mentorName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-white/40 font-mono">{new Date(analysis.date).toLocaleDateString()}</span>
                                                            <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-white/30 hover:text-red-400 transition-colors"><X size={12} /></button>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-white/80 font-serif leading-relaxed">
                                                        <ReactMarkdown>{analysis.content}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-white/40 italic text-sm">
                                                Нажмите "Запустить Анализ", чтобы получить обратную связь по вашим записям.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <EmptyState 
                                icon={Book} 
                                title="Путь Героя" 
                                description="Дневник — это зеркало вашего пути. Фиксируйте мысли, чтобы видеть прогресс." 
                                color="cyan"
                                actionLabel="Написать"
                                onAction={handleCreate}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Journal;
