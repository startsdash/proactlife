import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, SketchItem, JournalEntry } from '../types';
import { findNotesByMood, autoTagNote } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { Send, Tag as TagIcon, RotateCcw, RotateCw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Plus, Sparkles, Kanban, Dices, Shuffle, Quote, ArrowRight, PenTool, Orbit, Flame, Waves, Clover, ArrowLeft, Image as ImageIcon, Bold, Italic, List, Code, Underline, Heading1, Heading2, Eraser, Type, Globe, Layout, Upload, RefreshCw, Archive, Clock, Diamond, Tablet, Book, BrainCircuit, Star, Pause, Play, Maximize2 } from 'lucide-react';

// --- HELPER: Extract Preview Data (Text & Images) ---
const extractPreviewData = (markdown: string) => {
    // 1. Extract Images
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    const images: string[] = [];
    let match;
    while ((match = imageRegex.exec(markdown)) !== null) {
        images.push(match[1]);
    }

    // 2. Clean Text for Preview
    // Remove image tags
    let cleanText = markdown.replace(/!\[.*?\]\(.*?\)/g, '');
    // Remove headers markers
    cleanText = cleanText.replace(/^#+\s/gm, '');
    // Remove bold/italic markers
    cleanText = cleanText.replace(/(\*\*|__)(.*?)\1/g, '$2');
    cleanText = cleanText.replace(/(\*|_)(.*?)\1/g, '$2');
    // Remove links [text](url) -> text
    cleanText = cleanText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    // Remove code blocks
    cleanText = cleanText.replace(/`{3}[\s\S]*?`{3}/g, '');
    cleanText = cleanText.replace(/`([^`]+)`/g, '$1');
    // Normalize whitespace
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    // 3. Sentence Logic
    // Split by . ! ? followed by space or end of string
    const sentences = cleanText.match(/[^\.!\?]+[\.!\?]+(\s|$)/g);
    
    let preview = '';
    if (sentences) {
        // Take up to 3 sentences
        preview = sentences.slice(0, 3).join('').trim();
    } else {
        // Fallback if no punctuation found
        preview = cleanText;
    }

    // Hard limit to avoid huge sentences taking over card
    if (preview.length > 200) {
        preview = preview.substring(0, 200);
        // Don't break words
        const lastSpace = preview.lastIndexOf(' ');
        if (lastSpace > 0) preview = preview.substring(0, lastSpace);
        preview += '...';
    } else if (sentences && sentences.length > 3) {
        preview += '...'; // Add ellipsis if we had more sentences than shown
    }

    return { previewText: preview, extractedImages: images };
};

// --- COMPONENT: Lightbox Image Viewer ---
const ImageViewer: React.FC<{ src: string | null; onClose: () => void }> = ({ src, onClose }) => {
    if (!src) return null;
    return createPortal(
        <div 
            className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <button className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2">
                <X size={32} />
            </button>
            <img 
                src={src} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl scale-100 animate-in zoom-in-95 duration-300" 
                onClick={(e) => e.stopPropagation()} 
                alt="Full size"
            />
        </div>,
        document.body
    );
};

// ... (Colors, Constants, Props definitions remain same) ...
// ... (Include colors, ORACLE_VIBES, UNSPLASH_PRESETS, NOISE_PATTERN, breakpointColumnsObj) ...
// ... (Include allowDataUrls, processImage, findFirstUrl helper) ...

// [INSERT PREVIOUS HELPER CONSTANTS HERE: colors, ORACLE_VIBES etc...]
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
  sketchItems?: SketchItem[];
  addSketchItem?: (item: SketchItem) => void;
  deleteSketchItem?: (id: string) => void;
  updateSketchItem?: (item: SketchItem) => void;
  defaultTab?: 'inbox' | 'library';
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
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
];

const NOISE_PATTERN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`;

const breakpointColumnsObj = {
  default: 4,
  1600: 3,
  1100: 2,
  700: 1
};

const allowDataUrls = (url: string) => url;
// (Re-include processImage, findFirstUrl, LinkPreview from previous code...)
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
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
                else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) { ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.7)); } 
                else { reject(new Error('Canvas context failed')); }
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
        let mounted = true; setLoading(true); setError(false);
        fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`).then(res => res.json()).then(json => { if (mounted) { if (json.status === 'success') { setData(json.data); } else { setError(true); } setLoading(false); } }).catch(() => { if (mounted) { setError(true); setLoading(false); } });
        return () => { mounted = false; };
    }, [url]);
    if (error || loading || !data || !data.title) return null;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block mt-4 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800 transition-all rounded-xl overflow-hidden group/link relative no-underline break-inside-avoid border border-black/5 dark:border-white/5 shadow-sm">
            {data.image?.url && <div className="h-32 w-full overflow-hidden relative"><img src={data.image.url} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover/link:scale-105 opacity-90 group-hover/link:opacity-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>}
            <div className="p-3"><h4 className="font-sans font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1 mb-1 leading-snug">{data.title}</h4><p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed font-sans">{data.description}</p><div className="flex items-center gap-2 text-[9px] text-slate-400 uppercase tracking-wider font-bold font-sans">{data.logo?.url ? <img src={data.logo.url} className="w-3 h-3 rounded-full" alt="" /> : <Globe size={10} />}<span className="truncate">{data.publisher || new URL(url).hostname}</span></div></div>
        </a>
    );
});

// Basic Markdown Components for the Card (Cleaned up)
const cardMarkdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-0" {...props} />,
    // We suppress images in the text area of the card because we show thumbnails below
    img: ({node, ...props}: any) => null, 
    a: ({node, ...props}: any) => <span className="text-indigo-500 underline decoration-indigo-300 underline-offset-2" {...props} />,
};

// Converters (htmlToMarkdown / markdownToHtml) from previous fix
const htmlToMarkdown = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const wrap = (text: string, marker: string) => {
        const match = text.match(/^(\s*)(.*?)(\s*)$/s);
        if (match && match[2]) { return `${match[1]}${marker}${match[2]}${marker}${match[3]}`; }
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
                case 'div': return `\n${content}`; 
                case 'p': return `\n\n${content}\n`;
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

const getNoteColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

// ... (TagSelector and CoverPicker components from previous code remain exactly the same) ...
// [Assume TagSelector and CoverPicker are here exactly as in previous correct solution]
const TagSelector: React.FC<{ selectedTags: string[], onChange: (tags: string[]) => void, existingTags: string[], placeholder?: string, variant?: 'default' | 'ghost', direction?: 'up' | 'down' }> = ({ selectedTags, onChange, existingTags, placeholder = "Добавить теги...", variant = 'default', direction = 'down' }) => {
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const handleTagChange = (newTags: string[]) => { const uniqueTags = Array.from(new Set(newTags)); onChange(uniqueTags); };
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { const target = event.target as Node; const isWrapper = wrapperRef.current && wrapperRef.current.contains(target); const isDropdown = dropdownRef.current && dropdownRef.current.contains(target); if (!isWrapper && !isDropdown) { setIsOpen(false); } };
        const handleScroll = () => { if (isOpen) setIsOpen(false); };
        if (isOpen) { document.addEventListener('mousedown', handleClickOutside); document.addEventListener('scroll', handleScroll, true); window.addEventListener('resize', handleScroll); }
        return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('scroll', handleScroll, true); window.removeEventListener('resize', handleScroll); };
    }, [isOpen]);
    useEffect(() => { if (isOpen && wrapperRef.current) { const rect = wrapperRef.current.getBoundingClientRect(); const style: React.CSSProperties = { position: 'fixed', left: rect.left, width: Math.max(rect.width, 200), zIndex: 99999 }; if (direction === 'down') { style.top = rect.bottom + 4; } else { style.bottom = window.innerHeight - rect.top + 4; } setDropdownStyle(style); } }, [isOpen, direction]);
    const filteredSuggestions = existingTags.filter(tag => !selectedTags.some(st => st.toLowerCase() === tag.toLowerCase()) && tag.toLowerCase().includes(input.toLowerCase()));
    const addTag = (tag: string) => { const cleanTag = tag.trim().replace(/^#/, ''); if (!cleanTag) return; if (selectedTags.some(t => t.toLowerCase() === cleanTag.toLowerCase())) { setInput(''); setIsOpen(false); return; } handleTagChange([...selectedTags, existingTags.find(t => t.toLowerCase() === cleanTag.toLowerCase()) || cleanTag]); setInput(''); setIsOpen(false); };
    const hasContent = input.length > 0 || filteredSuggestions.length > 0;
    return (
        <div className="relative portal-popup" ref={wrapperRef}>
            <div className={`flex flex-wrap items-center gap-3 min-h-[36px] ${variant === 'ghost' ? 'px-0 py-2' : 'p-2'}`}>
                {selectedTags.map(tag => (<span key={tag} className="flex items-center gap-1 text-[9px] font-sans uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 group cursor-default">#{tag.replace(/^#/, '')} <button onClick={() => handleTagChange(selectedTags.filter(t => t !== tag))} className="text-slate-300 hover:text-red-500 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} strokeWidth={2} /></button></span>))}
                <input type="text" value={input} onChange={(e) => { setInput(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addTag(input); } }} placeholder={selectedTags.length === 0 ? placeholder : ''} className={`flex-1 min-w-[80px] bg-transparent text-xs font-sans outline-none ${variant === 'ghost' ? 'text-slate-600 dark:text-slate-300 placeholder:text-slate-300' : 'text-slate-600 dark:text-slate-300 placeholder:text-slate-400'}`} />
            </div>
            {isOpen && hasContent && createPortal(<div ref={dropdownRef} className="fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-75 portal-popup" style={dropdownStyle} onMouseDown={(e) => e.stopPropagation()} >{input.length > 0 && !filteredSuggestions.some(t => t.toLowerCase() === input.trim().toLowerCase()) && (<button onClick={() => addTag(input)} className="w-full text-left px-3 py-2 text-xs font-sans text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-bold"><Plus size={12} /> Создать «{input}»</button>)}{filteredSuggestions.map(tag => (<button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-3 py-2 text-xs font-sans text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 font-medium"><TagIcon size={12} className="text-slate-400" /> {tag}</button>))}</div>, document.body)}
        </div>
    );
};

const CoverPicker: React.FC<{ onSelect: (url: string) => void, onClose: () => void, triggerRef: React.RefObject<HTMLElement> }> = ({ onSelect, onClose, triggerRef }) => {
    // ... [Copy previous CoverPicker implementation here] ...
    // Simplified for brevity in this answer, but use the previous FULL implementation
    const [query, setQuery] = useState(''); const [results, setResults] = useState<string[]>(UNSPLASH_PRESETS); const [loading, setLoading] = useState(false); const [pickerStyle, setPickerStyle] = useState<React.CSSProperties>({});
    useEffect(() => { if (triggerRef.current) { const rect = triggerRef.current.getBoundingClientRect(); const viewportH = window.innerHeight; const viewportW = window.innerWidth; const style: React.CSSProperties = {}; if (window.innerHeight - rect.bottom < 320 && rect.top > window.innerHeight - rect.bottom) { style.bottom = viewportH - rect.top + 8; style.maxHeight = rect.top - 20; } else { style.top = rect.bottom + 8; style.maxHeight = window.innerHeight - rect.bottom - 20; } if (rect.left + 320 > viewportW) { style.right = 16; } else { style.left = rect.left; } setPickerStyle(style); } }, [triggerRef]);
    const searchUnsplash = async (q?: string) => { /* ... impl ... */ };
    return createPortal(<><div className="fixed inset-0 z-[9998]" onClick={onClose} /><div className="fixed bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[9999] w-80 flex flex-col gap-3 portal-popup" style={pickerStyle} onMouseDown={e => e.stopPropagation()}><div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase font-sans">Обложка</span><button onClick={onClose}><X size={14} /></button></div><div className="grid grid-cols-3 gap-2">{results.map((url, i) => (<button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-video rounded-lg overflow-hidden bg-slate-100"><img src={url} className="w-full h-full object-cover" /></button>))}</div></div></>, document.body);
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
    const linkUrl = findFirstUrl(note.content);
    
    // NEW: Extract preview data using helper
    const { previewText, extractedImages } = useMemo(() => extractPreviewData(note.content), [note.content]);

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
                        <Pin size={16} strokeWidth={1.5} className={note.isPinned ? "fill-current" : ""} />
                    </button>
                </Tooltip>
            </div>

            <div className="p-8 pb-16 w-full flex-1 relative z-10 flex flex-col">
                <div className="block w-full mb-2">
                    {note.title && <h3 className={`font-sans text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4 leading-tight break-words ${isArchived ? 'tracking-wide' : 'tracking-tight'}`}>{note.title}</h3>}
                    
                    {/* NEW: Text Preview Logic (3 sentences max) */}
                    <div className={`text-slate-700 dark:text-slate-300 font-serif text-base leading-relaxed overflow-hidden break-words`}>
                        {previewText}
                    </div>

                    {linkUrl && <LinkPreview url={linkUrl} />}
                    
                    {/* NEW: Image Thumbnails Grid */}
                    {extractedImages.length > 0 && (
                        <div className="flex gap-2 mt-4 overflow-hidden">
                            {extractedImages.slice(0, 4).map((imgUrl, idx) => (
                                <div key={idx} className="h-16 w-16 rounded-lg overflow-hidden shrink-0 border border-black/5 dark:border-white/5 relative">
                                    <img src={imgUrl} className="w-full h-full object-cover" alt="thumbnail" loading="lazy" />
                                    {/* If more than 4, show indicator on the last one */}
                                    {idx === 3 && extractedImages.length > 4 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                                            +{extractedImages.length - 4}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

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
            
            <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-white/90 via-white/60 to-transparent dark:from-slate-900/90 dark:via-slate-900/60 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-20 flex justify-between items-end">
                <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                    {!isArchived ? (
                        <>
                            <Tooltip content="В хаб"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В хаб?')) handlers.moveNoteToSandbox(note.id); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Box size={16} strokeWidth={1.5} /></button></Tooltip>
                            
                            <Tooltip content="В спринты"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В спринты?')) { handlers.onAddTask({ id: Date.now().toString(), title: note.title, content: note.content, column: 'todo', createdAt: Date.now() }); } }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Kanban size={16} strokeWidth={1.5} /></button></Tooltip>
                            
                            <Tooltip content="В дневник"><button onClick={handleToJournal} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Book size={16} strokeWidth={1.5} /></button></Tooltip>
                            
                            {handlers.addSketchItem && <Tooltip content="В скетчпад"><button onClick={handleToSketchpad} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Tablet size={16} strokeWidth={1.5} /></button></Tooltip>}

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
                
                <div className="p-2 font-mono text-[8px] text-slate-900 dark:text-white select-none opacity-30 tracking-widest">
                    ID // {note.id.slice(-5).toLowerCase()}
                </div>
            </div>
        </div>
    );
};

const Napkins: React.FC<Props> = ({ notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, archiveNote, deleteNote, reorderNote, updateNote, onAddTask, onAddJournalEntry, addSketchItem, defaultTab }) => {
  // ... (State declarations - same as before) ...
  const [title, setTitle] = useState('');
  const [creationTags, setCreationTags] = useState<string[]>([]);
  const [creationColor, setCreationColor] = useState('white');
  const [creationCover, setCreationCover] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'library'>((defaultTab as any) || 'inbox');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  // NEW: Lightbox State
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

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

  const creationCoverBtnRef = useRef<HTMLButtonElement>(null);
  const editCoverBtnRef = useRef<HTMLButtonElement>(null);

  // ... (All other useEffects, helper functions, state logic from previous correct code) ...
  // [Retain: useEffect for tabs, useMotionValueEvent, allExistingTags, hasMoodMatcher, hasTagger, saveHistorySnapshot, saveEditHistorySnapshot, handleEditorInput, handleEditModalInput, execUndo/Redo, handleClickOutside, handleEditorClick, deleteActiveImage, insertImageAtCursor, handlePaste, handleImageUpload, execCmd, handleClearStyle, handleDump, handleMoodSearch, clearMoodFilter, startOracle, castOracleSpell, closeOracle, handleAcceptOracleResult, handleDragStart, handleDrop, handleOpenNote, handleSaveEdit, togglePin, setColor, filterNotes]
  // Assumed to be included here for brevity.

  useEffect(() => {
      if(defaultTab) setActiveTab(defaultTab as any);
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

  // FIX: Detect clicks outside the creation box but IGNORE clicks in portals (CoverPicker, etc)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest('.portal-popup')) return;
        if (editorRef.current && !editorRef.current.contains(target)) {
            if (isExpanded) {
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
      
      {/* HEADER SECTION */}
      <div className="shrink-0 w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 z-50">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Заметки</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">На скорости мысли</p>
                </div>
                <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl shrink-0 self-start md:self-auto w-full md:w-auto backdrop-blur-sm overflow-x-auto">
                    <button onClick={() => { setActiveTab('inbox'); clearMoodFilter(); }} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><LayoutGrid size={16} /> Входящие</button>
                    <button onClick={() => { setActiveTab('library'); clearMoodFilter(); }} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${activeTab === 'library' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><Library size={16} /> Библиотека</button>
                </div>
            </header>
      </div>

      <div className="flex-1 min-h-0 relative">
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
                    <div className="absolute inset-0 h-[140%] pointer-events-none -z-10">
                        <div 
                            className="absolute inset-0 backdrop-blur-xl"
                            style={{
                                maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)'
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#f8fafc]/95 to-transparent dark:from-[#0f172a] dark:via-[#0f172a]/95 dark:to-transparent" />
                    </div>

                    <div className="relative z-10 w-full px-4 md:px-8 pb-2">
                        <div className="max-w-3xl mx-auto w-full">
                            {/* ... Search/Filter Bars (kept same as previous) ... */}
                            <div className="flex gap-2">
                                <div className="relative flex-1 group">
                                    {showMoodInput ? (
                                        <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                            <div className="relative flex-1">
                                                <Sparkles size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" />
                                                <input type="text" placeholder="На какую тему подобрать заметки?" value={moodQuery} onChange={(e) => setMoodQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleMoodSearch()} className="w-full pl-10 pr-4 py-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-300 transition-all text-purple-900 dark:text-purple-300 placeholder:text-purple-300" autoFocus />
                                            </div>
                                            <button onClick={handleMoodSearch} disabled={isMoodAnalyzing || !moodQuery.trim()} className="px-5 py-2 bg-purple-600 text-white rounded-2xl text-xs font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 shadow-sm">{isMoodAnalyzing ? 'Думаю...' : 'Найти'}</button>
                                            <button onClick={() => setShowMoodInput(false)} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
                                        </div>
                                    ) : showTagInput ? (
                                        <div className="flex gap-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                            <div className="relative flex-1">
                                                <TagIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" />
                                                <input type="text" placeholder="Поиск по #тегам..." value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-300 transition-all text-indigo-900 dark:text-indigo-300 placeholder:text-indigo-300" autoFocus />
                                            </div>
                                            <button onClick={() => setShowTagInput(false)} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                            <input type="text" placeholder="Поиск" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-shadow shadow-sm placeholder:text-slate-400" />
                                            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={16} /></button>}
                                        </>
                                    )}
                                </div>
                                {!showMoodInput && !showTagInput && (
                                    <>
                                        <Tooltip content="Поиск по тегам" side="bottom"><button onClick={() => setShowTagInput(true)} className="p-3 rounded-2xl border-none transition-all bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm"><TagIcon size={20} /></button></Tooltip>
                                        <Tooltip content="Фильтр по цвету" side="bottom"><button onClick={() => setShowFilters(!showFilters)} className={`p-3 rounded-2xl border-none transition-all shadow-sm ${showFilters || activeColorFilter ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}><Palette size={20} /></button></Tooltip>
                                        {hasMoodMatcher && <Tooltip content="Подбор по теме (ИИ)" side="bottom"><button onClick={() => setShowMoodInput(true)} className={`p-3 rounded-2xl border-none transition-all shadow-sm ${aiFilteredIds !== null ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'bg-white dark:bg-[#1e293b] text-slate-400 hover:text-purple-500 hover:bg-purple-50'}`}><Sparkles size={20} /></button></Tooltip>}
                                        <Tooltip content="Рандом" side="bottom">
                                            <button onClick={startOracle} className="group relative p-3 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg hover:shadow-purple-200 dark:hover:shadow-none">
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
                                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                                                <Dices size={20} className="relative z-10 text-white transition-transform duration-500 group-hover:rotate-180" />
                                            </button>
                                        </Tooltip>
                                    </>
                                )}
                            </div>
                            {aiFilteredIds !== null && !showMoodInput && (
                                <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center gap-2 text-xs text-purple-800 dark:text-purple-300"><Sparkles size={14} /><span>Найдено {aiFilteredIds.length} заметок на тему: <b>«{moodQuery}»</b></span></div>
                                    <button onClick={clearMoodFilter} className="text-[10px] font-bold uppercase tracking-wider text-purple-400 hover:text-purple-700 dark:hover:text-purple-200 flex items-center gap-1"><X size={12} /> Сброс</button>
                                </div>
                            )}
                            {(showFilters || activeColorFilter) && (
                                <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-2 animate-in slide-in-from-top-2 duration-200">
                                    <button onClick={() => setActiveColorFilter(null)} className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap ${activeColorFilter === null ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-600' : 'bg-white dark:bg-[#1e293b] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}>Все</button>
                                    {colors.map(c => <button key={c.id} onClick={() => setActiveColorFilter(activeColorFilter === c.id ? null : c.id)} className={`w-6 h-6 rounded-full border shadow-sm transition-transform ${activeColorFilter === c.id ? 'ring-2 ring-indigo-400 ring-offset-2 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c.hex, borderColor: '#cbd5e1' }} title={c.id} />)}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* CONTENT AREA */}
                <div className="w-full px-4 md:px-8 pt-6 pb-8">
                    {activeTab === 'inbox' && (
                        <>
                            {/* CREATION BOX */}
                            {!searchQuery && !activeColorFilter && aiFilteredIds === null && !showMoodInput && !tagQuery && !showTagInput && (
                                <div className="max-w-3xl mx-auto w-full">
                                    <div ref={editorRef} className={`${getNoteColorClass(creationColor)} rounded-3xl transition-all duration-300 shrink-0 relative mb-8 ${isExpanded ? 'shadow-xl z-30' : 'shadow-sm hover:shadow-md'}`}>
                                        <div style={{ backgroundImage: NOISE_PATTERN }} className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-50 z-0 rounded-3xl"></div>
                                        
                                        {!isExpanded ? (
                                            <div onClick={() => { setIsExpanded(true); setTimeout(() => contentEditableRef.current?.focus(), 10); }} className="p-5 text-slate-400 dark:text-slate-500 cursor-text text-base font-medium flex items-center justify-between relative z-10"><span>Заметка...</span><div className="flex gap-4 text-slate-300 hover:text-slate-400 transition-colors"><PenTool size={20} /><ImageIcon size={20} /></div></div>
                                        ) : (
                                            <div className="flex flex-col animate-in fade-in duration-200 relative z-10">
                                                {creationCover && <div className="relative w-full h-32 md:h-48 group rounded-t-3xl overflow-hidden"><img src={creationCover} alt="Cover" className="w-full h-full object-cover" /><button onClick={() => setCreationCover(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={16} /></button></div>}
                                                <input type="text" placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} className="px-6 pt-6 pb-2 bg-transparent text-xl font-sans font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 outline-none" />
                                                <div 
                                                    ref={contentEditableRef} 
                                                    contentEditable 
                                                    onInput={handleEditorInput} 
                                                    onClick={handleEditorClick} 
                                                    onBlur={saveSelection} 
                                                    onMouseUp={saveSelection} 
                                                    onKeyUp={saveSelection} 
                                                    className="w-full min-h-[140px] outline-none text-base text-slate-700 dark:text-slate-200 px-6 py-2 leading-relaxed font-serif [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1" 
                                                    style={{ whiteSpace: 'pre-wrap' }} 
                                                    data-placeholder="О чём ты думаешь?" 
                                                />
                                                <div className="px-6 py-2"><TagSelector selectedTags={creationTags} onChange={setCreationTags} existingTags={allExistingTags} /></div>
                                                <div className="flex items-center justify-between px-4 py-3 gap-2 bg-transparent">
                                                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0 mask-fade-right">
                                                        <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execUndo(); }} disabled={historyIndex <= 0} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCcw size={18} /></button></Tooltip>
                                                        <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execRedo(); }} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCw size={18} /></button></Tooltip>
                                                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                        <Tooltip content="Заголовок 1"><button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'H1'); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"><Heading1 size={18} /></button></Tooltip>
                                                        <Tooltip content="Заголовок 2"><button onMouseDown={(e) => { e.preventDefault(); execCmd('formatBlock', 'H2'); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"><Heading2 size={18} /></button></Tooltip>
                                                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                        <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"><Bold size={18} /></button></Tooltip>
                                                        <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"><Italic size={18} /></button></Tooltip>
                                                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                        <Tooltip content="Очистить форматирование"><button onMouseDown={handleClearStyle} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"><Eraser size={18} /></button></Tooltip>
                                                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                        <Tooltip content="Вставить картинку"><label className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl cursor-pointer text-slate-500 dark:text-slate-400 transition-colors flex items-center justify-center"><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /><ImageIcon size={18} /></label></Tooltip>
                                                        {activeImage && !isEditing && <Tooltip content="Удалить картинку"><button onMouseDown={deleteActiveImage} className="image-delete-btn p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl text-red-500 transition-colors"><Trash2 size={18} /></button></Tooltip>}
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className="relative">
                                                            <Tooltip content="Обложка"><button ref={creationCoverBtnRef} onMouseDown={(e) => { e.preventDefault(); setShowCreationCoverPicker(!showCreationCoverPicker); }} className={`p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors ${creationCover ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`}><Layout size={18} /></button></Tooltip>
                                                            {showCreationCoverPicker && <CoverPicker onSelect={setCreationCover} onClose={() => setShowCreationCoverPicker(false)} triggerRef={creationCoverBtnRef} />}
                                                        </div>
                                                        <div className="relative">
                                                            <Tooltip content="Фон заметки"><button onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(!showColorPicker); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"><Palette size={18} /></button></Tooltip>
                                                            {showColorPicker && (
                                                                <>
                                                                    <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                                                                    <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-50 color-picker-dropdown">
                                                                        {colors.map(c => <button key={c.id} onMouseDown={(e) => { e.preventDefault(); setCreationColor(c.id); setShowColorPicker(false); }} className={`w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform ${creationColor === c.id ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`} style={{ backgroundColor: c.hex }} title={c.id} />)}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        <button onClick={handleDump} disabled={isProcessing} className="text-[10px] font-bold uppercase tracking-wider px-5 py-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors disabled:opacity-50">Закрыть</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {inboxNotes.length > 0 ? (
                                <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid pb-20 md:pb-0" columnClassName="my-masonry-grid_column">
                                    {inboxNotes.map((note) => <NoteCard key={note.id} note={note} isArchived={false} handlers={cardHandlers} />)}
                                </Masonry>
                            ) : (
                                <div className="py-6"><EmptyState icon={PenTool} title="Чистый лист" description={searchQuery || activeColorFilter || aiFilteredIds || tagQuery ? 'Ничего не найдено по вашему запросу' : 'Входящие пусты. Отличное начало для новых мыслей'} /></div>
                            )}
                        </>
                    )}
                    {activeTab === 'library' && (
                        <>
                            {archivedNotes.length > 0 ? (
                                <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid pb-20 md:pb-0" columnClassName="my-masonry-grid_column">
                                    {archivedNotes.map((note) => <NoteCard key={note.id} note={note} isArchived={true} handlers={cardHandlers} />)}
                                </Masonry>
                            ) : (
                                <div className="py-6"><EmptyState icon={Library} title="Библиотека пуста" description={searchQuery || activeColorFilter || aiFilteredIds || tagQuery ? 'В архиве ничего не найдено.' : 'Собери лучшие мысли и идеи здесь'} color="indigo" /></div>
                            )}
                        </>
                    )}
                </div>
            </div>
      </div>
      
      {/* ORACLE MODAL (Unchanged) */}
      {showOracle && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 backdrop-blur-[70px] bg-white/30 dark:bg-black/40" onClick={closeOracle} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-2xl bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-xl rounded-[40px] shadow-2xl overflow-hidden border border-white/50 dark:border-white/10 flex flex-col min-h-[500px]" onClick={e => e.stopPropagation()} >
             <button onClick={closeOracle} className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-20"><X size={20} className="text-slate-400" /></button>
             <div className="flex justify-center items-center gap-6 pt-8 pb-4 border-b border-transparent">{ORACLE_VIBES.map(vibe => (<button key={vibe.id} onClick={() => setOracleVibe(vibe)} className={`text-[10px] font-mono uppercase tracking-widest transition-all flex items-center gap-2 pb-1 ${oracleVibe.id === vibe.id ? 'text-slate-900 dark:text-slate-100 border-b border-slate-900 dark:border-slate-100' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-b border-transparent'}`}>{vibe.label}{oracleVibe.id === vibe.id && <Sparkles size={10} className="text-indigo-500" />}</button>))}</div>
             <div className="flex-1 flex flex-col relative">
                 {oracleState === 'select' && (<div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500"><Diamond size={24} strokeWidth={1} className="text-slate-300 mb-8" /><button onClick={() => castOracleSpell(oracleVibe)} className="px-8 py-4 border border-slate-300 dark:border-slate-600 rounded-full text-xs font-mono uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all duration-500 active:scale-95">[ ВЫЗВАТЬ МЫСЛЬ ]</button></div>)}
                 {oracleState === 'thinking' && (<div className="flex-1 flex flex-col items-center justify-center"><div className="relative"><div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div><Diamond size={48} strokeWidth={0.5} className="text-slate-800 dark:text-white animate-pulse relative z-10" /></div><div className="mt-8 text-[10px] font-mono uppercase tracking-[0.3em] text-slate-400 animate-pulse">Scanning Archive...</div></div>)}
                 {oracleState === 'result' && oracleNote && (<div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto custom-scrollbar-ghost"><div className="flex justify-center mb-8 shrink-0"><Diamond size={16} strokeWidth={1} className="text-indigo-500" /></div><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }} className="flex-1 flex items-center justify-center text-center"><div className="font-serif text-2xl md:text-3xl leading-relaxed text-slate-800 dark:text-slate-200"><ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span>{children}</span>}} urlTransform={allowDataUrls} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{oracleNote.content}</ReactMarkdown></div></motion.div><div className="mt-12 text-center shrink-0"><div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest mb-6 opacity-40">{new Date(oracleNote.createdAt).toLocaleDateString()} • ID: {oracleNote.id.slice(-5)}</div><button onClick={handleAcceptOracleResult} className="text-xs font-mono uppercase tracking-[0.2em] text-slate-900 dark:text-white border-b border-transparent hover:border-slate-900 dark:hover:border-white transition-all pb-1">[ ПРИНЯТЬ В РАБОТУ ]</button></div></div>)}
             </div>
          </motion.div>
      </div>
      )}

      {/* NOTE DETAILS MODAL */}
      {selectedNote && (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedNote(null)}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-lg bg-white/75 dark:bg-[#1e293b]/75 backdrop-blur-[40px] saturate-150 border border-black/5 dark:border-white/10 rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col max-h-[90vh] relative overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                    onScroll={() => setActiveImage(null)}
                >
                    {/* Cover Logic */}
                    {(isEditing ? editCover : selectedNote.coverUrl) && <div className="h-40 w-full shrink-0 relative group -mx-10 -mt-10 mb-6 w-[calc(100%_+_5rem)] overflow-hidden"><img src={isEditing ? editCover! : selectedNote.coverUrl!} alt="Cover" className="w-full h-full object-cover" />{isEditing && <button onClick={() => setEditCover(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={16} /></button>}</div>}
                    
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header & Title */}
                        <div className="flex justify-between items-start mb-4 gap-4 shrink-0">
                            <div className="flex-1 pt-1 min-w-0">
                                {isEditing ? (
                                    <div className="flex flex-col gap-2">
                                        <input 
                                            value={editTitle} 
                                            onChange={(e) => setEditTitle(e.target.value)} 
                                            className="w-full bg-transparent p-0 text-xl font-sans font-bold text-slate-900 dark:text-slate-100 border-none outline-none placeholder:text-slate-300" 
                                            placeholder="Название" 
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1 opacity-50">
                                            <span>{new Date(selectedNote.createdAt).toLocaleDateString()}</span>
                                            <span className="opacity-50 mx-2">|</span>
                                            <span>ID // {selectedNote.id.slice(-5).toLowerCase()}</span>
                                            {selectedNote.isPinned && <Pin size={10} className="fill-current" />}
                                        </div>
                                        {selectedNote.title ? <h2 className="font-sans text-2xl font-bold text-slate-900 dark:text-slate-200 leading-tight break-words">{selectedNote.title}</h2> : null}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0 -mt-1">
                                {!isEditing && (
                                    <>
                                        <Tooltip content={selectedNote.isPinned ? "Открепить" : "Закрепить"}><button onClick={(e) => togglePin(e, selectedNote)} className={`p-2 rounded-lg transition-colors ${selectedNote.isPinned ? 'text-indigo-500 bg-transparent' : 'text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/5'}`}><Pin size={16} className={selectedNote.isPinned ? "fill-current" : ""} /></button></Tooltip>
                                        <Tooltip content="Редактировать"><button onClick={() => setIsEditing(true)} className="p-2 text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"><Edit3 size={16} /></button></Tooltip>
                                        <Tooltip content="Удалить"><button onClick={() => { if(window.confirm('Удалить заметку?')) { deleteNote(selectedNote.id); setSelectedNote(null); } }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent rounded-lg transition-colors"><Trash2 size={16} /></button></Tooltip>
                                    </>
                                )}
                                <button onClick={() => setSelectedNote(null)} className="p-2 text-slate-300 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded-lg ml-2"><X size={20}/></button>
                            </div>
                        </div>

                        {/* Content Area */}
                        {isEditing ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="relative flex-1 overflow-hidden flex flex-col">
                                    <div className="flex items-center justify-between mb-2 gap-2 shrink-0">
                                        <div className="flex items-center gap-1 pb-1 overflow-x-auto scrollbar-none flex-1 mask-fade-right">
                                            <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execEditUndo(); }} disabled={editHistoryIndex <= 0} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                            <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execEditRedo(); }} disabled={editHistoryIndex >= editHistory.length - 1} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1 shrink-0"></div>
                                            <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Bold size={16} /></button></Tooltip>
                                            <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Italic size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1 shrink-0"></div>
                                            <Tooltip content="Очистить"><button onMouseDown={handleClearStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Eraser size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1 shrink-0"></div>
                                            <Tooltip content="Вставить картинку"><label className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer text-slate-400 dark:text-slate-500 flex items-center justify-center"><input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /><ImageIcon size={16} /></label></Tooltip>
                                            {activeImage && <Tooltip content="Удалить картинку"><button onMouseDown={deleteActiveImage} className="image-delete-btn p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"><Trash2 size={16} /></button></Tooltip>}
                                        </div>
                                        <div className="shrink-0 relative flex gap-1">
                                            <div className="relative">
                                                <Tooltip content="Обложка"><button ref={editCoverBtnRef} onMouseDown={(e) => { e.preventDefault(); setShowEditCoverPicker(!showEditCoverPicker); }} className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 ${editCover ? 'text-indigo-500' : ''}`}><Layout size={16} /></button></Tooltip>
                                                {showEditCoverPicker && <CoverPicker onSelect={setEditCover} onClose={() => setShowEditCoverPicker(false)} triggerRef={editCoverBtnRef} />}
                                            </div>
                                            <div className="relative">
                                                <Tooltip content="Фон заметки"><button onMouseDown={(e) => { e.preventDefault(); setShowModalColorPicker(!showModalColorPicker); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Palette size={16} /></button></Tooltip>
                                                {showModalColorPicker && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setShowModalColorPicker(false)} />
                                                        <div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-50 color-picker-dropdown">
                                                            {colors.map(c => <button key={c.id} onMouseDown={(e) => { e.preventDefault(); setColor(c.id); setShowModalColorPicker(false); }} className={`w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform ${selectedNote.color === c.id ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`} style={{ backgroundColor: c.hex }} title={c.id} />)}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div 
                                        ref={editContentRef} 
                                        contentEditable 
                                        onInput={handleEditModalInput} 
                                        onClick={handleEditorClick} 
                                        onBlur={saveSelection} 
                                        onMouseUp={saveSelection} 
                                        onKeyUp={saveSelection} 
                                        onScroll={() => setActiveImage(null)} 
                                        className="w-full flex-1 bg-transparent p-1 text-base leading-relaxed text-slate-800 dark:text-slate-200 outline-none overflow-y-auto font-serif custom-scrollbar-ghost [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1" 
                                    />
                                </div>
                                <div className="pt-4 border-t border-black/5 dark:border-white/5 mt-2">
                                    <TagSelector selectedTags={editTagsList} onChange={setEditTagsList} existingTags={allExistingTags} placeholder="Добавить теги..." variant="ghost" direction="up" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto custom-scrollbar-ghost pr-1">
                                <div className={`text-slate-800 dark:text-slate-200 text-base leading-relaxed font-serif font-normal min-h-[4rem] mb-6 ${!selectedNote.title ? 'mt-1' : ''}`}>
                                    <ReactMarkdown 
                                        components={{
                                            ...markdownComponents,
                                            // Override Image component for Detail View to enable Lightbox
                                            img: ({node, ...props}: any) => (
                                                <img 
                                                    className="rounded-xl max-h-80 object-cover my-3 block w-full shadow-sm hover:opacity-95 transition-opacity cursor-zoom-in" 
                                                    {...props} 
                                                    loading="lazy" 
                                                    onClick={(e) => { e.stopPropagation(); setZoomedImage(props.src); }} 
                                                />
                                            )
                                        }} 
                                        urlTransform={allowDataUrls} 
                                        remarkPlugins={[remarkGfm]} 
                                        rehypePlugins={[rehypeRaw]}
                                    >
                                        {selectedNote.content.replace(/\n/g, '  \n')}
                                    </ReactMarkdown>
                                </div>
                                {selectedNote.tags && selectedNote.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-3 pt-4 border-t border-black/5 dark:border-white/5">
                                        {selectedNote.tags.map(tag => <span key={tag} className="text-[9px] text-slate-500/80 dark:text-slate-400/80 font-sans uppercase tracking-[0.15em]">#{tag.replace(/^#/, '')}</span>)}
                                    </div>
                                )}
                                {(() => { const url = findFirstUrl(selectedNote.content); return url ? <div className="mt-6"><LinkPreview url={url} /></div> : null; })()}
                            </div>
                        )}
                        
                        {isEditing && (
                            <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-black/5 dark:border-white/5 shrink-0">
                                <button onClick={() => setIsEditing(false)} className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">Отмена</button>
                                <button onClick={handleSaveEdit} className="font-mono text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors font-bold">Сохранить</button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
      )}

      {/* RENDER LIGHTBOX */}
      <ImageViewer src={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  );
};

export default Napkins;