
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCw, RotateCcw, Play, FileText, Check, Archive as ArchiveIcon, History, Trash2, Plus, Minus, Book, Save, ArrowDown, ArrowUp, Square, CheckSquare, Circle, XCircle, Kanban as KanbanIcon, ListTodo, Bot, Pin, GripVertical, ChevronUp, ChevronDown, Edit3, AlignLeft, Target, Trophy, Search, Rocket, Briefcase, Sprout, Heart, Hash, Clock, ChevronRight, Layout, Maximize2, Command, Palette, Bold, Italic, Eraser, Image as ImageIcon, Upload, RefreshCw, Shuffle, ArrowRight, Map, Gem } from 'lucide-react';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { SPHERES, ICON_MAP, applyTypography } from '../constants';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

interface Props {
  tasks: Task[];
  journalEntries: JournalEntry[];
  config: AppConfig;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  reorderTask: (draggedId: string, targetId: string) => void;
  archiveTask: (id: string) => void;
  onReflectInJournal: (taskId: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
  highlightId?: string | null;
}

// --- VISUAL CONSTANTS ---
const NEON_COLORS: Record<string, string> = {
    productivity: '#0075FF', // Cyber Blue
    growth: '#00FFA3',       // Electric Mint
    relationships: '#FF007A' // Neon Rose
};

const UNSPLASH_PRESETS = [
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80', // Rain
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80', // Gradient
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80', // Dark Abstract
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80', // Nature
];

// Dot Grid Background Pattern
const DOT_GRID_STYLE = {
    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
    backgroundSize: '24px 24px'
};

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const getTaskColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

// --- UTILS ---
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

// --- RICH TEXT HELPERS ---
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
            
            // Vertical Logic
            const spaceBelow = viewportH - rect.bottom;
            if (spaceBelow < pickerHeight && rect.top > spaceBelow) {
                // Flip Up
                style.bottom = viewportH - rect.top + 8;
                style.maxHeight = rect.top - 20;
            } else {
                // Normal Down
                style.top = rect.bottom + 8;
                style.maxHeight = spaceBelow - 20;
            }

            // Horizontal Logic
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

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div 
                className="fixed bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[9999] w-80 flex flex-col gap-3 overflow-hidden" 
                style={pickerStyle}
                onMouseDown={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center shrink-0"><span className="text-[10px] font-bold text-slate-400 uppercase">Обложка</span><button onClick={onClose}><X size={14} /></button></div>
                
                <div className="relative shrink-0">
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

                <div className="grid grid-cols-3 gap-2 overflow-y-auto custom-scrollbar-light min-h-[60px] flex-1">
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

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 shrink-0">
                    <label className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-xs font-medium cursor-pointer transition-colors text-slate-600 dark:text-slate-300">
                        <Upload size={12} /> Своя 
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                    </label>
                    <button onClick={() => searchUnsplash()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors text-slate-600 dark:text-slate-300">
                        <Shuffle size={12} /> Случайные
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
};

// --- Color Picker Component ---
const ColorPickerPopover: React.FC<{ 
    onSelect: (colorId: string) => void, 
    onClose: () => void, 
    triggerRef: React.RefObject<HTMLElement>,
    direction?: 'up' | 'down' | 'auto'
}> = ({ onSelect, onClose, triggerRef, direction = 'auto' }) => {
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const viewportH = window.innerHeight;
            const viewportW = window.innerWidth;
            
            // Approximate size of picker
            const height = 50; 
            const width = 220; 

            const topSpace = rect.top;
            const bottomSpace = viewportH - rect.bottom;
            
            let top = rect.bottom + 8;
            let left = rect.left;

            // Logic to force UP if direction is 'up' OR if auto and not enough space below
            const forceUp = direction === 'up';
            const autoUp = direction === 'auto' && bottomSpace < height && topSpace > height;

            if (forceUp || autoUp) {
                top = rect.top - height - 8;
            }

            // Flip horizontally if right edge goes off screen
            if (left + width > viewportW) {
                left = viewportW - width - 16;
            }

            setStyle({
                position: 'fixed',
                top,
                left,
                zIndex: 9999
            });
        }
    }, [triggerRef, direction]);

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div 
                className="fixed bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-[9999] flex-wrap max-w-[200px]" 
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

