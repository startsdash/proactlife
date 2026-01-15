import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, MentorAnalysis, Task, Note, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, MOOD_TAGS } from '../constants';
import { 
  Plus, Trash2, Edit3, X, Zap, Calendar, Search, ChevronRight, 
  Book, StickyNote, CheckCircle2, Link as LinkIcon, Unlink, 
  Sparkles, Bot, ArrowRight, Layout, Maximize2, MoreHorizontal,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  onNavigateToTask?: (id: string) => void;
  onNavigateToNote?: (id: string) => void;
}

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-800 dark:text-slate-200 leading-relaxed font-serif" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
};

const CollapsibleSection = ({ title, children, icon, defaultOpen = false }: { title: string, children: React.ReactNode, icon?: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-2">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {icon}
                    {title}
                </div>
                {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>
            {isOpen && <div className="p-3 bg-white dark:bg-slate-900">{children}</div>}
        </div>
    );
};

const getNotePreviewContent = (content: string) => {
    return content.slice(0, 100) + (content.length > 100 ? '...' : '');
};

const Journal: React.FC<Props> = ({ 
    entries, mentorAnalyses, tasks, notes, config, 
    addEntry, deleteEntry, updateEntry, 
    addMentorAnalysis, deleteMentorAnalysis,
    initialTaskId, onClearInitialTask, onNavigateToTask, onNavigateToNote 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [editorContent, setEditorContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Auto-open new entry if initialTaskId is present
    useEffect(() => {
        if (initialTaskId) {
            const task = tasks.find(t => t.id === initialTaskId);
            if (task) {
                // Check if an entry already exists for this task today?
                // Or just open editor with linked task
                setEditorContent(`## Рефлексия по задаче: ${task.title || 'Без названия'}\n\n`);
                setSelectedEntry({
                    id: 'new',
                    date: Date.now(),
                    content: '',
                    linkedTaskId: initialTaskId,
                    isInsight: false
                });
                setIsEditing(true);
            }
            onClearInitialTask?.();
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    const handleSave = () => {
        if (!editorContent.trim()) return;
        
        if (selectedEntry && selectedEntry.id !== 'new') {
            updateEntry({ ...selectedEntry, content: editorContent, date: Date.now() }); // Update date on edit? Maybe optionally.
        } else {
            const newEntry: JournalEntry = {
                id: Date.now().toString(),
                date: Date.now(),
                content: editorContent,
                linkedTaskId: selectedEntry?.linkedTaskId,
                linkedNoteIds: selectedEntry?.linkedNoteIds,
                isInsight: false,
                mood: selectedEntry?.mood,
                moodTags: selectedEntry?.moodTags
            };
            addEntry(newEntry);
        }
        setIsEditing(false);
        setSelectedEntry(null);
        setEditorContent('');
    };

    const handleEdit = (entry: JournalEntry) => {
        setSelectedEntry(entry);
        setEditorContent(entry.content);
        setIsEditing(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Удалить запись?')) {
            deleteEntry(id);
            if (selectedEntry?.id === id) {
                setIsEditing(false);
                setSelectedEntry(null);
            }
        }
    };

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const analysisText = await analyzeJournalPath(entries, config);
            addMentorAnalysis({
                id: Date.now().toString(),
                date: Date.now(),
                content: analysisText,
                mentorName: 'AI Mentor'
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const filteredEntries = entries
        .filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => b.date - a.date);

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
            <header className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники Пути</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={runAnalysis} disabled={isAnalyzing || entries.length < 3} className="p-3 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 rounded-xl hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors disabled:opacity-50">
                        {isAnalyzing ? <Bot className="animate-spin" size={20} /> : <Sparkles size={20} />}
                    </button>
                    <button onClick={() => { 
                        setSelectedEntry({ id: 'new', date: Date.now(), content: '' }); 
                        setEditorContent(''); 
                        setIsEditing(true); 
                    }} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-lg hover:scale-105 transition-transform">
                        <Plus size={20} />
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* LIST */}
                <div className={`flex-1 flex flex-col overflow-hidden ${isEditing ? 'hidden md:flex md:w-1/3 md:border-r border-slate-200 dark:border-slate-800' : 'w-full'}`}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Поиск записей..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 space-y-4">
                        {mentorAnalyses.length > 0 && (
                            <div className="mb-6 space-y-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Анализ Ментора</h3>
                                {mentorAnalyses.map(analysis => (
                                    <div key={analysis.id} className="bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30 rounded-2xl p-5 relative group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <Bot size={16} className="text-violet-500" />
                                                <span className="text-xs font-bold text-violet-700 dark:text-violet-300">{new Date(analysis.date).toLocaleDateString()}</span>
                                            </div>
                                            <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-violet-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                        </div>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
                                            <ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {filteredEntries.length === 0 ? (
                            <EmptyState icon={Book} title="Нет записей" description="Самое время начать писать историю." />
                        ) : (
                            filteredEntries.map(entry => {
                                const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
                                return (
                                    <div 
                                        key={entry.id} 
                                        onClick={() => handleEdit(entry)}
                                        className={`bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all group ${selectedEntry?.id === entry.id ? 'ring-2 ring-indigo-500 border-transparent' : ''}`}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="text-xs font-mono text-slate-400">{new Date(entry.date).toLocaleString()}</div>
                                            {entry.isInsight && <Zap size={14} className="text-amber-500 fill-amber-500" />}
                                        </div>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 font-serif leading-relaxed mb-3">
                                            <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                        </div>
                                        
                                        {(linkedTask || (entry.linkedNoteIds && entry.linkedNoteIds.length > 0) || entry.mood) && (
                                            <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                                {entry.mood && (
                                                    <span className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-500 flex items-center gap-1">
                                                        {MOOD_TAGS.find(t => t.id === entry.moodTags?.[0])?.emoji || 'Mood'} {entry.mood}/5
                                                    </span>
                                                )}
                                                {linkedTask && (
                                                    <span className="text-[10px] px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-md flex items-center gap-1 truncate max-w-[150px]">
                                                        <CheckCircle2 size={10} /> {linkedTask.title || 'Задача'}
                                                    </span>
                                                )}
                                                {entry.linkedNoteIds?.length ? (
                                                    <span className="text-[10px] px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 rounded-md flex items-center gap-1">
                                                        <StickyNote size={10} /> {entry.linkedNoteIds.length}
                                                    </span>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* EDITOR */}
                <AnimatePresence>
                    {isEditing && (
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="absolute inset-0 md:static bg-[#f8fafc] dark:bg-[#0f172a] md:flex-[2] flex flex-col z-20"
                        >
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0f172a]">
                                <button onClick={() => { setIsEditing(false); setSelectedEntry(null); }} className="md:hidden p-2 -ml-2 text-slate-400"><ArrowRight className="rotate-180" size={20} /></button>
                                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                    {selectedEntry?.id === 'new' ? 'Новая запись' : 'Редактирование'}
                                </div>
                                <div className="flex gap-2">
                                    {selectedEntry && selectedEntry.id !== 'new' && (
                                        <button onClick={() => handleDelete(selectedEntry.id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                    )}
                                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors">Сохранить</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-10">
                                <div className="max-w-3xl mx-auto">
                                    <textarea 
                                        value={editorContent}
                                        onChange={e => setEditorContent(e.target.value)}
                                        placeholder="О чем ты думаешь?"
                                        className="w-full h-[60vh] bg-transparent resize-none outline-none text-lg text-slate-800 dark:text-slate-200 font-serif leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        autoFocus
                                    />
                                    
                                    {selectedEntry && (
                                        <div className="mt-8 space-y-4">
                                            {/* Linked Task Render */}
                                            {(() => {
                                                const task = tasks.find(t => t.id === selectedEntry.linkedTaskId);
                                                if (!task) return null;
                                                return (
                                                    <CollapsibleSection title="Контекст: Задача" icon={<CheckCircle2 size={14}/>}>
                                                        <div className="flex items-center justify-between group">
                                                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{task.title}</div>
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => onNavigateToTask?.(task.id)} className="p-1 text-slate-400 hover:text-indigo-500"><Maximize2 size={14}/></button>
                                                                <button 
                                                                    onClick={() => {
                                                                        if (window.confirm("Открепить задачу?")) {
                                                                            updateEntry({ ...selectedEntry, linkedTaskId: undefined });
                                                                        }
                                                                    }} 
                                                                    className="p-1 text-slate-400 hover:text-red-500"
                                                                >
                                                                    <Unlink size={14}/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </CollapsibleSection>
                                                );
                                            })()}

                                            {/* Linked Notes Render */}
                                            {(() => {
                                                const linkedNotesList = notes.filter(n => (selectedEntry.linkedNoteIds?.includes(n.id)) || (selectedEntry.linkedNoteId === n.id));
                                                if (linkedNotesList.length === 0) return null;
                                                
                                                return (
                                                    <CollapsibleSection title="Контекст: Заметки" icon={<StickyNote size={14}/>}>
                                                        <div className="space-y-4">
                                                            {linkedNotesList.map((note, index) => (
                                                                <div key={note.id} className={`flex items-start gap-3 ${index > 0 ? "pt-3 border-t border-slate-200/50 dark:border-slate-700/50" : ""}`}>
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
                                            
                                            {/* Insight Toggle */}
                                            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <button 
                                                    onClick={() => updateEntry({...selectedEntry, isInsight: !selectedEntry.isInsight})}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${selectedEntry.isInsight ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}
                                                >
                                                    <Zap size={14} className={selectedEntry.isInsight ? "fill-current" : ""} />
                                                    {selectedEntry.isInsight ? "Это Инсайт" : "Отметить как Инсайт"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Journal;