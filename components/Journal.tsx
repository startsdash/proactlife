
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
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
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
    const toggleSphere = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter(s => s !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    return (
        <div className="flex gap-2">
            {SPHERES.map(s => {
                const isSelected = selected.includes(s.id);
                const Icon = ICON_MAP[s.icon];
                return (
                    <button
                        key={s.id}
                        onClick={() => toggleSphere(s.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border ${
                            isSelected 
                            ? `${s.bg} ${s.text} ${s.border}` 
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {Icon && <Icon size={12} />}
                        {s.label}
                    </button>
                );
            })}
        </div>
    );
};

const JournalEntrySphereSelector: React.FC<{ entry: JournalEntry, updateEntry: (e: JournalEntry) => void }> = ({ entry, updateEntry }) => {
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
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
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
                        <Icon size={16} />
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

  const hasMentorTool = useMemo(() => {
      const tool = config.aiTools.find(t => t.id === 'journal_mentor');
      return tool && !tool.isDisabled;
  }, [config.aiTools]);

  useEffect(() => {
    if (initialTaskId) {
      const taskExists = tasks.some(t => t.id === initialTaskId);
      if (taskExists) {
        setLinkedTaskId(initialTaskId);
        onClearInitialTask?.();
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

  const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
    const Icon = ICON_MAP[name] || ICON_MAP['User'];
    return <Icon className={className} size={14} />;
  };

  const getTaskPreview = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    return (
      <div 
        onClick={() => setViewingTask(task)}
        className={`mt-2 mb-3 p-3 rounded-lg border text-xs flex items-center gap-3 cursor-pointer transition-all hover:shadow-md group ${task.column === 'done' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-800 dark:text-indigo-400'}`}
      >
         <div className="shrink-0">
            {task.column === 'done' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
         </div>
         <div className="flex-1 min-w-0">
            <div className="font-bold uppercase tracking-wider mb-0.5 opacity-70 text-[10px]">
               {task.column === 'done' ? 'Сделано' : 'В процессе'}
               {task.isArchived && " (В архиве)"}
            </div>
            <p className="truncate font-medium text-slate-800 dark:text-slate-200">{task.content}</p>
         </div>
         <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
             <Eye size={16} className="text-current opacity-50" />
         </div>
      </div>
    );
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
      if (displayedEntries.length === 0) {
          alert("Нет записей для анализа в текущем фильтре.");
          return;
      }
      setIsAnalyzing(true);
      const result = await analyzeJournalPath(displayedEntries, config);
      setAnalysisResult(result);
      setIsAnalyzing(false);
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

  return (
    <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a] custom-scrollbar-light">
      <div className="w-full md:w-1/3 flex flex-col p-4 md:p-8 md:border-r border-b md:border-b-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] md:bg-transparent shrink-0">
        <header className="mb-4 md:mb-6">
          <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200 tracking-tight">
            Дневник
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Факты, эмоции, гипотезы</p>
        </header>
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl md:shadow-sm md:border border-slate-200 dark:border-slate-700 md:p-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 pl-1">
              <Link size={12} /> Контекст (Задача)
            </label>
            <TaskSelect tasks={availableTasks} selectedId={linkedTaskId} onSelect={setLinkedTaskId} />
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 pl-1">
               <Zap size={12} /> Сферы (Для статистики)
             </label>
             <SphereSelector selected={selectedSpheres} onChange={setSelectedSpheres} />
          </div>
          <textarea 
            className="w-full h-32 md:h-40 resize-none outline-none text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono" 
            placeholder="О чем ты думаешь? Чему научило это событие? (Поддерживается Markdown)" 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
          />
          <button 
            onClick={handlePost} 
            disabled={!content.trim()} 
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 text-sm font-medium transition-all shadow-md shadow-slate-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
          >
            <Send size={16} /> 
            Записать мысль
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 md:p-8 md:overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 md:bg-transparent min-h-0 md:min-h-0">
        <div className="flex flex-col gap-3 mb-4 md:mb-6 shrink-0 max-w-3xl mx-auto w-full">
             <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Хроника</h3>
                {hasMentorTool && (
                  <Tooltip content="Наставник (ИИ)">
                    <button onClick={handleAnalyzePath} disabled={isAnalyzing || displayedEntries.length === 0} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all shadow-sm ${isAnalyzing ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-400 cursor-wait' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                        {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                        <span>Наставник</span>
                    </button>
                  </Tooltip>
                )}
            </div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Поиск по записям..."
                        className="w-full pl-9 pr-8 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900 focus:border-indigo-200 dark:focus:border-indigo-800 dark:text-slate-200 transition-all shadow-sm"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>
                    )}
                </div>
                <div className="relative" ref={datePickerRef}>
                    <Tooltip content="Фильтр по дате">
                        <button 
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`p-2 rounded-xl border transition-all h-full flex items-center justify-center aspect-square ${hasActiveDateFilter || showDatePicker ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            <Calendar size={18} />
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
                {hasMentorTool && (
                  <Tooltip content="История Наставника">
                    <button onClick={() => setShowHistory(true)} className="p-2 rounded-xl border transition-all h-full flex items-center justify-center aspect-square bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm"><Scroll size={18} /></button>
                  </Tooltip>
                )}
                <Tooltip content="Сортировка">
                    <button 
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="p-2 rounded-xl border transition-all h-full flex items-center justify-center aspect-square bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm"
                    >
                        {sortOrder === 'desc' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                    </button>
                </Tooltip>
            </div>
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
          <div className="space-y-6 max-w-3xl pb-20 md:pb-0 mx-auto w-full">
            {displayedEntries.map(entry => {
              const mentor = config.mentors.find(m => m.id === entry.mentorId);
              const isEditing = editingId === entry.id;

              return (
                <div key={entry.id} className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 md:p-6 relative group hover:shadow-md transition-shadow">
                  {!isEditing && (
                    <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                         <Tooltip content={entry.isInsight ? "Убрать из инсайтов" : "Отметить как инсайт"}>
                            <button onClick={() => toggleInsight(entry)} className={`p-2 rounded-lg transition-colors ${entry.isInsight ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-slate-300 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}>
                                <Lightbulb size={16} className={entry.isInsight ? "fill-current" : ""} />
                            </button>
                         </Tooltip>
                         <Tooltip content="Редактировать">
                            <button onClick={() => startEditing(entry)} className="text-slate-300 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"><Edit3 size={16} /></button>
                         </Tooltip>
                         <Tooltip content="Удалить">
                            <button onClick={() => { if (window.confirm("Удалить запись из дневника?")) deleteEntry(entry.id); }} className="text-slate-300 dark:text-slate-500 hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                         </Tooltip>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      <Calendar size={12} /> {new Date(entry.date).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}
                      <JournalEntrySphereSelector entry={entry} updateEntry={updateEntry} />
                  </div>
                  {entry.linkedTaskId && getTaskPreview(entry.linkedTaskId)}
                  {isEditing ? (
                      <div className="mb-4">
                          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 leading-relaxed outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 resize-none font-mono" placeholder="Markdown..." />
                          <div className="flex flex-col-reverse md:flex-row justify-end gap-2 mt-2">
                              <button onClick={cancelEditing} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded flex items-center justify-center gap-1 w-full md:w-auto"><X size={12} /> Отмена</button>
                              <button onClick={() => saveEdit(entry)} className="px-3 py-1.5 text-xs font-medium bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-700 rounded flex items-center justify-center gap-1 w-full md:w-auto"><Check size={12} /> Сохранить</button>
                          </div>
                      </div>
                  ) : (
                    <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap mb-4 font-normal mt-2"><ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown></div>
                  )}
                  {entry.aiFeedback && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 relative mt-4">
                      <div className="flex items-center gap-2 mb-2">
                         <div className={`p-1 rounded bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 shadow-sm ${mentor?.color || 'text-slate-500'}`}><RenderIcon name={mentor?.icon || 'User'} className="w-3 h-3" /></div>
                         <span className={`text-xs font-bold ${mentor?.color || 'text-slate-500'}`}>{mentor?.name || 'Ментор'}</span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed pl-1"><ReactMarkdown components={markdownComponents}>{entry.aiFeedback}</ReactMarkdown></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {analysisResult && (
          <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setAnalysisResult(null)}>
              <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Bot className="text-indigo-600 dark:text-indigo-400" /> Анализ Пути (Наставник)</h3><button onClick={() => setAnalysisResult(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button></div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed text-sm"><ReactMarkdown components={markdownComponents}>{analysisResult}</ReactMarkdown></div>
                  <div className="mt-8 flex justify-end gap-2">
                      <button onClick={handleSaveAnalysis} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2"><Save size={16} /> Сохранить в историю</button>
                      <button onClick={() => setAnalysisResult(null)} className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-medium text-sm">Закрыть</button>
                  </div>
              </div>
          </div>
      )}

      {showHistory && (
          <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
              <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6 shrink-0"><h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Scroll className="text-indigo-600 dark:text-indigo-400" /> История Наставника</h3><button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button></div>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar-light space-y-4">
                      {mentorAnalyses.length === 0 ? (<div className="py-10"><EmptyState icon={Bot} title="Пусто" description="Посоветуйся с Наставником, чтобы начать историю." color="indigo" /></div>) : (
                          mentorAnalyses.sort((a,b) => b.date - a.date).map(analysis => (
                              <div key={analysis.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-700 group">
                                  <div className="flex justify-between items-start mb-3">
                                      <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{analysis.mentorName}</span><span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><Calendar size={10} /> {new Date(analysis.date).toLocaleString()}</span></div>
                                      <Tooltip content="Удалить">
                                        <button onClick={() => { if (confirm("Удалить этот анализ?")) deleteMentorAnalysis(analysis.id); }} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                                      </Tooltip>
                                  </div>
                                  <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"><ReactMarkdown components={markdownComponents}>{analysis.content}</ReactMarkdown></div>
                              </div>
                          ))
                      )}
                  </div>
                  <div className="mt-6 flex justify-end shrink-0 pt-4 border-t border-slate-50 dark:border-slate-700"><button onClick={() => setShowHistory(false)} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 font-medium text-sm">Закрыть</button></div>
              </div>
          </div>
      )}

      {viewingTask && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingTask(null)}>
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6"><h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">Контекст мысли</h3><button onClick={() => setViewingTask(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button></div>
                <div className="space-y-4">
                    <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
                        <div className="flex justify-between items-center mb-3"><span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${viewingTask.column === 'done' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'}`}>{viewingTask.column === 'done' ? <CheckCircle2 size={12} /> : <Circle size={12} />}{viewingTask.column === 'done' ? 'Сделано' : 'В процессе'}{viewingTask.isArchived && " (В архиве)"}</span></div>
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
