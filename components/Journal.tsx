import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { JournalEntry, MentorAnalysis, Task, Note, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { Plus, Search, Book, Sparkles, X, ChevronRight, Calendar, Smile, Frown, Meh, Save, Trash2, Edit3, Link as LinkIcon, Unlink, StickyNote, CheckCircle2, Circle, ArrowRight, Zap, RefreshCw, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from './Tooltip';
import { MOOD_TAGS, applyTypography } from '../constants';
import EmptyState from './EmptyState';

interface Props {
  entries: JournalEntry[];
  mentorAnalyses: MentorAnalysis[];
  tasks: Task[];
  notes: Note[];
  config: AppConfig;
  addEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (entry: JournalEntry) => void;
  addMentorAnalysis: (analysis: MentorAnalysis) => void;
  deleteMentorAnalysis: (id: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
  onNavigateToTask?: (taskId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
}

const getNotePreviewContent = (content: string) => {
    let cleanText = content.replace(/!\[.*?\]\((.*?)\)/g, ''); // Remove images
    cleanText = cleanText.replace(/[ \t]+/g, ' ').trim();
    return cleanText.length > 100 ? cleanText.substring(0, 100) + '...' : cleanText;
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
};

const CollapsibleSection = ({ title, children, icon, defaultOpen = true }: { title: string, children: React.ReactNode, icon?: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-2">
            <div onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {icon} {title}
                </div>
                <div className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={14} />
                </div>
            </div>
            {isOpen && <div className="p-3 pt-0 border-t border-slate-200/30 dark:border-slate-700/30">{children}</div>}
        </div>
    );
};

const Journal: React.FC<Props> = ({ 
    entries, mentorAnalyses, tasks, notes, config, 
    addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, 
    initialTaskId, onClearInitialTask, onNavigateToTask, onNavigateToNote 
}) => {
    const [activeTab, setActiveTab] = useState<'entries' | 'analysis'>('entries');
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // New Entry State
    const [isCreating, setIsCreating] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [newMood, setNewMood] = useState<number | undefined>(undefined);
    
    useEffect(() => {
        if (initialTaskId) {
            // Check if there is already an entry for this task? 
            // Or auto-start creating one.
            setIsCreating(true);
            setNewContent(`Reflecting on task: ...`); 
            // Ideally we'd look up the task title but we don't have it easily accessible without finding it
            const task = tasks.find(t => t.id === initialTaskId);
            if (task) {
                setNewTitle(`Рефлексия: ${task.title || 'Задача'}`);
            }
            onClearInitialTask?.();
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()) || e.title?.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const handleCreateEntry = () => {
        if (!newContent.trim()) return;
        
        const entry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            title: newTitle || undefined,
            content: newContent,
            mood: newMood,
            isInsight: false,
            linkedTaskId: initialTaskId || undefined // Attach if we came from a task
        };
        addEntry(entry);
        setIsCreating(false);
        setNewContent('');
        setNewTitle('');
        setNewMood(undefined);
    };

    const handleRunAnalysis = async () => {
        if (entries.length < 3) {
            alert("Нужно хотя бы 3 записи для анализа.");
            return;
        }
        setIsAnalyzing(true);
        try {
            const analysisText = await analyzeJournalPath(entries, config);
            const analysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: analysisText,
                mentorName: 'AI Mentor'
            };
            addMentorAnalysis(analysis);
            setActiveTab('analysis');
        } catch (e) {
            console.error(e);
            alert("Ошибка анализа");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleLinkedNote = (noteId: string) => {
        if (!selectedEntry) return;
        const currentIds = selectedEntry.linkedNoteIds || (selectedEntry.linkedNoteId ? [selectedEntry.linkedNoteId] : []);
        
        let newIds;
        if (currentIds.includes(noteId)) {
            newIds = currentIds.filter(id => id !== noteId);
        } else {
            newIds = [...currentIds, noteId];
        }
        
        updateEntry({ 
            ...selectedEntry, 
            linkedNoteIds: newIds, 
            linkedNoteId: undefined // Migrate legacy to new array
        });
    };

    return (
        <div className="flex h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden relative">
            <div className="flex-1 flex flex-col min-w-0">
                <header className="p-6 md:p-8 pb-4 shrink-0 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники пути</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleRunAnalysis}
                            disabled={isAnalyzing}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-500 transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isAnalyzing ? <RefreshCw size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                            {isAnalyzing ? 'Анализ...' : 'Анализ Пути'}
                        </button>
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-md"
                        >
                            <Plus size={14} /> Запись
                        </button>
                    </div>
                </header>

                <div className="px-6 md:px-8 mb-4">
                    <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
                        <button 
                            onClick={() => setActiveTab('entries')}
                            className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'entries' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Записи ({entries.length})
                        </button>
                        <button 
                            onClick={() => setActiveTab('analysis')}
                            className={`pb-3 text-sm font-medium transition-colors ${activeTab === 'analysis' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Менторство ({mentorAnalyses.length})
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-light px-6 md:px-8 pb-20">
                    {activeTab === 'entries' && (
                        <>
                            <div className="mb-6 relative">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Поиск по записям..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 transition-colors text-sm"
                                />
                            </div>

                            {filteredEntries.length === 0 ? (
                                <EmptyState icon={Book} title="Дневник пуст" description="Начни записывать свои мысли и наблюдения" />
                            ) : (
                                <div className="space-y-4 max-w-3xl mx-auto">
                                    {filteredEntries.map(entry => (
                                        <div 
                                            key={entry.id} 
                                            onClick={() => setSelectedEntry(entry)}
                                            className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-slate-400">{new Date(entry.date).toLocaleDateString()}</span>
                                                    {entry.mood && (
                                                        <span className="text-lg" title={`Настроение: ${entry.mood}/5`}>
                                                            {entry.mood >= 4 ? '🙂' : entry.mood === 3 ? '😐' : '😕'}
                                                        </span>
                                                    )}
                                                    {entry.isInsight && (
                                                        <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Zap size={10} className="fill-current"/> Insight
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            
                                            {entry.title && <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{applyTypography(entry.title)}</h3>}
                                            
                                            <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 font-serif leading-relaxed">
                                                <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                            </div>

                                            {(entry.moodTags || entry.linkedTaskId || (entry.linkedNoteIds && entry.linkedNoteIds.length > 0)) && (
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {entry.moodTags?.map(tag => (
                                                        <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                    {entry.linkedTaskId && <span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 size={10}/> Task</span>}
                                                    {(entry.linkedNoteIds && entry.linkedNoteIds.length > 0) && <span className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-2 py-1 rounded flex items-center gap-1"><StickyNote size={10}/> Notes</span>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'analysis' && (
                        <div className="space-y-6 max-w-3xl mx-auto">
                            {mentorAnalyses.length === 0 ? (
                                <EmptyState icon={Sparkles} title="Нет анализов" description="Накопите записи и запустите Анализ Пути" color="indigo" />
                            ) : (
                                mentorAnalyses.map(analysis => (
                                    <div key={analysis.id} className="bg-white dark:bg-[#1e293b] p-8 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-400 to-purple-500" />
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Mentor Analysis</div>
                                                <div className="text-sm text-slate-400">{new Date(analysis.date).toLocaleDateString()}</div>
                                            </div>
                                            <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                        <div className="prose prose-sm dark:prose-invert max-w-none font-serif leading-relaxed">
                                            <ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* CREATE MODAL */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh]"
                        >
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200">Новая запись</h3>
                                <button onClick={() => setIsCreating(false)}><X size={20} className="text-slate-400" /></button>
                            </div>
                            <div className="p-6 flex-1 overflow-y-auto">
                                <input 
                                    type="text" 
                                    placeholder="Заголовок (опционально)" 
                                    className="w-full text-lg font-bold mb-4 bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                />
                                <textarea 
                                    placeholder="О чем думаешь?" 
                                    className="w-full h-64 resize-none bg-transparent border-none outline-none text-base text-slate-700 dark:text-slate-300 font-serif leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    value={newContent}
                                    onChange={e => setNewContent(e.target.value)}
                                    autoFocus
                                />
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex gap-4 items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Настроение:</span>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(m => (
                                            <button 
                                                key={m} 
                                                onClick={() => setNewMood(m)}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${newMood === m ? 'bg-indigo-100 border-indigo-300 text-lg' : 'border-slate-200 text-sm grayscale opacity-50 hover:opacity-100 hover:grayscale-0'}`}
                                            >
                                                {m === 1 ? '😖' : m === 2 ? '😕' : m === 3 ? '😐' : m === 4 ? '🙂' : '🤩'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-sm">Отмена</button>
                                <button onClick={handleCreateEntry} disabled={!newContent.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">Сохранить</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DETAIL / EDIT SIDE PANEL */}
            <AnimatePresence>
                {selectedEntry && (
                    <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="absolute top-0 right-0 h-full w-full md:w-[600px] bg-white dark:bg-[#1e293b] border-l border-slate-200 dark:border-slate-700 shadow-2xl z-20 flex flex-col"
                    >
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedEntry(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400">
                                    <ArrowRight size={20} />
                                </button>
                                <span className="text-sm font-mono text-slate-400">{new Date(selectedEntry.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-1">
                                <Tooltip content={selectedEntry.isInsight ? "Убрать Insight" : "Пометить как Insight"}>
                                    <button 
                                        onClick={() => updateEntry({ ...selectedEntry, isInsight: !selectedEntry.isInsight })}
                                        className={`p-2 rounded-lg transition-colors ${selectedEntry.isInsight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        <Zap size={18} className={selectedEntry.isInsight ? "fill-current" : ""} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Удалить">
                                    <button 
                                        onClick={() => { if(confirm("Удалить запись?")) { deleteEntry(selectedEntry.id); setSelectedEntry(null); } }}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6 md:p-8">
                            <input 
                                className="text-2xl font-bold text-slate-900 dark:text-slate-100 bg-transparent border-none outline-none w-full mb-4 placeholder:text-slate-300"
                                value={selectedEntry.title || ''}
                                onChange={(e) => updateEntry({ ...selectedEntry, title: e.target.value })}
                                placeholder="Заголовок..."
                            />
                            
                            <textarea 
                                className="w-full min-h-[300px] resize-none bg-transparent border-none outline-none text-base text-slate-700 dark:text-slate-300 font-serif leading-relaxed mb-8"
                                value={selectedEntry.content}
                                onChange={(e) => updateEntry({ ...selectedEntry, content: e.target.value })}
                            />

                            {/* Linked Notes Render - Grouped */}
                            {(() => {
                                const linkedNotesList = notes.filter(n => (selectedEntry.linkedNoteIds?.includes(n.id)) || (selectedEntry.linkedNoteId === n.id));
                                if (linkedNotesList.length === 0) return null;
                                
                                return (
                                    <CollapsibleSection title="Контекст: Заметки" icon={<StickyNote size={14}/>}>
                                        <div className="space-y-4">
                                            {linkedNotesList.map((note, index) => (
                                                <div key={note.id} className={`flex items-start gap-2 ${index > 0 ? "pt-3 border-t border-slate-200/50 dark:border-slate-700/50" : ""}`}>
                                                    <Tooltip content="Открепить заметку">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleLinkedNote(note.id);
                                                            }}
                                                            className="mt-0.5 p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                                                        >
                                                            <Unlink size={14} />
                                                        </button>
                                                    </Tooltip>
                                                    <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif cursor-pointer hover:text-indigo-500 transition-colors flex-1" onClick={() => onNavigateToNote?.(note.id)}>
                                                        <ReactMarkdown components={markdownComponents}>{getNotePreviewContent(note.content)}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CollapsibleSection>
                                );
                            })()}

                            {/* Task Context */}
                            {selectedEntry.linkedTaskId && (() => {
                                const task = tasks.find(t => t.id === selectedEntry.linkedTaskId);
                                if (!task) return null;
                                return (
                                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <CheckCircle2 size={12} /> Контекст задачи
                                        </div>
                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => onNavigateToTask?.(task.id)}>
                                            {task.title || 'Untitled Task'}
                                        </div>
                                    </div>
                                );
                            })()}

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Journal;