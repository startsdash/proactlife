
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCw, RotateCcw, Play, FileText, Check, Archive as ArchiveIcon, ChevronLeft, ChevronRight, History, Trash2, Plus, Minus, Book, Save, ArrowDown, ArrowUp, Square, CheckSquare, Circle, XCircle, Kanban as KanbanIcon, ListTodo, Bot, Pin, GripVertical, ChevronUp, ChevronDown, Edit3, AlignLeft, Target, Trophy, Search } from 'lucide-react';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { SPHERES, ICON_MAP, applyTypography } from '../constants';

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
            : <code className="block bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
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
                className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1.5 rounded-lg transition-colors border border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-800"
            >
                {task.spheres && task.spheres.length > 0 ? (
                    <div className="flex -space-x-1">
                        {task.spheres.map(s => {
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
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1 animate-in zoom-in-95 duration-100 flex flex-col gap-0.5" onClick={e => e.stopPropagation()}>
                        {SPHERES.map(s => {
                            const isSelected = task.spheres?.includes(s.id);
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
    <div className={`${isCard ? 'bg-slate-50/80 dark:bg-slate-800/50 mb-2 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 mb-3'} rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden`}>
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className={`w-full flex items-center justify-between ${isCard ? 'p-2' : 'p-4'} cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group/header`}
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
           {icon}
           {title}
        </div>
        <div className="flex items-center gap-3">
            {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
            <div className="text-slate-400">
                {isOpen ? <Minus size={14} /> : <Plus size={14} />}
            </div>
        </div>
      </div>
      {isOpen && (
        <div className={`${isCard ? 'px-2 pb-2' : 'px-4 pb-4'} pt-0 animate-in slide-in-from-top-1 duration-200`}>
           <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-sm">
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
                    <div key={`${keyPrefix}-md`} className="text-sm leading-relaxed text-slate-900 dark:text-slate-200 mb-1 last:mb-0">
                        <ReactMarkdown components={markdownComponents}>{applyTypography(textBuffer)}</ReactMarkdown>
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
                        <span className={`text-sm ${isChecked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{applyTypography(label)}</ReactMarkdown>
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
                    <div key={`${keyPrefix}-md`} className="text-sm leading-relaxed text-slate-900 dark:text-slate-200 mb-1 last:mb-0">
                        <ReactMarkdown components={markdownComponents}>{applyTypography(textBuffer)}</ReactMarkdown>
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
                        <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{applyTypography(label)}</ReactMarkdown>
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
  const [activeModal, setActiveModal] = useState<{taskId: string, type: 'stuck' | 'reflect' | 'details'} | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatingChallengeFor, setGeneratingChallengeFor] = useState<string | null>(null);
  const [challengeDrafts, setChallengeDrafts] = useState<{[taskId: string]: string}>({});
  const [filterChallenge, setFilterChallenge] = useState<'all' | 'active' | 'completed' | 'none'>('all');
  const [filterJournal, setFilterJournal] = useState<'all' | 'linked'>('all');
  const [sortOrder, setSortOrder] = useState<'manual' | 'desc' | 'asc'>('manual');
  const [searchQuery, setSearchQuery] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [cardSubtaskInputs, setCardSubtaskInputs] = useState<{[taskId: string]: string}>({});
  
  // NEW TASK CREATION STATE
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');

  // EDIT TASK STATE
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskContent, setEditTaskContent] = useState('');

  const hasChallengeAuthors = useMemo(() => config.challengeAuthors && config.challengeAuthors.length > 0, [config.challengeAuthors]);
  const hasKanbanTherapist = useMemo(() => config.aiTools.some(t => t.id === 'kanban_therapist'), [config.aiTools]);

  const baseActiveTasks = tasks.filter(t => !t.isArchived);

  const activeTasks = baseActiveTasks.filter(task => {
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const inTitle = task.title?.toLowerCase().includes(q);
          const inContent = task.content.toLowerCase().includes(q);
          if (!inTitle && !inContent) return false;
      }
      if (filterChallenge === 'active') {
          if (!task.activeChallenge || task.isChallengeCompleted) return false;
      }
      if (filterChallenge === 'completed') {
          if (!task.activeChallenge || !task.isChallengeCompleted) return false;
      }
      if (filterChallenge === 'none') {
          if (task.activeChallenge) return false;
      }
      if (filterJournal === 'linked') {
          const hasEntry = journalEntries.some(e => e.linkedTaskId === task.id);
          if (!hasEntry) return false;
      }
      return true;
  }).sort((a, b) => {
      if (sortOrder === 'manual') return 0;
      if (sortOrder === 'desc') return b.createdAt - a.createdAt;
      return a.createdAt - b.createdAt;
  });

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
              setEditTaskContent(task.content || '');
          }
      } else {
          setIsEditingTask(false);
      }
  }, [activeModal, tasks]);

  const columns = [
    { id: 'todo', title: 'Выполнить', color: 'border-slate-200 dark:border-slate-700' },
    { id: 'doing', title: 'В процессе', color: 'border-indigo-400' },
    { id: 'done', title: 'Сделано', color: 'border-emerald-400' }
  ];

  const handleCreateTask = () => {
      if (!newTaskTitle.trim() && !newTaskContent.trim()) return;
      const newTask: Task = {
          id: Date.now().toString(),
          title: applyTypography(newTaskTitle.trim()),
          content: applyTypography(newTaskContent.trim()),
          column: 'todo',
          createdAt: Date.now(),
      };
      addTask(newTask);
      setNewTaskTitle('');
      setNewTaskContent('');
      setIsCreatorOpen(false);
  };

  const cancelCreateTask = () => {
      setNewTaskTitle('');
      setNewTaskContent('');
      setIsCreatorOpen(false);
  };

  const handleSaveTaskContent = () => {
      const task = getTaskForModal();
      if (!task) return;
      if (editTaskContent.trim() || editTaskTitle.trim()) {
          updateTask({ 
              ...task, 
              title: applyTypography(editTaskTitle.trim()), 
              content: applyTypography(editTaskContent) 
          });
          setIsEditingTask(false);
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
    const task = activeTasks.find(t => t.id === taskId);
    if (!task || task.column === colId) return;
    
    if (!canMoveTask(task, colId)) return;
    updateTask({ ...task, column: colId as any });
  };

  const handleTaskDrop = (e: React.DragEvent, targetTaskId: string) => {
      e.preventDefault(); e.stopPropagation();
      const draggedTaskId = e.dataTransfer.getData('taskId');
      if (!draggedTaskId) return;
      const draggedTask = activeTasks.find(t => t.id === draggedTaskId);
      const targetTask = activeTasks.find(t => t.id === targetTaskId);
      if (!draggedTask || !targetTask) return;
      
      // Auto-switch to manual sort to prevent snapping back
      if (sortOrder !== 'manual') setSortOrder('manual');

      // If dropping onto a task in a DIFFERENT column
      if (draggedTask.column !== targetTask.column) {
           if (!canMoveTask(draggedTask, targetTask.column)) return;
           updateTask({ ...draggedTask, column: targetTask.column });
           // Optionally reorder as well, but primary action is moving column
           return; 
      }
      
      // If dropping onto a task in the SAME column -> Reorder
      if (draggedTask.column === targetTask.column) {
          reorderTask(draggedTaskId, targetTaskId);
      }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const moveTask = (e: React.MouseEvent, task: Task, direction: 'left' | 'right') => {
    e.stopPropagation();
    const colOrder = ['todo', 'doing', 'done'];
    const currentIdx = colOrder.indexOf(task.column);
    if (currentIdx === -1) return;
    const newIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1;
    if (newIdx >= 0 && newIdx < colOrder.length) {
        const newCol = colOrder[newIdx];
        if (!canMoveTask(task, newCol)) return;
        updateTask({ ...task, column: newCol as any });
    }
  };

  const toggleSortOrder = () => { 
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); 
  };

  const triggerAI = async (content: string, type: 'stuck' | 'completed') => {
    setIsLoading(true);
    setAiResponse(null);
    const response = await getKanbanTherapy(content, type, config);
    setAiResponse(response);
    setIsLoading(false);
  };

  const openTherapy = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setActiveModal({ taskId: task.id, type: 'stuck' });
    triggerAI(task.content, 'stuck');
  };

  const saveTherapyResponse = () => {
    if (!activeModal || !aiResponse) return;
    const task = tasks.find(t => t.id === activeModal.taskId);
    if (task) {
        updateTask({ ...task, consultationHistory: [...(task.consultationHistory || []), aiResponse] });
        alert("Сохранено в Историю консультаций");
        setActiveModal(null);
    }
  };

  const generateChallenge = async (e: React.MouseEvent, taskId: string, content: string) => {
    e.stopPropagation();
    setGeneratingChallengeFor(taskId);
    try {
        const challenge = await generateTaskChallenge(content, config);
        // Check if still generating this specific task (not cancelled)
        setGeneratingChallengeFor(current => {
            if (current === taskId) {
                setChallengeDrafts(prev => ({ ...prev, [taskId]: challenge }));
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

  const acceptChallenge = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      const draft = challengeDrafts[task.id];
      if (draft) {
          const updatedTask: Task = { ...task };
          if (task.column === 'todo') updatedTask.column = 'doing';
          if (task.activeChallenge) updatedTask.challengeHistory = [...(task.challengeHistory || []), task.activeChallenge];
          updatedTask.activeChallenge = draft;
          updatedTask.isChallengeCompleted = false;
          updateTask(updatedTask);
          const newDrafts = {...challengeDrafts};
          delete newDrafts[task.id];
          setChallengeDrafts(newDrafts);
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

  // Subtask Management
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
      
      // If Done column, do not toggle
      if (task.column === 'done') return;

      const updatedSubtasks = task.subtasks.map(s => 
          s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
      );
      
      updateTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleToggleSubtaskPin = (subtaskId: string) => {
      const task = getTaskForModal();
      if (!task || !task.subtasks) return;
      
      const updatedSubtasks = task.subtasks.map(s => 
          s.id === subtaskId ? { ...s, isPinned: !s.isPinned } : s
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

  // Subtask DnD Handlers
  const handleSubtaskDragStart = (e: React.DragEvent, subtaskId: string, taskId: string) => {
      e.dataTransfer.setData('subtaskId', subtaskId);
      e.dataTransfer.setData('sourceTaskId', taskId);
      e.dataTransfer.effectAllowed = 'move';
      // Prevent bubble up to column DnD
      e.stopPropagation();
  };

  const handleSubtaskDrop = (e: React.DragEvent, targetSubtaskId: string, task: Task) => {
      e.preventDefault();
      e.stopPropagation();
      const draggedSubtaskId = e.dataTransfer.getData('subtaskId');
      const sourceTaskId = e.dataTransfer.getData('sourceTaskId');

      if (!draggedSubtaskId || !sourceTaskId) return;
      if (sourceTaskId !== task.id) return; // Only reorder within same task

      if (!task.subtasks) return;

      const subtasks = [...task.subtasks];
      const dragIdx = subtasks.findIndex(s => s.id === draggedSubtaskId);
      const targetIdx = subtasks.findIndex(s => s.id === targetSubtaskId);

      if (dragIdx === -1 || targetIdx === -1 || dragIdx === targetIdx) return;

      const [moved] = subtasks.splice(dragIdx, 1);
      subtasks.splice(targetIdx, 0, moved);

      updateTask({ ...task, subtasks });
  };

  const moveSubtaskManual = (e: React.MouseEvent, subtaskId: string, direction: 'up' | 'down', task: Task) => {
      e.stopPropagation();
      if (!task || !task.subtasks) return;
      
      const subtasks = [...task.subtasks];
      const index = subtasks.findIndex(s => s.id === subtaskId);
      if (index === -1) return;

      if (direction === 'up' && index > 0) {
          [subtasks[index], subtasks[index - 1]] = [subtasks[index - 1], subtasks[index]];
      } else if (direction === 'down' && index < subtasks.length - 1) {
          [subtasks[index], subtasks[index + 1]] = [subtasks[index + 1], subtasks[index]];
      } else {
          return;
      }
      
      updateTask({ ...task, subtasks });
  };

  // Delete Helpers
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

  const renderCardChecklist = (task: Task) => (
    <div className="mt-2 mb-2">
        <CollapsibleSection
            title="Чек-лист"
            icon={<ListTodo size={12}/>}
            isCard
        >
            <div className="space-y-1.5">
                {task.subtasks?.map(subtask => (
                    <div
                    key={subtask.id}
                    draggable
                    onDragStart={(e) => handleSubtaskDragStart(e, subtask.id, task.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleSubtaskDrop(e, subtask.id, task)}
                    className="flex items-center gap-2 group cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 p-1 rounded"
                    onClick={(e) => { e.stopPropagation(); handleToggleSubtask(subtask.id, task.id); }}
                    >
                        <div className="text-slate-300 dark:text-slate-600 cursor-move opacity-0 group-hover:opacity-100 -ml-1 transition-opacity">
                             <GripVertical size={12} />
                        </div>
                        <div className={`mt-0.5 shrink-0 ${subtask.isCompleted ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-500'}`}>
                            {subtask.isCompleted ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        </div>
                        <span className={`text-xs flex-1 break-words leading-snug ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                            {subtask.text}
                        </span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(subtask.id, task.id); }}
                            className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
                {/* Input for new subtask */}
                <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                    <input
                        type="text"
                        className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[10px] outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                        placeholder="Добавить..."
                        value={cardSubtaskInputs[task.id] || ''}
                        onChange={(e) => setCardSubtaskInputs(prev => ({...prev, [task.id]: e.target.value}))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtaskFromCard(task.id)}
                    />
                    <button onClick={() => handleAddSubtaskFromCard(task.id)} className="px-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40">
                        <Plus size={12} />
                    </button>
                </div>
            </div>
        </CollapsibleSection>
    </div>
  );

  const renderColumn = (col: typeof columns[0]) => {
    if (!col) return null;
    const tasksInCol = activeTasks.filter(t => t.column === col.id);
    
    let emptyText = "Перетащите задачи сюда";
    if (col.id === 'todo') emptyText = "Добавь задачу из «Входящих» или «Хаба»";
    if (col.id === 'doing') emptyText = "Перетащи задачу из «Выполнить»";
    if (col.id === 'done') emptyText = "Готово? Перетащи задачу сюда";

    return (
    <div key={col.id} className={`bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl flex flex-col border-t-4 ${col.color} p-2 md:p-3`} onDrop={(e) => handleColumnDrop(e, col.id)} onDragOver={handleDragOver}>
        <h3 className="font-semibold text-slate-600 dark:text-slate-400 mb-3 flex justify-between items-center text-sm px-1 shrink-0">{col.title} <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full">{tasksInCol.length}</span></h3>
        
        {col.id === 'todo' && (
             <div className="mb-3 px-1">
                {!isCreatorOpen ? (
                    <button 
                        onClick={() => setIsCreatorOpen(true)}
                        className="w-full flex items-center justify-between bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm"
                    >
                        <span>Новая задача...</span>
                        <Plus size={16} />
                    </button>
                ) : (
                    <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-md animate-in slide-in-from-top-2">
                        <input
                            type="text"
                            placeholder="Название"
                            className="w-full text-sm font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none mb-2 placeholder:font-normal placeholder:text-slate-400"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            autoFocus
                        />
                        <textarea
                            placeholder="Задача..."
                            className="w-full h-20 text-sm text-slate-700 dark:text-slate-300 bg-transparent outline-none resize-none placeholder:text-slate-400 leading-relaxed"
                            value={newTaskContent}
                            onChange={(e) => setNewTaskContent(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <button 
                                onClick={cancelCreateTask}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded transition-colors"
                            >
                                Отменить
                            </button>
                            <button 
                                onClick={handleCreateTask}
                                disabled={!newTaskTitle.trim() && !newTaskContent.trim()}
                                className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
                            >
                                Добавить
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        <div className="space-y-3 pb-2 px-1">
            {tasksInCol.length === 0 ? (
                <div className="py-10">
                   <EmptyState 
                        icon={KanbanIcon} 
                        title="Пусто" 
                        description={emptyText} 
                        color="slate"
                    /> 
                </div>
            ) : (
                tasksInCol.map(task => {
                    const isDoneColumn = col.id === 'done';
                    // Specific border color classes to color ONLY the left border
                    let borderClass = 'border-l-slate-300 dark:border-l-slate-600';
                    if (col.id === 'done') borderClass = 'border-l-emerald-400';
                    else if (col.id === 'doing') borderClass = 'border-l-indigo-400';
                    
                    const subtasksTotal = task.subtasks?.length || 0;
                    const subtasksDone = task.subtasks?.filter(s => s.isCompleted).length || 0;
                    const progressPercent = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;
                    const hasJournalEntry = journalEntries.some(e => e.linkedTaskId === task.id);

                    return (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onDrop={(e) => handleTaskDrop(e, task.id)} onDragOver={handleDragOver} onClick={() => setActiveModal({taskId: task.id, type: 'details'})} className={`bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all cursor-default relative group border-l-4 ${borderClass} overflow-hidden`}>
                        
                        {/* HEADER: Title + Sphere Selector */}
                        <div className="flex justify-between items-start gap-2 mb-2">
                             <div className="flex-1 pt-1 min-w-0">
                                {task.title ? (
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug break-words">{applyTypography(task.title)}</h4>
                                ) : null}
                             </div>
                             
                             <div className="shrink-0 z-20 -mr-1 -mt-1">
                                <CardSphereSelector task={task} updateTask={updateTask} />
                             </div>
                        </div>

                        {/* CONTENT */}
                        <div className="mb-3">
                            <div className={`text-slate-700 dark:text-slate-300 font-normal text-xs leading-relaxed line-clamp-4 ${!task.title ? 'text-sm' : ''}`}>
                                 <ReactMarkdown components={markdownComponents}>{applyTypography(task.content)}</ReactMarkdown>
                            </div>
                        </div>

                        {/* TODO SPECIFIC MODULES */}
                        {col.id === 'todo' && (
                            <>
                                {/* CHECKLIST (Collapsed by default, always visible) */}
                                {renderCardChecklist(task)}
                            </>
                        )}

                        {/* DOING SPECIFIC MODULES */}
                        {col.id === 'doing' && (
                            <>
                                {/* STATUS BAR */}
                                {subtasksTotal > 0 && (
                                    <div className="flex items-center gap-3 mt-2 mb-2 h-6 w-full">
                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                                            <ListTodo size={12} />
                                            <span>{subtasksDone}/{subtasksTotal}</span>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center h-full">
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 rounded-full ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CHECKLIST (Collapsed by default, always visible) */}
                                {renderCardChecklist(task)}

                                {/* ACTIVE CHALLENGE (Collapsed) */}
                                {task.activeChallenge && !challengeDrafts[task.id] && (
                                    <div className="mt-2 mb-2">
                                        <CollapsibleSection 
                                            title={task.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"} 
                                            icon={<Zap size={12} className={task.isChallengeCompleted ? "text-emerald-500" : "text-indigo-500"} fill="currentColor" />} 
                                            isCard
                                        >
                                            <div className={`p-2 rounded-lg border transition-all relative group ${task.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'}`}>
                                                 
                                                 {/* COMPLETE CHALLENGE CHECK (Hover) */}
                                                 <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                     <Tooltip content={task.isChallengeCompleted ? "Вернуть в активные" : "Завершить челлендж"}>
                                                         <button 
                                                            onClick={(e) => toggleChallengeCompleteFromCard(e, task)}
                                                            className={`w-5 h-5 rounded-full border flex items-center justify-center bg-white dark:bg-slate-800 transition-colors ${task.isChallengeCompleted ? 'border-emerald-500 text-emerald-500' : 'border-slate-300 dark:border-slate-500 hover:border-emerald-500 hover:text-emerald-500 text-transparent'}`}
                                                         >
                                                             <Check size={12} />
                                                         </button>
                                                     </Tooltip>
                                                 </div>

                                                 {task.isChallengeCompleted ? (
                                                    <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                                                       <StaticChallengeRenderer content={task.activeChallenge || ''} mode="history" />
                                                    </div>
                                                 ) : (
                                                    <InteractiveChallenge 
                                                        content={task.activeChallenge || ''} 
                                                        onToggle={(idx) => toggleChallengeCheckbox(idx, task)} 
                                                    />
                                                 )}
                                            </div>
                                        </CollapsibleSection>
                                    </div>
                                )}
                            </>
                        )}

                        {/* DONE COLUMN SPECIFIC RENDER ORDER */}
                        {col.id === 'done' && (
                            <>
                                {/* STATUS BAR */}
                                {subtasksTotal > 0 && (
                                    <div className="flex items-center gap-3 mt-2 mb-2 h-6 w-full">
                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                                            <ListTodo size={12} />
                                            <span>{subtasksDone}/{subtasksTotal}</span>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center h-full">
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 rounded-full ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* CHECKLIST (Only if items exist) */}
                                {task.subtasks && task.subtasks.length > 0 && (
                                     <div className="mt-2 mb-2">
                                         <CollapsibleSection 
                                            title="Чек-лист" 
                                            icon={<ListTodo size={12}/>} 
                                            isCard
                                         >
                                             <div className="space-y-1.5">
                                                 {task.subtasks.map(subtask => (
                                                     <div 
                                                        key={subtask.id} 
                                                        className="flex items-center gap-2 p-1 rounded opacity-70"
                                                     >
                                                         <div className={`mt-0.5 shrink-0 ${subtask.isCompleted ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                                             {subtask.isCompleted ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                                         </div>
                                                         <span className={`text-xs flex-1 break-words leading-snug ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                                                             {subtask.text}
                                                         </span>
                                                     </div>
                                                 ))}
                                             </div>
                                         </CollapsibleSection>
                                     </div>
                                )}
                            </>
                        )}

                        {/* CHALLENGE DRAFTS (Usually for Todo/Doing) */}
                        {challengeDrafts[task.id] && (
                            <div className="mt-2 mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 animate-in fade-in slide-in-from-top-2 relative">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase mb-2"><Zap size={10} /> {config.challengeAuthors[0]?.name || 'Popper'}</div>
                                <div className="text-sm text-slate-900 dark:text-slate-200 leading-relaxed mb-3">
                                    <StaticChallengeRenderer content={challengeDrafts[task.id]} mode="draft" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={(e) => acceptChallenge(e, task)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 shadow-sm"><Play size={10} className="fill-current" /> Принять</button>
                                    <button onClick={(e) => { e.stopPropagation(); const d = {...challengeDrafts}; delete d[task.id]; setChallengeDrafts(d); }} className="text-amber-400 hover:text-amber-700 px-2"><X size={14} /></button>
                                </div>
                            </div>
                        )}

                        <div className="mt-auto border-t border-slate-50 dark:border-slate-700 pt-3 flex flex-col gap-3">
                            <div className="flex justify-end items-center w-full gap-2">
                               {col.id === 'todo' && (
                                    <>
                                        <div className="flex gap-2">
                                            <Tooltip content="В работу">
                                                <button 
                                                    onClick={(e) => moveToDoing(e, task)} 
                                                    className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors"
                                                >
                                                    <Play size={18} className="fill-current" />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </>
                               )}

                               {col.id === 'doing' && (
                                   <>
                                   <div className="flex gap-2">
                                       <Tooltip content={hasJournalEntry ? "В Дневнике" : "В Дневник"}>
                                           <button 
                                                onClick={(e) => { e.stopPropagation(); onReflectInJournal(task.id); }}
                                                className={`p-2 rounded-lg border transition-colors ${
                                                    hasJournalEntry 
                                                    ? 'border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40' 
                                                    : 'border-transparent text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-100'
                                                }`}
                                           >
                                                <Book size={18} />
                                           </button>
                                       </Tooltip>

                                       {!challengeDrafts[task.id] && hasChallengeAuthors && (
                                           <Tooltip content={generatingChallengeFor === task.id ? "Остановить" : "Челлендж"}>
                                               <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (generatingChallengeFor === task.id) {
                                                            stopGeneration(e);
                                                            return;
                                                        }
                                                        if (task.activeChallenge && !task.isChallengeCompleted) {
                                                            alert("Необходимо завершить активный челлендж");
                                                            return;
                                                        }
                                                        if (window.confirm("Создать челлендж?")) {
                                                            generateChallenge(e, task.id, task.content);
                                                        }
                                                    }} 
                                                    className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors"
                                               >
                                                    {generatingChallengeFor === task.id ? (
                                                        <div className="relative w-[18px] h-[18px] flex items-center justify-center">
                                                            <div className="absolute inset-0 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                            <div className="w-2 h-2 bg-current rounded-[1px]"></div>
                                                        </div>
                                                    ) : (
                                                        <Zap size={18} />
                                                    )}
                                                </button>
                                           </Tooltip>
                                       )}

                                       {hasKanbanTherapist && (
                                           <Tooltip content="Консультант (ИИ)">
                                               <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm("Запустить ИИ-консультанта?")) {
                                                            openTherapy(e, task);
                                                        }
                                                    }} 
                                                    className="p-2 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg border border-transparent hover:border-violet-100 dark:hover:border-violet-800"
                                               >
                                                   <Bot size={18} /> 
                                               </button>
                                           </Tooltip>
                                       )}
                                   </div>
                                   <Tooltip content="Завершить">
                                        <button 
                                            onClick={(e) => handleQuickComplete(e, task)} 
                                            className="p-2 rounded-lg border border-transparent hover:border-emerald-500 dark:hover:border-emerald-400 text-slate-300 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                                        >
                                            <Check size={18} strokeWidth={3} />
                                        </button>
                                    </Tooltip>
                                   </>
                               )}
                               
                               {col.id === 'done' && (
                                    <>
                                        <div className="flex gap-2">
                                            <Tooltip content="В Зал славы">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        if(window.confirm('Перенести задачу в Зал славы?')) archiveTask(task.id); 
                                                    }} 
                                                    className="p-2 text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg border border-transparent hover:border-amber-100 dark:hover:border-amber-800 transition-colors"
                                                >
                                                    <Trophy size={18} /> 
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Вернуть в работу">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        updateTask({ ...task, column: 'doing' }); 
                                                    }} 
                                                    className="p-2 rounded-lg border border-transparent hover:border-indigo-500 dark:hover:border-indigo-400 text-slate-300 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                                                >
                                                    <RotateCcw size={18} strokeWidth={2} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </>
                               )}
                            </div>
                            <div className="flex gap-2 items-center justify-between">
                                <div className="w-8 flex justify-start">{col.id !== 'todo' && <button onClick={(e) => moveTask(e, task, 'left')} className="p-1.5 bg-slate-100 dark:bg-slate-700 md:hidden rounded-lg text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600"><ChevronLeft size={16} /></button>}</div>
                                <div className="w-8 flex justify-end">{col.id !== 'done' && <button onClick={(e) => moveTask(e, task, 'right')} className="p-1.5 bg-slate-100 dark:bg-slate-700 md:hidden rounded-lg text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600"><ChevronRight size={16} /></button>}</div>
                            </div>
                        </div>
                    </div>
                )})
            )}
        </div>
    </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <header className="p-4 md:p-8 pb-0 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Фокус на главном</p>
        </div>
        
        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row items-end md:items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 scrollbar-none">
             
             {/* Search Input */}
             <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Поиск..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-32 focus:w-48 transition-all pl-8 pr-7 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none ring-1 ring-transparent focus:ring-indigo-500/20"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={12} /></button>
                )}
             </div>

             <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                 <button onClick={() => setFilterChallenge('all')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterChallenge === 'all' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>Все</button>
                 <button onClick={() => setFilterChallenge('active')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterChallenge === 'active' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>Активные</button>
                 <button onClick={() => setFilterChallenge('none')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterChallenge === 'none' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>Обычные</button>
             </div>
             
             <Tooltip content={sortOrder === 'asc' ? "Старые сверху" : "Новые сверху"}>
                 <button onClick={toggleSortOrder} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400">
                     {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                 </button>
             </Tooltip>
        </div>
      </header>

      {/* Columns */}
      <div className="flex-1 overflow-auto p-4 md:p-8 pt-4 custom-scrollbar-light">
         <div className="flex flex-col md:flex-row gap-4 h-full min-h-0">
            {columns.map(col => (
               <div key={col.id} className="flex-1 min-w-[280px] flex flex-col min-h-0 h-full">
                   {renderColumn(col)}
               </div>
            ))}
         </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
                
                {/* MODAL HEADER */}
                <div className="flex justify-between items-start mb-4 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex-1 mr-4">
                        {activeModal.type === 'stuck' && 'Личный консультант'}
                        {activeModal.type === 'details' && (() => {
                            const task = getTaskForModal();
                            if (task?.title) return applyTypography(task.title);
                            if (task) return 'Детали задачи'; // Fallback if no title
                            return '';
                        })()}
                    </h3>
                    <div className="flex items-center shrink-0">
                        {activeModal.type === 'details' && !isEditingTask && (
                            (() => {
                                const task = getTaskForModal();
                                if (task && task.column !== 'done') {
                                    return (
                                        <>
                                            <Tooltip content="Редактировать">
                                                <button onClick={() => setIsEditingTask(true)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                                    <Edit3 size={20} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Удалить">
                                                <button onClick={() => { if(window.confirm('Удалить задачу?')) { deleteTask(task.id); setActiveModal(null); } }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={20} />
                                                </button>
                                            </Tooltip>
                                            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                        </>
                                    );
                                }
                                return null;
                            })()
                        )}
                        <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-1"><X size={24} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-light min-h-0">
                    {activeModal.type === 'stuck' && (
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                    <Bot size={48} className="animate-bounce mb-4 text-violet-400" />
                                    <p className="text-sm">Анализирую ситуацию...</p>
                                </div>
                            ) : aiResponse ? (
                                <div className="space-y-4">
                                    <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-xl border border-violet-100 dark:border-violet-800">
                                        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-xs uppercase mb-2"><Bot size={14}/> Совет</div>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed"><ReactMarkdown components={markdownComponents}>{aiResponse}</ReactMarkdown></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 py-10">Не удалось получить ответ.</div>
                            )}
                        </div>
                    )}

                    {activeModal.type === 'details' && (() => {
                        const task = getTaskForModal();
                        if (!task) return null;
                        
                        const isDone = task.column === 'done';

                        return (
                            <div className="space-y-4">
                                {/* TEXT EDITING */}
                                {isEditingTask ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Название</label>
                                            <input 
                                                value={editTaskTitle} 
                                                onChange={(e) => setEditTaskTitle(e.target.value)} 
                                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm font-bold text-slate-800 dark:text-slate-200 box-border focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
                                                placeholder="Название задачи..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Описание</label>
                                            <textarea 
                                                value={editTaskContent} 
                                                onChange={(e) => setEditTaskContent(e.target.value)} 
                                                className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm text-slate-800 dark:text-slate-200 resize-none box-border focus:border-slate-300 dark:focus:border-slate-600 transition-colors"
                                                placeholder="Описание (Markdown)..."
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button onClick={() => setIsEditingTask(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">Отмена</button>
                                            <button onClick={handleSaveTaskContent} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">Сохранить</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group relative pr-1">
                                        <div className="text-slate-800 dark:text-slate-200 text-sm font-normal leading-relaxed">
                                            <ReactMarkdown components={markdownComponents}>{applyTypography(task.content)}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* SPHERES */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Сферы</label>
                                    <SphereSelector selected={task.spheres || []} onChange={(s) => updateTask({...task, spheres: s})} />
                                </div>

                                {/* CONTEXT (DESCRIPTION) - Collapsed by default */}
                                {task.description && (
                                    <CollapsibleSection title="Контекст" icon={<FileText size={14}/>}>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                            <ReactMarkdown components={markdownComponents}>{applyTypography(task.description)}</ReactMarkdown>
                                        </div>
                                    </CollapsibleSection>
                                )}

                                {/* CHECKLIST - Collapsed by default */}
                                {(task.subtasks && task.subtasks.length > 0 || !isDone) && (
                                    <CollapsibleSection title="Чек-лист" icon={<ListTodo size={14}/>}>
                                        <div className="space-y-2">
                                            {task.subtasks?.map(s => (
                                                <div 
                                                    key={s.id} 
                                                    className={`flex items-center gap-2 group ${isDone ? 'opacity-70' : ''}`}
                                                    draggable={!isDone}
                                                    onDragStart={!isDone ? (e) => handleSubtaskDragStart(e, s.id, task.id) : undefined}
                                                    onDragOver={handleDragOver}
                                                    onDrop={!isDone ? (e) => handleSubtaskDrop(e, s.id, task) : undefined}
                                                >
                                                    {!isDone && (
                                                        <div className="hidden md:block text-slate-300 dark:text-slate-600 cursor-move hover:text-slate-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                             <GripVertical size={14} />
                                                        </div>
                                                    )}
                                                    <button onClick={() => !isDone && handleToggleSubtask(s.id)} disabled={isDone} className={`${s.isCompleted ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"} ${!isDone && "hover:text-indigo-500"}`}>
                                                        {s.isCompleted ? <CheckCircle2 size={16}/> : <Circle size={16}/>}
                                                    </button>
                                                    <span className={`flex-1 text-sm ${s.isCompleted ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300"}`}>{s.text}</span>
                                                    {!isDone && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleDeleteSubtask(s.id)} className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500"><X size={14}/></button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {!isDone && (
                                                <div className="flex gap-2 mt-2">
                                                    <input 
                                                        type="text" 
                                                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm outline-none text-slate-800 dark:text-slate-200"
                                                        placeholder="Новый пункт..."
                                                        value={newSubtaskText}
                                                        onChange={(e) => setNewSubtaskText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                                    />
                                                    <button onClick={handleAddSubtask} disabled={!newSubtaskText.trim()} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-50"><Plus size={16}/></button>
                                                </div>
                                            )}
                                        </div>
                                    </CollapsibleSection>
                                )}

                                {/* ACTIVE/FINAL CHALLENGE */}
                                {task.activeChallenge && (
                                    <CollapsibleSection 
                                        title={task.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"} 
                                        icon={<Zap size={14} className={task.isChallengeCompleted ? "text-emerald-500" : "text-indigo-500"} fill="currentColor"/>}
                                        actions={
                                            !isDone ? (
                                                <Tooltip content="Удалить челлендж">
                                                    <button onClick={(e) => deleteActiveChallenge(e)} className="text-slate-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover/header:opacity-100">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </Tooltip>
                                            ) : undefined
                                        }
                                    >
                                        <div className="relative group">
                                            {/* COMPLETE CHALLENGE CHECK (Hover) - Only if not done */}
                                            {!isDone && (
                                                <div className="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                     <Tooltip content={task.isChallengeCompleted ? "Вернуть в активные" : "Завершить челлендж"}>
                                                         <button 
                                                            onClick={() => toggleChallengeComplete()}
                                                            className={`w-5 h-5 rounded-full border flex items-center justify-center bg-white dark:bg-slate-800 transition-colors ${task.isChallengeCompleted ? 'border-emerald-500 text-emerald-500' : 'border-slate-300 dark:border-slate-500 hover:border-emerald-500 hover:text-emerald-500 text-transparent'}`}
                                                         >
                                                             <Check size={12} />
                                                         </button>
                                                     </Tooltip>
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                {task.isChallengeCompleted ? (
                                                    <StaticChallengeRenderer content={task.activeChallenge} mode="history" />
                                                ) : (
                                                    <InteractiveChallenge 
                                                        content={task.activeChallenge} 
                                                        onToggle={(i) => !isDone && toggleChallengeCheckbox(i, task)} 
                                                        onPin={!isDone ? (i) => handleToggleChallengeStepPin(i) : undefined}
                                                        pinnedIndices={task.pinnedChallengeIndices}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </CollapsibleSection>
                                )}

                                {/* HISTORY & CONSULTATIONS */}
                                {(task.challengeHistory && task.challengeHistory.length > 0) && (
                                    <CollapsibleSection title="История Челленджей" icon={<History size={14}/>}>
                                        <div className="space-y-4">
                                            {task.challengeHistory?.map((h, i) => (
                                                <div key={`ch-${i}`} className="text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 relative group">
                                                    <div className="text-[10px] font-bold text-slate-400 mb-1">Архивный челлендж</div>
                                                    <StaticChallengeRenderer content={h} mode="history" />
                                                    {!isDone && (
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Tooltip content="Удалить">
                                                                <button onClick={() => deleteChallengeFromHistory(i)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                            </Tooltip>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CollapsibleSection>
                                )}
                                {(task.consultationHistory && task.consultationHistory.length > 0) && (
                                    <CollapsibleSection title="История консультаций" icon={<MessageCircle size={14}/>}>
                                        <div className="space-y-4">
                                            {task.consultationHistory?.map((h, i) => (
                                                <div key={`cons-${i}`} className="text-sm bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 relative group">
                                                    <div className="text-[10px] font-bold text-violet-400 mb-1 flex items-center gap-1"><Bot size={10}/> Консультация</div>
                                                    <ReactMarkdown components={markdownComponents}>{applyTypography(h)}</ReactMarkdown>
                                                    {!isDone && (
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Tooltip content="Удалить">
                                                                <button onClick={() => deleteConsultation(i)} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                            </Tooltip>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </CollapsibleSection>
                                )}
                            </div>
                        );
                    })()}
                </div>
                {activeModal.type === 'stuck' && aiResponse && (
                    <div className="mt-8 flex justify-end gap-2">
                        <Tooltip content="Сохранить в историю">
                            <button 
                                onClick={saveTherapyResponse} 
                                className="p-2 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                            >
                                <Save size={20} />
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
