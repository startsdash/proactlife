
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCw, RotateCcw, Play, FileText, Check, Archive as ArchiveIcon, History, Trash2, Plus, Minus, Book, Save, ArrowDown, ArrowUp, Square, CheckSquare, Circle, XCircle, Kanban as KanbanIcon, ListTodo, Bot, Pin, GripVertical, ChevronUp, ChevronDown, Edit3, AlignLeft, Target, Trophy, Search, Rocket } from 'lucide-react';
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
  const [activeModal, setActiveModal] = useState<{taskId: string, type: 'stuck' | 'reflect' | 'details' | 'challenge'} | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'todo' | 'doing' | 'done'>('todo');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [generatingChallengeFor, setGeneratingChallengeFor] = useState<string | null>(null);
  const [generatingTherapyFor, setGeneratingTherapyFor] = useState<string | null>(null);
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
  
  const baseActiveTasks = tasks.filter(t => !t.isArchived);

  const activeTasks = baseActiveTasks.filter(task => {
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const inTitle = task.title?.toLowerCase().includes(q);
          const inContent = task.content.toLowerCase().includes(q);
          if (!inTitle && !inContent) return false;
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
           return; 
      }
      
      // If dropping onto a task in the SAME column -> Reorder
      if (draggedTask.column === targetTask.column) {
          reorderTask(draggedTaskId, targetTaskId);
      }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const toggleSortOrder = () => { 
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); 
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
        setGeneratingChallengeFor(current => {
            if (current === taskId) {
                setAiResponse(challenge);
                setActiveModal({ taskId: taskId, type: 'challenge' });
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

  const acceptChallenge = () => {
      const task = getTaskForModal();
      if (!task || !aiResponse) return;
      
      const updatedTask: Task = { ...task };
      // Optional: Auto move to doing if in todo
      if (task.column === 'todo') updatedTask.column = 'doing';
      
      if (task.activeChallenge) {
          updatedTask.challengeHistory = [...(task.challengeHistory || []), task.activeChallenge];
      }
      updatedTask.activeChallenge = aiResponse;
      updatedTask.isChallengeCompleted = false;
      
      updateTask(updatedTask);
      setActiveModal(null);
      setAiResponse(null);
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
  
  const moveToDoing = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      if (!canMoveTask(task, 'doing')) return;
      updateTask({ ...task, column: 'doing' });
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
    if (col.id === 'todo') emptyText = "Создай задачу, чтобы начать";
    if (col.id === 'doing') emptyText = "Перетащи задачу из «Выполнить»";
    if (col.id === 'done') emptyText = "Готово? Перетащи задачу сюда";

    return (
    <div className={`bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl flex flex-col border-t-4 ${col.color} p-2 md:p-3 h-full md:h-auto md:min-h-0`}>
        <h3 className="hidden md:flex font-semibold text-slate-600 dark:text-slate-400 mb-3 justify-between items-center text-sm px-1 shrink-0">{col.title} <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full">{tasksInCol.length}</span></h3>
        
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

        <div className="flex-1 overflow-y-auto md:overflow-visible min-h-0 space-y-3 pb-2 px-1 custom-scrollbar-light md:flex-none" onDrop={(e) => handleColumnDrop(e, col.id)} onDragOver={handleDragOver}>
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
                    let borderClass = 'border-l-slate-300 dark:border-l-slate-600';
                    if (col.id === 'done') borderClass = 'border-l-emerald-400';
                    else if (col.id === 'doing') borderClass = 'border-l-indigo-400';
                    
                    const subtasksTotal = task.subtasks?.length || 0;
                    const subtasksDone = task.subtasks?.filter(s => s.isCompleted).length || 0;
                    const progressPercent = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;
                    const hasJournalEntry = journalEntries.some(e => e.linkedTaskId === task.id);

                    return (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onDrop={(e) => handleTaskDrop(e, task.id)} onDragOver={handleDragOver} onClick={() => setActiveModal({taskId: task.id, type: 'details'})} className={`bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all cursor-default relative group border-l-4 ${borderClass} overflow-hidden`}>
                        
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

                        <div className="mb-3">
                            <div className={`text-slate-700 dark:text-slate-300 font-normal text-xs leading-relaxed line-clamp-4 ${!task.title ? 'text-sm' : ''}`}>
                                 <ReactMarkdown components={markdownComponents}>{applyTypography(task.content)}</ReactMarkdown>
                            </div>
                        </div>

                        {col.id === 'todo' && (
                            <>
                                {renderCardChecklist(task)}
                            </>
                        )}

                        {col.id === 'doing' && (
                            <>
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

                                {renderCardChecklist(task)}

                                {task.activeChallenge && (
                                    <div className="mt-2 mb-2">
                                        <CollapsibleSection 
                                            title={task.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"} 
                                            icon={<Zap size={12} className={task.isChallengeCompleted ? "text-emerald-500" : "text-indigo-500"} fill="currentColor" />} 
                                            isCard
                                        >
                                            <div className={`p-2 rounded-lg border transition-all relative group ${task.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'}`}>
                                                 
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

                        {col.id === 'done' && (
                            <>
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

                                       {!task.activeChallenge && hasChallengeAuthors && (
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
                                   </div>
                                   </>
                               )}

                               {col.id === 'done' && (
                                   <div className="flex gap-2">
                                       <Tooltip content="В Архив">
                                           <button 
                                                onClick={(e) => { e.stopPropagation(); if(window.confirm('В Архив?')) archiveTask(task.id); }}
                                                className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors"
                                           >
                                                <ArchiveIcon size={18} />
                                           </button>
                                       </Tooltip>
                                       <Tooltip content="Удалить">
                                           <button 
                                                onClick={(e) => { e.stopPropagation(); if(window.confirm('Удалить?')) deleteTask(task.id); }}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-transparent hover:border-red-100 dark:hover:border-red-800 transition-colors"
                                           >
                                                <Trash2 size={18} />
                                           </button>
                                       </Tooltip>
                                   </div>
                               )}
                            </div>
                        </div>
                    </div>
                    );
                })
            )}
        </div>
    </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] p-2 md:p-8 overflow-hidden">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 shrink-0 px-2 md:px-0">
            <div>
                <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Фокус и поток</p>
            </div>
            
            <div className="flex items-center gap-2">
                 <div className="relative">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                        type="text" 
                        placeholder="Поиск..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 w-40 md:w-64 transition-all"
                     />
                     {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"><X size={14}/></button>}
                 </div>
                 
                 <Tooltip content={filterJournal === 'all' ? "Показать задачи с Дневником" : "Показать все"}>
                     <button 
                        onClick={() => setFilterJournal(prev => prev === 'all' ? 'linked' : 'all')}
                        className={`p-2 rounded-xl border transition-all ${filterJournal === 'linked' ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                     >
                         <Book size={18} />
                     </button>
                 </Tooltip>
                 
                 <Tooltip content={sortOrder === 'desc' ? "Новые сверху" : "Старые сверху"}>
                     <button 
                        onClick={toggleSortOrder}
                        className="p-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                     >
                         {sortOrder === 'desc' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
                     </button>
                 </Tooltip>
            </div>
        </header>

        <div className="flex md:hidden bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-4 shrink-0">
            {columns.map(col => (
                <button
                    key={col.id}
                    onClick={() => setActiveMobileTab(col.id as any)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeMobileTab === col.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    {col.title}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="h-full grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[300px] md:min-w-0">
                <div className={`h-full ${activeMobileTab === 'todo' ? 'block' : 'hidden md:block'}`}>
                    {renderColumn(columns[0])}
                </div>
                <div className={`h-full ${activeMobileTab === 'doing' ? 'block' : 'hidden md:block'}`}>
                    {renderColumn(columns[1])}
                </div>
                <div className={`h-full ${activeMobileTab === 'done' ? 'block' : 'hidden md:block'}`}>
                    {renderColumn(columns[2])}
                </div>
            </div>
        </div>

        {activeModal?.type === 'details' && (
            <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
                <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 mr-4">
                            {isEditingTask ? (
                                <input 
                                    className="w-full text-lg font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1"
                                    value={editTaskTitle} 
                                    onChange={(e) => setEditTaskTitle(e.target.value)} 
                                    placeholder="Название задачи"
                                />
                            ) : (
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{getTaskForModal()?.title || 'Без названия'}</h3>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {!isEditingTask ? (
                                <button onClick={() => setIsEditingTask(true)} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Edit3 size={18} /></button>
                            ) : (
                                <button onClick={handleSaveTaskContent} className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"><Check size={18} /></button>
                            )}
                            <button onClick={() => setActiveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                    </div>
                    
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar-light space-y-4">
                        {isEditingTask ? (
                            <textarea 
                                className="w-full h-40 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm resize-none"
                                value={editTaskContent}
                                onChange={(e) => setEditTaskContent(e.target.value)}
                            />
                        ) : (
                            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                <ReactMarkdown components={markdownComponents}>{getTaskForModal()?.content || ''}</ReactMarkdown>
                            </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Чек-лист</h4>
                            <div className="space-y-2">
                                {getTaskForModal()?.subtasks?.map(s => (
                                    <div key={s.id} className="flex items-center gap-2 group">
                                        <button onClick={() => handleToggleSubtask(s.id)} className={s.isCompleted ? "text-emerald-500" : "text-slate-300"}>
                                            {s.isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                        </button>
                                        <span className={`flex-1 text-sm ${s.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{s.text}</span>
                                        <div className="opacity-0 group-hover:opacity-100 flex items-center">
                                            <button onClick={() => handleDeleteSubtask(s.id)} className="text-slate-300 hover:text-red-500 p-1"><X size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                    <input 
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm"
                                        placeholder="Новый пункт..."
                                        value={newSubtaskText}
                                        onChange={(e) => setNewSubtaskText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                    />
                                    <button onClick={handleAddSubtask} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 rounded text-slate-600 dark:text-slate-300"><Plus size={16}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeModal?.type === 'challenge' && aiResponse && (
            <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-indigo-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Zap className="text-indigo-500" /> Новый Челлендж</h3>
                        <button onClick={() => { setActiveModal(null); setAiResponse(null); }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-sm leading-relaxed text-slate-800 dark:text-slate-200 mb-6 border border-indigo-100 dark:border-indigo-800/50">
                        <ReactMarkdown components={markdownComponents}>{aiResponse}</ReactMarkdown>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => { setActiveModal(null); setAiResponse(null); }} className="flex-1 py-3 text-slate-500 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Отклонить</button>
                        <button onClick={acceptChallenge} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">Принять вызов</button>
                    </div>
                </div>
            </div>
        )}

        {activeModal?.type === 'stuck' && aiResponse && (
            <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-amber-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Bot className="text-amber-500" /> Совет Мудреца</h3>
                        <button onClick={() => { setActiveModal(null); setAiResponse(null); }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl text-sm leading-relaxed text-slate-800 dark:text-slate-200 mb-6 border border-amber-100 dark:border-amber-800/50 italic">
                        <ReactMarkdown components={markdownComponents}>{aiResponse}</ReactMarkdown>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => { setActiveModal(null); setAiResponse(null); }} className="flex-1 py-3 text-slate-500 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Спасибо, понял</button>
                        <button onClick={saveTherapyResponse} className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200 dark:shadow-none">Сохранить в историю</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Kanban;
