
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Book, Plus, Search, Calendar, ChevronRight, Edit3, Trash2, 
    Sparkles, Bot, Zap, X, Save, StickyNote, CheckCircle2, 
    Link as LinkIcon, Unlink, ArrowRight, Layout, MoreHorizontal,
    Minus
} from 'lucide-react';

import { JournalEntry, MentorAnalysis, Task, Note, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography } from '../constants';
import { Tooltip } from './Tooltip';
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

const getPreviewContent = (content: string) => {
    let cleanText = content.replace(/!\[.*?\]\(.*?\)/g, '');
    cleanText = cleanText.replace(/[ \t]+/g, ' ').trim();
    if (cleanText.length > 150) {
        return cleanText.substring(0, 150) + '...';
    }
    return cleanText;
};

const getNotePreviewContent = (content: string) => {
    return content.split('\n')[0].substring(0, 60) + (content.length > 60 ? '...' : '');
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-800 dark:text-slate-200 leading-relaxed font-serif" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200 font-serif" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200 font-serif" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-base mt-2 mb-1 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
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
        className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors group"
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
           {icon}
           {title}
        </div>
        <div className="text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">
            {isOpen ? <Minus size={12} /> : <Plus size={12} />}
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
    entries, mentorAnalyses, tasks, notes, config, 
    addEntry, deleteEntry, updateEntry, 
    addMentorAnalysis, deleteMentorAnalysis, 
    initialTaskId, onClearInitialTask, 
    onNavigateToTask, onNavigateToNote 
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Editor State
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editColor, setEditColor] = useState('white');
    
    // Effect to handle initial task reflection
    useEffect(() => {
        if (initialTaskId) {
            const task = tasks.find(t => t.id === initialTaskId);
            if (task) {
                // Open new entry modal with task link
                const newEntry: JournalEntry = {
                    id: Date.now().toString(),
                    date: Date.now(),
                    content: '',
                    title: `Рефлексия: ${task.title || 'Задача'}`,
                    linkedTaskId: task.id,
                    color: 'white',
                    isInsight: false
                };
                setSelectedEntry(newEntry);
                setEditContent('');
                setEditTitle(newEntry.title || '');
                setEditColor('white');
                setIsEditing(true);
            }
            onClearInitialTask?.();
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    const handleCreateEntry = () => {
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: '',
            color: 'white',
            isInsight: false
        };
        setSelectedEntry(newEntry);
        setEditContent('');
        setEditTitle('');
        setEditColor('white');
        setIsEditing(true);
    };

    const handleSaveEntry = () => {
        if (!selectedEntry) return;
        
        const updatedEntry: JournalEntry = {
            ...selectedEntry,
            content: applyTypography(editContent),
            title: editTitle ? applyTypography(editTitle) : undefined,
            color: editColor
        };

        if (entries.find(e => e.id === updatedEntry.id)) {
            updateEntry(updatedEntry);
        } else {
            addEntry(updatedEntry);
        }
        setIsEditing(false);
        // Keep selected to view it
        setSelectedEntry(updatedEntry);
    };

    const handleDeleteEntry = (id: string) => {
        if (window.confirm("Переместить запись в архив?")) {
            deleteEntry(id);
            if (selectedEntry?.id === id) {
                setSelectedEntry(null);
                setIsEditing(false);
            }
        }
    };

    const handleRunAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const result = await analyzeJournalPath(entries, config);
            const analysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: result,
                mentorName: 'AI Mentor'
            };
            addMentorAnalysis(analysis);
        } catch (e) {
            console.error(e);
            alert("Не удалось выполнить анализ");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const filteredEntries = entries
        .filter(e => {
            const q = searchQuery.toLowerCase();
            return (e.content.toLowerCase().includes(q) || (e.title && e.title.toLowerCase().includes(q)));
        })
        .sort((a, b) => b.date - a.date);

    return (
        <div className="flex h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
            
            {/* LEFT SIDEBAR (LIST) */}
            <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] z-10 ${selectedEntry ? 'hidden md:flex' : 'flex'}`}>
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Дневник</h1>
                        <button onClick={handleCreateEntry} className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full hover:scale-105 transition-transform shadow-md">
                            <Plus size={20} />
                        </button>
                    </div>
                    
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* Mentor Action */}
                <div className="px-4 py-2">
                    <button 
                        onClick={handleRunAnalysis} 
                        disabled={isAnalyzing || entries.length < 3}
                        className="w-full py-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                    >
                        {isAnalyzing ? <span className="animate-pulse">Анализ...</span> : <><Bot size={16} /> Анализ Пути</>}
                    </button>
                </div>

                {/* Entry List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 space-y-3">
                    {/* Mentor Analyses First */}
                    {mentorAnalyses.map(analysis => (
                        <div key={analysis.id} className="bg-gradient-to-br from-violet-50 to-white dark:from-violet-900/20 dark:to-slate-800 border border-violet-100 dark:border-violet-800/50 rounded-xl p-4 shadow-sm relative group">
                            <div className="flex items-center gap-2 mb-2 text-violet-600 dark:text-violet-400">
                                <Sparkles size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Анализ Ментора</span>
                            </div>
                            <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed font-serif">
                                <ReactMarkdown components={{ p: ({node, ...props}: any) => <span {...props} /> }}>{analysis.content}</ReactMarkdown>
                            </div>
                            <div className="mt-2 text-[10px] text-slate-400 flex justify-between items-center">
                                <span>{new Date(analysis.date).toLocaleDateString()}</span>
                                <button onClick={() => deleteMentorAnalysis(analysis.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Journal Entries */}
                    {filteredEntries.length === 0 ? (
                        <EmptyState icon={Book} title="Пусто" description="Записей пока нет" color="slate" />
                    ) : (
                        filteredEntries.map(entry => (
                            <div 
                                key={entry.id}
                                onClick={() => { setSelectedEntry(entry); setIsEditing(false); }}
                                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selectedEntry?.id === entry.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-slate-600'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        {new Date(entry.date).toLocaleDateString()}
                                        {entry.isInsight && <Zap size={10} className="text-amber-500 fill-amber-500" />}
                                    </div>
                                </div>
                                {entry.title && <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 line-clamp-1">{entry.title}</h3>}
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-serif leading-relaxed">
                                    {getPreviewContent(entry.content)}
                                </p>
                                {entry.mood && (
                                    <div className="mt-2 flex gap-1">
                                        <div className={`w-2 h-2 rounded-full ${entry.mood >= 4 ? 'bg-emerald-400' : entry.mood === 3 ? 'bg-amber-400' : 'bg-red-400'}`} />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT SIDE (DETAIL / EDITOR) */}
            <div className={`flex-1 flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative ${!selectedEntry ? 'hidden md:flex' : 'flex'}`}>
                {selectedEntry ? (
                    <>
                        {/* Toolbar */}
                        <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedEntry(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600">
                                    <ChevronRight size={20} className="rotate-180" />
                                </button>
                                <div className="text-sm font-mono text-slate-400 uppercase tracking-widest">
                                    {new Date(selectedEntry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isEditing ? (
                                    <button onClick={handleSaveEntry} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                                        <Save size={16} /> Сохранить
                                    </button>
                                ) : (
                                    <>
                                        <Tooltip content={selectedEntry.isInsight ? "Убрать инсайт" : "Пометить как инсайт"}>
                                            <button 
                                                onClick={() => updateEntry({ ...selectedEntry, isInsight: !selectedEntry.isInsight })}
                                                className={`p-2 rounded-lg transition-colors ${selectedEntry.isInsight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                                            >
                                                <Zap size={18} className={selectedEntry.isInsight ? "fill-current" : ""} />
                                            </button>
                                        </Tooltip>
                                        <button 
                                            onClick={() => {
                                                setEditContent(selectedEntry.content);
                                                setEditTitle(selectedEntry.title || '');
                                                setEditColor(selectedEntry.color || 'white');
                                                setIsEditing(true);
                                            }} 
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteEntry(selectedEntry.id)} 
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className={`flex-1 overflow-y-auto custom-scrollbar-light p-6 md:p-12 ${getEntryColorClass(isEditing ? editColor : selectedEntry.color)} transition-colors duration-500`}>
                            <div className="max-w-3xl mx-auto">
                                {isEditing ? (
                                    <div className="space-y-6 animate-in fade-in duration-300">
                                        <input 
                                            type="text" 
                                            placeholder="Заголовок (необязательно)" 
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full bg-transparent text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none border-b border-transparent focus:border-slate-200 dark:focus:border-slate-700 transition-colors pb-2"
                                        />
                                        <div className="flex gap-2">
                                            {colors.map(c => (
                                                <button
                                                    key={c.id}
                                                    onClick={() => setEditColor(c.id)}
                                                    className={`w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600 ${editColor === c.id ? 'ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
                                                    style={{ backgroundColor: c.hex }}
                                                />
                                            ))}
                                        </div>
                                        <textarea 
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            placeholder="Напиши что-нибудь..."
                                            className="w-full h-[60vh] bg-transparent text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-serif resize-none outline-none"
                                        />
                                    </div>
                                ) : (
                                    <div className="animate-in fade-in duration-300 space-y-8">
                                        {selectedEntry.title && (
                                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-6">{selectedEntry.title}</h1>
                                        )}
                                        
                                        <div className="prose prose-lg dark:prose-invert prose-slate font-serif max-w-none">
                                            <ReactMarkdown 
                                                components={markdownComponents} 
                                                remarkPlugins={[remarkGfm]} 
                                                rehypePlugins={[rehypeRaw]}
                                            >
                                                {applyTypography(selectedEntry.content)}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Linked Context Render */}
                                        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
                                            
                                            {/* Task Link */}
                                            {selectedEntry.linkedTaskId && (() => {
                                                const task = tasks.find(t => t.id === selectedEntry.linkedTaskId);
                                                if (!task) return null;
                                                return (
                                                    <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl group cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors" onClick={() => onNavigateToTask?.(task.id)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                                                <CheckCircle2 size={18} />
                                                            </div>
                                                            <div>
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Связанная задача</div>
                                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{task.title || 'Безымянная задача'}</div>
                                                            </div>
                                                        </div>
                                                        <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                                    </div>
                                                )
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

                                            {/* Mood Tags */}
                                            {selectedEntry.moodTags && selectedEntry.moodTags.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedEntry.moodTags.map(tag => (
                                                        <span key={tag} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Book size={48} strokeWidth={1} className="mb-4 opacity-50" />
                        <p>Выберите запись или создайте новую</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Journal;
