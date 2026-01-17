
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCw, RotateCcw, Play, FileText, Check, Archive as ArchiveIcon, History, Trash2, Plus, Minus, Book, Save, ArrowDown, ArrowUp, Square, CheckSquare, Circle, XCircle, Kanban as KanbanIcon, ListTodo, Bot, Pin, GripVertical, ChevronUp, ChevronDown, Edit3, AlignLeft, Target, Trophy, Search, Rocket, Briefcase, Sprout, Heart, Hash, Clock, ChevronRight, Layout, Maximize2, Command, Palette, Bold, Italic, Eraser, Image as ImageIcon, Upload, RefreshCw, Shuffle, ArrowRight, Map, Gem, Activity, Sparkles } from 'lucide-react';
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
  highlightedItemId?: string;
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
        { id: 3, label: 'ЭНЕРГИЯ', desc: 'Задача реализована в материальном мире', active: true },
        { id: 4, label: 'СИНТЕЗ', desc: 'Опыт интегрирован в структуру личности', active: hasInsight }
    ];

    return (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-[50px] flex items-center justify-center p-8" onClick={onClose}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-4xl relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button onClick={onClose} className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors">
                    <X size={24} />
                </button>

                {/* Central Map */}
                <div className="flex flex-col md:flex-row items-center justify-between relative py-20 px-10">
                    
                    {/* The Thread */}
                    <div className="absolute left-10 right-10 top-1/2 h-[1px] bg-gradient-to-r from-slate-700 via-slate-500 to-slate-700 hidden md:block" />
                    <div className="absolute top-10 bottom-10 left-1/2 w-[1px] bg-gradient-to-b from-slate-700 via-slate-500 to-slate-700 md:hidden" />
                    
                    {/* Pulse Animation */}
                    <motion.div 
                        className="absolute h-[3px] w-[20px] bg-white blur-[2px] rounded-full hidden md:block top-1/2 -mt-[1.5px]"
                        animate={{ 
                            left: ['0%', hasInsight ? '100%' : '75%'], 
                            opacity: [0, 1, 0] 
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />

                    {stages.map((stage, i) => (
                        <div key={stage.id} className="relative z-10 flex flex-col items-center gap-6 group mb-8 md:mb-0">
                            {/* Node */}
                            <div className={`
                                w-4 h-4 transition-all duration-500
                                ${stage.id === 1 ? 'rounded-full border border-slate-400 bg-black' : ''}
                                ${stage.id === 2 ? 'w-3 h-3 bg-slate-300 transform rotate-45' : ''}
                                ${stage.id === 3 ? 'rounded-full' : ''}
                                ${stage.id === 4 ? 'transform rotate-45' : ''}
                            `}
                            style={{ 
                                backgroundColor: stage.id === 3 ? sphereColor : undefined,
                                boxShadow: stage.id === 3 ? `0 0 15px ${sphereColor}` : undefined
                            }}
                            >
                                {stage.id === 4 && (
                                    <div className={`w-4 h-4 border border-indigo-500 transition-all duration-1000 ${stage.active ? 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.8)]' : 'bg-black'}`} />
                                )}
                            </div>

                            {/* Label */}
                            <div className="text-center">
                                <div className="font-mono text-[10px] text-slate-300 uppercase tracking-[0.3em] mb-2">{stage.label}</div>
                                <div className={`font-serif text-sm italic text-slate-400 max-w-[150px] leading-tight transition-opacity duration-500 ${stage.active ? 'opacity-100' : 'opacity-30'}`}>
                                    {stage.desc}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Footer Quote */}
                <div className="text-center mt-8">
                    <p className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">
                        Task ID: {task.id.slice(-5)}
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

// --- KANBAN BOARD COMPONENT ---

const Kanban: React.FC<Props> = ({ 
    tasks, 
    journalEntries, 
    config, 
    addTask, 
    updateTask, 
    deleteTask, 
    reorderTask, 
    archiveTask, 
    onReflectInJournal, 
    initialTaskId, 
    onClearInitialTask, 
    highlightedItemId 
}) => {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [journeyTask, setJourneyTask] = useState<Task | null>(null);
    const [newTaskInput, setNewTaskInput] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll({ container: scrollContainerRef });
    const [isHeaderHidden, setIsHeaderHidden] = useState(false);

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() || 0;
        const diff = latest - previous;
        const isScrollingDown = diff > 0;
        if (latest > 100 && isScrollingDown) setIsHeaderHidden(true);
        else setIsHeaderHidden(false);
    });

    // Initial Task Handling
    useEffect(() => {
        if (initialTaskId) {
            const t = tasks.find(x => x.id === initialTaskId);
            if (t) setSelectedTask(t);
            onClearInitialTask?.();
        }
    }, [initialTaskId, tasks, onClearInitialTask]);

    // DnD Handlers
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('taskId', id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const handleDropColumn = (e: React.DragEvent, col: 'todo' | 'doing' | 'done') => {
        e.preventDefault();
        const id = e.dataTransfer.getData('taskId');
        if (id) {
            const task = tasks.find(t => t.id === id);
            if (task && task.column !== col) {
                updateTask({ ...task, column: col });
            }
        }
    };

    const handleDropTask = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedId = e.dataTransfer.getData('taskId');
        if (draggedId && draggedId !== targetId) {
            reorderTask(draggedId, targetId);
        }
    };

    // Add Task
    const handleAddTask = () => {
        if (!newTaskInput.trim()) return;
        addTask({
            id: Date.now().toString(),
            content: newTaskInput,
            column: 'todo',
            createdAt: Date.now(),
            spheres: []
        });
        setNewTaskInput('');
    };

    // Columns data
    const columns = {
        todo: tasks.filter(t => t.column === 'todo'),
        doing: tasks.filter(t => t.column === 'doing'),
        done: tasks.filter(t => t.column === 'done')
    };

    // Render Task Card
    const renderCard = (task: Task) => {
        const isHighlighted = highlightedItemId === task.id;
        const sphere = task.spheres?.[0];
        const colorClass = getTaskColorClass(task.color);
        const hasChallenge = task.activeChallenge;
        const challengeStats = hasChallenge ? getChallengeStats(task.activeChallenge!) : null;
        
        return (
            <div 
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropTask(e, task.id)}
              onClick={() => setSelectedTask(task)}
              className={`
                  ${colorClass} rounded-xl p-4 shadow-sm border border-slate-200/50 dark:border-slate-700/50 cursor-grab active:cursor-grabbing mb-3 group hover:shadow-md transition-all relative overflow-hidden
                  ${isHighlighted ? 'ring-2 ring-indigo-500' : ''}
              `}
            >
               <div className="flex justify-between items-start gap-2 mb-2">
                   <div className="flex-1 min-w-0">
                       {task.title && <h4 className="font-sans text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 truncate">{task.title}</h4>}
                       <p className="text-xs text-slate-600 dark:text-slate-400 font-sans line-clamp-3 leading-relaxed">
                           {task.content}
                       </p>
                   </div>
                   {sphere && (
                       <div className={`w-2 h-2 rounded-full shrink-0 mt-1`} style={{ backgroundColor: NEON_COLORS[sphere] || '#94a3b8' }} />
                   )}
               </div>

               {/* Challenge Indicator */}
               {challengeStats && challengeStats.total > 0 && (
                   <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                       <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                           <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                                style={{ width: `${challengeStats.percent}%` }}
                           />
                       </div>
                       <span className="text-[9px] font-mono text-slate-400">{challengeStats.checked}/{challengeStats.total}</span>
                   </div>
               )}

               {/* Quick Actions (Hover) */}
               <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg p-1">
                   <button onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }} className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded"><Trash2 size={12} /></button>
               </div>
            </div>
        )
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
            <div className="shrink-0 w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 z-50">
                 <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">
                            Спринты
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Действие и Прогресс</p>
                    </div>
                 </header>
            </div>

            <div 
                className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar-light px-4 md:px-8 pb-4"
                ref={scrollContainerRef}
            >
                <div className="flex gap-6 h-full min-w-[900px] pb-4">
                    {/* TODO COLUMN */}
                    <div 
                        className="flex-1 flex flex-col min-w-[280px] bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropColumn(e, 'todo')}
                    >
                        <div className="p-4 pb-2 flex items-center justify-between shrink-0">
                            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500">To Do</h3>
                            <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{columns.todo.length}</span>
                        </div>
                        
                        <div className="px-4 pb-4 shrink-0">
                            <div className={`flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border transition-all ${isInputFocused ? 'border-indigo-400 ring-2 ring-indigo-50 dark:ring-indigo-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                <Plus size={16} className="text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Новая задача..." 
                                    className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                                    value={newTaskInput}
                                    onChange={(e) => setNewTaskInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                    onFocus={() => setIsInputFocused(true)}
                                    onBlur={() => setIsInputFocused(false)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar-ghost px-4 pb-4">
                            {columns.todo.map(renderCard)}
                            {columns.todo.length === 0 && (
                                <div className="h-32 flex items-center justify-center text-slate-400 text-xs italic opacity-50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                    Пусто
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DOING COLUMN */}
                    <div 
                        className="flex-1 flex flex-col min-w-[280px] bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm relative overflow-hidden"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropColumn(e, 'doing')}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/50" />
                        <div className="p-4 pb-2 flex items-center justify-between shrink-0">
                            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                                <Activity size={12} /> In Progress
                            </h3>
                            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{columns.doing.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar-ghost px-4 pb-4 pt-2">
                            {columns.doing.map(renderCard)}
                            {columns.doing.length === 0 && (
                                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic opacity-50">
                                    Перетащи сюда задачи
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DONE COLUMN */}
                    <div 
                        className="flex-1 flex flex-col min-w-[280px] bg-slate-100/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm relative overflow-hidden"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropColumn(e, 'done')}
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50" />
                        <div className="p-4 pb-2 flex items-center justify-between shrink-0">
                            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 flex items-center gap-2">
                                <CheckCircle2 size={12} /> Done
                            </h3>
                            <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{columns.done.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar-ghost px-4 pb-4 pt-2">
                            {columns.done.map(renderCard)}
                            {columns.done.length === 0 && (
                                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic opacity-50">
                                    Нет завершенных
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* TASK DETAILS MODAL */}
            <AnimatePresence>
                {selectedTask && (
                    <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-700"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start shrink-0">
                                <div className="flex-1 mr-4">
                                    <input 
                                        className="text-xl font-bold bg-transparent outline-none w-full text-slate-900 dark:text-white placeholder:text-slate-300"
                                        value={selectedTask.title || ''}
                                        onChange={(e) => {
                                            const updated = { ...selectedTask, title: e.target.value };
                                            setSelectedTask(updated);
                                            updateTask(updated);
                                        }}
                                        placeholder="Без названия"
                                    />
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                                            ID: {selectedTask.id.slice(-4)}
                                        </div>
                                        <TaskDetailSphereSelector task={selectedTask} updateTask={(t) => { updateTask(t); setSelectedTask(t); }} align="left" direction="down" />
                                    </div>
                                </div>
                                <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar-light">
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Описание</label>
                                    <textarea 
                                        className="w-full min-h-[100px] bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 outline-none resize-none font-serif leading-relaxed"
                                        value={selectedTask.content}
                                        onChange={(e) => {
                                            const updated = { ...selectedTask, content: e.target.value };
                                            setSelectedTask(updated);
                                            updateTask(updated);
                                        }}
                                    />
                                </div>

                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><ListTodo size={12}/> Челлендж / План</label>
                                        {!selectedTask.activeChallenge && (
                                            <button 
                                                onClick={async () => {
                                                    const challenge = await generateTaskChallenge(selectedTask.content, config);
                                                    const updated = { ...selectedTask, activeChallenge: challenge };
                                                    setSelectedTask(updated);
                                                    updateTask(updated);
                                                }}
                                                className="text-[10px] font-bold text-indigo-500 uppercase flex items-center gap-1 hover:text-indigo-600"
                                            >
                                                <Sparkles size={10} /> Создать (AI)
                                            </button>
                                        )}
                                    </div>
                                    
                                    {selectedTask.activeChallenge ? (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                                            <InteractiveChallenge 
                                                content={selectedTask.activeChallenge} 
                                                onToggle={(idx) => {
                                                    // Toggle logic: string manipulation is hard here without parsing.
                                                    // For MVP, allow editing raw text or simple toggle if structured.
                                                    // Since interactive component expects read-only content prop, 
                                                    // let's just make the text area editable for manual checklist management.
                                                }} 
                                                pinnedIndices={selectedTask.pinnedChallengeIndices}
                                                onPin={(idx) => {
                                                    const pinned = selectedTask.pinnedChallengeIndices || [];
                                                    const newPinned = pinned.includes(idx) ? pinned.filter(i => i !== idx) : [...pinned, idx];
                                                    const updated = { ...selectedTask, pinnedChallengeIndices: newPinned };
                                                    setSelectedTask(updated);
                                                    updateTask(updated);
                                                }}
                                            />
                                            <textarea 
                                                className="w-full mt-4 bg-transparent border-t border-slate-200 dark:border-slate-700 pt-4 text-xs font-mono text-slate-500 dark:text-slate-400 outline-none h-32"
                                                value={selectedTask.activeChallenge}
                                                onChange={(e) => {
                                                    const updated = { ...selectedTask, activeChallenge: e.target.value };
                                                    setSelectedTask(updated);
                                                    updateTask(updated);
                                                }}
                                                placeholder="Редактировать чеклист (Markdown: - [ ] Task)"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-xs">
                                            Нет активного плана
                                        </div>
                                    )}
                                </div>

                                {/* AI Actions */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <button 
                                        onClick={async () => {
                                            const therapy = await getKanbanTherapy(selectedTask.content, 'stuck', config);
                                            alert(therapy); // Simple alert for now
                                        }}
                                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
                                    >
                                        <Bot size={14} /> Я застрял (Совет)
                                    </button>
                                    <button 
                                        onClick={() => { setJourneyTask(selectedTask); setSelectedTask(null); }}
                                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
                                    >
                                        <Map size={14} /> Карта Пути
                                    </button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                <button onClick={() => { if(confirm("Архивировать задачу?")) { deleteTask(selectedTask.id); setSelectedTask(null); } }} className="text-slate-400 hover:text-red-500 transition-colors p-2"><Trash2 size={18} /></button>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { onReflectInJournal(selectedTask.id); setSelectedTask(null); }}
                                        className="px-4 py-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors"
                                    >
                                        В дневник
                                    </button>
                                    <button 
                                        onClick={() => setSelectedTask(null)}
                                        className="px-6 py-2 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
                                    >
                                        Готово
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Kanban;