// --- IMPROVED MARKDOWN CONVERTERS ---

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
    
    // Improved new line handling: Replace newlines with BR, but clean up around block elements
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/(<\/h1>|<\/h2>|<\/p>|<\/div>)<br>/gi, '$1');
    return html;
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
        if (node.nodeType === Node.TEXT_NODE) {
            return (node.textContent || '').replace(/\u00A0/g, ' ');
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            
            if (tag === 'br') return '\n';
            if (tag === 'img') return `\n![${(el as HTMLImageElement).alt || 'image'}](${(el as HTMLImageElement).src})\n`;
            
            let content = '';
            el.childNodes.forEach(child => content += walk(child));
            
            // Robust Block Elements Handling
            if (tag === 'p') {
                const trimmed = content.trim();
                return trimmed ? `\n${trimmed}\n` : '\n'; 
            }
            if (tag === 'div') {
                const trimmed = content.trim();
                // Fix for extra spacing in Kanban cards: single newline for divs
                return trimmed ? `\n${trimmed}` : '\n'; 
            }

            if (tag === 'li') return `\n- ${content.trim()}`;
            if (tag === 'ul' || tag === 'ol') return `\n${content}\n`;
            if (tag === 'blockquote') return `\n> ${content.trim()}\n`;

            const styleBold = el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0') >= 700;
            const styleItalic = el.style.fontStyle === 'italic';

            if (styleBold) return wrap(content, '**');
            if (styleItalic) return wrap(content, '*');
            
            switch (tag) {
                case 'b': case 'strong': return wrap(content, '**');
                case 'i': case 'em': return wrap(content, '*');
                case 'code': return `\`${content}\``;
                case 'u': return `<u>${content}</u>`;
                case 'h1': return `\n# ${content}\n`;
                case 'h2': return `\n## ${content}\n`;
                default: return content;
            }
        }
        return '';
    };
    
    let md = walk(temp);
    md = md.replace(/\n{3,}/g, '\n\n').trim();
    return applyTypography(md);
};

const formatForDisplay = (content: string) => {
    if (!content) return '';
    return content.replace(/\n/g, '  \n');
};

