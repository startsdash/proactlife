
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Masonry from 'react-masonry-css';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import { PenTool, X, Link, Target, RotateCcw, RotateCw, Bold, Italic, Eraser, Image as ImageIcon, Layout, Palette, Send, Sparkles, Loader2, History, Trash2, Calendar, Search, Filter, ChevronDown, Check, Shuffle, Upload, RefreshCw, ArrowRight, Link2, Book, Gem } from 'lucide-react';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';

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

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const UNSPLASH_PRESETS = [
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
];

const getJournalColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const actionButtonStyle = "p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors";

const allowDataUrls = (url: string) => url;

const processImage = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('File is not an image'));
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                } else {
                    reject(new Error('Canvas context failed'));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

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
                case 'code': return `\`${content}\``;
                case 'div': return content ? `\n${content}` : '\n'; 
                case 'p': return `\n${content}\n`;
                case 'br': return '\n';
                case 'img': return `\n![${(el as HTMLImageElement).alt || 'image'}](${(el as HTMLImageElement).src})\n`;
                default: return content;
            }
        }
        return '';
    };
    
    let md = walk(temp);
    md = md.replace(/\n{3,}/g, '\n\n').trim();
    return applyTypography(md);
};

// --- SUBCOMPONENTS ---

const CoverPicker: React.FC<{ onSelect: (url: string) => void, onClose: () => void, triggerRef: React.RefObject<HTMLElement> }> = ({ onSelect, onClose, triggerRef }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<string[]>(UNSPLASH_PRESETS);
    const [loading, setLoading] = useState(false);
    const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
    
    useEffect(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const viewportH = window.innerHeight;
            const viewportW = window.innerWidth;
            const pickerHeight = 320; 
            
            const style: React.CSSProperties = {};
            const spaceBelow = viewportH - rect.bottom;
            if (spaceBelow < pickerHeight && rect.top > spaceBelow) {
                style.bottom = viewportH - rect.top + 8;
                style.maxHeight = rect.top - 20;
            } else {
                style.top = rect.bottom + 8;
                style.maxHeight = spaceBelow - 20;
            }
            if (rect.left + 320 > viewportW) {
                style.right = 16;
            } else {
                style.left = rect.left;
            }
            setPickerStyle(style);
        }
    }, [triggerRef]);

    const searchUnsplash = async (q?: string) => {
        setLoading(true);
        // Simulate search or use preset if no API key logic here
        // In real app, reuse logic from Napkins.tsx
        setTimeout(() => {
            setResults(UNSPLASH_PRESETS);
            setLoading(false);
        }, 500);
    };

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div className="fixed bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[9999] w-80 flex flex-col gap-3" style={pickerStyle} onMouseDown={e => e.stopPropagation()}>
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Обложка</span><button onClick={onClose}><X size={14} /></button></div>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar-light min-h-[60px]">
                    {loading ? <RefreshCw size={16} className="animate-spin m-auto text-slate-400" /> : results.map((url, i) => (
                        <button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-video rounded overflow-hidden border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500 relative group bg-slate-100"><img src={url} className="w-full h-full object-cover" loading="lazy" /></button>
                    ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={() => searchUnsplash()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-xs font-medium text-slate-600 dark:text-slate-300"><Shuffle size={12} /> Случайные</button>
                </div>
            </div>
        </>,
        document.body
    );
};

const ColorPickerPopover: React.FC<{ onSelect: (colorId: string) => void, onClose: () => void, triggerRef: React.RefObject<HTMLElement> }> = ({ onSelect, onClose, triggerRef }) => {
    const [style, setStyle] = useState<React.CSSProperties>({});
    useEffect(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setStyle({ position: 'fixed', top: rect.bottom + 8, left: rect.left, zIndex: 9999 });
        }
    }, [triggerRef]);

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div className="fixed bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-[9999] flex-wrap max-w-[200px]" style={style} onMouseDown={e => e.stopPropagation()}>
                {colors.map(c => <button key={c.id} onMouseDown={(e) => { e.preventDefault(); onSelect(c.id); onClose(); }} className={`w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform`} style={{ backgroundColor: c.hex }} title={c.id} />)}
            </div>
        </>,
        document.body
    );
};

