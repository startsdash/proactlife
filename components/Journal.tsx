
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, Task, AppConfig, MentorAnalysis } from '../types';
import { ICON_MAP, applyTypography, SPHERES } from '../constants';
import { analyzeJournalPath } from '../services/geminiService';
import { Book, Zap, Calendar, Trash2, ChevronDown, CheckCircle2, Circle, Link, Edit3, X, Check, ArrowDown, ArrowUp, Search, Filter, Eye, FileText, Plus, Minus, MessageCircle, History, Kanban, Bot, Loader2, Save, Scroll, XCircle, Send, Lightbulb, Target } from 'lucide-react';
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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-800 dark:text-slate-300 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed [&>p]:mb-0" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-base font-bold mt-3 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-sm font-bold mt-2 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h2>,
    h3: ({node, children, ...props}: any) => <h3 className="text-xs font-bold mt-2 mb-1 text-slate-900 dark:text-slate-100 uppercase tracking-wide" {...props}>{cleanHeader(children)}</h3>,
    h4: ({node, children, ...props}: any) => <h4 className="text-xs font-bold mt-2 mb-1 text-slate-800 dark:text-slate-200" {...props}>{cleanHeader(children)}</h4>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-indigo-200 dark:border-indigo-800 pl-4 py-1 my-2 text-sm text-slate-600 dark:text-slate-400 italic bg-indigo-50/30 dark:bg-indigo-900/20 rounded-r-lg" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900 dark:text-slate-100" {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-slate-800 dark:text-slate-200" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700" {...props}>{children}</code>
            : <code className="block bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, children, icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-3">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
           {icon}
           {title}
        </div>
        <div className="text-slate-400">
          {isOpen ? <Minus size={14} /> : <Plus size={14} />}
        </div>
      </button>
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
        className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all outline-none ${
          isOpen ? 'border-indigo-400 ring-2 ring-indigo-50 dark:ring-indigo-900 bg-white dark:bg-[#1e293b]' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <span className={`text-sm truncate ${selectedId ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-400'}`}>
          {selectedTask ? (
             <span className="flex items-center gap-2">
                {selectedTask.column === 'done' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-indigo-500" />}
                {selectedTask.content}
             </span>
          ) : (
            "Без привязки (Свободная мысль)"
          )}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => { onSelect(''); setIsOpen(false); }}
            className="w-full text-left px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 transition-colors"
          >
            Без привязки (Свободная мысль)
          </button>
          {tasks.length > 0 ? (
            tasks.map(t => (
              <button
                key={t.id}
                onClick={() => { onSelect(t.id); setIsOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-start gap-2 group"
              >
                 <div className="mt-0.5 shrink-0">
                    {t.column === 'done' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-indigo-500" />}
                 </div>
                 <span className="text-slate-700 dark:text-slate-300 group-hover:text-indigo-900 dark:group-hover:text-indigo-200 line-clamp-2">{t.content}</span>
              </button>
            ))
          ) : (
             <div className="px-4 py-3 text-xs text-slate-400 italic text-center">Нет активных задач</div>
          )}
        </div>
      )}
    </div>
  );
};

// --- REUSABLE SPHERE SELECTOR ---
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
                  isOpen ? 'border-indigo-400 ring-2 ring-indigo-50 dark:ring-indigo-900 bg-white dark:bg-[#1e293b]' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
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
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {selected.map(id => SPHERES.find(s => s.id === id)?.label).join(', ')}
                            </span>
                        </>
                    ) : (
                        <span className="text-sm text-slate-400">Выбери сферу</span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                                {Icon && <Icon size={14} className={isSelected ? s.text : 'text-slate-400'} />}
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
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1.5 rounded-lg transition-colors border border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-800"
            >
                {entry.spheres && entry.spheres.length > 0 ? (
                    <div className="flex -space-x-1">
                        {entry.spheres.map(s => {
                            const sp = SPHERES.find(x => x.id === s);
                            return sp ? <div key={s} className={`w-2 h-2 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`}></div> : null;
                        })}
                    </div>
                ) : (
                    <Target size={12} />
                )}
                <span>Сфера</span>
                <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
                                    {Icon && <Icon size={12} className={isSelected ? s.text : 'text-slate-400'} />}
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

const SphereBadgeList: React.FC<{ spheres: string[] }> = ({ spheres }) => {
    if (!spheres || spheres.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1 mt-2">
            {spheres.map(id => {
                const s = SPHERES.find(sp => sp.id === id);
                if (!s) return null;
                const Icon = ICON_MAP[s.icon];
                return (
                    <span key={id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${s.bg} ${s.text}`}>
                        {Icon && <Icon size={10} />}
                        {s.label}
                    </span>
                );
            })}
        </div>
    );
};

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask }) => {
  const [content, setContent] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [selectedSpheres, setSelectedSpheres] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
      if (initialTaskId) {
          setLinkedTaskId(initialTaskId);
      }
  }, [initialTaskId]);

  const filteredEntries = useMemo(() => {
    let result = entries;

    if (initialTaskId) {
        // If filtering by specific task (Context Mode)
        // We can show only related entries? 
        // Or just highlight? For now let's filter to focus.
        // But the user might want to see all entries.
        // Let's implement a specific filter toggle if needed, but here let's assume
        // if initialTaskId is set (via navigation), we prioritize showing linked entries at top or filtering.
        // Simple filter for now:
        // result = result.filter(e => e.linkedTaskId === initialTaskId);
        // Better: Don't filter strictly unless requested. initialTaskId is mainly for New Entry pre-fill.
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.content.toLowerCase().includes(q));
    }

    return result.sort((a, b) => {
      return sortOrder === 'desc' ? b.date - a.date : a.date - b.date;
    });
  }, [entries, initialTaskId, searchQuery, sortOrder]);

  const handleAddEntry = () => {
      if (!content.trim()) return;
      const newEntry: JournalEntry = {
          id: Date.now().toString(),
          date: Date.now(),
          content: applyTypography(content),
          linkedTaskId: linkedTaskId || undefined,
          spheres: selectedSpheres,
          isInsight: false
      };
      addEntry(newEntry);
      setContent('');
      setLinkedTaskId('');
      setSelectedSpheres([]);
      if (initialTaskId) onClearInitialTask?.();
  };

  const handleAnalyze = async () => {
      if (entries.length === 0) return;
      setIsAnalyzing(true);
      try {
          const feedback = await analyzeJournalPath(entries, config);
          if (feedback) {
              addMentorAnalysis({
                  id: Date.now().toString(),
                  date: Date.now(),
                  content: feedback,
                  mentorName: "AI Mentor"
              });
              setShowAnalysis(true);
          }
      } catch (e) {
          console.error(e);
      }
      setIsAnalyzing(false);
  };

  const handleUpdateEntry = (entry: JournalEntry) => {
      updateEntry(entry);
      setEditingId(null);
  };

  const toggleInsight = (entry: JournalEntry) => {
      updateEntry({ ...entry, isInsight: !entry.isInsight });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
        {/* HEADER */}
        <header className="p-4 md:p-8 pb-0 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#f8fafc] dark:bg-[#0f172a] z-10">
            <div>
                <h1 className="text-3xl font-light tracking-tight text-slate-900 dark:text-white">Дневник</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Хроники Пути</p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative group flex-1 md:flex-none">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Поиск записей..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full md:w-64 pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14}/></button>
                    )}
                </div>
                
                <Tooltip content={sortOrder === 'asc' ? "Сначала старые" : "Сначала новые"}>
                    <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className="p-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 shadow-sm">
                        {sortOrder === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                    </button>
                </Tooltip>

                <Tooltip content="Анализ ИИ">
                    <button 
                        onClick={() => setShowAnalysis(!showAnalysis)} 
                        className={`p-2 rounded-xl border transition-all shadow-sm ${showAnalysis ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}
                    >
                        <Bot size={18} />
                    </button>
                </Tooltip>
            </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 md:p-8 gap-6">
            
            {/* LEFT: ENTRIES LIST */}
            <div className={`flex-1 flex flex-col min-h-0 ${showAnalysis ? 'hidden md:flex' : 'flex'}`}>
                
                {/* NEW ENTRY INPUT */}
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 mb-6 shrink-0 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-300">
                    {initialTaskId && (
                        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg mb-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                <Link size={12} />
                                <span className="truncate max-w-[200px]">Контекст: {tasks.find(t => t.id === initialTaskId)?.content || 'Задача'}</span>
                            </div>
                            <button onClick={onClearInitialTask} className="text-indigo-400 hover:text-indigo-600"><X size={14} /></button>
                        </div>
                    )}
                    
                    <textarea 
                        className="w-full h-24 md:h-32 bg-transparent outline-none text-base text-slate-700 dark:text-slate-200 placeholder:text-slate-400 resize-none leading-relaxed"
                        placeholder="О чем сегодня стоит помнить?..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                    
                    <div className="flex flex-col md:flex-row gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <TaskSelect tasks={tasks} selectedId={linkedTaskId} onSelect={setLinkedTaskId} />
                            <SphereSelector selected={selectedSpheres} onChange={setSelectedSpheres} />
                        </div>
                        <button 
                            onClick={handleAddEntry}
                            disabled={!content.trim()}
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 font-medium text-sm transition-colors disabled:opacity-50 shadow-lg shadow-slate-200 dark:shadow-none h-[42px]"
                        >
                            <Send size={16} /> <span className="hidden md:inline">Записать</span>
                        </button>
                    </div>
                </div>

                {/* ENTRIES FEED */}
                <div className="flex-1 overflow-y-auto custom-scrollbar-light space-y-4 pr-1">
                    {filteredEntries.length === 0 ? (
                        <div className="py-10">
                            <EmptyState 
                                icon={Book} 
                                title="Дневник пуст" 
                                description={searchQuery ? "Ничего не найдено" : "Начни писать свою историю. Каждая запись приближает к осознанности."} 
                                color="cyan"
                            />
                        </div>
                    ) : (
                        filteredEntries.map(entry => {
                            const linkedTask = tasks.find(t => t.id === entry.linkedTaskId);
                            
                            if (editingId === entry.id) {
                                return (
                                    <div key={entry.id} className="bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-md">
                                        <textarea 
                                            className="w-full h-32 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl text-sm outline-none border border-slate-200 dark:border-slate-700 focus:border-indigo-300 resize-none"
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                        />
                                        <div className="flex justify-end gap-2 mt-3">
                                            <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Отмена</button>
                                            <button onClick={() => handleUpdateEntry({ ...entry, content: editContent })} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Сохранить</button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={entry.id} className={`group bg-white dark:bg-[#1e293b] p-5 rounded-2xl border transition-all hover:shadow-md relative ${entry.isInsight ? 'border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
                                    
                                    {/* Date & Actions Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            <Calendar size={12} />
                                            {new Date(entry.date).toLocaleDateString()} 
                                            <span className="opacity-50 font-normal normal-case ml-1">{new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip content={entry.isInsight ? "Убрать из инсайтов" : "Отметить как инсайт"}>
                                                <button onClick={() => toggleInsight(entry)} className={`p-1.5 rounded-lg transition-colors ${entry.isInsight ? 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' : 'text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}>
                                                    <Lightbulb size={16} fill={entry.isInsight ? "currentColor" : "none"} />
                                                </button>
                                            </Tooltip>
                                            <button onClick={() => { setEditingId(entry.id); setEditContent(entry.content); }} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit3 size={16} /></button>
                                            <button onClick={() => { if(confirm("Удалить запись?")) deleteEntry(entry.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap mb-3">
                                        <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                                    </div>

                                    {/* Footer: Tags & Link */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                                        <div className="flex items-center gap-2">
                                            {entry.spheres && <SphereBadgeList spheres={entry.spheres} />}
                                            {entry.mood && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                    {/* We can map mood number back to label/emoji if needed, currently just showing value or simple icon */}
                                                    <Target size={10} /> Mood: {entry.mood}/5
                                                </span>
                                            )}
                                        </div>

                                        {linkedTask && (
                                            <div 
                                                onClick={() => { setViewingTask(linkedTask); if(onNavigateToTask) onNavigateToTask(linkedTask.id); }}
                                                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors max-w-[200px] truncate"
                                            >
                                                <Link size={12} />
                                                <span className="truncate">{linkedTask.content}</span>
                                            </div>
                                        )}
                                        
                                        <div className="md:hidden relative">
                                            <JournalEntrySphereSelector entry={entry} updateEntry={updateEntry} align="left" direction="up" />
                                        </div>
                                    </div>
                                    
                                    {/* Desktop Hover Sphere Selector */}
                                    <div className="absolute top-4 right-20 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
                                         <JournalEntrySphereSelector entry={entry} updateEntry={updateEntry} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* RIGHT: AI ANALYSIS & MENTORSHIP */}
            <div className={`w-full md:w-1/3 flex-col border-l border-slate-200 dark:border-slate-800 pl-6 bg-[#f8fafc] dark:bg-[#0f172a] ${showAnalysis ? 'flex' : 'hidden md:flex'}`}>
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Bot size={20} className="text-indigo-500" />
                        AI Ментор
                    </h3>
                    <button onClick={handleAnalyze} disabled={isAnalyzing || entries.length < 3} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50 flex items-center gap-2">
                        {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        {isAnalyzing ? 'Анализ...' : 'Анализ пути'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-light space-y-4 pb-20">
                    {mentorAnalyses.length === 0 ? (
                        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-6 text-center">
                            <MessageCircle size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Здесь появятся инсайты от ИИ-ментора.</p>
                            <p className="text-xs text-slate-400">Напиши хотя бы 3 записи, чтобы получить анализ.</p>
                        </div>
                    ) : (
                        mentorAnalyses.sort((a, b) => b.date - a.date).map(analysis => (
                            <div key={analysis.id} className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group">
                                <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-50 dark:border-slate-700">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <Bot size={14} />
                                        </div>
                                        <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{analysis.mentorName || 'Mentor'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">{new Date(analysis.date).toLocaleDateString()}</span>
                                        <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    <ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* VIEW TASK MODAL */}
        {viewingTask && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingTask(null)}>
                <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <Kanban size={20} className="text-indigo-500" />
                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Контекст задачи</h3>
                        </div>
                        <button onClick={() => setViewingTask(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 mb-4">
                        <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                            <ReactMarkdown components={markdownComponents}>{viewingTask.content}</ReactMarkdown>
                        </div>
                    </div>
                    {viewingTask.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div className="font-bold mb-1 uppercase tracking-wider text-[10px]">Описание</div>
                            <ReactMarkdown components={markdownComponents}>{viewingTask.description}</ReactMarkdown>
                        </div>
                    )}
                    <div className="mt-6 flex justify-end">
                        <button 
                            onClick={() => {
                                if(onNavigateToTask) onNavigateToTask(viewingTask.id);
                                setViewingTask(null);
                            }}
                            className="px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-2"
                        >
                            Перейти к задаче <ArrowUp size={16} className="rotate-45" />
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Journal;