const HighlightedText = ({ text, highlight, className = "" }: { text: string, highlight: string, className?: string }) => {
    if (!highlight.trim()) return <span className={className}>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
        <span className={className}>
            {parts.map((part, i) => 
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span key={i} className="text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)] bg-indigo-50/50 dark:bg-indigo-900/30 font-medium px-0.5 rounded-sm">
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </span>
    );
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-[#2F3437] dark:text-slate-300 leading-relaxed font-sans" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-[#2F3437] dark:text-slate-200" {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-[#2F3437] dark:text-slate-300" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-sm text-[#2F3437] dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-sm text-[#2F3437] dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-sm font-semibold mt-3 mb-2 text-[#2F3437] dark:text-slate-200 uppercase tracking-wide" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-xs font-semibold mt-2 mb-2 text-[#2F3437] dark:text-slate-200 uppercase tracking-wide" {...props}>{cleanHeader(children)}</h2>,
    h3: ({node, children, ...props}: any) => <h3 className="text-[10px] font-bold mt-2 mb-1 text-[#6B6E70] dark:text-slate-500 uppercase tracking-widest" {...props}>{cleanHeader(children)}</h3>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-indigo-200 dark:border-indigo-800 pl-3 py-1 my-2 text-xs text-[#6B6E70] dark:text-slate-500 italic" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-[#6B6E70] dark:text-slate-400" {...props}>{children}</code>
            : <code className="block bg-slate-50 dark:bg-slate-800/50 text-[#6B6E70] dark:text-slate-400 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

const SegmentedProgressBar = ({ total, current, color = 'text-indigo-500', className = '' }: { total: number, current: number, color?: string, className?: string }) => {
    const bgClass = color.replace('text-', 'bg-');
    
    return (
        <div className={`flex items-center gap-1.5 w-full mb-3 animate-in fade-in slide-in-from-left-2 duration-500 ${className}`}>
            <div className="flex-1 flex gap-1 h-1">
                {Array.from({ length: total }).map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-full transition-all duration-500 ${
                            i < current
                                ? `${bgClass} shadow-[0_0_8px_currentColor] ${color}`
                                : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                    />
                ))}
            </div>
            <div className="font-mono text-[9px] text-[#6B6E70] dark:text-slate-500 font-bold tracking-widest shrink-0">
                {String(current).padStart(2, '0')}/{String(total).padStart(2, '0')}
            </div>
        </div>
    );
};

// --- CARD SPHERE SELECTOR COMPONENT (UPDATED) ---
const CardSphereSelector: React.FC<{ task: Task, updateTask: (t: Task) => void }> = ({ task, updateTask }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const toggleSphere = (sphereId: string) => {
        const current = task.spheres || [];
        const newSpheres = current.includes(sphereId) 
            ? current.filter(s => s !== sphereId)
            : [...current, sphereId];
        updateTask({ ...task, spheres: newSpheres });
    };

    return (
        <div className="relative">
            <Tooltip content="Сферы">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                >
                    {task.spheres && task.spheres.length > 0 ? (
                        <div className="flex -space-x-1.5">
                            {task.spheres.map(s => {
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
                        <Target size={14} strokeWidth={1.5} className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400" />
                    )}
                </button>
            </Tooltip>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                        {SPHERES.map(s => {
                            const isSelected = task.spheres?.includes(s.id);
                            const Icon = ICON_MAP[s.icon];
                            return (
                                <button
                                    key={s.id}
                                    onClick={(e) => { e.stopPropagation(); toggleSphere(s.id); }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-[#2F3437] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                >
                                    {Icon && <Icon size={12} className={isSelected ? s.text : 'text-[#6B6E70]'} />}
                                    <span className="flex-1">{s.label}</span>
                                    {isSelected && <Check size={12} className="text-indigo-500" />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

// --- TASK DETAIL SPHERE SELECTOR (JOURNAL STYLE) ---
const TaskDetailSphereSelector: React.FC<{ 
    task: Task, 
    updateTask: (t: Task) => void,
    align?: 'left' | 'right',
    direction?: 'up' | 'down'
}> = ({ task, updateTask, align = 'right', direction = 'down' }) => {
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
        const current = task.spheres || [];
        const newSpheres = current.includes(sphereId) 
            ? current.filter(s => s !== sphereId)
            : [...current, sphereId];
        updateTask({ ...task, spheres: newSpheres });
    };

    return (
        <>
            <Tooltip content="Сферы" className="w-fit">
                <button 
                    ref={triggerRef}
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    className="flex items-center justify-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                    {task.spheres && task.spheres.length > 0 ? (
                        <div className="flex -space-x-1.5">
                            {task.spheres.map(s => {
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
                        <Target size={18} strokeWidth={1.5} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
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
                        const isSelected = task.spheres?.includes(s.id);
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

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isCard?: boolean;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, icon, isCard = false, actions, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${isCard ? 'bg-slate-50/50 dark:bg-slate-800/30 mb-2' : 'bg-transparent mb-4'} rounded-xl ${isCard ? 'border border-slate-100 dark:border-slate-700/50' : ''} overflow-hidden`}>
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className={`w-full flex items-center justify-between ${isCard ? 'p-2' : 'p-0 pb-2'} cursor-pointer ${isCard ? 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30' : ''} transition-colors group/header`}
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
           {icon}
           {title}
        </div>
        <div className="flex items-center gap-3">
            {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
            <div className="text-slate-500 dark:text-slate-400 group-hover/header:text-indigo-500 transition-colors">
                {isOpen ? <Minus size={12} /> : <Plus size={12} />}
            </div>
        </div>
      </div>
      {isOpen && (
        <div className={`${isCard ? 'px-2 pb-2' : 'px-0 pb-2'} pt-0 animate-in slide-in-from-top-1 duration-200`}>
           <div className={`pt-2 ${isCard ? 'border-t border-slate-200/30 dark:border-slate-700/30' : ''} text-sm`}>
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const getChallengeStats = (content: string) => {
    const total = (content.match(/\[[xX ]\]/gm) || []).length;
    const checked = (content.match(/\[[xX]\]/gm) || []).length;
    return { total, checked, percent: total > 0 ? Math.round((checked / total) * 100) : 0 };
};

const InteractiveChallenge: React.FC<{ 
    content: string, 
    onToggle: (index: number) => void,
    onPin?: (index: number) => void,
    pinnedIndices?: number[]
}> = ({ content, onToggle, onPin, pinnedIndices = [] }) => {
    const cleanContent = content.trim().replace(/^#+\s*[^\n]*(\n+|$)/, '').trim();
    const lines = cleanContent.split('\n');
    let checkboxIndex = 0;
    const renderedParts: React.ReactNode[] = [];
    let textBuffer = '';

    const flushBuffer = (keyPrefix: string) => {
        if (textBuffer) {
            const trimmedBuffer = textBuffer.trim(); 
            if (trimmedBuffer) {
                renderedParts.push(
                    <div key={`${keyPrefix}-md`} className="text-sm leading-relaxed text-[#2F3437] dark:text-slate-300 font-sans mb-1 last:mb-0">
                        <ReactMarkdown components={markdownComponents}>{formatForDisplay(applyTypography(textBuffer))}</ReactMarkdown>
                    </div>
                );
            }
            textBuffer = '';
        }
    };

    lines.forEach((line, i) => {
        const match = line.match(/^(\s*)(?:[-*+]|\d+\.)?\s*\[([ xX])\]\s+(.*)/);
        if (match) {
            flushBuffer(`line-${i}`);
            const currentIdx = checkboxIndex++;
            const isChecked = match[2].toLowerCase() === 'x';
            const label = match[3];
            const indent = match[1].length * 6; 
            const isPinned = pinnedIndices.includes(currentIdx);

            renderedParts.push(
                <div key={`cb-row-${i}`} className="flex items-start gap-2 group px-1 mb-0.5 w-full" style={{ marginLeft: `${indent}px` }}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggle(currentIdx); }}
                        className="flex-1 flex items-start gap-2 text-left py-1 hover:bg-black/5 dark:hover:bg-white/5 rounded"
                    >
                        <div className={`mt-0.5 shrink-0 ${isChecked ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-400'}`}>
                            {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        </div>
                        <span className={`text-sm font-sans ${isChecked ? 'text-[#6B6E70] dark:text-slate-500 line-through' : 'text-[#2F3437] dark:text-slate-300'}`}>
                            <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{formatForDisplay(applyTypography(label))}</ReactMarkdown>
                        </span>
                    </button>
                    {onPin && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip content={isPinned ? "Открепить от карточки" : "Закрепить на карточке"}>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onPin(currentIdx); }}
                                    className={`p-1.5 rounded transition-colors ${isPinned ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-300 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                >
                                    <Pin size={14} className={isPinned ? "fill-current" : ""} />
                                </button>
                            </Tooltip>
                        </div>
                    )}
                </div>
            );
        } else {
            textBuffer += line + '\n';
        }
    });
    flushBuffer('end');
    return <>{renderedParts}</>;
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
                    <div key={`${keyPrefix}-md`} className="text-sm leading-relaxed text-[#2F3437] dark:text-slate-300 font-sans mb-1 last:mb-0">
                        <ReactMarkdown components={markdownComponents}>{formatForDisplay(applyTypography(textBuffer))}</ReactMarkdown>
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
                        <Icon size={16} />
                    </div>
                    <span className={`text-sm text-[#2F3437] dark:text-slate-300 font-sans`}>
                        <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{formatForDisplay(applyTypography(label))}</ReactMarkdown>
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

// --- JOURNEY MODAL ---
const JourneyModal = ({ task, journalEntries, onClose }: { task: Task, journalEntries: JournalEntry[], onClose: () => void }) => {
    // Check for insight
    const hasInsight = journalEntries.some(j => j.linkedTaskId === task.id && j.isInsight);
    const sphere = task.spheres?.[0];
    const sphereColor = sphere && NEON_COLORS[sphere] ? NEON_COLORS[sphere] : '#6366f1'; 

    const stages = [
        { id: 1, label: 'ХАОС', desc: 'Мысль зафиксирована в Дневнике/Заметках', active: true },
        { id: 2, label: 'ЛОГОС', desc: 'Сформирован контекст и план действий', active: true },
        { id: 3, label: 'ЭНЕР