const TaskSelect: React.FC<{ tasks: Task[], selectedId?: string, onSelect: (id: string | undefined) => void }> = ({ tasks, selectedId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedTask = tasks.find(t => t.id === selectedId);
    
    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <span className={selectedTask ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}>{selectedTask ? selectedTask.title || 'Задача без названия' : 'Нет привязки'}</span>
                <ChevronDown size={14} className="text-slate-400" />
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar-light p-1">
                        <button onClick={() => { onSelect(undefined); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">Нет привязки</button>
                        {tasks.map(t => (
                            <button key={t.id} onClick={() => { onSelect(t.id); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded truncate">
                                {t.title || t.content.substring(0, 30)}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const SphereSelector: React.FC<{ selected: string[], onChange: (s: string[]) => void }> = ({ selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleSphere = (id: string) => {
        if (selected.includes(id)) onChange(selected.filter(s => s !== id));
        else onChange([...selected, id]);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 transition-colors">
                <span className={selected.length > 0 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}>{selected.length > 0 ? selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ') : 'Без сферы'}</span>
                <ChevronDown size={14} className="text-slate-400" />
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-1">
                        {SPHERES.map(s => {
                            const isSelected = selected.includes(s.id);
                            return (
                                <button key={s.id} onClick={() => toggleSphere(s.id)} className={`flex items-center w-full px-3 py-2 text-xs rounded transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                    <span className="flex-1 text-left">{s.label}</span>
                                    {isSelected && <Check size={12} />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask }) => {
    const [isCreationExpanded, setIsCreationExpanded] = useState(false);
    const [creationTitle, setCreationTitle] = useState('');
    const [creationCover, setCreationCover] = useState<string | null>(null);
    const [creationColor, setCreationColor] = useState('white');
    const [linkedTaskId, setLinkedTaskId] = useState<string | undefined>(undefined);
    const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Editor State
    const creationContentEditableRef = useRef<HTMLDivElement>(null);
    const creationRef = useRef<HTMLDivElement>(null);
    const [creationHistory, setCreationHistory] = useState<string[]>(['']);
    const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
    const creationPickerTriggerRef = useRef<HTMLButtonElement>(null);
    const creationColorTriggerRef = useRef<HTMLButtonElement>(null);
    const creationFileInputRef = useRef<HTMLInputElement>(null);
    const [showCreationCoverPicker, setShowCreationCoverPicker] = useState(false);
    const [showCreationColorPicker, setShowCreationColorPicker] = useState(false);
    const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
    const lastSelectionRange = useRef<Range | null>(null);

    const availableTasks = tasks.filter(t => !t.isArchived && t.column !== 'done');
    const hasMentorTool = config.aiTools.some(t => t.id === 'journal_mentor' && !t.isDisabled);

    useEffect(() => {
        if (initialTaskId) {
            setLinkedTaskId(initialTaskId);
            setIsCreationExpanded(true);
            setTimeout(() => {
                creationContentEditableRef.current?.focus();
            }, 100);
            onClearInitialTask?.();
        }
    }, [initialTaskId, onClearInitialTask]);

    const displayedEntries = entries.filter(e => {
        const matchesSearch = !searchQuery || (e.content.toLowerCase().includes(searchQuery.toLowerCase()) || e.title?.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
    }).sort((a, b) => b.date - a.date);

    // Editor Handlers
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && creationContentEditableRef.current && creationContentEditableRef.current.contains(sel.anchorNode)) {
            lastSelectionRange.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const handleCreationInput = () => {
        if (creationContentEditableRef.current) {
            const content = creationContentEditableRef.current.innerHTML;
            if (content !== creationHistory[creationHistoryIndex]) {
                const newHistory = creationHistory.slice(0, creationHistoryIndex + 1);
                newHistory.push(content);
                setCreationHistory(newHistory);
                setCreationHistoryIndex(newHistory.length - 1);
            }
        }
    };

    const execCreationCmd = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        handleCreationInput();
    };

    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            setActiveImage(target as HTMLImageElement);
        } else {
            setActiveImage(null);
        }
        saveSelection();
    };

    const deleteActiveImage = (e: React.MouseEvent) => {
        e.preventDefault();
        if (activeImage) {
            activeImage.remove();
            setActiveImage(null);
            handleCreationInput();
        }
    };

    const handleCreationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await processImage(file);
                if (creationContentEditableRef.current) {
                    creationContentEditableRef.current.focus();
                    if (lastSelectionRange.current) {
                        const sel = window.getSelection();
                        sel?.removeAllRanges();
                        sel?.addRange(lastSelectionRange.current);
                    }
                    document.execCommand('insertImage', false, base64);
                    handleCreationInput();
                }
            } catch (err) { console.error(err); }
        }
    };

    const execCreationUndo = () => {
        if (creationHistoryIndex > 0) {
            const newIndex = creationHistoryIndex - 1;
            setCreationHistoryIndex(newIndex);
            if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = creationHistory[newIndex];
        }
    };

    const execCreationRedo = () => {
        if (creationHistoryIndex < creationHistory.length - 1) {
            const newIndex = creationHistoryIndex + 1;
            setCreationHistoryIndex(newIndex);
            if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = creationHistory[newIndex];
        }
    };

    const handleClearCreationStyle = (e: React.MouseEvent) => {
        e.preventDefault();
        execCreationCmd('removeFormat');
    };

    const handlePost = () => {
        const contentHtml = creationContentEditableRef.current?.innerHTML || '';
        const content = htmlToMarkdown(contentHtml);
        
        if (!content.trim() && !creationTitle.trim()) return;

        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            title: creationTitle.trim() ? applyTypography(creationTitle.trim()) : undefined,
            content: applyTypography(content),
            color: creationColor,
            coverUrl: creationCover || undefined,
            linkedTaskId: linkedTaskId,
            spheres: selectedSpheres,
            isInsight: false
        };

        addEntry(newEntry);
        
        // Reset
        setCreationTitle('');
        setCreationCover(null);
        setCreationColor('white');
        setLinkedTaskId(undefined);
        setSelectedSpheres([]);
        if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = '';
        setCreationHistory(['']);
        setCreationHistoryIndex(0);
        setIsCreationExpanded(false);
    };

    const handleAnalyzePath = async () => {
        if (entries.length < 3) {
            alert("Нужно хотя бы 3 записи для анализа");
            return;
        }
        setIsAnalyzing(true);
        try {
            const analysis = await analyzeJournalPath(entries, config);
            const newAnalysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: analysis,
                mentorName: "AI Mentor"
            };
            addMentorAnalysis(newAnalysis);
            setShowHistory(true);
        } catch (e) {
            console.error("Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const hasCreationContent = (creationContentEditableRef.current?.innerText.trim().length || 0) > 0 || !!creationContentEditableRef.current?.querySelector('img');

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
             {/* Header Section */}
             <div className="w-full pr-4 pl-2 md:pr-8 md:pl-4 pt-6 pb-8 relative z-10">
                {/* CREATION BLOCK (COLLAPSIBLE) */}
                <div className="pl-2 md:pl-4 w-full">
                    <div className="max-w-3xl mx-auto w-full mb-8 relative z-30">
                        <div className={`flex gap-2 ${!isCreationExpanded ? 'items-center' : 'items-start'}`}>
                            <div className="flex-1 min-w-0" ref={creationRef}>
                                {!isCreationExpanded ? (
                                    <div 
                                        onClick={() => { setIsCreationExpanded(true); setTimeout(() => creationContentEditableRef.current?.focus(), 100); }}
                                        className="bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/5 shadow-sm p-4 cursor-text flex items-center justify-between group hover:shadow-md transition-all h-[52px]"
                                    >
                                        <span className="text-slate-400 dark:text-slate-500 font-serif italic text-base pl-2">Записать мысль...</span>
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 group-hover:text-indigo-500 transition-colors">
                                            <PenTool size={18} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`${getJournalColorClass(creationColor)} backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/5 shadow-lg p-5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200 relative`}>
                                        {creationCover && (
                                            <div className="relative w-full h-32 group rounded-t-xl overflow-hidden -mt-5 -mx-5 mb-3 w-[calc(100%_+_2.5rem)]">
                                                <img src={creationCover} alt="Cover" className="w-full h-full object-cover" />
                                                <button onClick={() => setCreationCover(null)} className="absolute top-3 right-3 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={14} /></button>
                                            </div>
                                        )}
                                        
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
                                                    <Link size={10} strokeWidth={1} /> Контекст
                                                </label>
                                                <TaskSelect tasks={availableTasks} selectedId={linkedTaskId} onSelect={setLinkedTaskId} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 pl-1 tracking-widest font-mono">
                                                    <Target size={10} strokeWidth={1} /> Сферы
                                                </label>
                                                <SphereSelector selected={selectedSpheres} onChange={setSelectedSpheres} />
                                            </div>
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
                                                data-placeholder="О чем ты думаешь? Чему научило это событие?"
                                            />
                                            <div className="absolute bottom-0 left-0 w-full h-px bg-slate-200/50 dark:bg-slate-700/50" />
                                        </div>

                                        {/* TOOLBAR */}
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 mb-1">
                                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mask-fade-right">
                                                <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execCreationUndo(); }} disabled={creationHistoryIndex <= 0} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                                <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execCreationRedo(); }} disabled={creationHistoryIndex >= creationHistory.length - 1} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCreationCmd('bold'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Bold size={16} /></button></Tooltip>
                                                <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCreationCmd('italic'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Italic size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Очистить"><button onMouseDown={handleClearCreationStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Eraser size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Вставить картинку"><label className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer text-slate-400 dark:text-slate-500 flex items-center justify-center"><input ref={creationFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCreationImageUpload} /><ImageIcon size={16} /></label></Tooltip>
                                                {activeImage && creationContentEditableRef.current && creationContentEditableRef.current.contains(activeImage) && <Tooltip content="Удалить картинку"><button onMouseDown={deleteActiveImage} className="image-delete-btn p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"><Trash2 size={16} /></button></Tooltip>}
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <div className="relative">
                                                    <Tooltip content="Обложка">
                                                        <button 
                                                            ref={creationPickerTriggerRef}
                                                            onMouseDown={(e) => { e.preventDefault(); setShowCreationCoverPicker(!showCreationCoverPicker); }} 
                                                            className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${creationCover ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                                        >
                                                            <Layout size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    {showCreationCoverPicker && <CoverPicker onSelect={setCreationCover} onClose={() => setShowCreationCoverPicker(false)} triggerRef={creationPickerTriggerRef} />}
                                                </div>
                                                <div className="relative">
                                                    <Tooltip content="Фон записи">
                                                        <button 
                                                            ref={creationColorTriggerRef}
                                                            onMouseDown={(e) => { e.preventDefault(); setShowCreationColorPicker(!showCreationColorPicker); }} 
                                                            className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${creationColor !== 'white' ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                                        >
                                                            <Palette size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    {showCreationColorPicker && (
                                                        <ColorPickerPopover
                                                            onSelect={setCreationColor}
                                                            onClose={() => setShowCreationColorPicker(false)}
                                                            triggerRef={creationColorTriggerRef}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={handlePost} 
                                                disabled={!hasCreationContent && !creationTitle} 
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 font-medium text-sm transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
                                            >
                                                <Send size={16} strokeWidth={1} /> 
                                                <span className="font-serif">Записать мысль</span>
                                            </button>
                                            <button 
                                                onClick={() => setIsCreationExpanded(false)} 
                                                className="px-4 py-3 rounded-xl border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                            >
                                                <X size={20} strokeWidth={1} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 shrink-0">
                                {hasMentorTool && (
                                    <>
                                        <Tooltip content={isAnalyzing ? "Остановить генерацию" : "Наставник (ИИ)"} side="bottom" disabled={isAnalyzing}>
                                            <button 
                                                onClick={handleAnalyzePath} 
                                                disabled={displayedEntries.length === 0} 
                                                className={`${actionButtonStyle} ${isAnalyzing ? 'animate-pulse' : ''}`}
                                            >
                                                {isAnalyzing ? (
                                                    <div className="relative w-4 h-4 flex items-center justify-center">
                                                        <Loader2 size={16} className="animate-spin absolute inset-0" />
                                                        <div className="w-2 h-2 bg-current rounded-[1px] relative z-10" />
                                                    </div>
                                                ) : (
                                                    <Sparkles size={18} strokeWidth={1.5} />
                                                )}
                                            </button>
                                        </Tooltip>

                                        <Tooltip content="Архив наставника" side="bottom">
                                            <button 
                                                onClick={() => setShowHistory(true)} 
                                                className={actionButtonStyle}
                                            >
                                                <History size={18} strokeWidth={1.5} />
                                            </button>
                                        </Tooltip>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {displayedEntries.length === 0 ? (
                    <EmptyState 
                        icon={Book} 
                        title="Путь начинается" 
                        description="Первая запись станет началом твоей истории" 
                        color="cyan"
                    />
                ) : (
                    <div className="px-4 md:px-8">
                        <Masonry breakpointCols={{ default: 3, 1100: 2, 700: 1 }} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                            {displayedEntries.map(entry => {
                                const hasTask = !!entry.linkedTaskId;
                                return (
                                    <div key={entry.id} className={`${getJournalColorClass(entry.color)} rounded-3xl p-6 mb-6 break-inside-avoid relative group transition-all shadow-sm border border-slate-200/50 dark:border-slate-800`}>
                                        {entry.coverUrl && <div className="h-40 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-3xl"><img src={entry.coverUrl} className="w-full h-full object-cover" /></div>}
                                        
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                                                <Calendar size={12} /> {new Date(entry.date).toLocaleDateString()}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Trash2 size={14}/></button>
                                            </div>
                                        </div>

                                        {entry.title && <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 font-sans">{entry.title}</h3>}
                                        <div className="text-slate-700 dark:text-slate-300 font-serif text-sm leading-relaxed mb-4">
                                            <ReactMarkdown 
                                                components={{
                                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                                    img: ({node, ...props}) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} />
                                                }}
                                                urlTransform={allowDataUrls} 
                                                remarkPlugins={[remarkGfm]} 
                                                rehypePlugins={[rehypeRaw]}
                                            >
                                                {entry.content}
                                            </ReactMarkdown>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {hasTask && (
                                                <button 
                                                    onClick={() => entry.linkedTaskId && onNavigateToTask?.(entry.linkedTaskId)}
                                                    className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-500 hover:text-indigo-500 transition-colors"
                                                >
                                                    <Link2 size={10} /> Контекст
                                                </button>
                                            )}
                                            {entry.spheres?.map(s => (
                                                <span key={s} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-medium text-slate-500 uppercase tracking-wider">{SPHERES.find(sp => sp.id === s)?.label}</span>
                                            ))}
                                            {entry.isInsight && <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-[10px] font-bold uppercase flex items-center gap-1"><Gem size={10} /> Insight</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </Masonry>
                    </div>
                )}
             </div>

             {/* MENTOR HISTORY MODAL */}
             <AnimatePresence>
                 {showHistory && (
                     <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
                         <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                            onClick={e => e.stopPropagation()}
                         >
                             <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                 <h3 className="font-bold text-slate-800 dark:text-white">Архив Наставника</h3>
                                 <button onClick={() => setShowHistory(false)}><X size={20} className="text-slate-400" /></button>
                             </div>
                             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                 {mentorAnalyses.length === 0 ? <div className="text-center text-slate-400">Нет записей</div> : mentorAnalyses.map(a => (
                                     <div key={a.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800 relative group">
                                         <div className="flex justify-between items-center mb-3">
                                             <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider">{a.mentorName}</div>
                                             <div className="text-[10px] text-slate-400 font-mono">{new Date(a.date).toLocaleDateString()}</div>
                                         </div>
                                         <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
                                             <ReactMarkdown>{a.content}</ReactMarkdown>
                                         </div>
                                         <button onClick={() => deleteMentorAnalysis(a.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                     </div>
                                 ))}
                             </div>
                         </motion.div>
                     </div>
                 )}
             </AnimatePresence>
        </div>
    );
};

export default Journal;
