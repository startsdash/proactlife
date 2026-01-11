
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'framer-motion';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { 
    Book, PenTool, X, Link, Target, RotateCcw, RotateCw, Bold, Italic, Eraser, 
    Image as ImageIcon, Layout, Palette, Send, Sparkles, History, Loader2, 
    Trash2, Edit3, MoreHorizontal, Check, Search, Calendar, ChevronRight,
    ArrowRight, MessageCircle, Bot, Upload, Shuffle, RefreshCw
} from 'lucide-react';

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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-sm text-slate-700 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-sm text-slate-700 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-base mt-2 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
};

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

// --- Cover Picker Component ---
const CoverPicker: React.FC<{ 
    onSelect: (url: string) => void, 
    onClose: () => void, 
    triggerRef: React.RefObject<HTMLElement> 
}> = ({ onSelect, onClose, triggerRef }) => {
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
        const keys = ['UNSPLASH_ACCESS_KEY', 'VITE_UNSPLASH_ACCESS_KEY', 'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY', 'REACT_APP_UNSPLASH_ACCESS_KEY'];
        for (const k of keys) {
            // @ts-ignore
            if (typeof process !== 'undefined' && process.env?.[k]) return process.env[k];
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env?.[k]) return import.meta.env[k];
        }
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
            console.error("Unsplash Fetch Error", e);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') searchUnsplash(query);
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
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Обложка</span><button onClick={onClose}><X size={14} /></button></div>
                
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Поиск Unsplash..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-sans outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                    />
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <button 
                        onClick={() => searchUnsplash(query)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                        title="Найти"
                    >
                        <ArrowRight size={12} />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar-light min-h-[60px]">
                    {loading ? (
                        <div className="col-span-3 flex items-center justify-center py-4 text-slate-400">
                            <RefreshCw size={16} className="animate-spin" />
                        </div>
                    ) : (
                        results.map((url, i) => (
                            <button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-video rounded overflow-hidden border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500 relative group bg-slate-100">
                                <img src={url} className="w-full h-full object-cover" loading="lazy" />
                            </button>
                        ))
                    )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <label className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-xs font-medium font-sans cursor-pointer transition-colors text-slate-600 dark:text-slate-300">
                        <Upload size={12} /> Своя 
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    </label>
                    <button onClick={() => searchUnsplash()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-xs font-medium font-sans transition-colors text-slate-600 dark:text-slate-300">
                        <Shuffle size={12} /> Случайные
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
};

const ColorPickerPopover: React.FC<{ 
    onSelect: (colorId: string) => void, 
    onClose: () => void, 
    triggerRef: React.RefObject<HTMLElement>
}> = ({ onSelect, onClose, triggerRef }) => {
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setStyle({
                position: 'fixed',
                top: rect.bottom + 8,
                left: rect.left,
                zIndex: 9999
            });
        }
    }, [triggerRef]);

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div 
                className="fixed bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-[9999]" 
                style={style}
                onMouseDown={e => e.stopPropagation()}
            >
                {colors.map(c => (
                    <button 
                        key={c.id} 
                        onMouseDown={(e) => { e.preventDefault(); onSelect(c.id); onClose(); }} 
                        className={`w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform`} 
                        style={{ backgroundColor: c.hex }} 
                        title={c.id} 
                    />
                ))}
            </div>
        </>,
        document.body
    );
};

