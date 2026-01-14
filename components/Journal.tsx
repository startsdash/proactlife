
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { JournalEntry, MentorAnalysis, Task, Note, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { SPHERES, ICON_MAP, applyTypography } from '../constants';
import { 
    Book, Plus, X, RotateCcw, RotateCw, Sparkles, BrainCircuit, Target, 
    Check, ChevronDown, Calendar, Search, Filter, PenTool, Hash, ArrowRight, 
    Zap, Link, MoreHorizontal, Trash2, Edit2, Archive, Bold, Italic, Eraser
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
  onNavigateToTask: (taskId: string) => void;
  onNavigateToNote: (noteId: string) => void;
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

const allowDataUrls = (url: string) => url;

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-800 dark:text-slate-200 leading-relaxed font-serif" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
};

// --- RICH TEXT HELPERS ---
const htmlToMarkdown = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const wrap = (text: string, marker: string) => {
        const match = text.match(/^(\s*)(.*?)(\s*)$/s);
        if (match && match[2]) {
            return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
        }
        return text.trim() ? `${marker}${text}${marker}` : '';
    };

    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            let content = '';
            el.childNodes.forEach(child => content += walk(child));
            
            if (el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0') >= 700) return wrap(content, '**');
            if (el.style.fontStyle === 'italic') return wrap(content, '*');
            
            switch (tag) {
                case 'b': case 'strong': return wrap(content, '**');
                case 'i': case 'em': return wrap(content, '*');
                case 'div': return content ? `\n${content}` : '\n'; 
                case 'p': return `\n${content}\n`;
                case 'br': return '\n';
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
                className={`w-full p-2 rounded-lg border flex items-center justify-between transition-all outline-none ${
                  isOpen ? 'border-indigo-400 ring-1 ring-indigo-50 dark:ring-indigo-900 bg-white dark:bg-[#1e293b]' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800'
                }`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selected.length > 0 ? (
                        <>
                            <div className="flex -space-x-1 shrink-0">
                                {selected.map(s => {
                                    const sp = SPHERES.find(x => x.id === s);
                                    return sp ? <div key={s} className={`w-2.5 h-2.5 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`}></div> : null;
                                })}
                            </div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                                {selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ')}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-slate-400">Выберите сферы...</span>
                    )}
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                {Icon && <Icon size={12} className={isSelected ? s.text : 'text-slate-400'} />}
                                <span className="flex-1">{s.label}</span>
                                {isSelected && <Check size={12} className="text-indigo-500" />}
                            </button>
                        );
                    })}
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
    // Creation State
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    const [creationTitle, setCreationTitle] = useState('');
    const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
    const [creationHistory, setCreationHistory] = useState<string[]>(['']);
    const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
    const creationContentEditableRef = useRef<HTMLDivElement>(null);
    const creationHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSelectionRange = useRef<Range | null>(null);

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Search/Filter
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (initialTaskId) {
            setIsCreatorOpen(true);
            // Optionally autofill some context about the task
            const task = tasks.find(t => t.id === initialTaskId);
            if (task) {
                setCreationTitle(`Рефлексия: ${task.title || 'Задача'}`);
            }
            onClearInitialTask?.();
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    // Helpers for Editor
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && creationContentEditableRef.current?.contains(sel.anchorNode)) {
            lastSelectionRange.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const saveCreationSnapshot = useCallback((content: string) => {
        if (content === creationHistory[creationHistoryIndex]) return;
        const newHistory = creationHistory.slice(0, creationHistoryIndex + 1);
        newHistory.push(content);
        if (newHistory.length > 20) newHistory.shift();
        setCreationHistory(newHistory);
        setCreationHistoryIndex(newHistory.length - 1);
    }, [creationHistory, creationHistoryIndex]);

    const handleCreationInput = () => {
        if (creationHistoryTimeoutRef.current) clearTimeout(creationHistoryTimeoutRef.current);
        creationHistoryTimeoutRef.current = setTimeout(() => {
            if (creationContentEditableRef.current) {
                saveCreationSnapshot(creationContentEditableRef.current.innerHTML);
            }
        }, 500);
    };

    const handleEditorClick = () => {
        saveSelection();
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (creationContentEditableRef.current) {
            creationContentEditableRef.current.focus();
            saveCreationSnapshot(creationContentEditableRef.current.innerHTML);
        }
    };

    const handleCreateEntry = () => {
        const rawHtml = creationContentEditableRef.current?.innerHTML || '';
        const mdContent = htmlToMarkdown(rawHtml);
        
        if (!creationTitle.trim() && !mdContent.trim()) return;
        
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            title: applyTypography(creationTitle.trim()),
            content: mdContent,
            spheres: selectedSpheres,
            linkedTaskId: initialTaskId || undefined,
            isInsight: false
        };
        
        addEntry(newEntry);
        
        // Reset
        setCreationTitle('');
        setSelectedSpheres([]);
        if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = '';
        setCreationHistory(['']);
        setCreationHistoryIndex(0);
        setIsCreatorOpen(false);
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const result = await analyzeJournalPath(entries, config);
            const analysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: result,
                mentorName: "AI Mentor"
            };
            addMentorAnalysis(analysis);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const filteredEntries = entries.filter(e => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return e.title?.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
    });

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a]">
            
            {/* HEADER */}
            <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-6 shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроника пути и поиск смыслов</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleAnalyze} 
                            disabled={isAnalyzing || entries.length < 3}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
                        >
                            {isAnalyzing ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Sparkles size={16} />}
                            <span>Анализ Пути</span>
                        </button>
                        <button 
                            onClick={() => setIsCreatorOpen(true)} 
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-all"
                        >
                            <Plus size={18} /> Новая запись
                        </button>
                    </div>
                </div>

                <div className="relative group max-w-md">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Поиск по записям..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-shadow shadow-sm placeholder:text-slate-400" 
                    />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
                
                {/* NEW ENTRY FORM */}
                <AnimatePresence>
                    {isCreatorOpen && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0, mb: 0 }}
                            animate={{ opacity: 1, height: 'auto', mb: 24 }}
                            exit={{ opacity: 0, height: 0, mb: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 shadow-xl border border-indigo-100 dark:border-indigo-900/30 relative">
                                <button onClick={() => setIsCreatorOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                                
                                <div className="mb-4">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <PenTool size={12} /> Новая запись
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Название" 
                                        value={creationTitle}
                                        onChange={(e) => setCreationTitle(e.target.value)}
                                        className="w-full bg-transparent text-xl font-sans font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 mb-2"
                                    />

                                    {/* Expanded Form */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 pl-1 tracking-widest font-mono">
                                                <Target size={10} strokeWidth={1} /> Сферы
                                            </label>
                                            <SphereSelector selected={selectedSpheres} onChange={setSelectedSpheres} />
                                        </div>
                                    </div>
                                    
                                    <div className="relative border border-slate-100 dark:border-slate-700/50 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 p-2">
                                        <div 
                                            ref={creationContentEditableRef}
                                            contentEditable 
                                            onInput={handleCreationInput} 
                                            onClick={handleEditorClick}
                                            onBlur={saveSelection}
                                            onMouseUp={saveSelection}
                                            onKeyUp={saveSelection}
                                            className="w-full h-40 md:h-56 overflow-y-auto outline-none text-base text-slate-800 dark:text-slate-200 bg-transparent p-2 font-serif leading-relaxed custom-scrollbar-ghost [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:dark:text-slate-500"
                                            data-placeholder="О чем ты думаешь?"
                                        />
                                        
                                        {/* Toolbar */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 mt-2">
                                            <button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><Bold size={16}/></button>
                                            <button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><Italic size={16}/></button>
                                            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                            <button onMouseDown={(e) => { e.preventDefault(); execCmd('removeFormat'); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><Eraser size={16}/></button>
                                            
                                            <div className="flex-1"></div>
                                            <button onClick={handleCreateEntry} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-indigo-700 transition-colors">Сохранить</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* TIMELINE */}
                <div className="relative">
                    <div className="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
                    
                    {/* Analyses */}
                    {mentorAnalyses.map(analysis => (
                        <div key={analysis.id} className="mb-8 pl-12 md:pl-20 relative group">
                            <div className="absolute left-2 md:left-6 top-0 w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border-2 border-indigo-500 z-10 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                            </div>
                            <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-[#1e293b] p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <BrainCircuit size={16} className="text-indigo-500" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Анализ Ментора</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400">{new Date(analysis.date).toLocaleDateString()}</span>
                                </div>
                                <div className="prose prose-sm dark:prose-invert max-w-none font-serif leading-relaxed">
                                    <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                        {analysis.content}
                                    </ReactMarkdown>
                                </div>
                                <button 
                                    onClick={() => { if(confirm('Удалить анализ?')) deleteMentorAnalysis(analysis.id); }}
                                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Entries */}
                    {filteredEntries.length === 0 ? (
                        <div className="pl-12 md:pl-20 py-10">
                            <EmptyState icon={Book} title="Дневник пуст" description="Здесь будут твои мысли и инсайты." color="slate" />
                        </div>
                    ) : (
                        filteredEntries.sort((a,b) => b.date - a.date).map(entry => (
                            <div key={entry.id} className="mb-8 pl-12 md:pl-20 relative group">
                                <div className={`absolute left-2 md:left-6 top-6 w-4 h-4 rounded-full border-2 z-10 bg-white dark:bg-[#0f172a] ${entry.isInsight ? 'border-amber-500' : 'border-slate-300 dark:border-slate-600'}`} />
                                
                                <div className={`bg-white dark:bg-[#1e293b] p-6 rounded-2xl border shadow-sm transition-all relative ${entry.isInsight ? 'border-amber-200 dark:border-amber-900/30 shadow-amber-500/5' : 'border-slate-100 dark:border-slate-800'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                {new Date(entry.date).toLocaleDateString()}
                                                {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                            {entry.title && <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{entry.title}</h3>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {entry.isInsight && <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Zap size={10} className="fill-current"/> Insight</span>}
                                            {entry.mood && <span className="text-lg" title={`Настроение: ${entry.mood}/5`}>{['','😖','😕','😐','🙂','🤩'][entry.mood]}</span>}
                                        </div>
                                    </div>

                                    <div className="text-slate-700 dark:text-slate-300 font-serif leading-relaxed mb-4 text-sm md:text-base">
                                        <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                            {entry.content}
                                        </ReactMarkdown>
                                    </div>

                                    {(entry.spheres?.length ?? 0) > 0 && (
                                        <div className="flex gap-2 mb-4">
                                            {entry.spheres?.map(s => {
                                                const sp = SPHERES.find(x => x.id === s);
                                                return sp ? (
                                                    <span key={s} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${sp.bg.replace('50', '50/50')} ${sp.text} ${sp.border}`}>
                                                        {sp.label}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    )}

                                    {/* Footer Actions */}
                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
                                        {entry.linkedTaskId && (
                                            <Tooltip content="Перейти к задаче">
                                                <button onClick={() => onNavigateToTask(entry.linkedTaskId!)} className="text-slate-400 hover:text-indigo-500"><Link size={16}/></button>
                                            </Tooltip>
                                        )}
                                        {entry.linkedNoteId && (
                                            <Tooltip content="Перейти к заметке">
                                                <button onClick={() => onNavigateToNote(entry.linkedNoteId!)} className="text-slate-400 hover:text-indigo-500"><Link size={16}/></button>
                                            </Tooltip>
                                        )}
                                        <Tooltip content={entry.isInsight ? "Убрать отметку инсайта" : "Отметить как инсайт"}>
                                            <button onClick={() => updateEntry({...entry, isInsight: !entry.isInsight})} className={`transition-colors ${entry.isInsight ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}><Zap size={16}/></button>
                                        </Tooltip>
                                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                                        <Tooltip content="Архивировать">
                                            <button onClick={() => { if(confirm("Архивировать запись?")) deleteEntry(entry.id); }} className="text-slate-400 hover:text-red-500"><Archive size={16}/></button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Journal;
