
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCw, RotateCcw, Play, FileText, Check, Archive as ArchiveIcon, History, Trash2, Plus, Minus, Book, Save, ArrowDown, ArrowUp, Square, CheckSquare, Circle, XCircle, Kanban as KanbanIcon, ListTodo, Bot, Pin, GripVertical, ChevronUp, ChevronDown, Edit3, AlignLeft, Target, Trophy, Search, Rocket, Briefcase, Sprout, Heart, Hash, Clock, ChevronRight, Layout, Maximize2, Command, Palette, Bold, Italic, Eraser, Image as ImageIcon } from 'lucide-react';
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

// --- TECHNO VISUAL CONSTANTS ---
const NEON_COLORS: Record<string, string> = {
    productivity: '#0075FF', // Cyber Blue
    growth: '#00FFA3',       // Electric Mint
    relationships: '#FF007A' // Neon Rose
};

// Dot Grid Background Pattern
const DOT_GRID_STYLE = {
    backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
    backgroundSize: '24px 24px'
};

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

// --- RICH TEXT HELPERS (Ported from Napkins) ---
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

// --- IMPROVED MARKDOWN CONVERTERS ---

const markdownToHtml = (md: string) => {
    if (!md) return '';
    let html = md;
    // Standard Markdown replacements
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
    
    // Crucial: Handle Newlines for ContentEditable
    // We replace newlines with <br> but avoid double <br> after block elements
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/(<\/h1>|<\/h2>|<\/p>|<\/div>)<br>/gi, '$1');
    return html;
};

const htmlToMarkdown = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Improved wrapper: Pushes whitespace outside the markers
    const wrap = (text: string, marker: string) => {
        // Match leading whitespace, content, trailing whitespace
        const match = text.match(/^([\s\u00A0]*)(.*?)([\s\u00A0]*)$/s);
        if (match) {
            // group 1: leading space, group 2: content, group 3: trailing space
            if (!match[2]) return match[1] + match[3];
            return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
        }
        return text;
    };

    const walk = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
            // Replace NBSP with normal space immediately
            return (node.textContent || '').replace(/\u00A0/g, ' ');
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            
            if (tag === 'br') return '\n';
            if (tag === 'img') return `\n![${(el as HTMLImageElement).alt || 'image'}](${(el as HTMLImageElement).src})\n`;
            
            let content = '';
            el.childNodes.forEach(child => content += walk(child));
            
            // Block Elements: Wrap with newlines to ensure separation
            // We use a specific strategy: force newlines around blocks, then collapse later
            if (['div', 'p', 'li', 'ul', 'ol'].includes(tag)) {
                return `\n${content}\n`;
            }
            if (tag === 'h1') return `\n\n# ${content}\n\n`;
            if (tag === 'h2') return `\n\n## ${content}\n\n`;

            // Inline Formatting
            const styleBold = el.style.fontWeight === 'bold' || parseInt(el.style.fontWeight || '0') >= 700;
            const styleItalic = el.style.fontStyle === 'italic';

            if (styleBold) return wrap(content, '**');
            if (styleItalic) return wrap(content, '*');
            
            switch (tag) {
                case 'b': case 'strong': return wrap(content, '**');
                case 'i': case 'em': return wrap(content, '*');
                case 'code': return `\`${content}\``;
                case 'u': return `<u>${content}</u>`;
                default: return content;
            }
        }
        return '';
    };
    
    let md = walk(temp);
    
    // Aggressive Newline Normalization for WYSIWYG Feel
    // 1. Convert 3+ newlines (explicit gap) to a special marker
    md = md.replace(/\n{3,}/g, '§§§'); 
    // 2. Convert 2 newlines (block boundary) to 1 newline (single line break visual)
    md = md.replace(/\n{2}/g, '\n');
    // 3. Restore explicit gaps (2 blank lines -> 1 blank line in markdown)
    md = md.replace(/§§§/g, '\n\n');
    
    return applyTypography(md.trim());
};

// Helper: Prepare content for ReactMarkdown display
// Ensures visual fidelity by forcing hard breaks for single newlines
const formatForDisplay = (content: string) => {
    if (!content) return '';
    // Replace single newline with double space + newline for Markdown hard break
    return content.replace(/\n/g, '  \n');
};

