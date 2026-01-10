
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import Masonry from 'react-masonry-css';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { ICON_MAP, applyTypography, SPHERES } from '../constants';
import { analyzeJournalPath } from '../services/geminiService';
import { Book, Zap, Calendar, Trash2, ChevronDown, CheckCircle2, Circle, Link, Edit3, X, Check, ArrowDown, ArrowUp, Search, Filter, Eye, FileText, Plus, Minus, MessageCircle, History, Kanban, Loader2, Save, Send, Target, Sparkle, Sparkles, Star, XCircle, Gem, PenTool } from 'lucide-react';
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

const breakpointColumnsObj = {
  default: 3,
  1600: 3,
  1100: 2,
  700: 1
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

// --- LITERARY TYPOGRAPHY COMPONENTS (DEFAULT) ---
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-3 last:mb-0 text-base text-[#2F3437] dark:text-slate-300 leading-relaxed font-serif" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2 decoration-1" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-3 space-y-1 text-sm text-[#2F3437] dark:text-slate-300 font-serif" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-sm text-[#2F3437] dark:text-slate-300 font-serif" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-lg font-bold mt-4 mb-2 text-[#2F3437] dark:text-slate-100 font-sans tracking-tight" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-base font-bold mt-3 mb-2 text-[#2F3437] dark:text-slate-100 font-sans tracking-tight" {...props}>{cleanHeader(children)}</h2>,
    h3: ({node, children, ...props}: any) => <h3 className="text-sm font-bold mt-3 mb-1 text-slate-500 dark:text-slate-400 uppercase tracking-widest font-sans" {...props}>{cleanHeader(children)}</h3>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 py-1 my-3 text-sm text-slate-500 italic font-serif" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase tracking-wide" {...props}>{children}</code>
            : <code className="block bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 p-3 rounded-lg text-xs font-mono my-3 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
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
    
    const toggleSphere = (sphereId: string) => {
        const current = entry.spheres || [];
        const newSpheres = current.includes(sphereId) 
            ? current.filter(s => s !== sphereId)
            : [...current, sphereId];
        updateEntry({ ...entry, spheres: newSpheres });
    };

    return (
        <div className="relative">
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent px-2 py-1 rounded transition-colors uppercase tracking-widest"
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
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
                    <div 
                        className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} ${align === 'left' ? 'left-0' : 'right-0'} w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5`} 
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
                    </div>
                </>
            )}
        </div>
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
  const [content, setContent] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<{from: string, to: string}>({from: '', to: ''});
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
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
        setIsCreationExpanded(true); // Open creation if context passed
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
        if (creationRef.current && !creationRef.current.contains(event.target as Node)) {
            // Only close if no content and no context selected
            if (!content.trim() && !linkedTaskId && selectedSpheres.length === 0) {
                setIsCreationExpanded(false);
            }
        }
    };
    if (isCreationExpanded) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCreationExpanded, content, linkedTaskId, selectedSpheres]);

  const availableTasks = tasks.filter(t => !t.isArchived && (t.column === 'doing' || t.column === 'done') || t.id === linkedTaskId);

  const handlePost = () => {
    if (!content.trim()) return;
    const formattedContent = applyTypography(content);
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: Date.now(),
      content: formattedContent,
      linkedTaskId: linkedTaskId || undefined,
      spheres: selectedSpheres
    };
    addEntry(newEntry);
    setContent('');
    setLinkedTaskId('');
    setSelectedSpheres([]);
    setIsCreationExpanded(false);
  };

  const startEditing = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  };

  const saveEdit = (entry: JournalEntry) => {
    if (editContent.trim()) {
        const formattedContent = applyTypography(editContent);
        updateEntry({ ...entry, content: formattedContent });
        setEditingId(null);
        setEditContent('');
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  const toggleInsight = (entry: JournalEntry) => {
      updateEntry({ ...entry, isInsight: !entry.isInsight });
  };

  const handleCloseModal = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setSelectedEntryId(null);
      // Clear edit mode state to prevent persistence
      setEditingId(null);
      setEditContent('');
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
    return new Date(timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }).toUpperCase().replace('.', '');
  };

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
            className="flex-1 flex flex-col relative overflow-y-auto custom-scrollbar-light"
            ref={scrollContainerRef}
        >
             {/* Sticky Search/Toolbar */}
             <motion.div 
                className="sticky top-0 z-40 w-full mb-6 pt-2"
                animate={{ y: isHeaderHidden ? '-100%' : '0%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
             >
                 {/* FOG LAYER */}
                 <div className="absolute inset-0 h-[160%] pointer-events-none -z-10 -mx-8">
                    <div 
                        className="absolute inset-0 backdrop-blur-xl bg-[#f8fafc]/90 dark:bg-[#0f172a]/90"
                        style={{
                            maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)'
                        }}
                    />
                </div>
                
                <div className="relative z-10 w-full px-4 md:px-8 pb-2">
                     <div className="flex justify-between items-center mb-2">
                        {/* Tools (Right aligned) */}
                        <div className="flex items-center gap-2 ml-auto">
                            {hasMentorTool && (
                                <>
                                    <Tooltip content={isAnalyzing ? "Остановить генерацию" : "Наставник (ИИ)"} side="bottom" disabled={isAnalyzing}>
                                        <button 
                                            onClick={handleAnalyzePath} 
                                            disabled={displayedEntries.length === 0} 
                                            className={`flex items-center justify-center p-2 rounded-lg border transition-all shadow-sm ${
                                                'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                                            } ${isAnalyzing ? 'animate-pulse' : ''}`}
                                        >
                                            {isAnalyzing ? (
                                                <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                                                    <Loader2 size={14} className="animate-spin absolute inset-0" />
                                                    <div className="w-1.5 h-1.5 bg-current rounded-[1px] relative z-10" />
                                                </div>
                                            ) : (
                                                <Sparkles size={16} strokeWidth={1} />
                                            )}
                                        </button>
                                    </Tooltip>

                                    <Tooltip content="История диалогов" side="left">
                                        <button onClick={() => setShowHistory(true)} className="px-3 py-2 rounded-lg border transition-all flex items-center justify-center gap-2 bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm">
                                            <History size={16} strokeWidth={1} />
                                            <span className="text-xs font-medium hidden sm:inline">История</span>
                                        </button>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <div className="relative flex-1 group">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" strokeWidth={1} />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Поиск по записям..."
                                className="w-full pl-9 pr-8 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-transparent focus:border-slate-200 dark:focus:border-slate-700 rounded-xl text-sm focus:outline-none focus:bg-white dark:focus:bg-slate-800 transition-all font-serif placeholder:font-sans shadow-sm"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>
                            )}
                        </div>
                        
                        <div className="relative" ref={datePickerRef}>
                            <Tooltip content="Фильтр по дате">
                                <button 
                                    onClick={() => setShowDatePicker(!showDatePicker)}
                                    className={`p-2 rounded-xl border transition-all h-full flex items-center justify-center aspect-square ${hasActiveDateFilter || showDatePicker ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white/80 dark:bg-[#1e293b]/80 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
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
                                className="p-2 rounded-xl border transition-all h-full flex items-center justify-center aspect-square bg-white/80 dark:bg-[#1e293b]/80 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm"
                            >
                                {sortOrder === 'desc' ? <ArrowDown size={18} strokeWidth={1} /> : <ArrowUp size={18} strokeWidth={1} />}
                            </button>
                        </Tooltip>
                    </div>
                </div>
             </motion.div>

             <div className="w-full px-4 md:px-8 pb-20">
                {/* CREATION BLOCK (COLLAPSIBLE) */}
                <div className="max-w-3xl mx-auto w-full mb-10 z-30 relative" ref={creationRef}>
                    {!isCreationExpanded ? (
                        <div 
                            onClick={() => setIsCreationExpanded(true)}
                            className="bg-white/60 dark:bg-[#1e293b]/60 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/5 shadow-sm p-4 cursor-text flex items-center justify-between group hover:shadow-md transition-all"
                        >
                            <span className="text-slate-400 dark:text-slate-500 font-serif italic text-base pl-2">Записать мысль...</span>
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 group-hover:text-indigo-500 transition-colors">
                                <PenTool size={18} />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl rounded-2xl border border-white/40 dark:border-white/5 shadow-lg p-5 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 relative">
                            {/* Expanded Form */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <textarea 
                                    className="w-full h-40 md:h-56 resize-none outline-none text-base text-slate-800 dark:text-slate-200 bg-transparent p-1 placeholder:text-slate-400/50 dark:placeholder:text-slate-500/50 font-serif leading-relaxed" 
                                    placeholder="О чем ты думаешь? Чему научило это событие? (Markdown поддерживается)" 
                                    value={content} 
                                    onChange={(e) => setContent(e.target.value)} 
                                    autoFocus
                                />
                                <div className="absolute bottom-0 left-0 w-full h-px bg-slate-200/50 dark:bg-slate-700/50" />
                            </div>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={handlePost} 
                                    disabled={!content.trim()} 
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
                    <Masonry
                        breakpointCols={breakpointColumnsObj}
                        className="my-masonry-grid"
                        columnClassName="my-masonry-grid_column"
                    >
                        {displayedEntries.map(entry => {
                        const mentor = config.mentors.find(m => m.id === entry.mentorId);
                        const isEditing = editingId === entry.id;
                        const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
                        
                        const primarySphereId = entry.spheres?.[0];
                        const sphereConfig = SPHERES.find(s => s.id === primarySphereId);
                        const nodeColorClass = sphereConfig 
                            ? sphereConfig.text.replace('text-', 'border-') 
                            : 'border-slate-300 dark:border-slate-600';

                        return (
                            <div 
                                key={entry.id} 
                                onClick={() => setSelectedEntryId(entry.id)} 
                                className={`relative p-6 rounded-2xl border transition-all duration-300 group cursor-pointer mb-6 break-inside-avoid
                                    ${entry.isInsight 
                                        ? 'bg-gradient-to-br from-violet-50/80 via-fuchsia-50/50 to-white dark:from-violet-900/20 dark:via-fuchsia-900/10 dark:to-[#1e293b] border-violet-200/50 dark:border-violet-800/30 shadow-sm' 
                                        : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                                    }
                                `}
                            >
                                {/* CARD HEADER */}
                                <div className="flex justify-between items-center mb-4">
                                    <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 tracking-widest uppercase flex items-center gap-2">
                                        <span>{formatDate(entry.date)}</span>
                                    </div>

                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        {!isEditing && (
                                            <button 
                                                onClick={() => toggleInsight(entry)} 
                                                className={`p-1.5 rounded-lg transition-all ${
                                                    entry.isInsight 
                                                    ? "text-violet-600 dark:text-violet-300 bg-gradient-to-tr from-violet-100 via-fuchsia-50 to-cyan-50 dark:from-violet-900/30 dark:via-fuchsia-900/20 dark:to-cyan-900/20 shadow-[0_0_12px_rgba(139,92,246,0.3)]" 
                                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                }`}
                                            >
                                                <Gem 
                                                    size={16} 
                                                    strokeWidth={1.5} 
                                                    className={entry.isInsight ? "fill-violet-200/50" : "fill-transparent"} 
                                                />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isEditing ? (
                                    <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                                        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 resize-none font-mono" placeholder="Markdown..." />
                                        <div className="flex flex-col-reverse md:flex-row justify-end gap-2 mt-2">
                                            <button onClick={cancelEditing} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center justify-center gap-1 w-full md:w-auto"><X size={12} /> Отмена</button>
                                            <button onClick={() => saveEdit(entry)} className="px-3 py-1.5 text-xs font-medium bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-700 rounded flex items-center justify-center gap-1 w-full md:w-auto"><Check size={12} /> Сохранить</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="font-serif text-[#2F3437] dark:text-slate-300 leading-relaxed text-base">
                                        <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                    </div>
                                )}

                                {/* Context Link */}
                                {linkedTask && !isEditing && (
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onNavigateToTask?.(linkedTask.id); }}
                                            className="font-mono text-[10px] text-[#6B6E70] dark:text-slate-500 hover:text-indigo-500 transition-colors flex items-center gap-2 group/ctx w-full"
                                        >
                                            <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                                                [ CONTEXT: <span className="truncate max-w-[200px] inline-block align-bottom">{linkedTask.content}</span> ]
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
                            </div>
                        );
                        })}
                    </Masonry>
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
        <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCloseModal}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-lg bg-white/75 dark:bg-[#1e293b]/75 backdrop-blur-[35px] saturate-150 border border-black/5 dark:border-white/10 rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] p-8 md:p-10 flex flex-col max-h-[90vh] relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* AETHER HEADER */}
                <div className="flex justify-between items-center mb-8 shrink-0">
                    <div className="font-mono text-[10px] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        {formatDate(selectedEntry.date)}
                    </div>
                    <div className="flex items-center gap-4">
                        <JournalEntrySphereSelector entry={selectedEntry} updateEntry={updateEntry} align="right" direction="down" />
                        <button onClick={handleCloseModal} className="text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 transition-colors">
                            <X size={20} strokeWidth={1} />
                        </button>
                    </div>
                </div>

                {/* AETHER BODY */}
                <div className="flex-1 overflow-y-auto custom-scrollbar-ghost pr-2 -mr-2">
                    {editingId === selectedEntry.id ? (
                      <div className="mb-4">
                          <textarea 
                            value={editContent} 
                            onChange={(e) => setEditContent(e.target.value)} 
                            className="w-full h-40 p-0 bg-transparent border-none text-[1.1rem] leading-[1.8] font-serif text-[#2F3437] dark:text-slate-200 outline-none resize-none placeholder:text-slate-300" 
                            placeholder="Напиши что-нибудь..." 
                            autoFocus
                          />
                          <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-black/5 dark:border-white/5">
                              <button onClick={cancelEditing} className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Отмена</button>
                              <button onClick={() => saveEdit(selectedEntry)} className="font-mono text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors">Сохранить</button>
                          </div>
                      </div>
                    ) : (
                      <div className="font-serif text-[1.1rem] leading-[1.8] text-[#2F3437] dark:text-slate-200">
                          <ReactMarkdown components={markdownComponents}>{selectedEntry.content}</ReactMarkdown>
                      </div>
                    )}

                    {selectedEntry.aiFeedback && (
                        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5">
                             <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={12} className="text-indigo-400" />
                                <span className="font-mono text-[9px] uppercase tracking-widest text-slate-400">Ментор</span>
                             </div>
                             <div className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed font-serif">
                                <ReactMarkdown components={markdownComponents}>{selectedEntry.aiFeedback}</ReactMarkdown>
                             </div>
                        </div>
                    )}
                </div>

                {/* AETHER FOOTER */}
                <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col gap-4 shrink-0">
                    {selectedLinkedTask && editingId !== selectedEntry.id && (
                        <div className="font-mono text-[10px] text-slate-400 flex items-center gap-2 group/ctx">
                            <span className="opacity-50">[ CONTEXT: </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onNavigateToTask?.(selectedLinkedTask.id); }}
                                className="hover:text-indigo-500 underline decoration-dotted underline-offset-4 truncate max-w-[200px] transition-colors"
                            >
                                {selectedLinkedTask.content}
                            </button>
                            <span className="opacity-50"> ]</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        {!editingId && (
                            <button 
                                onClick={() => toggleInsight(selectedEntry)} 
                                className={`font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 ${selectedEntry.isInsight ? 'text-violet-500' : 'text-slate-300 hover:text-slate-500'}`}
                            >
                                <Gem size={12} className={selectedEntry.isInsight ? "fill-current" : ""} />
                                {selectedEntry.isInsight ? "Insight" : "Mark Insight"}
                            </button>
                        )}
                        
                        {!editingId && (
                            <div className="flex gap-6">
                                <button onClick={() => startEditing(selectedEntry)} className="font-mono text-[10px] uppercase tracking-widest text-slate-300 hover:text-indigo-500 transition-colors">Edit</button>
                                <button onClick={() => { if(confirm("Удалить запись?")) { deleteEntry(selectedEntry.id); handleCloseModal(); } }} className="font-mono text-[10px] uppercase tracking-widest text-slate-300 hover:text-red-500 transition-colors">Delete</button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
      )}

      {viewingTask && (
        <div className="fixed inset-0 z-[110] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingTask(null)}>
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">Контекст мысли</h3><button onClick={() => setViewingTask(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} strokeWidth={1} /></button></div>
                <div className="space-y-4">
                    <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
                        <div className="flex justify-between items-center mb-3"><span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${viewingTask.column === 'done' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'}`}>{viewingTask.column === 'done' ? <CheckCircle2 size={12} strokeWidth={1} /> : <Circle size={12} strokeWidth={1} />}{viewingTask.column === 'done' ? 'Сделано' : 'В процессе'}{viewingTask.isArchived && " (В архиве)"}</span></div>
                        <div className="text-sm text-slate-800 dark:text-slate-200 font-normal leading-relaxed"><ReactMarkdown components={markdownComponents}>{viewingTask.content}</ReactMarkdown></div>
                        {viewingTask.spheres && viewingTask.spheres.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Сферы</label>
                                <SphereBadgeList spheres={viewingTask.spheres} />
                            </div>
                        )}
                    </div>
                    {viewingTask.description && (<CollapsibleSection title="Источник" icon={<FileText size={14}/>}><div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"><ReactMarkdown components={markdownComponents}>{viewingTask.description}</ReactMarkdown></div></CollapsibleSection>)}
                    {viewingTask.activeChallenge && (
                      <CollapsibleSection title={viewingTask.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"} icon={<Zap size={14}/>}>
                         <div className={`p-3 rounded-lg border ${viewingTask.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${viewingTask.isChallengeCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{viewingTask.isChallengeCompleted ? 'Статус: Выполнен' : 'Статус: Активен'}</span>
                            <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200"><StaticChallengeRenderer content={viewingTask.activeChallenge} mode={viewingTask.isChallengeCompleted ? 'history' : 'draft'} /></div>
                         </div>
                      </CollapsibleSection>
                    )}
                     {viewingTask.challengeHistory && viewingTask.challengeHistory.length > 0 && (
                        <CollapsibleSection title="История Челленджей" icon={<History size={14}/>}>
                            <div className="space-y-4">
                                {viewingTask.challengeHistory.map((challenge, index) => (
                                   <div key={index} className="py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                      <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                                         <StaticChallengeRenderer content={challenge} mode="history" />
                                      </div>
                                   </div>
                                ))}
                             </div>
                        </CollapsibleSection>
                     )}
                    {viewingTask.consultationHistory && viewingTask.consultationHistory.length > 0 && (
                       <CollapsibleSection title="История консультаций" icon={<MessageCircle size={14}/>}><ul className="space-y-4">{viewingTask.consultationHistory.map((consultation, index) => (<li key={index} className="text-sm text-slate-900 dark:text-slate-200 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0"><ReactMarkdown components={markdownComponents}>{consultation}</ReactMarkdown></li>))}</ul></CollapsibleSection>
                    )}
                </div>
                <div className="mt-8 flex justify-end"><button onClick={() => setViewingTask(null)} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 font-medium text-sm">Закрыть</button></div>
            </div>
        </div>
      )}
    </div>
  );
};
export default Journal;
