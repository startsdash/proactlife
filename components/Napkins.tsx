
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, SketchItem, JournalEntry, Flashcard } from '../types';
import { findNotesByMood, autoTagNote } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { Send, Tag as TagIcon, RotateCcw, RotateCw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Plus, Sparkles, Kanban, Dices, Shuffle, Quote, ArrowRight, PenTool, Orbit, Flame, Waves, Clover, ArrowLeft, Image as ImageIcon, Bold, Italic, List, Code, Underline, Eraser, Type, Globe, Layout, Upload, RefreshCw, Archive, Clock, Diamond, Tablet, Book, BrainCircuit, Star, Pause, Play, Maximize2, Zap, Circle, Gem, Aperture, Layers, Filter, Target, Minus } from 'lucide-react';

interface Props {
  notes: Note[];
  flashcards?: Flashcard[];
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
  
  // Flashcard Handlers
  deleteFlashcard: (id: string) => void;
  toggleFlashcardStar: (id: string) => void;

  defaultTab?: 'inbox' | 'library' | 'flashcards';
  initialNoteId?: string | null;
  onClearInitialNote?: () => void;
  journalEntries?: JournalEntry[];
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
    { id: 'cosmos', icon: Gem, label: 'Инсайт', color: 'from-indigo-500 to-purple-600', text: 'text-indigo-100' },
    { id: 'fire', icon: Zap, label: 'Энергия', color: 'from-orange-500 to-red-600', text: 'text-orange-100' },
    { id: 'zen', icon: Circle, label: 'Дзен', color: 'from-emerald-500 to-teal-600', text: 'text-emerald-100' },
    { id: 'luck', icon: Dices, label: 'Случай', color: 'from-slate-700 to-slate-900', text: 'text-slate-200' },
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

// --- HELPER FUNCTIONS ---

const allowDataUrls = (url: string) => url;

const extractImages = (content: string): string[] => {
    const matches = content.matchAll(/!\[.*?\]\((.*?)\)/g);
    return Array.from(matches, m => m[1]);
};

const getPreviewContent = (content: string) => {
    // 1. Remove images
    let cleanText = content.replace(/!\[.*?\]\(.*?\)/g, '');
    
    // 2. Normalize horizontal spaces (keep newlines for card formatting)
    cleanText = cleanText.replace(/[ \t]+/g, ' ').trim();

    // 3. Smart Truncation (2-3 sentences)
    // Split by sentence terminators followed by space or newline
    const sentences = cleanText.match(/[^\.!\?]+[\.!\?]+(?=\s|$)/g) || [cleanText];
    
    // Determine how many sentences to show based on length
    let limit = 0;
    let sentenceCount = 0;
    
    // Try to get at least 2 sentences, up to 3, but watch char count
    for (let s of sentences) {
        if (sentenceCount >= 3) break; // Max 3 sentences
        if (limit + s.length > 300 && sentenceCount >= 1) break; // If adding next makes it huge, stop
        limit += s.length;
        sentenceCount++;
    }

    let preview = sentences.slice(0, sentenceCount).join(' ');
    
    // Fallback if sentences detection failed or text is one giant block
    if (preview.length === 0 && cleanText.length > 0) {
        preview = cleanText;
    }

    // Hard cap at 300 chars to prevent overflow, but respect word boundaries
    if (preview.length > 300) {
        preview = preview.slice(0, 300);
        const lastSpace = preview.lastIndexOf(' ');
        if (lastSpace > 0) {
            preview = preview.slice(0, lastSpace);
        }
    }

    // Add ellipsis if we cut content
    if (preview.length < cleanText.length) {
        // Remove trailing punctuation before adding ellipsis
        preview = preview.replace(/[\.!\?,\s]+$/, '') + '...';
    }
    
    return preview;
};

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

const findFirstUrl = (text: string): string | null => {
    const maskedText = text.replace(/!\[.*?\]\(.*?\)/g, '');
    const match = maskedText.match(/(https?:\/\/[^\s\)]+)/);
    return match ? match[0] : null;
};

// --- HTML <-> Markdown Converters (IMPROVED) ---

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
                // Improved block handling:
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

const getNoteColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

// --- COMPONENTS ---

