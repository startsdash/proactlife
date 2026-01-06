import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, SketchItem, JournalEntry, Flashcard } from '../types';
import { findNotesByMood, autoTagNote } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { Send, Tag as TagIcon, RotateCcw, RotateCw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Plus, Sparkles, Kanban, Dices, Shuffle, Quote, ArrowRight, PenTool, Orbit, Flame, Waves, Clover, ArrowLeft, Image as ImageIcon, Bold, Italic, List, Code, Underline, Heading1, Heading2, Eraser, Type, Globe, Layout, Upload, RefreshCw, Archive, Clock, Diamond, Tablet, Book, BrainCircuit } from 'lucide-react';
import Sketchpad from './Sketchpad';

interface Props {
  notes: Note[];
  config: AppConfig;
  addNote: (note: Note) => void;
  moveNoteToSandbox: (id: string) => void;
  moveNoteToInbox: (id: string) => void;
  archiveNote: (id: string) => void;
  deleteNote: (id: string) => void;
  reorderNote: (draggedId: string, targetId: string) => void;
  updateNote: (note: Note) => void;
  onAddTask: (task: Task) => void;
  onAddJournalEntry: (entry: JournalEntry) => void;
  onAddFlashcard: (flashcard: Flashcard) => void;
  // Sketchpad Props
  sketchItems: SketchItem[];
  addSketchItem: (item: SketchItem) => void;
  deleteSketchItem: (id: string) => void;
  updateSketchItem: (item: SketchItem) => void;
  defaultTab?: 'inbox' | 'sketchpad' | 'library';
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

const ORACLE_VIBES = [
    { id: 'cosmos', icon: Orbit, label: 'Инсайт', color: 'from-indigo-500 to-purple-600', text: 'text-indigo-100' },
    { id: 'fire', icon: Flame, label: 'Энергия', color: 'from-orange-500 to-red-600', text: 'text-orange-100' },
    { id: 'zen', icon: Waves, label: 'Дзен', color: 'from-emerald-500 to-teal-600', text: 'text-emerald-100' },
    { id: 'luck', icon: Clover, label: 'Случай', color: 'from-slate-700 to-slate-900', text: 'text-slate-200' },
];

const UNSPLASH_PRESETS = [
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80', // Rain
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80', // Gradient
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80', // Dark Abstract
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80', // Nature
];

const NOISE_PATTERN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`;

// --- MASONRY BREAKPOINTS ---
const breakpointColumnsObj = {
  default: 2,
  767: 1 // 1 column for mobile (<= 767px)
};

// --- SYNAPTIC VIEW CONSTANTS ---
interface SynapticNode extends Note {
    x: number;
    y: number;
    vx: number;
    vy: number;
    connections: string[]; // Hypothesis connections (Note IDs)
}

// --- HELPER: ALLOW DATA URIS ---
const allowDataUrls = (url: string) => url;

// --- HELPER: IMAGE COMPRESSION ---
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
                const MAX_WIDTH = 800; // Improved quality
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

// --- HELPER: EXTRACT URL ---
const findFirstUrl = (text: string): string | null => {
    const maskedText = text.replace(/!\[.*?\]\(.*?\)/g, '');
    const match = maskedText.match(/(https?:\/\/[^\s\)]+)/);
    return match ? match[0] : null;
};

// --- COMPONENT: LINK PREVIEW ---
const LinkPreview = React.memo(({ url }: { url: string }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(false);
        fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
            .then(res => res.json())
            .then(json => {
                if (mounted) {
                    if (json.status === 'success') {
                        setData(json.data);
                    } else {
                        setError(true);
                    }
                    setLoading(false);
                }
            })
            .catch(() => {
                if (mounted) {
                    setError(true);
                    setLoading(false);
                }
            });
        return () => { mounted = false; };
    }, [url]);

    if (error || loading) return null;
    if (!data || !data.title) return null;

    return (
        <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={(e) => e.stopPropagation()} 
            className="block mt-4 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800 transition-all rounded-xl overflow-hidden group/link relative no-underline break-inside-avoid border border-black/5 dark:border-white/5 shadow-sm"
        >
            {data.image?.url && (
                <div className="h-32 w-full overflow-hidden relative">
                    <img 
                        src={data.image.url} 
                        alt="Preview" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/link:scale-105 opacity-90 group-hover/link:opacity-100" 
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>
            )}
            <div className="p-3">
                <h4 className="font-sans font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1 mb-1 leading-snug">{data.title}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed font-sans">{data.description}</p>
                <div className="flex items-center gap-2 text-[9px] text-slate-400 uppercase tracking-wider font-bold font-sans">
                    {data.logo?.url ? (
                        <img src={data.logo.url} className="w-3 h-3 rounded-full" alt="" />
                    ) : (
                        <Globe size={10} />
                    )}
                    <span className="truncate">{data.publisher || new URL(url).hostname}</span>
                </div>
            </div>
        </a>
    );
});

// Markdown Styles
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
    a: ({node, ...props}: any) => <a className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:underline cursor-pointer underline-offset-2 break-all relative z-20 transition-colors font-sans" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="font-sans font-bold text-base mt-2 mb-1 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-pink-600 dark:text-pink-400" {...props}>{children}</code>
            : <code className="block bg-slate-900 dark:bg-black text-slate-50 p-3 rounded-xl text-xs font-mono my-3 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    },
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
    u: ({node, ...props}: any) => <u {...props} /> 
};

// Converters
const markdownToHtml = (md: string) => {
    if (!md) return '';
    let html = md;
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__([\s\S]*?)__/g, '<b>$1</b>');
    html = html.replace(/_([\s\S]*?)_/g, '<i>$1</i>');
    html = html.replace(/\*([\s\S]*?)\*/g, '<i>$1</i>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        return `<img src="${src}" alt="${alt}" style="max-height: 300px; border-radius: 8px; margin: 8px 0; display: block; max-width: 100%; cursor: pointer;" />`;
    });
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/(<\/h1>|<\/h2>|<\/p>|<\/div>)<br>/gi, '$1');
    return html;
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
            
            if (el.style.textDecoration && el.style.textDecoration.includes('underline')) return `<u>${content}</u>`;
            if (el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0') >= 700) return wrap(content, '**');
            if (el.style.fontStyle === 'italic') return wrap(content, '*');
            
            switch (tag) {
                case 'b': case 'strong': return wrap(content, '**');
                case 'i': case 'em': return wrap(content, '*');
                case 'u': return content.trim() ? `<u>${content}</u>` : '';
                case 'code': return `\`${content}\``;
                case 'h1': return `\n# ${content}\n`;
                case 'h2': return `\n## ${content}\n`;
                case 'div': case 'p': return `\n${content}\n`;
                case 'br': return '\n';
                case 'img': return `\n![${(el as HTMLImageElement).alt || 'image'}](${(el as HTMLImageElement).src})\n`;
                default: return content;
            }
        }
        return '';
    };
    let md = walk(temp);
    md = md.replace(/\n{3,}/g, '\n\n').trim();
    md = md.replace(/&nbsp;/g, ' ');
    return applyTypography(md);
};

const getNoteColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

