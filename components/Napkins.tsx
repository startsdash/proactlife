
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, SketchItem, JournalEntry, Flashcard, Habit, Module } from '../types';
import { findNotesByMood, autoTagNote } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { Send, Tag as TagIcon, RotateCcw, RotateCw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Plus, Sparkles, Kanban, Dices, Shuffle, Quote, ArrowRight, PenTool, Orbit, Flame, Waves, Clover, ArrowLeft, Image as ImageIcon, Bold, Italic, List, Code, Underline, Eraser, Type, Globe, Layout, Upload, RefreshCw, Archive, Clock, Diamond, Tablet, Book, BrainCircuit, Star, Pause, Play, Maximize2, Zap, Circle, Gem, Aperture, Layers, Filter, StickyNote } from 'lucide-react';

interface Props {
  notes: Note[];
  flashcards?: Flashcard[];
  tasks?: Task[];
  habits?: Habit[];
  sketchItems?: SketchItem[];
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
  deleteSketchItem?: (id: string) => void;
  updateSketchItem?: (item: SketchItem) => void;
  
  deleteFlashcard: (id: string) => void;
  toggleFlashcardStar: (id: string) => void;

  defaultTab?: 'inbox' | 'library' | 'flashcards';
  initialNoteId?: string | null;
  onClearInitialNote?: () => void;
  journalEntries?: JournalEntry[];
  onNavigate: (module: Module) => void;
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
    let cleanText = content.replace(/!\[.*?\]\(.*?\)/g, '');
    cleanText = cleanText.replace(/[ \t]+/g, ' ').trim();
    const sentences = cleanText.match(/[^\.!\?]+[\.!\?]+(?=\s|$)/g) || [cleanText];
    let limit = 0;
    let sentenceCount = 0;
    for (let s of sentences) {
        if (sentenceCount >= 3) break;
        if (limit + s.length > 300 && sentenceCount >= 1) break;
        limit += s.length;
        sentenceCount++;
    }
    let preview = sentences.slice(0, sentenceCount).join(' ');
    if (preview.length === 0 && cleanText.length > 0) preview = cleanText;
    if (preview.length > 300) {
        preview = preview.slice(0, 300);
        const lastSpace = preview.lastIndexOf(' ');
        if (lastSpace > 0) preview = preview.slice(0, lastSpace);
    }
    if (preview.length < cleanText.length) preview = preview.replace(/[\.!\?,\s]+$/, '') + '...';
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
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        if (line.match(/^<(h1|h2|div|p|ul|ol|li|blockquote)/i)) return line;
        return line.trim() ? `<div>${line}</div>` : '<div><br></div>';
    });
    return processedLines.join('');
};

const getNoteColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const KineticFlashcardDeck = ({ cards, onDelete, onToggleStar }: { cards: Flashcard[], onDelete: (id: string) => void, onToggleStar: (id: string) => void }) => {
    const [index, setIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);

    const displayedCards = useMemo(() => {
        return showFavorites ? cards.filter(c => c.isStarred) : cards;
    }, [cards, showFavorites]);

    useEffect(() => {
        if (index >= displayedCards.length && displayedCards.length > 0) {
            setIndex(Math.max(0, displayedCards.length - 1));
        }
    }, [displayedCards.length, index]);

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
                    {showFavorites ? "Отметь важные карточки звездочкой" : "Кристаллизуй знания в Хабе, чтобы они появились здесь."}
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
            if (safeIndex >= displayedCards.length - 1) {
                setIndex(Math.max(0, safeIndex - 1));
            }
        }
    };

    return (
        <div className="flex items-center justify-center h-full min-h-[600px] w-full p-4 md:p-8">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-2xl min-h-[500px] bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden flex flex-col transition-colors duration-500"
                onClick={toggleFlip}
            >
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

                <div className="flex justify-between items-center px-8 pt-8 pb-2 relative z-20" onClick={e => e.stopPropagation()}>
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        {isFlipped ? <Sparkles size={12} className="text-amber-500" /> : <BrainCircuit size={12} className="text-indigo-500" />}
                        <span>{isFlipped ? 'ОТВЕТ' : 'ВОПРОС'} <span className="opacity-50 mx-2">//</span> {safeIndex + 1} из {displayedCards.length}</span>
                    </div>

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
                            <div className="w-full h-[320px] overflow-y-auto pr-2 custom-scrollbar-ghost">
                                <div className="min-h-full flex flex-col justify-center">
                                    <div className="font-serif text-xl md:text-3xl leading-relaxed text-slate-800 dark:text-slate-100 select-none whitespace-pre-wrap py-4">
                                        {isFlipped ? currentCard.back : currentCard.front}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="pb-8 px-8 flex justify-between items-end relative z-20" onClick={e => e.stopPropagation()}>
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
    u: ({node, ...props}: any) => <u {...props} /> 
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

interface PathStatus {
    hubId?: string;
    sprintId?: string;
    journalId?: string;
    sketchpadId?: string;
}

interface NoteCardProps {
    note: Note;
    isArchived: boolean;
    pathStatus: PathStatus;
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
        onImageClick?: (src: string) => void;
        onNavigate: (module: Module) => void;
    }
}

