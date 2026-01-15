import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { JournalEntry, Task, AppConfig, MentorAnalysis, Note } from '../types';
import { ICON_MAP, applyTypography, SPHERES } from '../constants';
import { analyzeJournalPath } from '../services/geminiService';
import { Book, Zap, Calendar, Trash2, ChevronDown, CheckCircle2, Circle, Link, Edit3, X, Check, ArrowDown, ArrowUp, Search, Filter, Eye, FileText, Plus, Minus, MessageCircle, History, Kanban, Loader2, Save, Send, Target, Sparkle, Sparkles, Star, XCircle, Gem, PenTool, RotateCcw, RotateCw, Bold, Italic, Eraser, Image as ImageIcon, Layout, Palette, ArrowRight, RefreshCw, Upload, Shuffle, Globe, StickyNote, Unlink } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';

interface Props {
  entries: JournalEntry[];
  mentorAnalyses: MentorAnalysis[];
  tasks: Task[];
  notes: Note[];
  config: AppConfig;
  addEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (entry: JournalEntry) => void;
  addMentorAnalysis: (analysis: MentorAnalysis) => void;
  deleteMentorAnalysis: (id: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
  onNavigateToTask?: (taskId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  onRequestNoteSelection?: (entryId: string) => void; // New Prop
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

// --- HELPER FUNCTIONS ---

const getLinkedContentPreview = (content: string) => {
    let clean = content.replace(/!\[.*?\]\(.*?\)/g, '');
    clean = clean.replace(/[#*`_]/g, ''); 
    clean = clean.replace(/\s+/g, ' ').trim();
    const match = clean.match(/^[^.!?]+[.!?]/);
    let sentence = match ? match[0] : clean;
    if (sentence.length > 50) sentence = sentence.substring(0, 50).trim() + '...';
    return sentence;
};

const allowDataUrls = (url: string) => url;

const findFirstUrl = (text: string): string | null => {
    const maskedText = text.replace(/!\[.*?\]\((.*?)\)/g, ''); // Ignore images
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
            className="block mt-4 bg-white/60 dark:bg-slate-800/60 hover:bg-white/80 dark:hover:bg-slate-800 transition-all rounded-xl overflow-hidden group/link relative no-underline border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
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
    // Cleanup aggressive newlines but keep paragraphs
    md = md.replace(/\n{3,}/g, '\n\n').trim();
    md = md.replace(/&nbsp;/g, ' ');
    return applyTypography(md);
};

const markdownToHtml = (md: string) => {
    if (!md) return '';
    let html = md;
    
    // Headers
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    
    // Formatting
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__([\s\S]*?)__/g, '<b>$1</b>');
    html = html.replace(/_([\s\S]*?)_/g, '<i>$1</i>');
    html = html.replace(/\*([\s\S]*?)\*/g, '<i>$1</i>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Images
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        return `<img src="${src}" alt="${alt}" style="max-height: 300px; border-radius: 8px; margin: 8px 0; display: block; max-width: 100%; cursor: pointer;" />`;
    });
    
    // Improved Line Breaks: Wrap loose lines in divs to simulate standard contentEditable behavior
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        // Leave block elements alone
        if (line.match(/^<(h1|h2|div|p|ul|ol|li|blockquote)/i)) return line;
        // Wrap text lines in div
        return line.trim() ? `<div>${line}</div>` : '<div><br></div>';
    });
    
    return processedLines.join('');
};

const cleanHeader = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') return children.replace(/:\s*$/, '');
    if (Array.isArray(children)) {
        return React.Children.map(children, (child, i) => {
             return i === React.Children.count(children) - 1 ? cleanHeader(child) : child;
        });
    }
    if (React.isValidElement(children)) {
        return React.cloneElement(children, {
             // @ts-ignore
            children: cleanHeader(children.props.children)
        });
    }
    return children;
};

// Cover Picker
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

// Color Picker Popover
const ColorPickerPopover: React.FC<{
    onSelect: (colorId: string) => void,
    onClose: () => void,
    triggerRef: React.RefObject<HTMLElement>
}> = ({ onSelect, onClose, triggerRef }) => {
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Default to showing below, flip up if near bottom
            const viewportH = window.innerHeight;
            const spaceBelow = viewportH - rect.bottom;
            const height = 60; // Approx height

            let top = rect.bottom + 8;
            let left = rect.left;
            
            // If right edge goes offscreen, align to right
            if (left + 240 > window.innerWidth) {
                left = window.innerWidth - 256;
            }

            if (spaceBelow < height) {
                top = rect.top - height - 8;
            }

            setStyle({
                position: 'fixed',
                top,
                left,
                zIndex: 9999,
            });
        }
    }, [triggerRef]);

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div
                className="fixed bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-[9999] flex-wrap max-w-[240px]"
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

// --- LITERARY TYPOGRAPHY COMPONENTS (DEFAULT) ---
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300" {...props} />,
    a: ({node, ...props}: any) => <a className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer underline-offset-4 decoration-slate-300 dark:decoration-slate-600 transition-colors font-sans text-sm font-medium relative z-20 break-all" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-2xl mt-4 mb-2 text-slate-900 dark:text-slate-100 leading-tight" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100 leading-tight" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="font-sans font-bold text-lg mt-2 mb-1 text-slate-900 dark:text-slate-100 leading-tight" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-pink-600 dark:text-pink-400" {...props}>{children}</code>
            : <code className="block bg-slate-900 dark:bg-black text-slate-50 p-3 rounded-xl text-xs font-mono my-3 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    },
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
};

// --- HOLOGRAM MARKDOWN COMPONENTS (FOR ANALYSIS MODAL) ---
const HologramMarkdown = {
    p: ({node, ...props}: any) => <p className="mb-6 last:mb-0 text-[15px] md:text-[17px] text-slate-600 dark:text-slate-300 leading-7 md:leading-8 font-serif" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-8 mt-10 text-center select-none" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4 mt-8 pl-4 border-l border-indigo-500/30" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="font-sans text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 mt-6" {...props} />,
    ul: ({node, ...props}: any) => <ul className="space-y-4 my-6" {...props} />,
    ol: ({node, ...props}: any) => <ol className="space-y-4 my-6 list-none counter-reset-items" {...props} />,
    li: ({node, ...props}: any) => (
        <li className="relative pl-6 group">
             <div className="absolute left-0 top-[0.6em] w-px h-[1em] bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-500 transition-colors" />
             <div className="text-slate-700 dark:text-slate-300 font-serif leading-7">{props.children}</div>
        </li>
    ),
    blockquote: ({node, ...props}: any) => (
        <blockquote className="my-12 px-8 py-6 relative text-center">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
            <div className="font-serif text-lg md:text-xl italic text-slate-800 dark:text-slate-100 leading-relaxed tracking-wide" {...props} />
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
        </blockquote>
    ),
    strong: ({node, ...props}: any) => <span className="font-sans font-bold text-slate-900 dark:text-slate-50 text-xs uppercase tracking-wide" {...props} />,
    em: ({node, ...props}: any) => <em className="font-serif italic text-indigo-600 dark:text-indigo-400" {...props} />,
};

