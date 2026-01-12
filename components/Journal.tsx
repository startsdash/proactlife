import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography } from '../constants';
import { PenTool, Book, Sparkles, Calendar, Trash2, Edit3, X, RotateCcw, Link2, Quote, ArrowRight, BrainCircuit } from 'lucide-react';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';

interface Props {
  entries: JournalEntry[];
  mentorAnalyses: MentorAnalysis[];
  tasks: Task[];
  config: AppConfig;
  addEntry: (entry: JournalEntry) => void;
  updateEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  addMentorAnalysis: (analysis: MentorAnalysis) => void;
  deleteMentorAnalysis: (id: string) => void;
  initialTaskId: string | null;
  onClearInitialTask: () => void;
  onNavigateToTask: (taskId: string) => void;
}

const htmlToMarkdown = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    let md = temp.innerText || '';
    // Basic cleanup
    return applyTypography(md.trim());
};

const Journal: React.FC<Props> = ({ 
    entries, 
    mentorAnalyses, 
    tasks, 
    config, 
    addEntry, 
    updateEntry, 
    deleteEntry, 
    addMentorAnalysis, 
    deleteMentorAnalysis, 
    initialTaskId, 
    onClearInitialTask, 
    onNavigateToTask 
}) => {
    const [isCreationExpanded, setIsCreationExpanded] = useState(false);
    const creationRef = useRef<HTMLDivElement>(null);
    const creationContentEditableRef = useRef<HTMLDivElement>(null);
    const [creationDate, setCreationDate] = useState(new Date().toISOString().slice(0, 10));
    const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
    
    // Mentor Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Initial Task Handling
    useEffect(() => {
        if (initialTaskId) {
            setLinkedTaskId(initialTaskId);
            setIsCreationExpanded(true);
            setTimeout(() => creationContentEditableRef.current?.focus(), 100);
            onClearInitialTask();
        }
    }, [initialTaskId, onClearInitialTask]);

    // Close click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (creationRef.current && !creationRef.current.contains(event.target as Node)) {
                if (creationContentEditableRef.current && !creationContentEditableRef.current.innerText.trim()) {
                    setIsCreationExpanded(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCreateEntry = () => {
        const content = creationContentEditableRef.current?.innerText || '';
        if (!content.trim()) return;

        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: new Date(creationDate).getTime(),
            content: applyTypography(content.trim()),
            linkedTaskId: linkedTaskId || undefined,
            isInsight: false
        };

        addEntry(newEntry);
        
        // Reset
        if (creationContentEditableRef.current) creationContentEditableRef.current.innerText = '';
        setLinkedTaskId(null);
        setIsCreationExpanded(false);
    };

    const handleRunAnalysis = async () => {
        if (entries.length < 3) {
            alert("Нужно хотя бы 3 записи для анализа");
            return;
        }
        setIsAnalyzing(true);
        try {
            const result = await analyzeJournalPath(entries, config);
            addMentorAnalysis({
                id: Date.now().toString(),
                date: Date.now(),
                content: result,
                mentorName: "AI Mentor"
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const linkedTask = tasks.find(t => t.id === linkedTaskId);

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
             
             {/* Header */}
             <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-6 shrink-0 z-10">
                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники пути</p>
                    </div>
                    <div>
                        <button 
                            onClick={handleRunAnalysis}
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                        >
                            {isAnalyzing ? <span className="animate-spin">⏳</span> : <BrainCircuit size={16} />}
                            {isAnalyzing ? 'Анализ...' : 'Анализ Пути'}
                        </button>
                    </div>
                </header>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar-light relative z-0 pb-20">
                 <div className="w-full px-4 md:px-8">
                    
                    {/* CREATION BLOCK */}
                    <div className="max-w-3xl mx-auto w-full mb-12 relative z-30" ref={creationRef}>
                        <motion.div 
                            layout
                            className={`bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all ${isCreationExpanded ? 'ring-2 ring-indigo-100 dark:ring-indigo-900/30' : 'hover:shadow-md'}`}
                        >
                            {!isCreationExpanded ? (
                                <div 
                                    onClick={() => { setIsCreationExpanded(true); setTimeout(() => creationContentEditableRef.current?.focus(), 100); }}
                                    className="p-4 cursor-text flex items-center justify-between group h-[52px]"
                                >
                                    <span className="text-slate-400 dark:text-slate-500 font-serif italic text-base">Записать мысль...</span>
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <PenTool size={18} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                        <input 
                                            type="date" 
                                            value={creationDate}
                                            onChange={(e) => setCreationDate(e.target.value)}
                                            className="bg-transparent text-xs font-mono text-slate-500 uppercase tracking-wider outline-none"
                                        />
                                        {linkedTask && (
                                            <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">
                                                <Link2 size={12} />
                                                <span className="truncate max-w-[150px]">{linkedTask.title}</span>
                                                <button onClick={() => setLinkedTaskId(null)}><X size={12}/></button>
                                            </div>
                                        )}
                                    </div>
                                    <div 
                                        ref={creationContentEditableRef}
                                        contentEditable
                                        className="w-full min-h-[150px] p-6 text-base text-slate-800 dark:text-slate-200 font-serif leading-relaxed outline-none whitespace-pre-wrap"
                                        data-placeholder="О чём ты думаешь?"
                                    />
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
                                        <button onClick={() => setIsCreationExpanded(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider">Отмена</button>
                                        <button onClick={handleCreateEntry} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors">Сохранить</button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* MENTOR ANALYSES */}
                    {mentorAnalyses.length > 0 && (
                        <div className="max-w-3xl mx-auto w-full mb-12 space-y-6">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Отчеты Ментора</h3>
                            {mentorAnalyses.map(analysis => (
                                <div key={analysis.id} className="bg-gradient-to-br from-violet-50 to-white dark:from-violet-900/10 dark:to-[#1e293b] p-6 rounded-2xl border border-violet-100 dark:border-violet-900/30 relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg text-violet-600 dark:text-violet-400">
                                                <Sparkles size={18} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Анализ Пути</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{new Date(analysis.date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                                        <ReactMarkdown 
                                            components={{
                                                p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
                                                strong: ({node, ...props}: any) => <strong className="font-bold text-violet-700 dark:text-violet-300" {...props} />
                                            }}
                                        >
                                            {analysis.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ENTRIES LIST */}
                    <div className="max-w-3xl mx-auto w-full space-y-8 relative">
                        <div className="absolute left-4 md:left-0 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
                        
                        {entries.length === 0 ? (
                            <div className="pl-12 py-12">
                                <EmptyState icon={Book} title="Чистая страница" description="Начни писать свою историю" color="cyan" />
                            </div>
                        ) : (
                            entries.sort((a, b) => b.date - a.date).map(entry => {
                                const linkedT = entry.linkedTaskId ? tasks.find(t => t.id === entry.linkedTaskId) : null;
                                return (
                                    <div key={entry.id} className="relative pl-12 md:pl-8 group">
                                        {/* Timeline Node */}
                                        <div className="absolute left-4 md:left-0 top-6 w-2 h-2 -ml-[3px] rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-[#0f172a] z-10 group-hover:bg-indigo-500 group-hover:scale-125 transition-all" />
                                        
                                        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-xs font-bold text-slate-400 font-mono uppercase tracking-widest">
                                                        {new Date(entry.date).toLocaleDateString()}
                                                    </div>
                                                    {linkedT && (
                                                        <button 
                                                            onClick={() => onNavigateToTask(linkedT.id)}
                                                            className="flex items-center gap-1 text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-colors"
                                                        >
                                                            <Link2 size={10} /> {linkedT.title || "Задача"}
                                                        </button>
                                                    )}
                                                    {entry.isInsight && (
                                                        <span className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                                            <Sparkles size={10} /> Insight
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Tooltip content={entry.isInsight ? "Убрать из инсайтов" : "Отметить как инсайт"}>
                                                        <button 
                                                            onClick={() => updateEntry({...entry, isInsight: !entry.isInsight})} 
                                                            className={`p-1.5 rounded-lg transition-colors ${entry.isInsight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-50'}`}
                                                        >
                                                            <Sparkles size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content="Архивировать">
                                                        <button 
                                                            onClick={() => deleteEntry(entry.id)} 
                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            
                                            <div className="font-serif text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {entry.content}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                 </div>
             </div>
        </div>
    );
};

export default Journal;