
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { JournalEntry, MentorAnalysis, Task, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import { Tooltip } from './Tooltip';
import { 
    Book, PenTool, Search, Plus, Trash2, X, Zap, 
    Calendar, History, Sparkles, Send, Layout, Palette, 
    Image as ImageIcon, RotateCcw, RotateCw, Bold, Italic, Eraser, 
    Link, Target, Loader2, RefreshCw, Shuffle, ArrowRight, Upload,
    Check, ChevronDown, Filter, Edit3, User
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

// --- CONSTANTS ---
const UNSPLASH_PRESETS = [
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
];

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

const actionButtonStyle = "p-2 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors";

// --- UTILS ---
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

const allowDataUrls = (url: string) => url;

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-800 dark:text-slate-200" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
};

// --- LOCAL COMPONENTS ---

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
                left: Math.min(rect.left, window.innerWidth - 340),
                zIndex: 9999,
            });
        }
    }, [triggerRef]);

    const searchUnsplash = async (q?: string) => {
        // Mock search for demo without API key
        setLoading(true);
        setTimeout(() => {
            setResults(UNSPLASH_PRESETS); // In real app, fetch from Unsplash
            setLoading(false);
        }, 500);
    };

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div className="fixed bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[9999] w-80 flex flex-col gap-3" style={pickerStyle}>
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Обложка</span><button onClick={onClose}><X size={14} /></button></div>
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Поиск..." 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchUnsplash(query)}
                        className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                    />
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar-light">
                    {loading ? <div className="col-span-3 py-4 text-center"><RefreshCw size={16} className="animate-spin mx-auto text-slate-400"/></div> : results.map((url, i) => (
                        <button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-video rounded overflow-hidden border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500 relative bg-slate-100">
                            <img src={url} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => searchUnsplash()} className="flex-1 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 rounded text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2"><Shuffle size={12}/> Случайные</button>
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
            <div className="fixed bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-[9999]" style={style}>
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
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSphere = (id: string) => {
        onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="truncate">{selected.length > 0 ? selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ') : 'Выбрать сферы...'}</span>
                <ChevronDown size={14} className="text-slate-400" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5">
                    {SPHERES.map(s => {
                        const isSelected = selected.includes(s.id);
                        const Icon = ICON_MAP[s.icon];
                        return (
                            <button key={s.id} onClick={() => toggleSphere(s.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
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

const TaskSelect: React.FC<{ tasks: Task[], selectedId?: string, onSelect: (id?: string) => void }> = ({ tasks, selectedId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedTask = tasks.find(t => t.id === selectedId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <span className="truncate">{selectedTask ? selectedTask.title || 'Задача без названия' : 'Привязать к задаче...'}</span>
                <ChevronDown size={14} className="text-slate-400" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5 max-h-48 overflow-y-auto custom-scrollbar-ghost">
                    <button onClick={() => { onSelect(undefined); setIsOpen(false); }} className="px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 w-full text-left">Не привязывать</button>
                    {tasks.map(t => (
                        <button key={t.id} onClick={() => { onSelect(t.id); setIsOpen(false); }} className={`px-3 py-2 rounded-lg text-xs font-medium w-full text-left truncate ${selectedId === t.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            {t.title || 'Задача без названия'}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const Journal: React.FC<Props> = ({ 
    entries, mentorAnalyses, tasks, config, 
    addEntry, deleteEntry, updateEntry, 
    addMentorAnalysis, deleteMentorAnalysis,
    initialTaskId, onClearInitialTask, onNavigateToTask
}) => {
    // State for Creation
    const [isCreationExpanded, setIsCreationExpanded] = useState(false);
    const [creationTitle, setCreationTitle] = useState('');
    const [creationCover, setCreationCover] = useState<string | null>(null);
    const [creationColor, setCreationColor] = useState('white');
    const [linkedTaskId, setLinkedTaskId] = useState<string | undefined>(initialTaskId || undefined);
    const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
    const [creationHistory, setCreationHistory] = useState<string[]>(['']);
    const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
    const creationContentEditableRef = useRef<HTMLDivElement>(null);
    const creationRef = useRef<HTMLDivElement>(null);
    const creationFileInputRef = useRef<HTMLInputElement>(null);
    const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
    const lastSelectionRange = useRef<Range | null>(null);
    
    // Pickers State
    const [showCreationCoverPicker, setShowCreationCoverPicker] = useState(false);
    const [showCreationColorPicker, setShowCreationColorPicker] = useState(false);
    const creationPickerTriggerRef = useRef<HTMLButtonElement>(null);
    const creationColorTriggerRef = useRef<HTMLButtonElement>(null);

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    const availableTasks = tasks.filter(t => !t.isArchived && t.column !== 'done');
    const hasMentorTool = config.aiTools.some(t => t.id === 'journal_mentor' && !t.isDisabled);

    // Initial Task Handling
    useEffect(() => {
        if (initialTaskId) {
            setLinkedTaskId(initialTaskId);
            setIsCreationExpanded(true);
            onClearInitialTask?.();
        }
    }, [initialTaskId, onClearInitialTask]);

    // Outside click for creation
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (creationRef.current && !creationRef.current.contains(target)) {
                // Only collapse if empty
                if (!creationTitle && (!creationContentEditableRef.current || !creationContentEditableRef.current.innerText.trim()) && !creationCover) {
                    setIsCreationExpanded(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [creationTitle, creationCover]);

    // Rich Text Helpers
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && creationContentEditableRef.current && creationContentEditableRef.current.contains(sel.anchorNode)) {
            lastSelectionRange.current = sel.getRangeAt(0).cloneRange();
        }
    };

    const saveHistorySnapshot = useCallback((content: string) => {
        if (content === creationHistory[creationHistoryIndex]) return;
        const newHistory = creationHistory.slice(0, creationHistoryIndex + 1);
        newHistory.push(content);
        if (newHistory.length > 20) newHistory.shift();
        setCreationHistory(newHistory);
        setCreationHistoryIndex(newHistory.length - 1);
    }, [creationHistory, creationHistoryIndex]);

    const handleCreationInput = () => {
        if (creationContentEditableRef.current) {
            saveHistorySnapshot(creationContentEditableRef.current.innerHTML);
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
            if(creationContentEditableRef.current) saveHistorySnapshot(creationContentEditableRef.current.innerHTML);
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
        saveHistorySnapshot(creationContentEditableRef.current.innerHTML);
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

    const execCreationCmd = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        if (creationContentEditableRef.current) {
            creationContentEditableRef.current.focus();
            saveHistorySnapshot(creationContentEditableRef.current.innerHTML);
        }
    };

    const handleClearCreationStyle = (e: React.MouseEvent) => {
        e.preventDefault();
        execCreationCmd('removeFormat');
        execCreationCmd('formatBlock', 'div');
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

    const handlePost = () => {
        const rawHtml = creationContentEditableRef.current?.innerHTML || '';
        const mdContent = htmlToMarkdown(rawHtml);
        
        if (!creationTitle.trim() && !mdContent.trim()) return;

        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: Date.now(),
            title: creationTitle.trim() ? applyTypography(creationTitle.trim()) : undefined,
            content: mdContent,
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
        if (entries.length === 0) return;
        setIsAnalyzing(true);
        try {
            const analysisText = await analyzeJournalPath(entries, config);
            const analysis: MentorAnalysis = {
                id: Date.now().toString(),
                date: Date.now(),
                content: analysisText,
                mentorName: "AI Mentor"
            };
            addMentorAnalysis(analysis);
            setShowHistory(true); // Switch to history view to see result
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const displayedEntries = entries
        .filter(e => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (e.title?.toLowerCase().includes(q) || e.content.toLowerCase().includes(q));
        })
        .sort((a, b) => b.date - a.date);

    const hasCreationContent = (creationContentEditableRef.current?.innerText.trim().length || 0) > 0 || !!creationCover;

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
             
             {/* Header Section */}
             <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 shrink-0 z-20">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроники пути</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative group">
                            <input 
                                type="text" 
                                placeholder="Поиск..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none w-32 focus:w-48 transition-all"
                            />
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar-light relative z-10 pb-20">
                
                {/* Creation Area */}
                <div className="px-4 md:px-8 mb-8" ref={creationRef}>
                    <div className="max-w-3xl mx-auto w-full">
                        <div className={`flex gap-2 ${!isCreationExpanded ? 'items-center' : 'items-start'}`}>
                            <div className="flex-1 min-w-0">
                                {!isCreationExpanded ? (
                                    <div 
                                        onClick={() => { setIsCreationExpanded(true); setTimeout(() => creationContentEditableRef.current?.focus(), 100); }}
                                        className="bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm p-4 cursor-text flex items-center justify-between group hover:shadow-md transition-all h-[52px]"
                                    >
                                        <span className="text-slate-400 dark:text-slate-500 font-serif italic text-base pl-2">Записать мысль...</span>
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 group-hover:text-indigo-500 transition-colors">
                                            <PenTool size={18} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`${getJournalColorClass(creationColor)} backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-white/5 shadow-lg p-5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200 relative`}>
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

                {/* Timeline */}
                <div className="px-4 md:px-8">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {displayedEntries.map(entry => {
                            const task = entry.linkedTaskId ? tasks.find(t => t.id === entry.linkedTaskId) : null;
                            const spheres = entry.spheres || [];
                            
                            return (
                                <motion.div 
                                    key={entry.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative pl-8 border-l border-slate-200 dark:border-slate-800 group"
                                >
                                    <div className="absolute left-0 top-0 -translate-x-[5px] w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 group-hover:scale-125 transition-all" />
                                    
                                    <div className="mb-2 flex items-center gap-3">
                                        <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
                                            {new Date(entry.date).toLocaleDateString()}
                                        </div>
                                        {entry.isInsight && <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500 flex items-center gap-1"><Zap size={10} className="fill-current"/> Insight</span>}
                                    </div>

                                    <div className={`${getJournalColorClass(entry.color)} p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow`}>
                                        {entry.coverUrl && (
                                            <div className="mb-4 -mt-6 -mx-6 rounded-t-2xl overflow-hidden h-40 relative">
                                                <img src={entry.coverUrl} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        
                                        {entry.title && <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 font-sans">{entry.title}</h3>}
                                        
                                        <div className="text-slate-700 dark:text-slate-300 font-serif leading-relaxed text-sm md:text-base">
                                            <ReactMarkdown 
                                                components={markdownComponents} 
                                                urlTransform={allowDataUrls} 
                                                remarkPlugins={[remarkGfm]} 
                                                rehypePlugins={[rehypeRaw]}
                                            >
                                                {entry.content.replace(/\n/g, '  \n')}
                                            </ReactMarkdown>
                                        </div>

                                        {(task || spheres.length > 0) && (
                                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-3">
                                                {task && (
                                                    <div 
                                                        onClick={() => onNavigateToTask && onNavigateToTask(task.id)}
                                                        className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-500 cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg"
                                                    >
                                                        <Link size={12} />
                                                        <span className="truncate max-w-[150px]">{task.title || 'Задача'}</span>
                                                    </div>
                                                )}
                                                {spheres.map(sid => {
                                                    const s = SPHERES.find(x => x.id === sid);
                                                    if(!s) return null;
                                                    return (
                                                        <div key={sid} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
                                                            <span className={`w-1.5 h-1.5 rounded-full bg-${s.color}-500`}></span>
                                                            {s.label}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <Tooltip content="В архив"><button onClick={() => deleteEntry(entry.id)} className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-lg text-slate-400 hover:text-red-500 shadow-sm"><Trash2 size={16} /></button></Tooltip>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        {displayedEntries.length === 0 && (
                            <div className="text-center py-20 opacity-50">
                                <Book size={48} className="mx-auto mb-4 text-slate-300" strokeWidth={1} />
                                <p className="text-slate-400 font-serif italic">Пусто...</p>
                            </div>
                        )}
                    </div>
                </div>
             </div>

             {/* History Modal */}
             <AnimatePresence>
                 {showHistory && (
                     <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
                         <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                            onClick={e => e.stopPropagation()}
                         >
                             <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                     <User size={20} className="text-indigo-500" /> Архивы Наставника
                                 </h3>
                                 <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20} /></button>
                             </div>
                             <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar-light">
                                 {mentorAnalyses.length === 0 ? (
                                     <div className="text-center text-slate-400 py-10">Нет записей анализа</div>
                                 ) : (
                                     mentorAnalyses.sort((a,b) => b.date - a.date).map(analysis => (
                                         <div key={analysis.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 relative group">
                                             <div className="flex justify-between items-center mb-4">
                                                 <div className="text-xs font-mono text-slate-400 font-bold uppercase">{new Date(analysis.date).toLocaleDateString()}</div>
                                                 <div className="text-xs font-bold text-indigo-500">{analysis.mentorName}</div>
                                             </div>
                                             <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                                 <ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown>
                                             </div>
                                             <button onClick={() => deleteMentorAnalysis(analysis.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
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
