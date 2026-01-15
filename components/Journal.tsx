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
const getNoteColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

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

const getNotePreviewContent = (content: string) => {
    let cleanText = content.replace(/!\[.*?\]\(.*?\)/g, '');
    cleanText = cleanText.replace(/[ \t]+/g, ' ').trim();
    if (cleanText.length > 150) {
        return cleanText.substring(0, 150).trim() + '...';
    }
    return cleanText;
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
        const match = text.match(/^([\s\u00A0]*)(.*?)([\s\u00A0]*)$/s);
        if (match) {
            if (!match[2]) return match[1] + match[3];
            return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
        }
        return text;
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

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, notes, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask, onNavigateToNote }) => {
  const [hasCreationContent, setHasCreationContent] = useState(false);
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({from: '', to: ''});
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Note Linker State
  const [isNoteSelectorOpen, setIsNoteSelectorOpen] = useState(false);
  const [noteSelectorEntryId, setNoteSelectorEntryId] = useState<string | null>(null);
  const [selectedNoteIdsForLinking, setSelectedNoteIdsForLinking] = useState<string[]>([]);
  
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
              insertImageAtCursor(compressedBase64, creationContentEditableRef.current, saveCreationHistorySnapshot);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && editContentRef.current) {
          try {
              const compressedBase64 = await processImage(file);
              insertImageAtCursor(compressedBase64, editContentRef.current, saveEditHistorySnapshot);
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
        let onSave = null;
        
        if (editContentRef.current && (editContentRef.current === target || editContentRef.current.contains(target))) {
            activeEditor = editContentRef.current;
            onSave = saveEditHistorySnapshot;
        } else if (creationContentEditableRef.current && (creationContentEditableRef.current === target || creationContentEditableRef.current.contains(target))) {
            activeEditor = creationContentEditableRef.current;
            onSave = saveCreationHistorySnapshot;
        }

        if (!activeEditor || !onSave) return;

        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    try {
                        const compressedBase64 = await processImage(blob);
                        insertImageAtCursor(compressedBase64, activeEditor, onSave);
                        if (activeEditor !== editContentRef.current) {
                            setHasCreationContent(true);
                        }
                    } catch (err) { console.error("Image paste failed", err); }
                }
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editingId, isCreationExpanded, saveEditHistorySnapshot, saveCreationHistorySnapshot]);

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

  const handleOpenNoteLink = (e: React.MouseEvent, entryId: string) => {
      e.stopPropagation();
      setNoteSelectorEntryId(entryId);
      setSelectedNoteIdsForLinking([]);
      setIsNoteSelectorOpen(true);
  };

  const handleToggleNoteSelection = (noteId: string) => {
      setSelectedNoteIdsForLinking(prev => {
          if (prev.includes(noteId)) {
              return prev.filter(id => id !== noteId);
          } else {
              return [...prev, noteId];
          }
      });
  };

  const handleConfirmLinkNotes = () => {
      if (noteSelectorEntryId && selectedNoteIdsForLinking.length > 0) {
          const entry = entries.find(e => e.id === noteSelectorEntryId);
          if (entry) {
              const currentIds = entry.linkedNoteIds || [];
              const newIds = Array.from(new Set([...currentIds, ...selectedNoteIdsForLinking]));
              // Ensure legacy linkedNoteId is also included if present and not in array
              if (entry.linkedNoteId && !newIds.includes(entry.linkedNoteId)) {
                  newIds.unshift(entry.linkedNoteId);
              }
              
              updateEntry({ ...entry, linkedNoteIds: newIds });
          }
      }
      setIsNoteSelectorOpen(false);
      setNoteSelectorEntryId(null);
      setSelectedNoteIdsForLinking([]);
  };

  const formatDate = (timestamp: number) => {
      return new Date(timestamp)
          .toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })
          .toUpperCase();
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
                                            <Tooltip content="Очистить"><button onMouseDown={handleClearCreationStyle} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-slate-400 dark:text-slate-500 transition-colors"><Eraser size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                            <Tooltip content="Вставить картинку">
                                                <label className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer text-slate-400 dark:text-slate-500 flex items-center justify-center">
                                                    <input ref={creationFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCreationImageUpload} />
                                                    <ImageIcon size={16} />
                                                </label>
                                            </Tooltip>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 shrink-0">
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
                                                {showCreationColorPicker && <ColorPickerPopover onSelect={setCreationColor} onClose={() => setShowCreationColorPicker(false)} triggerRef={creationColorTriggerRef} />}
                                            </div>
                                            <button onClick={handlePost} disabled={!hasCreationContent && !creationTitle.trim()} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1.5 rounded-lg disabled:opacity-50 transition-colors">
                                                <Send size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ENTRIES LIST */}
                {displayedEntries.length === 0 ? (
                    <EmptyState 
                        icon={Book} 
                        title="В Дневнике пусто" 
                        description="Запиши свои мысли или свяжи их с задачами" 
                        color="cyan"
                    />
                ) : (
                    <div className="max-w-3xl mx-auto space-y-8">
                        {displayedEntries.map(entry => {
                            const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
                            // Handling multiple linked notes (new) and single legacy linked note
                            const linkedNotes: Note[] = [];
                            if (entry.linkedNoteIds) {
                                entry.linkedNoteIds.forEach(id => {
                                    const n = notes.find(note => note.id === id);
                                    if (n) linkedNotes.push(n);
                                });
                            } else if (entry.linkedNoteId) {
                                const n = notes.find(note => note.id === entry.linkedNoteId);
                                if (n) linkedNotes.push(n);
                            }

                            // Handling legacy singular
                            if (linkedNotes.length === 0 && entry.linkedNoteId) {
                                 const n = notes.find(note => note.id === entry.linkedNoteId);
                                 if (n) linkedNotes.push(n);
                            }

                            return (
                                <div key={entry.id} className="relative pl-8 md:pl-0 group">
                                    {/* Timeline Decor */}
                                    <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800 md:hidden" />
                                    <div className="absolute left-[-4px] top-6 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 md:hidden" />

                                    <div className={`${getJournalColorClass(entry.color)} rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md relative overflow-hidden`}>
                                        {entry.coverUrl && (
                                            <div className="h-40 w-full mb-6 -mx-6 -mt-6 w-[calc(100%_+_3rem)] relative group/cover overflow-hidden">
                                                <img src={entry.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                                    <span>{formatDate(entry.date)}</span>
                                                    {entry.isInsight && <span className="text-violet-500 flex items-center gap-1"><Zap size={12} fill="currentColor"/> INSIGHT</span>}
                                                </div>
                                                {entry.title && <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-sans">{applyTypography(entry.title)}</h3>}
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <JournalEntrySphereSelector entry={entry} updateEntry={updateEntry} />
                                                <Tooltip content={entry.isInsight ? "Убрать отметку инсайта" : "Отметить как инсайт"}>
                                                    <button onClick={() => toggleInsight(entry)} className={`p-2 rounded-lg transition-colors ${entry.isInsight ? 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'text-slate-400 hover:text-violet-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                        <Sparkles size={16} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Редактировать">
                                                    <button onClick={() => startEditing(entry)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"><Edit3 size={16} /></button>
                                                </Tooltip>
                                                <Tooltip content="В архив">
                                                    <button onClick={() => deleteEntry(entry.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        <div className="text-slate-700 dark:text-slate-300 font-serif text-base leading-relaxed mb-4">
                                            <ReactMarkdown 
                                                components={markdownComponents} 
                                                urlTransform={allowDataUrls} 
                                                remarkPlugins={[remarkGfm]} 
                                                rehypePlugins={[rehypeRaw]}
                                            >
                                                {entry.content.replace(/\n/g, '  \n')}
                                            </ReactMarkdown>
                                        </div>

                                        {/* Linked Contexts */}
                                        <div className="space-y-2">
                                            {linkedTask && (
                                                <div 
                                                    className="flex items-center gap-3 p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors group/link"
                                                    onClick={() => onNavigateToTask?.(linkedTask.id)}
                                                >
                                                    <div className="p-2 bg-white dark:bg-slate-700 rounded-lg text-indigo-500 shadow-sm"><Kanban size={16} /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Контекст: Задача</div>
                                                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{getLinkedContentPreview(linkedTask.content)}</div>
                                                    </div>
                                                    <ArrowRight size={14} className="text-slate-300 group-hover/link:text-indigo-400 transition-colors" />
                                                </div>
                                            )}

                                            {linkedNotes.length > 0 && linkedNotes.map(note => (
                                                <div 
                                                    key={note.id}
                                                    className="flex items-center gap-3 p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-900 transition-colors group/link"
                                                    onClick={() => onNavigateToNote?.(note.id)}
                                                >
                                                    <div className="p-2 bg-white dark:bg-slate-700 rounded-lg text-emerald-500 shadow-sm"><StickyNote size={16} /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Контекст: Заметка</div>
                                                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{note.title || getNotePreviewContent(note.content)}</div>
                                                    </div>
                                                    <ArrowRight size={14} className="text-slate-300 group-hover/link:text-emerald-400 transition-colors" />
                                                </div>
                                            ))}

                                            {/* Link Adder */}
                                            <div className="pt-2">
                                                <button 
                                                    onClick={(e) => handleOpenNoteLink(e, entry.id)}
                                                    className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-500 transition-colors px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                                                >
                                                    <Link size={12} />
                                                    <span>Связать с заметкой...</span>
                                                </button>
                                            </div>
                                        </div>

                                        {entry.aiFeedback && (
                                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">
                                                    <Sparkles size={12} /> Ментор
                                                </div>
                                                <div className="text-sm text-slate-600 dark:text-slate-400 font-serif italic leading-relaxed bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100/50 dark:border-indigo-800/30">
                                                    <ReactMarkdown components={markdownComponents}>{entry.aiFeedback}</ReactMarkdown>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Journal;