// Tag Selector
const TagSelector: React.FC<{ selectedTags: string[], onChange: (tags: string[]) => void, existingTags: string[], placeholder?: string, variant?: 'default' | 'ghost' }> = ({ selectedTags, onChange, existingTags, placeholder = "Добавить теги...", variant = 'default' }) => {
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredSuggestions = existingTags.filter(tag => !selectedTags.some(st => st.toLowerCase() === tag.toLowerCase()) && tag.toLowerCase().includes(input.toLowerCase()));

    const addTag = (tag: string) => {
        const cleanTag = tag.trim().replace(/^#/, '');
        if (!cleanTag) return;
        if (selectedTags.some(t => t.toLowerCase() === cleanTag.toLowerCase())) { setInput(''); setIsOpen(false); return; }
        onChange([...selectedTags, existingTags.find(t => t.toLowerCase() === cleanTag.toLowerCase()) || cleanTag]);
        setInput(''); setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className={`flex flex-wrap items-center gap-3 min-h-[36px] ${variant === 'ghost' ? 'px-0 py-2' : 'p-2'}`}>
                {selectedTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[9px] font-sans uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 group cursor-default">
                        #{tag.replace(/^#/, '')} 
                        <button onClick={() => onChange(selectedTags.filter(t => t !== tag))} className="text-slate-300 hover:text-red-500 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={10} strokeWidth={2} />
                        </button>
                    </span>
                ))}
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => { setInput(e.target.value); setIsOpen(true); }} 
                    onFocus={() => setIsOpen(true)} 
                    onKeyDown={(e) => e.key === 'Enter' && addTag(input)} 
                    placeholder={selectedTags.length === 0 ? placeholder : ''} 
                    className={`flex-1 min-w-[80px] bg-transparent text-xs font-sans outline-none ${variant === 'ghost' ? 'text-slate-600 dark:text-slate-300 placeholder:text-slate-300' : 'text-slate-600 dark:text-slate-300 placeholder:text-slate-400'}`} 
                />
            </div>
            {isOpen && (input.length > 0 || filteredSuggestions.length > 0) && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                    {input.length > 0 && !filteredSuggestions.some(t => t.toLowerCase() === input.trim().toLowerCase()) && (
                        <button onClick={() => addTag(input)} className="w-full text-left px-3 py-2 text-xs font-sans text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-bold"><Plus size={12} /> Создать «{input}»</button>
                    )}
                    {filteredSuggestions.map(tag => (
                        <button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-3 py-2 text-xs font-sans text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 font-medium"><TagIcon size={12} className="text-slate-400" /> {tag}</button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Cover Picker
const CoverPicker: React.FC<{ onSelect: (url: string) => void, onClose: () => void }> = ({ onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<string[]>(UNSPLASH_PRESETS);
    const [loading, setLoading] = useState(false);
    
    // Robust Env Getter for the API Key inside the component or file scope
    const getUnsplashKey = () => {
        // Try various prefixes just in case, prioritizing the direct one as per screenshot
        const keys = [
            'UNSPLASH_ACCESS_KEY', 
            'VITE_UNSPLASH_ACCESS_KEY', 
            'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY', 
            'REACT_APP_UNSPLASH_ACCESS_KEY'
        ];
        
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
            if (q) alert("Ключ Unsplash не найден. Используйте встроенные пресеты или добавьте UNSPLASH_ACCESS_KEY.");
            return;
        }
        
        setLoading(true);
        try {
            // Random page for variety on re-search
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

    return (
        <div className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 w-80 flex flex-col gap-3" onMouseDown={e => e.stopPropagation()}>
            <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Обложка</span><button onClick={onClose}><X size={14} /></button></div>
            
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Поиск Unsplash..." 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-sans outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
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
                        <button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-video rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500 relative group bg-slate-100">
                            <img src={url} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                    ))
                )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-xs font-medium font-sans cursor-pointer transition-colors text-slate-600 dark:text-slate-300">
                    <Upload size={12} /> Своя 
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
                <button onClick={() => searchUnsplash()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-xs font-medium font-sans transition-colors text-slate-600 dark:text-slate-300">
                    <Shuffle size={12} /> Случайные
                </button>
            </div>
        </div>
    );
};

interface NoteCardProps {
    note: Note;
    isArchived: boolean;
    handlers: {
        handleDragStart: (e: React.DragEvent, id: string) => void;
        handleDragOver: (e: React.DragEvent) => void;
        handleDrop: (e: React.DragEvent, id: string) => void;
        handleOpenNote: (note: Note) => void;
        togglePin: (e: React.MouseEvent, note: Note) => void;
        onAddTask: (task: Task) => void;
        moveNoteToSandbox: (id: string) => void;
        archiveNote: (id: string) => void;
        moveNoteToInbox: (id: string) => void;
        onAddJournalEntry: (entry: JournalEntry) => void;
        addSketchItem: (item: SketchItem) => void;
    }
}

const NoteCard: React.FC<NoteCardProps> = ({ note, isArchived, handlers }) => {
    const [isExiting, setIsExiting] = useState(false);
    const linkUrl = findFirstUrl(note.content);

    const handleArchive = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Переместить в библиотеку?')) {
            setIsExiting(true);
            setTimeout(() => {
                handlers.archiveNote(note.id);
            }, 400); // Wait for animation
        }
    };

    const handleToJournal = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(window.confirm('В дневник?')) {
            const entry: JournalEntry = {
                id: Date.now().toString(),
                date: Date.now(),
                content: note.content,
                isInsight: false
            };
            handlers.onAddJournalEntry(entry);
        }
    };

    const handleToSketchpad = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(window.confirm('В скетчпад?')) {
             const item: SketchItem = {
                id: Date.now().toString(),
                type: 'text',
                content: note.content,
                createdAt: Date.now(),
                rotation: 0,
                widthClass: 'col-span-1 row-span-1'
            };
            handlers.addSketchItem(item);
        }
    };

    return (
        <div 
            draggable
            onDragStart={(e) => handlers.handleDragStart(e, note.id)}
            onDragOver={handlers.handleDragOver}
            onDrop={(e) => handlers.handleDrop(e, note.id)}
            onClick={() => handlers.handleOpenNote(note)}
            className={`${getNoteColorClass(note.color)} rounded-3xl transition-all duration-500 hover:-translate-y-[4px] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] group/card flex flex-col cursor-default relative break-inside-avoid ${isArchived && !note.isPinned ? 'opacity-90' : ''} overflow-hidden mb-6 ${isExiting ? 'opacity-0 translate-x-full scale-90' : ''}`}
        >
            {/* NOISE TEXTURE */}
            <div style={{ backgroundImage: NOISE_PATTERN }} className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-50 z-0"></div>

            {note.coverUrl && (
                <div className="h-40 w-full shrink-0 relative z-10"><img src={note.coverUrl} alt="Cover" className="w-full h-full object-cover" /></div>
            )}

            {/* PIN BUTTON - Top Right (Ghost Style) */}
            <div className="absolute top-4 right-4 z-20">
                <Tooltip content={note.isPinned ? "Открепить" : "Закрепить"}>
                    <button 
                        onClick={(e) => handlers.togglePin(e, note)} 
                        className={`p-2 rounded-full transition-all duration-300 ${
                            note.isPinned 
                            ? 'text-[#B0A0FF] opacity-50 hover:opacity-100 bg-transparent' 
                            : 'text-slate-400 dark:text-slate-500 opacity-0 group-hover/card:opacity-100 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent'
                        }`}
                    >
                        <Pin size={16} strokeWidth={1.5} className={note.isPinned ? "fill-current" : ""} />
                    </button>
                </Tooltip>
            </div>

            <div className="p-8 pb-16 w-full flex-1 relative z-10">
                <div className="block w-full mb-2">
                    {note.title && <h3 className={`font-sans text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4 leading-tight break-words ${isArchived ? 'tracking-wide' : 'tracking-tight'}`}>{note.title}</h3>}
                    <div className={`text-slate-700 dark:text-slate-300 font-serif text-sm leading-relaxed overflow-hidden break-words line-clamp-[6]`}>
                        <ReactMarkdown components={markdownComponents} urlTransform={allowDataUrls} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{note.content.replace(/\n/g, '  \n')}</ReactMarkdown>
                    </div>
                    {linkUrl && <LinkPreview url={linkUrl} />}
                    {/* AIR TAGS */}
                    {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-6">
                            {note.tags.map(tag => (
                                <span key={tag} className="text-[9px] text-slate-500/80 dark:text-slate-400/80 font-sans uppercase tracking-[0.15em] hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer">
                                    #{tag.replace(/^#/, '')}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {/* MINIMAL CONTROLS */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-white/90 via-white/60 to-transparent dark:from-slate-900/90 dark:via-slate-900/60 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-20 flex justify-between items-end">
                <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                    {!isArchived ? (
                        <>
                            <Tooltip content="В хаб"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В хаб?')) handlers.moveNoteToSandbox(note.id); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Box size={16} strokeWidth={1.5} /></button></Tooltip>
                            
                            <Tooltip content="В спринты"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В спринты?')) { handlers.onAddTask({ id: Date.now().toString(), title: note.title, content: note.content, column: 'todo', createdAt: Date.now() }); } }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Kanban size={16} strokeWidth={1.5} /></button></Tooltip>
                            
                            <Tooltip content="В дневник"><button onClick={handleToJournal} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Book size={16} strokeWidth={1.5} /></button></Tooltip>
                            
                            <Tooltip content="В скетчпад"><button onClick={handleToSketchpad} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Tablet size={16} strokeWidth={1.5} /></button></Tooltip>

                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            <Tooltip content="Переместить в библиотеку">
                                <button onClick={handleArchive} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Library size={16} strokeWidth={1.5} /></button>
                            </Tooltip>
                        </>
                    ) : (
                        <Tooltip content="Вернуть во входящие">
                            <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Вернуть во входящие?')) { handlers.moveNoteToInbox(note.id); } }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><RotateCcw size={16} strokeWidth={1.5} /></button>
                        </Tooltip>
                    )}
                </div>
                
                {/* ID Display */}
                <div className="p-2 font-mono text-[8px] text-slate-900 dark:text-white select-none opacity-30 tracking-widest">
                    ID // {note.id.slice(-5).toLowerCase()}
                </div>
            </div>
        </div>
    );
};

// --- SYNAPTIC VIEW COMPONENT ---
const SynapticWeb: React.FC<{ 
    notes: Note[], 
    onOpenNote: (note: Note) => void, 
    onConnect: (sourceId: string, targetId: string) => void 
}> = ({ notes, onOpenNote, onConnect }) => {
    const [simTick, setSimTick] = useState(0);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const nodesRef = useRef<SynapticNode[]>([]);
    
    // Initialize Simulation
    useEffect(() => {
        // Reuse positions if available, otherwise random
        const currentMap = new Map<string, SynapticNode>(
            nodesRef.current.map(n => [n.id, n] as [string, SynapticNode])
        );
        
        nodesRef.current = notes.map(note => {
            const existing = currentMap.get(note.id);
            // Simple Hypothesis: Link if share ANY tag
            const connections: string[] = [];
            if (note.tags && note.tags.length > 0) {
                notes.forEach(other => {
                    if (other.id !== note.id && other.tags?.some(t => note.tags.includes(t))) {
                        connections.push(other.id);
                    }
                });
            }

            return {
                ...note,
                x: existing ? existing.x : Math.random() * 800,
                y: existing ? existing.y : Math.random() * 600,
                vx: existing ? existing.vx : 0,
                vy: existing ? existing.vy : 0,
                connections // Hypothesis links
            };
        });
    }, [notes]);

    // Physics Loop (Liquid Damping)
    useEffect(() => {
        let frameId: number;
        const tick = () => {
            const nodes = nodesRef.current;
            const width = containerRef.current?.clientWidth || 800;
            const height = containerRef.current?.clientHeight || 600;
            const centerX = width / 2;
            const centerY = height / 2;

            nodes.forEach((node, i) => {
                if (node.id === hoveredNode) return;

                // 1. Center Gravity (Keep in view)
                node.vx += (centerX - node.x) * 0.0005;
                node.vy += (centerY - node.y) * 0.0005;

                // 2. Repulsion (Space out)
                nodes.forEach((other, j) => {
                    if (i !== j) {
                        const dx = node.x - other.x;
                        const dy = node.y - other.y;
                        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                        // Consolidate Logic: If linked (solidified), weaker repulsion (closer)
                        const isLinked = node.linkedNoteIds?.includes(other.id) || other.linkedNoteIds?.includes(node.id);
                        const minDist = isLinked ? 100 : 180;
                        
                        if (dist < minDist) {
                            const force = (minDist - dist) * 0.05;
                            node.vx += (dx / dist) * force;
                            node.vy += (dy / dist) * force;
                        }
                    }
                });

                // 3. Damping
                node.vx *= 0.9;
                node.vy *= 0.9;

                node.x += node.vx;
                node.y += node.vy;
            });
            setSimTick(t => t + 1);
            frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [hoveredNode]);

    // Render Lines
    const lines = useMemo(() => {
        const rendered = new Set<string>();
        const elements: React.ReactElement[] = [];

        nodesRef.current.forEach(node => {
            // Render solidified links (Permanent)
            node.linkedNoteIds?.forEach(targetId => {
                const key = [node.id, targetId].sort().join('-');
                if (rendered.has(key)) return;
                const target = nodesRef.current.find(n => n.id === targetId);
                if (target) {
                    rendered.add(key);
                    elements.push(
                        <line 
                            key={key} 
                            x1={node.x} y1={node.y} x2={target.x} y2={target.y} 
                            stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.6"
                        />
                    );
                }
            });

            // Render Hypothesis links (Transient)
            node.connections.forEach(targetId => {
                // Don't duplicate solidified links
                if (node.linkedNoteIds?.includes(targetId)) return;
                
                const key = `hypo-${[node.id, targetId].sort().join('-')}`;
                if (rendered.has(key)) return;
                const target = nodesRef.current.find(n => n.id === targetId);
                if (target) {
                    rendered.add(key);
                    // Midpoint for interaction
                    const midX = (node.x + target.x) / 2;
                    const midY = (node.y + target.y) / 2;
                    
                    elements.push(
                        <g key={key}>
                            <line 
                                x1={node.x} y1={node.y} x2={target.x} y2={target.y} 
                                stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3 3" strokeOpacity="0.4"
                                className="animate-pulse"
                            />
                            {/* Insight Anchor */}
                            <foreignObject x={midX - 10} y={midY - 10} width={20} height={20}>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onConnect(node.id, targetId); }}
                                    className="w-5 h-5 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-500 hover:scale-110 transition-all shadow-sm"
                                    title="Found Insight?"
                                >
                                    <Sparkles size={10} />
                                </button>
                            </foreignObject>
                        </g>
                    );
                }
            });
        });
        return elements;
    }, [simTick]);

    return (
        <div className="w-full h-full relative overflow-hidden bg-[#f0f4f8] dark:bg-[#050b14]" ref={containerRef}>
            {/* Graph Paper Grid */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10"
                style={{ 
                    backgroundImage: `linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                }} 
            />
            
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {lines}
            </svg>

            {nodesRef.current.map(node => (
                <div
                    key={node.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                    style={{ left: node.x, top: node.y }}
                    onClick={() => onOpenNote(node)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                >
                    {/* Node Visual */}
                    <div className={`w-4 h-4 rounded-full border-2 bg-[#f0f4f8] dark:bg-[#050b14] transition-all duration-300 ${hoveredNode === node.id ? 'border-indigo-500 scale-125 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-400 dark:border-slate-600'}`} />
                    
                    {/* Label (Only on Hover) */}
                    <AnimatePresence>
                        {hoveredNode === node.id && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 min-w-[150px] pointer-events-none"
                            >
                                <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">ID_{node.id.slice(-4)}</div>
                                <div className="text-xs font-serif text-slate-800 dark:text-slate-200 line-clamp-2">{node.title || node.content}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
};

const Napkins: React.FC<Props> = ({ notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, archiveNote, deleteNote, reorderNote, updateNote, onAddTask, onAddJournalEntry, onAddFlashcard, sketchItems, addSketchItem, deleteSketchItem, updateSketchItem, defaultTab }) => {
  const [title, setTitle] = useState('');
  const [creationTags, setCreationTags] = useState<string[]>([]);
  const [creationColor, setCreationColor] = useState('white');
  const [creationCover, setCreationCover] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sketchpad' | 'library'>(defaultTab || 'inbox');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showModalColorPicker, setShowModalColorPicker] = useState(false); 
  const [showCreationCoverPicker, setShowCreationCoverPicker] = useState(false);
  const [showEditCoverPicker, setShowEditCoverPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
  const lastSelectionRange = useRef<Range | null>(null);
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editHistory, setEditHistory] = useState<string[]>(['']);
  const [editHistoryIndex, setEditHistoryIndex] = useState(0);
  const editHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeColorFilter, setActiveColorFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [showMoodInput, setShowMoodInput] = useState(false);
  const [moodQuery, setMoodQuery] = useState('');
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  const [isMoodAnalyzing, setIsMoodAnalyzing] = useState(false);
  const [showOracle, setShowOracle] = useState(false);
  const [oracleState, setOracleState] = useState<'select' | 'thinking' | 'result'>('select');
  const [oracleVibe, setOracleVibe] = useState(ORACLE_VIBES[0]);
  const [oracleNote, setOracleNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editTagsList, setEditTagsList] = useState<string[]>([]);
  const [editCover, setEditCover] = useState<string | null>(null);
  const editContentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollContainerRef });
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  
  // NEW: Synaptic Web State
  const [isSynapticMode, setIsSynapticMode] = useState(false);

  useEffect(() => {
      if(defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  useMotionValueEvent(scrollY, "change", (latest) => {
      const previous = scrollY.getPrevious() || 0;
      const diff = latest - previous;
      const isScrollingDown = diff > 0;
      if (latest > 100 && isScrollingDown) setIsHeaderHidden(true);
      else setIsHeaderHidden(false);
  });

  const allExistingTags = useMemo(() => {
      const uniqueTagsMap = new Map<string, string>();
      notes.forEach(note => {
          if (note.tags && Array.isArray(note.tags)) {
              note.tags.forEach(tag => {
                  const clean = tag.replace(/^#/, '');
                  uniqueTagsMap.set(clean.toLowerCase(), clean);
              });
          }
      });
      return Array.from(uniqueTagsMap.values()).sort();
  }, [notes]);

  const hasMoodMatcher = useMemo(() => config.aiTools.some(t => t.id === 'mood_matcher'), [config.aiTools]);
  const hasTagger = useMemo(() => config.aiTools.some(t => t.id === 'tagger'), [config.aiTools]);

  const saveHistorySnapshot = useCallback((content: string) => {
      if (content === history[historyIndex]) return;
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const saveEditHistorySnapshot = useCallback((content: string) => {
      if (content === editHistory[editHistoryIndex]) return;
      const newHistory = editHistory.slice(0, editHistoryIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 50) newHistory.shift();
      setEditHistory(newHistory);
      setEditHistoryIndex(newHistory.length - 1);
  }, [editHistory, editHistoryIndex]);

  const handleEditorInput = () => {
      if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
      historyTimeoutRef.current = setTimeout(() => {
          saveHistorySnapshot(contentEditableRef.current?.innerHTML || '');
      }, 500); 
  };

  const handleEditModalInput = () => {
      if (editHistoryTimeoutRef.current) clearTimeout(editHistoryTimeoutRef.current);
      editHistoryTimeoutRef.current = setTimeout(() => {
          saveEditHistorySnapshot(editContentRef.current?.innerHTML || '');
      }, 500); 
  };

  const execUndo = () => {
      if (historyIndex > 0) {
          const prevIndex = historyIndex - 1;
          setHistoryIndex(prevIndex);
          if (contentEditableRef.current) contentEditableRef.current.innerHTML = history[prevIndex];
      }
  };

  const execRedo = () => {
      if (historyIndex < history.length - 1) {
          const nextIndex = historyIndex + 1;
          setHistoryIndex(nextIndex);
          if (contentEditableRef.current) contentEditableRef.current.innerHTML = history[nextIndex];
      }
  };

  const execEditUndo = () => {
      if (editHistoryIndex > 0) {
          const prevIndex = editHistoryIndex - 1;
          setEditHistoryIndex(prevIndex);
          if (editContentRef.current) editContentRef.current.innerHTML = editHistory[prevIndex];
      }
  };

  const execEditRedo = () => {
      if (editHistoryIndex < editHistory.length - 1) {
          const nextIndex = editHistoryIndex + 1;
          setEditHistoryIndex(nextIndex);
          if (editContentRef.current) editContentRef.current.innerHTML = editHistory[nextIndex];
      }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
            if (isExpanded) {
                const target = event.target as HTMLElement;
                if (target.closest('.color-picker-dropdown')) return;
                if (target.closest('.image-delete-btn')) return;
                setIsExpanded(false);
            }
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  useEffect(() => {
    if (isEditing && editContentRef.current && selectedNote) {
        editContentRef.current.innerHTML = markdownToHtml(selectedNote.content);
        setActiveImage(null);
    }
  }, [isEditing, selectedNote?.id]); 

  const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const container = isEditing ? editContentRef.current : contentEditableRef.current;
          if (container && container.contains(range.commonAncestorContainer)) lastSelectionRange.current = range.cloneRange();
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
          if (isEditing && editContentRef.current) saveEditHistorySnapshot(editContentRef.current.innerHTML);
          else if (contentEditableRef.current) saveHistorySnapshot(contentEditableRef.current.innerHTML);
      }
  };

  const insertImageAtCursor = (base64: string, targetEl: HTMLElement, onSave: (content: string) => void) => {
        targetEl.focus();
        let range = lastSelectionRange.current;
        if (!range || !targetEl.contains(range.commonAncestorContainer)) {
             range = document.createRange();
             range.selectNodeContents(targetEl);
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
        onSave(targetEl.innerHTML); 
  };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
        const target = e.target as HTMLElement;
        if (!target.isContentEditable) return;
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    try {
                        const compressedBase64 = await processImage(blob);
                        if (isEditing && editContentRef.current && target === editContentRef.current) insertImageAtCursor(compressedBase64, editContentRef.current, saveEditHistorySnapshot);
                        else if (contentEditableRef.current && target === contentEditableRef.current) insertImageAtCursor(compressedBase64, contentEditableRef.current, saveHistorySnapshot);
                    } catch (err) { console.error("Image paste failed", err); }
                }
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isEditing]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const compressedBase64 = await processImage(file);
              if (isEditing && editContentRef.current) insertImageAtCursor(compressedBase64, editContentRef.current, saveEditHistorySnapshot);
              else if (contentEditableRef.current) insertImageAtCursor(compressedBase64, contentEditableRef.current, saveHistorySnapshot);
          } catch (err) { console.error("Image upload failed", err); }
          e.target.value = '';
      }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (contentEditableRef.current && isExpanded && !isEditing) {
          contentEditableRef.current.focus();
          saveHistorySnapshot(contentEditableRef.current.innerHTML);
      }
      else if (editContentRef.current && isEditing) {
          editContentRef.current.focus();
          saveEditHistorySnapshot(editContentRef.current.innerHTML);
      }
  };

  const handleClearStyle = (e: React.MouseEvent) => {
      e.preventDefault();
      execCmd('removeFormat');
      execCmd('formatBlock', 'div'); 
  };

  const handleDump = async () => {
    const rawHtml = contentEditableRef.current?.innerHTML || '';
    const textContent = contentEditableRef.current?.innerText.trim() || '';
    const hasImages = contentEditableRef.current?.querySelector('img');

    if (!textContent && !hasImages && !title.trim()) {
        setIsExpanded(false); setHistory(['']); setHistoryIndex(0); return;
    }
    
    setIsProcessing(true);
    const markdownContent = htmlToMarkdown(rawHtml);
    let autoTags: string[] = [];
    if (hasTagger && creationTags.length === 0 && markdownContent.length > 20) {
        autoTags = await autoTagNote(markdownContent, config);
    }
    
    const newNote: Note = {
      id: Date.now().toString(),
      title: title.trim() ? applyTypography(title.trim()) : undefined,
      content: markdownContent,
      tags: [...creationTags, ...autoTags],
      createdAt: Date.now(),
      status: 'inbox',
      color: creationColor,
      coverUrl: creationCover || undefined,
      isPinned: false
    };
    addNote(newNote);
    setTitle(''); setCreationColor('white'); setCreationCover(null);
    if (contentEditableRef.current) contentEditableRef.current.innerHTML = '';
    setHistory(['']); setHistoryIndex(0); setCreationTags([]);
    setIsProcessing(false); setIsExpanded(false);
  };

  const handleMoodSearch = async () => {
      if (!moodQuery.trim()) return;
      setIsMoodAnalyzing(true);
      const relevantList = activeTab === 'inbox' ? notes.filter(n => n.status === 'inbox') : notes.filter(n => n.status === 'archived');
      const matchedIds = await findNotesByMood(relevantList, moodQuery, config);
      setAiFilteredIds(matchedIds);
      setIsMoodAnalyzing(false);
      setShowMoodInput(false);
  };

  const clearMoodFilter = () => { setAiFilteredIds(null); setMoodQuery(''); };

  const startOracle = () => {
      if (notes.length === 0) { alert("Сначала добавь пару мыслей в Заметки"); return; }
      setShowOracle(true); setOracleState('select');
  };

  const castOracleSpell = (vibe: typeof ORACLE_VIBES[0]) => {
      setOracleVibe(vibe); setOracleState('thinking');
      setTimeout(() => {
          const allNotes = notes;
          const random = allNotes[Math.floor(Math.random() * allNotes.length)];
          setOracleNote(random); setOracleState('result');
      }, 1500);
  };

  const closeOracle = () => { setShowOracle(false); setTimeout(() => setOracleState('select'), 300); };

  const handleAcceptOracleResult = () => {
    if (!oracleNote) return;
    
    const newTask: Task = {
        id: Date.now().toString(),
        title: oracleNote.title || 'Инсайт из Оракула',
        content: oracleNote.content,
        column: 'todo',
        createdAt: Date.now(),
        spheres: [],
    };
    onAddTask(newTask);
    closeOracle();
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('noteId', id);
      e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('noteId');
      if (draggedId && draggedId !== targetId) reorderNote(draggedId, targetId);
  };

  const handleOpenNote = (note: Note) => {
      setSelectedNote(note);
      setEditTitle(note.title || '');
      setEditTagsList(note.tags ? note.tags.map(t => t.replace(/^#/, '')) : []);
      setEditCover(note.coverUrl || null);
      const contentHtml = markdownToHtml(note.content);
      setEditHistory([contentHtml]);
      setEditHistoryIndex(0);
      setIsEditing(false);
  };

  const handleSaveEdit = () => {
      if (selectedNote) {
          const rawHtml = editContentRef.current?.innerHTML || '';
          const markdownContent = htmlToMarkdown(rawHtml);
          if (markdownContent.trim() !== '' || editTitle.trim() !== '') {
              const updated = { 
                  ...selectedNote, 
                  title: editTitle.trim() ? applyTypography(editTitle.trim()) : undefined,
                  content: markdownContent, 
                  tags: editTagsList,
                  coverUrl: editCover || undefined 
              };
              updateNote(updated); setSelectedNote(updated); setIsEditing(false);
          }
      }
  };

  const togglePin = (e: React.MouseEvent, note: Note) => {
      e.stopPropagation();
      updateNote({ ...note, isPinned: !note.isPinned });
      if (selectedNote?.id === note.id) setSelectedNote({ ...selectedNote, isPinned: !note.isPinned });
  };

  const setColor = (colorId: string) => {
      if (selectedNote) {
          const updated = { ...selectedNote, color: colorId };
          updateNote(updated); setSelectedNote(updated);
      }
  };

  const handleConnectNotes = (sourceId: string, targetId: string) => {
      // Solidify link logic
      const source = notes.find(n => n.id === sourceId);
      const target = notes.find(n => n.id === targetId);
      if(!source || !target) return;

      if(confirm(`Синтезировать инсайт между "${source.title || source.content.substring(0,20)}" и "${target.title || target.content.substring(0,20)}"?`)) {
          // 1. Update bidirectional links
          updateNote({ ...source, linkedNoteIds: [...(source.linkedNoteIds || []), targetId] });
          updateNote({ ...target, linkedNoteIds: [...(target.linkedNoteIds || []), sourceId] });
          
          // 2. Open creation modal for Flashcard (Insight)
          const synthContent = `## Синтез\n\nИсточник А: ${source.content}\n\nИсточник Б: ${target.content}`;
          onAddFlashcard({
              id: Date.now().toString(),
              front: `Инсайт: ${source.title || 'Note A'} + ${target.title || 'Note B'}`,
              back: synthContent,
              nextReview: Date.now(),
              level: 0
          });
      }
  };

  const filterNotes = (list: Note[]) => {
    return list.filter(note => {
      if (showTagInput && tagQuery) {
          const q = tagQuery.toLowerCase().replace('#', '');
          if (!note.tags || !note.tags.some(t => t.toLowerCase().includes(q))) return false;
      }
      if (!showTagInput && searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch = note.content.toLowerCase().includes(query) || (note.title && note.title.toLowerCase().includes(query)) || (note.tags && note.tags.some(t => t.toLowerCase().includes(query)));
          if (!matchesSearch) return false;
      }
      const matchesColor = activeColorFilter === null || note.color === activeColorFilter;
      const matchesMood = aiFilteredIds === null || aiFilteredIds.includes(note.id);
      return matchesColor && matchesMood;
    });
  };

  const inboxNotes = filterNotes(notes.filter(n => n.status === 'inbox').sort((a, b) => (Number(b.isPinned || 0) - Number(a.isPinned || 0))));
  const archivedNotes = filterNotes(notes.filter(n => n.status === 'archived').sort((a, b) => (Number(b.isPinned || 0) - Number(a.isPinned || 0))));

  const cardHandlers = useMemo(() => ({
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleOpenNote,
      togglePin,
      onAddTask,
      moveNoteToSandbox,
      archiveNote,
      moveNoteToInbox,
      onAddJournalEntry,
      addSketchItem
  }), [handleDragStart, handleDragOver, handleDrop, handleOpenNote, togglePin, onAddTask, moveNoteToSandbox, archiveNote, moveNoteToInbox, onAddJournalEntry, addSketchItem]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
      
      {/* HEADER SECTION (Fixed) */}
      <div className="shrink-0 w-full max-w-5xl mx-auto px-3 md:px-8 pt-3 md:pt-8 mb-4 z-50">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Заметки</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">На скорости мысли</p>
                </div>
                <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl shrink-0 self-start md:self-auto w-full md:w-auto backdrop-blur-sm">
                    <button onClick={() => { setActiveTab('inbox'); clearMoodFilter(); setIsSynapticMode(false); }} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><LayoutGrid size={16} /> Входящие</button>
                    <button onClick={() => { setActiveTab('sketchpad'); clearMoodFilter(); }} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'sketchpad' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><Tablet size={16} /> Скетчпад</button>
                    <button onClick={() => { setActiveTab('library'); clearMoodFilter(); }} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'library' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><Library size={16} /> Библиотека</button>
                </div>
            </header>
      </div>

      <div className="flex-1 min-h-0 relative">
        {activeTab === 'sketchpad' ? (
            <Sketchpad items={sketchItems} addItem={addSketchItem} deleteItem={deleteSketchItem} updateItem={updateSketchItem} />
        ) : (
            isSynapticMode ? (
                // SYNAPTIC WEB VIEW (Only available via toggle in Inbox)
                <div className="h-full relative">
                    <button 
                        onClick={() => setIsSynapticMode(false)}
                        className="absolute top-4 right-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-500"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <SynapticWeb 
                        notes={inboxNotes} // Or all notes? Using inbox for now as per spec "Inbox_Web"
                        onOpenNote={handleOpenNote}
                        onConnect={handleConnectNotes}
                    />
                </div>
            ) : (
            <div 
                ref={scrollContainerRef}
                className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar-light"
                onScroll={() => setActiveImage(null)}
            >
                {/* STICKY SEARCH/FILTER HEADER */}
                <motion.div 
                    className="sticky top-0 z-40 w-full mb-[-20px]"
                    animate={{ y: isHeaderHidden ? '-100%' : '0%' }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    {/* Extended Blur/Gradient Backdrop */}
                    <div className="absolute inset-0 h-[140%] pointer-events-none -z-10">
                        <div 
                            className="absolute inset-0 backdrop-blur-xl"
                            style={{
                                maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)'
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#f8fafc]/95 to-transparent dark:from-[#0f172a] dark:via-[#0f172a]/95 dark:to-transparent" />
                    </div>

                    <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-8 pb-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1 group">
                                <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchQuery || tagQuery ? 'text-indigo-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                                <input 
                                    type="text" 
                                    placeholder={showTagInput ? "Поиск по тегу..." : "Поиск..."}
                                    value={showTagInput ? tagQuery : searchQuery}
                                    onChange={(e) => showTagInput ? setTagQuery(e.target.value) : setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-all shadow-sm placeholder:text-slate-400"
                                />
                                {(searchQuery || tagQuery) && (
                                    <button onClick={() => { setSearchQuery(''); setTagQuery(''); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={16} /></button>
                                )}
                            </div>
                            
                            <Tooltip content={showFilters ? "Скрыть фильтры" : "Фильтры"} side="bottom">
                                <button onClick={() => setShowFilters(!showFilters)} className={`p-3 rounded-2xl border-none transition-all shadow-sm ${showFilters || activeColorFilter ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                                    <LayoutGrid size={20} />
                                </button>
                            </Tooltip>

                            <Tooltip content={showTagInput ? "Обычный поиск" : "Поиск по тегам"} side="bottom">
                                <button onClick={() => { setShowTagInput(!showTagInput); setTagQuery(''); setSearchQuery(''); }} className={`p-3 rounded-2xl border-none transition-all shadow-sm ${showTagInput ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                                    <TagIcon size={20} />
                                </button>
                            </Tooltip>

                            {/* SYNAPTIC TOGGLE (Only in Inbox) */}
                            {activeTab === 'inbox' && (
                                <Tooltip content="Нейросеть связей" side="bottom">
                                    <button onClick={() => setIsSynapticMode(true)} className={`p-3 rounded-2xl border-none transition-all shadow-sm bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20`}>
                                        <BrainCircuit size={20} />
                                    </button>
                                </Tooltip>
                            )}

                            {/* MOOD FILTER AI (Only if configured) */}
                            {hasMoodMatcher && (
                                <Tooltip content="Подбор по настроению (AI)" side="bottom">
                                    <button onClick={() => setShowMoodInput(!showMoodInput)} className={`p-3 rounded-2xl border-none transition-all shadow-sm ${showMoodInput || aiFilteredIds ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                                        <Sparkles size={20} />
                                    </button>
                                </Tooltip>
                            )}
                            
                            {/* ORACLE TRIGGER (Only in Archive) */}
                            {activeTab === 'library' && (
                                <Tooltip content="Оракул" side="bottom">
                                    <button onClick={startOracle} className={`p-3 rounded-2xl border-none transition-all shadow-sm bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20`}>
                                        <Dices size={20} />
                                    </button>
                                </Tooltip>
                            )}
                        </div>

                        {/* EXPANDABLE FILTERS */}
                        <AnimatePresence>
                            {/* COLOR FILTER */}
                            {showFilters && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="flex items-center gap-2 pt-3 pb-1 overflow-x-auto scrollbar-none">
                                        <button onClick={() => setActiveColorFilter(null)} className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${!activeColorFilter ? 'border-slate-400 bg-slate-100 dark:bg-slate-700' : 'border-slate-200 bg-transparent'}`}><X size={12} className="text-slate-500"/></button>
                                        {colors.filter(c => c.id !== 'white').map(c => (
                                            <button key={c.id} onClick={() => setActiveColorFilter(activeColorFilter === c.id ? null : c.id)} className={`w-6 h-6 rounded-full border transition-all ${activeColorFilter === c.id ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-offset-slate-900 scale-110' : 'border-slate-200 dark:border-slate-700 hover:scale-110'}`} style={{ backgroundColor: c.hex }} />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                            
                            {/* AI MOOD INPUT */}
                            {showMoodInput && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-2">
                                    <div className="bg-white dark:bg-[#1e293b] p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Как ты себя чувствуешь? (например: устал, вдохновлен...)" 
                                            className="flex-1 bg-transparent text-sm px-2 outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                                            value={moodQuery}
                                            onChange={(e) => setMoodQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleMoodSearch()}
                                        />
                                        <button onClick={handleMoodSearch} disabled={isMoodAnalyzing} className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                                            {isMoodAnalyzing ? <RefreshCw size={14} className="animate-spin"/> : <ArrowRight size={14}/>}
                                        </button>
                                    </div>
                                    {aiFilteredIds && (
                                        <div className="flex justify-between items-center mt-2 px-1">
                                            <span className="text-[10px] text-slate-400 font-mono">Найдено: {aiFilteredIds.length} заметок</span>
                                            <button onClick={clearMoodFilter} className="text-[10px] text-red-400 hover:text-red-500">Сбросить</button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                <div className="w-full max-w-5xl mx-auto px-3 md:px-8 pb-32">
                    <Masonry
                        breakpointCols={breakpointColumnsObj}
                        className="flex w-auto -ml-6"
                        columnClassName="pl-6 bg-clip-padding"
                    >
                        {/* INPUT CARD (Only in Inbox) */}
                        {activeTab === 'inbox' && !searchQuery && !tagQuery && !activeColorFilter && !aiFilteredIds && (
                            <div className={`mb-6 bg-white dark:bg-[#1e293b] rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-300 ${isExpanded ? 'ring-2 ring-indigo-100 dark:ring-indigo-900/30' : ''} break-inside-avoid`}>
                                {isExpanded ? (
                                    <div className="p-4 animate-in fade-in zoom-in-95 duration-200" ref={editorRef}>
                                        <div className="flex justify-between items-start mb-2">
                                            <input 
                                                type="text" 
                                                placeholder="Заголовок" 
                                                className="w-full bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                value={title}
                                                onChange={e => setTitle(e.target.value)}
                                            />
                                            <div className="flex gap-1 ml-2">
                                                <div className="relative">
                                                    <button onClick={() => setShowCreationCoverPicker(!showCreationCoverPicker)} className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ${creationCover ? 'text-indigo-500' : 'text-slate-400'}`}><Layout size={16}/></button>
                                                    {showCreationCoverPicker && <CoverPicker onSelect={setCreationCover} onClose={() => setShowCreationCoverPicker(false)} />}
                                                </div>
                                                <div className="relative">
                                                    <button onClick={() => setShowModalColorPicker(!showModalColorPicker)} className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ${creationColor !== 'white' ? 'text-indigo-500' : 'text-slate-400'}`}><Palette size={16}/></button>
                                                    {showModalColorPicker && (
                                                        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-50 flex-wrap max-w-[150px]" onMouseDown={e => e.stopPropagation()}>
                                                            {colors.map(c => (<button key={c.id} onMouseDown={(e) => { e.preventDefault(); setCreationColor(c.id); }} className={`w-5 h-5 rounded-full border border-slate-300 ${creationColor === c.id ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`} style={{ backgroundColor: c.hex }} />))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {creationCover && (
                                            <div className="relative w-full h-32 rounded-lg overflow-hidden mb-3 group">
                                                <img src={creationCover} alt="Cover" className="w-full h-full object-cover" />
                                                <button onClick={() => setCreationCover(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={12} /></button>
                                            </div>
                                        )}

                                        <div 
                                            ref={contentEditableRef}
                                            contentEditable
                                            suppressContentEditableWarning={true}
                                            className="w-full min-h-[120px] max-h-[400px] overflow-y-auto outline-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 cursor-text relative z-10"
                                            onInput={handleEditorInput}
                                            onBlur={() => saveSelection()}
                                            onMouseUp={() => saveSelection()}
                                            onKeyUp={() => saveSelection()}
                                            onClick={handleEditorClick}
                                            data-placeholder="Начни писать..."
                                        />

                                        {activeImage && (
                                            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full flex gap-4 z-[100] image-delete-btn">
                                                <button onMouseDown={deleteActiveImage} className="hover:text-red-400"><Trash2 size={16} /></button>
                                                <span className="text-xs self-center">Image Selected</span>
                                            </div>
                                        )}

                                        <TagSelector selectedTags={creationTags} onChange={setCreationTags} existingTags={allExistingTags} />

                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                            <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1 mask-fade-right">
                                                <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"><Bold size={14} /></button></Tooltip>
                                                <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"><Italic size={14} /></button></Tooltip>
                                                <Tooltip content="Заголовок"><button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'H2'); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"><Heading1 size={14} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 mx-1 shrink-0"></div>
                                                <Tooltip content="Изображение">
                                                    <label className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 cursor-pointer">
                                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} ref={fileInputRef} />
                                                        <ImageIcon size={14} />
                                                    </label>
                                                </Tooltip>
                                                <Tooltip content="Очистить стиль"><button onMouseDown={handleClearStyle} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"><Eraser size={14} /></button></Tooltip>
                                            </div>
                                            <div className="flex gap-2">
                                                {isProcessing ? (
                                                    <span className="text-xs text-slate-400 self-center animate-pulse">Saving...</span>
                                                ) : (
                                                    <button onClick={handleDump} className="bg-slate-900 dark:bg-indigo-600 text-white p-2 rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-lg"><ArrowRight size={16} /></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => { setIsExpanded(true); setTimeout(() => contentEditableRef.current?.focus(), 100); }} 
                                        className="p-4 cursor-text flex items-center justify-between group"
                                    >
                                        <span className="text-slate-400 text-sm font-medium">Новая мысль...</span>
                                        <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400"><ImageIcon size={14} /></div>
                                            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400"><List size={14} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* NOTE CARDS */}
                        {activeTab === 'inbox' && inboxNotes.map(note => (
                            <NoteCard key={note.id} note={note} isArchived={false} handlers={cardHandlers} />
                        ))}
                        {activeTab === 'library' && archivedNotes.map(note => (
                            <NoteCard key={note.id} note={note} isArchived={true} handlers={cardHandlers} />
                        ))}
                    </Masonry>

                    {(activeTab === 'inbox' ? inboxNotes : archivedNotes).length === 0 && !isExpanded && !isSynapticMode && (
                        <div className="py-20">
                            <EmptyState 
                                icon={activeTab === 'inbox' ? LayoutGrid : Archive} 
                                title={activeTab === 'inbox' ? "Пусто в голове?" : "Библиотека пуста"} 
                                description={activeTab === 'inbox' ? "Самое время записать что-то важное." : "Архивируй заметки, чтобы сохранить их здесь."}
                                actionLabel={activeTab === 'inbox' ? "Создать заметку" : undefined}
                                onAction={() => { setIsExpanded(true); setTimeout(() => contentEditableRef.current?.focus(), 100); }}
                                color={activeTab === 'inbox' ? 'indigo' : 'slate'}
                            />
                        </div>
                    )}
                </div>
            </div>
            )
        )}
      </div>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {selectedNote && (
            <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedNote(null)}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95, y: 10 }} 
                    transition={{ duration: 0.2 }}
                    className={`w-full max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl overflow-hidden relative ${getNoteColorClass(isEditing ? 'white' : selectedNote.color)}`}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header Image */}
                    {(isEditing ? editCover : selectedNote.coverUrl) && (
                        <div className="h-40 shrink-0 relative group">
                            <img src={isEditing ? editCover! : selectedNote.coverUrl!} className="w-full h-full object-cover" />
                            {isEditing && (
                                <button onClick={() => setEditCover(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={14} /></button>
                            )}
                        </div>
                    )}

                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5 shrink-0 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            {isEditing ? (
                                <>
                                    <div className="relative">
                                        <button onClick={() => setShowEditCoverPicker(!showEditCoverPicker)} className={`p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors ${editCover ? 'text-indigo-500' : 'text-slate-400'}`}><Layout size={18} /></button>
                                        {showEditCoverPicker && <CoverPicker onSelect={setEditCover} onClose={() => setShowEditCoverPicker(false)} />}
                                    </div>
                                </>
                            ) : (
                                <div className="flex gap-1">
                                    <button onClick={(e) => togglePin(e, selectedNote)} className={`p-2 rounded-full transition-colors ${selectedNote.isPinned ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:bg-black/5 dark:hover:bg-white/10'}`}><Pin size={18} className={selectedNote.isPinned ? "fill-current" : ""} /></button>
                                    <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-full ml-2">
                                        {colors.map(c => (
                                            <button key={c.id} onClick={() => setColor(c.id)} className={`w-4 h-4 rounded-full border border-black/10 dark:border-white/10 hover:scale-125 transition-transform ${selectedNote.color === c.id ? 'ring-1 ring-offset-1 ring-slate-400' : ''}`} style={{ backgroundColor: c.hex }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {!isEditing && (
                                <>
                                    <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"><Edit3 size={18} /></button>
                                    <button onClick={() => { if(confirm("Удалить?")) { deleteNote(selectedNote.id); setSelectedNote(null); } }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"><Trash2 size={18} /></button>
                                </>
                            )}
                            <button onClick={() => setSelectedNote(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors ml-2"><X size={20} /></button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6 md:p-8">
                        {isEditing ? (
                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-slate-300 text-slate-900 dark:text-white"
                                    placeholder="Заголовок" 
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                />
                                <div 
                                    ref={editContentRef}
                                    contentEditable
                                    className="w-full min-h-[200px] outline-none text-base text-slate-700 dark:text-slate-300 leading-relaxed font-serif [&_img]:max-w-full [&_img]:rounded-lg cursor-text"
                                    onInput={handleEditModalInput}
                                    onBlur={saveSelection}
                                    onMouseUp={saveSelection}
                                    onKeyUp={saveSelection}
                                    onClick={handleEditorClick}
                                />
                                {activeImage && (
                                    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full flex gap-4 z-[110] image-delete-btn">
                                        <button onMouseDown={deleteActiveImage} className="hover:text-red-400"><Trash2 size={16} /></button>
                                        <span className="text-xs self-center">Image Selected</span>
                                    </div>
                                )}
                                <TagSelector selectedTags={editTagsList} onChange={setEditTagsList} existingTags={allExistingTags} />
                            </div>
                        ) : (
                            <div>
                                {selectedNote.title && <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{selectedNote.title}</h2>}
                                <div className="prose dark:prose-invert prose-sm md:prose-base max-w-none font-serif leading-relaxed text-slate-700 dark:text-slate-300 break-words">
                                    <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{selectedNote.content.replace(/\n/g, '  \n')}</ReactMarkdown>
                                </div>
                                {findFirstUrl(selectedNote.content) && <LinkPreview url={findFirstUrl(selectedNote.content)!} />}
                                {selectedNote.tags && selectedNote.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-black/5 dark:border-white/5">
                                        {selectedNote.tags.map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-black/5 dark:bg-white/10 rounded text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">#{tag.replace(/^#/, '')}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Edit Footer */}
                    {isEditing && (
                        <div className="p-4 border-t border-black/5 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                            <div className="flex gap-1">
                                <button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400"><Bold size={16} /></button>
                                <button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400"><Italic size={16} /></button>
                                <label className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 cursor-pointer">
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    <ImageIcon size={16} />
                                </label>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setIsEditing(false); handleOpenNote(selectedNote); }} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">Отмена</button>
                                <button onClick={handleSaveEdit} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-lg">Сохранить</button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* ORACLE MODAL */}
      <AnimatePresence>
          {showOracle && (
              <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
                  <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl"
                  >
                      {/* Close */}
                      <button onClick={closeOracle} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"><X size={24} /></button>

                      {oracleState === 'select' && (
                          <div className="text-center">
                              <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Оракул Мыслей</h2>
                              <p className="text-sm text-white/50 mb-8">Выбери намерение для случайного инсайта</p>
                              <div className="grid grid-cols-2 gap-3">
                                  {ORACLE_VIBES.map(v => (
                                      <button 
                                          key={v.id} 
                                          onClick={() => castOracleSpell(v)}
                                          className={`p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center gap-2 group`}
                                      >
                                          <v.icon size={24} className={`mb-1 group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br ${v.color} bg-clip-text text-transparent`} />
                                          <span className={`text-xs font-bold uppercase tracking-widest ${v.text}`}>{v.label}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                      {oracleState === 'thinking' && (
                          <div className="flex flex-col items-center justify-center py-10">
                              <div className="relative w-24 h-24 mb-6">
                                  <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${oracleVibe.color} opacity-20 blur-xl animate-pulse`} />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                      <Dices size={48} className="text-white animate-spin duration-[3000ms]" strokeWidth={1} />
                                  </div>
                              </div>
                              <p className="text-xs font-mono text-white/50 uppercase tracking-[0.2em] animate-pulse">Связь с хаосом...</p>
                          </div>
                      )}

                      {oracleState === 'result' && oracleNote && (
                          <div className="text-center">
                              <div className={`inline-flex p-3 rounded-full bg-gradient-to-br ${oracleVibe.color} mb-6 shadow-lg shadow-${oracleVibe.color.split('-')[1]}-500/20`}>
                                  <Quote size={24} className="text-white fill-white/20" />
                              </div>
                              
                              <div className="mb-8 relative">
                                  <Quote size={48} className="absolute -top-4 -left-2 text-white/5 rotate-180" />
                                  <p className="text-lg md:text-xl font-serif text-white/90 leading-relaxed relative z-10 italic">
                                      "{oracleNote.content.substring(0, 150)}{oracleNote.content.length > 150 ? '...' : ''}"
                                  </p>
                                  <Quote size={48} className="absolute -bottom-4 -right-2 text-white/5" />
                              </div>

                              <div className="flex flex-col gap-3">
                                  <button onClick={() => { handleOpenNote(oracleNote); closeOracle(); }} className="w-full py-3 bg-white text-black font-bold rounded-xl text-sm uppercase tracking-wider hover:bg-slate-200 transition-colors">
                                      Открыть заметку
                                  </button>
                                  <button onClick={handleAcceptOracleResult} className="w-full py-3 bg-white/10 text-white font-bold rounded-xl text-sm uppercase tracking-wider hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
                                      <Kanban size={16} /> Создать задачу
                                  </button>
                              </div>
                          </div>
                      )}
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

    </div>
  );
};

export default Napkins;