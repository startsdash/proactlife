
import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Masonry from 'react-masonry-css';
import { motion, AnimatePresence } from 'framer-motion';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, MOOD_TAGS } from '../constants';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';
import { Book, Plus, Search, Sparkles, X, Trash2, Edit3, Calendar, BrainCircuit, ChevronRight, Save, Link, Share2, Bot, Layout, Maximize2 } from 'lucide-react';

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

const getEntryColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const breakpointColumnsObj = {
  default: 3,
  1100: 2,
  700: 1
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-800 dark:text-slate-200" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
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
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [isWriting, setIsWriting] = useState(false);
    const [editorContent, setEditorContent] = useState('');
    const [editorTitle, setEditorTitle] = useState('');
    const [editorMood, setEditorMood] = useState<number | undefined>(undefined);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [linkedTask, setLinkedTask] = useState<string | null>(initialTaskId || null);

    useEffect(() => {
        if (initialTaskId) {
            setIsWriting(true);
            setLinkedTask(initialTaskId);
            // Try to find if we are editing an existing entry for this task? 
            // For now, assume new entry for reflection.
            if(onClearInitialTask) onClearInitialTask();
        }
    }, [initialTaskId, onClearInitialTask]);

    const handleSave = () => {
        if (!editorContent.trim()) return;

        const entry: JournalEntry = {
            id: editingId || Date.now().toString(),
            date: selectedEntry?.date || Date.now(),
            title: applyTypography(editorTitle),
            content: applyTypography(editorContent),
            mood: editorMood,
            linkedTaskId: linkedTask || undefined,
            isInsight: false
        };

        if (editingId) {
            updateEntry(entry);
        } else {
            addEntry(entry);
        }

        closeEditor();
    };

    const startWriting = () => {
        setEditorContent('');
        setEditorTitle('');
        setEditorMood(undefined);
        setLinkedTask(null);
        setEditingId(null);
        setIsWriting(true);
    };

    const startEditing = (entry: JournalEntry) => {
        setEditorContent(entry.content);
        setEditorTitle(entry.title || '');
        setEditorMood(entry.mood);
        setLinkedTask(entry.linkedTaskId || null);
        setEditingId(entry.id);
        setIsWriting(true);
        // If we were viewing it, close view
        setSelectedEntry(null);
    };

    const closeEditor = () => {
        setIsWriting(false);
        setEditingId(null);
        setEditorContent('');
        setEditorTitle('');
        setLinkedTask(null);
    };

    const handleCloseModal = () => {
        setSelectedEntry(null);
        if (isWriting) closeEditor();
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
        } catch (e) {
            console.error("Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => {
                const q = searchQuery.toLowerCase();
                return (
                    e.content.toLowerCase().includes(q) || 
                    (e.title && e.title.toLowerCase().includes(q))
                );
            })
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const getTaskTitle = (taskId?: string) => {
        if (!taskId) return null;
        const t = tasks.find(x => x.id === taskId);
        return t ? (t.title || t.content.substring(0, 30)) : 'Unknown Task';
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            <div className="shrink-0 w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 z-50">
                <header className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники пути</p>
                    </div>
                    <div className="flex gap-2">
                        <Tooltip content="Анализ пути (AI)">
                            <button 
                                onClick={handleAnalyze} 
                                disabled={isAnalyzing}
                                className="p-3 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-sm hover:shadow-md transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                            >
                                {isAnalyzing ? <Sparkles size={20} className="animate-spin" /> : <BrainCircuit size={20} />}
                            </button>
                        </Tooltip>
                        <button 
                            onClick={startWriting} 
                            className="p-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            <Plus size={20} /> <span className="hidden md:inline text-sm font-bold uppercase tracking-wider">Запись</span>
                        </button>
                    </div>
                </header>

                {/* Search */}
                <div className="relative max-w-xl">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Поиск по записям..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 transition-shadow shadow-sm placeholder:text-slate-400 dark:text-slate-200"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
                {/* Mentor Analyses */}
                {mentorAnalyses.length > 0 && (
                    <div className="mb-8 space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Менторские разборы</h3>
                        {mentorAnalyses.slice(0, 3).map(analysis => (
                            <div key={analysis.id} className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 p-6 rounded-3xl relative group">
                                <div className="flex items-center gap-2 mb-3 text-indigo-600 dark:text-indigo-400">
                                    <Bot size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">{analysis.mentorName}</span>
                                    <span className="text-xs opacity-50">• {new Date(analysis.date).toLocaleDateString()}</span>
                                </div>
                                <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-serif leading-relaxed">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis.content}</ReactMarkdown>
                                </div>
                                <button 
                                    onClick={() => deleteMentorAnalysis(analysis.id)} 
                                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Journal Entries */}
                {filteredEntries.length > 0 ? (
                    <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                        {filteredEntries.map(entry => {
                            const taskTitle = getTaskTitle(entry.linkedTaskId);
                            return (
                                <div 
                                    key={entry.id}
                                    onClick={() => setSelectedEntry(entry)}
                                    className={`${getEntryColorClass(entry.color)} backdrop-blur-md rounded-3xl shadow-sm border border-slate-200/50 dark:border-slate-800 p-6 mb-6 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                                            <Calendar size={12} />
                                            <span>{new Date(entry.date).toLocaleDateString()}</span>
                                        </div>
                                        {entry.mood && (
                                            <div className="text-lg">{MOOD_TAGS[entry.mood - 1]?.emoji}</div>
                                        )}
                                    </div>

                                    {entry.title && (
                                        <h3 className="font-sans text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight">
                                            {entry.title}
                                        </h3>
                                    )}

                                    <div className="text-slate-600 dark:text-slate-300 font-serif text-sm leading-relaxed line-clamp-4 mb-4">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                                            {entry.content}
                                        </ReactMarkdown>
                                    </div>

                                    {taskTitle && (
                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
                                            <Link size={12} />
                                            <span className="truncate max-w-[200px]">{taskTitle}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </Masonry>
                ) : (
                    <EmptyState 
                        icon={Book} 
                        title="Дневник пуст" 
                        description="Запиши свои мысли, инсайты или просто то, что тебя волнует." 
                        color="cyan"
                        actionLabel="Создать запись"
                        onAction={startWriting}
                    />
                )}
            </div>

            {/* Modal: Write / View */}
            <AnimatePresence>
                {(isWriting || selectedEntry) && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={handleCloseModal}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    {isWriting ? (
                                        <input 
                                            type="text" 
                                            placeholder="Заголовок (необязательно)" 
                                            value={editorTitle}
                                            onChange={e => setEditorTitle(e.target.value)}
                                            className="text-xl font-bold bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 w-full"
                                        />
                                    ) : (
                                        <div className="flex flex-col">
                                            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                                                {selectedEntry && new Date(selectedEntry.date).toLocaleString()}
                                            </span>
                                            {selectedEntry?.title && <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedEntry.title}</h2>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center shrink-0 gap-1">
                                    {/* Action Buttons for View Mode */}
                                    {!isWriting && selectedEntry && (
                                        <>
                                            <Tooltip content="Редактировать">
                                                <button onClick={() => startEditing(selectedEntry)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><Edit3 size={18} /></button>
                                            </Tooltip>
                                            <Tooltip content="Удалить">
                                                <button onClick={() => { if(confirm("В архив?")) { deleteEntry(selectedEntry.id); handleCloseModal(); } }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                            </Tooltip>
                                        </>
                                    )}
                                    <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg ml-2"><X size={20}/></button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6">
                                {isWriting ? (
                                    <textarea 
                                        className="w-full h-full bg-transparent border-none outline-none resize-none text-slate-700 dark:text-slate-300 text-lg leading-relaxed font-serif placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        placeholder="О чем ты думаешь сегодня?"
                                        value={editorContent}
                                        onChange={e => setEditorContent(e.target.value)}
                                        autoFocus
                                    />
                                ) : (
                                    <div className="prose prose-lg dark:prose-invert max-w-none font-serif text-slate-700 dark:text-slate-300 leading-loose">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                                            {selectedEntry?.content || ''}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                                {isWriting ? (
                                    <>
                                        <div className="flex gap-2">
                                            {/* Mood Selector Mini */}
                                            {/* ... (Implement if needed, simplified for now) */}
                                        </div>
                                        <button 
                                            onClick={handleSave} 
                                            disabled={!editorContent.trim()}
                                            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                                        >
                                            <Save size={16} /> Сохранить
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-4 w-full">
                                        {selectedEntry?.linkedTaskId && (
                                            <button 
                                                onClick={() => onNavigateToTask && onNavigateToTask(selectedEntry.linkedTaskId!)}
                                                className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider"
                                            >
                                                <Link size={14} /> Перейти к задаче
                                            </button>
                                        )}
                                        {selectedEntry?.mood && (
                                            <div className="text-xl ml-auto" title="Настроение">
                                                {MOOD_TAGS[selectedEntry.mood - 1]?.emoji}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Journal;
