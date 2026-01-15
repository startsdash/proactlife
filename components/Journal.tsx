
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Book, Plus, Search, Calendar, Edit3, Trash2, Zap, 
    MessageSquare, ChevronRight, X, StickyNote, Unlink, 
    Link as LinkIcon, CheckCircle2, Circle, MoreHorizontal,
    ChevronDown, ChevronUp, ArrowLeft
} from 'lucide-react';
import { JournalEntry, MentorAnalysis, Task, Note, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';

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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-4 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed font-serif text-lg" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-500 underline decoration-1 underline-offset-4" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400 font-serif" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-slate-600 dark:text-slate-400 font-serif" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="text-2xl font-serif font-bold mt-6 mb-3 text-slate-900 dark:text-white tracking-tight" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-xl font-serif font-bold mt-5 mb-2 text-slate-900 dark:text-white tracking-tight" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-indigo-500/30 pl-4 py-1 my-4 text-slate-500 italic font-serif" {...props} />,
};

const getNotePreviewContent = (content: string) => {
    let cleanText = content.replace(/!\[.*?\]\(.*?\)/g, '');
    cleanText = cleanText.replace(/[ \t]+/g, ' ').trim();
    if (cleanText.length > 100) return cleanText.slice(0, 100) + '...';
    return cleanText;
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, icon, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-4">
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors group select-none"
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
           {icon}
           {title}
        </div>
        <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
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
    entries, 
    mentorAnalyses, 
    tasks, 
    notes, 
    config, 
    addEntry, 
    deleteEntry, 
    updateEntry, 
    addMentorAnalysis, 
    deleteMentorAnalysis, 
    initialTaskId, 
    onClearInitialTask,
    onNavigateToTask,
    onNavigateToNote
}) => {
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (initialTaskId) {
            // Logic to create or find entry for task
            const existing = entries.find(e => e.linkedTaskId === initialTaskId);
            if (existing) {
                setSelectedEntry(existing);
            } else {
                const task = tasks.find(t => t.id === initialTaskId);
                const newEntry: JournalEntry = {
                    id: Date.now().toString(),
                    date: Date.now(),
                    content: task ? `## Рефлексия по задаче: ${task.title}\n\n` : '',
                    linkedTaskId: initialTaskId,
                    isInsight: false
                };
                addEntry(newEntry);
                setSelectedEntry(newEntry);
                setIsEditing(true);
                setEditContent(newEntry.content);
            }
            onClearInitialTask?.();
        }
    }, [initialTaskId, entries, tasks, addEntry, onClearInitialTask]);

    const handleCreateEntry = () => {
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: '',
            isInsight: false
        };
        addEntry(newEntry);
        setSelectedEntry(newEntry);
        setIsEditing(true);
        setEditContent('');
    };

    const handleSave = () => {
        if (selectedEntry) {
            updateEntry({ ...selectedEntry, content: applyTypography(editContent) });
            setIsEditing(false);
        }
    };

    const handleDelete = () => {
        if (selectedEntry && window.confirm('Удалить запись?')) {
            deleteEntry(selectedEntry.id);
            setSelectedEntry(null);
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const analysis = await analyzeJournalPath(entries, config);
            addMentorAnalysis({
                id: Date.now().toString(),
                date: Date.now(),
                content: analysis,
                mentorName: 'AI Mentor'
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const filteredEntries = useMemo(() => {
        return entries
            .filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const groupedEntries = useMemo(() => {
        const groups: Record<string, JournalEntry[]> = {};
        filteredEntries.forEach(e => {
            const date = new Date(e.date);
            const key = date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(e);
        });
        return groups;
    }, [filteredEntries]);

    return (
        <div className="flex h-full bg-[#f8fafc] dark:bg-[#0f172a]">
            {/* Sidebar List */}
            <div className={`${selectedEntry ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-serif text-slate-800 dark:text-slate-200">Дневник</h2>
                        <button onClick={handleCreateEntry} className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-lg">
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
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar-light p-2">
                    {Object.keys(groupedEntries).length === 0 ? (
                        <div className="p-8">
                            <EmptyState icon={Book} title="Пусто" description="Начни писать свою историю" />
                        </div>
                    ) : (
                        Object.entries(groupedEntries).map(([group, groupEntries]) => (
                            <div key={group} className="mb-6">
                                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest sticky top-0 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-sm z-10">
                                    {group}
                                </div>
                                <div className="space-y-1 px-2">
                                    {groupEntries.map(entry => (
                                        <div 
                                            key={entry.id}
                                            onClick={() => setSelectedEntry(entry)}
                                            className={`p-3 rounded-xl cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent ${selectedEntry?.id === entry.id ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : ''}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="text-xs font-bold text-slate-500">
                                                    {new Date(entry.date).toLocaleDateString(undefined, {day: 'numeric', weekday: 'short'})}
                                                </div>
                                                {entry.isInsight && <Zap size={12} className="text-amber-500 fill-amber-500" />}
                                            </div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 font-serif leading-relaxed">
                                                {entry.title || entry.content || 'Пустая запись...'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <button 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing || entries.length < 5}
                        className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                    >
                        {isAnalyzing ? 'Анализ...' : 'Анализ Пути (AI)'}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col h-full overflow-hidden relative ${!selectedEntry ? 'hidden md:flex' : 'flex'}`}>
                {selectedEntry ? (
                    <>
                        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#0f172a]/50 backdrop-blur-md z-10 shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedEntry(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600">
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="text-sm font-mono text-slate-400 uppercase tracking-widest">
                                    {new Date(selectedEntry.date).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Tooltip content={selectedEntry.isInsight ? "Убрать отметку Инсайта" : "Отметить как Инсайт"}>
                                    <button 
                                        onClick={() => updateEntry({...selectedEntry, isInsight: !selectedEntry.isInsight})}
                                        className={`p-2 rounded-lg transition-colors ${selectedEntry.isInsight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                    >
                                        <Zap size={18} className={selectedEntry.isInsight ? "fill-current" : ""} />
                                    </button>
                                </Tooltip>
                                {isEditing ? (
                                    <button onClick={handleSave} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-indigo-700 transition-colors">
                                        Сохранить
                                    </button>
                                ) : (
                                    <button onClick={() => { setIsEditing(true); setEditContent(selectedEntry.content); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                        <Edit3 size={18} />
                                    </button>
                                )}
                                <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6 md:p-10 max-w-4xl mx-auto w-full">
                            {isEditing ? (
                                <textarea 
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full h-full min-h-[50vh] bg-transparent outline-none resize-none font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 placeholder:text-slate-300"
                                    placeholder="О чем ты думаешь?"
                                    autoFocus
                                />
                            ) : (
                                <div className="prose dark:prose-invert max-w-none">
                                    <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                        {selectedEntry.content.replace(/\n/g, '  \n')}
                                    </ReactMarkdown>
                                </div>
                            )}

                            {/* Linked Content Area */}
                            <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
                                
                                {/* Linked Task */}
                                {selectedEntry.linkedTaskId && (() => {
                                    const task = tasks.find(t => t.id === selectedEntry.linkedTaskId);
                                    if (!task) return null;
                                    return (
                                        <div className="mb-4">
                                            <CollapsibleSection title="Контекст: Задача" icon={<CheckCircle2 size={14}/>}>
                                                <div 
                                                    className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-300 transition-colors group"
                                                    onClick={() => onNavigateToTask?.(task.id)}
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-xs font-bold uppercase text-slate-500">{task.column}</span>
                                                        <LinkIcon size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{task.title || 'Без названия'}</div>
                                                </div>
                                            </CollapsibleSection>
                                        </div>
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
                                                    <div key={note.id} className={`flex items-start gap-3 group/note ${index > 0 ? "pt-3 border-t border-slate-200/50 dark:border-slate-700/50" : ""}`}>
                                                        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif cursor-pointer hover:text-indigo-500 transition-colors flex-1" onClick={() => onNavigateToNote?.(note.id)}>
                                                            <ReactMarkdown components={markdownComponents}>{getNotePreviewContent(note.content)}</ReactMarkdown>
                                                        </div>
                                                        <Tooltip content="Открепить">
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
                                                                className="text-slate-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover/note:opacity-100"
                                                            >
                                                                <Unlink size={14} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    );
                                })()}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
                        <div>
                            <Book size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-light">Выберите запись или создайте новую</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Journal;
