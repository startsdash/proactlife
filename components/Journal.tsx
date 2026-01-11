import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, Task, MentorAnalysis, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { SPHERES, ICON_MAP } from '../constants';
import { 
    Book, Plus, Trash2, Edit3, X, Search, Calendar, Sparkles, Bot, 
    Filter, ArrowRight, Link2, MoreHorizontal, Gem, Check, ChevronDown,
    Maximize2, Minimize2
} from 'lucide-react';
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
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSphere = (id: string) => {
        const current = entry.spheres || [];
        const newSpheres = current.includes(id) 
            ? current.filter(s => s !== id)
            : [...current, id];
        updateEntry({ ...entry, spheres: newSpheres });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors"
            >
                {entry.spheres && entry.spheres.length > 0 ? (
                    <div className="flex -space-x-1">
                        {entry.spheres.map(s => {
                            const sp = SPHERES.find(x => x.id === s);
                            return sp ? <div key={s} className={`w-3 h-3 rounded-full border border-white dark:border-slate-800 ${sp.bg.replace('50', '400').replace('/30', '')}`} /> : null;
                        })}
                    </div>
                ) : (
                    <span>+ Сфера</span>
                )}
            </button>
            
            {isOpen && (
                <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} ${align === 'right' ? 'right-0' : 'left-0'} w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5`}>
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
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // For handling new entry creation
    const [isCreating, setIsCreating] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [newLinkedTaskId, setNewLinkedTaskId] = useState<string | null>(null);

    // Filtered Entries
    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    // Handle Initial Task ID (e.g. from Kanban "Reflect")
    useEffect(() => {
        if (initialTaskId) {
            setNewLinkedTaskId(initialTaskId);
            setIsCreating(true);
            onClearInitialTask?.();
        }
    }, [initialTaskId, onClearInitialTask]);

    const handleCreate = () => {
        if (!newContent.trim()) {
            setIsCreating(false);
            setNewLinkedTaskId(null);
            return;
        }
        
        const entry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: newContent,
            linkedTaskId: newLinkedTaskId || undefined,
            isInsight: false
        };
        
        addEntry(entry);
        setNewContent('');
        setNewLinkedTaskId(null);
        setIsCreating(false);
    };

    const handleUpdate = () => {
        if (selectedEntry) {
            updateEntry({ ...selectedEntry, content: editContent });
            setIsEditing(false);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("Удалить запись?")) {
            deleteEntry(id);
            if (selectedEntry?.id === id) setSelectedEntry(null);
        }
    };

    const handleMentorAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            // Analyze last 10 entries or selected context
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

    const toggleInsight = (entry: JournalEntry) => {
        updateEntry({ ...entry, isInsight: !entry.isInsight });
    };

    const selectedLinkedTask = selectedEntry?.linkedTaskId ? tasks.find(t => t.id === selectedEntry.linkedTaskId) : null;
    const newLinkedTask = newLinkedTaskId ? tasks.find(t => t.id === newLinkedTaskId) : null;

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
            {/* Header */}
            <header className="px-6 py-6 flex justify-between items-end shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50 z-10">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроника пути</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleMentorAnalysis} 
                        disabled={isAnalyzing}
                        className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
                        title="Запросить анализ ментора"
                    >
                        {isAnalyzing ? <Bot size={20} className="animate-pulse" /> : <Sparkles size={20} />}
                    </button>
                    <button 
                        onClick={() => setIsCreating(true)} 
                        className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-lg hover:scale-105 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row">
                
                {/* Entries List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6">
                    
                    {/* Analyses Stream */}
                    {mentorAnalyses.length > 0 && (
                        <div className="mb-8 space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Менторские разборы</h3>
                            {mentorAnalyses.map(analysis => (
                                <div key={analysis.id} className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800/30 relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <Bot size={16} className="text-indigo-500" />
                                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Анализ Пути</span>
                                        </div>
                                        <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-indigo-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16} /></button>
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none font-serif leading-relaxed">
                                        <ReactMarkdown>{analysis.content}</ReactMarkdown>
                                    </div>
                                    <div className="mt-4 text-[10px] font-mono text-indigo-400 opacity-60">
                                        {new Date(analysis.date).toLocaleDateString()} • {analysis.mentorName}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Journal Entries */}
                    <div className="space-y-4">
                        {filteredEntries.length === 0 ? (
                            <div className="text-center py-20 text-slate-400">
                                <Book size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Записей пока нет. Начни с «+».</p>
                            </div>
                        ) : (
                            filteredEntries.map(entry => (
                                <motion.div 
                                    key={entry.id}
                                    layoutId={entry.id}
                                    onClick={() => setSelectedEntry(entry)}
                                    className={`bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-sm hover:shadow-md group ${entry.isInsight ? 'ring-1 ring-indigo-500/50' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            {new Date(entry.date).toLocaleDateString()}
                                            {entry.isInsight && <Gem size={12} className="text-indigo-500 fill-indigo-500 animate-pulse" />}
                                        </div>
                                        {entry.mood && (
                                            <div className="text-lg" title={`Mood: ${entry.mood}/5`}>
                                                {['😖','😕','😐','🙂','🤩'][entry.mood - 1]}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 font-serif leading-relaxed line-clamp-3">
                                        <ReactMarkdown className="pointer-events-none">{entry.content}</ReactMarkdown>
                                    </div>
                                    {entry.linkedTaskId && (
                                        <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded w-fit">
                                            <Link2 size={10} />
                                            <span className="truncate max-w-[200px]">Linked Task</span>
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* CREATE MODAL */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setIsCreating(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Новая запись</h2>
                                <button onClick={() => setIsCreating(false)}><X size={20} className="text-slate-400" /></button>
                            </div>
                            
                            <div className="flex-1 p-6 overflow-y-auto">
                                {newLinkedTask && (
                                    <div className="mb-4 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-3">
                                        <Link2 size={16} className="text-indigo-500 mt-0.5" />
                                        <div className="text-xs text-indigo-900 dark:text-indigo-200">
                                            <div className="font-bold uppercase tracking-wider mb-1">Рефлексия по задаче:</div>
                                            <div className="italic opacity-80">{newLinkedTask.content}</div>
                                        </div>
                                        <button onClick={() => setNewLinkedTaskId(null)} className="ml-auto text-indigo-400 hover:text-indigo-600"><X size={14} /></button>
                                    </div>
                                )}
                                <textarea 
                                    className="w-full h-64 bg-transparent resize-none outline-none text-base text-slate-700 dark:text-slate-200 font-serif leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    placeholder="О чем ты думаешь?..."
                                    value={newContent}
                                    onChange={e => setNewContent(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium">Отмена</button>
                                <button onClick={handleCreate} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform">Сохранить</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* DETAIL / EDIT MODAL */}
            <AnimatePresence>
                {selectedEntry && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSelectedEntry(null)}
                    >
                        <motion.div 
                            layoutId={selectedEntry.id}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Controls */}
                            <div className="absolute top-4 right-4 flex gap-2 z-10">
                                {isEditing ? (
                                    <button onClick={handleUpdate} className="p-2 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100"><Check size={18} /></button>
                                ) : (
                                    <>
                                        <button onClick={() => { setIsEditing(true); setEditContent(selectedEntry.content); }} className="p-2 bg-white/80 dark:bg-black/20 text-slate-400 hover:text-indigo-500 rounded-full backdrop-blur-sm"><Edit3 size={18} /></button>
                                        <button onClick={() => handleDelete(selectedEntry.id)} className="p-2 bg-white/80 dark:bg-black/20 text-slate-400 hover:text-red-500 rounded-full backdrop-blur-sm"><Trash2 size={18} /></button>
                                        <button onClick={() => setSelectedEntry(null)} className="p-2 bg-white/80 dark:bg-black/20 text-slate-400 hover:text-slate-700 rounded-full backdrop-blur-sm"><X size={18} /></button>
                                    </>
                                )}
                            </div>

                            <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar-ghost">
                                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    {new Date(selectedEntry.date).toLocaleString()}
                                    {selectedEntry.isInsight && <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded flex items-center gap-1"><Gem size={10} /> Insight</span>}
                                </div>

                                {isEditing ? (
                                    <textarea 
                                        className="w-full h-[60vh] bg-transparent resize-none outline-none text-base text-slate-700 dark:text-slate-200 font-serif leading-relaxed"
                                        value={editContent}
                                        onChange={e => setEditContent(e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <div className="prose prose-lg dark:prose-invert max-w-none font-serif leading-relaxed text-slate-800 dark:text-slate-200">
                                        <ReactMarkdown>{selectedEntry.content}</ReactMarkdown>
                                    </div>
                                )}

                                {/* AETHER FOOTER REPLICA */}
                                <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex flex-col gap-4 shrink-0">
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
                                        <JournalEntrySphereSelector entry={selectedEntry} updateEntry={updateEntry} align="left" direction="up" />
                                        
                                        {!isEditing && (
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
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Journal;