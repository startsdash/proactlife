

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCw, RotateCcw, Play, FileText, Check, Archive as ArchiveIcon, History, Trash2, Plus, Minus, Book, Save, ArrowDown, ArrowUp, Square, CheckSquare, Circle, XCircle, Kanban as KanbanIcon, ListTodo, Bot, Pin, GripVertical, ChevronUp, ChevronDown, Edit3, AlignLeft, Target, Trophy, Search, Rocket, Briefcase, Sprout, Heart, Hash, Clock, ChevronRight, Layout, Maximize2, Command, Palette, Bold, Italic, Eraser, Image as ImageIcon, Upload, RefreshCw, Shuffle, ArrowRight } from 'lucide-react';
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
    triggerRef: React.RefObject<HTMLElement> 
}> = ({ onSelect, onClose, triggerRef }) => {
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

            // Flip vertically if not enough space below
            if (bottomSpace < height && topSpace > height) {
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
    }, [triggerRef]);

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
            
            if (tag === 'div' || tag === 'p') {
                return content.trim() ? `${content}\n` : '\n'; 
            }

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
                className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all outline-none ${
                  isOpen ? 'border-indigo-400 ring-2 ring-indigo-50 dark:ring-indigo-900 bg-white dark:bg-[#1e293b]' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selected.length > 0 ? (
                        <>
                            <div className="flex -space-x-1 shrink-0">
                                {selected.map(s => {
                                    const sp = SPHERES.find(x => x.id === s);
                                    return sp ? <div key={s} className={`w-3 h-3 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`}></div> : null;
                                })}
                            </div>
                            <span className="text-sm font-medium text-[#2F3437] dark:text-slate-200 truncate">
                                {selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ')}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm text-[#6B6E70]">Выбери сферу</span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-[#6B6E70] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5">
                    {SPHERES.map(s => {
                        const isSelected = selected.includes(s.id);
                        const Icon = ICON_MAP[s.icon];
                        return (
                            <button
                                key={s.id}
                                onClick={() => toggleSphere(s.id)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                {Icon && <Icon size={14} className={isSelected ? s.text : 'text-[#6B6E70]'} />}
                                <span className="flex-1">{s.label}</span>
                                {isSelected && <Check size={14} className="text-indigo-500" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

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
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="p-1.5 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors opacity-0 group-hover:opacity-100"
                title="Сфера"
            >
                <Target size={14} strokeWidth={1.5} />
            </button>
            
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
                                    onClick={() => toggleSphere(s.id)}
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
    <div className={`${isCard ? 'bg-slate-50/50 dark:bg-slate-800/30 mb-2' : 'bg-slate-50 dark:bg-slate-800 mb-3'} rounded-xl border border-slate-100 dark:border-slate-700/50 overflow-hidden`}>
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className={`w-full flex items-center justify-between ${isCard ? 'p-2' : 'p-4'} cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors group/header`}
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#6B6E70] dark:text-slate-500 uppercase tracking-wider">
           {icon}
           {title}
        </div>
        <div className="flex items-center gap-3">
            {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
            <div className="text-slate-300 dark:text-slate-600">
                {isOpen ? <Minus size={12} /> : <Plus size={12} />}
            </div>
        </div>
      </div>
      {isOpen && (
        <div className={`${isCard ? 'px-2 pb-2' : 'px-4 pb-4'} pt-0 animate-in slide-in-from-top-1 duration-200`}>
           <div className="pt-2 border-t border-slate-200/30 dark:border-slate-700/30 text-sm">
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

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [activeModal, setActiveModal] = useState<{taskId: string, type: 'stuck' | 'reflect' | 'details' | 'challenge'} | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'todo' | 'doing' | 'done'>('todo');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [generatingChallengeFor, setGeneratingChallengeFor] = useState<string | null>(null);
  const [generatingTherapyFor, setGeneratingTherapyFor] = useState<string | null>(null);
  const [draftChallenge, setDraftChallenge] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'manual' | 'desc' | 'asc'>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [cardSubtaskInputs, setCardSubtaskInputs] = useState<{[taskId: string]: string}>({});
  const [activeSphereFilter, setActiveSphereFilter] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSphereSelector, setShowSphereSelector] = useState(false);
  
  // NEW TASK CREATION STATE
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creationCover, setCreationCover] = useState<string | null>(null);
  const [creationColor, setCreationColor] = useState('white');
  const [showCreationCoverPicker, setShowCreationCoverPicker] = useState(false);
  const [showCreationColorPicker, setShowCreationColorPicker] = useState(false);
  const creationPickerTriggerRef = useRef<HTMLButtonElement>(null); 
  const creationColorTriggerRef = useRef<HTMLButtonElement>(null);
  
  // Creation Editor State
  const [creationHistory, setCreationHistory] = useState<string[]>(['']);
  const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
  const creationContentRef = useRef<HTMLDivElement>(null);
  const lastCreationSelection = useRef<Range | null>(null);

  // EDIT TASK STATE
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editCover, setEditCover] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('white');
  const [showEditCoverPicker, setShowEditCoverPicker] = useState(false);
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);
  const editPickerTriggerRef = useRef<HTMLButtonElement>(null); 
  const editColorTriggerRef = useRef<HTMLButtonElement>(null);
  
  // New Rich Text State for Edit Mode
  const [editHistory, setEditHistory] = useState<string[]>(['']);
  const [editHistoryIndex, setEditHistoryIndex] = useState(0);
  const editContentEditableRef = useRef<HTMLDivElement>(null);
  const editHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedEditRef = useRef(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
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

  const hasChallengeAuthors = useMemo(() => config.challengeAuthors && config.challengeAuthors.length > 0, [config.challengeAuthors]);
  const hasKanbanTherapist = useMemo(() => config.aiTools.some(t => t.id === 'kanban_therapist'), [config.aiTools]);

  const baseActiveTasks = tasks.filter(t => !t.isArchived);

  // Creation Editor Helpers
  const saveCreationSnapshot = useCallback((content: string) => {
      if (content === creationHistory[creationHistoryIndex]) return;
      const newHistory = creationHistory.slice(0, creationHistoryIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 20) newHistory.shift();
      setCreationHistory(newHistory);
      setCreationHistoryIndex(newHistory.length - 1);
  }, [creationHistory, creationHistoryIndex]);

  const handleCreationInput = () => {
      if (creationContentRef.current) {
          saveCreationSnapshot(creationContentRef.current.innerHTML);
      }
  };

  const execCreationCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (creationContentRef.current) {
          creationContentRef.current.focus();
          saveCreationSnapshot(creationContentRef.current.innerHTML);
      }
  };
  
  const handleClearCreationStyle = (e: React.MouseEvent) => {
      e.preventDefault();
      execCreationCmd('removeFormat');
      execCreationCmd('formatBlock', 'div'); 
  };

  const saveCreationSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && creationContentRef.current && creationContentRef.current.contains(sel.anchorNode)) {
          lastCreationSelection.current = sel.getRangeAt(0).cloneRange();
      }
  };

  const restoreCreationSelection = () => {
      const sel = window.getSelection();
      if (sel && lastCreationSelection.current) {
          sel.removeAllRanges();
          sel.addRange(lastCreationSelection.current);
      }
  };

  const insertImageAtCursor = (base64: string) => {
      if (creationContentRef.current) creationContentRef.current.focus();
      // If we have a saved selection inside the editor, restore it
      if (lastCreationSelection.current) {
          restoreCreationSelection();
      }
      
      document.execCommand('insertImage', false, base64);
      
      // Basic styling fix for inserted images since execCommand just puts <img>
      // We can't easily style it without complex logic, so we rely on global CSS or simple cleanup
      if (creationContentRef.current) saveCreationSnapshot(creationContentRef.current.innerHTML);
  };

  const execCreationUndo = () => {
      if (creationHistoryIndex > 0) {
          const prevIndex = creationHistoryIndex - 1;
          setCreationHistoryIndex(prevIndex);
          if (creationContentRef.current) creationContentRef.current.innerHTML = creationHistory[prevIndex];
      }
  };

  const execCreationRedo = () => {
      if (creationHistoryIndex < creationHistory.length - 1) {
          const nextIndex = creationHistoryIndex + 1;
          setCreationHistoryIndex(nextIndex);
          if (creationContentRef.current) creationContentRef.current.innerHTML = creationHistory[nextIndex];
      }
  };

  // --- EDIT MODE HELPERS ---
  const saveEditSnapshot = useCallback((content: string) => {
      if (content === editHistory[editHistoryIndex]) return;
      const newHistory = editHistory.slice(0, editHistoryIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 20) newHistory.shift();
      setEditHistory(newHistory);
      setEditHistoryIndex(newHistory.length - 1);
  }, [editHistory, editHistoryIndex]);

  const handleEditInput = useCallback(() => {
      if (editHistoryTimeoutRef.current) clearTimeout(editHistoryTimeoutRef.current);
      editHistoryTimeoutRef.current = setTimeout(() => {
          if (editContentEditableRef.current) {
              saveEditSnapshot(editContentEditableRef.current.innerHTML);
          }
      }, 500);
  }, [saveEditSnapshot]);

  const execEditCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (editContentEditableRef.current) {
          editContentEditableRef.current.focus();
          saveEditSnapshot(editContentEditableRef.current.innerHTML);
      }
  };

  const execEditUndo = () => {
      if (editHistoryIndex > 0) {
          const prevIndex = editHistoryIndex - 1;
          setEditHistoryIndex(prevIndex);
          if (editContentEditableRef.current) editContentEditableRef.current.innerHTML = editHistory[prevIndex];
      }
  };

  const execEditRedo = () => {
      if (editHistoryIndex < editHistory.length - 1) {
          const nextIndex = editHistoryIndex + 1;
          setEditHistoryIndex(nextIndex);
          if (editContentEditableRef.current) editContentEditableRef.current.innerHTML = editHistory[nextIndex];
      }
  };
  
  const handleClearEditStyle = (e: React.MouseEvent) => {
      e.preventDefault();
      execEditCmd('removeFormat');
      execEditCmd('formatBlock', 'div'); 
  };

  // KEYBOARD SHORTCUT FOR SEARCH
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtering Logic (X-Ray Effect)
  const isMatch = (task: Task) => {
      // 1. Sphere Filter
      if (activeSphereFilter) {
          const hasSphere = task.spheres?.includes(activeSphereFilter);
          if (!hasSphere) return false;
      }

      // 2. Search
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const inTitle = task.title?.toLowerCase().includes(q);
          const inContent = task.content.toLowerCase().includes(q);
          if (!inTitle && !inContent) return false;
      }
      return true;
  };

  const getSortedTasks = (taskList: Task[]) => {
      return [...taskList].sort((a, b) => {
          if (sortOrder === 'manual') return 0;
          if (sortOrder === 'desc') return b.createdAt - a.createdAt;
          return a.createdAt - b.createdAt;
      });
  };

  useEffect(() => {
    if (initialTaskId) {
      const taskExists = tasks.some(t => t.id === initialTaskId);
      if (taskExists) {
        setActiveModal({ taskId: initialTaskId, type: 'details' });
      }
      onClearInitialTask?.();
    }
  }, [initialTaskId, tasks, onClearInitialTask]);

  useEffect(() => {
      if (activeModal?.type === 'details') {
          const task = tasks.find(t => t.id === activeModal.taskId);
          if (task) {
              setEditTaskTitle(task.title || '');
          }
      } else {
          setIsEditingTask(false);
          setShowHistory(false);
      }
  }, [activeModal, tasks]);

  // Sync effect for Edit Mode Content - FIX DUPLICATION by using ref check and careful dependency
  useEffect(() => {
      if (isEditingTask && activeModal?.taskId) {
          // KEY CHANGE: Ensure we rely on a cleaner init check
          if (!hasInitializedEditRef.current) {
               const task = tasks.find(t => t.id === activeModal.taskId);
               if (task && editContentEditableRef.current) {
                   setEditTaskTitle(task.title || '');
                   setEditCover(task.coverUrl || null);
                   setEditColor(task.color || 'white');
                   
                   const html = markdownToHtml(task.content);
                   // Directly setting innerHTML can be risky if React re-renders, 
                   // but with key={activeModal.taskId} on the editable div, we are safer.
                   editContentEditableRef.current.innerHTML = html;
                   setEditHistory([html]);
                   setEditHistoryIndex(0);
                   hasInitializedEditRef.current = true;
               }
          }
      } else {
          hasInitializedEditRef.current = false;
      }
  }, [isEditingTask, activeModal?.taskId, tasks]); // Depend on ID, not object reference if possible, but tasks needed for lookup

  const columns = [
    { id: 'todo', title: 'Нужно сделать' },
    { id: 'doing', title: 'В работе' },
    { id: 'done', title: 'Завершено' }
  ];

  const getTabClass = (id: string, active: boolean) => {
    const base = "flex-1 py-3 text-xs font-sans font-bold uppercase tracking-wider border-b-2 transition-colors text-center";
    if (!active) return `${base} border-transparent text-[#6B6E70] border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50`;
    
    if (id === 'todo') return `${base} border-slate-400 text-[#2F3437] dark:text-slate-200 bg-white dark:bg-[#1e293b]`;
    if (id === 'doing') return `${base} border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10`;
    if (id === 'done') return `${base} border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/10`;
    return base;
  };

  const handleCloseModal = () => {
      setActiveModal(null);
      setDraftChallenge(null);
      setAiResponse(null);
      setIsEditingTask(false);
      setGeneratingChallengeFor(null);
      setGeneratingTherapyFor(null);
      setShowHistory(false);
  };

  const handleCreateTask = () => {
      const rawHtml = creationContentRef.current?.innerHTML || '';
      const mdContent = htmlToMarkdown(rawHtml);
      
      if (!newTaskTitle.trim() && !mdContent.trim()) return;
      
      const newTask: Task = {
          id: Date.now().toString(),
          title: applyTypography(newTaskTitle.trim()),
          content: mdContent,
          column: 'todo',
          createdAt: Date.now(),
          spheres: activeSphereFilter ? [activeSphereFilter] : [],
          coverUrl: creationCover || undefined,
          color: creationColor
      };
      addTask(newTask);
      setNewTaskTitle('');
      setCreationCover(null);
      setCreationColor('white');
      if(creationContentRef.current) creationContentRef.current.innerHTML = '';
      setCreationHistory(['']);
      setCreationHistoryIndex(0);
      setIsCreatorOpen(false);
  };

  const cancelCreateTask = () => {
      setNewTaskTitle('');
      setCreationCover(null);
      setCreationColor('white');
      if(creationContentRef.current) creationContentRef.current.innerHTML = '';
      setCreationHistory(['']);
      setCreationHistoryIndex(0);
      setIsCreatorOpen(false);
  };

  const handleSaveTaskContent = () => {
      const task = getTaskForModal();
      if (!task) return;
      
      const rawHtml = editContentEditableRef.current?.innerHTML || '';
      const content = htmlToMarkdown(rawHtml);

      // Check if title or content changed before updating
      if (content !== task.content || editTaskTitle.trim() !== task.title || editCover !== task.coverUrl || editColor !== task.color) {
          updateTask({ 
              ...task, 
              title: applyTypography(editTaskTitle.trim()), 
              content: applyTypography(content),
              coverUrl: editCover || undefined,
              color: editColor
          });
      }
      setIsEditingTask(false);
  };
  
  const handleTitleAutosave = () => {
      const task = getTaskForModal();
      if (!task) return;
      const newTitle = applyTypography(editTaskTitle.trim());
      if ((task.title || '') !== newTitle) {
          updateTask({ ...task, title: newTitle });
      }
  };

  const canMoveTask = (task: Task, targetColId: string): boolean => {
    if (task.column === 'doing' && targetColId !== 'doing') {
        if (task.activeChallenge && !task.isChallengeCompleted) {
            alert('Необходимо завершить активный челлендж');
            return false;
        }
    }
    return true;
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleColumnDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    const task = baseActiveTasks.find(t => t.id === taskId);
    if (!task || task.column === colId) return;
    
    if (!canMoveTask(task, colId)) return;
    updateTask({ ...task, column: colId as any });
  };

  const handleTaskDrop = (e: React.DragEvent, targetTaskId: string) => {
      e.preventDefault(); e.stopPropagation();
      const draggedTaskId = e.dataTransfer.getData('taskId');
      if (!draggedTaskId) return;
      const draggedTask = baseActiveTasks.find(t => t.id === draggedTaskId);
      const targetTask = baseActiveTasks.find(t => t.id === targetTaskId);
      if (!draggedTask || !targetTask) return;
      
      if (sortOrder !== 'manual') setSortOrder('manual');

      if (draggedTask.column !== targetTask.column) {
           if (!canMoveTask(draggedTask, targetTask.column)) return;
           updateTask({ ...draggedTask, column: targetTask.column });
           return; 
      }
      
      if (draggedTask.column === targetTask.column) {
          reorderTask(draggedTaskId, targetTaskId);
      }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const toggleSortOrder = () => { 
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); 
  };

  const openTherapy = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (generatingTherapyFor === task.id) {
        setGeneratingTherapyFor(null);
        return;
    }
    if (window.confirm("Запустить ИИ-консультанта?")) {
        setGeneratingTherapyFor(task.id);
        setAiResponse(null);
        try {
            const response = await getKanbanTherapy(task.content, 'stuck', config);
            setGeneratingTherapyFor(current => {
                if (current === task.id) {
                    setAiResponse(response);
                    setActiveModal({ taskId: task.id, type: 'stuck' });
                    return null;
                }
                return current;
            });
        } catch (error) {
            console.error(error);
            setGeneratingTherapyFor(current => current === task.id ? null : current);
        }
    }
  };

  const saveTherapyResponse = () => {
    if (!activeModal || !aiResponse) return;
    const task = tasks.find(t => t.id === activeModal.taskId);
    if (task) {
        updateTask({ ...task, consultationHistory: [...(task.consultationHistory || []), aiResponse] });
        alert("Сохранено в Историю консультаций");
        handleCloseModal();
    }
  };

  const generateChallenge = async (e: React.MouseEvent, taskId: string, content: string) => {
    e.stopPropagation();
    setGeneratingChallengeFor(taskId);
    try {
        const challenge = await generateTaskChallenge(content, config);
        setGeneratingChallengeFor(current => {
            if (current === taskId) {
                setDraftChallenge(challenge);
                setActiveModal({ taskId, type: 'challenge' });
                return null;
            }
            return current;
        });
    } catch (e) {
        setGeneratingChallengeFor(current => current === taskId ? null : current);
    }
  };

  const stopGeneration = (e: React.MouseEvent) => {
      e.stopPropagation();
      setGeneratingChallengeFor(null);
  };

  const acceptDraftChallenge = () => {
      const task = getTaskForModal();
      if (task && draftChallenge) {
          const updatedTask: Task = { ...task };
          if (task.column === 'todo') updatedTask.column = 'doing';
          if (task.activeChallenge) updatedTask.challengeHistory = [...(task.challengeHistory || []), task.activeChallenge];
          updatedTask.activeChallenge = draftChallenge;
          updatedTask.isChallengeCompleted = false;
          updateTask(updatedTask);
          
          handleCloseModal();
      }
  };

  const toggleChallengeComplete = (e?: React.MouseEvent) => {
      if(e) e.stopPropagation();
      const task = getTaskForModal();
      if(task) {
          updateTask({ ...task, isChallengeCompleted: !task.isChallengeCompleted });
      }
  };
  
  const toggleChallengeCompleteFromCard = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      updateTask({ ...task, isChallengeCompleted: !task.isChallengeCompleted });
  };

  const toggleChallengeCheckbox = (globalIndex: number, task: Task) => {
      if (!task.activeChallenge) return;
      const lines = task.activeChallenge.split('\n');
      let checkboxCounter = 0;
      const newLines = lines.map(line => {
          if (line.match(/^\s*(?:[-*+]|\d+\.)?\s*\[[xX ]\]/)) {
              if (checkboxCounter === globalIndex) {
                  const isChecked = line.includes('[x]') || line.includes('[X]');
                  checkboxCounter++;
                  return line.replace(/\[([ xX])\]/, isChecked ? '[ ]' : '[x]');
              }
              checkboxCounter++;
          }
          return line;
      });
      updateTask({ ...task, activeChallenge: newLines.join('\n') });
  };
  
  const handleToggleChallengeStepPin = (globalIndex: number) => {
      const task = getTaskForModal();
      if (!task) return;
      const currentPinned = task.pinnedChallengeIndices || [];
      const isPinned = currentPinned.includes(globalIndex);
      
      const newPinned = isPinned 
        ? currentPinned.filter(i => i !== globalIndex)
        : [...currentPinned, globalIndex];
      
      updateTask({ ...task, pinnedChallengeIndices: newPinned });
  };

  const moveToDoing = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      if (!canMoveTask(task, 'doing')) return;
      updateTask({ ...task, column: 'doing' });
  };

  const handleQuickComplete = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      if (task.activeChallenge && !task.isChallengeCompleted) {
          alert('Необходимо завершить активный челлендж перед закрытием задачи!');
          return;
      }
      
      const newCol = task.column === 'done' ? 'todo' : 'done';
      updateTask({ ...task, column: newCol });
  };

  const handleAddSubtask = () => {
      const task = getTaskForModal();
      if (!task || !newSubtaskText.trim()) return;
      
      const newSubtask: Subtask = {
          id: Date.now().toString(),
          text: newSubtaskText.trim(),
          isCompleted: false,
          isPinned: false
      };
      
      updateTask({
          ...task,
          subtasks: [...(task.subtasks || []), newSubtask]
      });
      setNewSubtaskText('');
  };

  const handleAddSubtaskFromCard = (taskId: string) => {
      const text = cardSubtaskInputs[taskId]?.trim();
      if (!text) return;
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const newSubtask: Subtask = {
          id: Date.now().toString(),
          text: text,
          isCompleted: false,
          isPinned: false
      };
      updateTask({ ...task, subtasks: [...(task.subtasks || []), newSubtask] });
      setCardSubtaskInputs(prev => ({...prev, [taskId]: ''}));
  };

  const handleToggleSubtask = (subtaskId: string, taskId?: string) => {
      const targetTaskId = taskId || activeModal?.taskId;
      if (!targetTaskId) return;
      
      const task = tasks.find(t => t.id === targetTaskId);
      if (!task || !task.subtasks) return;
      
      if (task.column === 'done') return;

      const updatedSubtasks = task.subtasks.map(s => 
          s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
      );
      
      updateTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (subtaskId: string, taskId?: string) => {
      const targetTaskId = taskId || activeModal?.taskId;
      if (!targetTaskId) return;
      
      const task = tasks.find(t => t.id === targetTaskId);
      if (!task || !task.subtasks) return;
      
      updateTask({ ...task, subtasks: task.subtasks.filter(s => s.id !== subtaskId) });
  };

  const handleSubtaskDragStart = (e: React.DragEvent, subtaskId: string, taskId: string) => {
      e.dataTransfer.setData('subtaskId', subtaskId);
      e.dataTransfer.setData('sourceTaskId', taskId);
      e.dataTransfer.effectAllowed = 'move';
      e.stopPropagation();
  };

  const handleSubtaskDrop = (e: React.DragEvent, targetSubtaskId: string, task: Task) => {
      e.preventDefault();
      e.stopPropagation();
      const draggedSubtaskId = e.dataTransfer.getData('subtaskId');
      const sourceTaskId = e.dataTransfer.getData('sourceTaskId');

      if (!draggedSubtaskId || !sourceTaskId) return;
      if (sourceTaskId !== task.id) return; 

      if (!task.subtasks) return;

      const subtasks = [...task.subtasks];
      const dragIdx = subtasks.findIndex(s => s.id === draggedSubtaskId);
      const targetIdx = subtasks.findIndex(s => s.id === targetSubtaskId);

      if (dragIdx === -1 || targetIdx === -1 || dragIdx === targetIdx) return;

      const [moved] = subtasks.splice(dragIdx, 1);
      subtasks.splice(targetIdx, 0, moved);

      updateTask({ ...task, subtasks });
  };

  const deleteActiveChallenge = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const task = getTaskForModal();
      if (!task) return;
      if (window.confirm('Удалить активный челлендж?')) {
          updateTask({ ...task, activeChallenge: undefined, isChallengeCompleted: undefined });
      }
  };

  const deleteChallengeFromHistory = (index: number) => {
      const task = getTaskForModal();
      if (!task || !task.challengeHistory) return;
      if (window.confirm('Удалить челлендж из истории?')) {
          const newHistory = [...task.challengeHistory];
          newHistory.splice(index, 1);
          updateTask({ ...task, challengeHistory: newHistory });
      }
  };

  const deleteConsultation = (index: number) => {
      const task = getTaskForModal();
      if (!task || !task.consultationHistory) return;
      if (window.confirm('Удалить консультацию?')) {
          const newHistory = [...task.consultationHistory];
          newHistory.splice(index, 1);
          updateTask({ ...task, consultationHistory: newHistory });
      }
  };

  const getTaskForModal = () => tasks.find(t => t.id === activeModal?.taskId);

  const handleTitleSave = () => {
      const task = getTaskForModal();
      if (task && (task.title || '') !== editTaskTitle.trim()) {
          updateTask({ ...task, title: applyTypography(editTaskTitle.trim()) });
      }
  };

  // --- HELPER: TECHNO TIME & GLOW ---
  const getTechGlow = (spheres: string[] | undefined, activeFilter: string | null) => {
      if (!activeFilter || !spheres || !spheres.includes(activeFilter)) return 'none';
      const color = NEON_COLORS[activeFilter];
      return `0 0 20px -5px ${color}`;
  };

  const renderCardChecklist = (task: Task) => {
    const subtasksTotal = task.subtasks?.length || 0;
    const subtasksDone = task.subtasks?.filter(s => s.isCompleted).length || 0;
    const firstSphere = task.spheres && task.spheres.length > 0 ? task.spheres[0] : null;
    const sphereColorClass = firstSphere && NEON_COLORS[firstSphere] ? `text-[${NEON_COLORS[firstSphere]}]` : 'text-indigo-500';

    return (
    <div className="mt-2 mb-2">
        <CollapsibleSection
            title="Чек-лист"
            icon={<ListTodo size={12}/>}
            isCard
        >
            {subtasksTotal > 0 && (
                <div className="mb-2">
                    <SegmentedProgressBar total={subtasksTotal} current={subtasksDone} color={sphereColorClass} className="mb-0" />
                </div>
            )}
            <div className="space-y-1">
                {task.subtasks?.map(s => (
                    <div 
                        key={s.id} 
                        className="group flex items-start gap-3 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-all duration-200 cursor-pointer relative"
                        draggable
                        onDragStart={(e) => handleSubtaskDragStart(e, s.id, task.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleSubtaskDrop(e, s.id, task)}
                        onClick={(e) => { e.stopPropagation(); handleToggleSubtask(s.id, task.id); }}
                    >
                        {/* CUSTOM CHECKBOX (Same style as modal) */}
                        <div className={`
                            w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 mt-0.5
                            ${s.isCompleted 
                                ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                                : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400 bg-white dark:bg-transparent'
                            }
                        `}>
                            {s.isCompleted && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                        
                        <span className={`text-sm flex-1 break-words leading-relaxed transition-all duration-300 ${s.isCompleted ? "text-slate-400 line-through opacity-50" : "text-[#2F3437] dark:text-slate-200"}`}>{s.text}</span>
                        
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(s.id, task.id); }} className="text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"><X size={12}/></button>
                    </div>
                ))}
                <div className="flex gap-2 mt-2 px-1" onClick={e => e.stopPropagation()}>
                    <input
                        type="text"
                        className="flex-1 min-w-0 bg-transparent border-b border-slate-200 dark:border-slate-700 py-1 text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-indigo-400 transition-colors"
                        placeholder="Добавить..."
                        value={cardSubtaskInputs[task.id] || ''}
                        onChange={(e) => setCardSubtaskInputs(prev => ({...prev, [task.id]: e.target.value}))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtaskFromCard(task.id)}
                    />
                    <button onClick={() => handleAddSubtaskFromCard(task.id)} disabled={!cardSubtaskInputs[task.id]?.trim()} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1.5 rounded-lg disabled:opacity-50 transition-colors">
                        <Plus size={16} />
                    </button>
                </div>
            </div>
        </CollapsibleSection>
    </div>
  )};

  const ColorPickerPopover: React.FC<{ 
    onSelect: (colorId: string) => void, 
    onClose: () => void, 
    triggerRef: React.RefObject<HTMLElement> 
}> = ({ onSelect, onClose, triggerRef }) => {
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

            // Flip vertically if not enough space below
            if (bottomSpace < height && topSpace > height) {
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
    }, [triggerRef]);

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

  const renderColumn = (col: typeof columns[0]) => {
    if (!col) return null;
    // X-RAY LOGIC: Filter by column, but apply dimming in map based on search/sphere
    const tasksInCol = baseActiveTasks.filter(t => t.column === col.id);
    const sortedTasks = getSortedTasks(tasksInCol);
    
    return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-transparent">
        {/* Floating Header - Architectural Graphite Style */}
        <div className="hidden md:flex items-center mb-4 gap-3 pl-1 select-none">
            <h3 className="font-sans font-semibold text-[0.85rem] uppercase tracking-[0.15em] text-[#2F3437] dark:text-slate-200">
                {col.title}
            </h3>
            <span className="font-mono text-xs font-normal text-[#2F3437]/60 dark:text-slate-500/60">
                [ {String(tasksInCol.length).padStart(2, '0')} ]
            </span>
        </div>
        
        {col.id === 'todo' && (
             <div className="mb-4 px-1">
                {!isCreatorOpen ? (
                    <button 
                        onClick={() => { setIsCreatorOpen(true); setTimeout(() => creationContentRef.current?.focus(), 100); }}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all uppercase tracking-wider font-mono"
                    >
                        <Plus size={14} /> NEW_TASK
                    </button>
                ) : (
                    <div className={`${getTaskColorClass(creationColor)} border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg animate-in slide-in-from-top-2 relative z-20`}>
                        {creationCover && (
                            <div className="relative w-full h-32 group rounded-t-xl overflow-hidden mb-2 -mt-4 -mx-4 w-[calc(100%_+_2rem)]">
                                <img src={creationCover} alt="Cover" className="w-full h-full object-cover" />
                                <button onClick={() => setCreationCover(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={14} /></button>
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                            <input 
                                type="text" 
                                placeholder="Название" 
                                className="w-full bg-transparent text-lg font-sans font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                autoFocus
                            />
                            <button onClick={cancelCreateTask} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"><X size={20} /></button>
                        </div>
                        
                        <div 
                            ref={creationContentRef}
                            contentEditable
                            className="w-full min-h-[120px] max-h-[300px] overflow-y-auto outline-none text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans mb-3 [&_h1]:text-xl [&_h1]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 cursor-text"
                            onInput={handleCreationInput}
                            onBlur={() => saveCreationSelection()}
                            onMouseUp={() => saveCreationSelection()}
                            onKeyUp={() => saveCreationSelection()}
                            data-placeholder="Контекст задачи..."
                        />

                        {/* Toolbar */}
                        <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 mask-fade-right">
                                <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execCreationUndo(); }} disabled={creationHistoryIndex <= 0} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execCreationRedo(); }} disabled={creationHistoryIndex >= creationHistory.length - 1} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCreationCmd('bold'); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500"><Bold size={16} /></button></Tooltip>
                                <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCreationCmd('italic'); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500"><Italic size={16} /></button></Tooltip>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                <Tooltip content="Очистить"><button onMouseDown={handleClearCreationStyle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Eraser size={16} /></button></Tooltip>
                                <div className="relative">
                                    <Tooltip content="Обложка">
                                        <button 
                                            ref={creationPickerTriggerRef}
                                            onMouseDown={(e) => { e.preventDefault(); setShowCreationCoverPicker(!showCreationCoverPicker); }} 
                                            className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ${creationCover ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                        >
                                            <Layout size={16} />
                                        </button>
                                    </Tooltip>
                                    {showCreationCoverPicker && <CoverPicker onSelect={setCreationCover} onClose={() => setShowCreationCoverPicker(false)} triggerRef={creationPickerTriggerRef} />}
                                </div>
                                <div className="relative">
                                    <Tooltip content="Фон задачи">
                                        <button 
                                            ref={creationColorTriggerRef}
                                            onMouseDown={(e) => { e.preventDefault(); setShowCreationColorPicker(!showCreationColorPicker); }} 
                                            className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ${creationColor !== 'white' ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                        >
                                            <Palette size={16} />
                                        </button>
                                    </Tooltip>
                                    {showCreationColorPicker && <ColorPickerPopover onSelect={setCreationColor} onClose={() => setShowCreationColorPicker(false)} triggerRef={creationColorTriggerRef} />}
                                </div>
                            </div>
                            <button onClick={handleCreateTask} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1.5 rounded-lg disabled:opacity-50 transition-colors">
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        <div className="flex-1 space-y-4 pb-2 px-1 flex-none" onDrop={(e) => handleColumnDrop(e, col.id)} onDragOver={handleDragOver}>
            <AnimatePresence>
            {sortedTasks.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 0.5 }} 
                    exit={{ opacity: 0 }}
                    className="py-12 flex flex-col items-center justify-center text-center"
                >
                   <span className="font-mono text-slate-300 dark:text-slate-700 text-xs uppercase tracking-widest">[NO DATA]</span>
                </motion.div>
            ) : (
                sortedTasks.map((task, i) => {
                    const match = isMatch(task);
                    // X-Ray Styling: Faded if no match
                    const dimStyle = !match ? "opacity-10 grayscale blur-[1px] pointer-events-none scale-95" : "";

                    const hasJournalEntry = journalEntries.some(e => e.linkedTaskId === task.id);
                    const hasActiveChallenge = task.activeChallenge && !task.isChallengeCompleted;
                    
                    // TECHNO STYLING
                    const glow = getTechGlow(task.spheres, activeSphereFilter);

                    return (
                    <motion.div 
                        key={task.id}
                        layout 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: match ? 1 : 0.1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={match ? { 
                            y: -8, 
                            scale: 1.01,
                            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)"
                        } : {}}
                        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                        style={{ boxShadow: glow }}
                        draggable={match}
                        onDragStart={(e) => handleDragStart(e as any, task.id)} 
                        onDrop={(e) => handleTaskDrop(e as any, task.id)} 
                        onDragOver={handleDragOver} 
                        onClick={() => match && setActiveModal({taskId: task.id, type: 'details'})} 
                        className={`${getTaskColorClass(task.color)} backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative group active:scale-[1.02] active:shadow-lg overflow-hidden ${dimStyle} ${match ? 'cursor-grab' : ''}`}
                    >
                        
                        {task.coverUrl && (
                            <div className="h-32 w-full shrink-0 relative overflow-hidden">
                                <img src={task.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                            </div>
                        )}

                        {/* Content Wrapper - Padded */}
                        <div className="p-5 flex flex-col gap-0 h-full">
                            {/* HEADER: Title + Control */}
                            <div className="flex justify-between items-start gap-2 mb-2">
                                 <div className="flex-1 pt-0.5 min-w-0">
                                    {task.title ? (
                                        <h4 className="font-sans text-sm font-medium text-[#2F3437] dark:text-slate-200 leading-snug break-words group-hover:text-black dark:group-hover:text-white transition-colors tracking-tight">
                                            <HighlightedText text={applyTypography(task.title)} highlight={searchQuery} />
                                        </h4>
                                    ) : null}
                                 </div>
                                 
                                 <div className="shrink-0 z-20 -mr-2 -mt-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <CardSphereSelector task={task} updateTask={updateTask} />
                                 </div>
                            </div>

                            {/* CONTENT */}
                            <div className="mb-3">
                                <div className={`text-[#2F3437] dark:text-slate-400 font-sans text-sm leading-relaxed line-clamp-3 ${!task.title ? 'text-base' : ''}`}>
                                     <ReactMarkdown components={markdownComponents}>{formatForDisplay(applyTypography(task.content))}</ReactMarkdown>
                                </div>
                            </div>

                            {/* TODO SPECIFIC MODULES */}
                            {col.id === 'todo' && (
                                <>
                                    {renderCardChecklist(task)}
                                </>
                            )}

                            {/* DOING SPECIFIC MODULES */}
                            {col.id === 'doing' && (
                                <>
                                    {renderCardChecklist(task)}

                                    {task.activeChallenge && !task.isChallengeCompleted && !draftChallenge && (
                                        <div className="mt-2 mb-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setActiveModal({taskId: task.id, type: 'details'}); }}
                                                className="w-full text-left group/challenge"
                                            >
                                                <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 transition-all relative overflow-hidden">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Активный челлендж</span>
                                                        </div>
                                                        <div className="text-slate-300 dark:text-slate-600 group-hover/challenge:text-indigo-400 transition-colors">
                                                            <Maximize2 size={12} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* DONE COLUMN SPECIFIC RENDER ORDER */}
                            {col.id === 'done' && (
                                <>
                                    {renderCardChecklist(task)}
                                </>
                            )}

                            <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                                {/* Left: Actions (Napkins Style) */}
                                <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                   {col.id === 'todo' && (
                                        <Tooltip content="В работу">
                                            <button 
                                                onClick={(e) => moveToDoing(e, task)} 
                                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"
                                            >
                                                <Play size={16} className="fill-current" />
                                            </button>
                                        </Tooltip>
                                   )}

                                   {col.id === 'doing' && (
                                       <>
                                           <Tooltip content={hasJournalEntry ? "В Дневнике" : "В Дневник"}>
                                               <button 
                                                    onClick={(e) => { e.stopPropagation(); onReflectInJournal(task.id); }}
                                                    className={`p-2 rounded-full transition-all opacity-60 hover:opacity-100 ${
                                                        hasJournalEntry 
                                                        ? 'text-cyan-500 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100' 
                                                        : 'text-slate-400 dark:text-slate-500 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
                                                    }`}
                                               >
                                                    <Book size={16} />
                                               </button>
                                           </Tooltip>

                                           {!draftChallenge && hasChallengeAuthors && (
                                               <Tooltip 
                                                    content={generatingChallengeFor === task.id ? "Остановить" : "Челлендж (ИИ)"}
                                                    disabled={generatingChallengeFor === task.id}
                                               >
                                                   <button 
                                                        disabled={hasActiveChallenge}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (generatingChallengeFor === task.id) {
                                                                stopGeneration(e);
                                                                return;
                                                            }
                                                            if (hasActiveChallenge) return;
                                                            if (window.confirm("Создать челлендж?")) {
                                                                generateChallenge(e, task.id, task.content);
                                                            }
                                                        }} 
                                                        className={`p-2 rounded-full transition-all opacity-60 hover:opacity-100
                                                            ${hasActiveChallenge 
                                                                ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' 
                                                                : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                                                            }`}
                                                   >
                                                        {generatingChallengeFor === task.id ? (
                                                            <div className="relative w-4 h-4 flex items-center justify-center">
                                                                <div className="absolute inset-0 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                            </div>
                                                        ) : (
                                                            <Zap size={16} />
                                                        )}
                                                    </button>
                                               </Tooltip>
                                           )}

                                           {hasKanbanTherapist && (
                                               <Tooltip 
                                                    content={generatingTherapyFor === task.id ? "Остановить" : "Консультант (ИИ)"}
                                                    disabled={generatingTherapyFor === task.id}
                                               >
                                                   <button 
                                                        onClick={(e) => openTherapy(e, task)} 
                                                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-all opacity-60 hover:opacity-100"
                                                   >
                                                       {generatingTherapyFor === task.id ? (
                                                            <div className="relative w-4 h-4 flex items-center justify-center">
                                                                <div className="absolute inset-0 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                            </div>
                                                       ) : (
                                                           <Bot size={16} /> 
                                                       )}
                                                   </button>
                                               </Tooltip>
                                           )}
                                           <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                           <Tooltip content="Завершить">
                                                <button 
                                                    onClick={(e) => handleQuickComplete(e, task)} 
                                                    className="p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all opacity-60 hover:opacity-100"
                                                >
                                                    <Check size={16} strokeWidth={3} />
                                                </button>
                                            </Tooltip>
                                       </>
                                   )}
                                   
                                   {col.id === 'done' && (
                                        <>
                                            <Tooltip content="В Зал славы">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if(window.confirm('Перенести задачу в Зал славы?')) archiveTask(task.id); 
                                                    }} 
                                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-all opacity-60 hover:opacity-100"
                                                >
                                                    <Trophy size={16} /> 
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Вернуть в работу">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        updateTask({ ...task, column: 'doing' }); 
                                                    }} 
                                                    className="p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all opacity-60 hover:opacity-100"
                                                >
                                                    <RotateCcw size={16} strokeWidth={2} />
                                                </button>
                                            </Tooltip>
                                        </>
                                   )}
                                </div>

                                {/* Right: Meta Data */}
                                <div className="text-[10px] font-mono text-[#6B6E70] dark:text-slate-500 flex gap-2 select-none pointer-events-none">
                                    <span>[ID: {task.id.slice(-4)}]</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )})
            )}
            </AnimatePresence>
        </div>
    </div>
    );
  };

  // ... (Main render logic with activeModal)

  return (
    <div ref={scrollContainerRef} className="flex flex-col h-full relative overflow-y-auto overflow-x-hidden bg-[#f8fafc] dark:bg-[#0f172a]" style={DOT_GRID_STYLE}>
      {/* ... (Titles and Search bar - same) ... */}
      <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Спринты</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Фокус на главном</p>
            </div>
        </header>
      </div>

      <motion.div className="sticky top-0 z-40 w-full mb-[-20px]" animate={{ y: isHeaderHidden ? '-100%' : '0%' }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
            {/* ... Search Bar Content ... */}
            <div className="absolute inset-0 h-[140%] pointer-events-none -z-10">
                <div className="absolute inset-0 backdrop-blur-xl" style={{ maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)' }} />
                <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc] via-[#f8fafc]/95 to-transparent dark:from-[#0f172a] dark:via-[#0f172a]/95 dark:to-transparent" />
            </div>
            <div className="relative z-10 w-full px-4 md:px-8 pb-2">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <input ref={searchInputRef} type="text" placeholder="Поиск задач..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-all shadow-sm placeholder:text-slate-400" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={16} /></button>}
                    </div>
                    <Tooltip content="Сферы" side="bottom"><button onClick={() => setShowSphereSelector(!showSphereSelector)} className={`p-3 rounded-2xl border-none transition-all shadow-sm ${showSphereSelector || activeSphereFilter ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}><Layout size={20} /></button></Tooltip>
                    <Tooltip content="Сортировка" side="bottom"><button onClick={toggleSortOrder} className="p-3 rounded-2xl border-none transition-all shadow-sm bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">{sortOrder === 'asc' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}</button></Tooltip>
                </div>
                {(showSphereSelector || activeSphereFilter) && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-1 pt-2 animate-in slide-in-from-top-2 duration-200 scrollbar-none">
                        <button onClick={() => setActiveSphereFilter(null)} className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap ${!activeSphereFilter ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-600' : 'bg-white dark:bg-[#1e293b] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}>Все</button>
                        {SPHERES.map(s => { const isActive = activeSphereFilter === s.id; return (<button key={s.id} onClick={() => setActiveSphereFilter(isActive ? null : s.id)} className={`px-3 py-1.5 text-xs font-mono font-bold rounded-full transition-all flex items-center gap-1.5 border uppercase tracking-wider whitespace-nowrap ${isActive ? `${s.bg.replace('/30','')} ${s.text} ${s.border} shadow-sm ring-1 ring-offset-1 dark:ring-offset-slate-900 ring-${s.color}-400` : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300'}`}>{isActive ? `[ ${s.label} ]` : s.label}</button>); })}
                    </div>
                )}
            </div>
      </motion.div>

      <div className="w-full px-4 md:px-8 pt-10 pb-8 flex-1 min-h-0">
         <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 mb-4 bg-transparent">
            {columns.map(col => (<button key={col.id} onClick={() => setActiveMobileTab(col.id as any)} className={getTabClass(col.id, activeMobileTab === col.id)}>{col.title} <span className="opacity-60 text-[10px] font-mono">({baseActiveTasks.filter(t => t.column === col.id).length})</span></button>))}
         </div>
         <div className="flex flex-col md:flex-row gap-8 h-full md:items-start">
            {columns.map(col => { const isHiddenOnMobile = activeMobileTab !== col.id; return (<div key={col.id} className={`flex-1 min-w-[300px] flex-col h-full ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}>{renderColumn(col)}</div>); })}
         </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-2xl flex items-center justify-center p-4" onClick={handleCloseModal}>
            <div className={`${isEditingTask ? getTaskColorClass(editColor) : getTaskColorClass(getTaskForModal()?.color)} w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 border border-white/20 dark:border-slate-700/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col relative backdrop-filter`} onClick={(e) => e.stopPropagation()}>
                
                {(isEditingTask ? editCover : getTaskForModal()?.coverUrl) && (
                    <div className="h-40 w-full shrink-0 relative mb-6 -mx-8 -mt-8 w-[calc(100%_+_4rem)] group overflow-hidden">
                        <img src={isEditingTask ? editCover! : getTaskForModal()!.coverUrl!} alt="Cover" className="w-full h-full object-cover" />
                        {isEditingTask && (
                            <button onClick={() => setEditCover(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                )}

                {/* MODAL HEADER */}
                <div className="flex justify-between items-start mb-6 shrink-0 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                    <div className="flex flex-col gap-1 pr-4 w-full">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            Хаб <ChevronRight size={10} /> {activeModal.type === 'challenge' ? 'Вызов' : activeModal.type === 'stuck' ? 'Терапия' : 'Задача'}
                        </div>
                        {activeModal.type === 'details' ? (
                            <input 
                                type="text" 
                                placeholder="Название" 
                                value={editTaskTitle} 
                                onChange={(e) => setEditTaskTitle(e.target.value)} 
                                onBlur={() => { if (!isEditingTask) handleTitleAutosave(); }}
                                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                className="text-2xl font-sans font-bold text-slate-900 dark:text-white leading-tight bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 w-full p-0 m-0" 
                            />
                        ) : (
                            <h3 className="text-2xl font-sans font-bold text-slate-900 dark:text-white leading-tight">
                                {activeModal.type === 'stuck' && <span className="flex items-center gap-2"><Bot size={24} className="text-violet-500"/> Личный консультант</span>}
                                {activeModal.type === 'challenge' && <span className="flex items-center gap-2"><Zap size={24} className="text-indigo-500"/> Новый вызов</span>}
                            </h3>
                        )}
                    </div>
                    <div className="flex items-center shrink-0 gap-1">
                        {activeModal.type === 'details' && !isEditingTask && (
                            (() => {
                                const task = getTaskForModal();
                                if (task && task.column !== 'done') {
                                    return (
                                        <>
                                            <Tooltip content="Редактировать"><button onClick={() => setIsEditingTask(true)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"><Edit3 size={18} /></button></Tooltip>
                                            <Tooltip content="Удалить"><button onClick={() => { if(window.confirm('Удалить задачу?')) { deleteTask(task.id); handleCloseModal(); } }} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"><Trash2 size={18} /></button></Tooltip>
                                            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                        </>
                                    );
                                }
                                return null;
                            })()
                        )}
                        <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors ml-1"><X size={20} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-light min-h-0 pr-1">
                    {/* ... (Stuck / Challenge content blocks - same) ... */}
                    {activeModal.type === 'stuck' && (
                        <div className="space-y-4">
                            {aiResponse ? (
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                        <div className="text-[#2F3437] dark:text-slate-300 font-sans text-sm leading-relaxed">
                                            <ReactMarkdown components={markdownComponents}>{formatForDisplay(aiResponse)}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 py-10 flex flex-col items-center gap-2"><Bot size={32} className="opacity-20" /><span>Не удалось получить ответ.</span></div>
                            )}
                        </div>
                    )}
                    {activeModal.type === 'challenge' && draftChallenge && (
                        <div className="flex flex-col h-full">
                            <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                <div className="text-[#2F3437] dark:text-slate-300 font-sans text-sm leading-relaxed"><StaticChallengeRenderer content={draftChallenge} mode="draft" /></div>
                            </div>
                        </div>
                    )}

                    {activeModal.type === 'details' && (() => {
                        const task = getTaskForModal();
                        if (!task) return null;
                        const isDone = task.column === 'done';
                        const subtasksTotal = task.subtasks?.length || 0;
                        const subtasksDone = task.subtasks?.filter(s => s.isCompleted).length || 0;
                        const firstSphere = task.spheres && task.spheres.length > 0 ? task.spheres[0] : null;
                        const sphereColorClass = firstSphere && NEON_COLORS[firstSphere] ? `text-[${NEON_COLORS[firstSphere]}]` : 'text-indigo-500';

                        return (
                            <div className="space-y-6">
                                {isEditingTask ? (
                                    <div className="flex flex-col animate-in fade-in duration-200 relative z-10">
                                        <div className="flex items-center justify-between mb-2 gap-2">
                                            <div className="flex items-center gap-1 pb-1 overflow-x-auto scrollbar-none flex-1 mask-fade-right">
                                                <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execEditUndo(); }} disabled={editHistoryIndex <= 0} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                                <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execEditRedo(); }} disabled={editHistoryIndex >= editHistory.length - 1} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('bold'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Bold size={16} /></button></Tooltip>
                                                <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('italic'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Italic size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Очистить"><button onMouseDown={handleClearEditStyle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Eraser size={16} /></button></Tooltip>
                                                <div className="relative">
                                                    <Tooltip content="Обложка">
                                                        <button 
                                                            ref={editPickerTriggerRef}
                                                            onMouseDown={(e) => { e.preventDefault(); setShowEditCoverPicker(!showEditCoverPicker); }} 
                                                            className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ${editCover ? 'text-indigo-500' : 'text-slate-500 dark:text-slate-400'}`}
                                                        >
                                                            <Layout size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    {showEditCoverPicker && <CoverPicker onSelect={setEditCover} onClose={() => setShowEditCoverPicker(false)} triggerRef={editPickerTriggerRef} />}
                                                </div>
                                                <div className="relative">
                                                    <Tooltip content="Фон задачи">
                                                        <button 
                                                            ref={editColorTriggerRef}
                                                            onMouseDown={(e) => { e.preventDefault(); setShowEditColorPicker(!showEditColorPicker); }} 
                                                            className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors ${editColor !== 'white' ? 'text-indigo-500' : ''}`}
                                                        >
                                                            <Palette size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    {showEditColorPicker && <ColorPickerPopover onSelect={setEditColor} onClose={() => setShowEditColorPicker(false)} triggerRef={editColorTriggerRef} />}
                                                </div>
                                            </div>
                                        </div>
                                        {/* ... (Edit Content Editable) ... */}
                                        <div 
                                            key={activeModal.taskId}
                                            ref={editContentEditableRef} 
                                            contentEditable 
                                            suppressContentEditableWarning={true}
                                            onInput={handleEditInput} 
                                            className="w-full h-64 bg-slate-50 dark:bg-black/20 rounded-xl p-4 text-base text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 focus:border-indigo-300 dark:focus:border-indigo-500 outline-none overflow-y-auto font-sans [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1"
                                            data-placeholder="Описание задачи..." 
                                        />
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Сферы</label>
                                            <SphereSelector selected={task.spheres || []} onChange={(s) => updateTask({...task, spheres: s})} />
                                        </div>
                                        <div className="flex flex-col-reverse md:flex-row justify-end items-stretch md:items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-4">
                                            <button onClick={() => setIsEditingTask(false)} className="px-5 py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 w-full md:w-auto text-center font-medium">Отмена</button>
                                            <button onClick={handleSaveTaskContent} className="px-8 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 font-bold text-sm flex items-center justify-center gap-2 w-full md:w-auto shadow-lg shadow-indigo-500/20"><Check size={18} /> Сохранить</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group relative pr-1">
                                        {/* ... (Read mode content: Description, Content, Checklist, Challenge, History) ... */}
                                        {task.description && (<CollapsibleSection title="Контекст" icon={<FileText size={12}/>}><div className="text-xs text-[#6B6E70] dark:text-slate-400 leading-relaxed font-sans"><ReactMarkdown components={markdownComponents}>{formatForDisplay(applyTypography(task.description))}</ReactMarkdown></div></CollapsibleSection>)}
                                        <div className="text-[#2F3437] dark:text-slate-300 text-sm font-normal leading-relaxed font-sans mb-4"><ReactMarkdown components={markdownComponents}>{formatForDisplay(applyTypography(task.content))}</ReactMarkdown></div>
                                        
                                        {(task.subtasks && task.subtasks.length > 0 || !isDone) && (
                                            <CollapsibleSection title="Чек-лист" icon={<ListTodo size={14}/>}>
                                                {subtasksTotal > 0 && <SegmentedProgressBar total={subtasksTotal} current={subtasksDone} color={sphereColorClass} />}
                                                <div className="space-y-1">
                                                    {task.subtasks?.map(s => (
                                                        <div key={s.id} className="group flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-all duration-200 hover:translate-x-0.5 cursor-pointer relative" draggable={!isDone} onDragStart={!isDone ? (e) => handleSubtaskDragStart(e, s.id, task.id) : undefined} onDragOver={handleDragOver} onDrop={!isDone ? (e) => handleSubtaskDrop(e, s.id, task) : undefined} onClick={() => !isDone && handleToggleSubtask(s.id)}>
                                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 mt-0.5 ${s.isCompleted ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400 bg-white dark:bg-transparent'}`}>{s.isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}</div>
                                                            <span className={`text-sm flex-1 break-words leading-relaxed transition-all duration-300 ${s.isCompleted ? "text-slate-400 line-through opacity-50" : "text-[#2F3437] dark:text-slate-200"}`}>{s.text}</span>
                                                            {!isDone && <button onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(s.id); }} className="text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><X size={14}/></button>}
                                                        </div>
                                                    ))}
                                                    {!isDone && (<div className="flex gap-2 mt-3 pl-2"><input type="text" className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 py-1 text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-indigo-400 transition-colors" placeholder="Новый пункт..." value={newSubtaskText} onChange={(e) => setNewSubtaskText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()} /><button onClick={handleAddSubtask} disabled={!newSubtaskText.trim()} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1.5 rounded-lg disabled:opacity-50 transition-colors"><Plus size={18}/></button></div>)}
                                                </div>
                                            </CollapsibleSection>
                                        )}

                                        {task.activeChallenge && (
                                            <CollapsibleSection title={task.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"} icon={task.isChallengeCompleted ? <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> : <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />} actions={!isDone ? (<div className="flex items-center gap-3"><Tooltip content={task.isChallengeCompleted ? "Вернуть в активные" : "Завершить челлендж"}><button onClick={(e) => { e.stopPropagation(); toggleChallengeComplete(); }} className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${task.isChallengeCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:text-emerald-500 text-transparent'}`}><Check size={12} strokeWidth={3} /></button></Tooltip><div className="w-px h-3 bg-slate-300 dark:bg-slate-600"></div><Tooltip content="Удалить челлендж"><button onClick={(e) => deleteActiveChallenge(e)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button></Tooltip></div>) : null}>
                                                <div className="text-[#2F3437] dark:text-slate-300 font-sans text-sm leading-relaxed pl-1 pt-1">
                                                    {task.isChallengeCompleted ? <StaticChallengeRenderer content={task.activeChallenge} mode="history" /> : <InteractiveChallenge content={task.activeChallenge} onToggle={(i) => !isDone && toggleChallengeCheckbox(i, task)} onPin={!isDone ? (i) => handleToggleChallengeStepPin(i) : undefined} pinnedIndices={task.pinnedChallengeIndices} />}
                                                </div>
                                            </CollapsibleSection>
                                        )}

                                        {((task.challengeHistory && task.challengeHistory.length > 0) || (task.consultationHistory && task.consultationHistory.length > 0)) && (
                                            <CollapsibleSection title="История" icon={<History size={14}/>}>
                                                <div className="space-y-4">
                                                    {task.challengeHistory?.map((h, i) => (<div key={`ch-${i}`} className="text-sm bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 relative group"><div className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Zap size={10}/> Архивный челлендж</div><div className="text-[#2F3437] dark:text-slate-300 font-sans text-sm leading-relaxed"><StaticChallengeRenderer content={h} mode="history" /></div>{!isDone && <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><Tooltip content="Удалить"><button onClick={() => deleteChallengeFromHistory(i)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={12}/></button></Tooltip></div>}</div>))}
                                                    {task.consultationHistory?.map((h, i) => (<div key={`cons-${i}`} className="text-sm bg-violet-50/30 dark:bg-violet-900/10 p-4 rounded-xl border border-violet-100/50 dark:border-violet-800/30 relative group"><div className="text-[9px] font-bold text-violet-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Bot size={10}/> Консультация</div><div className="text-[#2F3437] dark:text-slate-300 font-sans text-sm leading-relaxed"><ReactMarkdown components={markdownComponents}>{formatForDisplay(applyTypography(h))}</ReactMarkdown></div>{!isDone && <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><Tooltip content="Удалить"><button onClick={() => deleteConsultation(i)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={12}/></button></Tooltip></div>}</div>))}
                                                </div>
                                            </CollapsibleSection>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
                {/* ... (Footer actions for modals - same) ... */}
                {activeModal.type === 'stuck' && aiResponse && (<div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50 pr-1"><button onClick={saveTherapyResponse} className="px-8 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 font-bold text-sm flex items-center justify-center gap-2 w-full md:w-auto shadow-lg shadow-indigo-500/20"><Save size={16} /> Сохранить в историю</button></div>)}
                {activeModal.type === 'challenge' && draftChallenge && (<div className="mt-6 flex justify-end gap-2 shrink-0 pt-4 border-t border-slate-100 dark:border-slate-700/50 pr-1"><button onClick={acceptDraftChallenge} className="px-8 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 font-bold text-sm flex items-center justify-center gap-2 w-full md:w-auto shadow-lg shadow-indigo-500/20"><Rocket size={18} /> Принять вызов</button></div>)}
            </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