const TaskSelect: React.FC<{ tasks: Task[], selectedId: string | null, onSelect: (id: string | null) => void }> = ({ tasks, selectedId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedTask = tasks.find(t => t.id === selectedId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
                <span className={`truncate ${!selectedTask ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {selectedTask ? selectedTask.title || 'Задача без названия' : 'Выбрать задачу...'}
                </span>
                <ChevronRight size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    <button onClick={() => { onSelect(null); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-xs text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        Без привязки
                    </button>
                    {tasks.map(task => (
                        <button 
                            key={task.id} 
                            onClick={() => { onSelect(task.id); setIsOpen(false); }} 
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border-t border-slate-100 dark:border-slate-700/50 transition-colors truncate"
                        >
                            {task.title || 'Задача без названия'}
                        </button>
                    ))}
                </div>
            )}
        </div>
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
                className="w-full text-left px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selected.length > 0 ? (
                        <>
                            <div className="flex -space-x-1 shrink-0">
                                {selected.map(s => {
                                    const sp = SPHERES.find(x => x.id === s);
                                    return sp ? <div key={s} className={`w-2 h-2 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`}></div> : null;
                                })}
                            </div>
                            <span className="truncate text-slate-800 dark:text-slate-200">
                                {selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ')}
                            </span>
                        </>
                    ) : (
                        <span className="text-slate-400">Выбрать сферы...</span>
                    )}
                </div>
                <ChevronRight size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
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
                                {Icon && <Icon size={14} className={isSelected ? s.text : 'text-slate-400'} />}
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
    entries, mentorAnalyses, tasks, config, addEntry, deleteEntry, updateEntry, 
    addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask 
}) => {
    const [creationTitle, setCreationTitle] = useState('');
    const [creationColor, setCreationColor] = useState('white');
    const [creationCover, setCreationCover] = useState<string | null>(null);
    const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
    const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
    const [isCreationExpanded, setIsCreationExpanded] = useState(false);
    
    // Editors State
    const creationContentEditableRef = useRef<HTMLDivElement>(null);
    const creationFileInputRef = useRef<HTMLInputElement>(null);
    const [creationHistory, setCreationHistory] = useState<string[]>(['']);
    const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
    const creationRef = useRef<HTMLDivElement>(null);
    const lastCreationSelection = useRef<Range | null>(null);
    const [activeImage, setActiveImage] = useState<HTMLElement | null>(null);

    // Filter/Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [showHistory, setShowHistory] = useState(false); // Mentor History
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Handlers for Creation Editor
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
            lastCreationSelection.current = sel.getRangeAt(0).cloneRange();
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

    const insertImageAtCursor = (base64: string) => {
        if (creationContentEditableRef.current) {
            creationContentEditableRef.current.focus();
            let range = lastCreationSelection.current;
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
        }
    };

    const handleCreationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedBase64 = await processImage(file);
                insertImageAtCursor(compressedBase64);
            } catch (err) { console.error("Image upload failed", err); }
            e.target.value = '';
        }
    };

    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            if (activeImage && activeImage !== target) activeImage.style.outline = 'none';
            target.style.outline = '3px solid #6366f1'; 
            target.style.borderRadius = '4px';
            setActiveImage(target);
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

    // Initialize from props
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

    // Derived State
    const availableTasks = tasks.filter(t => !t.isArchived);
    const sortedEntries = entries
        .filter(e => !searchQuery || e.content.toLowerCase().includes(searchQuery.toLowerCase()) || (e.title && e.title.toLowerCase().includes(searchQuery.toLowerCase())))
        .sort((a, b) => b.date - a.date);
    
    // Filter out "System" entries (like moods without content) if needed, but for now show all.
    const displayedEntries = sortedEntries;

    const hasCreationContent = creationContentEditableRef.current?.innerText.trim().length || 0 > 0 || !!creationContentEditableRef.current?.querySelector('img');

    const handlePost = () => {
        const rawHtml = creationContentEditableRef.current?.innerHTML || '';
        const mdContent = htmlToMarkdown(rawHtml);
        
        if (!mdContent.trim() && !creationTitle.trim()) return;

        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            title: creationTitle.trim() ? applyTypography(creationTitle.trim()) : undefined,
            content: mdContent,
            linkedTaskId: linkedTaskId || undefined,
            spheres: selectedSpheres.length > 0 ? selectedSpheres : undefined,
            color: creationColor,
            coverUrl: creationCover || undefined,
            isInsight: false
        };

        addEntry(newEntry);
        
        // Reset
        setCreationTitle('');
        setCreationColor('white');
        setCreationCover(null);
        setLinkedTaskId(null);
        setSelectedSpheres([]);
        if(creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = '';
        setCreationHistory(['']);
        setCreationHistoryIndex(0);
        setIsCreationExpanded(false);
    };

    const handleAnalyzePath = async () => {
        if (displayedEntries.length === 0) {
            alert("Недостаточно записей для анализа.");
            return;
        }
        setIsAnalyzing(true);
        try {
            const analysisText = await analyzeJournalPath(displayedEntries, config);
            addMentorAnalysis({
                id: Date.now().toString(),
                date: Date.now(),
                content: analysisText,
                mentorName: 'Наставник'
            });
            setShowHistory(true);
        } catch (error) {
            console.error(error);
            alert("Ошибка анализа.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Popovers
    const [showCreationCoverPicker, setShowCreationCoverPicker] = useState(false);
    const creationPickerTriggerRef = useRef<HTMLButtonElement>(null);
    const [showCreationColorPicker, setShowCreationColorPicker] = useState(false);
    const creationColorTriggerRef = useRef<HTMLButtonElement>(null);

    const hasMentorTool = config.aiTools.some(t => t.id === 'journal_mentor');
    const actionButtonStyle = "p-2 bg-white dark:bg-[#1e293b] text-slate-400 hover:text-indigo-500 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md";

    return (
        <div className="flex h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            {/* BACKGROUND PATTERN */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
                
                {/* HEADER */}
                <div className="shrink-0 w-full px-4 md:px-8 pt-6 pb-4 z-20 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-sans">Хроника пути</p>
                    </div>
                    
                    <div className="relative group">
                        <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-indigo-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-shadow shadow-sm placeholder:text-slate-400 w-40 focus:w-60 transition-all duration-300" 
                        />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>}
                    </div>
                </div>

                <div className="w-full px-4 md:px-8 pt-6 pb-8 relative z-10 overflow-y-auto custom-scrollbar-light flex-1">
                    {/* CREATION BLOCK */}
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

                            <div className="flex gap-2 shrink-0 pt-2">
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

                    {/* JOURNAL FEED */}
                    <div className="max-w-3xl mx-auto w-full space-y-6">
                        {displayedEntries.length === 0 ? (
                            <div className="py-12">
                                <EmptyState 
                                    icon={Book} 
                                    title="Дневник пуст" 
                                    description="Ваши записи и инсайты появятся здесь." 
                                    color="slate"
                                />
                            </div>
                        ) : (
                            displayedEntries.map(entry => {
                                const linkedTask = entry.linkedTaskId ? tasks.find(t => t.id === entry.linkedTaskId) : null;
                                return (
                                    <div key={entry.id} className={`group relative rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all hover:shadow-md ${getJournalColorClass(entry.color)}`}>
                                        {entry.coverUrl && (
                                            <div className="h-40 w-full relative">
                                                <img src={entry.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="p-6">
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                                                            {new Date(entry.date).toLocaleDateString()} • {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                        {entry.mood && (
                                                            <span className="text-lg" title={`Настроение: ${entry.mood}/5`}>
                                                                {['😖','😕','😐','🙂','🤩'][entry.mood - 1]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {entry.title && (
                                                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-sans tracking-tight">
                                                            {entry.title}
                                                        </h3>
                                                    )}
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => updateEntry({...entry, isInsight: !entry.isInsight})} className={`p-2 rounded-lg transition-colors ${entry.isInsight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                        <Sparkles size={16} className={entry.isInsight ? "fill-current" : ""} />
                                                    </button>
                                                    <button onClick={() => { if(confirm('Удалить запись?')) deleteEntry(entry.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="prose prose-sm dark:prose-invert max-w-none font-serif text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
                                                <ReactMarkdown 
                                                    remarkPlugins={[remarkGfm]} 
                                                    rehypePlugins={[rehypeRaw]}
                                                    components={markdownComponents}
                                                >
                                                    {entry.content}
                                                </ReactMarkdown>
                                            </div>

                                            {/* Footer Info */}
                                            {(linkedTask || (entry.spheres && entry.spheres.length > 0)) && (
                                                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                    {linkedTask && (
                                                        <button 
                                                            onClick={() => onNavigateToTask?.(linkedTask.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                                                        >
                                                            <Link size={12} />
                                                            <span className="truncate max-w-[150px]">{linkedTask.title || linkedTask.content}</span>
                                                        </button>
                                                    )}
                                                    {entry.spheres?.map(sid => {
                                                        const s = SPHERES.find(x => x.id === sid);
                                                        return s ? (
                                                            <span key={sid} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>
                                                                <Target size={12} /> {s.label}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* MENTOR HISTORY SIDEBAR (Drawer) */}
            <AnimatePresence>
                {showHistory && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
                            onClick={() => setShowHistory(false)}
                        />
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-[#1e293b] shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-700"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Bot size={20} className="text-indigo-500" /> Наставник
                                </h2>
                                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar-light">
                                {mentorAnalyses.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <History size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">История пуста</p>
                                    </div>
                                ) : (
                                    mentorAnalyses.sort((a,b) => b.date - a.date).map(analysis => (
                                        <div key={analysis.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-700 relative group">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {new Date(analysis.date).toLocaleDateString()}
                                                </span>
                                                <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-serif leading-relaxed">
                                                <ReactMarkdown>{analysis.content}</ReactMarkdown>
                                            </div>
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
