
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { SPHERES, applyTypography } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    PenTool, Link, Target, X, RotateCcw, RotateCw, Bold, Italic, Eraser, 
    Image as ImageIcon, Trash2, Layout, Palette, Send, Sparkles, History, 
    Loader2, Search, Calendar, ChevronRight, Check, Upload, RefreshCw, Shuffle, ArrowRight,
    MoreHorizontal, Book, Bot, ExternalLink
} from 'lucide-react';
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

const getJournalColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const UNSPLASH_PRESETS = [
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
];

// --- HELPER COMPONENTS ---

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

const CoverPicker: React.FC<{ onSelect: (url: string) => void, onClose: () => void, triggerRef: React.RefObject<HTMLElement> }> = ({ onSelect, onClose, triggerRef }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<string[]>(UNSPLASH_PRESETS);
    const [loading, setLoading] = useState(false);
    const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
    
    useEffect(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPickerStyle({
                position: 'fixed',
                top: rect.bottom + 8,
                left: rect.left,
                zIndex: 9999,
            });
        }
    }, [triggerRef]);

    const getUnsplashKey = () => {
        // @ts-ignore
        return import.meta.env?.VITE_UNSPLASH_ACCESS_KEY || '';
    };

    const searchUnsplash = async (q?: string) => {
        const key = getUnsplashKey();
        if (!key) {
            if (q) alert("Ключ Unsplash не найден.");
            return;
        }
        setLoading(true);
        try {
            const page = Math.floor(Math.random() * 10) + 1;
            const endpoint = q 
                ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=20&page=${page}&client_id=${key}`
                : `https://api.unsplash.com/photos/random?count=20&client_id=${key}`;
            
            const res = await fetch(endpoint);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            const urls = q ? data.results.map((img: any) => img.urls.regular) : data.map((img: any) => img.urls.regular);
            setResults(urls);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try { onSelect(await processImage(file)); onClose(); } catch (err) { console.error(err); }
        }
    };

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div className="fixed bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[9999] w-80 flex flex-col gap-3" style={pickerStyle}>
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Обложка</span><button onClick={onClose}><X size={14} /></button></div>
                <div className="relative">
                    <input type="text" placeholder="Поиск Unsplash..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchUnsplash(query)} className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors" />
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <button onClick={() => searchUnsplash(query)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500"><ArrowRight size={12} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-40 min-h-[60px]">
                    {loading ? <div className="col-span-3 flex justify-center py-4"><RefreshCw size={16} className="animate-spin text-slate-400" /></div> : results.map((url, i) => (
                        <button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-video rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500"><img src={url} className="w-full h-full object-cover" /></button>
                    ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <label className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer"><Upload size={12} /> Своя <input type="file" accept="image/*" className="hidden" onChange={handleUpload} /></label>
                    <button onClick={() => searchUnsplash()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium"><Shuffle size={12} /> Случайные</button>
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
            <div className="fixed bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-[9999] flex-wrap max-w-[200px]" style={style}>
                {colors.map(c => (
                    <button key={c.id} onMouseDown={(e) => { e.preventDefault(); onSelect(c.id); onClose(); }} className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform" style={{ backgroundColor: c.hex }} title={c.id} />
                ))}
            </div>
        </>,
        document.body
    );
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
        if (selected.includes(id)) onChange(selected.filter(s => s !== id));
        else onChange([...selected, id]);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    {selected.length > 0 ? (
                        <>
                            <div className="flex -space-x-1 shrink-0">
                                {selected.map(s => {
                                    const sp = SPHERES.find(x => x.id === s);
                                    return sp ? <div key={s} className={`w-3 h-3 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`}></div> : null;
                                })}
                            </div>
                            <span className="truncate text-slate-700 dark:text-slate-300">{selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ')}</span>
                        </>
                    ) : <span className="text-slate-400">Выбрать сферы</span>}
                </div>
                <ChevronRight size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                    {SPHERES.map(s => {
                        const isSelected = selected.includes(s.id);
                        return (
                            <button key={s.id} onClick={() => toggleSphere(s.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
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

const TaskSelect: React.FC<{ tasks: Task[], selectedId: string | undefined, onSelect: (id: string | undefined) => void }> = ({ tasks, selectedId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedTask = tasks.find(t => t.id === selectedId);
    
    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium flex items-center justify-between text-left">
                <span className={`truncate ${selectedTask ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                    {selectedTask ? selectedTask.title || selectedTask.content : 'Привязать к задаче'}
                </span>
                {selectedId ? <X size={14} className="text-slate-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); onSelect(undefined); }} /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 max-h-48 overflow-y-auto">
                        {tasks.length === 0 && <div className="p-2 text-center text-xs text-slate-400">Нет активных задач</div>}
                        {tasks.map(t => (
                            <button key={t.id} onClick={() => { onSelect(t.id); setIsOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors truncate ${t.id === selectedId ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-slate-600 dark:text-slate-400'}`}>
                                {t.title || t.content}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask }) => {
    const [creationTitle, setCreationTitle] = useState('');
    const [creationColor, setCreationColor] = useState('white');
    const [creationCover, setCreationCover] = useState<string | null>(null);
    const [linkedTaskId, setLinkedTaskId] = useState<string | undefined>(undefined);
    const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
    const [isCreationExpanded, setIsCreationExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showCreationCoverPicker, setShowCreationCoverPicker] = useState(false);
    const [showCreationColorPicker, setShowCreationColorPicker] = useState(false);
    
    // Editor State
    const creationRef = useRef<HTMLDivElement>(null);
    const creationContentEditableRef = useRef<HTMLDivElement>(null);
    const creationFileInputRef = useRef<HTMLInputElement>(null);
    const creationPickerTriggerRef = useRef<HTMLButtonElement>(null);
    const creationColorTriggerRef = useRef<HTMLButtonElement>(null);
    const [creationHistory, setCreationHistory] = useState<string[]>(['']);
    const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
    const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
    const lastSelectionRange = useRef<Range | null>(null);
    
    // Check available tools
    const hasMentorTool = config.aiTools.some(t => t.id === 'journal_mentor' && !t.isDisabled);
    
    const availableTasks = useMemo(() => tasks.filter(t => !t.isArchived), [tasks]);

    useEffect(() => {
        if (initialTaskId) {
            setLinkedTaskId(initialTaskId);
            setIsCreationExpanded(true);
            setTimeout(() => {
                creationContentEditableRef.current?.focus();
            }, 100);
            onClearInitialTask?.();
        }
    }, [initialTaskId]);

    // --- EDITOR LOGIC (Copied & Adapted) ---
    const saveCreationSnapshot = useCallback((content: string) => {
        if (content === creationHistory[creationHistoryIndex]) return;
        const newHistory = creationHistory.slice(0, creationHistoryIndex + 1);
        newHistory.push(content);
        if (newHistory.length > 20) newHistory.shift();
        setCreationHistory(newHistory);
        setCreationHistoryIndex(newHistory.length - 1);
    }, [creationHistory, creationHistoryIndex]);

    const handleCreationInput = () => {
        if (creationContentEditableRef.current) {
            saveCreationSnapshot(creationContentEditableRef.current.innerHTML);
        }
    };

    const execCreationCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (creationContentEditableRef.current) {
            creationContentEditableRef.current.focus();
            saveCreationSnapshot(creationContentEditableRef.current.innerHTML);
        }
    };

    const handleClearCreationStyle = (e: React.MouseEvent) => {
        e.preventDefault();
        execCreationCmd('removeFormat');
        execCreationCmd('formatBlock', 'div'); 
    };

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && creationContentEditableRef.current && creationContentEditableRef.current.contains(sel.anchorNode)) {
            lastSelectionRange.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const execCreationUndo = () => {
        if (creationHistoryIndex > 0) {
            const prevIndex = creationHistoryIndex - 1;
            setCreationHistoryIndex(prevIndex);
            if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = creationHistory[prevIndex];
        }
    };

    const execCreationRedo = () => {
        if (creationHistoryIndex < creationHistory.length - 1) {
            const nextIndex = creationHistoryIndex + 1;
            setCreationHistoryIndex(nextIndex);
            if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = creationHistory[nextIndex];
        }
    };

    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            if (activeImage && activeImage !== target) activeImage.style.outline = 'none';
            const img = target as HTMLImageElement;
            img.style.outline = '3px solid #6366f1'; 
            img.style.borderRadius = '4px';
            setActiveImage(img);
        } else {
            if (activeImage) { activeImage.style.outline = 'none'; setActiveImage(null); }
        }
        saveSelection();
    };

    const deleteActiveImage = (e?: React.MouseEvent) => {
        if(e) { e.preventDefault(); e.stopPropagation(); }
        if (activeImage) {
            activeImage.remove();
            setActiveImage(null);
            if (creationContentEditableRef.current) saveCreationSnapshot(creationContentEditableRef.current.innerHTML);
        }
    };

    const insertImageAtCursor = (base64: string) => {
        if (!creationContentEditableRef.current) return;
        creationContentEditableRef.current.focus();
        let range = lastSelectionRange.current;
        if (!range || !creationContentEditableRef.current.contains(range.commonAncestorContainer)) {
             range = document.createRange();
             range.selectNodeContents(creationContentEditableRef.current);
             range.collapse(false);
        }
        const img = document.createElement('img');
        img.src = base64;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.display = 'block';
        img.style.margin = '8px 0';
        img.style.cursor = 'pointer';
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.setEndAfter(img);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        saveCreationSnapshot(creationContentEditableRef.current.innerHTML);
    };

    const handleCreationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await processImage(file);
                insertImageAtCursor(base64);
            } catch (err) { console.error(err); }
            e.target.value = '';
        }
    };

    const htmlToMarkdown = (html: string) => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        let md = temp.innerText; // Simplified for now or use full converter if needed. 
        // For robustness, let's use a simple approach: if user types in contentEditable, 
        // we mostly care about text. If they add images, we'd need better parsing.
        // Re-using Napkins logic:
        const walk = (node: Node): string => {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
            if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                const tag = el.tagName.toLowerCase();
                if (tag === 'br') return '\n';
                if (tag === 'img') return `\n![image](${(el as HTMLImageElement).src})\n`;
                if (tag === 'div') return `\n${Array.from(el.childNodes).map(walk).join('')}`;
                return Array.from(el.childNodes).map(walk).join('');
            }
            return '';
        };
        return walk(temp).trim();
    };

    const hasCreationContent = (creationContentEditableRef.current?.innerText.trim().length || 0) > 0;

    const handlePost = () => {
        const contentHtml = creationContentEditableRef.current?.innerHTML || '';
        const markdown = htmlToMarkdown(contentHtml);
        
        if (!markdown && !creationTitle) return;

        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            title: applyTypography(creationTitle),
            content: applyTypography(markdown),
            linkedTaskId,
            spheres: selectedSpheres,
            color: creationColor,
            coverUrl: creationCover || undefined,
            isInsight: false
        };
        
        addEntry(newEntry);
        
        // Reset
        setCreationTitle('');
        if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = '';
        setCreationCover(null);
        setCreationColor('white');
        setLinkedTaskId(undefined);
        setSelectedSpheres([]);
        setIsCreationExpanded(false);
    };

    const handleAnalyzePath = async () => {
        if (entries.length === 0) return;
        setIsAnalyzing(true);
        try {
            const analysisText = await analyzeJournalPath(entries, config);
            addMentorAnalysis({
                id: Date.now().toString(),
                date: Date.now(),
                content: analysisText,
                mentorName: "AI Mentor"
            });
            setShowHistory(true);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const displayedEntries = useMemo(() => {
        let filtered = entries;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(e => 
                (e.title && e.title.toLowerCase().includes(q)) || 
                e.content.toLowerCase().includes(q)
            );
        }
        return filtered.sort((a, b) => b.date - a.date);
    }, [entries, searchQuery]);

    const actionButtonStyle = "p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-500 hover:border-indigo-200 transition-all shadow-sm";

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative">
            {/* Header */}
            <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 z-20">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники Пути</p>
                    </div>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-400 transition-all w-full md:w-64"
                        />
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </header>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar-light relative z-10 pb-20">
             <div className="w-full px-4 md:px-8 pt-6 pb-8 relative z-10">
                {/* CREATION BLOCK (COLLAPSIBLE) */}
                <div className="max-w-3xl mx-auto w-full mb-8 relative z-30">
                    <div className="flex gap-2 items-start">
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
                                                <Sparkles size={20} strokeWidth={1.5} />
                                            )}
                                        </button>
                                    </Tooltip>

                                    <Tooltip content="Архив наставника" side="bottom">
                                        <button 
                                            onClick={() => setShowHistory(true)} 
                                            className={actionButtonStyle}
                                        >
                                            <History size={20} strokeWidth={1.5} />
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* FEED */}
                <div className="max-w-3xl mx-auto w-full space-y-6">
                    {displayedEntries.length === 0 ? (
                        <EmptyState 
                            icon={Book} 
                            title="Дневник пуст" 
                            description={searchQuery ? "Ничего не найдено" : "Лучшее время начать — сейчас"} 
                            color="cyan"
                        />
                    ) : (
                        displayedEntries.map(entry => (
                            <div 
                                key={entry.id} 
                                className={`${getJournalColorClass(entry.color)} rounded-2xl p-6 border border-slate-200/60 dark:border-white/5 shadow-sm relative group transition-all hover:shadow-md`}
                            >
                                {entry.coverUrl && (
                                    <div className="mb-4 rounded-xl overflow-hidden -mx-6 -mt-6">
                                        <img src={entry.coverUrl} alt="Cover" className="w-full h-32 md:h-48 object-cover" />
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                                    {new Date(entry.date).toLocaleDateString()}
                                                </span>
                                                <span className="text-[10px] text-slate-300 dark:text-slate-600">
                                                    {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            {entry.title && <h3 className="text-lg font-sans font-bold text-slate-800 dark:text-slate-100">{entry.title}</h3>}
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button onClick={() => { if(confirm("Удалить запись?")) deleteEntry(entry.id); }} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="prose prose-sm dark:prose-invert max-w-none font-serif text-slate-600 dark:text-slate-300 leading-relaxed">
                                    <ReactMarkdown>{entry.content}</ReactMarkdown>
                                </div>

                                {/* Metadata Footer */}
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-3 items-center">
                                    {entry.linkedTaskId && (() => {
                                        const task = tasks.find(t => t.id === entry.linkedTaskId);
                                        return task ? (
                                            <button 
                                                onClick={() => onNavigateToTask?.(task.id)}
                                                className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded flex items-center gap-1 hover:text-indigo-500 transition-colors"
                                            >
                                                <Link size={10} /> {task.title || "Связанная задача"}
                                                <ExternalLink size={10} className="ml-1 opacity-50" />
                                            </button>
                                        ) : null;
                                    })()}
                                    
                                    {entry.spheres && entry.spheres.map(s => {
                                        const sphere = SPHERES.find(sp => sp.id === s);
                                        return sphere ? (
                                            <div key={s} className={`text-[9px] px-2 py-1 rounded border ${sphere.bg} ${sphere.border} ${sphere.text} font-bold uppercase tracking-wider`}>
                                                {sphere.label}
                                            </div>
                                        ) : null;
                                    })}

                                    {entry.mood && (
                                        <div className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded font-bold uppercase tracking-wider">
                                            Mood: {entry.mood}/5
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
            </div>

            {/* MENTOR HISTORY MODAL */}
            <AnimatePresence>
                {showHistory && (
                    <div className="fixed inset-0 z-50 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[85vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <h3 className="text-xl font-light text-slate-800 dark:text-slate-200">Архив Наставника</h3>
                                <button onClick={() => setShowHistory(false)}><X size={20} className="text-slate-400" /></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar-light space-y-4 pr-2">
                                {mentorAnalyses.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">История пуста</div>
                                ) : (
                                    mentorAnalyses.sort((a,b) => b.date - a.date).map(analysis => (
                                        <div key={analysis.id} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Bot size={16} className="text-indigo-500" />
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{analysis.mentorName}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{new Date(analysis.date).toLocaleDateString()}</span>
                                                </div>
                                                <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                                            </div>
                                            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-serif">
                                                <ReactMarkdown>{analysis.content}</ReactMarkdown>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Journal;
