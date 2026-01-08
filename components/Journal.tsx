
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { ICON_MAP, applyTypography, SPHERES } from '../constants';
import { analyzeJournalPath } from '../services/geminiService';
import { Book, Zap, Calendar, Trash2, ChevronDown, CheckCircle2, Circle, Link, Edit3, X, Check, ArrowDown, ArrowUp, Search, Filter, Eye, FileText, Plus, Minus, MessageCircle, History, Kanban, Loader2, Save, Send, Target, Sparkle, Sparkles, Star, XCircle, Gem } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import UniversalEditor from './UniversalEditor';

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
                        <span>{sp.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

const Journal: React.FC<Props> = ({ 
  entries, mentorAnalyses, tasks, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask 
}) => {
  const [content, setContent] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle initial task context
  useEffect(() => {
    if (initialTaskId) {
        setLinkedTaskId(initialTaskId);
    }
  }, [initialTaskId]);

  const handleSave = () => {
      if (!content.trim()) return;
      
      const newEntry: JournalEntry = {
          id: Date.now().toString(),
          date: Date.now(),
          content,
          linkedTaskId: linkedTaskId || undefined,
          spheres: selectedSpheres,
          isInsight: false
      };
      
      addEntry(newEntry);
      setContent('');
      setLinkedTaskId('');
      setSelectedSpheres([]);
      if (onClearInitialTask) onClearInitialTask();
  };

  const handleAnalyze = async () => {
      setIsAnalyzing(true);
      try {
          const result = await analyzeJournalPath(entries, config);
          setAnalysisResult(result);
          setShowAnalysis(true);
          
          // Save analysis record
          addMentorAnalysis({
              id: Date.now().toString(),
              date: Date.now(),
              content: result,
              mentorName: 'AI Mentor' // Default or derived from config
          });
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const sortedEntries = [...entries].sort((a, b) => b.date - a.date).filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()));

  // Group by Date
  const groupedEntries = useMemo(() => {
      const groups: Record<string, JournalEntry[]> = {};
      sortedEntries.forEach(e => {
          const dateKey = new Date(e.date).toLocaleDateString();
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(e);
      });
      return groups;
  }, [sortedEntries]);

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-8 pb-24">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <header className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Дневник</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хроника пути</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleAnalyze} 
                            disabled={isAnalyzing || entries.length < 5}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
                        >
                            {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            {isAnalyzing ? 'Анализ...' : 'Анализ Пути'}
                        </button>
                    </div>
                </header>

                {/* Input Area */}
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-8 relative z-20">
                    <UniversalEditor 
                        initialContent={content} 
                        onChange={setContent} 
                        placeholder="О чем ты думаешь?..." 
                        minHeight="120px"
                        className="mb-4"
                    />
                    
                    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
                        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                            <div className="w-full md:w-48">
                                <TaskSelect tasks={tasks} selectedId={linkedTaskId} onSelect={setLinkedTaskId} />
                            </div>
                            <div className="w-full md:w-auto">
                                <SphereSelector selected={selectedSpheres} onChange={setSelectedSpheres} />
                            </div>
                        </div>
                        <button 
                            onClick={handleSave} 
                            disabled={!content.trim()}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 w-full md:w-auto"
                        >
                            <Send size={14} /> Сохранить
                        </button>
                    </div>
                </div>

                {/* Entries List */}
                <div className="space-y-8">
                    {Object.entries(groupedEntries).map(([date, group]) => (
                        <div key={date}>
                            <div className="flex items-center gap-4 mb-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{date}</h3>
                                <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
                            </div>
                            <div className="space-y-4">
                                {group.map(entry => (
                                    <div key={entry.id} className="group relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors pb-1">
                                        <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
                                        
                                        <div className="mb-2">
                                            <div className="text-slate-800 dark:text-slate-200 font-serif text-base leading-relaxed">
                                                <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                            {entry.linkedTaskId && (() => {
                                                const task = tasks.find(t => t.id === entry.linkedTaskId);
                                                return task ? (
                                                    <button 
                                                        onClick={() => onNavigateToTask && onNavigateToTask(task.id)}
                                                        className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800/50 rounded-md text-[10px] text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                                                    >
                                                        <Kanban size={10} />
                                                        <span className="truncate max-w-[150px]">{task.content}</span>
                                                    </button>
                                                ) : null;
                                            })()}

                                            {entry.spheres && entry.spheres.length > 0 && (
                                                <SphereBadgeList spheres={entry.spheres} />
                                            )}
                                            
                                            {entry.mood && (
                                                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 dark:bg-slate-800/30 px-2 py-1 rounded">
                                                    Mood: {entry.mood}/5
                                                </div>
                                            )}
                                        </div>

                                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            <button 
                                                onClick={() => updateEntry({...entry, isInsight: !entry.isInsight})}
                                                className={`p-1.5 rounded-lg transition-colors ${entry.isInsight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-300 hover:text-amber-500'}`}
                                            >
                                                <Gem size={14} />
                                            </button>
                                            <button 
                                                onClick={() => { if(confirm("Удалить запись?")) deleteEntry(entry.id); }}
                                                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {entries.length === 0 && (
                        <div className="py-12">
                            <EmptyState icon={Book} title="Дневник пуст" description="Запиши первую мысль, чтобы начать историю." color="cyan" />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* ANALYSIS MODAL */}
        <AnimatePresence>
            {showAnalysis && analysisResult && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-xl flex flex-col p-6 md:p-12 overflow-y-auto"
                >
                    <button onClick={() => setShowAnalysis(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={24} className="text-slate-500" />
                    </button>
                    
                    <div className="max-w-3xl mx-auto w-full">
                        <div className="flex items-center gap-4 mb-12 justify-center">
                            <div className="h-px bg-indigo-200 dark:bg-indigo-900 w-16" />
                            <h2 className="text-xs font-bold text-indigo-500 uppercase tracking-[0.3em]">Analysis Protocol</h2>
                            <div className="h-px bg-indigo-200 dark:bg-indigo-900 w-16" />
                        </div>
                        
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            <ReactMarkdown components={HologramMarkdown}>{analysisResult}</ReactMarkdown>
                        </div>

                        <div className="mt-20 text-center">
                            <button onClick={() => setShowAnalysis(false)} className="text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                [ CLOSE_REPORT ]
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Journal;
