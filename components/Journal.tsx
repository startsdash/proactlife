
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { JournalEntry, MentorAnalysis, Task, Note, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { SPHERES, ICON_MAP, applyTypography } from '../constants';
import { 
    Book, 
    Search, 
    Sparkles, 
    Target, 
    Calendar, 
    ChevronDown, 
    Check, 
    Link as LinkIcon, 
    Plus, 
    Save, 
    X,
    Trash2,
    Zap,
    Bot,
    StickyNote,
    CheckCircle2,
    Layout,
    PenTool
} from 'lucide-react';
import { Tooltip } from './Tooltip';
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
  initialTaskId: string | null;
  onClearInitialTask: () => void;
  onNavigateToTask: (id: string) => void;
  onNavigateToNote: (id: string) => void;
}

// --- HELPERS ---

const htmlToMarkdown = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const wrap = (text: string, marker: string) => {
        const match = text.match(/^([\s\u00A0]*)(.*?)([\s\u00A0]*)$/s);
        if (match) {
            if (!match[2]) return match[1] + match[3];
            return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
        }
        return text;
    };

    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
            return (node.textContent || '').replace(/\u00A0/g, ' ');
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            
            if (tag === 'br') return '\n';
            if (tag === 'img') return `\n![${(el as HTMLImageElement).alt || 'image'}](${(el as HTMLImageElement).src})\n`;
            
            let content = '';
            el.childNodes.forEach(child => content += walk(child));
            
            if (tag === 'p') return `\n${content.trim()}\n`;
            if (tag === 'div') return `\n${content.trim()}\n`;
            if (tag === 'li') return `\n- ${content.trim()}`;
            if (tag === 'ul' || tag === 'ol') return `\n${content}\n`;
            if (tag === 'blockquote') return `\n> ${content.trim()}\n`;

            const styleBold = el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0') >= 700;
            const styleItalic = el.style.fontStyle === 'italic';

            if (styleBold) return wrap(content, '**');
            if (styleItalic) return wrap(content, '*');
            
            switch (tag) {
                case 'b': case 'strong': return wrap(content, '**');
                case 'i': case 'em': return wrap(content, '*');
                case 'code': return `\`${content}\``;
                case 'u': return `<u>${content}</u>`;
                case 'h1': return `\n# ${content}\n`;
                case 'h2': return `\n## ${content}\n`;
                default: return content;
            }
        }
        return '';
    };
    
    let md = walk(temp);
    md = md.replace(/\n{3,}/g, '\n\n').trim();
    return applyTypography(md);
};

const formatForDisplay = (content: string) => {
    if (!content) return '';
    return content.replace(/\n/g, '  \n');
};

