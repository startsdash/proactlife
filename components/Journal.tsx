import React, { useState, useEffect, useRef } from 'react';
import Masonry from 'react-masonry-css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'framer-motion';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography } from '../constants';
import { PenTool, Trash2, Edit3, Sparkles, Book, X, Search, Calendar, ChevronRight, MessageSquare, BrainCircuit, Save, RotateCcw } from 'lucide-react';
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

const breakpointColumnsObj = {
  default: 3,
  1100: 2,
  700: 1
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-800 dark:text-slate-200" {...props} />,
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
    const [newEntryContent, setNewEntryContent] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAnalyses, setShowAnalyses] = useState(false);

    useEffect(() => {
        if (initialTaskId) {
            // Find entries related to this task
            const relatedEntry = entries.find(e => e.linkedTaskId === initialTaskId);
            if (relatedEntry) {
                setSelectedEntry(relatedEntry);
            } else {
                // If no entry, pre-fill new entry with context
                const task = tasks.find(t => t.id === initialTaskId);
                if (task) {
                    setNewEntryContent(`## Рефлексия по задаче: ${task.title || 'Без названия'}\n\n`);
                }
            }
            onClearInitialTask?.();
        }
    }, [initialTaskId, entries, tasks, onClearInitialTask]);

    const handleAdd = () => {
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
        if (entries.length === 0) return;
        setIsAnalyzing(true);
        try {
            const result = await analyzeJournalPath(entries, config);
            addMentorAnalysis({
                id: Date.now().toString(),
                date: Date.now(),
                content: result,
                mentorName: "AI Mentor"
            });
            setShowAnalyses(true);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const startEditing = (entry: JournalEntry) => {
        setEditingId(entry.id);
        setEditContent(entry.content);
        if (!selectedEntry) setSelectedEntry(entry);
    };

    const saveEdit = () => {
        if (selectedEntry && editingId) {
            updateEntry({ ...selectedEntry, content: applyTypography(editContent) });
            setEditingId(null);
            setEditContent('');
            // Update selected entry in modal if open
            setSelectedEntry({ ...selectedEntry, content: applyTypography(editContent) });
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditContent('');
    };

    const handleCloseModal = () => {
        setSelectedEntry(null);
        setEditingId(null);
        setEditContent('');
    };

    // Filter Logic
    const filteredEntries = entries.filter(e => 
        e.content.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => b.date - a.date);

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            {/* Header */}
            <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-6 shrink-0 z-10">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники пути</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowAnalyses(!showAnalyses)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${showAnalyses ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-500 shadow-sm'}`}
                        >
                            <BrainCircuit size={16} /> Анализ Пути
                        </button>
                    </div>
                </header>
            </div>

            {/* Input & Search */}
            <div className="px-4 md:px-8 pb-4 shrink-0 z-10 space-y-4">
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-all focus-within:shadow-md focus-within:border-indigo-300 dark:focus-within:border-indigo-700">
                    <textarea 
                        value={newEntryContent}
                        onChange={(e) => setNewEntryContent(e.target.value)}
                        placeholder="О чем ты думаешь сегодня?"
                        className="w-full bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 min-h-[80px] font-serif text-base"
                    />
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-xs text-slate-400 font-mono">{new Date().toLocaleDateString()}</div>
                        <button 
                            onClick={handleAdd}
                            disabled={!newEntryContent.trim()}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <PenTool size={14} /> Записать
                        </button>
                    </div>
                </div>

                <div className="relative max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Поиск по записям..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-transparent rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-200 dark:focus:border-indigo-800 transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20 relative z-0">
                {showAnalyses ? (
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">Анализ Ментора</h2>
                            <button 
                                onClick={handleAnalyze} 
                                disabled={isAnalyzing}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {isAnalyzing ? <span className="animate-spin">⏳</span> : <Sparkles size={16} />} 
                                {isAnalyzing ? 'Анализирую...' : 'Новый анализ'}
                            </button>
                        </div>
                        
                        {mentorAnalyses.length === 0 ? (
                            <EmptyState icon={BrainCircuit} title="Нет анализов" description="Запроси анализ своих записей у ИИ-ментора." color="indigo" />
                        ) : (
                            mentorAnalyses.map(analysis => (
                                <div key={analysis.id} className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                                <BrainCircuit size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{analysis.mentorName}</div>
                                                <div className="text-xs text-slate-400">{new Date(analysis.date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => { if(confirm("Удалить анализ?")) deleteMentorAnalysis(analysis.id); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-serif">
                                        <ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <>
                        {filteredEntries.length === 0 ? (
                            <div className="mt-12">
                                <EmptyState icon={Book} title="Дневник пуст" description="Ваши мысли и инсайты будут жить здесь." color="cyan" />
                            </div>
                        ) : (
                            <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                                {filteredEntries.map(entry => (
                                    <div 
                                        key={entry.id} 
                                        onClick={() => setSelectedEntry(entry)}
                                        className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar size={12} />
                                                {new Date(entry.date).toLocaleDateString()}
                                            </div>
                                            {entry.isInsight && <Sparkles size={14} className="text-amber-500 fill-amber-500" />}
                                        </div>
                                        
                                        <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-serif line-clamp-6">
                                            <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                        </div>

                                        {entry.mood && (
                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                                <div className="text-xs font-bold text-slate-500">Настроение:</div>
                                                <div className="flex gap-1">
                                                    {Array.from({length: 5}).map((_, i) => (
                                                        <div key={i} className={`w-2 h-2 rounded-full ${i < entry.mood! ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </Masonry>
                        )}
                    </>
                )}
            </div>

            {/* DETAIL MODAL */}
            <AnimatePresence>
                {selectedEntry && (
                    <div className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCloseModal}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg text-cyan-600 dark:text-cyan-400">
                                        <Book size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {new Date(selectedEntry.date).toLocaleDateString()} • {new Date(selectedEntry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Запись в дневнике</div>
                                    </div>
                                </div>
                                <div className="flex items-center shrink-0 gap-1">
                                    {!editingId && (
                                        <>
                                            <Tooltip content="Редактировать"><button onClick={() => startEditing(selectedEntry)} className="p-2 text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"><Edit3 size={16} /></button></Tooltip>
                                            <Tooltip content="Отправить в архив"><button onClick={() => { if(confirm("Отправить в архив?")) { deleteEntry(selectedEntry.id); handleCloseModal(); } }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent rounded-lg transition-colors"><Trash2 size={16} /></button></Tooltip>
                                        </>
                                    )}
                                    <button onClick={handleCloseModal} className="p-2 text-slate-300 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded-lg ml-2"><X size={20}/></button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar-ghost">
                                {editingId === selectedEntry.id ? (
                                    <textarea 
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full h-full min-h-[300px] bg-transparent border-none outline-none resize-none font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200"
                                        autoFocus
                                    />
                                ) : (
                                    <div className="font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 markdown-body">
                                        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                            {selectedEntry.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>

                            {editingId === selectedEntry.id ? (
                                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                                    <button onClick={cancelEdit} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium">Отмена</button>
                                    <button onClick={saveEdit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2">
                                        <Save size={16} /> Сохранить
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-400">
                                    <div className="flex gap-4">
                                        {selectedEntry.isInsight && <span className="flex items-center gap-1 text-amber-500 font-bold"><Sparkles size={14} /> Инсайт</span>}
                                        {selectedEntry.mood && <span>Настроение: {selectedEntry.mood}/5</span>}
                                    </div>
                                    <div className="font-mono opacity-50">ID: {selectedEntry.id.slice(-6)}</div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Journal;