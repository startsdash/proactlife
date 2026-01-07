import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import Masonry from 'react-masonry-css';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, SketchItem, JournalEntry } from '../types';
import { autoTagNote } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { 
    Send, Tag as TagIcon, RotateCcw, RotateCw, X, Trash2, 
    Pin, Palette, Check, Search, Plus, Sparkles, 
    ArrowRight, Image as ImageIcon, Bold, Italic, 
    Eraser, Layout, Upload, RefreshCw, 
    Archive, Shuffle, Book, Tablet, Globe
} from 'lucide-react';

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
  addSketchItem?: (item: SketchItem) => void;
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

const NOISE_PATTERN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`;

const UNSPLASH_PRESETS = [
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80', // Rain
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80', // Gradient
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80', // Dark Abstract
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80', // Nature
];

// --- MASONRY BREAKPOINTS ---
const breakpointColumnsObj = {
  default: 4,
  1600: 3,
  1100: 2,
  700: 1
};

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

const getNoteColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

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
};

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
        addSketchItem?: (item: SketchItem) => void;
    }
}

const NoteCard: React.FC<NoteCardProps> = ({ note, isArchived, handlers }) => {
    const [isExiting, setIsExiting] = useState(false);

    const handleArchive = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Переместить в библиотеку?')) {
            setIsExiting(true);
            setTimeout(() => {
                handlers.archiveNote(note.id);
            }, 400); 
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
        if(handlers.addSketchItem && window.confirm('В скетчпад?')) {
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
            <div style={{ backgroundImage: NOISE_PATTERN }} className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-50 z-0"></div>

            {note.coverUrl && (
                <div className="h-40 w-full shrink-0 relative z-10"><img src={note.coverUrl} alt="Cover" className="w-full h-full object-cover" /></div>
            )}

            <div className="absolute top-4 right-4 z-30">
                <Tooltip content={note.isPinned ? "Открепить" : "Закрепить"}>
                    <button 
                        onClick={(e) => handlers.togglePin(e, note)} 
                        className={`p-2 rounded-full transition-all duration-300 ${
                            note.isPinned 
                            ? 'text-[#B0A0FF] opacity-50 hover:opacity-100 bg-transparent' 
                            : 'text-slate-400 dark:text-slate-500 opacity-0 group-hover/card:opacity-100 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent'
                        }`}
                    >
                        <Pin size={16} className={note.isPinned ? "fill-current" : ""} />
                    </button>
                </Tooltip>
            </div>

            <div className="p-6 flex flex-col gap-3 relative z-10">
                <div className="font-serif text-base text-slate-800 dark:text-slate-200 leading-relaxed max-h-[400px] overflow-hidden relative">
                    <ReactMarkdown components={markdownComponents}>{applyTypography(note.content)}</ReactMarkdown>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-[#1e293b] to-transparent pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity" />
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                    {note.tags?.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-slate-100/50 dark:bg-black/10 rounded-md text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors cursor-default">
                            #{tag.replace(/^#/, '')}
                        </span>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-4 mt-2 border-t border-black/5 dark:border-white/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                    <div className="flex gap-1">
                        {handlers.addSketchItem && (
                            <Tooltip content="В Скетчпад">
                                <button onClick={handleToSketchpad} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <Tablet size={16} />
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip content="В Дневник">
                            <button onClick={handleToJournal} className="p-2 text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                <Book size={16} />
                            </button>
                        </Tooltip>
                    </div>
                    
                    <div className="flex gap-1">
                        {!isArchived && (
                            <Tooltip content="В архив">
                                <button onClick={handleArchive} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                                    <Archive size={16} />
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip content="Удалить">
                            <button onClick={(e) => { e.stopPropagation(); if(confirm('Удалить заметку?')) handlers.deleteNote(note.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const Napkins: React.FC<Props> = ({ notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, archiveNote, deleteNote, reorderNote, updateNote, onAddTask, onAddJournalEntry, addSketchItem }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [content, setContent] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [isTagging, setIsTagging] = useState(false);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const filteredNotes = useMemo(() => {
        if (!searchQuery) return notes.filter(n => n.status !== 'archived');
        const q = searchQuery.toLowerCase();
        return notes.filter(n => 
            n.content.toLowerCase().includes(q) || 
            n.tags.some(t => t.toLowerCase().includes(q))
        );
    }, [notes, searchQuery]);

    const pinnedNotes = filteredNotes.filter(n => n.isPinned);
    const otherNotes = filteredNotes.filter(n => !n.isPinned);
    const allDisplayNotes = [...pinnedNotes, ...otherNotes];

    const uniqueTags = useMemo(() => Array.from(new Set(notes.flatMap(n => n.tags))), [notes]);

    const handleCreateNote = async () => {
        if (!content.trim()) return;
        
        let finalTags = tags;
        if (tags.length === 0 && content.length > 20) {
            try {
                finalTags = await autoTagNote(content, config);
            } catch (e) { console.warn("Auto-tag failed", e); }
        }

        const newNote: Note = {
            id: Date.now().toString(),
            content: applyTypography(content),
            tags: finalTags,
            createdAt: Date.now(),
            status: 'inbox',
            coverUrl: coverUrl || undefined
        };
        addNote(newNote);
        setContent('');
        setTags([]);
        setCoverUrl(null);
        setIsInputFocused(false);
        setIsTagging(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            handleCreateNote();
        }
    };

    // --- DRAG HANDLERS ---
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('noteId', id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('noteId');
        if (draggedId && draggedId !== targetId) {
            reorderNote(draggedId, targetId);
        }
    };

    const togglePin = (e: React.MouseEvent, note: Note) => {
        e.stopPropagation();
        updateNote({ ...note, isPinned: !note.isPinned });
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>

            <div className="flex-1 overflow-y-auto custom-scrollbar-light p-6 md:p-8 relative z-10 pb-32">
                <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Заметки</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Входящий поток мыслей</p>
                    </div>
                    <div className="relative group w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all placeholder:text-slate-400"
                        />
                    </div>
                </header>

                <div className="max-w-7xl mx-auto">
                    {allDisplayNotes.length === 0 && !isInputFocused ? (
                        <EmptyState 
                            icon={ArrowRight} 
                            title="Пустой лист" 
                            description="Начни писать, чтобы зафиксировать мысль" 
                            color="slate"
                            actionLabel="Новая заметка"
                            onAction={() => { setIsInputFocused(true); setTimeout(() => textareaRef.current?.focus(), 100); }}
                        />
                    ) : (
                        <Masonry
                            breakpointCols={breakpointColumnsObj}
                            className="my-masonry-grid"
                            columnClassName="my-masonry-grid_column"
                        >
                            {allDisplayNotes.map(note => (
                                <NoteCard 
                                    key={note.id} 
                                    note={note} 
                                    isArchived={note.status === 'archived'} 
                                    handlers={{
                                        handleDragStart,
                                        handleDragOver,
                                        handleDrop,
                                        handleOpenNote: setActiveNote,
                                        togglePin,
                                        onAddTask,
                                        moveNoteToSandbox,
                                        archiveNote,
                                        moveNoteToInbox,
                                        onAddJournalEntry,
                                        addSketchItem,
                                        deleteNote
                                    }} 
                                />
                            ))}
                        </Masonry>
                    )}
                </div>
            </div>

            {/* INPUT AREA (Docked Bottom) */}
            <div className={`
                fixed bottom-0 left-0 md:left-64 right-0 z-40 p-4 md:p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                ${isInputFocused ? 'bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]' : 'pointer-events-none'}
            `}>
                <div className={`
                    max-w-3xl mx-auto bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl transition-all duration-300 relative overflow-hidden
                    ${isInputFocused ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-20 opacity-0 pointer-events-none'}
                `}>
                    {coverUrl && (
                        <div className="relative h-32 w-full group">
                            <img src={coverUrl} className="w-full h-full object-cover opacity-80" />
                            <button onClick={() => setCoverUrl(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-red-500 transition-colors"><X size={14}/></button>
                        </div>
                    )}
                    
                    <textarea 
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="О чем ты думаешь?"
                        className="w-full p-6 bg-transparent text-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none resize-none font-serif min-h-[120px]"
                    />

                    <div className="px-4 pb-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Tooltip content="Обложка">
                                    <button onClick={() => setIsCoverPickerOpen(!isCoverPickerOpen)} className={`p-2 rounded-xl transition-colors ${coverUrl ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                        <Layout size={20} strokeWidth={1.5} />
                                    </button>
                                </Tooltip>
                                {isCoverPickerOpen && <CoverPicker onSelect={setCoverUrl} onClose={() => setIsCoverPickerOpen(false)} />}
                            </div>
                            
                            <div className="relative">
                                <Tooltip content="Теги">
                                    <button onClick={() => setIsTagging(!isTagging)} className={`p-2 rounded-xl transition-colors ${isTagging || tags.length > 0 ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                        <TagIcon size={20} strokeWidth={1.5} />
                                    </button>
                                </Tooltip>
                                {isTagging && (
                                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 z-50">
                                        <TagSelector selectedTags={tags} onChange={setTags} existingTags={uniqueTags} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-300 dark:text-slate-600 uppercase tracking-widest hidden md:inline-block">CMD+ENTER</span>
                            <button 
                                onClick={handleCreateNote}
                                disabled={!content.trim()}
                                className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center gap-2"
                            >
                                <Send size={18} strokeWidth={2} />
                                <span className="hidden md:inline">Создать</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Floating Trigger Button (Visible when Input is Hidden) */}
                <div className={`absolute bottom-8 right-8 transition-all duration-300 ${isInputFocused ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 pointer-events-auto'}`}>
                    <button 
                        onClick={() => { setIsInputFocused(true); setTimeout(() => textareaRef.current?.focus(), 100); }}
                        className="w-14 h-14 bg-slate-900 dark:bg-indigo-600 text-white rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center"
                    >
                        <Plus size={28} />
                    </button>
                </div>

                {/* Overlay to close input */}
                {isInputFocused && (
                    <div className="fixed inset-0 z-[-1]" onClick={() => setIsInputFocused(false)} />
                )}
            </div>

            {/* FULL SCREEN MODAL FOR EDITING */}
            <AnimatePresence>
                {activeNote && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setActiveNote(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {activeNote.coverUrl && (
                                <div className="h-48 w-full relative shrink-0">
                                    <img src={activeNote.coverUrl} className="w-full h-full object-cover" />
                                    <button onClick={() => updateNote({...activeNote, coverUrl: undefined})} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-red-500 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            )}
                            
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar-light">
                                <textarea 
                                    className="w-full h-full min-h-[300px] resize-none outline-none text-lg text-slate-800 dark:text-slate-200 font-serif leading-relaxed bg-transparent"
                                    value={activeNote.content}
                                    onChange={(e) => updateNote({...activeNote, content: e.target.value})}
                                />
                            </div>

                            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a]/50 flex items-center justify-between shrink-0">
                                <div className="flex-1 mr-4">
                                    <TagSelector selectedTags={activeNote.tags} onChange={(tags) => updateNote({...activeNote, tags})} existingTags={uniqueTags} variant="ghost" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { if(confirm("Удалить заметку?")) { deleteNote(activeNote.id); setActiveNote(null); } }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                    <button onClick={() => setActiveNote(null)} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm">
                                        Готово
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
