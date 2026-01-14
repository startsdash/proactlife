
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { JournalEntry, MentorAnalysis, Task, Note, AppConfig } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { applyTypography, ICON_MAP, SPHERES, MOOD_TAGS } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { 
  Book, Search, Plus, X, Edit3, Trash2, RotateCcw, RotateCw, Bold, Italic, Eraser, 
  Image as ImageIcon, Layout, Palette, Sparkles, Link, StickyNote, Activity, Calendar, 
  TrendingUp, Clock, Sun, Moon, Gem, Unlink, Check, ChevronDown, Upload, RefreshCw, Shuffle, ArrowRight, Globe
} from 'lucide-react';

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

const MOODS = [
    { value: 1, label: 'Ужасно', emoji: '😖', color: 'from-rose-500 to-red-600', text: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { value: 2, label: 'Плохо', emoji: '😕', color: 'from-orange-400 to-red-500', text: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { value: 3, label: 'Нормально', emoji: '😐', color: 'from-yellow-400 to-orange-400', text: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { value: 4, label: 'Хорошо', emoji: '🙂', color: 'from-teal-400 to-emerald-500', text: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    { value: 5, label: 'Отлично', emoji: '🤩', color: 'from-indigo-400 to-purple-500', text: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
];

const UNSPLASH_PRESETS = [
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=400&q=80',
    'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
    'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
];

const getJournalColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'short'
    });
};

const formatTimelineDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return {
        day: d.getDate(),
        month: d.toLocaleDateString('ru-RU', { month: 'short' }).toUpperCase(),
        time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
};

const findFirstUrl = (text: string): string | null => {
    const match = text.match(/(https?:\/\/[^\s]+)/);
    return match ? match[0] : null;
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

const getLinkedContentPreview = (content: string) => {
    return content.substring(0, 30) + (content.length > 30 ? '...' : '');
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
            
            if (el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0') >= 700) return wrap(content, '**');
            if (el.style.fontStyle === 'italic') return wrap(content, '*');
            
            switch (tag) {
                case 'b': case 'strong': return wrap(content, '**');
                case 'i': case 'em': return wrap(content, '*');
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
    md = md.replace(/\n{3,}/g, '\n\n').trim();
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
    
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        return `<img src="${src}" alt="${alt}" style="max-height: 300px; border-radius: 8px; margin: 8px 0; display: block; max-width: 100%; cursor: pointer;" />`;
    });
    
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        if (line.match(/^<(h1|h2|div|p|ul|ol|li|blockquote)/i)) return line;
        return line.trim() ? `<div>${line}</div>` : '<div><br></div>';
    });
    
    return processedLines.join('');
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
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
            className="block mt-4 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800 transition-all rounded-xl overflow-hidden group/link relative no-underline border border-black/5 dark:border-white/5 shadow-sm"
        >
            {data.image?.url && (
                <div className="h-32 w-full overflow-hidden relative">
                    <img src={data.image.url} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover/link:scale-105" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
            )}
            <div className="p-3">
                <h4 className="font-sans font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">{data.title}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 font-sans">{data.description}</p>
                <div className="flex items-center gap-2 text-[9px] text-slate-400 uppercase tracking-wider font-bold font-sans">
                    <Globe size={10} />
                    <span className="truncate">{data.publisher || new URL(url).hostname}</span>
                </div>
            </div>
        </a>
    );
});

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
        const keys = ['UNSPLASH_ACCESS_KEY', 'VITE_UNSPLASH_ACCESS_KEY', 'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY', 'REACT_APP_UNSPLASH_ACCESS_KEY'];
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
        if (!key) { if (q) alert("Ключ Unsplash не найден."); return; }
        setLoading(true);
        try {
            const page = Math.floor(Math.random() * 10) + 1;
            const endpoint = q 
                ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=20&page=${page}&client_id=${key}`
                : `https://api.unsplash.com/photos/random?count=20&client_id=${key}`;
            const res = await fetch(endpoint);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            const urls = q ? data.results.map((img: any) => img.urls.regular) : data.map((img: any) => img.urls.regular);
            setResults(urls);
        } catch (e) { console.error("Unsplash Error", e); } finally { setLoading(false); }
    };

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div className="fixed bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[9999] w-80 flex flex-col gap-3" style={pickerStyle} onMouseDown={e => e.stopPropagation()}>
                <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Обложка</span><button onClick={onClose}><X size={14} /></button></div>
                <div className="relative">
                    <input type="text" placeholder="Поиск Unsplash..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchUnsplash(query)} className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400" />
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <button onClick={() => searchUnsplash(query)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><ArrowRight size={12} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar-light min-h-[60px]">
                    {loading ? <div className="col-span-3 flex items-center justify-center py-4 text-slate-400"><RefreshCw size={16} className="animate-spin" /></div> : results.map((url, i) => (
                        <button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-video rounded overflow-hidden border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500 relative group bg-slate-100"><img src={url} className="w-full h-full object-cover" loading="lazy" /></button>
                    ))}
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={() => searchUnsplash()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors text-slate-600 dark:text-slate-300"><Shuffle size={12} /> Случайные</button>
                </div>
            </div>
        </>,
        document.body
    );
};

