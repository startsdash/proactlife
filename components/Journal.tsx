
import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, MentorAnalysis, Task, Note, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography } from '../constants';
import { 
  Book, Plus, Trash2, Calendar, Sparkles, 
  ChevronRight, X, Save, StickyNote, 
  CheckCircle2, Unlink, ArrowRight, Bot, Search
} from 'lucide-react';
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
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900 dark:text-slate-100" {...props} />,
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
        className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
           {icon}
           {title}
        </div>
        <div className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
            <ChevronRight size={14} />
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

const getNotePreviewContent = (content: string) => {
    return content.length > 100 ? content.slice(0, 100) + '...' : content;
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
    const [editorContent, setEditorContent] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (initialTaskId) {
            handleCreateEntry(initialTaskId);
            onClearInitialTask?.();
        }
    }, [initialTaskId]);

    const handleCreateEntry = (linkedTaskId?: string) => {
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            content: '',
            linkedTaskId: linkedTaskId,
            mood: undefined,
            isInsight: false
        };
        setSelectedEntry(newEntry);
        setEditorContent('');
        setIsCreating(true);
    };

    const handleSave = () => {
        if (!selectedEntry) return;
        if (!editorContent.trim()) {
            setIsCreating(false);
            setSelectedEntry(null);
            return;
        }

        const entryToSave = {
            ...selectedEntry,
            content: applyTypography(editorContent),
            date: isCreating ? Date.now() : selectedEntry.date
        };

        if (isCreating) {
            addEntry(entryToSave);
        } else {
            updateEntry(entryToSave);
        }
        setIsCreating(false);
        setSelectedEntry(null);
        setEditorContent('');
    };

    const handleDelete = (id: string) => {
        if (confirm('Удалить запись?')) {
            deleteEntry(id);
            if (selectedEntry?.id === id) {
                setSelectedEntry(null);
                setIsCreating(false);
            }
        }
    };

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const analysisText = await analyzeJournalPath(entries, config);
            const newAnalysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: analysisText,
                mentorName: 'ИИ Наставник'
            };
            addMentorAnalysis(newAnalysis);
        } catch (error) {
            console.error(error);
            alert('Ошибка анализа');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const sortedEntries = useMemo(() => {
        return [...entries].sort((a, b) => b.date - a.date).filter(e => 
            e.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [entries, searchTerm]);

    return (
        <div className="h-full flex bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
            {/* Sidebar List */}
            <div className={`w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col ${selectedEntry ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Book size={20} className="text-cyan-600"/> Дневник
                    </h2>
                    <button onClick={() => handleCreateEntry()} className="p-2 bg-slate-900 dark:bg-slate-700 text-white rounded-full hover:bg-slate-700 transition-colors">
                        <Plus size={20} />
                    </button>
                </div>
                
                <div className="p-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-800/50 pl-9 pr-3 py-2 rounded-lg text-sm outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-light p-2 space-y-2">
                    {/* Analysis Button */}
                    <button 
                        onClick={runAnalysis}
                        disabled={isAnalyzing || entries.length < 3}
                        className="w-full p-3 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAnalyzing ? <span className="animate-pulse">Анализ...</span> : <><Sparkles size={16}/> Анализ Пути</>}
                    </button>

                    {/* Mentor Analyses */}
                    {mentorAnalyses.map(analysis => (
                        <div key={analysis.id} className="bg-violet-50 dark:bg-violet-900/10 p-4 rounded-xl border border-violet-100 dark:border-violet-800/30">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider flex items-center gap-1">
                                    <Bot size={12}/> {analysis.mentorName}
                                </span>
                                <span className="text-[10px] text-slate-400">{new Date(analysis.date).toLocaleDateString()}</span>
                            </div>
                            <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                                <ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown>
                            </div>
                            <div className="mt-2 flex justify-end">
                                <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={12}/></button>
                            </div>
                        </div>
                    ))}

                    {/* Entries List */}
                    {sortedEntries.length === 0 ? (
                        <div className="py-10 text-center opacity-50">Нет записей</div>
                    ) : (
                        sortedEntries.map(entry => (
                            <div 
                                key={entry.id}
                                onClick={() => { setSelectedEntry(entry); setEditorContent(entry.content); setIsCreating(false); }}
                                className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${selectedEntry?.id === entry.id ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                                        {new Date(entry.date).toLocaleDateString()} <span className="opacity-50">{new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </span>
                                    {entry.isInsight && <Sparkles size={12} className="text-amber-500 fill-amber-500" />}
                                </div>
                                <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 font-serif">
                                    <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                </div>
                                <div className="mt-2 flex gap-2">
                                    {entry.linkedTaskId && <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] text-slate-500 font-mono flex items-center gap-1"><CheckCircle2 size={10}/> Task</span>}
                                    {(entry.linkedNoteIds && entry.linkedNoteIds.length > 0) && <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] text-slate-500 font-mono flex items-center gap-1"><StickyNote size={10}/> Note</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className={`flex-1 bg-white dark:bg-[#1e293b] flex flex-col ${selectedEntry ? 'flex' : 'hidden md:flex'}`}>
                {selectedEntry ? (
                    <>
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-[#1e293b]">
                            <button onClick={() => setSelectedEntry(null)} className="md:hidden text-slate-500"><ArrowRight size={20} className="rotate-180"/></button>
                            <div className="text-sm font-mono text-slate-400">{new Date(selectedEntry.date).toLocaleString()}</div>
                            <div className="flex gap-2">
                                <Tooltip content="Инсайт">
                                    <button 
                                        onClick={() => setSelectedEntry({...selectedEntry, isInsight: !selectedEntry.isInsight})}
                                        className={`p-2 rounded-lg transition-colors ${selectedEntry.isInsight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 hover:text-amber-500'}`}
                                    >
                                        <Sparkles size={18} className={selectedEntry.isInsight ? "fill-current" : ""} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Удалить">
                                    <button onClick={() => handleDelete(selectedEntry.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                                </Tooltip>
                                <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                    <Save size={16}/> Сохранить
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6">
                            <textarea 
                                className="w-full h-full bg-transparent resize-none outline-none text-base text-slate-800 dark:text-slate-200 font-serif leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                placeholder="О чем ты думаешь?..."
                                value={editorContent}
                                onChange={e => setEditorContent(e.target.value)}
                            />
                        </div>

                        {/* Linked Context Panel */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                            
                            {selectedEntry.linkedTaskId && (() => {
                                const task = tasks.find(t => t.id === selectedEntry.linkedTaskId);
                                if (!task) return null;
                                return (
                                    <CollapsibleSection title="Контекст: Задача" icon={<CheckCircle2 size={14}/>}>
                                        <div className="flex items-center justify-between group">
                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer hover:text-indigo-600" onClick={() => onNavigateToTask?.(task.id)}>
                                                {task.title || "Без названия"}
                                            </div>
                                            <Tooltip content="Открепить">
                                                <button onClick={() => updateEntry({...selectedEntry, linkedTaskId: undefined})} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Unlink size={14}/></button>
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
                        </div>
                    </>
                ) : (
                    <EmptyState icon={Book} title="Дневник" description="Выберите запись или создайте новую" color="cyan" />
                )}
            </div>
        </div>
    );
};

export default Journal;
