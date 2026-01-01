
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCw, RotateCcw, Play, FileText, Check, Archive as ArchiveIcon, History, Trash2, Plus, Minus, Book, Save, ArrowDown, ArrowUp, Square, CheckSquare, Circle, XCircle, Kanban as KanbanIcon, ListTodo, Bot, Pin, GripVertical, ChevronUp, ChevronDown, Edit3, AlignLeft, Target, Trophy, Search, Rocket, Briefcase, Sprout, Heart, Hash, Clock, ChevronRight, Layout, Maximize2, Command } from 'lucide-react';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { SPHERES, ICON_MAP, applyTypography } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-sm text-slate-600 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-sm text-slate-600 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-base font-serif font-bold mt-3 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-sm font-serif font-bold mt-2 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h2>,
    h3: ({node, children, ...props}: any) => <h3 className="text-xs font-bold mt-2 mb-1 text-slate-500 dark:text-slate-400 uppercase tracking-wide" {...props}>{cleanHeader(children)}</h3>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-indigo-200 dark:border-indigo-800 pl-3 py-1 my-2 text-xs text-slate-500 dark:text-slate-400 italic" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-slate-600 dark:text-slate-400" {...props}>{children}</code>
            : <code className="block bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

// --- NEW COMPONENT: SEGMENTED PROGRESS BAR ---
const SegmentedProgressBar = ({ total, current, color = 'text-indigo-500', className = '' }: { total: number, current: number, color?: string, className?: string }) => {
    const bgClass = color.replace('text-', 'bg-');
    
    return (
        <div className={`flex items-center gap-1.5 w-full mb-3 animate-in fade-in slide-in-from-left-2 duration-500 ${className}`}>
            <div className="flex-1 flex gap-1 h-1.5">
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
            <div className="font-mono text-[9px] text-slate-400 font-bold tracking-widest shrink-0">
                {String(current).padStart(2, '0')}/{String(total).padStart(2, '0')}
            </div>
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

const SphereSelector: React.FC<{ selected: string[], onChange: (s: string[]) => void }> = ({ selected, onChange }) => {
    const toggleSphere = (id: string) => {
        if (selected.includes(id)) {
            onChange(selected.filter(s => s !== id));
        } else {
            onChange([...selected, id]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
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
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                    <div key={`${keyPrefix}-md`} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-1 last:mb-0">
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
                        <span className={`text-sm ${isChecked ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
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
                    <div key={`${keyPrefix}-md`} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mb-1 last:mb-0">
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
  
  // NEW TASK CREATION STATE
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');

  // EDIT TASK STATE
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskContent, setEditTaskContent] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasChallengeAuthors = useMemo(() => config.challengeAuthors && config.challengeAuthors.length > 0, [config.challengeAuthors]);
  const hasKanbanTherapist = useMemo(() => config.aiTools.some(t => t.id === 'kanban_therapist'), [config.aiTools]);

  const baseActiveTasks = tasks.filter(t => !t.isArchived);

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
              setEditTaskContent(task.content || '');
          }
      } else {
          setIsEditingTask(false);
          setShowHistory(false);
      }
  }, [activeModal, tasks]);

  const columns = [
    { id: 'todo', title: 'Нужно сделать' },
    { id: 'doing', title: 'В работе' },
    { id: 'done', title: 'Завершено' }
  ];

  const getTabClass = (id: string, active: boolean) => {
    const base = "flex-1 py-3 text-xs font-serif font-bold uppercase tracking-wider border-b-2 transition-colors text-center";
    if (!active) return `${base} border-transparent text-slate-400 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50`;
    
    if (id === 'todo') return `${base} border-slate-400 text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1e293b]`;
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
      if (!newTaskTitle.trim() && !newTaskContent.trim()) return;
      const newTask: Task = {
          id: Date.now().toString(),
          title: applyTypography(newTaskTitle.trim()),
          content: applyTypography(newTaskContent.trim()),
          column: 'todo',
          createdAt: Date.now(),
          spheres: activeSphereFilter ? [activeSphereFilter] : []
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

  // --- HELPER: TECHNO TIME & GLOW ---
  const getTechTime = (createdAt: number) => {
      const diff = Date.now() - createdAt;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return `T+${days}d`;
  };

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
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 text-slate-300 dark:text-slate-600 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                             <GripVertical size={12} />
                        </div>
                        
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
                        
                        <span className={`text-sm flex-1 break-words leading-relaxed transition-all duration-300 ${s.isCompleted ? "text-slate-400 line-through opacity-50" : "text-slate-700 dark:text-slate-200"}`}>{s.text}</span>
                        
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
    <div className="flex flex-col h-full md:h-auto md:min-h-0 bg-transparent">
        {/* Floating Header - Serif Title + Mono Counter */}
        <div className="hidden md:flex justify-center items-center text-center mb-6 gap-2">
            <h3 className="font-serif font-medium text-xl text-slate-900 dark:text-slate-100">{col.title}</h3>
            <span className="text-xs font-mono text-slate-400 bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm">{tasksInCol.length}</span>
        </div>
        
        {col.id === 'todo' && (
             <div className="mb-4 px-1">
                {!isCreatorOpen ? (
                    <button 
                        onClick={() => setIsCreatorOpen(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all uppercase tracking-wider font-mono"
                    >
                        <Plus size={14} /> NEW_TASK
                    </button>
                ) : (
                    <div className="bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-2">
                        <input
                            type="text"
                            placeholder="Название"
                            className="w-full text-sm font-serif font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none mb-2 placeholder:font-normal placeholder:text-slate-400"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            autoFocus
                        />
                        <textarea
                            placeholder="Контекст..."
                            className="w-full h-16 text-sm text-slate-700 dark:text-slate-300 bg-transparent outline-none resize-none placeholder:text-slate-400 leading-relaxed font-sans"
                            value={newTaskContent}
                            onChange={(e) => setNewTaskContent(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <button 
                                onClick={cancelCreateTask}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded transition-colors"
                            >
                                CANCEL
                            </button>
                            <button 
                                onClick={handleCreateTask}
                                disabled={!newTaskTitle.trim() && !newTaskContent.trim()}
                                className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors font-mono"
                            >
                                EXECUTE
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        <div className="flex-1 overflow-y-auto md:overflow-visible min-h-0 space-y-4 pb-2 px-1 custom-scrollbar-light md:flex-none" onDrop={(e) => handleColumnDrop(e, col.id)} onDragOver={handleDragOver}>
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
                                    <h4 className="font-serif text-lg font-medium text-slate-900 dark:text-white leading-tight break-words tracking-tight">
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
                            <div className={`text-slate-600 dark:text-slate-400 font-sans text-sm leading-relaxed line-clamp-3 ${!task.title ? 'text-base' : ''}`}>
                                 <ReactMarkdown components={markdownComponents}>{applyTypography(task.content)}</ReactMarkdown>
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
                            <div className="text-[9px] font-mono text-slate-300 dark:text-slate-600 flex gap-2 select-none pointer-events-none">
                                <span>[ID: {task.id.slice(-4)}]</span>
                                <span>[{getTechTime(task.createdAt)}]</span>
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
    <div className="flex flex-col h-full relative md:overflow-y-auto md:overflow-x-hidden custom-scrollbar-light overflow-hidden" style={DOT_GRID_STYLE}>
      
      {/* 1. SCROLLABLE TITLE (Decoupled) */}
      <div className="px-4 md:px-8 pt-8 pb-4 shrink-0">
        <div>
            <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Спринты</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Фокус на главном</p>
        </div>
      </div>

      {/* 2. STICKY SEARCH HORIZON */}
      <div className="sticky top-0 z-30 w-full mb-6">
         {/* Glass Effect Background */}
         <div className="absolute inset-0 bg-[#f8fafc]/80 dark:bg-[#0f172a]/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-500 supports-[backdrop-filter]:bg-[#f8fafc]/60 supports-[backdrop-filter]:dark:bg-[#0f172a]/60" />

         <div className="relative z-10 px-4 md:px-8 py-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                 {/* Sphere Filters */}
                 <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 scrollbar-none w-full md:w-auto mask-fade-right">
                     <button 
                        onClick={() => setActiveSphereFilter(null)}
                        className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all border shrink-0 ${!activeSphereFilter ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-transparent shadow-md' : 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
                     >
                         [ВСЕ]
                     </button>
                     {SPHERES.map(s => {
                         const isActive = activeSphereFilter === s.id;
                         return (
                             <button
                                key={s.id}
                                onClick={() => setActiveSphereFilter(isActive ? null : s.id)}
                                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 border uppercase tracking-wider shrink-0
                                    ${isActive 
                                        ? `${s.bg.replace('/30','')} ${s.text} ${s.border} shadow-sm ring-1 ring-offset-1 dark:ring-offset-slate-900 ring-${s.color}-400`
                                        : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300'
                                    }
                                `}
                             >
                                 {isActive ? `[ ${s.label} ]` : s.label}
                             </button>
                         );
                     })}
                 </div>

                 {/* Search & Sort */}
                 <div className="flex items-center gap-2 w-full md:w-auto md:min-w-[300px]">
                     {/* Input */}
                     <div className="relative group flex-1">
                        <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            placeholder="Поиск задач или контекста..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-14 py-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs font-sans text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 shadow-sm transition-all focus:shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400 opacity-50 pointer-events-none hidden md:block">
                            [ CTRL + F ]
                        </div>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 md:hidden"><X size={12} /></button>
                        )}
                     </div>
                     
                     {/* Sort */}
                     <Tooltip content={sortOrder === 'asc' ? "Старые сверху" : "Новые сверху"} side="left">
                         <button onClick={toggleSortOrder} className="p-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 shrink-0 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800">
                             {sortOrder === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                         </button>
                     </Tooltip>
                 </div>
            </div>
         </div>
      </div>

      {/* 3. COLUMNS */}
      <div className="flex-1 flex flex-col p-0 md:px-8 md:pb-8 overflow-hidden md:overflow-visible">
         {/* Mobile Tabs */}
         <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-[#0f172a] shrink-0 z-10 mb-4 mx-4">
            {columns.map(col => (
                <button
                    key={col.id}
                    onClick={() => setActiveMobileTab(col.id as any)}
                    className={getTabClass(col.id, activeMobileTab === col.id)}
                >
                    {col.title} <span className="opacity-60 text-[10px] font-mono">({baseActiveTasks.filter(t => t.column === col.id).length})</span>
                </button>
            ))}
         </div>

         <div className="flex-1 overflow-x-hidden md:overflow-visible p-4 md:p-0 pt-0">
             <div className="flex flex-col md:flex-row gap-8 h-full md:h-auto min-h-0 md:items-start">
                {columns.map(col => {
                   const isHiddenOnMobile = activeMobileTab !== col.id;
                   return (
                       <div key={col.id} className={`flex-1 min-w-[300px] flex-col min-h-0 h-full md:h-auto ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}>
                           {renderColumn(col)}
                       </div>
                   );
                })}
             </div>
         </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-2xl flex items-center justify-center p-4" onClick={handleCloseModal}>
            <div className="bg-white/90 dark:bg-[#0f172a]/90 w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 border border-white/20 dark:border-slate-700/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col relative backdrop-filter" onClick={(e) => e.stopPropagation()}>
                
                {/* MODAL HEADER */}
                <div className="flex justify-between items-start mb-6 shrink-0 border-b border-slate-100 dark:border-slate-700/50 pb-4">
                    <div className="flex flex-col gap-1 pr-4">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                            Хаб <ChevronRight size={10} /> {activeModal.type === 'challenge' ? 'Вызов' : activeModal.type === 'stuck' ? 'Терапия' : 'Задача'}
                        </div>
                        <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100 leading-tight">
                            {activeModal.type === 'stuck' && <span className="flex items-center gap-2"><Bot size={20} className="text-violet-500"/> Личный консультант</span>}
                            {activeModal.type === 'challenge' && <span className="flex items-center gap-2"><Zap size={20} className="text-indigo-500"/> Новый вызов</span>}
                            {activeModal.type === 'details' && (() => {
                                const task = getTaskForModal();
                                if (task?.title) return applyTypography(task.title);
                                if (task) return 'Детали задачи'; 
                                return '';
                            })()}
                        </h3>
                    </div>
                    <div className="flex items-center shrink-0 gap-1">
                        {activeModal.type === 'details' && !isEditingTask && (
                            (() => {
                                const task = getTaskForModal();
                                if (task && task.column !== 'done') {
                                    return (
                                        <>
                                            <Tooltip content="Редактировать">
                                                <button onClick={() => setIsEditingTask(true)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors">
                                                    <Edit3 size={18} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Удалить">
                                                <button onClick={() => { if(window.confirm('Удалить задачу?')) { deleteTask(task.id); handleCloseModal(); } }} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </Tooltip>
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
                    {activeModal.type === 'stuck' && (
                        <div className="space-y-4">
                            {aiResponse ? (
                                <div className="space-y-4">
                                    <div className="bg-violet-50 dark:bg-violet-900/20 p-6 rounded-2xl border border-violet-100 dark:border-violet-800/50 shadow-inner">
                                        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-xs uppercase tracking-widest mb-3">Совет</div>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium"><ReactMarkdown components={markdownComponents}>{aiResponse}</ReactMarkdown></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 py-10 flex flex-col items-center gap-2">
                                    <Bot size={32} className="opacity-20" />
                                    <span>Не удалось получить ответ.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {activeModal.type === 'challenge' && draftChallenge && (
                        <div className="flex flex-col h-full">
                            <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed text-sm shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-30">
                                    <div className="w-16 h-16 bg-indigo-500 rounded-full blur-2xl" />
                                </div>
                                <StaticChallengeRenderer content={draftChallenge} mode="draft" />
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
                                {/* TEXT EDITING */}
                                {isEditingTask ? (
                                    <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Название</label>
                                            <input 
                                                value={editTaskTitle} 
                                                onChange={(e) => setEditTaskTitle(e.target.value)} 
                                                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-base font-bold text-slate-800 dark:text-slate-200 focus:border-indigo-300 dark:focus:border-indigo-500 transition-colors font-serif"
                                                placeholder="Название задачи..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Описание</label>
                                            <textarea 
                                                value={editTaskContent} 
                                                onChange={(e) => setEditTaskContent(e.target.value)} 
                                                className="w-full h-32 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm text-slate-800 dark:text-slate-200 resize-none focus:border-indigo-300 dark:focus:border-indigo-500 transition-colors font-sans leading-relaxed"
                                                placeholder="Описание (Markdown)..."
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                            <button onClick={() => setIsEditingTask(false)} className="px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Отмена</button>
                                            <button onClick={handleSaveTaskContent} className="px-6 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-colors">Сохранить</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group relative pr-1">
                                        <div className="text-slate-700 dark:text-slate-300 text-sm font-normal leading-relaxed font-sans">
                                            <ReactMarkdown components={markdownComponents}>{applyTypography(task.content)}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* SPHERES */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Layout size={12}/> Сферы</label>
                                    <SphereSelector selected={task.spheres || []} onChange={(s) => updateTask({...task, spheres: s})} />
                                </div>

                                <div className="h-px bg-slate-100 dark:bg-slate-700/50 w-full my-2"></div>

                                {/* ACTIVE/FINAL CHALLENGE (COLLAPSED BY DEFAULT) */}
                                {task.activeChallenge && (
                                    <CollapsibleSection
                                        title={task.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"}
                                        icon={
                                            task.isChallengeCompleted 
                                            ? <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> 
                                            : <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                        }
                                        defaultOpen={false}
                                        actions={!isDone ? (
                                            <div className="flex items-center gap-3">
                                                <Tooltip content={task.isChallengeCompleted ? "Вернуть в активные" : "Завершить челлендж"}>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); toggleChallengeComplete(); }}
                                                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${task.isChallengeCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:text-emerald-500 text-transparent'}`}
                                                    >
                                                        <Check size={12} strokeWidth={3} />
                                                    </button>
                                                </Tooltip>
                                                
                                                <div className="w-px h-3 bg-slate-300 dark:bg-slate-600"></div>

                                                <Tooltip content="Удалить челлендж">
                                                    <button onClick={(e) => deleteActiveChallenge(e)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        ) : null}
                                    >
                                        <div className="font-serif text-sm italic text-slate-800 dark:text-slate-100 leading-relaxed pl-1 pt-1">
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
                                    </CollapsibleSection>
                                )}

                                {/* CHECKLIST (COLLAPSED BY DEFAULT) */}
                                {(task.subtasks && task.subtasks.length > 0 || !isDone) && (
                                    <CollapsibleSection
                                        title="Чек-лист"
                                        icon={<ListTodo size={14}/>}
                                        defaultOpen={false}
                                    >
                                        {/* SEGMENTED PROGRESS BAR */}
                                        {subtasksTotal > 0 && (
                                            <SegmentedProgressBar total={subtasksTotal} current={subtasksDone} color={sphereColorClass} />
                                        )}

                                        <div className="space-y-1">
                                            {task.subtasks?.map(s => (
                                                <div 
                                                    key={s.id} 
                                                    className="group flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-all duration-200 hover:translate-x-0.5 cursor-pointer relative"
                                                    draggable={!isDone}
                                                    onDragStart={!isDone ? (e) => handleSubtaskDragStart(e, s.id, task.id) : undefined}
                                                    onDragOver={handleDragOver}
                                                    onDrop={!isDone ? (e) => handleSubtaskDrop(e, s.id, task) : undefined}
                                                    onClick={() => !isDone && handleToggleSubtask(s.id)}
                                                >
                                                    {!isDone && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 text-slate-300 dark:text-slate-600 cursor-move hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                             <GripVertical size={12} />
                                                        </div>
                                                    )}
                                                    
                                                    {/* CUSTOM CHECKBOX */}
                                                    <div className={`
                                                        w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 mt-0.5
                                                        ${s.isCompleted 
                                                            ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                                                            : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400 bg-white dark:bg-transparent'
                                                        }
                                                    `}>
                                                        {s.isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
                                                    </div>
                                                    
                                                    <span className={`text-sm flex-1 break-words leading-relaxed transition-all duration-300 ${s.isCompleted ? "text-slate-400 line-through opacity-50" : "text-slate-700 dark:text-slate-200"}`}>{s.text}</span>
                                                    
                                                    {!isDone && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(s.id); }} className="text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><X size={14}/></button>
                                                    )}
                                                </div>
                                            ))}
                                            {!isDone && (
                                                <div className="flex gap-2 mt-3 pl-2">
                                                    <input 
                                                        type="text" 
                                                        className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 py-1 text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-indigo-400 transition-colors"
                                                        placeholder="Новый пункт..."
                                                        value={newSubtaskText}
                                                        onChange={(e) => setNewSubtaskText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                                    />
                                                    <button onClick={handleAddSubtask} disabled={!newSubtaskText.trim()} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1.5 rounded-lg disabled:opacity-50 transition-colors"><Plus size={18}/></button>
                                                </div>
                                            )}
                                        </div>
                                    </CollapsibleSection>
                                )}

                                <div className="h-px bg-slate-100 dark:bg-slate-700/50 w-full my-2"></div>

                                {/* HISTORY & CONSULTATIONS (Collapsible) */}
                                {((task.challengeHistory && task.challengeHistory.length > 0) || (task.consultationHistory && task.consultationHistory.length > 0)) && (
                                    <div>
                                        <button 
                                            onClick={() => setShowHistory(!showHistory)}
                                            className="w-full flex items-center justify-between py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-lg px-2 transition-colors -ml-2"
                                        >
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <History size={12} /> История анализа
                                            </div>
                                            <div className="text-slate-400">
                                                {showHistory ? <Minus size={12} /> : <Plus size={12} />}
                                            </div>
                                        </button>
                                        
                                        {showHistory && (
                                            <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                                                {task.challengeHistory?.map((h, i) => (
                                                    <div key={`ch-${i}`} className="text-sm bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 relative group">
                                                        <div className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Zap size={10}/> Архивный челлендж</div>
                                                        <div className="opacity-70"><StaticChallengeRenderer content={h} mode="history" /></div>
                                                        {!isDone && (
                                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Tooltip content="Удалить">
                                                                    <button onClick={() => deleteChallengeFromHistory(i)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={12}/></button>
                                                                </Tooltip>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {task.consultationHistory?.map((h, i) => (
                                                    <div key={`cons-${i}`} className="text-sm bg-violet-50/30 dark:bg-violet-900/10 p-4 rounded-xl border border-violet-100/50 dark:border-violet-800/30 relative group">
                                                        <div className="text-[9px] font-bold text-violet-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Bot size={10}/> Консультация</div>
                                                        <div className="text-slate-600 dark:text-slate-300 leading-relaxed opacity-80"><ReactMarkdown components={markdownComponents}>{applyTypography(h)}</ReactMarkdown></div>
                                                        {!isDone && (
                                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Tooltip content="Удалить">
                                                                    <button onClick={() => deleteConsultation(i)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={12}/></button>
                                                                </Tooltip>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {task.description && (
                                    <CollapsibleSection title="Контекст" icon={<FileText size={12}/>}>
                                        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                                            <ReactMarkdown components={markdownComponents}>{applyTypography(task.description)}</ReactMarkdown>
                                        </div>
                                    </CollapsibleSection>
                                )}
                            </div>
                        );
                    })()}
                </div>
                {activeModal.type === 'stuck' && aiResponse && (
                    <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                        <button 
                            onClick={saveTherapyResponse} 
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200 dark:shadow-none text-xs font-bold uppercase tracking-wider"
                        >
                            <Save size={16} /> Сохранить в историю
                        </button>
                    </div>
                )}
                {activeModal.type === 'challenge' && draftChallenge && (
                    <div className="mt-6 flex justify-end gap-2 shrink-0 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                        <button 
                            onClick={acceptDraftChallenge} 
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none text-sm font-bold uppercase tracking-wider active:scale-95"
                        >
                            <Rocket size={18} /> Принять вызов
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