const ColorPickerPopover: React.FC<{ onSelect: (colorId: string) => void, onClose: () => void, triggerRef: React.RefObject<HTMLElement> }> = ({ onSelect, onClose, triggerRef }) => {
    const [style, setStyle] = useState<React.CSSProperties>({});
    useEffect(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setStyle({ position: 'fixed', top: rect.bottom + 8, left: rect.left, zIndex: 9999 });
        }
    }, [triggerRef]);
    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div className="fixed bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-[9999] flex-wrap max-w-[200px]" style={style} onMouseDown={e => e.stopPropagation()}>
                {colors.map(c => (
                    <button key={c.id} onMouseDown={(e) => { e.preventDefault(); onSelect(c.id); onClose(); }} className={`w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform`} style={{ backgroundColor: c.hex }} title={c.id} />
                ))}
            </div>
        </>,
        document.body
    );
};

const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
    const Icon = ICON_MAP[name] || ICON_MAP['User'];
    return <Icon className={className} />;
};

const JournalEntrySphereSelector: React.FC<{ entry: JournalEntry, updateEntry: (e: JournalEntry) => void, align?: 'left' | 'right', direction?: 'up' | 'down' }> = ({ entry, updateEntry, align = 'right', direction = 'down' }) => {
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
        const current = entry.spheres || [];
        const newSpheres = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
        updateEntry({ ...entry, spheres: newSpheres });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <span className="uppercase tracking-wider font-bold">Сфера</span>
                {entry.spheres && entry.spheres.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
                <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} ${align === 'right' ? 'right-0' : 'left-0'} w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5`} onClick={e => e.stopPropagation()}>
                    {SPHERES.map(s => {
                        const isSelected = entry.spheres?.includes(s.id);
                        const Icon = ICON_MAP[s.icon];
                        return (
                            <button key={s.id} onClick={() => toggleSphere(s.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                {Icon && <Icon size={12} className={isSelected ? s.text : 'text-slate-400'} />}
                                <span className="flex-1">{s.label}</span>
                                {isSelected && <Check size={12} className="text-indigo-500" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, notes, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask, onNavigateToNote }) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCover, setEditCover] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('white');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState<string | null>(null); 
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const editContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editPickerTriggerRef = useRef<HTMLButtonElement>(null);
  const editColorTriggerRef = useRef<HTMLButtonElement>(null);
  const lastSelectionRange = useRef<Range | null>(null);
  const [editHistory, setEditHistory] = useState<string[]>(['']);
  const [editHistoryIndex, setEditHistoryIndex] = useState(0);
  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (initialTaskId) {
        // If coming from a task reflection, open a NEW entry modal or focus
        // Here we just clear it for now as per previous logic logic
        onClearInitialTask?.();
    }
  }, [initialTaskId, onClearInitialTask]);

  const displayedEntries = useMemo(() => {
      let filtered = entries;
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(e => 
              (e.title && e.title.toLowerCase().includes(q)) || 
              e.content.toLowerCase().includes(q)
          );
      }
      return filtered.sort((a, b) => b.date - a.date);
  }, [entries, searchQuery]);

  const selectedEntry = entries.find(e => e.id === selectedEntryId);
  const selectedLinkedTask = selectedEntry?.linkedTaskId ? tasks.find(t => t.id === selectedEntry?.linkedTaskId) : null;
  const selectedLinkedNote = selectedEntry?.linkedNoteId ? notes.find(n => n.id === selectedEntry?.linkedNoteId) : null;

  const handleCloseModal = () => {
      setSelectedEntryId(null);
      setEditingId(null);
      setAnalysisResult(null);
  };

  const startEditing = (entry: JournalEntry) => {
      setEditingId(entry.id);
      setEditTitle(entry.title || '');
      setEditCover(entry.coverUrl || null);
      setEditColor(entry.color || 'white');
      const html = markdownToHtml(entry.content);
      setEditHistory([html]);
      setEditHistoryIndex(0);
      
      // Wait for render then set content
      setTimeout(() => {
          if (editContentRef.current) {
              editContentRef.current.innerHTML = html;
          }
      }, 0);
  };

  const saveEdit = (entry: JournalEntry) => {
      const rawHtml = editContentRef.current?.innerHTML || '';
      const content = htmlToMarkdown(rawHtml);
      updateEntry({
          ...entry,
          title: applyTypography(editTitle),
          content: applyTypography(content),
          coverUrl: editCover || undefined,
          color: editColor
      });
      setEditingId(null);
  };

  const cancelEditing = () => {
      setEditingId(null);
  };

  const toggleInsight = (entry: JournalEntry) => {
      updateEntry({ ...entry, isInsight: !entry.isInsight });
  };

  const runAnalysis = async () => {
      setIsAnalyzing(true);
      try {
          const result = await analyzeJournalPath(entries, config);
          setAnalysisResult(result);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  // Editor Helpers
  const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (editContentRef.current && editContentRef.current.contains(range.commonAncestorContainer)) {
              lastSelectionRange.current = range.cloneRange();
          }
      }
  };

  const saveEditSnapshot = (content: string) => {
      if (content === editHistory[editHistoryIndex]) return;
      const newHistory = editHistory.slice(0, editHistoryIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 20) newHistory.shift();
      setEditHistory(newHistory);
      setEditHistoryIndex(newHistory.length - 1);
  };

  const handleEditorInput = () => {
      if (editContentRef.current) saveEditSnapshot(editContentRef.current.innerHTML);
  };

  const execCmd = (command: string, value?: string) => {
      document.execCommand(command, false, value);
      if (editContentRef.current) {
          editContentRef.current.focus();
          saveEditSnapshot(editContentRef.current.innerHTML);
      }
  };

  const handleEditorClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
          setActiveImage(target as HTMLImageElement);
      } else {
          setActiveImage(null);
      }
      saveSelection();
  };

  const deleteActiveImage = (e?: React.MouseEvent) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (activeImage) {
          activeImage.remove();
          setActiveImage(null);
          if (editContentRef.current) saveEditSnapshot(editContentRef.current.innerHTML);
      }
  };

  const handleClearStyle = (e: React.MouseEvent) => {
      e.preventDefault();
      execCmd('removeFormat');
      execCmd('formatBlock', 'div');
  };

  const execUndo = () => {
      if (editHistoryIndex > 0) {
          const prev = editHistoryIndex - 1;
          setEditHistoryIndex(prev);
          if (editContentRef.current) editContentRef.current.innerHTML = editHistory[prev];
      }
  };

  const execRedo = () => {
      if (editHistoryIndex < editHistory.length - 1) {
          const next = editHistoryIndex + 1;
          setEditHistoryIndex(next);
          if (editContentRef.current) editContentRef.current.innerHTML = editHistory[next];
      }
  };

  const insertImageAtCursor = (base64: string) => {
      if (editContentRef.current) editContentRef.current.focus();
      let range = lastSelectionRange.current;
      if (!range || (editContentRef.current && !editContentRef.current.contains(range.commonAncestorContainer))) {
          range = document.createRange();
          range.selectNodeContents(editContentRef.current!);
          range.collapse(false);
      }
      const img = document.createElement('img');
      img.src = base64;
      img.style.maxWidth = '100%';
      img.style.borderRadius = '8px';
      img.style.display = 'block';
      img.style.margin = '8px 0';
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.setEndAfter(img);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      if (editContentRef.current) saveEditSnapshot(editContentRef.current.innerHTML);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const base64 = await processImage(file);
              insertImageAtCursor(base64);
          } catch (err) { console.error(err); }
          e.target.value = '';
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden relative">
        <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 shrink-0 z-10">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроника пути</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={runAnalysis} 
                        disabled={isAnalyzing}
                        className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {isAnalyzing ? 'Анализ...' : 'Анализ Пути'}
                    </button>
                    <button 
                        onClick={() => addEntry({ id: Date.now().toString(), date: Date.now(), content: '', title: '', color: 'white', isInsight: false })}
                        className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold hover:scale-105 transition-transform flex items-center gap-2"
                    >
                        <Plus size={16} /> Запись
                    </button>
                </div>
            </header>

            <div className="relative group max-w-md">
                <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-indigo-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                <input 
                    type="text" 
                    placeholder="Поиск по записям..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-shadow shadow-sm placeholder:text-slate-400" 
                />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={16} /></button>}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
                {displayedEntries.length === 0 ? (
                <div className="py-10">
                    <EmptyState 
                        icon={Book} 
                        title="Страницы пусты" 
                        description={searchQuery ? 'Ничего не найдено по вашему запросу' : 'Записывай свои мысли, связывай их с задачами, чтобы отслеживать свой путь'}
                        color="cyan"
                    />
                </div>
                ) : (
                <div className="w-full max-w-3xl mx-auto relative space-y-6">
                    {displayedEntries.map(entry => {
                        const mentor = config.mentors.find(m => m.id === entry.mentorId);
                        const isEditing = editingId === entry.id;
                        const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
                        const linkedNote = notes.find(n => n.id === entry.linkedNoteId);
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

                                            <div className={`font-serif text-[#2F3437] dark:text-slate-200 leading-[1.7] text-sm md:text-base flex-1 ${entry.title ? '' : 'mt-1'}`}>
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

                                            {/* Context Links */}
                                            {!isEditing && (
                                                <>
                                                    {linkedTask && (
                                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                                            <span>[ Задача: </span>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); onNavigateToTask?.(linkedTask.id); }}
                                                                className="hover:text-indigo-500 transition-colors hover:underline decoration-indigo-500 underline-offset-2"
                                                            >
                                                                {getLinkedContentPreview(linkedTask.content)}
                                                            </button>
                                                            <span> ]</span>
                                                        </div>
                                                    )}
                                                    {linkedNote && (
                                                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                                            <Tooltip content="Открепить заметку">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); updateEntry({ ...entry, linkedNoteId: undefined }); }}
                                                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Unlink size={12} />
                                                                </button>
                                                            </Tooltip>
                                                            <span>[ Заметка: </span>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onNavigateToNote?.(linkedNote.id); }}
                                                                className="hover:text-indigo-500 transition-colors hover:underline decoration-indigo-500 underline-offset-2"
                                                            >
                                                                {getLinkedContentPreview(linkedNote.title || linkedNote.content)}
                                                            </button>
                                                            <span> ]</span>
                                                        </div>
                                                    )}
                                                </>
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

      {/* ENTRY DETAILS MODAL */}
      <AnimatePresence>
        {selectedEntryId && selectedEntry && (
            <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => handleCloseModal()}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-3xl bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-2xl border border-white/20 dark:border-slate-700/50 shadow-2xl rounded-[32px] overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {(editingId === selectedEntry.id ? editCover : selectedEntry.coverUrl) && (
                        <div className="h-40 shrink-0 relative w-full overflow-hidden group">
                            <img src={editingId === selectedEntry.id ? editCover! : selectedEntry.coverUrl!} alt="Cover" className="w-full h-full object-cover" />
                            {editingId === selectedEntry.id && (
                                <button onClick={() => setEditCover(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar-ghost">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex-1 min-w-0 pr-4">
                                    {editingId === selectedEntry.id ? (
                                        <input 
                                            type="text" 
                                            placeholder="Название" 
                                            value={editTitle} 
                                            onChange={(e) => setEditTitle(e.target.value)} 
                                            className="text-2xl font-sans font-bold text-slate-900 dark:text-white leading-tight bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 w-full p-0 m-0" 
                                            autoFocus
                                        />
                                    ) : (
                                        <>
                                            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">
                                                {new Date(selectedEntry.date).toLocaleDateString()}
                                            </div>
                                            {selectedEntry.title && <h2 className="text-2xl font-sans font-bold text-slate-900 dark:text-white leading-tight">{selectedEntry.title}</h2>}
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {editingId !== selectedEntry.id && (
                                        <>
                                            <Tooltip content="Редактировать">
                                                <button onClick={() => startEditing(selectedEntry)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                    <Edit3 size={18} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Удалить">
                                                <button onClick={() => { if(confirm("Удалить запись?")) { deleteEntry(selectedEntry.id); handleCloseModal(); } }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </Tooltip>
                                        </>
                                    )}
                                    <button onClick={() => handleCloseModal()} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {editingId === selectedEntry.id ? (
                                <div className="flex flex-col gap-4">
                                    {/* Edit Toolbar */}
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mask-fade-right">
                                            <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execUndo(); }} disabled={editHistoryIndex <= 0} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                            <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execRedo(); }} disabled={editHistoryIndex >= editHistory.length - 1} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                            <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500"><Bold size={16} /></button></Tooltip>
                                            <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500"><Italic size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                            <Tooltip content="Очистить"><button onMouseDown={handleClearStyle} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 dark:text-slate-500"><Eraser size={16} /></button></Tooltip>
                                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                            <Tooltip content="Вставить картинку"><label className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer text-slate-400 dark:text-slate-500 flex items-center justify-center"><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /><ImageIcon size={16} /></label></Tooltip>
                                            {activeImage && editContentRef.current && editContentRef.current.contains(activeImage) && <Tooltip content="Удалить картинку"><button onMouseDown={deleteActiveImage} className="image-delete-btn p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"><Trash2 size={16} /></button></Tooltip>}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                            <div className="relative">
                                                <Tooltip content="Обложка">
                                                    <button 
                                                        ref={editPickerTriggerRef}
                                                        onMouseDown={(e) => { e.preventDefault(); setShowEditCoverPicker(!showEditCoverPicker); }} 
                                                        className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ${editCover ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
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
                                                        className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors ${editColor !== 'white' ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
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
                                        suppressContentEditableWarning={true}
                                        onInput={handleEditorInput} 
                                        onClick={handleEditorClick}
                                        onBlur={saveSelection}
                                        onMouseUp={saveSelection}
                                        onKeyUp={saveSelection}
                                        className="w-full min-h-[16rem] bg-transparent rounded-none p-0 text-base text-slate-800 dark:text-slate-200 border-none outline-none font-serif leading-relaxed [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1"
                                    />
                                    
                                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                                        <button onClick={cancelEditing} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium text-sm">Отмена</button>
                                        <button onClick={() => saveEdit(selectedEntry)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">Сохранить</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="font-serif text-slate-800 dark:text-slate-200 text-lg leading-relaxed mb-8">
                                        <ReactMarkdown 
                                            components={markdownComponents} 
                                            urlTransform={allowDataUrls} 
                                            remarkPlugins={[remarkGfm]} 
                                            rehypePlugins={[rehypeRaw]}
                                        >
                                            {selectedEntry.content.replace(/\n/g, '  \n')}
                                        </ReactMarkdown>
                                    </div>

                                    {/* AI Analysis Block */}
                                    {selectedEntry.aiFeedback && (
                                        <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-6">
                                            <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <Sparkles size={12} /> Анализ Наставника
                                            </div>
                                            <div className="text-sm text-slate-700 dark:text-slate-300 font-serif leading-relaxed">
                                                <ReactMarkdown components={markdownComponents}>{selectedEntry.aiFeedback}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-6 mt-auto">
                                        {selectedEntry.spheres && selectedEntry.spheres.length > 0 && (
                                            <div>
                                                <JournalEntrySphereSelector entry={selectedEntry} updateEntry={updateEntry} align="left" direction="up" />
                                            </div>
                                        )}
                                        {selectedLinkedTask && (
                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <Link size={12} className="text-slate-400" />
                                                <span className="font-mono text-xs">Задача:</span>
                                                <button onClick={() => { handleCloseModal(); onNavigateToTask?.(selectedLinkedTask.id); }} className="hover:text-indigo-500 underline underline-offset-2 decoration-indigo-200 dark:decoration-indigo-800 transition-colors truncate max-w-xs">{getLinkedContentPreview(selectedLinkedTask.content)}</button>
                                            </div>
                                        )}
                                        {selectedLinkedNote && (
                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <StickyNote size={12} className="text-slate-400" />
                                                <span className="font-mono text-xs">Заметка:</span>
                                                <button onClick={() => { handleCloseModal(); onNavigateToNote?.(selectedLinkedNote.id); }} className="hover:text-indigo-500 underline underline-offset-2 decoration-indigo-200 dark:decoration-indigo-800 transition-colors truncate max-w-xs">{getLinkedContentPreview(selectedLinkedNote.title || selectedLinkedNote.content)}</button>
                                            </div>
                                        )}
                                        {selectedEntry.mood && (
                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <Activity size={12} className="text-slate-400" />
                                                <span className="font-mono text-xs">Настроение:</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300">{MOODS[selectedEntry.mood - 1]?.label || selectedEntry.mood}</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {analysisResult && (
          <div className="fixed inset-0 z-[120] bg-slate-200/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAnalysisResult(null)}>
              <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl border border-white/20 dark:border-slate-700 p-8 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto custom-scrollbar-ghost"
                  onClick={e => e.stopPropagation()}
              >
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                          <Sparkles size={18} /> Анализ Пути
                      </h3>
                      <button onClick={() => setAnalysisResult(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="prose prose-sm dark:prose-invert font-serif leading-relaxed text-slate-700 dark:text-slate-300">
                      <ReactMarkdown components={markdownComponents}>{analysisResult}</ReactMarkdown>
                  </div>
              </motion.div>
          </div>
      )}
    </div>
  );
};

export default Journal;