// Highlight Helper
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

// Markdown Styles
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

// --- NEW COMPONENT: SEGMENTED PROGRESS BAR ---
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
                  isOpen ? 'border-indigo-400 ring-2 ring-indigo-50 dark:ring-indigo-900 bg-white dark:bg-[#1e293b]' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
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
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'text-[#2F3437] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
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
    const lines = content.split('\n');
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
    const lines = content.split('\n');
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
  
  // Creation Editor State
  const [creationHistory, setCreationHistory] = useState<string[]>(['']);
  const [creationHistoryIndex, setCreationHistoryIndex] = useState(0);
  const creationContentRef = useRef<HTMLDivElement>(null);
  const creationFileRef = useRef<HTMLInputElement>(null);
  const lastCreationSelection = useRef<Range | null>(null);

  // EDIT TASK STATE
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  
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

  const columns = [
    { id: 'todo', title: 'Нужно сделать' },
    { id: 'doing', title: 'В работе' },
    { id: 'done', title: 'Завершено' }
  ];

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

  const handleCreationImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const base64 = await processImage(file);
              insertImageAtCursor(base64);
          } catch (err) { console.error(err); }
          e.target.value = '';
      }
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
          spheres: activeSphereFilter ? [activeSphereFilter] : []
      };
      addTask(newTask);
      setNewTaskTitle('');
      if(creationContentRef.current) creationContentRef.current.innerHTML = '';
      setCreationHistory(['']);
      setCreationHistoryIndex(0);
      setIsCreatorOpen(false);
  };

  const cancelCreateTask = () => {
      setNewTaskTitle('');
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
      if (content !== task.content || editTaskTitle.trim() !== task.title) {
          updateTask({ 
              ...task, 
              title: applyTypography(editTaskTitle.trim()), 
              content: applyTypography(content) 
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
                    <div className="bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg animate-in slide-in-from-top-2 relative z-20">
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
                        className={`bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 relative group active:scale-[1.02] active:shadow-lg overflow-hidden ${dimStyle} ${match ? 'cursor-grab' : ''}`}
                    >
                        
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
                    </motion.div>
                )})
            )}
            </AnimatePresence>
        </div>
    </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-2 md:p-8 relative">
        <header className="flex justify-between items-end mb-4 shrink-0 px-2 md:px-0">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Фокус на главном</p>
            </div>
            
            <div className="flex items-center gap-2">
                 <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="Поиск..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all w-32 focus:w-48"
                    />
                 </div>
                 
                 <div className="md:hidden flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    {columns.map(col => (
                        <button 
                            key={col.id}
                            onClick={() => setActiveMobileTab(col.id as any)}
                            className={`p-1.5 rounded-md transition-all ${activeMobileTab === col.id ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                        >
                            {col.id === 'todo' && <ListTodo size={16} />}
                            {col.id === 'doing' && <Zap size={16} />}
                            {col.id === 'done' && <CheckCircle2 size={16} />}
                        </button>
                    ))}
                 </div>

                 <Tooltip content={activeSphereFilter ? "Сбросить фильтр" : "Фильтр сфер"}>
                    <button 
                        onClick={() => setShowSphereSelector(!showSphereSelector)}
                        className={`p-2 rounded-xl transition-all ${activeSphereFilter ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
                    >
                        <Target size={18} />
                    </button>
                 </Tooltip>
                 {showSphereSelector && (
                     <div className="absolute top-16 right-4 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 flex flex-col gap-1 w-48">
                         <button onClick={() => { setActiveSphereFilter(null); setShowSphereSelector(false); }} className="text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">Все сферы</button>
                         {SPHERES.map(s => (
                             <button key={s.id} onClick={() => { setActiveSphereFilter(s.id); setShowSphereSelector(false); }} className="text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex items-center gap-2">
                                 <div className={`w-2 h-2 rounded-full ${s.bg.replace('50', '400').replace('/30', '')}`} /> {s.label}
                             </button>
                         ))}
                     </div>
                 )}
            </div>
        </header>

        <div className="flex-1 flex gap-2 md:gap-6 min-h-0 overflow-x-auto pb-4 px-1 scrollbar-none snap-x snap-mandatory">
            {columns.map(col => (
                <div 
                    key={col.id} 
                    className={`
                        flex-1 min-w-[85vw] md:min-w-[320px] h-full snap-center
                        ${activeMobileTab === col.id ? 'flex' : 'hidden md:flex'}
                    `}
                >
                    {renderColumn(col)}
                </div>
            ))}
        </div>

        {/* MODALS */}
        {activeModal && (
            <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCloseModal}>
                <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    {activeModal.type === 'stuck' && aiResponse && (
                        <div className="p-6 overflow-y-auto">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Bot className="text-indigo-500" /> Совет Мудреца</h3>
                            <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-6"><ReactMarkdown components={markdownComponents}>{aiResponse}</ReactMarkdown></div>
                            <div className="flex justify-end gap-2">
                                <button onClick={handleCloseModal} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Закрыть</button>
                                <button onClick={saveTherapyResponse} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Сохранить в историю</button>
                            </div>
                        </div>
                    )}

                    {activeModal.type === 'challenge' && draftChallenge && (
                        <div className="p-6 overflow-y-auto">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Zap className="text-amber-500" /> Новый Челлендж</h3>
                            <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-6 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                <ReactMarkdown components={markdownComponents}>{draftChallenge}</ReactMarkdown>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={handleCloseModal} className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Отмена</button>
                                <button onClick={acceptDraftChallenge} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-bold shadow-lg shadow-amber-200 dark:shadow-none">Принять Вызов</button>
                            </div>
                        </div>
                    )}

                    {activeModal.type === 'details' && (
                        <div className="flex flex-col h-full max-h-[85vh]">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start shrink-0">
                                <div className="flex-1 mr-4">
                                    <input 
                                        className="w-full text-lg font-bold bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-300"
                                        value={editTaskTitle}
                                        onChange={(e) => setEditTaskTitle(e.target.value)}
                                        onBlur={handleTitleSave}
                                        placeholder="Название задачи"
                                    />
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => { if(confirm("Удалить задачу?")) { deleteTask(activeModal.taskId); handleCloseModal(); } }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                    <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar-light">
                                <div className="space-y-6">
                                    {/* DESCRIPTION */}
                                    <div className="group">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><AlignLeft size={12} /> Описание</label>
                                            {!isEditingTask ? (
                                                <button onClick={() => setIsEditingTask(true)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Редактировать</button>
                                            ) : (
                                                <button onClick={handleSaveTaskContent} className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md text-xs font-bold flex items-center gap-1"><Check size={12}/> Готово</button>
                                            )}
                                        </div>
                                        
                                        {isEditingTask ? (
                                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-1 mb-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto scrollbar-none mask-fade-right">
                                                    <button onMouseDown={(e) => { e.preventDefault(); execEditUndo(); }} className="p-1.5 text-slate-400 hover:text-slate-600"><RotateCcw size={14}/></button>
                                                    <button onMouseDown={(e) => { e.preventDefault(); execEditRedo(); }} className="p-1.5 text-slate-400 hover:text-slate-600"><RotateCw size={14}/></button>
                                                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                                    <button onMouseDown={(e) => { e.preventDefault(); execEditCmd('bold'); }} className="p-1.5 text-slate-400 hover:text-slate-600 font-bold">B</button>
                                                    <button onMouseDown={(e) => { e.preventDefault(); execEditCmd('italic'); }} className="p-1.5 text-slate-400 hover:text-slate-600 italic">I</button>
                                                    <button onMouseDown={(e) => { e.preventDefault(); handleClearEditStyle(e); }} className="p-1.5 text-slate-400 hover:text-slate-600"><Eraser size={14}/></button>
                                                </div>
                                                <div 
                                                    ref={editContentEditableRef}
                                                    contentEditable
                                                    className="outline-none text-sm text-slate-700 dark:text-slate-200 min-h-[100px] leading-relaxed"
                                                    onInput={handleEditInput}
                                                />
                                            </div>
                                        ) : (
                                            <div 
                                                className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed cursor-text"
                                                onClick={() => setIsEditingTask(true)}
                                            >
                                                <ReactMarkdown components={markdownComponents}>
                                                    {getTaskForModal()?.content || ''}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>

                                    {/* SUBTASKS */}
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 mb-2"><ListTodo size={12} /> Чек-лист</label>
                                        <div className="space-y-2">
                                            {getTaskForModal()?.subtasks?.map(s => (
                                                <div key={s.id} className="flex items-start gap-3 group">
                                                    <button 
                                                        onClick={() => handleToggleSubtask(s.id)}
                                                        className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${s.isCompleted ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                                                    >
                                                        {s.isCompleted && <Check size={10} className="text-white" strokeWidth={3} />}
                                                    </button>
                                                    <span className={`text-sm flex-1 ${s.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{s.text}</span>
                                                    <button onClick={() => handleDeleteSubtask(s.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 mt-3">
                                                <input 
                                                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-2 py-1 text-sm outline-none focus:border-indigo-500 transition-colors"
                                                    placeholder="Добавить пункт..."
                                                    value={newSubtaskText}
                                                    onChange={(e) => setNewSubtaskText(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                                />
                                                <button onClick={handleAddSubtask} disabled={!newSubtaskText.trim()} className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1.5 rounded-lg disabled:opacity-50"><Plus size={18}/></button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CHALLENGE SECTION */}
                                    {(getTaskForModal()?.activeChallenge || (getTaskForModal()?.challengeHistory?.length || 0) > 0) && (
                                        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                                            {getTaskForModal()?.activeChallenge && !getTaskForModal()?.isChallengeCompleted && (
                                                <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/30 mb-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Zap size={16} className="text-indigo-500" />
                                                            <span className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Активный челлендж</span>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Tooltip content="Завершить">
                                                                <button onClick={() => toggleChallengeComplete()} className="p-1.5 bg-white dark:bg-indigo-900/50 text-emerald-500 hover:text-emerald-600 rounded-lg shadow-sm"><Check size={16} /></button>
                                                            </Tooltip>
                                                            <Tooltip content="Удалить">
                                                                <button onClick={(e) => deleteActiveChallenge(e)} className="p-1.5 bg-white dark:bg-indigo-900/50 text-slate-400 hover:text-red-500 rounded-lg shadow-sm"><Trash2 size={16} /></button>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                                                        <InteractiveChallenge 
                                                            content={getTaskForModal()?.activeChallenge || ''} 
                                                            onToggle={(idx) => {
                                                                const task = getTaskForModal();
                                                                if(task) toggleChallengeCheckbox(idx, task);
                                                            }}
                                                            onPin={handleToggleChallengeStepPin}
                                                            pinnedIndices={getTaskForModal()?.pinnedChallengeIndices}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {getTaskForModal()?.isChallengeCompleted && getTaskForModal()?.activeChallenge && (
                                                <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30 mb-4 opacity-80">
                                                    <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
                                                        <Trophy size={16} />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Челлендж выполнен!</span>
                                                        <button onClick={toggleChallengeComplete} className="ml-auto text-xs underline opacity-50 hover:opacity-100">Вернуть</button>
                                                        <button onClick={deleteActiveChallenge} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                                    </div>
                                                    <div className="text-sm text-slate-700 dark:text-slate-300 line-through decoration-emerald-500/30">
                                                        <StaticChallengeRenderer content={getTaskForModal()?.activeChallenge || ''} mode="history" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* HISTORY */}
                                            {showHistory && (
                                                <div className="mt-4 space-y-3">
                                                    {getTaskForModal()?.challengeHistory?.map((h, i) => (
                                                        <div key={i} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 relative group">
                                                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">История #{i+1}</div>
                                                            <div className="text-sm text-slate-600 dark:text-slate-400"><StaticChallengeRenderer content={h} mode="history" /></div>
                                                            <button onClick={() => deleteChallengeFromHistory(i)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                                        </div>
                                                    ))}
                                                    {getTaskForModal()?.consultationHistory?.map((h, i) => (
                                                        <div key={`c-${i}`} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 relative group">
                                                            <div className="text-xs font-bold text-violet-400 uppercase mb-1 flex items-center gap-1"><MessageCircle size={10} /> Консультация</div>
                                                            <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed"><ReactMarkdown components={markdownComponents}>{h}</ReactMarkdown></div>
                                                            <button onClick={() => deleteConsultation(i)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <button onClick={() => setShowHistory(!showHistory)} className="w-full mt-2 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                                <History size={12} /> {showHistory ? 'Скрыть историю' : 'Показать историю'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default Kanban;
