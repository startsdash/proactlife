
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { JournalEntry, MentorAnalysis, Task, Note, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, MOOD_TAGS } from '../constants';
import { Tooltip } from './Tooltip';
import { 
  Book, Plus, Search, Calendar, Edit3, Trash2, X, 
  Zap, BrainCircuit, Bot, Sparkles, StickyNote, CheckCircle2, 
  ChevronRight, Link as LinkIcon, Unlink, Maximize2,
  Minus, Filter, RotateCcw
} from 'lucide-react';

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
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-4 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
};

const getNotePreviewContent = (content: string) => {
    return content.length > 100 ? content.slice(0, 100) + '...' : content;
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
        className="w-full flex items-center justify-between p-2 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors group/header"
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
           {icon}
           {title}
        </div>
        <div className="text-slate-500 dark:text-slate-400 group-hover/header:text-indigo-500 transition-colors">
            {isOpen ? <Minus size={12} /> : <Plus size={12} />}
        </div>
      </div>
      {isOpen && (
        <div className="px-2 pb-2 pt-0 animate-in slide-in-from-top-1 duration-200">
           <div className="pt-2 border-t border-slate-200/30 dark:border-slate-700/30 text-sm">
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const breakpointColumnsObj = {
  default: 3,
  1100: 2,
  700: 1
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
    const [isCreating, setIsCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Editor State
    const [entryContent, setEntryContent] = useState('');
    const [entryTitle, setEntryTitle] = useState('');
    const [entryMood, setEntryMood] = useState<number | undefined>(undefined);
    const [linkedTasks, setLinkedTasks] = useState<string[]>([]);
    const [linkedNotes, setLinkedNotes] = useState<string[]>([]);

    useEffect(() => {
        if (initialTaskId) {
            handleCreateNew(initialTaskId);
            onClearInitialTask?.();
        }
    }, [initialTaskId]);

    const handleCreateNew = (linkedTaskId?: string) => {
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: '',
            isInsight: false,
            linkedTaskId: linkedTaskId,
            linkedNoteIds: []
        };
        setSelectedEntry(newEntry);
        setEntryContent('');
        setEntryTitle('');
        setEntryMood(undefined);
        setLinkedTasks(linkedTaskId ? [linkedTaskId] : []);
        setLinkedNotes([]);
        setIsCreating(true);
    };

    const handleSaveEntry = () => {
        if (!entryContent.trim() && !entryTitle.trim()) return;
        
        const entryToSave: JournalEntry = {
            ...(selectedEntry || {}),
            id: selectedEntry?.id || Date.now().toString(),
            date: selectedEntry?.date || Date.now(),
            title: entryTitle.trim() ? applyTypography(entryTitle) : undefined,
            content: applyTypography(entryContent),
            mood: entryMood,
            linkedTaskId: linkedTasks[0], // Support singular for now, or expand type
            linkedNoteIds: linkedNotes,
            isInsight: selectedEntry?.isInsight || false,
        } as JournalEntry;

        if (isCreating) {
            addEntry(entryToSave);
        } else {
            updateEntry(entryToSave);
        }
        
        setIsCreating(false);
        setSelectedEntry(null);
    };

    const handleOpenEntry = (entry: JournalEntry) => {
        setSelectedEntry(entry);
        setEntryContent(entry.content);
        setEntryTitle(entry.title || '');
        setEntryMood(entry.mood);
        setLinkedTasks(entry.linkedTaskId ? [entry.linkedTaskId] : []);
        setLinkedNotes(entry.linkedNoteIds || (entry.linkedNoteId ? [entry.linkedNoteId] : []));
        setIsCreating(false);
    };

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const analysis = await analyzeJournalPath(entries, config);
            const newAnalysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: analysis,
                mentorName: 'AI Mentor'
            };
            addMentorAnalysis(newAnalysis);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const filteredEntries = entries
        .filter(e => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return e.content.toLowerCase().includes(q) || e.title?.toLowerCase().includes(q);
            }
            return true;
        })
        .sort((a, b) => b.date - a.date);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 shrink-0">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроника пути</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Поиск записей..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 w-48 transition-all focus:w-64"
                            />
                        </div>
                        <Tooltip content="Анализ пути (ИИ)">
                            <button 
                                onClick={runAnalysis} 
                                disabled={isAnalyzing}
                                className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-500 hover:border-indigo-200 disabled:opacity-50 transition-all"
                            >
                                {isAnalyzing ? <Bot size={20} className="animate-spin" /> : <Sparkles size={20} />}
                            </button>
                        </Tooltip>
                        <button 
                            onClick={() => handleCreateNew()} 
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md font-medium text-sm"
                        >
                            <Plus size={18} /> <span className="hidden md:inline">Запись</span>
                        </button>
                    </div>
                </header>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
                
                {/* Mentor Analyses */}
                {mentorAnalyses.length > 0 && (
                    <div className="mb-8">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Bot size={12} /> Анализ Ментора
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
                            {mentorAnalyses.map(analysis => (
                                <div key={analysis.id} className="min-w-[280px] md:min-w-[350px] bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5 relative group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                                                <BrainCircuit size={16} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{analysis.mentorName}</div>
                                                <div className="text-[10px] text-slate-400">{new Date(analysis.date).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-serif max-h-40 overflow-y-auto custom-scrollbar-ghost">
                                        <ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Journal Entries */}
                <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                    {filteredEntries.map(entry => {
                        const moodTag = entry.mood ? MOOD_TAGS.find(t => t.id === (entry.moodTags?.[0] || '')) : null;
                        return (
                            <motion.div 
                                key={entry.id}
                                layoutId={entry.id}
                                onClick={() => handleOpenEntry(entry)}
                                className={`
                                    bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 rounded-2xl p-5 mb-6 cursor-pointer shadow-sm hover:shadow-md transition-all group relative overflow-hidden
                                    ${entry.isInsight ? 'ring-1 ring-violet-200 dark:ring-violet-800 bg-violet-50/30 dark:bg-violet-900/10' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-slate-200 dark:text-slate-700 font-serif">{new Date(entry.date).getDate()}</span>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{new Date(entry.date).toLocaleDateString(undefined, { month: 'short', weekday: 'short' })}</span>
                                            <span className="text-[10px] text-slate-300 dark:text-slate-600">{new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {entry.isInsight && <Zap size={14} className="text-violet-500 fill-violet-500" />}
                                        {entry.mood && <span className="text-sm grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                            {['😖','😕','😐','🙂','🤩'][entry.mood - 1]}
                                        </span>}
                                    </div>
                                </div>

                                {entry.title && <h3 className="font-sans font-bold text-slate-800 dark:text-slate-100 mb-2">{entry.title}</h3>}
                                
                                <div className="text-sm text-slate-600 dark:text-slate-400 font-serif leading-relaxed line-clamp-6">
                                    <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                </div>

                                {(entry.linkedTaskId || (entry.linkedNoteIds && entry.linkedNoteIds.length > 0)) && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                                        {entry.linkedTaskId && <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400"><CheckCircle2 size={12} /></div>}
                                        {(entry.linkedNoteIds?.length || 0) > 0 && <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400"><StickyNote size={12} /></div>}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </Masonry>
            </div>

            {/* DETAIL MODAL */}
            <AnimatePresence>
                {selectedEntry && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm" onClick={() => { if(!isCreating) setSelectedEntry(null); }}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start shrink-0">
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                        {new Date(selectedEntry.date).toLocaleDateString()}
                                        <span className="opacity-50">|</span>
                                        {new Date(selectedEntry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Заголовок (необязательно)"
                                        value={entryTitle}
                                        onChange={e => setEntryTitle(e.target.value)}
                                        className="text-xl font-bold text-slate-900 dark:text-slate-100 bg-transparent outline-none w-full placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Tooltip content="Это инсайт?">
                                        <button 
                                            onClick={() => setSelectedEntry({...selectedEntry, isInsight: !selectedEntry.isInsight})}
                                            className={`p-2 rounded-full transition-all ${selectedEntry.isInsight ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300' : 'text-slate-300 hover:text-slate-500'}`}
                                        >
                                            <Zap size={20} className={selectedEntry.isInsight ? "fill-current" : ""} />
                                        </button>
                                    </Tooltip>
                                    {!isCreating && (
                                        <Tooltip content="Удалить запись">
                                            <button onClick={() => { if(confirm("Удалить запись?")) { deleteEntry(selectedEntry.id); setSelectedEntry(null); } }} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={20} />
                                            </button>
                                        </Tooltip>
                                    )}
                                    <button onClick={() => setSelectedEntry(null)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6">
                                <textarea 
                                    className="w-full h-64 bg-transparent outline-none text-slate-700 dark:text-slate-300 font-serif text-lg leading-relaxed resize-none placeholder:text-slate-300"
                                    placeholder="О чем ты думаешь?"
                                    value={entryContent}
                                    onChange={e => setEntryContent(e.target.value)}
                                />

                                {/* Linked Tasks Render */}
                                {(() => {
                                    const linkedTasksList = tasks.filter(t => linkedTasks.includes(t.id));
                                    if (linkedTasksList.length === 0) return null;
                                    
                                    return (
                                        <CollapsibleSection title="Контекст: Задачи" icon={<CheckCircle2 size={14}/>}>
                                            <div className="space-y-2">
                                                {linkedTasksList.map(task => (
                                                    <div key={task.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg group">
                                                        <div className={`w-2 h-2 rounded-full ${task.column === 'done' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{task.title || task.content}</span>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => onNavigateToTask?.(task.id)} className="p-1 text-slate-400 hover:text-indigo-500"><Maximize2 size={14}/></button>
                                                            <button onClick={() => setLinkedTasks(prev => prev.filter(id => id !== task.id))} className="p-1 text-slate-400 hover:text-red-500"><Unlink size={14}/></button>
                                                        </div>
                                                    </div>
                                                ))}
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
                                                        <div className="shrink-0 mt-0.5">
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
                                                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                >
                                                                    <Unlink size={14} />
                                                                </button>
                                                            </Tooltip>
                                                        </div>
                                                        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif cursor-pointer hover:text-indigo-500 transition-colors flex-1" onClick={() => onNavigateToNote?.(note.id)}>
                                                            <ReactMarkdown components={markdownComponents}>{getNotePreviewContent(note.content)}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    );
                                })()}
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(m => (
                                        <button 
                                            key={m}
                                            onClick={() => setEntryMood(entryMood === m ? undefined : m)}
                                            className={`text-2xl hover:scale-110 transition-transform grayscale hover:grayscale-0 ${entryMood === m ? 'grayscale-0 scale-125' : 'opacity-50'}`}
                                        >
                                            {['😖','😕','😐','🙂','🤩'][m-1]}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={handleSaveEntry}
                                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-md hover:bg-indigo-700 transition-colors"
                                >
                                    Сохранить
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Journal;