const SphereSelector: React.FC<{ selected: string[], onChange: (s: string[]) => void }> = ({ selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSphere = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter(s => s !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all outline-none ${
                  isOpen ? 'border-indigo-400 ring-2 ring-indigo-50 dark:ring-indigo-900 bg-white dark:bg-[#1e293b]' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selected.length > 0 ? (
                        <>
                            <div className="flex -space-x-1 shrink-0">
                                {selected.map(s => {
                                    const sp = SPHERES.find(x => x.id === s);
                                    return sp ? <div key={s} className={`w-3 h-3 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`}></div> : null;
                                })}
                            </div>
                            <span className="text-sm font-medium text-[#2F3437] dark:text-slate-200 truncate">
                                {selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ')}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm text-[#6B6E70] dark:text-slate-400">Выбери сферу...</span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-[#6B6E70] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                    {SPHERES.map(s => {
                        const isSelected = selected.includes(s.id);
                        const Icon = ICON_MAP[s.icon];
                        return (
                            <button
                                key={s.id}
                                onClick={() => toggleSphere(s.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                {Icon && <Icon size={14} className={isSelected ? s.text : 'text-[#6B6E70]'} />}
                                <span className="flex-1">{s.label}</span>
                                {isSelected && <Check size={14} className="text-indigo-500" />}
                            </button>
                        );
                    })}
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
    const [searchQuery, setSearchQuery] = useState('');
    const [title, setTitle] = useState('');
    const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
    const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Editor State
    const creationContentEditableRef = useRef<HTMLDivElement>(null);
    const [creationHistory, setCreationHistory] = useState<string[]>(['']);
    const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
    const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial Task Linking
    useEffect(() => {
        if (initialTaskId) {
            setLinkedTaskId(initialTaskId);
            const task = tasks.find(t => t.id === initialTaskId);
            if (task) {
                setTitle(`Рефлексия: ${task.title || 'Задача'}`);
            }
            onClearInitialTask();
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    const handleCreationInput = () => {
        if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
        historyTimeoutRef.current = setTimeout(() => {
            if (creationContentEditableRef.current) {
                const content = creationContentEditableRef.current.innerHTML;
                const newHistory = creationHistory.slice(0, creationHistoryIndex + 1);
                newHistory.push(content);
                if (newHistory.length > 20) newHistory.shift();
                setCreationHistory(newHistory);
                setCreationHistoryIndex(newHistory.length - 1);
            }
        }, 500);
    };

    const handleEditorClick = () => {
        // Placeholder for selection handling if needed
    };

    const saveSelection = () => {
        // Placeholder for selection handling if needed
    };

    const handleSaveEntry = () => {
        const rawHtml = creationContentEditableRef.current?.innerHTML || '';
        const content = htmlToMarkdown(rawHtml);
        
        if (!content.trim() && !title.trim()) return;

        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            title: title.trim() ? applyTypography(title.trim()) : undefined,
            content: applyTypography(content),
            spheres: selectedSpheres,
            linkedTaskId: linkedTaskId || undefined,
            isInsight: false
        };

        addEntry(newEntry);
        
        // Reset
        setTitle('');
        setSelectedSpheres([]);
        setLinkedTaskId(null);
        if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = '';
        setCreationHistory(['']);
        setCreationHistoryIndex(0);
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const analysis = await analyzeJournalPath(entries, config);
            addMentorAnalysis({
                id: Date.now().toString(),
                date: Date.now(),
                content: analysis,
                mentorName: "AI Mentor"
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const linkedTask = useMemo(() => tasks.find(t => t.id === linkedTaskId), [tasks, linkedTaskId]);

    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (e.title && e.title.toLowerCase().includes(q)) || e.content.toLowerCase().includes(q);
            }
            return true;
        }).sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const groupedEntries = useMemo(() => {
        const groups: Record<string, JournalEntry[]> = {};
        filteredEntries.forEach(e => {
            const dateKey = new Date(e.date).toLocaleDateString();
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(e);
        });
        return groups;
    }, [filteredEntries]);

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
            <header className="px-4 md:px-8 pt-4 md:pt-8 mb-6 shrink-0">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники пути</p>
                    </div>
                    <button 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md"
                    >
                        {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={16} />}
                        <span className="hidden md:inline">Анализ Пути</span>
                    </button>
                </div>

                {/* Create Entry Area */}
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 transition-all">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <input 
                                type="text" 
                                placeholder="Заголовок (опционально)" 
                                className="flex-1 bg-transparent text-lg font-bold text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            {linkedTask && (
                                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded text-xs text-indigo-600 dark:text-indigo-400">
                                    <LinkIcon size={12} />
                                    <span className="truncate max-w-[100px]">{linkedTask.title || 'Задача'}</span>
                                    <button onClick={() => setLinkedTaskId(null)}><X size={12} /></button>
                                </div>
                            )}
                        </div>

                        {/* Expanded Form */}
                        <div className="mb-2">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 pl-1 tracking-widest font-mono">
                                <Target size={10} strokeWidth={1} /> Сферы
                            </label>
                            <SphereSelector selected={selectedSpheres} onChange={setSelectedSpheres} />
                        </div>
                        
                        <div className="relative">
                            <div 
                                ref={creationContentEditableRef}
                                contentEditable 
                                onInput={handleCreationInput} 
                                onClick={handleEditorClick}
                                onBlur={saveSelection}
                                onMouseUp={saveSelection}
                                onKeyUp={saveSelection}
                                className="w-full h-40 md:h-56 overflow-y-auto outline-none text-base text-slate-800 dark:text-slate-200 bg-transparent p-1 font-serif leading-relaxed custom-scrollbar-ghost [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:dark:text-slate-500"
                                data-placeholder="О чем ты думаешь?"
                            />
                            <div className="absolute bottom-0 left-0 w-full h-px bg-slate-200/50 dark:bg-slate-700/50" />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                onClick={handleSaveEntry}
                                className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium text-sm hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Save size={16} /> Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
                <div className="max-w-3xl mx-auto space-y-8">
                    
                    {/* Search */}
                    <div className="relative group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Поиск по записям..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-shadow shadow-sm"
                        />
                    </div>

                    {/* Mentor Analyses */}
                    {mentorAnalyses.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Bot size={14} /> Анализ Ментора
                            </h3>
                            {mentorAnalyses.map(analysis => (
                                <div key={analysis.id} className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-6 relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={16} className="text-indigo-500" />
                                            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{analysis.mentorName}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] text-slate-400 font-mono">{new Date(analysis.date).toLocaleDateString()}</span>
                                            <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="text-slate-700 dark:text-slate-300 font-serif text-sm leading-relaxed">
                                        <ReactMarkdown components={{p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />}}>{formatForDisplay(analysis.content)}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Journal Entries Grouped by Date */}
                    {Object.entries(groupedEntries).map(([date, dayEntries]) => (
                        <div key={date} className="relative pl-8 border-l border-slate-200 dark:border-slate-800">
                            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-[#f8fafc] dark:border-[#0f172a]" />
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 font-mono">{date}</div>
                            
                            <div className="space-y-6">
                                {dayEntries.map(entry => (
                                    <motion.div 
                                        key={entry.id} 
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 relative group ${entry.isInsight ? 'ring-2 ring-indigo-100 dark:ring-indigo-900/30' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                {entry.title && <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{entry.title}</h3>}
                                                <div className="flex flex-wrap gap-2">
                                                    {entry.spheres?.map(s => {
                                                        const sphere = SPHERES.find(sp => sp.id === s);
                                                        return sphere ? <span key={s} className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${sphere.bg} ${sphere.text}`}>{sphere.label}</span> : null;
                                                    })}
                                                    {entry.isInsight && <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center gap-1"><Zap size={10} /> Инсайт</span>}
                                                    {entry.mood && <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">Настроение: {entry.mood}/5</span>}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip content="Это инсайт">
                                                    <button 
                                                        onClick={() => updateEntry({...entry, isInsight: !entry.isInsight})}
                                                        className={`p-1.5 rounded-lg transition-colors ${entry.isInsight ? 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'text-slate-300 hover:text-violet-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                    >
                                                        <Zap size={16} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Удалить">
                                                    <button 
                                                        onClick={() => { if(confirm("В архив?")) deleteEntry(entry.id); }}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        <div className="text-slate-700 dark:text-slate-300 font-serif text-base leading-relaxed whitespace-pre-wrap">
                                            <ReactMarkdown components={{p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />}}>{formatForDisplay(entry.content)}</ReactMarkdown>
                                        </div>

                                        {/* Linked Context Footer */}
                                        {(entry.linkedTaskId || entry.linkedNoteId) && (
                                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap gap-3">
                                                {entry.linkedTaskId && (
                                                    <button onClick={() => onNavigateToTask(entry.linkedTaskId!)} className="flex items-center gap-2 text-xs text-slate-400 hover:text-indigo-500 transition-colors bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
                                                        <CheckCircle2 size={12} />
                                                        <span>Перейти к задаче</span>
                                                    </button>
                                                )}
                                                {entry.linkedNoteId && (
                                                    <button onClick={() => onNavigateToNote(entry.linkedNoteId!)} className="flex items-center gap-2 text-xs text-slate-400 hover:text-indigo-500 transition-colors bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
                                                        <StickyNote size={12} />
                                                        <span>Перейти к заметке</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        
                                        <div className="absolute bottom-4 right-4 text-[10px] text-slate-300 dark:text-slate-600 font-mono">
                                            {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {filteredEntries.length === 0 && (
                        <div className="text-center py-20 text-slate-400">
                            <Book size={48} className="mx-auto mb-4 opacity-50" strokeWidth={1} />
                            <p className="font-serif italic">Страницы пусты...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Journal;