const TaskSelect: React.FC<{
  tasks: Task[];
  selectedId: string;
  onSelect: (id: string) => void;
}> = ({ tasks, selectedId, onSelect }) => {
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

  const selectedTask = tasks.find(t => t.id === selectedId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all outline-none text-left ${
          isOpen ? 'border-indigo-300 bg-white dark:bg-slate-800 ring-2 ring-indigo-50/50' : 'border-slate-200/60 dark:border-slate-700/60 bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
        }`}
      >
        <span className={`text-xs truncate ${selectedId ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-400'}`}>
          {selectedTask ? (
             <span className="flex items-center gap-2">
                {selectedTask.column === 'done' ? <CheckCircle2 size={14} className="text-emerald-500" strokeWidth={1} /> : <Circle size={14} className="text-indigo-500" strokeWidth={1} />}
                {selectedTask.content}
             </span>
          ) : (
            "Без привязки (Свободная мысль)"
          )}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => { onSelect(''); setIsOpen(false); }}
            className="w-full text-left px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 transition-colors"
          >
            Без привязки (Свободная мысль)
          </button>
          {tasks.length > 0 ? (
            tasks.map(t => (
              <button
                key={t.id}
                onClick={() => { onSelect(t.id); setIsOpen(false); }}
                className="w-full text-left px-4 py-3 text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-start gap-2 group"
              >
                 <div className="mt-0.5 shrink-0">
                    {t.column === 'done' ? <CheckCircle2 size={12} className="text-emerald-500" strokeWidth={1} /> : <Circle size={12} className="text-indigo-500" strokeWidth={1} />}
                 </div>
                 <span className="text-slate-700 dark:text-slate-300 group-hover:text-indigo-900 dark:group-hover:text-indigo-200 line-clamp-2">{t.content}</span>
              </button>
            ))
          ) : (
             <div className="px-4 py-3 text-[10px] text-slate-400 italic text-center">Нет активных задач</div>
          )}
        </div>
      )}
    </div>
  );
};

