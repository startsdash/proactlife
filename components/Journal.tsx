import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { ICON_MAP, applyTypography, SPHERES } from '../constants';
import { analyzeJournalPath } from '../services/geminiService';
import { Book, Zap, Calendar, Trash2, ChevronDown, CheckCircle2, Circle, Link, Edit3, X, Check, ArrowDown, ArrowUp, Search, Filter, Eye, FileText, Plus, Minus, MessageCircle, History, Kanban, Loader2, Save, Send, Target, Sparkle, Sparkles, Star, XCircle, Gem, PenTool, RotateCcw, RotateCw, Bold, Italic, Eraser, Image as ImageIcon, Layout, Palette, ArrowRight, RefreshCw, Upload, Shuffle, Globe } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';

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

const UNSPLASH_PRESETS = [
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
];

const getJournalColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

// --- HELPER FUNCTIONS ---

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
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-inherit pl-0 ml-0" {...props} />,
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
            <button 
                ref={triggerRef}
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent pl-0 pr-2 py-1 rounded transition-colors uppercase tracking-widest"
            >
                {entry.spheres && entry.spheres.length > 0 ? (
                    <div className="flex -space-x-1">
                        {entry.spheres.map(s => {
                            const sp = SPHERES.find(x => x.id === s);
                            return sp ? (
                                <div 
                                    key={s} 
                                    className={`w-2 h-2 rounded-full border bg-transparent ${sp.text.replace('text-', 'border-')}`} 
                                    style={{ borderWidth: '1px' }}
                                />
                            ) : null;
                        })}
                    </div>
                ) : (
                    <Target size={10} strokeWidth={1.5} />
                )}
                <span>Сфера</span>
            </button>
            
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
}> = ({ title, children, icon, actions }) => {
  const [isOpen, setIsOpen] = useState(false);

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

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask }) => {
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
                                        </div>
                                        {/* Right Container for Styling */}
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
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

                {displayedEntries.length === 0 ? (
                <div className="py-10">
                    <EmptyState 
                        icon={Book} 
                        title="Страницы пусты" 
                        description={searchQuery || hasActiveDateFilter ? 'Ничего не найдено по вашему запросу' : 'Записывай свои мысли, связывай их с задачами, чтобы отслеживать свой путь'}
                        color="cyan"
                    />
                </div>
                ) : (
                <div className="w-full max-w-3xl mx-auto relative space-y-6">
                    {displayedEntries.map(entry => {
                        const mentor = config.mentors.find(m => m.id === entry.mentorId);
                        const isEditing = editingId === entry.id;
                        const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
                        const linkUrl = findFirstUrl(entry.content);
                        const tDate = formatTimelineDate(entry.date);
                        
                        return (
                            <div key={entry.id} className="relative group">
                                {/* Entry Card */}
                                <div 
                                    onClick={() => setSelectedEntryId(entry.id)} 
                                    className={`relative rounded-2xl border transition-all duration-300 group cursor-pointer overflow-hidden flex flex-col
                                        ${getJournalColorClass(entry.color)} border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md
                                    `}
                                >
                                    {/* Cover Image - Top Full Width */}
                                    {entry.coverUrl && (
                                        <div className="h-40 w-full relative overflow-hidden shrink-0 border-b border-slate-100 dark:border-slate-800/50">
                                            <img src={entry.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    {/* Body Container */}
                                    <div className="flex flex-col md:flex-row flex-1">
                                        
                                        {/* Left Column: Timeline Info (Centered Vertically) */}
                                        <div className="md:w-24 w-full shrink-0 flex md:flex-col flex-row items-center justify-center md:py-6 p-4 relative border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/50">
                                            {/* Vertical Line */}
                                            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-slate-200/50 dark:bg-slate-700/50" />
                                            
                                            {/* Date Content - On top of line */}
                                            <div className={`relative z-10 flex flex-col items-center gap-2 p-2 rounded-xl backdrop-blur-sm shadow-sm border border-slate-100/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50`}>
                                                <div className="text-center leading-none">
                                                    <span className="font-mono text-xl font-bold text-slate-400 dark:text-slate-500 block">{tDate.day}</span>
                                                    <span className="font-mono text-[9px] text-slate-400 uppercase font-bold tracking-wider">{tDate.month}</span>
                                                </div>
                                                
                                                <div className={`w-2 h-2 rounded-full border border-white dark:border-slate-800 transition-all duration-500 ${entry.isInsight ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                            </div>

                                            {/* Mobile Extra Info */}
                                            <div className="md:hidden flex-1 text-right ml-auto">
                                                <span className="font-mono text-[9px] text-slate-400">{formatDate(entry.date).split(',')[0]}</span>
                                            </div>
                                        </div>

                                        {/* Main Content */}
                                        <div className="flex-1 flex flex-col min-w-0 p-6 md:p-8 relative"> {/* added relative */}
                                            {/* Header Actions (Insight/Edit) */}
                                            {entry.title ? (
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-sans text-2xl font-semibold text-slate-900 dark:text-slate-100 leading-tight break-words">{entry.title}</h3>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 -mt-1 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                        {!isEditing && (
                                                            <Tooltip content={entry.isInsight ? "Убрать из инсайтов" : "Отметить как инсайт"}>
                                                                <button 
                                                                    onClick={() => toggleInsight(entry)} 
                                                                    className={`p-1.5 rounded-lg transition-all ${
                                                                        entry.isInsight 
                                                                        ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" 
                                                                        : "text-slate-300 hover:text-slate-500 dark:hover:text-slate-400"
                                                                    }`}
                                                                >
                                                                    <Gem 
                                                                        size={16} 
                                                                        strokeWidth={1.5} 
                                                                        className={entry.isInsight ? "fill-indigo-200/50" : "fill-transparent"} 
                                                                    />
                                                                </button>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                     {!isEditing && (
                                                        <Tooltip content={entry.isInsight ? "Убрать из инсайтов" : "Отметить как инсайт"}>
                                                            <button 
                                                                onClick={() => toggleInsight(entry)} 
                                                                className={`p-1.5 rounded-lg transition-all ${
                                                                    entry.isInsight 
                                                                    ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" 
                                                                    : "text-slate-300 hover:text-slate-500 dark:hover:text-slate-400"
                                                                }`}
                                                            >
                                                                <Gem 
                                                                    size={16} 
                                                                    strokeWidth={1.5} 
                                                                    className={entry.isInsight ? "fill-indigo-200/50" : "fill-transparent"} 
                                                                />
                                                            </button>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            )}

                                            <div className={`font-serif text-[#2F3437] dark:text-slate-200 leading-[1.8] text-sm md:text-base flex-1 ${entry.title ? '' : 'mt-1'}`}>
                                                <ReactMarkdown 
                                                    components={markdownComponents} 
                                                    urlTransform={allowDataUrls} 
                                                    remarkPlugins={[remarkGfm]} 
                                                    rehypePlugins={[rehypeRaw]}
                                                >
                                                    {entry.content.replace(/\n/g, '  \n')}
                                                </ReactMarkdown>
                                            </div>
                                            {linkUrl && <LinkPreview url={linkUrl} />}

                                            {/* Context Link */}
                                            {linkedTask && !isEditing && (
                                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onNavigateToTask?.(linkedTask.id); }}
                                                        className="font-mono text-[10px] text-[#6B6E70] dark:text-slate-500 hover:text-indigo-500 transition-colors flex items-center gap-2 group/ctx w-full"
                                                    >
                                                        <Link size={10} className="shrink-0" />
                                                        <span className="truncate max-w-full block">
                                                            CONTEXT: {linkedTask.content}
                                                        </span>
                                                    </button>
                                                </div>
                                            )}

                                            {entry.aiFeedback && (
                                                <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-3 relative mt-3 border border-slate-100 dark:border-slate-700/50">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className={`p-0.5 rounded ${mentor?.color || 'text-slate-500'}`}><RenderIcon name={mentor?.icon || 'User'} className="w-3 h-3" /></div>
                                                        <span className={`text-[10px] font-bold uppercase ${mentor?.color || 'text-slate-500'}`}>{mentor?.name || 'Ментор'}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed pl-1 font-serif"><ReactMarkdown components={markdownComponents}>{entry.aiFeedback}</ReactMarkdown></div>
                                                </div>
                                            )}
                                            
                                            {/* Footer Spheres */}
                                            <div className="mt-4 flex justify-start items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <JournalEntrySphereSelector entry={entry} updateEntry={updateEntry} align="left" direction="up" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}
            </div>
        </div>

      {analysisResult && (
          <div className="fixed inset-0 z-[120] bg-slate-200/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAnalysisResult(null)}>
              <div className="relative w-full max-w-2xl max-h-[85vh] rounded-[32px] overflow-hidden flex flex-col shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-500 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-[40px] saturate-150 border border-white/40 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
                  
                  {/* HOLOGRAM HEADER */}
                  <div className="flex justify-between items-center p-8 pb-0 shrink-0">
                      <div className="flex items-center gap-4">
                          <Sparkles size={18} strokeWidth={1.5} className="text-indigo-500 animate-pulse duration-[3000ms] opacity-50" />
                          <h3 className="font-sans text-xs font-bold tracking-[0.2em] uppercase text-slate-900/80 dark:text-slate-100/90">Анализ Пути</h3>
                      </div>
                      <button 
                        onClick={() => setAnalysisResult(null)} 
                        className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                      >
                          <X size={20} strokeWidth={1} />
                      </button>
                  </div>

                  {/* HOLOGRAM CONTENT */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar-ghost p-8 pt-6">
                      <ReactMarkdown components={HologramMarkdown}>
                          {analysisResult}
                      </ReactMarkdown>
                  </div>

                  {/* HOLOGRAM FOOTER */}
                  <div className="p-8 pt-0 flex justify-center shrink-0">
                      <button 
                        onClick={handleSaveAnalysis} 
                        className="group flex items-center gap-3 px-8 py-3 rounded-full border border-slate-200/50 dark:border-slate-700/50 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all duration-300"
                      >
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Принять в историю</span>
                          <Save size={16} strokeWidth={1} className="group-hover:scale-110 transition-transform" />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showHistory && (
          <div className="fixed inset-0 z-[120] bg-slate-200/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
              <div className="relative w-full max-w-2xl max-h-[85vh] rounded-[32px] overflow-hidden flex flex-col shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-500 bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-[40px] saturate-150 border border-white/40 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex justify-between items-center p-8 pb-0 shrink-0">
                      <div className="flex items-center gap-4">
                          <History size={18} strokeWidth={1.5} className="text-indigo-500 opacity-80" />
                          <h3 className="font-sans text-xs font-bold tracking-[0.2em] uppercase text-slate-900/80 dark:text-slate-100/90">Архив Наставника</h3>
                      </div>
                      <button 
                          onClick={() => setShowHistory(false)} 
                          className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                      >
                          <X size={20} strokeWidth={1} />
                      </button>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar-ghost p-8 space-y-8">
                      {mentorAnalyses.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center opacity-50">
                              <Sparkles size={32} className="mb-4 text-slate-400" strokeWidth={1} />
                              <p className="text-sm font-serif text-slate-500">История пуста</p>
                          </div>
                      ) : (
                          mentorAnalyses.sort((a,b) => b.date - a.date).map(analysis => (
                              <div key={analysis.id} className="group relative">
                                  {/* Timeline Node */}
                                  <div className="absolute -left-3 top-0 bottom-0 border-l border-indigo-500/10 dark:border-indigo-400/10"></div>
                                  <div className="absolute -left-[17px] top-0 w-2 h-2 rounded-full bg-indigo-500/20 ring-1 ring-indigo-500/50"></div>

                                  <div className="pl-6 pb-8">
                                      <div className="flex justify-between items-baseline mb-4">
                                          <div className="flex items-center gap-3">
                                              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                  {new Date(analysis.date).toLocaleDateString()}
                                              </span>
                                              <span className="h-px w-8 bg-indigo-500/20"></span>
                                              <span className="font-sans text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                  {analysis.mentorName}
                                              </span>
                                          </div>
                                          <button 
                                              onClick={() => { if (confirm("Удалить этот анализ?")) deleteMentorAnalysis(analysis.id); }} 
                                              className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                              <Trash2 size={14} />
                                          </button>
                                      </div>
                                      
                                      <div className="bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                                          <ReactMarkdown components={HologramMarkdown}>
                                              {analysis.content}
                                          </ReactMarkdown>
                                      </div>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

      {selectedEntry && (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCloseModal}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className={`w-full max-w-lg backdrop-blur-[40px] saturate-150 border border-black/5 dark:border-white/10 rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col max-h-[90vh] relative overflow-hidden ${getJournalColorClass(editingId === selectedEntry.id ? editColor : selectedEntry.color)}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {(editingId === selectedEntry.id ? editCover : selectedEntry.coverUrl) && (
                        <div className="h-40 shrink-0 relative mb-6 -mx-8 -mt-8 md:-mx-10 md:-mt-10 w-[calc(100%_+_4rem)] md:w-[calc(100%_+_5rem)] group overflow-hidden">
                            <img src={editingId === selectedEntry.id ? editCover! : selectedEntry.coverUrl!} alt="Cover" className="w-full h-full object-cover" />
                            {editingId === selectedEntry.id && (
                                <button onClick={() => setEditCover(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* GLASS MODAL HEADER */}
                    <div className="flex justify-between items-start mb-4 shrink-0">
                        <div className="flex flex-col gap-1 pr-4 w-full">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1 font-mono">
                                {formatDate(selectedEntry.date)} <span className="opacity-50 mx-1">/</span> ID: {selectedEntry.id.slice(-4)}
                            </div>
                            {editingId === selectedEntry.id ? (
                                <input 
                                    type="text" 
                                    placeholder="Название" 
                                    value={editTitle} 
                                    onChange={(e) => setEditTitle(e.target.value)} 
                                    className="text-2xl font-sans font-semibold text-slate-900 dark:text-white leading-tight bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 w-full p-0 m-0 border-b border-transparent focus:border-slate-300 dark:focus:border-slate-600 transition-colors" 
                                    autoFocus
                                />
                            ) : (
                                selectedEntry.title ? (
                                    <h3 className="text-2xl font-sans font-semibold text-slate-900 dark:text-white leading-tight break-words">
                                        {selectedEntry.title}
                                    </h3>
                                ) : null
                            )}
                        </div>
                        <div className="flex items-center shrink-0 gap-1">
                            {!editingId && (
                                <>
                                    <Tooltip content="Редактировать"><button onClick={() => startEditing(selectedEntry)} className="p-2 text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"><Edit3 size={16} /></button></Tooltip>
                                    <Tooltip content="Удалить"><button onClick={() => { if(confirm("Удалить запись?")) { deleteEntry(selectedEntry.id); handleCloseModal(); } }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent rounded-lg transition-colors"><Trash2 size={16} /></button></Tooltip>
                                </>
                            )}
                            <button onClick={handleCloseModal} className="p-2 text-slate-300 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 rounded-lg ml-2"><X size={20}/></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar-ghost min-h-0 pr-1 -mr-2 flex flex-col">
                        {editingId === selectedEntry.id ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="relative flex-1 overflow-hidden flex flex-col">
                                    <div className="flex items-center justify-between mb-2 gap-2 shrink-0">
                                        <div className="flex items-center gap-1 pb-1 overflow-x-auto scrollbar-none flex-1 mask-fade-right">
                                            <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execUndo(); }} disabled={editHistoryIndex <= 0} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                            <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execRedo(); }} disabled={editHistoryIndex >= editHistory.length - 1} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1 shrink-0"></div>
                                            <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Bold size={16} /></button></Tooltip>
                                            <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Italic size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1 shrink-0"></div>
                                            <Tooltip content="Очистить"><button onMouseDown={handleClearStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Eraser size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1 shrink-0"></div>
                                            <Tooltip content="Вставить картинку"><label className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer text-slate-400 dark:text-slate-500 flex items-center justify-center"><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /><ImageIcon size={16} /></label></Tooltip>
                                            {activeImage && <Tooltip content="Удалить картинку"><button onMouseDown={deleteActiveImage} className="image-delete-btn p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"><Trash2 size={16} /></button></Tooltip>}
                                        </div>
                                        {/* Right Container for Styling */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <div className="relative">
                                                <Tooltip content="Обложка">
                                                    <button 
                                                        ref={editPickerTriggerRef}
                                                        onMouseDown={(e) => { e.preventDefault(); setShowEditCoverPicker(!showEditCoverPicker); }} 
                                                        className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${editCover ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
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
                                                        className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${editColor !== 'white' ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                                    >
                                                        <Palette size={16} />
                                                    </button>
                                                </Tooltip>
                                                {showEditColorPicker && (
                                                    <ColorPickerPopover
                                                        onSelect={setEditColor}
                                                        onClose={() => setShowEditColorPicker(false)}
                                                        triggerRef={editColorTriggerRef}
                                                    />
                                                )}
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
                                        className="w-full flex-1 bg-transparent p-1 text-base leading-relaxed text-slate-800 dark:text-slate-200 outline-none overflow-y-auto font-serif custom-scrollbar-ghost [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 cursor-text"
                                        style={{ whiteSpace: 'pre-wrap' }}
                                        data-placeholder="Текст записи..."
                                    />
                                </div>
                                <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                                    <JournalEntrySphereSelector entry={{...selectedEntry, spheres: selectedEntry.spheres}} updateEntry={(updated) => updateEntry({...updated, id: selectedEntry.id})} />
                                </div>
                                <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-black/5 dark:border-white/5 shrink-0">
                                    <button onClick={cancelEditing} className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">Отмена</button>
                                    <button onClick={() => saveEdit(selectedEntry)} className="font-mono text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors font-bold">Сохранить</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={`font-serif text-slate-800 dark:text-slate-200 text-lg leading-relaxed flex-1 overflow-y-auto custom-scrollbar-ghost ${selectedEntry.title ? '' : 'mt-2'}`}>
                                    <ReactMarkdown 
                                        components={markdownComponents} 
                                        urlTransform={allowDataUrls} 
                                        remarkPlugins={[remarkGfm]} 
                                        rehypePlugins={[rehypeRaw]}
                                    >
                                        {selectedEntry.content.replace(/\n/g, '  \n')}
                                    </ReactMarkdown>
                                </div>
                                
                                <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 space-y-4 shrink-0">
                                    {/* Task Link */}
                                    {selectedLinkedTask && (
                                        <div className="flex items-center gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                                <Link size={14} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-700 dark:text-slate-300 mb-0.5">Связанная задача</div>
                                                <div className="text-slate-500 dark:text-slate-400 line-clamp-1">{selectedLinkedTask.content}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Spheres */}
                                    {selectedEntry.spheres && selectedEntry.spheres.length > 0 && (
                                        <div>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">Сферы</div>
                                            <SphereBadgeList spheres={selectedEntry.spheres} />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default Journal;