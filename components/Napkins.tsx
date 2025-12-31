
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task } from '../types';
import { findNotesByMood, autoTagNote } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { Send, Tag as TagIcon, RotateCcw, RotateCw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Plus, Sparkles, Kanban, Dices, Shuffle, Quote, ArrowRight, PenTool, Orbit, Flame, Waves, Clover, ArrowLeft, Image as ImageIcon, Bold, Italic, List, Code, Underline, Heading1, Heading2, Eraser, Type, Globe, Layout, Upload, RefreshCw, Archive, CornerUpLeft, CornerUpRight, MoreHorizontal } from 'lucide-react';

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
}

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-rose-50/50 dark:bg-rose-900/10', hex: '#fff1f2' },
    { id: 'amber', class: 'bg-amber-50/50 dark:bg-amber-900/10', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50/50 dark:bg-emerald-900/10', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-sky-50/50 dark:bg-sky-900/10', hex: '#f0f9ff' },
    { id: 'indigo', class: 'bg-indigo-50/50 dark:bg-indigo-900/10', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50/50 dark:bg-purple-900/10', hex: '#faf5ff' },
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

const breakpointColumnsObj = {
  default: 2,
  767: 1 // 1 column for mobile (<= 767px)
};

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
                const MAX_WIDTH = 1200; 
                const MAX_HEIGHT = 1200;
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
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
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

const findFirstUrl = (text: string): string | null => {
    const maskedText = text.replace(/!\[.*?\]\(.*?\)/g, '');
    const match = maskedText.match(/(https?:\/\/[^\s\)]+)/);
    return match ? match[0] : null;
};

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
            className="block mt-4 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all rounded-xl overflow-hidden group/link relative no-underline break-inside-avoid border border-slate-100 dark:border-slate-700/50 shadow-sm"
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
            <div className="p-4">
                <h4 className="font-serif font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1 mb-1 leading-snug">{data.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed font-sans">{data.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    {data.logo?.url ? (
                        <img src={data.logo.url} className="w-4 h-4 rounded-full" alt="" />
                    ) : (
                        <Globe size={12} />
                    )}
                    <span className="truncate">{data.publisher || new URL(url).hostname}</span>
                </div>
            </div>
        </a>
    );
});

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 hover:underline cursor-pointer underline-offset-2 break-all relative z-20 transition-colors" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 marker:text-slate-400" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 marker:text-slate-400" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-serif text-xl font-bold mt-4 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-serif text-lg font-bold mt-3 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="font-serif text-base font-bold mt-2 mb-1 text-slate-900 dark:text-slate-100 tracking-tight" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-indigo-200 dark:border-indigo-800 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-white/5" {...props}>{children}</code>
            : <code className="block bg-slate-50 dark:bg-black/50 text-slate-600 dark:text-slate-300 p-3 rounded-xl text-xs font-mono my-3 overflow-x-auto whitespace-pre-wrap border border-slate-200 dark:border-white/10" {...props}>{children}</code>
    },
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-64 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
    u: ({node, ...props}: any) => <u {...props} /> 
};

const getNoteColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const TagSelector: React.FC<{ selectedTags: string[], onChange: (tags: string[]) => void, existingTags: string[], placeholder?: string }> = ({ selectedTags, onChange, existingTags, placeholder = "Добавить теги..." }) => {
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
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-transparent min-h-[36px]">
                {selectedTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/5">
                        <TagIcon size={10} className="opacity-50" /> {tag} <button onClick={() => onChange(selectedTags.filter(t => t !== tag))} className="hover:text-red-500 ml-1 transition-colors"><X size={12} /></button>
                    </span>
                ))}
                <input type="text" value={input} onChange={(e) => { setInput(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} onKeyDown={(e) => e.key === 'Enter' && addTag(input)} placeholder={selectedTags.length === 0 ? placeholder : ''} className="flex-1 min-w-[80px] bg-transparent text-xs outline-none text-slate-600 dark:text-slate-300 placeholder:text-slate-400" />
            </div>
            {isOpen && (input.length > 0 || filteredSuggestions.length > 0) && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                    {input.length > 0 && !filteredSuggestions.some(t => t.toLowerCase() === input.trim().toLowerCase()) && (
                        <button onClick={() => addTag(input)} className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2"><Plus size={14} /> Создать «{input}»</button>
                    )}
                    {filteredSuggestions.map(tag => (
                        <button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"><TagIcon size={14} className="text-slate-400" /> {tag}</button>
                    ))}
                </div>
            )}
        </div>
    );
};