const NoteCard: React.FC<NoteCardProps> = ({ note, isArchived, pathStatus, handlers }) => {
    const [isExiting, setIsExiting] = useState(false);
    const linkUrl = findFirstUrl(note.content);
    
    const previewText = useMemo(() => getPreviewContent(note.content), [note.content]);
    
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

    const handleToSandbox = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(pathStatus.hubId) {
            handlers.onNavigate(Module.SANDBOX);
        } else {
            if(window.confirm('В хаб?')) handlers.moveNoteToSandbox(note.id);
        }
    };

    const handleToSprint = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(pathStatus.sprintId) {
            handlers.onNavigate(Module.KANBAN);
        } else {
            if(window.confirm('В спринты?')) { 
                handlers.onAddTask({ id: Date.now().toString(), title: note.title, content: note.content, column: 'todo', createdAt: Date.now() }); 
            }
        }
    };

    const handleJournalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(pathStatus.journalId) {
            handlers.onNavigate(Module.JOURNAL);
        } else {
            handleToJournal(e);
        }
    };

    const handleSketchpadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(pathStatus.sketchpadId) {
            handlers.onNavigate(Module.SKETCHPAD);
        } else if(handlers.addSketchItem) {
            handleToSketchpad(e);
        }
    };

    const hasConnections = !!(pathStatus.hubId || pathStatus.sprintId || pathStatus.journalId || pathStatus.sketchpadId);

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

            {isArchived && hasConnections && (
                <div className="absolute top-5 left-5 z-30">
                    <Tooltip content="Есть связи">
                        <div className="relative w-2 h-2">
                            <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-30"></div>
                            <div className="relative w-2 h-2 rounded-full border border-emerald-500/50 bg-emerald-500/10"></div>
                        </div>
                    </Tooltip>
                </div>
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

            <div className="flex h-full relative z-10">
                <div className="flex-1 flex flex-col min-w-0 p-8 pb-16">
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
            </div>
            
            <div className={`absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-white/90 via-white/60 to-transparent dark:from-slate-900/90 dark:via-slate-900/60 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-20 flex justify-between items-end`}>
                <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                    {!isArchived ? (
                        <Tooltip content="Переместить в библиотеку">
                            <button onClick={handleArchive} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Library size={16} strokeWidth={1.5} /></button>
                        </Tooltip>
                    ) : (
                        <>
                            <Tooltip content={pathStatus.hubId ? "В хабе" : "В хаб"}>
                                <button 
                                    onClick={handleToSandbox}
                                    className={`p-2 rounded-full transition-all ${
                                        pathStatus.hubId 
                                        ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 opacity-100' 
                                        : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <Box size={16} strokeWidth={1.5} />
                                </button>
                            </Tooltip>
                            
                            <Tooltip content={pathStatus.sprintId ? "В спринтах" : "В спринты"}>
                                <button 
                                    onClick={handleToSprint}
                                    className={`p-2 rounded-full transition-all ${
                                        pathStatus.sprintId 
                                        ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 opacity-100' 
                                        : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <Kanban size={16} strokeWidth={1.5} />
                                </button>
                            </Tooltip>
                            
                            <Tooltip content={pathStatus.journalId ? "В дневнике" : "В дневник"}>
                                <button 
                                    onClick={handleJournalClick}
                                    className={`p-2 rounded-full transition-all ${
                                        pathStatus.journalId 
                                        ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 opacity-100' 
                                        : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <Book size={16} strokeWidth={1.5} />
                                </button>
                            </Tooltip>
                            
                            {handlers.addSketchItem && (
                                <Tooltip content={pathStatus.sketchpadId ? "В скетчпаде" : "В скетчпад"}>
                                    <button 
                                        onClick={handleSketchpadClick}
                                        className={`p-2 rounded-full transition-all ${
                                            pathStatus.sketchpadId 
                                            ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 opacity-100' 
                                            : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <Tablet size={16} strokeWidth={1.5} />
                                    </button>
                                </Tooltip>
                            )}
                        </>
                    )}
                </div>
                
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

const Napkins: React.FC<Props> = ({ notes, flashcards, tasks = [], habits = [], sketchItems = [], config, addNote, moveNoteToSandbox, moveNoteToInbox, archiveNote, deleteNote, reorderNote, updateNote, onAddTask, onAddJournalEntry, addSketchItem, deleteFlashcard, toggleFlashcardStar, defaultTab, initialNoteId, onClearInitialNote, journalEntries, onNavigate }) => {
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
  
  // EDIT MODAL STATE
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editColor, setEditColor] = useState('white');
  const [editCover, setEditCover] = useState<string | null>(null);
  const modalEditorRef = useRef<HTMLDivElement>(null);
  const [modalHistory, setModalHistory] = useState<string[]>(['']);
  const [modalHistoryIndex, setModalHistoryIndex] = useState(0);
  const modalHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creationPickerTriggerRef = useRef<HTMLButtonElement>(null);
  const editPickerTriggerRef = useRef<HTMLButtonElement>(null);

  const getPathStatus = useCallback((note: Note): PathStatus => {
    const status: PathStatus = {};

    // Hub check: Note with status 'sandbox' and same content
    const hubNote = notes.find(n => n.status === 'sandbox' && n.content.trim() === note.content.trim());
    if (hubNote) status.hubId = hubNote.id;

    // Sprint check: Task !archived and content matches note content or title
    const sprintTask = tasks.find(t => !t.isArchived && (t.content.trim() === note.content.trim() || t.title === note.title));
    if (sprintTask) status.sprintId = sprintTask.id;

    // Journal check: Entry !archived and links to note.id
    const journalEntry = journalEntries?.find(j => !j.isArchived && (j.linkedNoteId === note.id || j.linkedNoteIds?.includes(note.id)));
    if (journalEntry) status.journalId = journalEntry.id;

    // Sketchpad check: Item matches content
    const sketchItem = sketchItems?.find(s => s.content.trim() === note.content.trim());
    if (sketchItem) status.sketchpadId = sketchItem.id;

    return status;
  }, [notes, tasks, journalEntries, sketchItems]);

  useEffect(() => {
    if (initialNoteId) {
      const note = notes.find(n => n.id === initialNoteId);
      if (note) {
        setSelectedNote(note);
        // Force tab switch if needed
        if (note.status === 'archived') setActiveTab('library');
        else setActiveTab('inbox');
      }
      onClearInitialNote?.();
    }
  }, [initialNoteId, notes, onClearInitialNote]);

  const allTags = useMemo(() => {
      const tags = new Set<string>();
      notes.forEach(n => n.tags?.forEach(t => tags.add(t)));
      return Array.from(tags);
  }, [notes]);

  const saveSnapshot = useCallback((content: string, isModal: boolean = false) => {
      if (isModal) {
          if (content === modalHistory[modalHistoryIndex]) return;
          const newHistory = modalHistory.slice(0, modalHistoryIndex + 1);
          newHistory.push(content);
          if (newHistory.length > 50) newHistory.shift();
          setModalHistory(newHistory);
          setModalHistoryIndex(newHistory.length - 1);
      } else {
          if (content === history[historyIndex]) return;
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(content);
          if (newHistory.length > 50) newHistory.shift();
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
      }
  }, [history, historyIndex, modalHistory, modalHistoryIndex]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>, isModal: boolean = false) => {
      const target = e.currentTarget;
      const ref = isModal ? modalHistoryTimeoutRef : historyTimeoutRef;
      
      if (ref.current) clearTimeout(ref.current);
      ref.current = setTimeout(() => {
          saveSnapshot(target.innerHTML, isModal);
      }, 500);
  };

  const handleAdd = () => {
      const rawHtml = contentEditableRef.current?.innerHTML || '';
      const markdownContent = htmlToMarkdown(rawHtml);
      
      if (!markdownContent.trim() && !title.trim()) return;
      
      const newNote: Note = {
          id: Date.now().toString(),
          title: applyTypography(title),
          content: applyTypography(markdownContent),
          tags: creationTags,
          createdAt: Date.now(),
          status: 'inbox',
          color: creationColor,
          coverUrl: creationCover || undefined
      };
      
      addNote(newNote);
      if (contentEditableRef.current) contentEditableRef.current.innerHTML = '';
      setTitle('');
      setCreationTags([]);
      setCreationColor('white');
      setCreationCover(null);
      setHistory(['']);
      setHistoryIndex(0);
      setIsExpanded(false);
  };

  const execCmd = (command: string, value: string | undefined = undefined, isModal: boolean = false) => {
      document.execCommand(command, false, value);
      const ref = isModal ? modalEditorRef : contentEditableRef;
      if (ref.current) {
          ref.current.focus();
          saveSnapshot(ref.current.innerHTML, isModal);
      }
  };

  const handlers = useMemo(() => ({
      handleDragStart: (e: React.DragEvent, id: string) => {
          e.dataTransfer.setData('noteId', id);
          e.dataTransfer.effectAllowed = "move";
      },
      handleDragOver: (e: React.DragEvent) => {
          e.preventDefault();
      },
      handleDrop: (e: React.DragEvent, targetId: string) => {
          e.preventDefault();
          const draggedId = e.dataTransfer.getData('noteId');
          if (draggedId && draggedId !== targetId) {
              reorderNote(draggedId, targetId);
          }
      },
      handleOpenNote: (note: Note) => {
          setSelectedNote(note);
          setEditTitle(note.title || '');
          setEditTags(note.tags || []);
          setEditColor(note.color || 'white');
          setEditCover(note.coverUrl || null);
          const html = markdownToHtml(note.content);
          setModalHistory([html]);
          setModalHistoryIndex(0);
          setTimeout(() => {
              if (modalEditorRef.current) modalEditorRef.current.innerHTML = html;
          }, 0);
      },
      togglePin: (e: React.MouseEvent, note: Note) => {
          e.stopPropagation();
          updateNote({ ...note, isPinned: !note.isPinned });
      },
      onAddTask,
      moveNoteToSandbox,
      archiveNote,
      moveNoteToInbox,
      onAddJournalEntry,
      addSketchItem,
      onImageClick: (src: string) => { /* Lightbox logic if needed */ },
      onNavigate
  }), [reorderNote, setSelectedNote, updateNote, onAddTask, moveNoteToSandbox, archiveNote, moveNoteToInbox, onAddJournalEntry, addSketchItem, onNavigate]);

  const inboxNotes = notes.filter(n => n.status === 'inbox');
  const archivedNotes = notes.filter(n => n.status === 'archived').sort((a,b) => (b.isPinned === a.isPinned) ? 0 : b.isPinned ? 1 : -1);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative">
      {/* Header */}
      <div className="px-4 md:px-8 pt-4 md:pt-8 pb-4 shrink-0 z-20 relative">
          <div className="flex justify-between items-end mb-6">
              <div>
                  <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">
                      Заметки
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">
                      Буфер обмена сознания
                  </p>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => setActiveTab('inbox')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'inbox' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Входящие</button>
                  <button onClick={() => setActiveTab('library')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'library' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Библиотека</button>
                  <button onClick={() => setActiveTab('flashcards')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'flashcards' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>Скиллы</button>
              </div>
          </div>
          
          {/* Creation Area - Only visible in Inbox */}
          {activeTab === 'inbox' && (
              <div className="max-w-2xl mx-auto relative z-30">
                  {!isExpanded ? (
                      <div 
                          onClick={() => { setIsExpanded(true); setTimeout(() => contentEditableRef.current?.focus(), 100); }}
                          className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 cursor-text flex items-center justify-between group hover:shadow-md transition-all h-[52px]"
                      >
                          <span className="text-slate-400 dark:text-slate-500 font-serif italic text-base pl-2">Новая мысль...</span>
                          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 group-hover:text-indigo-500 transition-colors">
                              <Edit3 size={18} />
                          </div>
                      </div>
                  ) : (
                      <div className={`${getNoteColorClass(creationColor)} rounded-2xl border border-slate-200/50 dark:border-slate-700 shadow-xl p-5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200 relative`}>
                          {creationCover && (
                              <div className="relative w-full h-32 group rounded-t-xl overflow-hidden -mt-5 -mx-5 mb-3 w-[calc(100%_+_2.5rem)]">
                                  <img src={creationCover} alt="Cover" className="w-full h-full object-cover" />
                                  <button onClick={() => setCreationCover(null)} className="absolute top-3 right-3 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={14} /></button>
                              </div>
                          )}
                          <div className="flex justify-between items-start">
                              <input 
                                  type="text" 
                                  placeholder="Заголовок" 
                                  value={title}
                                  onChange={(e) => setTitle(e.target.value)}
                                  className="w-full bg-transparent text-xl font-sans font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                  autoFocus
                              />
                              <div className="flex gap-1">
                                  <div className="relative">
                                      <Tooltip content="Обложка">
                                          <button 
                                              ref={creationPickerTriggerRef}
                                              onMouseDown={(e) => { e.preventDefault(); setShowCreationCoverPicker(!showCreationCoverPicker); }} 
                                              className={`p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors ${creationCover ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                          >
                                              <Layout size={18} />
                                          </button>
                                      </Tooltip>
                                      {showCreationCoverPicker && <CoverPicker onSelect={setCreationCover} onClose={() => setShowCreationCoverPicker(false)} triggerRef={creationPickerTriggerRef} />}
                                  </div>
                                  <button onClick={() => setIsExpanded(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X size={20} /></button>
                              </div>
                          </div>
                          
                          <div 
                              ref={contentEditableRef}
                              contentEditable 
                              onInput={(e) => handleInput(e)}
                              className="w-full min-h-[120px] max-h-[400px] overflow-y-auto outline-none text-base text-slate-800 dark:text-slate-200 bg-transparent font-serif leading-relaxed custom-scrollbar-ghost [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 cursor-text"
                              data-placeholder="Напиши что-нибудь..."
                          />
                          
                          {/* Toolbar */}
                          <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                              <div className="flex items-center gap-1">
                                  {/* Color Picker */}
                                  <div className="relative">
                                      <Tooltip content="Цвет заметки">
                                          <button 
                                              onClick={() => setShowColorPicker(!showColorPicker)}
                                              className={`w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 ${colors.find(c => c.id === creationColor)?.class || 'bg-white'}`}
                                          />
                                      </Tooltip>
                                      {showColorPicker && (
                                          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex gap-2 z-50">
                                              {colors.map(c => (
                                                  <button 
                                                      key={c.id} 
                                                      onClick={() => { setCreationColor(c.id); setShowColorPicker(false); }} 
                                                      className={`w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform`} 
                                                      style={{ backgroundColor: c.hex }} 
                                                  />
                                              ))}
                                          </div>
                                      )}
                                  </div>
                                  <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-2" />
                                  {/* Simple Formatting */}
                                  <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Bold size={16} /></button></Tooltip>
                                  <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded text-slate-400 dark:text-slate-500"><Italic size={16} /></button></Tooltip>
                              </div>
                              <button 
                                  onClick={handleAdd} 
                                  className="flex items-center gap-2 px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium text-sm hover:shadow-lg transition-all active:scale-95"
                              >
                                  <Plus size={16} strokeWidth={2} /> Создать
                              </button>
                          </div>
                          
                          <TagSelector selectedTags={creationTags} onChange={setCreationTags} existingTags={allTags} variant="ghost" direction="up" />
                      </div>
                  )}
              </div>
          )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20 relative z-10">
          <AnimatePresence mode="wait">
              {activeTab === 'flashcards' ? (
                  <motion.div
                      key="flashcards"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                  >
                      <KineticFlashcardDeck 
                          cards={flashcards || []} 
                          onDelete={deleteFlashcard} 
                          onToggleStar={toggleFlashcardStar}
                      />
                  </motion.div>
              ) : (
                  <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                  >
                      {((activeTab === 'inbox' && inboxNotes.length === 0) || (activeTab === 'library' && archivedNotes.length === 0)) ? (
                          <div className="py-20">
                              <EmptyState 
                                  icon={activeTab === 'inbox' ? StickyNote : Library} 
                                  title={activeTab === 'inbox' ? "Входящие пусты" : "Библиотека пуста"} 
                                  description={activeTab === 'inbox' ? "Чистый разум. Добавьте новую мысль, чтобы начать." : "Здесь хранятся обработанные знания."}
                                  color="indigo"
                              />
                          </div>
                      ) : (
                          <Masonry
                              breakpointCols={breakpointColumnsObj}
                              className="my-masonry-grid"
                              columnClassName="my-masonry-grid_column"
                          >
                              {(activeTab === 'inbox' ? inboxNotes : archivedNotes).map(note => (
                                  <NoteCard 
                                      key={note.id} 
                                      note={note} 
                                      isArchived={activeTab === 'library'}
                                      pathStatus={getPathStatus(note)}
                                      handlers={handlers}
                                  />
                              ))}
                          </Masonry>
                      )}
                  </motion.div>
              )}
          </AnimatePresence>
      </div>

      {/* EDIT MODAL */}
      <AnimatePresence>
          {selectedNote && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedNote(null)}>
                  <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`w-full max-w-2xl max-h-[90vh] ${getNoteColorClass(editColor)} rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative`}
                      onClick={e => e.stopPropagation()}
                  >
                        {editCover && (
                            <div className="h-48 w-full relative shrink-0">
                                <img src={editCover} className="w-full h-full object-cover" />
                                <button onClick={() => setEditCover(null)} className="absolute top-4 right-4 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"><X size={16} /></button>
                            </div>
                        )}

                        <div className="p-8 flex flex-col h-full overflow-hidden">
                            <div className="flex justify-between items-start mb-4 shrink-0">
                                <input 
                                    className="text-2xl font-sans font-bold bg-transparent border-none outline-none w-full placeholder:text-slate-300 dark:placeholder:text-slate-600" 
                                    placeholder="Заголовок" 
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                />
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="relative">
                                        <Tooltip content="Обложка">
                                            <button 
                                                ref={editPickerTriggerRef}
                                                onMouseDown={(e) => { e.preventDefault(); setShowEditCoverPicker(!showEditCoverPicker); }} 
                                                className={`p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors ${editCover ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'}`}
                                            >
                                                <Layout size={20} />
                                            </button>
                                        </Tooltip>
                                        {showEditCoverPicker && <CoverPicker onSelect={setEditCover} onClose={() => setShowEditCoverPicker(false)} triggerRef={editPickerTriggerRef} />}
                                    </div>
                                    <button onClick={() => setSelectedNote(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X size={24} /></button>
                                </div>
                            </div>

                            <div 
                                ref={modalEditorRef}
                                contentEditable
                                className="flex-1 overflow-y-auto outline-none text-base md:text-lg font-serif leading-relaxed custom-scrollbar-ghost [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 cursor-text text-slate-800 dark:text-slate-200"
                                onInput={(e) => handleInput(e, true)}
                            />

                            <div className="pt-4 mt-4 border-t border-black/5 dark:border-white/5 shrink-0 flex items-center justify-between">
                                <TagSelector selectedTags={editTags} onChange={setEditTags} existingTags={allTags} variant="ghost" direction="up" />
                                <div className="flex items-center gap-3">
                                    <Tooltip content="Удалить"><button onClick={() => { if(confirm("Удалить заметку?")) { deleteNote(selectedNote.id); setSelectedNote(null); } }} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={20} /></button></Tooltip>
                                    <button 
                                        onClick={() => {
                                            const rawHtml = modalEditorRef.current?.innerHTML || '';
                                            const content = htmlToMarkdown(rawHtml);
                                            updateNote({ 
                                                ...selectedNote, 
                                                title: applyTypography(editTitle), 
                                                content: applyTypography(content),
                                                tags: editTags,
                                                color: editColor,
                                                coverUrl: editCover || undefined
                                            });
                                            setSelectedNote(null);
                                        }}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                                    >
                                        Сохранить
                                    </button>
                                </div>
                            </div>
                        </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default Napkins;
