
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { Search, X, Plus, Calendar, Sparkles, MessageCircle, Trash2, Edit2, Link, Bot, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Tooltip } from './Tooltip';
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
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [newEntryContent, setNewEntryContent] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll({ container: scrollContainerRef });

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() || 0;
        const diff = latest - previous;
        const isScrollingDown = diff > 0;
        if (latest > 100 && isScrollingDown) setIsHeaderHidden(true);
        else setIsHeaderHidden(false);
    });

    // Handle initial navigation context
    useEffect(() => {
        if (initialTaskId) {
            setSearchQuery(`task:${initialTaskId.slice(-4)}`); // Simple filter simulation or just clear
            // In a real app, we might filter by linkedTaskId directly
            // For now, just clearing callback
            onClearInitialTask();
        }
    }, [initialTaskId, onClearInitialTask]);

    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => {
                const q = searchQuery.toLowerCase();
                if (!q) return true;
                return e.content.toLowerCase().includes(q) || 
                       (e.linkedTaskId && e.linkedTaskId.includes(q));
            })
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const handleCreateEntry = () => {
        if (!newEntryContent.trim()) return;
        const entry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: applyTypography(newEntryContent),
            isInsight: false
        };
        addEntry(entry);
        setNewEntryContent('');
    };

    const handleAnalyze = async () => {
        setIsAnalysisLoading(true);
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
            setIsAnalysisLoading(false);
        }
    };

    const saveEdit = (id: string) => {
        const entry = entries.find(e => e.id === id);
        if(entry) {
            updateEntry({ ...entry, content: applyTypography(editContent) });
            setEditingId(null);
        }
    };

    const markdownComponents = {
        p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-800 dark:text-slate-200 leading-relaxed font-serif" {...props} />,
    };

    return (
        <div ref={scrollContainerRef} className="h-full overflow-y-auto custom-scrollbar-light bg-[#f8fafc] dark:bg-[#0f172a] relative">
             <motion.div 
                className="sticky top-0 z-40 w-full mb-[-20px]"
                animate={{ y: isHeaderHidden ? '-100%' : '0%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
             >
                 {/* FOG LAYER */}
                 <div className="absolute inset-0 h-[140%] pointer-events-none -z-10">
                    <div 
                        className="absolute inset-0 backdrop-blur-xl bg-[#f8fafc]/90 dark:bg-[#0f172a]/90"
                        style={{
                            maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)'
                        }}
                    />
                </div>
                
                <div className="relative z-10 w-full px-4 md:px-8 pb-2 pt-4">
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="flex gap-2">
                            <div className="relative flex-1 group">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" strokeWidth={1} />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Поиск по дневнику..."
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-shadow shadow-sm placeholder:text-slate-400"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>
                                )}
                            </div>
                            
                            <div className="relative" ref={datePickerRef}>
                                <button className="p-3 bg-white dark:bg-[#1e293b] text-slate-400 hover:text-indigo-500 rounded-2xl shadow-sm transition-colors">
                                    <Calendar size={20} />
                                </button>
                            </div>

                            <button 
                                onClick={handleAnalyze} 
                                disabled={isAnalysisLoading}
                                className="px-4 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 disabled:opacity-50"
                            >
                                {isAnalysisLoading ? <Sparkles size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                <span className="hidden md:inline">Анализ</span>
                            </button>
                        </div>
                    </div>
                </div>
             </motion.div>

             <div className="w-full px-4 md:px-8 pt-8 pb-20 relative z-0">
                <div className="max-w-3xl mx-auto">
                    
                    {/* NEW ENTRY INPUT */}
                    <div className="mb-8 bg-white dark:bg-[#1e293b] rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-all focus-within:shadow-md focus-within:border-indigo-100">
                        <textarea 
                            value={newEntryContent}
                            onChange={(e) => setNewEntryContent(e.target.value)}
                            placeholder="О чем ты думаешь сегодня?"
                            className="w-full bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-200 font-serif text-lg leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600 min-h-[80px]"
                        />
                        <div className="flex justify-between items-center mt-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                            <span className="text-xs text-slate-400 font-mono">{new Date().toLocaleDateString()}</span>
                            <button 
                                onClick={handleCreateEntry}
                                disabled={!newEntryContent.trim()}
                                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                Записать
                            </button>
                        </div>
                    </div>

                    {/* MENTOR ANALYSES */}
                    {mentorAnalyses.length > 0 && (
                        <div className="mb-8 space-y-4">
                            {mentorAnalyses.map(analysis => (
                                <div key={analysis.id} className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-[#1e293b] p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 relative group">
                                    <div className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest">
                                        <Bot size={14} /> Анализ Ментора
                                    </div>
                                    <div className="font-serif text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                                        <ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown>
                                    </div>
                                    <div className="mt-4 text-[10px] text-slate-400 font-mono flex justify-between items-center">
                                        <span>{new Date(analysis.date).toLocaleDateString()}</span>
                                        <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ENTRIES LIST */}
                    {filteredEntries.length === 0 ? (
                        <div className="py-10">
                            <EmptyState 
                                icon={MessageCircle} 
                                title="Дневник пуст" 
                                description="Самое время записать свои мысли" 
                            />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {filteredEntries.map(entry => {
                                const isEditing = editingId === entry.id;
                                const linkedTask = entry.linkedTaskId ? tasks.find(t => t.id === entry.linkedTaskId) : null;

                                return (
                                    <div key={entry.id} className="group relative pl-8 md:pl-0">
                                        {/* Timeline Line (Desktop) */}
                                        <div className="hidden md:block absolute left-[-20px] top-0 bottom-0 w-px bg-slate-100 dark:bg-slate-800" />
                                        <div className="hidden md:block absolute left-[-24px] top-6 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 ring-4 ring-[#f8fafc] dark:ring-[#0f172a]" />

                                        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                                                    {new Date(entry.date).toLocaleDateString()} • {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!isEditing && (
                                                        <button onClick={() => { setEditingId(entry.id); setEditContent(entry.content); }} className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => { if(confirm('В архив?')) deleteEntry(entry.id); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    <textarea 
                                                        value={editContent}
                                                        onChange={(e) => setEditContent(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl outline-none font-serif text-slate-800 dark:text-slate-200 text-base"
                                                        rows={4}
                                                    />
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => setEditingId(null)} className="text-xs font-bold uppercase text-slate-400 px-3 py-1">Отмена</button>
                                                        <button onClick={() => saveEdit(entry.id)} className="text-xs font-bold uppercase text-white bg-indigo-600 px-3 py-1 rounded-lg">Сохранить</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="font-serif text-slate-800 dark:text-slate-200 text-lg leading-relaxed whitespace-pre-wrap">
                                                    <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                                </div>
                                            )}

                                            {linkedTask && (
                                                <div 
                                                    className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-6 -mb-6 px-6 py-3 transition-colors"
                                                    onClick={() => onNavigateToTask(linkedTask.id)}
                                                >
                                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-lg">
                                                        <Link size={14} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] uppercase font-bold text-slate-400">Контекст</div>
                                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{linkedTask.title || linkedTask.content}</div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300" />
                                                </div>
                                            )}
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
