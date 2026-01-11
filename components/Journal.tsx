
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';
import { 
  PenTool, Link, Target, RotateCcw, RotateCw, Bold, Italic, Eraser, 
  ImageIcon, Layout, Palette, Send, X, Sparkles, History, Loader2, 
  Trash2, Search, Filter, Calendar, ChevronRight, ChevronDown, Check, 
  MoreHorizontal, Book, ArrowRight, Quote, RefreshCw, Upload, Shuffle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

// --- HELPERS ---

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
                case 'h1': return `\n# ${content}\n`;
                case 'h2': return `\n## ${content}\n`;
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

// --- COMPONENTS ---

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

    const getUnsplashKey = () => {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_UNSPLASH_ACCESS_KEY) return import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
        return '';
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
            const urls = q 
                ? data.results.map((img: any) => img.urls.regular) 
                : data.map((img: any) => img.urls.regular);
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
            <div 
                className="fixed bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[9999] w-80 flex flex-col gap-3 portal-popup" 
                style={pickerStyle}
                onMouseDown={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Обложка</span><button onClick={onClose}><X size={14} /></button></div>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Поиск..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchUnsplash(query)}
                        className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none focus:border-indigo-500 transition-colors"
                    />
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <button onClick={() => searchUnsplash(query)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 p-1"><ArrowRight size={12} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar-light min-h-[60px]">
                    {loading ? (
                        <div className="col-span-3 flex items-center justify-center py-4 text-slate-400"><RefreshCw size={16} className="animate-spin" /></div>
                    ) : (
                        results.map((url, i) => (
                            <button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-video rounded overflow-hidden border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500 relative group bg-slate-100">
                                <img src={url} className="w-full h-full object-cover" loading="lazy" />
                            </button>
                        ))
                    )}
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <label className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-xs font-medium cursor-pointer transition-colors text-slate-600 dark:text-slate-300">
                        <Upload size={12} /> Своя 
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    </label>
                    <button onClick={() => searchUnsplash()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-xs font-medium transition-colors text-slate-600 dark:text-slate-300">
                        <Shuffle size={12} /> Случайные
                    </button>
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
                {colors.map(c => (
                    <button key={c.id} onMouseDown={(e) => { e.preventDefault(); onSelect(c.id); onClose(); }} className={`w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform`} style={{ backgroundColor: c.hex }} title={c.id} />
                ))}
            </div>
        </>,
        document.body
    );
};

const TaskSelect: React.FC<{ tasks: Task[], selectedId: string | undefined, onSelect: (id: string | undefined) => void }> = ({ tasks, selectedId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedTask = tasks.find(t => t.id === selectedId);
    
    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left p-2 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs flex items-center justify-between">
                <span className={`truncate ${selectedTask ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                    {selectedTask ? selectedTask.title || 'Без названия' : 'Выберите задачу...'}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto p-1">
                        <button onClick={() => { onSelect(undefined); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded">Не выбрано</button>
                        {tasks.map(t => (
                            <button key={t.id} onClick={() => { onSelect(t.id); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded flex items-center justify-between">
                                <span className="truncate">{t.title || 'Без названия'}</span>
                                {t.id === selectedId && <Check size={12} className="text-indigo-500" />}
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
    const toggle = (id: string) => selected.includes(id) ? onChange(selected.filter(s => s !== id)) : onChange([...selected, id]);

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left p-2 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs flex items-center justify-between">
                <span className={`truncate ${selected.length > 0 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                    {selected.length > 0 ? selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ') : 'Сферы...'}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-1">
                        {SPHERES.map(s => {
                            const isSelected = selected.includes(s.id);
                            return (
                                <button key={s.id} onClick={() => toggle(s.id)} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs w-full text-left transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                    <div className={`w-2 h-2 rounded-full ${s.bg.replace('50', '400').replace('/30','')}`} />
                                    <span className="flex-1">{s.label}</span>
                                    {isSelected && <Check size={12} className="text-indigo-500" />}
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
    // --- STATE ---
    const [isCreationExpanded, setIsCreationExpanded] = useState(false);
    const [creationTitle, setCreationTitle] = useState('');
    const [creationCover, setCreationCover] = useState<string | null>(null);
    const [creationColor, setCreationColor] = useState('white');
    const [linkedTaskId, setLinkedTaskId] = useState<string | undefined>(undefined);
    const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSphere, setFilterSphere] = useState<string | null>(null);
    
    // Editor State
    const creationRef = useRef<HTMLDivElement>(null);
    const creationContentEditableRef = useRef<HTMLDivElement>(null);
    const creationFileInputRef = useRef<HTMLInputElement>(null);
    const creationPickerTriggerRef = useRef<HTMLButtonElement>(null);
    const creationColorTriggerRef = useRef<HTMLButtonElement>(null);
    const [showCreationCoverPicker, setShowCreationCoverPicker] = useState(false);
    const [showCreationColorPicker, setShowCreationColorPicker] = useState(false);
    const [creationHistory, setCreationHistory] = useState<string[]>(['']);
    const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
    const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
    const lastSelectionRange = useRef<Range | null>(null);
    const [hasCreationContent, setHasCreationContent] = useState(false);

    // Mentor State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const availableTasks = tasks.filter(t => !t.isArchived);
    const hasMentorTool = config.aiTools.some(t => t.id === 'journal_mentor');
    const actionButtonStyle = "p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm text-slate-400 hover:text-indigo-500 transition-all border border-slate-200 dark:border-slate-700 hover:border-indigo-300";

    // --- EFFECTS ---
    useEffect(() => {
        if (initialTaskId) {
            setLinkedTaskId(initialTaskId);
            setIsCreationExpanded(true);
            setTimeout(() => {
                if (creationContentEditableRef.current) creationContentEditableRef.current.focus();
            }, 100);
            if (onClearInitialTask) onClearInitialTask();
        }
    }, [initialTaskId, onClearInitialTask]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (creationRef.current && !creationRef.current.contains(event.target as Node) && !showCreationCoverPicker && !showCreationColorPicker) {
                if (isCreationExpanded && !hasCreationContent && !creationTitle) {
                    setIsCreationExpanded(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isCreationExpanded, hasCreationContent, creationTitle, showCreationCoverPicker, showCreationColorPicker]);

    // --- EDITOR LOGIC ---
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && creationContentEditableRef.current && creationContentEditableRef.current.contains(sel.anchorNode)) {
            lastSelectionRange.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const handleCreationInput = () => {
        const content = creationContentEditableRef.current?.innerHTML || '';
        setHasCreationContent(content.trim().length > 0);
        
        // History
        if (content !== creationHistory[creationHistoryIndex]) {
            const newHistory = creationHistory.slice(0, creationHistoryIndex + 1);
            newHistory.push(content);
            if (newHistory.length > 20) newHistory.shift();
            setCreationHistory(newHistory);
            setCreationHistoryIndex(newHistory.length - 1);
        }
    };

    const execCreationCmd = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        if (creationContentEditableRef.current) {
            creationContentEditableRef.current.focus();
            handleCreationInput();
        }
    };

    const execCreationUndo = () => {
        if (creationHistoryIndex > 0) {
            const prev = creationHistoryIndex - 1;
            setCreationHistoryIndex(prev);
            if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = creationHistory[prev];
        }
    };

    const execCreationRedo = () => {
        if (creationHistoryIndex < creationHistory.length - 1) {
            const next = creationHistoryIndex + 1;
            setCreationHistoryIndex(next);
            if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = creationHistory[next];
        }
    };

    const handleClearCreationStyle = (e: React.MouseEvent) => {
        e.preventDefault();
        execCreationCmd('removeFormat');
    };

    const insertImageAtCursor = (base64: string) => {
        if (creationContentEditableRef.current) {
            creationContentEditableRef.current.focus();
            // Restore selection if lost
            const sel = window.getSelection();
            if (lastSelectionRange.current) {
                sel?.removeAllRanges();
                sel?.addRange(lastSelectionRange.current);
            }
            
            execCreationCmd('insertImage', base64);
            
            // Clean up: make sure image has style
            const images = creationContentEditableRef.current.querySelectorAll('img');
            const lastImg = images[images.length - 1];
            if (lastImg) {
                lastImg.style.maxWidth = '100%';
                lastImg.style.borderRadius = '8px';
                lastImg.style.marginTop = '8px';
                lastImg.style.marginBottom = '8px';
            }
            handleCreationInput();
        }
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

    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            if (activeImage) activeImage.style.outline = 'none';
            const img = target as HTMLImageElement;
            img.style.outline = '2px solid #6366f1';
            setActiveImage(img);
        } else {
            if (activeImage) {
                activeImage.style.outline = 'none';
                setActiveImage(null);
            }
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

    const handlePost = () => {
        const rawHtml = creationContentEditableRef.current?.innerHTML || '';
        const mdContent = htmlToMarkdown(rawHtml);
        
        if (!mdContent.trim() && !creationTitle.trim()) return;

        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            title: creationTitle.trim() ? applyTypography(creationTitle.trim()) : undefined,
            content: mdContent,
            linkedTaskId: linkedTaskId,
            spheres: selectedSpheres,
            color: creationColor,
            coverUrl: creationCover || undefined,
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
        setHasCreationContent(false);
        setCreationHistory(['']);
        setCreationHistoryIndex(0);
        setIsCreationExpanded(false);
    };

    // --- MENTOR ANALYSIS ---
    const displayedEntries = useMemo(() => {
        return entries
            .filter(e => {
                if (searchQuery && !e.content.toLowerCase().includes(searchQuery.toLowerCase()) && !e.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                if (filterSphere && !e.spheres?.includes(filterSphere)) return false;
                return true;
            })
            .sort((a, b) => b.date - a.date);
    }, [entries, searchQuery, filterSphere]);

    const handleAnalyzePath = async () => {
        if (displayedEntries.length === 0) return;
        setIsAnalyzing(true);
        try {
            const analysisText = await analyzeJournalPath(displayedEntries.slice(0, 10), config);
            const newAnalysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: analysisText,
                mentorName: 'AI Mentor'
            };
            addMentorAnalysis(newAnalysis);
            // Optionally scroll to top or show notification
        } catch (e) {
            console.error("Analysis Failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- RENDER ---
    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative">
             <div className="w-full px-4 md:px-8 pt-6 pb-8 relative z-10">
                {/* CREATION BLOCK (COLLAPSIBLE) */}
                <div className="max-w-3xl mx-auto w-full mb-8 relative z-30">
                    <div className={`flex gap-2 ${isCreationExpanded ? 'items-start' : 'items-center'}`}>
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

                {/* FILTERS */}
                <div className="max-w-3xl mx-auto flex items-center gap-4 mb-6">
                    <div className="relative flex-1 group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Поиск записей..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-indigo-200 dark:focus:border-indigo-900 transition-all placeholder:text-slate-300"
                        />
                    </div>
                    {/* SPHERE FILTER TOGGLES */}
                    <div className="flex gap-2">
                        {SPHERES.map(s => {
                            const active = filterSphere === s.id;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setFilterSphere(active ? null : s.id)}
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${active ? `bg-${s.color}-50 dark:bg-${s.color}-900/30 border-${s.color}-200 dark:border-${s.color}-800` : 'bg-white dark:bg-[#1e293b] border-slate-100 dark:border-slate-800 opacity-60 hover:opacity-100'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${s.bg.replace('50', '400').replace('/30','')}`} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ENTRIES FEED */}
                <div className="max-w-3xl mx-auto space-y-8 pb-20">
                    {displayedEntries.length === 0 ? (
                        <EmptyState icon={Book} title="Дневник пуст" description="История твоего Пути начнется с первой записи" />
                    ) : (
                        displayedEntries.map((entry, index) => {
                            const isPrevSameDay = index > 0 && new Date(displayedEntries[index - 1].date).toDateString() === new Date(entry.date).toDateString();
                            const date = new Date(entry.date);
                            const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
                            
                            return (
                                <React.Fragment key={entry.id}>
                                    {!isPrevSameDay && (
                                        <div className="flex items-center gap-4 py-4 opacity-50">
                                            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                                            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                                                {date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </span>
                                            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                                        </div>
                                    )}
                                    
                                    <motion.div 
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`group relative rounded-2xl p-6 md:p-8 border shadow-sm transition-shadow hover:shadow-md ${getJournalColorClass(entry.color)} border-slate-100 dark:border-slate-700/50`}
                                    >
                                        {/* Cover */}
                                        {entry.coverUrl && (
                                            <div className="h-40 -mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-6 overflow-hidden rounded-t-2xl relative">
                                                <img src={entry.coverUrl} className="w-full h-full object-cover" />
                                            </div>
                                        )}

                                        {/* Header Meta */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                                                        {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {entry.spheres?.map(sId => {
                                                        const s = SPHERES.find(sp => sp.id === sId);
                                                        return s ? <div key={s.id} className={`w-2 h-2 rounded-full ${s.bg.replace('50', '400').replace('/30','')}`} title={s.label} /> : null;
                                                    })}
                                                </div>
                                                {entry.title && <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100">{entry.title}</h3>}
                                            </div>
                                            
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                <button onClick={() => { if(confirm("Удалить запись?")) deleteEntry(entry.id); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="font-serif text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            <ReactMarkdown components={{
                                                p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                                                blockquote: ({children}) => <blockquote className="border-l-2 border-indigo-200 dark:border-indigo-800 pl-4 italic text-slate-500 my-4">{children}</blockquote>
                                            }}>{entry.content}</ReactMarkdown>
                                        </div>

                                        {/* Linked Context */}
                                        {linkedTask && (
                                            <div 
                                                onClick={() => onNavigateToTask && onNavigateToTask(linkedTask.id)}
                                                className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center gap-3 cursor-pointer group/link"
                                            >
                                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 group-hover/link:text-indigo-500 transition-colors">
                                                    <Link size={14} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Контекст</div>
                                                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate group-hover/link:text-indigo-600 dark:group-hover/link:text-indigo-400 transition-colors">{linkedTask.title || linkedTask.content}</div>
                                                </div>
                                                <ArrowRight size={14} className="text-slate-300 -translate-x-2 opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                                            </div>
                                        )}

                                        {/* AI Insight Badge (if marked) */}
                                        {entry.isInsight && (
                                            <div className="absolute top-4 right-4">
                                                <Sparkles size={16} className="text-amber-400 fill-amber-400/20" />
                                            </div>
                                        )}
                                    </motion.div>
                                </React.Fragment>
                            );
                        })
                    )}
                </div>
             </div>

             {/* MENTOR HISTORY SLIDEOUT */}
             <AnimatePresence>
                 {showHistory && (
                     <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/20 dark:bg-black/50 backdrop-blur-sm z-40"
                            onClick={() => setShowHistory(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-[#1e293b] shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h2 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <History size={18} className="text-indigo-500" /> Архив Наставника
                                </h2>
                                <button onClick={() => setShowHistory(false)}><X size={20} className="text-slate-400" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {mentorAnalyses.length === 0 ? (
                                    <div className="text-center text-slate-400 py-10">История пуста</div>
                                ) : (
                                    mentorAnalyses.map(analysis => (
                                        <div key={analysis.id} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{analysis.mentorName}</div>
                                                <div className="text-[10px] text-slate-400">{new Date(analysis.date).toLocaleDateString()}</div>
                                            </div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
                                                <ReactMarkdown>{analysis.content}</ReactMarkdown>
                                            </div>
                                            <button 
                                                onClick={() => { if(confirm("Удалить анализ?")) deleteMentorAnalysis(analysis.id); }}
                                                className="mt-3 text-[10px] text-red-400 hover:text-red-500 flex items-center gap-1"
                                            >
                                                <Trash2 size={10} /> Удалить
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                     </>
                 )}
             </AnimatePresence>
        </div>
    );
};

export default Journal;