const KineticFlashcardDeck = ({ 
    cards, 
    onDelete, 
    onToggleStar 
}: { 
    cards: Flashcard[], 
    onDelete: (id: string) => void,
    onToggleStar: (id: string) => void
}) => {
    const [index, setIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);

    // Filter cards based on mode
    const displayedCards = useMemo(() => {
        return showFavorites ? cards.filter(c => c.isStarred) : cards;
    }, [cards, showFavorites]);

    // Ensure index stays valid if cards are removed
    useEffect(() => {
        if (index >= displayedCards.length && displayedCards.length > 0) {
            setIndex(Math.max(0, displayedCards.length - 1));
        }
    }, [displayedCards.length, index]);

    // Handle empty filtered state
    if (displayedCards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-6">
                    <Layers size={32} className="text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-light text-slate-800 dark:text-slate-200">
                    {showFavorites ? "Нет избранных карточек" : "Колода пуста"}
                </h3>
                <p className="text-sm text-slate-500 max-w-xs mt-2">
                    {showFavorites ? "Отметьте важные карточки звездочкой." : "Кристаллизуй знания в Хабе, чтобы они появились здесь."}
                </p>
                {showFavorites && (
                    <button 
                        onClick={() => setShowFavorites(false)}
                        className="mt-6 px-4 py-2 text-xs font-mono uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors border border-indigo-200 rounded-full hover:bg-indigo-50 dark:border-indigo-900 dark:hover:bg-indigo-900/20"
                    >
                        Показать все
                    </button>
                )}
            </div>
        );
    }

    // Ensure index is valid after filter change
    const safeIndex = index % displayedCards.length;
    const currentCard = displayedCards[safeIndex];

    const nextCard = () => {
        setIsFlipped(false);
        setIndex((prev) => (prev + 1) % displayedCards.length);
    };

    const prevCard = () => {
        setIsFlipped(false);
        setIndex((prev) => (prev - 1 + displayedCards.length) % displayedCards.length);
    };

    const toggleFlip = () => setIsFlipped(!isFlipped);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Удалить эту карточку?")) {
            onDelete(currentCard.id);
            // If we delete the last card, move index back
            if (safeIndex >= displayedCards.length - 1) {
                setIndex(Math.max(0, safeIndex - 1));
            }
        }
    };

    return (
        <div className="flex items-center justify-center h-full min-h-[600px] w-full p-4 md:p-8">
            {/* The "Oracle-like" Window */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-2xl min-h-[500px] bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden flex flex-col transition-colors duration-500"
                onClick={toggleFlip}
            >
                {/* Background Atmosphere (Fog/Neon) */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[40px]">
                    <motion.div 
                        animate={{ 
                            scale: isFlipped ? 1.2 : 1,
                            opacity: isFlipped ? 0.4 : 0.2
                        }}
                        transition={{ duration: 1 }}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] transition-colors duration-700 ${isFlipped ? 'bg-amber-500' : 'bg-indigo-500'}`}
                    />
                    <div style={{ backgroundImage: NOISE_PATTERN }} className="absolute inset-0 opacity-10 mix-blend-overlay" />
                </div>

                {/* Header Controls */}
                <div className="flex justify-between items-center px-8 pt-8 pb-2 relative z-20" onClick={e => e.stopPropagation()}>
                    {/* Status Label */}
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        {isFlipped ? <Sparkles size={12} className="text-amber-500" /> : <BrainCircuit size={12} className="text-indigo-500" />}
                        {isFlipped ? 'ОТВЕТ' : 'ВОПРОС'} <span className="opacity-50">// {safeIndex + 1} ИЗ {displayedCards.length}</span>
                    </div>

                    {/* Top Right Controls: Filter & Star */}
                    <div className="flex items-center gap-3">
                        <Tooltip content="Показать только избранное">
                            <button 
                                onClick={() => { setShowFavorites(!showFavorites); setIndex(0); }}
                                className={`p-2 rounded-full transition-all ${showFavorites ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500 hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                <Filter size={16} strokeWidth={showFavorites ? 2.5 : 1.5} />
                            </button>
                        </Tooltip>
                        
                        <Tooltip content={currentCard.isStarred ? "Убрать из избранного" : "Добавить в избранное"}>
                            <button 
                                onClick={() => onToggleStar(currentCard.id)}
                                className={`p-2 rounded-full transition-all ${currentCard.isStarred ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                <Star size={16} strokeWidth={currentCard.isStarred ? 0 : 1.5} fill={currentCard.isStarred ? "currentColor" : "none"} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center relative z-10 cursor-pointer overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentCard.id + (isFlipped ? '_back' : '_front')}
                            initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="w-full h-full flex items-center justify-center"
                        >
                            {/* Scrollable container for text to keep card size fixed */}
                            <div className="w-full h-[320px] overflow-y-auto pr-2 custom-scrollbar-ghost">
                                <div className="min-h-full flex flex-col justify-center">
                                    <div className="font-serif text-xl md:text-3xl leading-relaxed text-slate-800 dark:text-slate-100 select-none whitespace-pre-wrap">
                                        {isFlipped ? currentCard.back : currentCard.front}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer / Controls */}
                <div className="pb-8 px-8 flex justify-between items-end relative z-20" onClick={e => e.stopPropagation()}>
                    {/* Centered Navigation */}
                    <div className="flex-1 flex justify-center gap-8 pl-12">
                        <button 
                            onClick={prevCard}
                            className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-900 dark:text-white border-b border-transparent hover:border-slate-900 dark:hover:border-white transition-all pb-1 flex items-center gap-2"
                        >
                            <ArrowLeft size={12} /> [ ПРЕД ]
                        </button>

                        <button 
                            onClick={toggleFlip}
                            className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-2 group"
                        >
                            <RotateCw size={14} className={`transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
                            [ ПЕРЕВЕРНУТЬ ]
                        </button>

                        <button 
                            onClick={nextCard}
                            className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-900 dark:text-white border-b border-transparent hover:border-slate-900 dark:hover:border-white transition-all pb-1 flex items-center gap-2"
                        >
                            [ СЛЕД ] <ArrowRight size={12} />
                        </button>
                    </div>

                    {/* Delete Button (Bottom Right) */}
                    <div className="shrink-0">
                        <Tooltip content="Удалить карточку">
                            <button 
                                onClick={handleDelete}
                                className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                            >
                                <Trash2 size={16} strokeWidth={1.5} />
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Lightbox
const Lightbox = ({ src, onClose }: { src: string, onClose: () => void }) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return createPortal(
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.img 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={src} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()} 
            />
            <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2">
                <X size={32} />
            </button>
        </motion.div>,
        document.body
    );
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
            className="block mt-4 bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800 transition-all rounded-xl overflow-hidden group/link relative no-underline break-inside-avoid border border-black/5 dark:border-white/5 shadow-sm"
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

// Tag Selector
const TagSelector: React.FC<{ selectedTags: string[], onChange: (tags: string[]) => void, existingTags: string[], placeholder?: string, variant?: 'default' | 'ghost', direction?: 'up' | 'down' }> = ({ selectedTags, onChange, existingTags, placeholder = "Добавить теги...", variant = 'default', direction = 'down' }) => {
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const handleTagChange = (newTags: string[]) => {
        const uniqueTags = Array.from(new Set(newTags));
        onChange(uniqueTags);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isWrapper = wrapperRef.current && wrapperRef.current.contains(target);
            const isDropdown = dropdownRef.current && dropdownRef.current.contains(target);
            
            if (!isWrapper && !isDropdown) {
                setIsOpen(false);
            }
        };
        
        const handleScroll = (event: Event) => {
            // Fix: Check if scrolling happens inside the dropdown
            if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
                return;
            }
            if (isOpen) setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('scroll', handleScroll, true); 
            window.addEventListener('resize', handleScroll);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const style: React.CSSProperties = {
                position: 'fixed',
                left: rect.left,
                width: Math.max(rect.width, 200),
                zIndex: 99999,
            };
            
            if (direction === 'down') {
                style.top = rect.bottom + 4;
            } else {
                style.bottom = window.innerHeight - rect.top + 4;
            }
            setDropdownStyle(style);
        }
    }, [isOpen, direction]);

    const filteredSuggestions = existingTags.filter(tag => !selectedTags.some(st => st.toLowerCase() === tag.toLowerCase()) && tag.toLowerCase().includes(input.toLowerCase()));

    const addTag = (tag: string) => {
        const cleanTag = tag.trim().replace(/^#/, '');
        if (!cleanTag) return;
        if (selectedTags.some(t => t.toLowerCase() === cleanTag.toLowerCase())) { setInput(''); setIsOpen(false); return; }
        
        handleTagChange([...selectedTags, existingTags.find(t => t.toLowerCase() === cleanTag.toLowerCase()) || cleanTag]);
        setInput(''); setIsOpen(false);
    };

    const hasContent = input.length > 0 || filteredSuggestions.length > 0;

    return (
        <div className="relative portal-popup" ref={wrapperRef}>
            <div className={`flex flex-wrap items-center gap-3 min-h-[36px] ${variant === 'ghost' ? 'px-0 py-2' : 'p-2'}`}>
                {selectedTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-[9px] font-sans uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400 group cursor-default">
                        #{tag.replace(/^#/, '')} 
                        <button onClick={() => handleTagChange(selectedTags.filter(t => t !== tag))} className="text-slate-300 hover:text-red-500 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={10} strokeWidth={2} />
                        </button>
                    </span>
                ))}
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => { setInput(e.target.value); setIsOpen(true); }} 
                    onFocus={() => setIsOpen(true)} 
                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addTag(input); } }} 
                    placeholder={selectedTags.length === 0 ? placeholder : ''} 
                    className={`flex-1 min-w-[80px] bg-transparent text-xs font-sans outline-none ${variant === 'ghost' ? 'text-slate-600 dark:text-slate-300 placeholder:text-slate-300' : 'text-slate-600 dark:text-slate-300 placeholder:text-slate-400'}`} 
                />
            </div>
            {isOpen && hasContent && createPortal(
                <div 
                    ref={dropdownRef}
                    className="fixed bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-75 portal-popup custom-scrollbar-ghost"
                    style={dropdownStyle}
                    onMouseDown={(e) => e.stopPropagation()} 
                >
                    {input.length > 0 && !filteredSuggestions.some(t => t.toLowerCase() === input.trim().toLowerCase()) && (
                        <button onClick={() => addTag(input)} className="w-full text-left px-3 py-2 text-xs font-sans text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 font-bold"><Plus size={12} /> Создать «{input}»</button>
                    )}
                    {filteredSuggestions.map(tag => (
                        <button key={tag} onClick={() => addTag(tag)} className="w-full text-left px-3 py-2 text-xs font-sans text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 font-medium"><TagIcon size={12} className="text-slate-400" /> {tag}</button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
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

interface NoteCardProps {
    note: Note;
    isArchived: boolean;
    isLinkedToJournal: boolean;
    handlers: {
        handleDragStart: (e: React.DragEvent, id: string) => void;
        handleDragOver: (e: React.DragEvent) => void;
        handleDrop: (e: React.DragEvent, id: string) => void;
        handleOpenNote: (note: Note) => void;
        togglePin: (e: React.MouseEvent, note: Note) => void;
        archiveNote: (id: string) => void;
        moveNoteToSandbox: (id: string) => void;
        moveNoteToInbox: (id: string) => void;
        onAddTask: (task: Task) => void;
        onAddJournalEntry: (entry: JournalEntry) => void;
        addSketchItem?: (item: SketchItem) => void;
        onImageClick?: (src: string) => void;
    };
}

const NoteCard: React.FC<NoteCardProps> = ({ note, isArchived, isLinkedToJournal, handlers }) => {
    const [isExiting, setIsExiting] = useState(false);
    const linkUrl = findFirstUrl(note.content);
    
    // Extract text for preview
    const previewText = useMemo(() => getPreviewContent(note.content), [note.content]);
    
    // Extract images for thumbnails and calculate count
    const contentImages = useMemo(() => extractImages(note.content), [note.content]);
    const imagesToShow = contentImages.filter(img => img !== note.coverUrl);
    const thumbnailImages = imagesToShow.slice(0, 3);
    const remainingImagesCount = imagesToShow.length - thumbnailImages.length;

    const renderComponents = useMemo(() => ({
        ...markdownComponents,
        img: ({node, src, alt, ...props}: any) => (
            <img 
                src={src} 
                alt={alt} 
                className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm cursor-zoom-in hover:opacity-95 transition-opacity" 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    if(src && handlers.onImageClick) handlers.onImageClick(src); 
                }} 
                loading="lazy" 
                {...props} 
            />
        )
    }), [handlers.onImageClick]);

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
                isInsight: false,
                linkedNoteId: note.id
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

            <div className="absolute top-5 right-5 z-30">
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

            <div className="p-8 pb-16 w-full flex-1 relative z-10">
                <div className="block w-full mb-2">
                    {note.title && <h3 className={`font-sans text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4 leading-tight break-words pr-6 ${isArchived ? 'tracking-wide' : 'tracking-tight'}`}>{note.title}</h3>}
                    <div className={`text-slate-700 dark:text-slate-300 font-serif text-base leading-relaxed overflow-hidden break-words relative max-h-[400px] mask-linear-fade ${!note.title ? 'pr-6' : ''}`}>
                        <ReactMarkdown 
                            components={renderComponents} 
                            urlTransform={allowDataUrls} 
                            remarkPlugins={[remarkGfm]} 
                            rehypePlugins={[rehypeRaw]}
                        >
                            {previewText.replace(/\n/g, '  \n')}
                        </ReactMarkdown>
                    </div>
                    
                    {/* Thumbnail Grid for Content Images */}
                    {thumbnailImages.length > 0 && (
                        <div className={`grid gap-1 mt-4 rounded-xl overflow-hidden border border-black/5 dark:border-white/5 ${
                            thumbnailImages.length === 1 ? 'grid-cols-1' : 
                            thumbnailImages.length === 2 ? 'grid-cols-2' : 
                            'grid-cols-3'
                        }`}>
                            {thumbnailImages.map((img, i) => (
                                <div key={i} className="relative bg-slate-100 dark:bg-slate-800 overflow-hidden group/image">
                                    <img 
                                        src={img} 
                                        alt="" 
                                        className={`w-full object-cover object-top transition-transform duration-500 hover:scale-105 ${
                                            thumbnailImages.length === 1 ? 'h-auto max-h-[500px]' : 
                                            thumbnailImages.length === 2 ? 'aspect-[3/4]' : 
                                            'aspect-square'
                                        }`} 
                                        loading="lazy" 
                                    />
                                    {/* Count Overlay */}
                                    {i === thumbnailImages.length - 1 && remainingImagesCount > 0 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                                            <span className="text-white font-sans font-bold text-lg tracking-wider">+{remainingImagesCount}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {linkUrl && <LinkPreview url={linkUrl} />}
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
                        // Inbox: Only Archive button
                        <Tooltip content="Переместить в библиотеку">
                            <button onClick={handleArchive} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Library size={16} strokeWidth={1.5} /></button>
                        </Tooltip>
                    ) : (
                        // Library: Action buttons moved here
                        <>
                            <Tooltip content="В хаб"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В хаб?')) handlers.moveNoteToSandbox(note.id); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Box size={16} strokeWidth={1.5} /></button></Tooltip>
                            
                            <Tooltip content="В спринты"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В спринты?')) { handlers.onAddTask({ id: Date.now().toString(), title: note.title, content: note.content, column: 'todo', createdAt: Date.now() }); } }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Kanban size={16} strokeWidth={1.5} /></button></Tooltip>
                            
                            <Tooltip content={isLinkedToJournal ? "В дневнике" : "В дневник"}>
                                <button 
                                    onClick={isLinkedToJournal ? undefined : handleToJournal} 
                                    disabled={isLinkedToJournal}
                                    className={`p-2 rounded-full transition-all ${
                                        isLinkedToJournal 
                                        ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 opacity-100 cursor-default' 
                                        : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <Book size={16} strokeWidth={1.5} />
                                </button>
                            </Tooltip>
                            
                            {handlers.addSketchItem && <Tooltip content="В скетчпад"><button onClick={handleToSketchpad} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Tablet size={16} strokeWidth={1.5} /></button></Tooltip>}
                        </>
                    )}
                </div>
                
                {/* Right Side: ID or Restore Button */}
                {!isArchived ? (
                    <div className="p-2 font-mono text-[8px] text-slate-900 dark:text-white select-none opacity-30 tracking-widest">
                        ID // {note.id.slice(-5).toLowerCase()}
                    </div>
                ) : (
                    <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                        <Tooltip content="Вернуть во входящие">
                            <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Вернуть во входящие?')) { handlers.moveNoteToInbox(note.id); } }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><RotateCcw size={16} strokeWidth={1.5} /></button>
                        </Tooltip>
                    </div>
                )}
            </div>
        </div>
    );
};

const Napkins: React.FC<Props> = ({ notes, flashcards, config, addNote, moveNoteToSandbox, moveNoteToInbox, archiveNote, deleteNote, reorderNote, updateNote, onAddTask, onAddJournalEntry, addSketchItem, deleteFlashcard, toggleFlashcardStar, defaultTab, initialNoteId, onClearInitialNote, journalEntries }) => {
  const [title, setTitle] = useState('');
  const [creationTags, setCreationTags] = useState<string[]>([]);
  const [creationColor, setCreationColor] = useState('white');
  const [creationCover, setCreationCover] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'library' | 'flashcards'>((defaultTab as any) || 'inbox');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const creationCoverBtnRef = useRef<HTMLButtonElement>(null);
  const editCoverBtnRef = useRef<HTMLButtonElement>(null);

  // Memoize linked note IDs from journal entries for efficient checking
  const linkedNoteIds = useMemo(() => {
      const ids = new Set<string>();
      if (journalEntries) {
          journalEntries.forEach(entry => {
              if (entry.linkedNoteId && !entry.isArchived) {
                  ids.add(entry.linkedNoteId);
              }
          });
      }
      return ids;
  }, [journalEntries]);

  useEffect(() => {
      if(defaultTab) setActiveTab(defaultTab as any);
  }, [defaultTab]);

  useEffect(() => {
    if (initialNoteId) {
      const note = notes.find(n => n.id === initialNoteId);
      if (note) {
        setSelectedNote(note);
      }
      onClearInitialNote?.();
    }
  }, [initialNoteId, notes, onClearInitialNote]);

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

  const execCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (contentEditableRef.current) {
          contentEditableRef.current.focus();
          saveHistorySnapshot(contentEditableRef.current.innerHTML);
      }
  };

  const execEditCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (editContentRef.current) {
          editContentRef.current.focus();
          saveEditHistorySnapshot(editContentRef.current.innerHTML);
      }
  };

  const handleClearStyle = (e: React.MouseEvent) => {
      e.preventDefault();
      execCmd('removeFormat');
      execCmd('formatBlock', 'div'); 
  };

  const handleEditClearStyle = (e: React.MouseEvent) => {
      e.preventDefault();
      execEditCmd('removeFormat');
      execEditCmd('formatBlock', 'div'); 
  };

  const handleEditorClick = (e: React.MouseEvent, isEditModal: boolean = false) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
          if (activeImage && activeImage !== target) activeImage.style.outline = 'none';
          const img = target as HTMLImageElement;
          img.style.outline = '3px solid #6366f1'; 
          img.style.borderRadius = '8px';
          setActiveImage(img);
      } else {
          if (activeImage) { activeImage.style.outline = 'none'; setActiveImage(null); }
      }
      
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
          lastSelectionRange.current = sel.getRangeAt(0).cloneRange();
      }
  };

  const deleteActiveImage = (e?: React.MouseEvent) => {
      if(e) { e.preventDefault(); e.stopPropagation(); }
      if (activeImage) {
          activeImage.remove();
          setActiveImage(null);
          // Save history for relevant editor
          if (contentEditableRef.current && contentEditableRef.current.contains(activeImage)) {
              saveHistorySnapshot(contentEditableRef.current.innerHTML);
          } else if (editContentRef.current && editContentRef.current.contains(activeImage)) {
              saveEditHistorySnapshot(editContentRef.current.innerHTML);
          }
      }
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
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && contentEditableRef.current) {
          try {
              const compressedBase64 = await processImage(file);
              insertImageAtCursor(compressedBase64, contentEditableRef.current);
              saveHistorySnapshot(contentEditableRef.current.innerHTML);
          } catch (err) { console.error("Image upload failed", err); }
          e.target.value = '';
      }
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Image Paste Listener
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
        const target = e.target as HTMLElement;
        let activeEditor = null;
        
        if (contentEditableRef.current && (contentEditableRef.current === target || contentEditableRef.current.contains(target))) {
            activeEditor = contentEditableRef.current;
        } else if (editContentRef.current && (editContentRef.current === target || editContentRef.current.contains(target))) {
            activeEditor = editContentRef.current;
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
                        if (activeEditor === contentEditableRef.current) saveHistorySnapshot(activeEditor.innerHTML);
                        else saveEditHistorySnapshot(activeEditor.innerHTML);
                    } catch (err) { console.error("Image paste failed", err); }
                }
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isExpanded, isEditing]);

  const handleAutoTag = async () => {
      if (!contentEditableRef.current) return;
      const rawHtml = contentEditableRef.current.innerHTML;
      const markdown = htmlToMarkdown(rawHtml);
      if (!markdown.trim()) return;
      setIsProcessing(true);
      const tags = await autoTagNote(markdown, config);
      setCreationTags([...creationTags, ...tags]);
      setIsProcessing(false);
  };

  const handleMoodAnalysis = async () => {
      if (!moodQuery.trim()) return;
      setIsMoodAnalyzing(true);
      try {
          const ids = await findNotesByMood(notes, moodQuery, config);
          setAiFilteredIds(ids);
      } catch (e) { console.error(e); }
      setIsMoodAnalyzing(false);
  };

  const handleClearMood = () => {
      setMoodQuery('');
      setAiFilteredIds(null);
      setShowMoodInput(false);
  };

  const handleSubmit = async () => {
    const rawHtml = contentEditableRef.current?.innerHTML || '';
    const markdownContent = htmlToMarkdown(rawHtml);
    
    if (!markdownContent.trim() && !title.trim()) return;

    const formattedContent = applyTypography(markdownContent);
    const newNote: Note = {
      id: Date.now().toString(),
      title: title.trim() ? applyTypography(title.trim()) : undefined,
      content: formattedContent,
      tags: creationTags,
      createdAt: Date.now(),
      status: 'inbox',
      color: creationColor,
      coverUrl: creationCover || undefined
    };

    addNote(newNote);
    setTitle('');
    setCreationTags([]);
    setCreationColor('white');
    setCreationCover(null);
    if(contentEditableRef.current) contentEditableRef.current.innerHTML = '';
    setHistory(['']);
    setHistoryIndex(0);
    setIsExpanded(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('noteId', id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

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

  // Oracle Logic
  const handleOracleClick = () => {
      if (oracleState === 'select') {
          // 1. Pick a random unarchived note
          const validNotes = notes.filter(n => n.status !== 'trash');
          if (validNotes.length === 0) { alert("Нет заметок для Оракула"); return; }
          const randomNote = validNotes[Math.floor(Math.random() * validNotes.length)];
          
          setOracleNote(randomNote);
          setOracleState('thinking');
          
          // Simulate "thinking"
          setTimeout(() => setOracleState('result'), 2000);
      } else if (oracleState === 'result') {
          // Reset
          setShowOracle(false);
          setOracleState('select');
          setOracleNote(null);
      }
  };

  // --- EDIT LOGIC ---
  useEffect(() => {
      if (selectedNote && isEditing && editContentRef.current) {
          const html = markdownToHtml(selectedNote.content);
          editContentRef.current.innerHTML = html;
          setEditHistory([html]);
          setEditHistoryIndex(0);
          setEditTitle(selectedNote.title || '');
          setEditTagsList(selectedNote.tags || []);
          setEditCover(selectedNote.coverUrl || null);
      }
  }, [selectedNote, isEditing]);

  const handleSaveEdit = () => {
      if (!selectedNote) return;
      const rawHtml = editContentRef.current?.innerHTML || '';
      const markdownContent = htmlToMarkdown(rawHtml);
      
      updateNote({
          ...selectedNote,
          title: editTitle.trim() ? applyTypography(editTitle.trim()) : undefined,
          content: applyTypography(markdownContent),
          tags: editTagsList,
          coverUrl: editCover || undefined
      });
      setIsEditing(false);
  };

  const filteredNotes = notes
    .filter(note => {
        if (activeTab === 'inbox') return note.status === 'inbox';
        if (activeTab === 'library') return note.status === 'archived' || note.status === 'sandbox'; // Show Sandbox in Library too
        return false;
    })
    .filter(note => {
        if (aiFilteredIds) return aiFilteredIds.includes(note.id);
        const query = searchQuery.toLowerCase();
        if (tagQuery && !note.tags?.some(t => t.toLowerCase().includes(tagQuery.toLowerCase()))) return false;
        if (activeColorFilter && note.color !== activeColorFilter) return false;
        if (!query) return true;
        return (note.title?.toLowerCase().includes(query) || note.content.toLowerCase().includes(query));
    })
    .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
    });

  return (
    <div ref={scrollContainerRef} className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden overflow-y-auto">
        
        {/* HEADER SECTION (Tabs) */}
        <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 shrink-0 z-50">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">
                        {activeTab === 'inbox' ? 'Входящие' : activeTab === 'library' ? 'Библиотека' : 'Картотека'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">
                        {activeTab === 'inbox' ? 'Поток мыслей' : activeTab === 'library' ? 'Хранилище знаний' : 'Нейронные связи'}
                    </p>
                </div>
             </header>
        </div>

        <div className="flex-1 flex flex-col relative">
             {/* Sticky Toolbar */}
             <motion.div 
                className="sticky top-0 z-40 w-full mb-[-20px]"
                animate={{ y: isHeaderHidden ? '-100%' : '0%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
             >
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
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none items-center">
                        <div className="bg-white dark:bg-[#1e293b] p-1 rounded-2xl flex shadow-sm border border-slate-200 dark:border-slate-800 shrink-0">
                            <button onClick={() => setActiveTab('inbox')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'inbox' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Входящие</button>
                            <button onClick={() => setActiveTab('library')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'library' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Библиотека</button>
                            <button onClick={() => setActiveTab('flashcards')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'flashcards' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Карточки</button>
                        </div>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 shrink-0"></div>

                        {/* Search & Filter */}
                        <div className="relative flex-1 group min-w-[200px]">
                            <Search size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-indigo-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Поиск..."
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-shadow shadow-sm placeholder:text-slate-400"
                            />
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={16} /></button>}
                        </div>

                        <Tooltip content="Фильтры">
                            <button onClick={() => setShowFilters(!showFilters)} className={`p-3 rounded-2xl border-none transition-all shadow-sm ${showFilters || tagQuery || activeColorFilter ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-[#1e293b] text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400'}`}>
                                <Filter size={18} />
                            </button>
                        </Tooltip>

                        {/* AI Mood Matcher */}
                        {hasMoodMatcher && (
                            <Tooltip content="AI Подбор">
                                <button onClick={() => setShowMoodInput(!showMoodInput)} className={`p-3 rounded-2xl border-none transition-all shadow-sm ${showMoodInput || aiFilteredIds ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' : 'bg-white dark:bg-[#1e293b] text-slate-400 hover:text-violet-500 dark:hover:text-violet-400'}`}>
                                    <Sparkles size={18} />
                                </button>
                            </Tooltip>
                        )}

                        <Tooltip content="Оракул">
                            <button onClick={() => setShowOracle(true)} className="p-3 rounded-2xl border-none transition-all shadow-sm bg-white dark:bg-[#1e293b] text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                                <Dices size={18} />
                            </button>
                        </Tooltip>
                    </div>

                    {/* EXPANDABLE FILTERS */}
                    <AnimatePresence>
                        {(showFilters || showMoodInput) && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-4 pb-2 space-y-4">
                                    {showFilters && (
                                        <div className="flex flex-col gap-3 p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700">
                                            {/* Tag Filter */}
                                            <div className="flex items-center gap-2">
                                                <TagIcon size={14} className="text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Фильтр по тегу..." 
                                                    value={tagQuery}
                                                    onChange={(e) => setTagQuery(e.target.value)}
                                                    className="bg-transparent border-b border-slate-200 dark:border-slate-600 text-xs py-1 outline-none text-slate-700 dark:text-slate-300 w-40"
                                                />
                                            </div>
                                            {/* Color Filter */}
                                            <div className="flex gap-2 overflow-x-auto scrollbar-none">
                                                <button onClick={() => setActiveColorFilter(null)} className={`w-5 h-5 rounded-full border flex items-center justify-center ${!activeColorFilter ? 'border-slate-400' : 'border-slate-200 dark:border-slate-700'}`}><X size={10} className="text-slate-400"/></button>
                                                {colors.filter(c => c.id !== 'white').map(c => (
                                                    <button 
                                                        key={c.id} 
                                                        onClick={() => setActiveColorFilter(activeColorFilter === c.id ? null : c.id)}
                                                        className={`w-5 h-5 rounded-full transition-transform ${c.class.split(' ')[0]} ${activeColorFilter === c.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''} border border-black/5`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {showMoodInput && (
                                        <div className="flex gap-2 items-center p-2 bg-violet-50 dark:bg-violet-900/10 rounded-2xl border border-violet-100 dark:border-violet-800">
                                            <input 
                                                type="text" 
                                                placeholder="Опиши свое состояние..." 
                                                value={moodQuery}
                                                onChange={(e) => setMoodQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleMoodAnalysis()}
                                                className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-violet-900 dark:text-violet-100 placeholder:text-violet-400"
                                            />
                                            {aiFilteredIds && (
                                                <button onClick={handleClearMood} className="p-1 text-violet-400 hover:text-violet-600"><X size={14}/></button>
                                            )}
                                            <button 
                                                onClick={handleMoodAnalysis} 
                                                disabled={!moodQuery.trim() || isMoodAnalyzing}
                                                className="p-2 bg-violet-500 text-white rounded-xl hover:bg-violet-600 disabled:opacity-50 transition-colors shadow-sm"
                                            >
                                                {isMoodAnalyzing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
             </motion.div>

             <div className="w-full px-4 md:px-8 pt-6 pb-20 relative z-10 flex-1 min-h-0">
                {activeTab === 'flashcards' ? (
                    <KineticFlashcardDeck 
                        cards={flashcards || []} 
                        onDelete={deleteFlashcard}
                        onToggleStar={toggleFlashcardStar}
                    />
                ) : (
                    <>
                        {/* INPUT FIELD (COLLAPSED STATE) for Inbox Only */}
                        {activeTab === 'inbox' && (
                            <div className="max-w-3xl mx-auto w-full mb-8 relative z-30">
                                {!isExpanded ? (
                                    <div 
                                        onClick={() => { setIsExpanded(true); setTimeout(() => contentEditableRef.current?.focus(), 100); }}
                                        className="bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/5 shadow-sm p-4 cursor-text flex items-center justify-between group hover:shadow-md transition-all h-[52px]"
                                    >
                                        <span className="text-slate-400 dark:text-slate-500 font-serif italic text-base pl-2">Новая мысль...</span>
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 group-hover:text-indigo-500 transition-colors">
                                            <PenTool size={18} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`${getNoteColorClass(creationColor)} backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/5 shadow-lg p-5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200 relative`}>
                                        {creationCover && (
                                            <div className="relative w-full h-32 group rounded-t-xl overflow-hidden -mt-5 -mx-5 mb-3 w-[calc(100%_+_2.5rem)]">
                                                <img src={creationCover} alt="Cover" className="w-full h-full object-cover" />
                                                <button onClick={() => setCreationCover(null)} className="absolute top-3 right-3 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={14} /></button>
                                            </div>
                                        )}
                                        <input 
                                            type="text" 
                                            placeholder="Название" 
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full bg-transparent text-xl font-sans font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 mb-2"
                                            autoFocus
                                        />
                                        
                                        <div className="relative">
                                            <div 
                                                ref={contentEditableRef}
                                                contentEditable 
                                                onInput={handleEditorInput} 
                                                onClick={handleEditorClick}
                                                onBlur={() => { /* save selection */ }}
                                                className="w-full min-h-[120px] max-h-[400px] overflow-y-auto outline-none text-base text-slate-800 dark:text-slate-200 bg-transparent p-1 font-serif leading-relaxed custom-scrollbar-ghost [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:dark:text-slate-500"
                                                data-placeholder="Текст заметки..."
                                            />
                                            <div className="absolute bottom-0 left-0 w-full h-px bg-slate-200/50 dark:bg-slate-700/50" />
                                        </div>

                                        {/* Tag Selector */}
                                        <div className="mt-2">
                                            <TagSelector selectedTags={creationTags} onChange={setCreationTags} existingTags={allExistingTags} variant="ghost" direction="up" />
                                        </div>

                                        {/* TOOLBAR */}
                                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 mb-1">
                                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mask-fade-right">
                                                <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execUndo(); }} disabled={historyIndex <= 0} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                                <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execRedo(); }} disabled={historyIndex >= history.length - 1} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Bold size={16} /></button></Tooltip>
                                                <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Italic size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Очистить"><button onMouseDown={handleClearStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Eraser size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Вставить картинку"><label className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer text-slate-400 dark:text-slate-500 flex items-center justify-center"><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /><ImageIcon size={16} /></label></Tooltip>
                                                {activeImage && contentEditableRef.current && contentEditableRef.current.contains(activeImage) && <Tooltip content="Удалить картинку"><button onMouseDown={deleteActiveImage} className="image-delete-btn p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"><Trash2 size={16} /></button></Tooltip>}
                                            </div>
                                            {/* Right Container for Styling */}
                                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                                {hasTagger && (
                                                    <Tooltip content="Авто-теги (AI)">
                                                        <button 
                                                            onClick={handleAutoTag} 
                                                            disabled={isProcessing}
                                                            className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${isProcessing ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                                        >
                                                            {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : <TagIcon size={16} />}
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                <div className="relative">
                                                    <Tooltip content="Обложка">
                                                        <button 
                                                            ref={creationCoverBtnRef}
                                                            onMouseDown={(e) => { e.preventDefault(); setShowCreationCoverPicker(!showCreationCoverPicker); }} 
                                                            className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${creationCover ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                                        >
                                                            <Layout size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    {showCreationCoverPicker && <CoverPicker onSelect={setCreationCover} onClose={() => setShowCreationCoverPicker(false)} triggerRef={creationCoverBtnRef} />}
                                                </div>
                                                <div className="relative">
                                                    <Tooltip content="Фон записи">
                                                        <button 
                                                            ref={creationCoverBtnRef}
                                                            onMouseDown={(e) => { e.preventDefault(); setShowModalColorPicker(!showModalColorPicker); }} 
                                                            className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${creationColor !== 'white' ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                                        >
                                                            <Palette size={16} />
                                                        </button>
                                                    </Tooltip>
                                                    {showModalColorPicker && (
                                                        <ColorPickerPopover
                                                            onSelect={setCreationColor}
                                                            onClose={() => setShowModalColorPicker(false)}
                                                            triggerRef={creationCoverBtnRef}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={handleSubmit} 
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 font-medium text-sm transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-[0.98]"
                                            >
                                                <Send size={16} strokeWidth={1} /> 
                                                <span className="font-serif">Сохранить</span>
                                            </button>
                                            <button 
                                                onClick={() => setIsExpanded(false)} 
                                                className="px-4 py-3 rounded-xl border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                            >
                                                <X size={20} strokeWidth={1} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {filteredNotes.length === 0 ? (
                            <div className="py-20">
                                <EmptyState 
                                    icon={StickyNote} 
                                    title={searchQuery ? "Ничего не найдено" : "Чистый лист"} 
                                    description={searchQuery ? "Попробуй изменить запрос" : "Здесь пока пусто. Начни с первой мысли."} 
                                    color="indigo" 
                                />
                            </div>
                        ) : (
                            <Masonry
                                breakpointCols={breakpointColumnsObj}
                                className="my-masonry-grid"
                                columnClassName="my-masonry-grid_column"
                            >
                                {filteredNotes.map(note => (
                                    <NoteCard 
                                        key={note.id} 
                                        note={note} 
                                        isArchived={activeTab !== 'inbox'} 
                                        isLinkedToJournal={linkedNoteIds.has(note.id)} 
                                        handlers={{
                                            handleDragStart: (e, id) => e.dataTransfer.setData('noteId', id),
                                            handleDragOver: (e) => e.preventDefault(),
                                            handleDrop: (e, id) => reorderNote(e.dataTransfer.getData('noteId'), id),
                                            handleOpenNote: (n) => { setSelectedNote(n); setIsExpanded(true); },
                                            togglePin,
                                            archiveNote,
                                            moveNoteToSandbox,
                                            moveNoteToInbox,
                                            onAddTask,
                                            onAddJournalEntry,
                                            addSketchItem,
                                            onImageClick: (src) => setLightboxSrc(src),
                                            deleteFlashcard,
                                            toggleFlashcardStar,
                                            deleteNote
                                        }} 
                                    />
                                ))}
                            </Masonry>
                        )}
                    </>
                )}
             </div>
        </div>

        {/* ORACLE MODAL */}
        <AnimatePresence>
            {showOracle && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowOracle(false)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full max-w-sm bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl overflow-hidden relative border border-white/20"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Animated Background */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${oracleVibe.color} opacity-10`} />
                        
                        <div className="relative z-10 p-8 flex flex-col items-center text-center">
                            {oracleState === 'select' && (
                                <>
                                    <div className="mb-8">
                                        <h3 className="text-xl font-light text-slate-800 dark:text-white mb-2 font-serif">Оракул</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Выбери намерение</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 w-full">
                                        {ORACLE_VIBES.map(vibe => (
                                            <button
                                                key={vibe.id}
                                                onClick={() => { setOracleVibe(vibe); setOracleState('thinking'); setTimeout(() => {
                                                    const validNotes = notes.filter(n => n.status !== 'trash');
                                                    if (validNotes.length === 0) { alert("Нет заметок"); setShowOracle(false); return; }
                                                    // Simple random for now, could be smarter based on vibe
                                                    const randomNote = validNotes[Math.floor(Math.random() * validNotes.length)];
                                                    setOracleNote(randomNote);
                                                    setOracleState('result');
                                                }, 2000); }}
                                                className="aspect-square rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-3 group"
                                            >
                                                <vibe.icon size={28} className={`text-slate-300 dark:text-slate-600 group-hover:${vibe.text} transition-colors`} />
                                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white">{vibe.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}

                            {oracleState === 'thinking' && (
                                <div className="py-12 flex flex-col items-center">
                                    <div className="relative w-24 h-24 mb-6">
                                        <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${oracleVibe.color} opacity-20 animate-ping`} />
                                        <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-700 animate-[spin_3s_linear_infinite]" />
                                        <div className="absolute inset-2 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 animate-[spin_4s_linear_infinite_reverse]" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <oracleVibe.icon size={32} className={`${oracleVibe.text} animate-pulse`} />
                                        </div>
                                    </div>
                                    <p className="text-sm font-mono uppercase tracking-widest text-slate-500 animate-pulse">Синхронизация...</p>
                                </div>
                            )}

                            {oracleState === 'result' && oracleNote && (
                                <div className="w-full">
                                    <div className="mb-6 flex justify-center">
                                        <div className={`p-4 rounded-full bg-gradient-to-br ${oracleVibe.color} shadow-lg shadow-indigo-500/20`}>
                                            <oracleVibe.icon size={32} className="text-white" />
                                        </div>
                                    </div>
                                    <div className="bg-white/50 dark:bg-black/20 rounded-xl p-6 border border-slate-100 dark:border-white/5 mb-6 relative">
                                        <Quote size={24} className="absolute -top-3 -left-2 text-slate-200 dark:text-slate-700" />
                                        <div className="text-sm md:text-base font-serif italic text-slate-700 dark:text-slate-200 leading-relaxed line-clamp-6">
                                            {oracleNote.content}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { setSelectedNote(oracleNote); setShowOracle(false); setOracleState('select'); }}
                                        className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:scale-105 transition-transform"
                                    >
                                        Открыть
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* EDIT MODAL */}
        <AnimatePresence>
            {isEditing && selectedNote && (
                <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsEditing(false)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="w-full max-w-2xl bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[90vh] relative overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Cover Image in Edit Mode */}
                        {editCover && (
                            <div className="h-40 shrink-0 relative mb-6 -mx-6 -mt-6 md:-mx-8 md:-mt-8 w-[calc(100%_+_3rem)] md:w-[calc(100%_+_4rem)] group overflow-hidden">
                                <img src={editCover} alt="Cover" className="w-full h-full object-cover" />
                                <button onClick={() => setEditCover(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        <input 
                            type="text" 
                            placeholder="Название" 
                            value={editTitle} 
                            onChange={(e) => setEditTitle(e.target.value)} 
                            className="text-2xl font-sans font-bold text-slate-900 dark:text-white leading-tight bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 mb-4" 
                        />

                        {/* Toolbar */}
                        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 mb-2">
                            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mask-fade-right">
                                <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execEditUndo(); }} disabled={editHistoryIndex <= 0} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execEditRedo(); }} disabled={editHistoryIndex >= editHistory.length - 1} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500 disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('bold'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Bold size={16} /></button></Tooltip>
                                <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('italic'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Italic size={16} /></button></Tooltip>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                <Tooltip content="Очистить"><button onMouseDown={handleEditClearStyle} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Eraser size={16} /></button></Tooltip>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                <Tooltip content="Вставить картинку"><label className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer text-slate-400 dark:text-slate-500 flex items-center justify-center"><input type="file" accept="image/*" className="hidden" onChange={handleEditImageUpload} /><ImageIcon size={16} /></label></Tooltip>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                <div className="relative">
                                    <Tooltip content="Обложка">
                                        <button 
                                            ref={editCoverBtnRef}
                                            onMouseDown={(e) => { e.preventDefault(); setShowEditCoverPicker(!showEditCoverPicker); }} 
                                            className={`p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${editCover ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                        >
                                            <Layout size={16} />
                                        </button>
                                    </Tooltip>
                                    {showEditCoverPicker && <CoverPicker onSelect={setEditCover} onClose={() => setShowEditCoverPicker(false)} triggerRef={editCoverBtnRef} />}
                                </div>
                            </div>
                        </div>

                        <div 
                            ref={editContentRef} 
                            contentEditable 
                            suppressContentEditableWarning={true}
                            style={{ whiteSpace: 'pre-wrap' }}
                            onInput={handleEditModalInput} 
                            onClick={(e) => handleEditorClick(e, true)}
                            className="w-full flex-1 bg-transparent rounded-none p-0 text-base text-slate-800 dark:text-slate-200 border-none outline-none font-serif leading-relaxed custom-scrollbar-ghost [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 cursor-text"
                        />

                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <TagSelector selectedTags={editTagsList} onChange={setEditTagsList} existingTags={allExistingTags} variant="ghost" direction="up" />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Отмена</button>
                            <button onClick={handleSaveEdit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold">Сохранить</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
};

export default Napkins;