// --- REUSABLE SPHERE SELECTOR (AURA RINGS) ---
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
                className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all outline-none text-left ${
                  isOpen ? 'border-indigo-300 bg-white/80 dark:bg-slate-800 ring-2 ring-indigo-50/50' : 'border-slate-200/60 dark:border-slate-700/60 bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                }`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selected.length > 0 ? (
                        <>
                            <div className="flex -space-x-1.5 shrink-0">
                                {selected.map(s => {
                                    const sp = SPHERES.find(x => x.id === s);
                                    // Aura Ring Style: Hollow circle with colored border, overlapping
                                    return sp ? (
                                        <div 
                                            key={s} 
                                            className={`w-3.5 h-3.5 rounded-full border bg-transparent ${sp.text.replace('text-', 'border-')}`} 
                                            style={{ borderWidth: '1.5px' }}
                                        /> 
                                    ) : null;
                                })}
                            </div>
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                {selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ')}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs text-slate-400">Выбери сферу</span>
                    )}
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                    {SPHERES.map(s => {
                        const isSelected = selected.includes(s.id);
                        const Icon = ICON_MAP[s.icon];
                        return (
                            <button
                                key={s.id}
                                onClick={() => toggleSphere(s.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                {Icon && <Icon size={14} className={isSelected ? s.text : 'text-slate-400'} strokeWidth={1} />}
                                <span className="flex-1">{s.label}</span>
                                {isSelected && <Check size={14} className="text-indigo-500" strokeWidth={1} />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const JournalEntrySphereSelector: React.FC<{ 
    entry: JournalEntry, 
    updateEntry: (e: JournalEntry) => void,
    align?: 'left' | 'right',
    direction?: 'up' | 'down'
}> = ({ entry, updateEntry, align = 'right', direction = 'down' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (triggerRef.current && triggerRef.current.contains(event.target as Node)) {
                return;
            }
            if ((event.target as Element).closest('.sphere-selector-dropdown')) {
                return;
            }
            setIsOpen(false);
        };
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', () => setIsOpen(false), true);
            window.addEventListener('resize', () => setIsOpen(false));
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', () => setIsOpen(false), true);
            window.removeEventListener('resize', () => setIsOpen(false));
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const width = 192; // w-48 = 12rem = 192px

            let top = direction === 'down' ? rect.bottom + 8 : rect.top - 8;
            let left = align === 'left' ? rect.left : rect.right - width;

            const newStyle: React.CSSProperties = {
                position: 'fixed',
                left: left,
                zIndex: 9999,
                minWidth: width,
            };

            if (direction === 'up') {
                newStyle.top = rect.top - 8;
                newStyle.transform = 'translateY(-100%)';
            } else {
                newStyle.top = rect.bottom + 8;
            }

            setStyle(newStyle);
        }
    }, [isOpen, direction, align]);
    
    const toggleSphere = (sphereId: string) => {
        const current = entry.spheres || [];
        const newSpheres = current.includes(sphereId) 
            ? current.filter(s => s !== sphereId)
            : [...current, sphereId];
        updateEntry({ ...entry, spheres: newSpheres });
    };

    return (
        <>
            <Tooltip content="Сферы">
                <button 
                    ref={triggerRef}
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    className="flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    {entry.spheres && entry.spheres.length > 0 ? (
                        <div className="flex -space-x-1.5">
                            {entry.spheres.map(s => {
                                const sp = SPHERES.find(x => x.id === s);
                                return sp ? (
                                    <div 
                                        key={s} 
                                        className={`w-3 h-3 rounded-full border bg-transparent ${sp.text.replace('text-', 'border-')}`} 
                                        style={{ borderWidth: '1.5px' }}
                                    />
                                ) : null;
                            })}
                        </div>
                    ) : (
                        <Target size={16} strokeWidth={1.5} className="text-slate-300 hover:text-slate-500 dark:hover:text-slate-400" />
                    )}
                </button>
            </Tooltip>
            
            {isOpen && createPortal(
                <div 
                    className="sphere-selector-dropdown absolute bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5"
                    style={style}
                    onClick={e => e.stopPropagation()}
                >
                    {SPHERES.map(s => {
                        const isSelected = entry.spheres?.includes(s.id);
                        const Icon = ICON_MAP[s.icon];
                        return (
                            <button
                                key={s.id}
                                onClick={() => toggleSphere(s.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                {Icon && <Icon size={12} className={isSelected ? s.text : 'text-slate-400'} strokeWidth={1} />}
                                <span className="flex-1">{s.label}</span>
                                {isSelected && <Check size={12} className="text-indigo-500" strokeWidth={1} />}
                            </button>
                        );
                    })}
                </div>,
                document.body
            )}
        </>
    );
};

const SphereBadgeList: React.FC<{ spheres: string[] }> = ({ spheres }) => {
    return (
        <div className="flex flex-wrap gap-2">
            {spheres.map(s => {
                const sp = SPHERES.find(sphere => sphere.id === s);
                if (!sp) return null;
                const Icon = ICON_MAP[sp.icon];
                return (
                    <div key={s} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${sp.bg} ${sp.text} ${sp.border}`}>
                        {Icon && <Icon size={10} strokeWidth={1} />}
                        {sp.label}
                    </div>
                );
            })}
        </div>
    );
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, icon, actions, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-3">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
           {icon}
           {title}
        </div>
        <div className="flex items-center gap-2">
            {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
            <div className="text-slate-400">
                {isOpen ? <Minus size={14} strokeWidth={1} /> : <Plus size={14} strokeWidth={1} />}
            </div>
        </div>
      </div>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-1 duration-200">
           <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50 text-sm">
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const StaticChallengeRenderer: React.FC<{ 
    content: string,
    mode: 'draft' | 'history'
}> = ({ content, mode }) => {
    const cleanContent = content.trim().replace(/^#+\s*[^\n]*(\n+|$)/, '').trim();
    const lines = cleanContent.split('\n');
    const renderedParts: React.ReactNode[] = [];
    let textBuffer = '';

    const flushBuffer = (keyPrefix: string) => {
        if (textBuffer) {
            const trimmedBuffer = textBuffer.trim();
            if (trimmedBuffer) {
                renderedParts.push(
                    <div key={`${keyPrefix}-md`} className="text-sm leading-relaxed text-slate-900 dark:text-slate-200 mb-1 last:mb-0">
                        <ReactMarkdown components={markdownComponents}>{textBuffer}</ReactMarkdown>
                    </div>
                );
            }
            textBuffer = '';
        }
    };

    lines.forEach((line, i) => {
        const match = line.match(/^\s*(?:[-*+]|\d+\.)?\s*\[([ xX])\]\s+(.*)/);
        if (match) {
            flushBuffer(`line-${i}`);
            const isChecked = match[1].toLowerCase() === 'x';
            const label = match[2];
            const leadingSpaces = line.search(/\S|$/);
            const indent = leadingSpaces * 4; 
            let Icon = Circle;
            let iconClass = "text-slate-300 dark:text-slate-600";
            if (isChecked) {
                Icon = CheckCircle2;
                iconClass = "text-emerald-500";
            } else if (mode === 'history') {
                Icon = XCircle;
                iconClass = "text-red-400";
            } else {
                Icon = Circle;
                iconClass = "text-slate-300 dark:text-slate-600";
            }
            renderedParts.push(
                <div 
                    key={`cb-${i}`}
                    className="flex items-start gap-2 w-full text-left py-1 px-1 mb-0.5 cursor-default"
                    style={{ marginLeft: `${indent}px` }}
                >
                    <div className={`mt-0.5 shrink-0 ${iconClass}`}>
                        <Icon size={16} strokeWidth={1} />
                    </div>
                    <span className={`text-sm text-slate-700 dark:text-slate-300`}>
                        <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{label}</ReactMarkdown>
                    </span>
                </div>
            );
        } else {
            textBuffer += line + '\n';
        }
    });
    flushBuffer('end');
    return <>{renderedParts}</>;
};

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, notes, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask, onNavigateToNote, onRequestNoteSelection }) => {
  const [hasCreationContent, setHasCreationContent] = useState(false);
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({from: '', to: ''});
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Creation Editor State
  const creationContentEditableRef = useRef<HTMLDivElement>(null);
  const [creationHistory, setCreationHistory] = useState<string[]>(['']);
  const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
  const creationHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creationFileInputRef = useRef<HTMLInputElement>(null);
  
  // New Creation Fields
  const [creationTitle, setCreationTitle] = useState('');
  const [creationCover, setCreationCover] = useState<string | null>(null);
  const [creationColor, setCreationColor] = useState('white');
  const [showCreationCoverPicker, setShowCreationCoverPicker] = useState(false);
  const [showCreationColorPicker, setShowCreationColorPicker] = useState(false);
  const creationPickerTriggerRef = useRef<HTMLButtonElement>(null);
  const creationColorTriggerRef = useRef<HTMLButtonElement>(null);

  // Edit Modal Editor State
  const editContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [editHistory, setEditHistory] = useState<string[]>(['']);
  const [editHistoryIndex, setEditHistoryIndex] = useState(0);
  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
  const lastSelectionRange = useRef<Range | null>(null);
  const editHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editPickerTriggerRef = useRef<HTMLButtonElement>(null);
  
  // New Edit Fields
  const [editTitle, setEditTitle] = useState('');
  const [editCover, setEditCover] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('white');
  const [showEditCoverPicker, setShowEditCoverPicker] = useState(false);
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);
  const editColorTriggerRef = useRef<HTMLButtonElement>(null);

  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const analysisAbortController = useRef<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const { scrollY } = useScroll({ container: scrollContainerRef });

  const [isCreationExpanded, setIsCreationExpanded] = useState(false);
  const creationRef = useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollY, "change", (latest) => {
      const previous = scrollY.getPrevious() || 0;
      const diff = latest - previous;
      const isScrollingDown = diff > 0;
      if (latest > 100 && isScrollingDown) setIsHeaderHidden(true);
      else setIsHeaderHidden(false);
  });

  const hasMentorTool = useMemo(() => {
      const tool = config.aiTools.find(t => t.id === 'journal_mentor');
      return tool && !tool.isDisabled;
  }, [config.aiTools]);

  const selectedEntry = useMemo(() => entries.find(e => e.id === selectedEntryId), [entries, selectedEntryId]);
  const selectedLinkedTask = useMemo(() => selectedEntry ? tasks.find(t => t.id === selectedEntry.linkedTaskId) : null, [selectedEntry, tasks]);
  const selectedLinkedNote = useMemo(() => selectedEntry ? notes.find(n => n.id === selectedEntry.linkedNoteId) : null, [selectedEntry, notes]);
  
  // Multiple notes support
  const selectedLinkedNotes = useMemo(() => {
      if (!selectedEntry) return [];
      const ids = new Set<string>();
      if (selectedEntry.linkedNoteId) ids.add(selectedEntry.linkedNoteId);
      if (selectedEntry.linkedNoteIds) selectedEntry.linkedNoteIds.forEach(id => ids.add(id));
      
      return Array.from(ids).map(id => notes.find(n => n.id === id)).filter(Boolean) as Note[];
  }, [selectedEntry, notes]);

  useEffect(() => {
    if (initialTaskId) {
      const taskExists = tasks.some(t => t.id === initialTaskId);
      if (taskExists) {
        setLinkedTaskId(initialTaskId);
        onClearInitialTask?.();
        setIsCreationExpanded(true); 
      }
    }
  }, [initialTaskId, tasks, onClearInitialTask]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
          setShowDatePicker(false);
        }
      };
      if (showDatePicker) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  // Click outside creation block to close if empty
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        // Prevent closing if any picker is active
        if (showCreationCoverPicker || showCreationColorPicker) return;

        if (creationRef.current && !creationRef.current.contains(event.target as Node)) {
            // Only close if no content and no context selected
            if (!hasCreationContent && !linkedTaskId && selectedSpheres.length === 0 && !creationTitle) {
                setIsCreationExpanded(false);
            }
        }
    };
    if (isCreationExpanded) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCreationExpanded, hasCreationContent, linkedTaskId, selectedSpheres, creationTitle, showCreationCoverPicker, showCreationColorPicker]);

  // --- CREATION EDITOR HELPERS ---
  const saveCreationHistorySnapshot = useCallback((content: string) => {
      if (content === creationHistory[creationHistoryIndex]) return;
      const newHistory = creationHistory.slice(0, creationHistoryIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 50) newHistory.shift();
      setCreationHistory(newHistory);
      setCreationHistoryIndex(newHistory.length - 1);
  }, [creationHistory, creationHistoryIndex]);

  const handleCreationInput = () => {
      if (creationContentEditableRef.current) {
          setHasCreationContent(creationContentEditableRef.current.innerText.trim().length > 0 || !!creationContentEditableRef.current.querySelector('img'));
      }
      if (creationHistoryTimeoutRef.current) clearTimeout(creationHistoryTimeoutRef.current);
      creationHistoryTimeoutRef.current = setTimeout(() => {
          if (creationContentEditableRef.current) saveCreationHistorySnapshot(creationContentEditableRef.current.innerHTML);
      }, 500); 
  };

  const execCreationCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (creationContentEditableRef.current) {
          creationContentEditableRef.current.focus();
          saveCreationHistorySnapshot(creationContentEditableRef.current.innerHTML);
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

  const handleClearCreationStyle = (e: React.MouseEvent) => {
      e.preventDefault();
      execCreationCmd('removeFormat');
      execCreationCmd('formatBlock', 'div'); 
  };

  const handleCreationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && creationContentEditableRef.current) {
          try {
              const compressedBase64 = await processImage(file);
              insertImageAtCursor(compressedBase64, creationContentEditableRef.current);
              saveCreationHistorySnapshot(creationContentEditableRef.current.innerHTML);
              setHasCreationContent(true);
          } catch (err) { console.error("Image upload failed", err); }
          e.target.value = '';
      }
  };

  // --- EDIT MODAL EDITOR LOGIC ---
  const saveEditHistorySnapshot = useCallback((content: string) => {
      if (content === editHistory[editHistoryIndex]) return;
      const newHistory = editHistory.slice(0, editHistoryIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 50) newHistory.shift();
      setEditHistory(newHistory);
      setEditHistoryIndex(newHistory.length - 1);
  }, [editHistory, editHistoryIndex]);

  const handleEditorInput = () => {
      if (editHistoryTimeoutRef.current) clearTimeout(editHistoryTimeoutRef.current);
      editHistoryTimeoutRef.current = setTimeout(() => {
          if (editContentRef.current) saveEditHistorySnapshot(editContentRef.current.innerHTML);
      }, 500); 
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (editContentRef.current) {
          editContentRef.current.focus();
          saveEditHistorySnapshot(editContentRef.current.innerHTML);
      }
  };

  const execUndo = () => {
      if (editHistoryIndex > 0) {
          const prevIndex = editHistoryIndex - 1;
          setEditHistoryIndex(prevIndex);
          if (editContentRef.current) editContentRef.current.innerHTML = editHistory[prevIndex];
      }
  };

  const execRedo = () => {
      if (editHistoryIndex < editHistory.length - 1) {
          const nextIndex = editHistoryIndex + 1;
          setEditHistoryIndex(nextIndex);
          if (editContentRef.current) editContentRef.current.innerHTML = editHistory[nextIndex];
      }
  };

  const handleClearStyle = (e: React.MouseEvent) => {
      e.preventDefault();
      execCmd('removeFormat');
      execCmd('formatBlock', 'div'); 
  };

  const insertImageAtCursor = (base64: string, targetEl: HTMLElement) => {
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
        // Only save history if specific editor called it, usually handled by caller
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && editContentRef.current) {
          try {
              const compressedBase64 = await processImage(file);
              insertImageAtCursor(compressedBase64, editContentRef.current);
              saveEditHistorySnapshot(editContentRef.current.innerHTML);
          } catch (err) { console.error("Image upload failed", err); }
          e.target.value = '';
      }
  };

  const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          // Check Edit Editor
          if (editContentRef.current && editContentRef.current.contains(range.commonAncestorContainer)) {
              lastSelectionRange.current = range.cloneRange();
          }
          // Check Creation Editor
          if (creationContentEditableRef.current && creationContentEditableRef.current.contains(range.commonAncestorContainer)) {
              lastSelectionRange.current = range.cloneRange();
          }
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
          const isCreation = creationContentEditableRef.current && creationContentEditableRef.current.contains(activeImage);
          const isEdit = editContentRef.current && editContentRef.current.contains(activeImage);

          activeImage.remove();
          setActiveImage(null);
          
          if (isEdit && editContentRef.current) saveEditHistorySnapshot(editContentRef.current.innerHTML);
          if (isCreation && creationContentEditableRef.current) {
              saveCreationHistorySnapshot(creationContentEditableRef.current.innerHTML);
              setHasCreationContent(creationContentEditableRef.current.innerText.trim().length > 0 || !!creationContentEditableRef.current.querySelector('img'));
          }
      }
  };

  // Image Paste Listener
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
        const target = e.target as HTMLElement;
        let activeEditor = null;
        
        if (editContentRef.current && (editContentRef.current === target || editContentRef.current.contains(target))) {
            activeEditor = editContentRef.current;
        } else if (creationContentEditableRef.current && (creationContentEditableRef.current === target || creationContentEditableRef.current.contains(target))) {
            activeEditor = creationContentEditableRef.current;
        }

        if (!activeEditor) return;

        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    try {
                        const compressedBase64 = await processImage(blob);
                        insertImageAtCursor(compressedBase64, activeEditor);
                        if (activeEditor === editContentRef.current) saveEditHistorySnapshot(activeEditor.innerHTML);
                        else {
                            saveCreationHistorySnapshot(activeEditor.innerHTML);
                            setHasCreationContent(true);
                        }
                    } catch (err) { console.error("Image paste failed", err); }
                }
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editingId, isCreationExpanded]);

  // Init Editor Content
  useEffect(() => {
      if (editingId && selectedEntry && editContentRef.current) {
          const html = markdownToHtml(selectedEntry.content);
          editContentRef.current.innerHTML = html;
          setEditHistory([html]);
          setEditHistoryIndex(0);
          setEditTitle(selectedEntry.title || '');
          setEditCover(selectedEntry.coverUrl || null);
          setEditColor(selectedEntry.color || 'white');
      }
  }, [editingId, selectedEntry]);

  // ----------------------

  const availableTasks = tasks.filter(t => !t.isArchived && (t.column === 'doing' || t.column === 'done') || t.id === linkedTaskId);

  const handlePost = () => {
    const rawHtml = creationContentEditableRef.current?.innerHTML || '';
    const markdownContent = htmlToMarkdown(rawHtml);
    if (!markdownContent.trim() && !creationTitle.trim()) return;
    
    const formattedContent = applyTypography(markdownContent);
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: Date.now(),
      title: creationTitle.trim() ? applyTypography(creationTitle.trim()) : undefined,
      content: formattedContent,
      linkedTaskId: linkedTaskId || undefined,
      spheres: selectedSpheres,
      color: creationColor,
      coverUrl: creationCover || undefined,
    };
    addEntry(newEntry);
    
    if (creationContentEditableRef.current) creationContentEditableRef.current.innerHTML = '';
    setHasCreationContent(false);
    setCreationHistory(['']);
    setCreationHistoryIndex(0);
    setLinkedTaskId('');
    setSelectedSpheres([]);
    setCreationTitle('');
    setCreationColor('white');
    setCreationCover(null);
    setIsCreationExpanded(false);
  };

  const startEditing = (entry: JournalEntry) => {
    setEditingId(entry.id);
  };

  const saveEdit = (entry: JournalEntry) => {
    if (editContentRef.current) {
        const rawHtml = editContentRef.current.innerHTML;
        const markdownContent = htmlToMarkdown(rawHtml);
        
        if (markdownContent.trim() || editTitle.trim()) {
            updateEntry({ 
                ...entry, 
                content: markdownContent,
                title: editTitle.trim() ? applyTypography(editTitle.trim()) : undefined,
                color: editColor,
                coverUrl: editCover || undefined
            });
            setEditingId(null);
        }
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const toggleInsight = (entry: JournalEntry) => {
      updateEntry({ ...entry, isInsight: !entry.isInsight });
  };

  const handleCloseModal = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setSelectedEntryId(null);
      setEditingId(null);
  };

  const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
    const Icon = ICON_MAP[name] || ICON_MAP['User'];
    return <Icon className={className} size={14} strokeWidth={1} />;
  };

  const filteredEntries = entries.filter(entry => {
    const query = searchQuery.toLowerCase();
    if (dateRange.from) {
        const fromDate = new Date(dateRange.from + 'T00:00:00');
        if (entry.date < fromDate.getTime()) return false;
    }
    if (dateRange.to) {
        const toDate = new Date(dateRange.to + 'T23:59:59.999');
        if (entry.date > toDate.getTime()) return false;
    }
    if (!query) return true;
    if (entry.title?.toLowerCase().includes(query)) return true;
    if (entry.content.toLowerCase().includes(query)) return true;
    if (entry.aiFeedback?.toLowerCase().includes(query)) return true;
    const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
    if (linkedTask?.content.toLowerCase().includes(query)) return true;
    return false;
  });

  const displayedEntries = [...filteredEntries].sort((a, b) => {
    return sortOrder === 'desc' ? b.date - a.date : a.date - b.date;
  });

  const handleAnalyzePath = async () => {
      // STOP LOGIC
      if (isAnalyzing) {
          analysisAbortController.current?.abort();
          setIsAnalyzing(false);
          return;
      }

      if (displayedEntries.length === 0) {
          alert("Нет записей для анализа в текущем фильтре.");
          return;
      }

      if (!window.confirm("Запустить ИИ-наставника?")) return;

      setIsAnalyzing(true);
      analysisAbortController.current = new AbortController();
      
      try {
        const result = await analyzeJournalPath(displayedEntries, config);
        if (!analysisAbortController.current?.signal.aborted) {
            setAnalysisResult(result);
            setIsAnalyzing(false);
        }
      } catch (e) {
        if (!analysisAbortController.current?.signal.aborted) {
            setIsAnalyzing(false);
        }
      }
  };

  const handleSaveAnalysis = () => {
    if (analysisResult) {
       addMentorAnalysis({
          id: Date.now().toString(),
          date: Date.now(),
          content: analysisResult,
          mentorName: 'Наставник (ИИ)'
       });
       alert('Сохранено в Историю Наставника');
       setAnalysisResult(null);
    }
  };

  const hasActiveDateFilter = !!dateRange.from || !!dateRange.to;

  const formatDate = (timestamp: number) => {
      return new Date(timestamp)
          .toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })
          .toUpperCase();
  };

  const formatTimelineDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return {
        day: d.getDate(),
        month: d.toLocaleString('ru-RU', { month: 'short' }).toUpperCase().replace('.', '')
    }
  };

  const actionButtonStyle = "p-3 rounded-2xl border transition-all flex items-center justify-center aspect-square bg-white dark:bg-[#1e293b] border-transparent shadow-sm text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20";

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
        
        {/* HEADER (Main) */}
        <div className="shrink-0 w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 z-50">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">
                        Дневник
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Факты, эмоции, гипотезы</p>
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip content="История консультаций">
                        <button 
                            onClick={() => setShowHistory(true)}
                            className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                            <History size={16} /> <span className="hidden md:inline">История</span>
                        </button>
                    </Tooltip>
                    
                    {hasMentorTool && (
                        <Tooltip content={isAnalyzing ? "Остановить анализ" : "Запросить анализ (ИИ)"}>
                            <button 
                                onClick={handleAnalyzePath}
                                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-sm ${
                                    isAnalyzing 
                                    ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
                                }`}
                            >
                                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                <span className="hidden md:inline">{isAnalyzing ? 'Стоп' : 'Анализ'}</span>
                            </button>
                        </Tooltip>
                    )}
                </div>
             </header>
        </div>

        {/* MAIN SCROLL AREA */}
        <div 
            className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar-light pb-20"
            ref={scrollContainerRef}
        >
             {/* Sticky Search/Toolbar */}
             <motion.div 
                className="sticky top-0 z-40 w-full mb-[-20px]"
                animate={{ y: isHeaderHidden ? '-100%' : '0%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
             >
                 {/* FOG LAYER */}
                 <div className="absolute inset-0 h-[140%] pointer-events-none -z-10">
                    <div 
                        className="absolute inset-0 backdrop-blur-xl bg-[#f8fafc]/90 dark:bg-[#0f172a]/90"
                        style={{
                            maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)'
                        }}
                    />
                </div>
                
                <div className="relative z-10 w-full px-4 md:px-8 pb-2">
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="flex gap-2">
                            <div className="relative flex-1 group">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" strokeWidth={1} />
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Поиск"
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-shadow shadow-sm placeholder:text-slate-400"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>
                                )}
                            </div>
                            
                            <div className="relative" ref={datePickerRef}>
                                <Tooltip content="Фильтр по дате">
                                    <button 
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        className={`${actionButtonStyle} ${hasActiveDateFilter || showDatePicker ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : ''}`}
                                    >
                                        <Calendar size={18} strokeWidth={1} />
                                        {hasActiveDateFilter && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                                    </button>
                                </Tooltip>
                                {showDatePicker && (
                                    <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 w-64 p-4 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Период</span>
                                            {hasActiveDateFilter && (
                                                <button onClick={() => setDateRange({from: '', to: ''})} className="text-[10px] text-red-400 hover:text-red-600 font-medium">
                                                    Сбросить
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <div><label className="block text-[10px] text-slate-400 mb-1 ml-1">С даты</label><input type="date" value={dateRange.from} onChange={(e) => setDateRange({...dateRange, from: e.target.value})} className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-300" /></div>
                                            <div><label className="block text-[10px] text-slate-400 mb-1 ml-1">По дату</label><input type="date" value={dateRange.to} onChange={(e) => setDateRange({...dateRange, to: e.target.value})} className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-300" /></div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-center"><button onClick={() => setShowDatePicker(false)} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Готово</button></div>
                                    </div>
                                )}
                            </div>
                            <Tooltip content={sortOrder === 'desc' ? "Новые сверху" : "Старые сверху"}>
                                <button 
                                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                    className={actionButtonStyle}
                                >
                                    {sortOrder === 'desc' ? <ArrowDown size={18} strokeWidth={1} /> : <ArrowUp size={18} strokeWidth={1} />}
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
             </motion.div>

             <div className="w-full px-4 md:px-8 pt-6 pb-8 relative z-10">
                {/* CREATION BLOCK (COLLAPSIBLE) */}
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
                                                <Target size={10} strokeWidth={1} /> Сферы
                                            </label>
                                            <SphereSelector selected={selectedSpheres} onChange={setSelectedSpheres} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 pl-1 tracking-widest font-mono">
                                                <Link size={10} strokeWidth={1} /> Контекст
                                            </label>
                                            <TaskSelect tasks={availableTasks} selectedId={linkedTaskId} onSelect={setLinkedTaskId} />
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
                                            data-placeholder="О чем ты думаешь?"
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
                                            {activeImage && !editingId && <Tooltip content="Удалить картинку"><button onMouseDown={deleteActiveImage} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"><Trash2 size={16} /></button></Tooltip>}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <div className="relative">
                                                <Tooltip content="Обложка">
                                                    <button 
                                                        ref={creationPickerTriggerRef}
                                                        onMouseDown={(e) => { e.preventDefault(); setShowCreationCoverPicker(!showCreationCoverPicker); }} 
                                                        className={`p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors ${creationCover ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
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
                                                        className={`p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors ${creationColor !== 'white' ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                                    >
                                                        <Palette size={16} />
                                                    </button>
                                                </Tooltip>
                                                {showCreationColorPicker && <ColorPickerPopover onSelect={setCreationColor} onClose={() => setShowCreationColorPicker(false)} triggerRef={creationColorTriggerRef} />}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-2">
                                        <button 
                                            onClick={() => setIsCreationExpanded(false)}
                                            className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            Отмена
                                        </button>
                                        <button 
                                            onClick={handlePost} 
                                            disabled={!hasCreationContent && !creationTitle}
                                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                        >
                                            <Send size={14} /> Записать
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto w-full relative">
                    {/* Timeline Spine */}
                    <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />

                    {displayedEntries.length === 0 ? (
                        <div className="py-20">
                            <EmptyState 
                                icon={Book} 
                                title="Чистый лист" 
                                description="История начинается с первого шага" 
                                color="cyan"
                            />
                        </div>
                    ) : (
                        <div className="space-y-8 pb-12">
                            {displayedEntries.map((entry, index) => {
                                const showDateHeader = index === 0 || new Date(entry.date).toDateString() !== new Date(displayedEntries[index - 1].date).toDateString();
                                const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
                                const previewContent = getLinkedContentPreview(entry.content);
                                const hasMoreContent = entry.content.length > previewContent.length || entry.content.includes('\n');
                                const timelineDate = formatTimelineDate(entry.date);
                                
                                const linkedNotes = [
                                    ...(entry.linkedNoteId ? [notes.find(n => n.id === entry.linkedNoteId)] : []),
                                    ...(entry.linkedNoteIds ? entry.linkedNoteIds.map(id => notes.find(n => n.id === id)) : [])
                                ].filter(Boolean) as Note[];

                                return (
                                    <motion.div 
                                        key={entry.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="relative group md:pl-20"
                                    >
                                        {/* Timeline Node (Desktop) */}
                                        <div className="absolute left-6 md:left-8 top-6 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-500 group-hover:scale-125 transition-all z-10 hidden md:block shadow-sm" />
                                        
                                        {/* Date Marker (Desktop) */}
                                        <div className="absolute left-0 top-6 -translate-x-full pr-6 text-right hidden md:block w-20">
                                            <div className="text-xl font-light text-slate-800 dark:text-slate-200 leading-none">{timelineDate.day}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{timelineDate.month}</div>
                                            <div className="text-[10px] font-mono text-slate-300 dark:text-slate-600 mt-1">{new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        </div>

                                        {/* Mobile Date Header */}
                                        {showDateHeader && (
                                            <div className="md:hidden mb-4 flex items-center gap-4">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                                    {formatDate(entry.date)}
                                                </div>
                                                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
                                            </div>
                                        )}

                                        <div 
                                            onClick={() => setSelectedEntryId(entry.id)}
                                            className={`${getJournalColorClass(entry.color)} backdrop-blur-sm rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200/60 dark:border-slate-700/60 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 transition-all cursor-pointer relative overflow-hidden group/card`}
                                        >
                                            {/* Top Action Bar (Visible on Hover) */}
                                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-20">
                                                <button onClick={(e) => { e.stopPropagation(); toggleInsight(entry); }} className={`p-2 rounded-full transition-colors ${entry.isInsight ? 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'text-slate-400 hover:text-violet-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`} title="Инсайт">
                                                    <Zap size={16} className={entry.isInsight ? "fill-current" : ""} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); startEditing(entry); setSelectedEntryId(entry.id); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                                    <Edit3 size={16} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); if(confirm('В архив?')) deleteEntry(entry.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            {/* Insight Marker */}
                                            {entry.isInsight && (
                                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-400 to-purple-600" />
                                            )}

                                            {entry.coverUrl && (
                                                <div className="h-40 w-full shrink-0 relative mb-4 -mx-5 -mt-5 md:-mx-6 md:-mt-6 w-[calc(100%_+_2.5rem)] md:w-[calc(100%_+_3rem)] overflow-hidden">
                                                    <img src={entry.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                                </div>
                                            )}

                                            <div className="mb-2 pr-16">
                                                {entry.title && <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 leading-snug">{applyTypography(entry.title)}</h3>}
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {entry.spheres && <SphereBadgeList spheres={entry.spheres} />}
                                                    {entry.mood && (
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border bg-white dark:bg-slate-800 ${MOODS[entry.mood-1]?.text} border-slate-100 dark:border-slate-700`}>
                                                            {MOODS[entry.mood-1]?.label} {MOODS[entry.mood-1]?.emoji}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-slate-600 dark:text-slate-300 font-serif text-sm leading-relaxed line-clamp-4 mb-3">
                                                <ReactMarkdown components={markdownComponents}>{applyTypography(entry.content)}</ReactMarkdown>
                                            </div>

                                            {/* Linked Content Preview */}
                                            {(linkedTask || linkedNotes.length > 0) && (
                                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col gap-2">
                                                    {linkedTask && (
                                                        <div 
                                                            onClick={(e) => { e.stopPropagation(); if (onNavigateToTask) onNavigateToTask(linkedTask.id); }}
                                                            className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer group/link bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-transparent hover:border-indigo-100"
                                                        >
                                                            <div className="p-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 group-hover/link:border-indigo-200">
                                                                <Link size={10} />
                                                            </div>
                                                            <span className="truncate font-medium">{linkedTask.title || linkedTask.content}</span>
                                                        </div>
                                                    )}
                                                    {linkedNotes.map(note => (
                                                        <div 
                                                            key={note.id}
                                                            onClick={(e) => { e.stopPropagation(); if (onNavigateToNote) onNavigateToNote(note.id); }}
                                                            className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer group/link bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-transparent hover:border-indigo-100"
                                                        >
                                                            <div className="p-1 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 group-hover/link:border-indigo-200">
                                                                <StickyNote size={10} />
                                                            </div>
                                                            <span className="truncate font-medium">{note.title || getLinkedContentPreview(note.content)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
             </div>
        </div>

        {/* DETAILS MODAL */}
        <AnimatePresence>
            {selectedEntryId && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCloseModal}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-[40px] saturate-150 border border-black/5 dark:border-white/10 rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] relative overflow-hidden"
                    >
                        {/* Cover Image in Modal */}
                        {(editingId === selectedEntry?.id ? editCover : selectedEntry?.coverUrl) && (
                            <div className="h-48 shrink-0 relative group">
                                <img 
                                    src={editingId === selectedEntry?.id ? editCover! : selectedEntry!.coverUrl!} 
                                    alt="Cover" 
                                    className="w-full h-full object-cover" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                                {editingId && (
                                    <button onClick={() => setEditCover(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={16} /></button>
                                )}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-8 relative">
                            {/* Close Button */}
                            <button 
                                onClick={handleCloseModal}
                                className="absolute top-6 right-6 p-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-full transition-colors z-20"
                            >
                                <X size={20} className="text-slate-500 dark:text-slate-300" />
                            </button>

                            {selectedEntry && (
                                <div className="space-y-6">
                                    {/* Header Meta */}
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            <span>{new Date(selectedEntry.date).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>{new Date(selectedEntry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            {selectedEntry.isInsight && (
                                                <span className="flex items-center gap-1 text-violet-500 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">
                                                    <Zap size={10} className="fill-current" /> INSIGHT
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Edit Mode: Title Input */}
                                        {editingId === selectedEntry.id ? (
                                            <input 
                                                className="text-2xl md:text-3xl font-bold bg-transparent border-b border-slate-200 dark:border-slate-700 w-full outline-none py-1 text-slate-900 dark:text-white"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                placeholder="Заголовок..."
                                                autoFocus
                                            />
                                        ) : (
                                            selectedEntry.title && <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white leading-tight">{selectedEntry.title}</h2>
                                        )}
                                    </div>

                                    {/* Edit Mode: Editor */}
                                    {editingId === selectedEntry.id ? (
                                        <div className="space-y-4">
                                            {/* Toolbar */}
                                            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 gap-2">
                                                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 mask-fade-right">
                                                    <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execUndo(); }} disabled={editHistoryIndex <= 0} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                                    <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execRedo(); }} disabled={editHistoryIndex >= editHistory.length - 1} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                    <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Bold size={16} /></button></Tooltip>
                                                    <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Italic size={16} /></button></Tooltip>
                                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                    <Tooltip content="Очистить"><button onMouseDown={handleClearStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Eraser size={16} /></button></Tooltip>
                                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                    <Tooltip content="Вставить картинку"><label className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer text-slate-400 dark:text-slate-500 flex items-center justify-center"><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /><ImageIcon size={16} /></label></Tooltip>
                                                    {activeImage && <Tooltip content="Удалить картинку"><button onMouseDown={deleteActiveImage} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"><Trash2 size={16} /></button></Tooltip>}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <div className="relative">
                                                        <Tooltip content="Обложка">
                                                            <button 
                                                                ref={editPickerTriggerRef}
                                                                onMouseDown={(e) => { e.preventDefault(); setShowEditCoverPicker(!showEditCoverPicker); }} 
                                                                className={`p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors ${editCover ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`}
                                                            >
                                                                <Layout size={16} />
                                                            </button>
                                                        </Tooltip>
                                                        {showEditCoverPicker && <CoverPicker onSelect={setEditCover} onClose={() => setShowEditCoverPicker(false)} triggerRef={editPickerTriggerRef} />}
                                                    </div>
                                                    <div className="relative">
                                                        <Tooltip content="Фон записи">
                                                            <button 
                                                                ref={editColorTriggerRef}
                                                                onMouseDown={(e) => { e.preventDefault(); setShowEditColorPicker(!showEditColorPicker); }} 
                                                                className={`p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors ${editColor !== 'white' ? 'text-indigo-500' : ''}`}
                                                            >
                                                                <Palette size={16} />
                                                            </button>
                                                        </Tooltip>
                                                        {showEditColorPicker && <ColorPickerPopover onSelect={setEditColor} onClose={() => setShowEditColorPicker(false)} triggerRef={editColorTriggerRef} />}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div 
                                                ref={editContentRef}
                                                contentEditable
                                                onInput={handleEditorInput}
                                                onClick={handleEditorClick}
                                                onBlur={saveSelection}
                                                onMouseUp={saveSelection}
                                                onKeyUp={saveSelection}
                                                className="w-full min-h-[300px] outline-none text-base text-slate-800 dark:text-slate-200 font-serif leading-relaxed custom-scrollbar-ghost [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1"
                                            />

                                            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                                                <JournalEntrySphereSelector entry={selectedEntry} updateEntry={updateEntry} align="left" direction="up" />
                                            </div>

                                            <div className="flex justify-end gap-3 pt-4">
                                                <button onClick={cancelEditing} className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors">Отмена</button>
                                                <button onClick={() => saveEdit(selectedEntry)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 shadow-md">Сохранить</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-slate-800 dark:text-slate-200 font-serif text-lg leading-8">
                                                <ReactMarkdown 
                                                    components={markdownComponents} 
                                                    urlTransform={allowDataUrls}
                                                    remarkPlugins={[remarkGfm]}
                                                    rehypePlugins={[rehypeRaw]}
                                                >
                                                    {selectedEntry.content.replace(/\n/g, '  \n')}
                                                </ReactMarkdown>
                                                {(() => { const url = findFirstUrl(selectedEntry.content); return url ? <div className="mt-6"><LinkPreview url={url} /></div> : null; })()}
                                            </div>

                                            {/* Linked Items Section */}
                                            {(selectedLinkedTask || selectedLinkedNotes.length > 0) && (
                                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Связанные материалы</h4>
                                                    <div className="flex flex-col gap-3">
                                                        {selectedLinkedTask && (
                                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-start gap-4 group cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-900 transition-all" onClick={() => onNavigateToTask && onNavigateToTask(selectedLinkedTask.id)}>
                                                                <div className="p-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                                    <Link size={16} />
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Задача</div>
                                                                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2">{selectedLinkedTask.title || selectedLinkedTask.content}</div>
                                                                </div>
                                                                <ArrowRight size={16} className="ml-auto text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        )}
                                                        {selectedLinkedNotes.map(note => (
                                                            <div key={note.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-start gap-4 group cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-900 transition-all" onClick={() => onNavigateToNote && onNavigateToNote(note.id)}>
                                                                <div className="p-2 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                                    <StickyNote size={16} />
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">Заметка</div>
                                                                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2">{note.title || getLinkedContentPreview(note.content)}</div>
                                                                </div>
                                                                <ArrowRight size={16} className="ml-auto text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        ))}
                                                        <button 
                                                            onClick={() => onRequestNoteSelection && onRequestNoteSelection(selectedEntry.id)}
                                                            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-400 transition-colors text-sm"
                                                        >
                                                            <Plus size={16} /> Привязать заметку
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action Footer */}
                                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                                <div className="flex gap-2">
                                                    <JournalEntrySphereSelector entry={selectedEntry} updateEntry={updateEntry} align="left" direction="up" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => { startEditing(selectedEntry); }} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"><Edit3 size={18} /></button>
                                                    <button onClick={() => { if(confirm('Удалить запись?')) { deleteEntry(selectedEntry.id); handleCloseModal(); } }} className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={18} /></button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* ANALYSIS RESULT MODAL (FULLSCREEN) */}
        <AnimatePresence>
            {analysisResult && (
                <div className="fixed inset-0 z-[120] bg-white/95 dark:bg-[#020617]/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-3xl min-h-screen md:min-h-0 md:h-auto bg-transparent relative flex flex-col py-12 md:py-0"
                    >
                        <button onClick={() => setAnalysisResult(null)} className="fixed top-6 right-6 p-2 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 rounded-full transition-colors z-50">
                            <X size={24} className="text-slate-500 dark:text-slate-300" />
                        </button>

                        <div className="text-center mb-12">
                            <div className="inline-flex items-center justify-center p-4 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-6 shadow-sm">
                                <Sparkles size={32} strokeWidth={1.5} />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-serif text-slate-900 dark:text-slate-100 tracking-tight">Отчет Наставника</h2>
                            <p className="text-slate-500 mt-2 font-mono text-xs uppercase tracking-widest">Анализ Пути Героя</p>
                        </div>

                        <div className="prose prose-lg dark:prose-invert max-w-none mb-12 px-4 md:px-0">
                            <ReactMarkdown components={HologramMarkdown}>{analysisResult}</ReactMarkdown>
                        </div>

                        <div className="flex justify-center pb-12">
                            <button 
                                onClick={handleSaveAnalysis}
                                className="px-8 py-4 bg-indigo-600 text-white rounded-full font-bold uppercase tracking-widest shadow-lg hover:bg-indigo-700 hover:shadow-indigo-200/50 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-3"
                            >
                                <Save size={18} /> Сохранить в Историю
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Journal;