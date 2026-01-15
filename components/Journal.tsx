
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Masonry from 'react-masonry-css';
import { JournalEntry, Task, Note, AppConfig, MentorAnalysis, Mentor } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, MOOD_TAGS } from '../constants';
import { Tooltip } from './Tooltip';
import { 
    Book, Plus, Trash2, X, Zap, Calendar, Search, 
    ChevronRight, Sparkles, Filter, Edit3, 
    MoreHorizontal, Link, StickyNote, Unlink, ArrowRight,
    CheckCircle2, Bot, Layout, Quote, MessageSquare,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'cyan', class: 'bg-cyan-50 dark:bg-cyan-900/20', hex: '#ecfeff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const getEntryColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const breakpointColumnsObj = {
  default: 3,
  1100: 2,
  700: 1
};

const getNotePreviewContent = (content: string) => {
    let cleanText = content.replace(/!\[.*?\]\(.*?\)/g, '');
    cleanText = cleanText.replace(/[ \t]+/g, ' ').trim();
    if (cleanText.length > 150) {
        cleanText = cleanText.slice(0, 150) + '...';
    }
    return cleanText;
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-lg mt-3 mb-2" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-base mt-2 mb-1" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 pl-4 italic text-slate-500 my-2" {...props} />,
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, icon, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-2">
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors group select-none"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
           {icon}
           {title}
        </div>
        <ChevronRight size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </div>
      {isOpen && (
        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-1 duration-200">
           <div className="pt-2 border-t border-slate-200/30 dark:border-slate-700/30 text-sm">
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const Journal: React.FC<Props> = ({ 
    entries, mentorAnalyses, tasks, notes, config, 
    addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis,
    initialTaskId, onClearInitialTask, onNavigateToTask, onNavigateToNote
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isWriting, setIsWriting] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [linkedTask, setLinkedTask] = useState<Task | null>(null);
    const [linkedNoteIds, setLinkedNoteIds] = useState<string[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Auto-open write mode if initialTaskId provided
    useEffect(() => {
        if (initialTaskId) {
            const task = tasks.find(t => t.id === initialTaskId);
            if (task) {
                setLinkedTask(task);
                setNewTitle(`Рефлексия: ${task.title || 'Задача'}`);
                setIsWriting(true);
            }
            onClearInitialTask?.();
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    const handleSave = () => {
        if (!newContent.trim()) return;
        
        const entry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            title: newTitle.trim() ? applyTypography(newTitle.trim()) : undefined,
            content: applyTypography(newContent),
            linkedTaskId: linkedTask?.id,
            linkedNoteIds: linkedNoteIds.length > 0 ? linkedNoteIds : undefined,
            isInsight: false,
            color: 'cyan'
        };
        addEntry(entry);
        closeEditor();
    };

    const closeEditor = () => {
        setIsWriting(false);
        setNewContent('');
        setNewTitle('');
        setLinkedTask(null);
        setLinkedNoteIds([]);
    };

    const handleAnalysis = async () => {
        if (entries.length === 0) return;
        setIsAnalyzing(true);
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
            setIsAnalyzing(false);
        }
    };

    const filteredEntries = entries.filter(e => 
        e.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
        e.title?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => b.date - a.date);

    return (
        <div className="h-full bg-[#f8fafc] dark:bg-[#0f172a] flex flex-col relative overflow-hidden">
            <header className="p-4 md:p-8 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 z-10">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроника пути и рефлексия</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <button 
                        onClick={() => setIsWriting(true)}
                        className="bg-slate-900 dark:bg-indigo-600 text-white p-2 md:px-4 md:py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus size={20} /> <span className="hidden md:inline">Запись</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20 relative z-0">
                {/* Mentor Analysis Section */}
                {mentorAnalyses.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Bot size={14} /> Анализ Ментора
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {mentorAnalyses.map(analysis => (
                                <div key={analysis.id} className="bg-white/60 dark:bg-slate-800/40 border border-indigo-100 dark:border-indigo-900/30 p-5 rounded-2xl relative group">
                                    <div className="text-[10px] text-indigo-400 uppercase font-bold mb-2 flex justify-between">
                                        <span>{new Date(analysis.date).toLocaleDateString()}</span>
                                        <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-serif leading-relaxed text-sm">
                                        <ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content */}
                {filteredEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Book size={48} className="mb-4 opacity-20" />
                        <p>Дневник пуст. Самое время начать.</p>
                        {entries.length > 5 && <button onClick={handleAnalysis} disabled={isAnalyzing} className="mt-4 text-indigo-500 hover:underline text-sm disabled:opacity-50">{isAnalyzing ? 'Анализирую...' : 'Запросить анализ ментора'}</button>}
                    </div>
                ) : (
                    <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                        {filteredEntries.map(entry => (
                            <div 
                                key={entry.id}
                                onClick={() => setSelectedEntry(entry)}
                                className={`
                                    ${getEntryColorClass(entry.color)} 
                                    rounded-2xl p-5 mb-6 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm hover:shadow-md transition-all relative group
                                `}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{new Date(entry.date).toLocaleDateString()}</span>
                                        {entry.isInsight && <Zap size={12} className="text-amber-500 fill-amber-500" />}
                                    </div>
                                    {entry.mood && (
                                        <div className="text-lg">{MOOD_TAGS.find(t => t.id === entry.moodTags?.[0])?.emoji || ['😖','😕','😐','🙂','🤩'][entry.mood - 1]}</div>
                                    )}
                                </div>
                                {entry.title && <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">{entry.title}</h3>}
                                <div className="text-sm text-slate-600 dark:text-slate-400 font-serif leading-relaxed line-clamp-6">
                                    <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                </div>
                                
                                {(entry.linkedTaskId || (entry.linkedNoteIds && entry.linkedNoteIds.length > 0) || entry.linkedNoteId) && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex gap-2">
                                        {entry.linkedTaskId && <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] px-2 py-1 rounded flex items-center gap-1"><CheckCircle2 size={10} /> Задача</span>}
                                        {((entry.linkedNoteIds && entry.linkedNoteIds.length > 0) || entry.linkedNoteId) && <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] px-2 py-1 rounded flex items-center gap-1"><StickyNote size={10} /> Заметки</span>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </Masonry>
                )}
            </div>

            {/* WRITE MODAL */}
            <AnimatePresence>
                {isWriting && (
                    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Новая запись</span>
                                    {linkedTask && <span className="text-xs text-indigo-500 flex items-center gap-1"><Link size={10} /> {linkedTask.title}</span>}
                                </div>
                                <button onClick={closeEditor} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            </div>
                            <div className="p-6 flex-1 overflow-y-auto">
                                <input 
                                    className="w-full text-xl font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 border-none outline-none bg-transparent mb-4"
                                    placeholder="Заголовок (необязательно)..."
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    autoFocus
                                />
                                <textarea 
                                    className="w-full h-64 bg-transparent border-none outline-none text-slate-700 dark:text-slate-300 font-serif leading-relaxed text-lg resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    placeholder="О чем ты думаешь?"
                                    value={newContent}
                                    onChange={e => setNewContent(e.target.value)}
                                />
                            </div>
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                <button onClick={closeEditor} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm">Отмена</button>
                                <button onClick={handleSave} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg text-sm font-medium hover:opacity-90">Сохранить</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DETAIL MODAL */}
            <AnimatePresence>
                {selectedEntry && (
                    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 overflow-y-auto custom-scrollbar-light">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">{new Date(selectedEntry.date).toLocaleString()}</div>
                                        {selectedEntry.title && <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedEntry.title}</h2>}
                                    </div>
                                    <div className="flex gap-2">
                                        <Tooltip content={selectedEntry.isInsight ? "Убрать инсайт" : "Пометить как инсайт"}>
                                            <button 
                                                onClick={() => updateEntry({ ...selectedEntry, isInsight: !selectedEntry.isInsight })}
                                                className={`p-2 rounded-full transition-colors ${selectedEntry.isInsight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 hover:text-amber-500'}`}
                                            >
                                                <Zap size={18} className={selectedEntry.isInsight ? "fill-current" : ""} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Удалить">
                                            <button 
                                                onClick={() => { if(confirm('Удалить запись?')) { deleteEntry(selectedEntry.id); setSelectedEntry(null); } }}
                                                className="p-2 rounded-full text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </Tooltip>
                                        <button onClick={() => setSelectedEntry(null)} className="p-2 text-slate-300 hover:text-slate-500">
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="prose prose-lg dark:prose-invert max-w-none font-serif text-slate-700 dark:text-slate-300 leading-loose mb-8">
                                    <ReactMarkdown components={markdownComponents}>{selectedEntry.content}</ReactMarkdown>
                                </div>

                                {/* Context Section */}
                                <div className="space-y-4">
                                    {/* Linked Task */}
                                    {selectedEntry.linkedTaskId && (() => {
                                        const task = tasks.find(t => t.id === selectedEntry.linkedTaskId);
                                        if (!task) return null;
                                        return (
                                            <CollapsibleSection title="Контекст: Задача" icon={<CheckCircle2 size={14}/>}>
                                                <div className="flex items-start gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg group">
                                                    <div className={`mt-0.5 ${task.column === 'done' ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                        <CheckCircle2 size={16} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div 
                                                            className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer transition-colors"
                                                            onClick={() => onNavigateToTask?.(task.id)}
                                                        >
                                                            {task.title || 'Без названия'}
                                                        </div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{task.content}</div>
                                                    </div>
                                                    <Tooltip content="Открепить">
                                                        <button 
                                                            onClick={() => updateEntry({ ...selectedEntry, linkedTaskId: undefined })}
                                                            className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Unlink size={14} />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </CollapsibleSection>
                                        );
                                    })()}

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
                                                                        const newIds = (selectedEntry.linkedNoteIds || []).filter(id => id !== note.id);
                                                                        const isLegacy = selectedEntry.linkedNoteId === note.id;
                                                                        updateEntry({ 
                                                                            ...selectedEntry, 
                                                                            linkedNoteIds: newIds,
                                                                            linkedNoteId: isLegacy ? undefined : selectedEntry.linkedNoteId
                                                                        }); 
                                                                    }}
                                                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors mt-0.5"
                                                                >
                                                                    <Unlink size={14} />
                                                                </button>
                                                            </Tooltip>
                                                            <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif cursor-pointer hover:text-indigo-500 transition-colors flex-1 min-w-0" onClick={() => onNavigateToNote?.(note.id)}>
                                                                <ReactMarkdown components={markdownComponents}>{getNotePreviewContent(note.content)}</ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CollapsibleSection>
                                        );
                                    })()}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Journal;