const CoverPicker: React.FC<{ onSelect: (url: string) => void, onClose: () => void }> = ({ onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<string[]>(UNSPLASH_PRESETS);
    const [loading, setLoading] = useState(false);
    
    const getUnsplashKey = () => {
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
            if (q) alert("Ключ Unsplash не найден. Используйте встроенные пресеты.");
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

    return (
        <div className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 w-80 flex flex-col gap-3" onMouseDown={e => e.stopPropagation()}>
            <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Обложка</span><button onClick={onClose}><X size={14} /></button></div>
            
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Поиск Unsplash..." 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
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
                <label className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-xs font-medium cursor-pointer transition-colors text-slate-600 dark:text-slate-300">
                    <Upload size={12} /> Своя 
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
                <button onClick={() => searchUnsplash()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors text-slate-600 dark:text-slate-300">
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
        deleteNote: (id: string) => void;
    }
}

const NoteCard: React.FC<NoteCardProps> = ({ note, isArchived, handlers }) => {
    const [isExiting, setIsExiting] = useState(false);
    const linkUrl = findFirstUrl(note.content);

    const handleArchive = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExiting(true);
        setTimeout(() => {
            handlers.archiveNote(note.id);
        }, 400); 
    };

    const handleRestore = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExiting(true);
        setTimeout(() => {
            handlers.moveNoteToInbox(note.id);
        }, 400);
    };

    return (
        <div 
            draggable
            onDragStart={(e) => handlers.handleDragStart(e, note.id)}
            onDragOver={handlers.handleDragOver}
            onDrop={(e) => handlers.handleDrop(e, note.id)}
            onClick={() => handlers.handleOpenNote(note)}
            className={`${getNoteColorClass(note.color)} rounded-[24px] transition-all duration-500 hover:-translate-y-[4px] hover:shadow-xl group/card flex flex-col cursor-default relative break-inside-avoid ${isArchived && !note.isPinned ? 'opacity-100' : ''} overflow-hidden mb-6 border border-black/5 dark:border-white/5 ${isExiting ? 'opacity-0 scale-90' : ''}`}
        >
            {note.coverUrl && (
                <div className="h-40 w-full shrink-0 relative z-10"><img src={note.coverUrl} alt="Cover" className="w-full h-full object-cover" /></div>
            )}
            <div className="p-6 pb-20 w-full flex-1 relative z-10">
                {/* Inbox Cue */}
                {!isArchived && !note.isPinned && (
                    <div className="absolute top-4 right-4">
                        <div className="w-2 h-2 rounded-full bg-indigo-400/50" title="Готово для работы" />
                    </div>
                )}

                <div className="block w-full mb-2">
                    {note.title && <h3 className={`font-serif text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 leading-tight break-words ${isArchived ? 'tracking-wide' : 'tracking-tight'}`}>{note.title}</h3>}
                    <div className={`text-slate-700 dark:text-slate-300 font-sans text-sm leading-relaxed overflow-hidden break-words line-clamp-[8]`}>
                        <ReactMarkdown components={markdownComponents} urlTransform={allowDataUrls} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{note.content.replace(/\n/g, '  \n')}</ReactMarkdown>
                    </div>
                    {linkUrl && <LinkPreview url={linkUrl} />}
                    {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-4">
                            {note.tags.map(tag => <span key={tag} className="text-[10px] text-slate-500 dark:text-slate-400 font-medium opacity-70 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md">{tag}</span>)}
                        </div>
                    )}
                </div>
            </div>
            
            {/* GHOST CONTROLS */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-[#1e293b] dark:via-[#1e293b]/80 dark:to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-20 flex justify-between items-end">
                <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                    {!isArchived ? (
                        <>
                            <Tooltip content="В спринты">
                                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('В спринты?')) { handlers.onAddTask({ id: Date.now().toString(), title: note.title, content: note.content, column: 'todo', createdAt: Date.now() }); } }} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors opacity-60 hover:opacity-100"><Kanban size={16} strokeWidth={1} /></button>
                            </Tooltip>
                            <Tooltip content="В хаб">
                                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('В хаб?')) handlers.moveNoteToSandbox(note.id); }} className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors opacity-60 hover:opacity-100"><Box size={16} strokeWidth={1} /></button>
                            </Tooltip>
                            
                            <div className="w-px h-3 bg-slate-300 dark:bg-slate-600 mx-0.5" />

                            <Tooltip content="В архив">
                                <button onClick={handleArchive} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors opacity-60 hover:opacity-100"><Archive size={16} strokeWidth={1} /></button>
                            </Tooltip>
                        </>
                    ) : (
                        <Tooltip content="Восстановить">
                            <button onClick={handleRestore} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors opacity-60 hover:opacity-100"><RotateCcw size={16} strokeWidth={1} /></button>
                        </Tooltip>
                    )}
                </div>

                <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                     <Tooltip content={note.isPinned ? "Открепить" : "Закрепить"}>
                        <button onClick={(e) => handlers.togglePin(e, note)} className={`p-2 transition-colors opacity-60 hover:opacity-100 ${note.isPinned ? 'text-indigo-500' : 'text-slate-400 hover:text-indigo-500'}`}>
                            <Pin size={16} strokeWidth={1} className={note.isPinned ? "fill-current" : ""} />
                        </button>
                    </Tooltip>
                    <Tooltip content="Удалить">
                        <button onClick={(e) => { e.stopPropagation(); if(confirm('Удалить навсегда?')) handlers.deleteNote(note.id); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-60 hover:opacity-100"><Trash2 size={16} strokeWidth={1} /></button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};

const Napkins: React.FC<Props> = ({ notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, archiveNote, deleteNote, reorderNote, updateNote, onAddTask }) => {
    const [filter, setFilter] = useState<'inbox' | 'archive'>('inbox');
    const [searchQuery, setSearchQuery] = useState('');
    const [isInputOpen, setIsInputOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedColor, setSelectedColor] = useState('white');
    const [selectedCover, setSelectedCover] = useState<string>();
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [showCoverPicker, setShowCoverPicker] = useState(false);

    const existingTags = Array.from(new Set(notes.flatMap(n => n.tags)));

    const filteredNotes = notes
        .filter(n => (filter === 'inbox' ? n.status !== 'archived' : n.status === 'archived'))
        .filter(n => !searchQuery || n.content.toLowerCase().includes(searchQuery.toLowerCase()) || n.title?.toLowerCase().includes(searchQuery.toLowerCase()) || n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
        .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt - a.createdAt);

    const handleSave = () => {
        if (!content.trim() && !title.trim()) return;
        const note: Note = {
            id: activeNote ? activeNote.id : Date.now().toString(),
            title: applyTypography(title),
            content: applyTypography(content),
            tags: selectedTags,
            color: selectedColor,
            createdAt: activeNote ? activeNote.createdAt : Date.now(),
            status: activeNote ? activeNote.status : 'inbox',
            coverUrl: selectedCover,
            isPinned: activeNote?.isPinned
        };
        
        if (activeNote) {
            updateNote(note);
        } else {
            addNote(note);
        }
        
        handleCloseEditor();
    };

    const handleCloseEditor = () => {
        setIsInputOpen(false);
        setActiveNote(null);
        setTitle('');
        setContent('');
        setSelectedTags([]);
        setSelectedColor('white');
        setSelectedCover(undefined);
    };

    const openEditor = (note?: Note) => {
        if (note) {
            setActiveNote(note);
            setTitle(note.title || '');
            setContent(note.content);
            setSelectedTags(note.tags);
            setSelectedColor(note.color || 'white');
            setSelectedCover(note.coverUrl);
        }
        setIsInputOpen(true);
    };

    const handleAutoTag = async () => {
        if (!content) return;
        const tags = await autoTagNote(content, config);
        setSelectedTags([...new Set([...selectedTags, ...tags])]);
    };

    // Handlers wrapper for NoteCard
    const cardHandlers = useMemo(() => ({
        handleDragStart: (e: React.DragEvent, id: string) => {
            e.dataTransfer.setData('noteId', id);
            e.dataTransfer.effectAllowed = "move";
        },
        handleDragOver: (e: React.DragEvent) => e.preventDefault(),
        handleDrop: (e: React.DragEvent, targetId: string) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('noteId');
            if (draggedId && draggedId !== targetId) {
                reorderNote(draggedId, targetId);
            }
        },
        handleOpenNote: (note: Note) => openEditor(note),
        togglePin: (e: React.MouseEvent, note: Note) => {
            e.stopPropagation();
            updateNote({ ...note, isPinned: !note.isPinned });
        },
        onAddTask,
        moveNoteToSandbox,
        archiveNote,
        moveNoteToInbox,
        deleteNote
    }), [onAddTask, moveNoteToSandbox, archiveNote, moveNoteToInbox, deleteNote, reorderNote, updateNote]);

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            {/* HEADER */}
            <div className="p-4 md:p-8 pb-0 shrink-0 z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Заметки</h1>
                    <div className="flex gap-4 mt-2">
                        <button onClick={() => setFilter('inbox')} className={`text-sm font-medium transition-colors ${filter === 'inbox' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}>Входящие</button>
                        <button onClick={() => setFilter('archive')} className={`text-sm font-medium transition-colors ${filter === 'archive' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}>Архив</button>
                    </div>
                </div>
                <div className="relative w-full md:w-auto">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Поиск..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full md:w-64 pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-8 relative z-10" onDragOver={e => e.preventDefault()}>
                {filteredNotes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-60">
                        <EmptyState 
                            icon={filter === 'inbox' ? Library : Archive} 
                            title={filter === 'inbox' ? "Пусто" : "Архив пуст"} 
                            description={filter === 'inbox' ? "Нажми +, чтобы создать заметку" : "Здесь будут храниться обработанные мысли"} 
                            color="slate"
                        />
                    </div>
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
                                isArchived={filter === 'archive'}
                                handlers={cardHandlers}
                            />
                        ))}
                    </Masonry>
                )}
            </div>

            {/* FAB */}
            <div className="absolute bottom-6 right-6 z-30">
                <button 
                    onClick={() => openEditor()}
                    className="w-14 h-14 bg-slate-900 dark:bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                >
                    <Plus size={24} />
                </button>
            </div>

            {/* EDITOR MODAL */}
            <AnimatePresence>
                {isInputOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCloseEditor}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className={`w-full max-w-2xl ${getNoteColorClass(selectedColor)} rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative transition-colors duration-300`}
                        >
                            {/* Toolbar */}
                            <div className="flex justify-between items-center p-4 border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md">
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <button onClick={() => setShowCoverPicker(!showCoverPicker)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors" title="Обложка">
                                            <ImageIcon size={18} />
                                        </button>
                                        {showCoverPicker && <CoverPicker onSelect={setSelectedCover} onClose={() => setShowCoverPicker(false)} />}
                                    </div>
                                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                                    <div className="flex gap-1">
                                        {colors.map(c => (
                                            <button 
                                                key={c.id} 
                                                onClick={() => setSelectedColor(c.id)}
                                                className={`w-5 h-5 rounded-full border border-black/10 dark:border-white/10 ${c.class.split(' ')[0]} ${selectedColor === c.id ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleAutoTag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                                        <Sparkles size={12} /> Auto Tag
                                    </button>
                                    <button onClick={handleCloseEditor} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar-light relative">
                                {selectedCover && (
                                    <div className="relative h-48 w-full group">
                                        <img src={selectedCover} className="w-full h-full object-cover" alt="Cover" />
                                        <button onClick={() => setSelectedCover(undefined)} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                    </div>
                                )}
                                <div className="p-6 md:p-8">
                                    <input 
                                        type="text" 
                                        placeholder="Заголовок" 
                                        className="w-full bg-transparent text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none mb-4"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                    />
                                    <textarea 
                                        placeholder="Начни писать..." 
                                        className="w-full bg-transparent text-base text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none resize-none min-h-[300px] leading-relaxed font-sans"
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                    />
                                    <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5">
                                        <TagSelector selectedTags={selectedTags} onChange={setSelectedTags} existingTags={existingTags} />
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 bg-white/50 dark:bg-black/20 backdrop-blur-md border-t border-black/5 dark:border-white/5 flex justify-end gap-3">
                                {activeNote && (
                                    <button onClick={() => { if(confirm('Удалить?')) { deleteNote(activeNote.id); handleCloseEditor(); } }} className="mr-auto text-red-400 hover:text-red-500 p-2"><Trash2 size={18} /></button>
                                )}
                                <button onClick={handleCloseEditor} className="px-4 py-2 text-slate-500 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/5 rounded-xl font-medium transition-colors">Отмена</button>
                                <button onClick={handleSave} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-medium shadow-lg hover:scale-105 active:scale-95 transition-all">Сохранить</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Napkins;
