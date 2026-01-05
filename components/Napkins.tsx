
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, SketchItem } from '../types';
import { findNotesByMood, autoTagNote } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { Send, Tag as TagIcon, RotateCcw, RotateCw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Plus, Sparkles, Kanban, Dices, Shuffle, Quote, ArrowRight, PenTool, Orbit, Flame, Waves, Clover, ArrowLeft, Image as ImageIcon, Bold, Italic, List, Code, Underline, Heading1, Heading2, Eraser, Type, Globe, Layout, Upload, RefreshCw, Archive, Clock, Diamond } from 'lucide-react';
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
            <div className={`flex flex-wrap items-center gap-2 min-h-[36px] ${variant === 'ghost' ? 'px-0 py-2' : 'p-2'}`}>
                {selectedTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 bg-transparent py-1 transition-colors">
                        #{tag} <button onClick={() => onChange(selectedTags.filter(t => t !== tag))} className="hover:text-red-500 ml-0.5"><X size={10} /></button>
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
const CoverPicker: React.FC<{ onSelect: (url: string) => void, onClose: () => void, triggerRef?: React.RefObject<HTMLElement> }> = ({ onSelect, onClose }) => {
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

            {/* PIN BUTTON - Top Right (GHOST STYLE) */}
            <div className="absolute top-4 right-4 z-20">
                <Tooltip content={note.isPinned ? "Открепить" : "Закрепить"}>
                    <button 
                        onClick={(e) => handlers.togglePin(e, note)} 
                        className={`p-2 rounded-full transition-all duration-300 ${
                            note.isPinned 
                            ? 'text-[#B0A0FF] opacity-50 hover:opacity-80' // Light Violet, low sat
                            : 'text-slate-400 dark:text-slate-500 opacity-0 group-hover/card:opacity-60 hover:!opacity-100' // Graphite Ghost
                        }`}
                    >
                        <Pin size={16} strokeWidth={1} />
                    </button>
                </Tooltip>
            </div>

            <div className="p-8 pb-20 w-full flex-1 relative z-10">
                <div className="block w-full mb-2">
                    {note.title && <h3 className={`font-sans text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4 leading-tight break-words ${isArchived ? 'tracking-wide' : 'tracking-tight'}`}>{note.title}</h3>}
                    <div className={`text-slate-700 dark:text-slate-300 font-serif text-sm leading-relaxed overflow-hidden break-words line-clamp-[6]`}>
                        <ReactMarkdown components={markdownComponents} urlTransform={allowDataUrls} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{note.content.replace(/\n/g, '  \n')}</ReactMarkdown>
                    </div>
                    {linkUrl && <LinkPreview url={linkUrl} />}
                    
                    {/* AIR TAGS */}
                    {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-6">
                            {note.tags.map(tag => (
                                <span key={tag} className="text-[9px] text-slate-500 dark:text-slate-400 font-sans uppercase tracking-[0.1em] opacity-80 hover:opacity-100 transition-opacity">
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
                            <Tooltip content="В спринты"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В спринты?')) { handlers.onAddTask({ id: Date.now().toString(), title: note.title, content: note.content, column: 'todo', createdAt: Date.now() }); } }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Kanban size={16} strokeWidth={1.5} /></button></Tooltip>
                            <Tooltip content="В хаб"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В хаб?')) handlers.moveNoteToSandbox(note.id); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Box size={16} strokeWidth={1.5} /></button></Tooltip>
                            
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
                
                {/* ID Display (Technical Watermark) */}
                <div className="p-2 font-mono text-[8px] text-slate-500 dark:text-slate-400 select-none opacity-30 tracking-wider">
                    ID // {note.id.slice(-8)}
                </div>
            </div>
        </div>
    );
};

const Napkins: React.FC<Props> = ({ notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, archiveNote, deleteNote, reorderNote, updateNote, onAddTask, sketchItems, addSketchItem, deleteSketchItem, updateSketchItem, defaultTab }) => {
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

  const handleEditNote = (note: Note) => {
      setEditTitle(note.title || '');
      setEditTagsList(note.tags || []);
      setEditCover(note.coverUrl || null);
      // Wait for ref to be available in modal
      setTimeout(() => {
          if (editContentRef.current) {
              editContentRef.current.innerHTML = markdownToHtml(note.content);
              setEditHistory([markdownToHtml(note.content)]);
              setEditHistoryIndex(0);
          }
      }, 50);
      setSelectedNote(note);
      setIsEditing(true);
  };

  const handleUpdateNote = () => {
      if (!selectedNote) return;
      const html = editContentRef.current?.innerHTML || '';
      const content = htmlToMarkdown(html);
      
      updateNote({
          ...selectedNote,
          title: applyTypography(editTitle),
          content: applyTypography(content),
          tags: editTagsList,
          coverUrl: editCover || undefined
      });
      setIsEditing(false);
      setSelectedNote(null);
  };

  const handleCreateNote = async () => {
      const html = contentEditableRef.current?.innerHTML || '';
      const content = htmlToMarkdown(html);
      if (!content.trim() && !title.trim() && !creationCover) return;

      setIsProcessing(true);
      let finalTags = creationTags;

      // Auto-tagging if enabled
      if (hasTagger && content.length > 50 && creationTags.length === 0) {
          try {
              const suggestedTags = await autoTagNote(content, config);
              if (suggestedTags.length > 0) finalTags = suggestedTags;
          } catch (e) { console.error(e); }
      }

      const newNote: Note = {
          id: Date.now().toString(),
          title: applyTypography(title),
          content: applyTypography(content),
          tags: finalTags,
          createdAt: Date.now(),
          status: 'inbox',
          color: creationColor,
          coverUrl: creationCover || undefined
      };

      addNote(newNote);
      
      // Reset
      setTitle('');
      if (contentEditableRef.current) contentEditableRef.current.innerHTML = '';
      setCreationTags([]);
      setCreationColor('white');
      setCreationCover(null);
      setIsExpanded(false);
      setIsProcessing(false);
  };

  const handleOracle = async () => {
      if (oracleState !== 'select') return;
      setOracleState('thinking');
      
      try {
          // Find notes by mood/vibe
          let noteIds: string[] = [];
          if (hasMoodMatcher) {
              noteIds = await findNotesByMood(notes, oracleVibe.label, config);
          }
          
          let candidates = noteIds.length > 0 
              ? notes.filter(n => noteIds.includes(n.id)) 
              : notes;
          
          if (candidates.length === 0) candidates = notes;
          
          if (candidates.length > 0) {
              const random = candidates[Math.floor(Math.random() * candidates.length)];
              setOracleNote(random);
              setOracleState('result');
          } else {
              setOracleState('select');
              setShowOracle(false);
              alert("Нет заметок для анализа.");
          }
      } catch (e) {
          console.error(e);
          setOracleState('select');
      }
  };

  // Filter Logic
  const filteredNotes = notes.filter(n => {
      if (activeTab === 'inbox' && n.status !== 'inbox') return false;
      if (activeTab === 'library' && n.status !== 'archived') return false;
      
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (n.title?.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)));
      }
      
      if (activeColorFilter && n.color !== activeColorFilter) return false;
      if (aiFilteredIds && !aiFilteredIds.includes(n.id)) return false;
      
      return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden" ref={scrollContainerRef}>
        {/* Header Area */}
        <div className={`sticky top-0 z-30 w-full transition-transform duration-300 ${isHeaderHidden ? '-translate-y-full' : 'translate-y-0'}`}>
             <div className="absolute inset-0 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800" />
             
             <div className="relative z-10 px-4 md:px-8 py-4">
                 <div className="flex items-center justify-between mb-4">
                     <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                         <button onClick={() => setActiveTab('inbox')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Входящие</button>
                         <button onClick={() => setActiveTab('sketchpad')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'sketchpad' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Скетчпад</button>
                         <button onClick={() => setActiveTab('library')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'library' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Библиотека</button>
                     </div>
                     
                     <div className="flex gap-2">
                         <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg transition-all ${showFilters ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}><Filter size={20} /></button>
                         <button onClick={() => setShowOracle(true)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-500"><Sparkles size={20} /></button>
                     </div>
                 </div>

                 {/* Creation Area (Only in Inbox) */}
                 {activeTab === 'inbox' && (
                     <div className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${isExpanded ? 'mb-6' : 'mb-2'}`}>
                         <div 
                            className={`bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all duration-500 ${isExpanded ? 'p-4 ring-4 ring-slate-100 dark:ring-slate-800' : 'p-2 flex items-center gap-3 cursor-text hover:border-slate-300 dark:hover:border-slate-600'}`}
                            onClick={() => !isExpanded && setIsExpanded(true)}
                         >
                             {!isExpanded ? (
                                 <>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400"><Plus size={16} /></div>
                                    <span className="text-slate-400 text-sm font-medium">Новая мысль...</span>
                                 </>
                             ) : (
                                 <div className="flex flex-col gap-3">
                                     <input 
                                        value={title} 
                                        onChange={(e) => setTitle(e.target.value)} 
                                        placeholder="Заголовок (необязательно)" 
                                        className="font-bold text-lg bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        autoFocus
                                     />
                                     <div 
                                        ref={contentEditableRef}
                                        contentEditable
                                        className="min-h-[100px] outline-none text-slate-600 dark:text-slate-300 leading-relaxed max-h-[400px] overflow-y-auto"
                                        onInput={handleEditorInput}
                                        data-placeholder="О чем думаешь?"
                                     />
                                     
                                     <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                         <div className="flex gap-2">
                                             <button onClick={() => setShowColorPicker(!showColorPicker)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><Palette size={18} /></button>
                                             <button onClick={() => setShowCreationCoverPicker(!showCreationCoverPicker)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><ImageIcon size={18} /></button>
                                             <TagSelector selectedTags={creationTags} onChange={setCreationTags} existingTags={allExistingTags} variant="ghost" />
                                         </div>
                                         <div className="flex gap-2">
                                             <button onClick={() => setIsExpanded(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Отмена</button>
                                             <button onClick={handleCreateNote} disabled={isProcessing} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-black text-sm font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                                                 {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                                                 Сохранить
                                             </button>
                                         </div>
                                     </div>
                                     
                                     {/* Pickers */}
                                     {showColorPicker && (
                                         <div className="flex gap-2 mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg animate-in fade-in slide-in-from-top-1">
                                             {colors.map(c => (
                                                 <button key={c.id} onClick={() => { setCreationColor(c.id); setShowColorPicker(false); }} className={`w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600 ${c.class}`} />
                                             ))}
                                         </div>
                                     )}
                                     {showCreationCoverPicker && (
                                         <div className="relative mt-2">
                                             <CoverPicker onSelect={(url) => { setCreationCover(url); setShowCreationCoverPicker(false); }} onClose={() => setShowCreationCoverPicker(false)} />
                                         </div>
                                     )}
                                 </div>
                             )}
                         </div>
                     </div>
                 )}
             </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
            {showFilters && activeTab !== 'sketchpad' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 flex flex-col gap-4 max-w-4xl mx-auto">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск..." className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                        <div className="flex gap-4 items-center overflow-x-auto pb-2">
                            <div className="flex gap-1">
                                <button onClick={() => setActiveColorFilter(null)} className={`w-6 h-6 rounded-full border flex items-center justify-center ${!activeColorFilter ? 'border-slate-400' : 'border-slate-200'}`}><X size={12} /></button>
                                {colors.map(c => (
                                    <button key={c.id} onClick={() => setActiveColorFilter(activeColorFilter === c.id ? null : c.id)} className={`w-6 h-6 rounded-full border ${c.class} ${activeColorFilter === c.id ? 'ring-2 ring-offset-1 ring-slate-400' : 'border-slate-200'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-8">
            {activeTab === 'sketchpad' ? (
                <Sketchpad items={sketchItems} addItem={addSketchItem} deleteItem={deleteSketchItem} updateItem={updateSketchItem} />
            ) : (
                <div className="max-w-[1600px] mx-auto">
                    {filteredNotes.length === 0 ? (
                        <EmptyState icon={LayoutGrid} title="Пусто" description={activeTab === 'inbox' ? "Начните с новой заметки" : "В архиве пока ничего нет"} />
                    ) : (
                        <Masonry
                            breakpointCols={breakpointColumnsObj}
                            className="flex w-auto -ml-6"
                            columnClassName="pl-6 bg-clip-padding"
                        >
                            {filteredNotes.map(note => (
                                <NoteCard 
                                    key={note.id} 
                                    note={note} 
                                    isArchived={activeTab === 'library'}
                                    handlers={{
                                        handleDragStart: (e, id) => e.dataTransfer.setData('noteId', id),
                                        handleDragOver: (e) => e.preventDefault(),
                                        handleDrop: (e, targetId) => reorderNote(e.dataTransfer.getData('noteId'), targetId),
                                        handleOpenNote: handleEditNote,
                                        togglePin: (e, n) => { e.stopPropagation(); updateNote({ ...n, isPinned: !n.isPinned }); },
                                        onAddTask,
                                        moveNoteToSandbox,
                                        archiveNote,
                                        moveNoteToInbox
                                    }}
                                />
                            ))}
                        </Masonry>
                    )}
                </div>
            )}
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
            {isEditing && selectedNote && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsEditing(false)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Cover */}
                        {(editCover || selectedNote.coverUrl) && (
                            <div className="h-48 relative shrink-0 group">
                                <img src={editCover || selectedNote.coverUrl} className="w-full h-full object-cover" />
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setShowEditCoverPicker(!showEditCoverPicker)} className="p-2 bg-black/50 text-white rounded-full"><ImageIcon size={16} /></button>
                                    <button onClick={() => setEditCover(null)} className="p-2 bg-red-500/80 text-white rounded-full"><X size={16} /></button>
                                </div>
                                {showEditCoverPicker && <div className="absolute top-12 right-2"><CoverPicker onSelect={(url) => { setEditCover(url); setShowEditCoverPicker(false); }} onClose={() => setShowEditCoverPicker(false)} /></div>}
                            </div>
                        )}

                        <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
                            <input 
                                value={editTitle} 
                                onChange={(e) => setEditTitle(e.target.value)} 
                                className="text-2xl font-bold bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                placeholder="Без названия"
                            />
                            
                            <div 
                                ref={editContentRef}
                                contentEditable
                                className="flex-1 min-h-[200px] outline-none text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-serif"
                            />

                            <div className="flex flex-wrap gap-2 items-center">
                                <TagSelector selectedTags={editTagsList} onChange={setEditTagsList} existingTags={allExistingTags} />
                                {!editCover && !selectedNote.coverUrl && (
                                    <button onClick={() => setShowEditCoverPicker(!showEditCoverPicker)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 relative">
                                        <ImageIcon size={18} />
                                        {showEditCoverPicker && <div className="absolute bottom-full left-0 mb-2"><CoverPicker onSelect={(url) => { setEditCover(url); setShowEditCoverPicker(false); }} onClose={() => setShowEditCoverPicker(false)} /></div>}
                                    </button>
                                )}
                                <div className="flex-1" />
                                <button onClick={() => { if(confirm('Удалить?')) { deleteNote(selectedNote.id); setIsEditing(false); } }} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium">Отмена</button>
                            <button onClick={handleUpdateNote} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md">Сохранить</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* ORACLE MODAL */}
        <AnimatePresence>
            {showOracle && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-8 text-center relative overflow-hidden"
                    >
                        <button onClick={() => { setShowOracle(false); setOracleState('select'); setOracleNote(null); }} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24} /></button>
                        
                        {oracleState === 'select' && (
                            <div className="space-y-8">
                                <Sparkles size={48} className="text-indigo-400 mx-auto animate-pulse" />
                                <h3 className="text-2xl font-light text-white">Оракул</h3>
                                <p className="text-slate-400 text-sm">Выбери вибрацию для поиска резонанса в базе знаний</p>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    {ORACLE_VIBES.map(v => (
                                        <button 
                                            key={v.id}
                                            onClick={() => setOracleVibe(v)}
                                            className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${oracleVibe.id === v.id ? `bg-gradient-to-br ${v.color} border-transparent text-white` : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                        >
                                            <v.icon size={24} />
                                            <span className="text-xs font-bold uppercase tracking-wider">{v.label}</span>
                                        </button>
                                    ))}
                                </div>
                                
                                <button onClick={handleOracle} className="w-full py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform">
                                    Получить Знак
                                </button>
                            </div>
                        )}

                        {oracleState === 'thinking' && (
                            <div className="py-20 flex flex-col items-center gap-6">
                                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <div className="text-indigo-400 font-mono text-sm animate-pulse">СКАНИРОВАНИЕ ЭФИРА...</div>
                            </div>
                        )}

                        {oracleState === 'result' && oracleNote && (
                            <div className="text-left space-y-6">
                                <div className={`text-xs font-bold uppercase tracking-widest ${oracleVibe.text} text-center mb-4`}>
                                    Резонанс найден
                                </div>
                                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 max-h-60 overflow-y-auto custom-scrollbar-ghost">
                                    <ReactMarkdown className="prose prose-invert prose-sm">{oracleNote.content}</ReactMarkdown>
                                </div>
                                <div className="text-center">
                                    <button onClick={() => { setShowOracle(false); handleEditNote(oracleNote); }} className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-4">
                                        Открыть заметку
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
