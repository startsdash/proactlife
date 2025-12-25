import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCw, Play, FileText, Check, Archive as ArchiveIcon, ChevronLeft, ChevronRight, History, Trash2, Plus, Minus, Book, Save, ArrowDown, ArrowUp, Square, CheckSquare, Circle, XCircle, Kanban as KanbanIcon, ListTodo, Bot, Pin } from 'lucide-react';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { SPHERES, ICON_MAP } from '../constants';

interface Props {
  tasks: Task[];
  journalEntries: JournalEntry[];
  config: AppConfig;
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

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isCard?: boolean;
  actions?: React.ReactNode;
}> = ({ title, children, icon, isCard = false, actions }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`${isCard ? 'bg-slate-50/80 dark:bg-slate-800/50 mb-2 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 mb-3'} rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden`}>
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className={`w-full flex items-center justify-between ${isCard ? 'p-2' : 'p-4'} cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors`}
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
           {icon}
           {title}
        </div>
        <div className="flex items-center gap-3">
            {actions}
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
                        <ReactMarkdown components={markdownComponents}>{textBuffer}</ReactMarkdown>
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
                            <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{label}</ReactMarkdown>
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

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [activeModal, setActiveModal] = useState<{taskId: string, type: 'stuck' | 'reflect' | 'details'} | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMobileCol, setActiveMobileCol] = useState<'todo' | 'doing' | 'done'>('todo');
  const [generatingChallengeFor, setGeneratingChallengeFor] = useState<string | null>(null);
  const [challengeDrafts, setChallengeDrafts] = useState<{[taskId: string]: string}>({});
  const [filterChallenge, setFilterChallenge] = useState<'all' | 'active' | 'completed' | 'none'>('all');
  const [filterJournal, setFilterJournal] = useState<'all' | 'linked'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const hasChallengeAuthors = useMemo(() => config.challengeAuthors && config.challengeAuthors.length > 0, [config.challengeAuthors]);
  const hasKanbanTherapist = useMemo(() => config.aiTools.some(t => t.id === 'kanban_therapist'), [config.aiTools]);

  const baseActiveTasks = tasks.filter(t => !t.isArchived);

  const activeTasks = baseActiveTasks.filter(task => {
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

  const columns = [
    { id: 'todo', title: 'Выполнить', color: 'border-slate-200 dark:border-slate-700' },
    { id: 'doing', title: 'В процессе', color: 'border-indigo-400' },
    { id: 'done', title: 'Сделано', color: 'border-emerald-400' }
  ];

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
      if (draggedTask.column !== targetTask.column) {
           if (!canMoveTask(draggedTask, targetTask.column)) return;
           updateTask({ ...draggedTask, column: targetTask.column });
           return; 
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

  const toggleSortOrder = () => { setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); };

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
        setChallengeDrafts(prev => ({ ...prev, [taskId]: challenge }));
    } finally {
        setGeneratingChallengeFor(null);
    }
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

  const toggleChallengeComplete = (e: React.MouseEvent, task: Task) => {
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

  const handleToggleSubtask = (subtaskId: string, taskId?: string) => {
      const targetTaskId = taskId || activeModal?.taskId;
      if (!targetTaskId) return;
      
      const task = tasks.find(t => t.id === targetTaskId);
      if (!task || !task.subtasks) return;
      
      const updatedSubtasks = task.subtasks.map(s => 
          s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
      );
      
      updateTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleCompleteAndUnpinSubtask = (e: React.MouseEvent, subtaskId: string, task: Task) => {
      e.stopPropagation();
      if (!task || !task.subtasks) return;
      
      const updatedSubtasks = task.subtasks.map(s => 
          s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted, isPinned: false } : s
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

  const handleDeleteSubtask = (subtaskId: string) => {
      const task = getTaskForModal();
      if (!task || !task.subtasks) return;
      
      updateTask({ ...task, subtasks: task.subtasks.filter(s => s.id !== subtaskId) });
  };

  // Delete Helpers
  const deleteActiveChallenge = () => {
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

  const renderColumn = (col: typeof columns[0]) => {
    if (!col) return null;
    const tasksInCol = activeTasks.filter(t => t.column === col.id);
    
    let emptyText = "Перетащите задачи сюда";
    if (col.id === 'todo') emptyText = "Добавь задачу из «Входящих» или «Хаба»";
    if (col.id === 'doing') emptyText = "Перетащи задачу из «Выполнить»";
    if (col.id === 'done') emptyText = "Готово? Перетащи задачу сюда";

    return (
    <div key={col.id} className={`bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl flex flex-col h-full border-t-4 ${col.color} p-2 md:p-3 min-h-0 overflow-hidden`} onDrop={(e) => handleColumnDrop(e, col.id)} onDragOver={handleDragOver}>
        <h3 className="font-semibold text-slate-600 dark:text-slate-400 mb-3 flex justify-between items-center text-sm px-1 shrink-0">{col.title} <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full">{tasksInCol.length}</span></h3>
        <div className="flex-1 overflow-y-auto space-y-3 pb-20 md:pb-2 min-h-0 px-1 custom-scrollbar-light">
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
                    const hideExtraDetails = isDoneColumn || (col.id === 'todo' && task.isChallengeCompleted);

                    let statusText = 'ЗАДАЧА';
                    let statusColor = 'text-slate-400 dark:text-slate-500';
                    let StatusIcon = null;
                    let borderClass = 'border-l-4 border-slate-300 dark:border-slate-600';
                    
                    if (col.id === 'done') borderClass = 'border-l-4 border-emerald-400';
                    else if (col.id === 'doing') borderClass = 'border-l-4 border-indigo-400';
                    
                    if (isDoneColumn) {
                        statusText = 'ЗАДАЧА';
                        statusColor = 'text-slate-400 dark:text-slate-500';
                        StatusIcon = null;
                    }
                    else if (task.activeChallenge) {
                        if (task.isChallengeCompleted) { statusText = 'ЧЕЛЛЕНДЖ ВЫПОЛНЕН'; statusColor = 'text-emerald-600 dark:text-emerald-400'; StatusIcon = CheckCircle2; }
                        else { statusText = 'ЧЕЛЛЕНДЖ АКТИВЕН'; statusColor = 'text-indigo-600 dark:text-indigo-400'; StatusIcon = Zap; }
                    }

                    const subtasksTotal = task.subtasks?.length || 0;
                    const subtasksDone = task.subtasks?.filter(s => s.isCompleted).length || 0;

                    // Progress Bar solely based on subtasks
                    const progressPercent = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;
                    
                    const hasJournalEntry = journalEntries.some(e => e.linkedTaskId === task.id);

                    return (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onDrop={(e) => handleTaskDrop(e, task.id)} onDragOver={handleDragOver} onClick={() => setActiveModal({taskId: task.id, type: 'details'})} className={`bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all cursor-default relative group ${borderClass} overflow-hidden`}>
                        
                        {/* QUICK COMPLETE CIRCLE */}
                        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip content={task.column === 'done' ? "Вернуть в работу" : "Завершить"}>
                                <button 
                                    onClick={(e) => handleQuickComplete(e, task)} 
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                        task.column === 'done' 
                                        ? 'border-emerald-500 bg-emerald-500 text-white' 
                                        : 'border-slate-300 dark:border-slate-500 hover:border-emerald-500 dark:hover:border-emerald-400 text-transparent hover:text-emerald-500 dark:hover:text-emerald-400'
                                    }`}
                                >
                                    <Check size={12} strokeWidth={3} />
                                </button>
                            </Tooltip>
                        </div>

                        {/* TOP: Status (Icon+Text) + Spheres */}
                        <div className="flex justify-between items-center mb-2">
                            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                                {StatusIcon && <StatusIcon size={14} fill={task.isChallengeCompleted ? "none" : "currentColor"} />}
                                <span>{statusText}</span>
                            </div>
                            <div className="flex items-center gap-2 pr-7">
                                {task.spheres && task.spheres.length > 0 && (
                                    <div className="flex -space-x-1">
                                        {task.spheres.map(s => {
                                            const sp = SPHERES.find(x => x.id === s);
                                            return sp ? <div key={s} className={`w-2 h-2 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`}></div> : null;
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div className="text-slate-800 dark:text-slate-200 font-normal text-sm leading-relaxed mb-3">
                             <ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown>
                        </div>

                        {/* PINNED ITEMS SECTION */}
                        {((task.subtasks && task.subtasks.some(s => s.isPinned)) || (task.activeChallenge && task.pinnedChallengeIndices && task.pinnedChallengeIndices.length > 0)) && (
                            <div className="mb-3 space-y-1.5 border-t border-slate-50 dark:border-slate-700/50 pt-2">
                                {/* Pinned Subtasks */}
                                {task.subtasks?.filter(s => s.isPinned).map(subtask => (
                                    <div 
                                        key={subtask.id} 
                                        className="flex items-start gap-2 p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 group"
                                    >
                                        <button 
                                            onClick={(e) => handleCompleteAndUnpinSubtask(e, subtask.id, task)} 
                                            className={`mt-0.5 shrink-0 ${subtask.isCompleted ? 'text-emerald-500' : 'text-indigo-500'}`}
                                        >
                                            {subtask.isCompleted ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                        </button>
                                        <span className={`text-xs flex-1 break-words leading-snug cursor-pointer ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {subtask.text}
                                        </span>
                                    </div>
                                ))}
                                
                                {/* Pinned Challenge Steps */}
                                {task.activeChallenge && task.pinnedChallengeIndices?.map((idx) => {
                                    // Parse challenge to find line at index
                                    const lines = task.activeChallenge!.split('\n');
                                    let currentCheckboxIdx = 0;
                                    let contentLine = '';
                                    let isChecked = false;
                                    
                                    for (const line of lines) {
                                        const match = line.match(/^\s*(?:[-*+]|\d+\.)?\s*\[([ xX])\]\s+(.*)/);
                                        if (match) {
                                            if (currentCheckboxIdx === idx) {
                                                isChecked = match[1].toLowerCase() === 'x';
                                                contentLine = match[2];
                                                break;
                                            }
                                            currentCheckboxIdx++;
                                        }
                                    }
                                    
                                    if (!contentLine) return null;

                                    return (
                                        <div 
                                            key={`pinned-chal-${idx}`}
                                            onClick={(e) => { e.stopPropagation(); toggleChallengeCheckbox(idx, task); }}
                                            className="flex items-start gap-2 p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group"
                                        >
                                            <div className={`mt-0.5 shrink-0 ${isChecked ? 'text-emerald-500' : 'text-indigo-500'}`}>
                                                {isChecked ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                            </div>
                                            <span className={`text-xs flex-1 break-words leading-snug ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                                                <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{contentLine}</ReactMarkdown>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* PROGRESS SECTION (Below Pinned) */}
                        <div className="flex items-center gap-3 mt-2 mb-3 h-6 w-full">
                            {/* Subtasks Badge */}
                            {subtasksTotal > 0 && (
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                                    <ListTodo size={12} />
                                    <span>{subtasksDone}/{subtasksTotal}</span>
                                </div>
                            )}
                            
                            {/* Consolidated Progress Bar - Full Width */}
                            {subtasksTotal > 0 && (
                                <div className="flex-1 flex flex-col justify-center h-full">
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-500 rounded-full ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {!hideExtraDetails && col.id === 'doing' && task.description && (
                             <CollapsibleSection title="Источник" icon={<FileText size={12}/>} isCard>
                                 <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar-light">
                                      <ReactMarkdown components={markdownComponents}>{task.description}</ReactMarkdown>
                                 </div>
                             </CollapsibleSection>
                        )}

                        {!hideExtraDetails && (col.id === 'doing' || col.id === 'todo') && task.activeChallenge && !challengeDrafts[task.id] && (
                            <>
                            {(() => {
                                const content = (
                                    <div className={`p-2 rounded-lg border transition-all relative group ${!task.isChallengeCompleted && col.id !== 'doing' ? 'mt-2 mb-2' : ''} ${task.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'}`}>
                                         {task.isChallengeCompleted ? (
                                            <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                                               <StaticChallengeRenderer content={task.activeChallenge || ''} mode="history" />
                                            </div>
                                         ) : (
                                            <>
                                                <div className="w-full">
                                                    <InteractiveChallenge 
                                                        content={task.activeChallenge || ''} 
                                                        onToggle={(idx) => toggleChallengeCheckbox(idx, task)} 
                                                    />
                                                </div>
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                                    <Tooltip content="Завершить челлендж">
                                                        <button 
                                                            onClick={(e) => toggleChallengeComplete(e, task)} 
                                                            className="w-5 h-5 flex items-center justify-center rounded-full border-2 border-indigo-200 dark:border-indigo-700 hover:border-emerald-500 text-transparent hover:text-emerald-500 transition-all"
                                                        >
                                                            <Check size={12} strokeWidth={3} />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            </>
                                         )}

                                        {task.isChallengeCompleted && hasChallengeAuthors && (
                                            <Tooltip content="Сгенерировать новый челлендж">
                                                <button 
                                                    onClick={(e) => generateChallenge(e, task.id, task.content)} 
                                                    disabled={generatingChallengeFor === task.id}
                                                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700/50 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold uppercase tracking-wide hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-70 disabled:cursor-not-allowed"
                                                >
                                                    <RotateCw size={12} className={generatingChallengeFor === task.id ? "animate-spin" : ""} /> 
                                                    Новый челлендж
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                );

                                if (col.id === 'doing') {
                                    return (
                                        <div className="mt-2 mb-2">
                                            <CollapsibleSection title={task.isChallengeCompleted ? "Челлендж (Готов)" : "Челлендж"} icon={<Zap size={12}/>} isCard>
                                                {content}
                                            </CollapsibleSection>
                                        </div>
                                    );
                                } else {
                                    return <div className="mt-2 mb-2">{content}</div>;
                                }
                            })()}
                            </>
                        )}

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
                            <div className="flex gap-2 items-center justify-end">
                               {col.id === 'todo' && (
                                    <Tooltip content="Взять в работу">
                                        <button 
                                            onClick={(e) => moveToDoing(e, task)} 
                                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors"
                                        >
                                            <Play size={18} className="fill-current" />
                                        </button>
                                    </Tooltip>
                               )}

                               {col.id === 'doing' && (
                                   <>
                                   <Tooltip content={hasJournalEntry ? "В Дневнике" : "В Дневник"}>
                                       <button 
                                            onClick={(e) => { e.stopPropagation(); onReflectInJournal(task.id); }}
                                            className={`p-2 rounded-lg border transition-colors ${
                                                hasJournalEntry 
                                                ? 'border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40' 
                                                : 'border-transparent text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-100'
                                            }`}
                                       >
                                            <Book size={18} />
                                       </button>
                                   </Tooltip>

                                   {!challengeDrafts[task.id] && hasChallengeAuthors && (
                                       <Tooltip content="Челлендж (ИИ)">
                                           <button 
                                                onClick={(e) => {
                                                    if (task.activeChallenge && !task.isChallengeCompleted) {
                                                        e.stopPropagation();
                                                        alert("Необходимо завершить активный челлендж");
                                                        return;
                                                    }
                                                    generateChallenge(e, task.id, task.content);
                                                }} 
                                                disabled={generatingChallengeFor === task.id} 
                                                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors disabled:opacity-50"
                                           >
                                                <Zap size={18} className={generatingChallengeFor === task.id ? "opacity-50" : ""} />
                                            </button>
                                       </Tooltip>
                                   )}

                                   {hasKanbanTherapist && (
                                       <Tooltip content="Консультант (ИИ)">
                                           <button 
                                                onClick={(e) => openTherapy(e, task)} 
                                                className="p-2 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg border border-transparent hover:border-violet-100 dark:hover:border-violet-800"
                                           >
                                               <Bot size={18} /> 
                                           </button>
                                       </Tooltip>
                                   )}
                                   </>
                               )}
                               
                               {col.id === 'done' && (
                                    <Tooltip content="В Зал славы">
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if(window.confirm('Перенести задачу в Зал славы?')) archiveTask(task.id); 
                                            }} 
                                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors"
                                        >
                                            <History size={18} /> 
                                        </button>
                                    </Tooltip>
                               )}

                               <Tooltip content="Удалить">
                                   <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if(window.confirm('Удалить задачу?')) deleteTask(task.id); 
                                        }} 
                                        className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-transparent hover:border-red-100 dark:hover:border-red-800 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                               </Tooltip>

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
        
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 scrollbar-none">
             <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                 <button onClick={() => setFilterChallenge('all')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterChallenge === 'all' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>Все</button>
                 <button onClick={() => setFilterChallenge('active')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterChallenge === 'active' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>Активные</button>
                 <button onClick={() => setFilterChallenge('none')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterChallenge === 'none' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>Обычные</button>
             </div>
             
             <button onClick={toggleSortOrder} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400">
                 {sortOrder === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
             </button>
        </div>
      </header>

      {/* Columns */}
      <div className="flex-1 overflow-hidden p-4 md:p-8 pt-4">
          {/* Mobile Tabs */}
          <div className="md:hidden flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 shrink-0">
             {columns.map(c => (
                 <button key={c.id} onClick={() => setActiveMobileCol(c.id as any)} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeMobileCol === c.id ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                     {c.title}
                 </button>
             ))}
          </div>

          <div className="h-full flex gap-4 md:gap-6 overflow-x-auto overflow-y-hidden custom-scrollbar-light snap-x snap-mandatory">
              {/* Desktop: All Columns. Mobile: Active Column */}
              <div className="hidden md:contents">
                  {columns.map(col => (
                      <div key={col.id} className="flex-1 min-w-[320px] h-full min-h-0 snap-center">
                          {renderColumn(col)}
                      </div>
                  ))}
              </div>
              <div className="md:hidden w-full h-full min-h-0">
                  {renderColumn(columns.find(c => c.id === activeMobileCol)!)}
              </div>
          </div>
      </div>

      {/* Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
               {/* Modal Content Logic */}
               {(() => {
                   const task = tasks.find(t => t.id === activeModal.taskId);
                   if (!task) return null;

                   return (
                       <>
                           <div className="flex justify-between items-start mb-6">
                               <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                   {activeModal.type === 'stuck' ? 'Терапия продуктивности' : 'Детали задачи'}
                               </h3>
                               <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24}/></button>
                           </div>

                           <div className="mb-6">
                               <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
                                   <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                       <ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown>
                                   </div>
                               </div>
                               
                               {/* Subtasks Section for Details Modal */}
                               {activeModal.type === 'details' && (
                                   <div className="mb-6">
                                       {/* DEFAULT CLOSED (isOpen=false implied by default) */}
                                       <CollapsibleSection title={`Чек-лист (${task.subtasks?.filter(s => s.isCompleted).length || 0}/${task.subtasks?.length || 0})`} icon={<ListTodo size={14}/>}>
                                           <div className="space-y-2 mb-3">
                                               {task.subtasks?.map(subtask => (
                                                   <div key={subtask.id} className="flex items-start gap-2 group min-h-[28px] items-center">
                                                       <button onClick={() => handleToggleSubtask(subtask.id)} className={`mt-0.5 shrink-0 ${subtask.isCompleted ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500'}`}>
                                                           {subtask.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                                       </button>
                                                       <span className={`text-sm flex-1 break-words min-w-0 ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{subtask.text}</span>
                                                       
                                                       <div className="flex items-center gap-1">
                                                           <Tooltip content={subtask.isPinned ? "Открепить от карточки" : "Закрепить на карточке"}>
                                                                <button 
                                                                    onClick={() => handleToggleSubtaskPin(subtask.id)} 
                                                                    className={`p-1.5 rounded-lg transition-all ${
                                                                        subtask.isPinned 
                                                                        ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 opacity-100' 
                                                                        : 'text-slate-300 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100'
                                                                    }`}
                                                                >
                                                                    <Pin size={14} className={subtask.isPinned ? "fill-current" : ""} />
                                                                </button>
                                                           </Tooltip>
                                                           <button 
                                                               onClick={() => handleDeleteSubtask(subtask.id)} 
                                                               className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                           >
                                                               <X size={14}/>
                                                           </button>
                                                       </div>
                                                   </div>
                                               ))}
                                           </div>
                                           
                                           <div className="flex gap-2">
                                               <input 
                                                   type="text" 
                                                   placeholder="Добавить подзадачу..." 
                                                   className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                                   value={newSubtaskText}
                                                   onChange={(e) => setNewSubtaskText(e.target.value)}
                                                   onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                               />
                                               <button onClick={handleAddSubtask} className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40"><Plus size={18}/></button>
                                           </div>
                                       </CollapsibleSection>
                                   </div>
                               )}

                               {getTaskForModal()?.activeChallenge && (
                                  <CollapsibleSection 
                                    title={getTaskForModal()?.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"} 
                                    icon={<Zap size={14}/>}
                                    actions={
                                        <button onClick={(e) => { e.stopPropagation(); deleteActiveChallenge(); }} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    }
                                  >
                                     <div className={`p-3 rounded-lg border relative group ${getTaskForModal()?.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'}`}>
                                        
                                        {!getTaskForModal()?.isChallengeCompleted && (
                                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Tooltip content="Завершить челлендж">
                                                    <button 
                                                        onClick={(e) => { 
                                                            const t = getTaskForModal();
                                                            if (t) toggleChallengeComplete(e, t); 
                                                        }}
                                                        className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-transparent hover:text-emerald-500 flex items-center justify-center transition-all shadow-sm"
                                                    >
                                                        <Check size={14} strokeWidth={3} />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        )}

                                        <span className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${getTaskForModal()?.isChallengeCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                           {getTaskForModal()?.isChallengeCompleted ? 'Статус: Выполнен' : 'Статус: Активен'}
                                        </span>
                                        
                                        {getTaskForModal()?.isChallengeCompleted ? (
                                            <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                                              <StaticChallengeRenderer content={getTaskForModal()?.activeChallenge || ''} mode="history" />
                                            </div>
                                        ) : (
                                            <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                                              <InteractiveChallenge 
                                                content={getTaskForModal()?.activeChallenge || ''} 
                                                onToggle={(idx) => {
                                                    if (getTaskForModal()) {
                                                        toggleChallengeCheckbox(idx, getTaskForModal()!);
                                                    }
                                                }}
                                                onPin={(idx) => handleToggleChallengeStepPin(idx)}
                                                pinnedIndices={getTaskForModal()?.pinnedChallengeIndices} 
                                              />
                                            </div>
                                        )}
                                     </div>
                                  </CollapsibleSection>
                                )}

                                {getTaskForModal()?.challengeHistory && getTaskForModal()!.challengeHistory!.length > 0 && (
                                  <CollapsibleSection title="История Челленджей" icon={<History size={14}/>}>
                                     <div className="space-y-4">
                                        {getTaskForModal()!.challengeHistory!.map((challenge, index) => (
                                           <div key={index} className="py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 relative group">
                                              <div className="absolute right-0 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button onClick={() => deleteChallengeFromHistory(index)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                              </div>
                                              <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200 pr-6">
                                                 <StaticChallengeRenderer content={challenge} mode="history" />
                                              </div>
                                           </div>
                                        ))}
                                     </div>
                                  </CollapsibleSection>
                                )}
                                
                                {getTaskForModal()?.consultationHistory && getTaskForModal()!.consultationHistory!.length > 0 && (
                                  <CollapsibleSection title="История консультаций" icon={<Bot size={14}/>}>
                                     <ul className="space-y-4">
                                        {getTaskForModal()!.consultationHistory!.map((consultation, index) => (
                                           <li key={index} className="text-sm text-slate-900 dark:text-slate-200 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0 relative group">
                                              <div className="absolute right-0 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button onClick={() => deleteConsultation(index)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                                              </div>
                                              <div className="pr-6">
                                                  <ReactMarkdown components={markdownComponents}>{consultation}</ReactMarkdown>
                                              </div>
                                           </li>
                                        ))}
                                     </ul>
                                  </CollapsibleSection>
                                )}

                               {activeModal.type === 'stuck' && (
                                   <div className="space-y-4">
                                       {isLoading ? (
                                           <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                               <div className="animate-spin mb-2"><RotateCw size={24} /></div>
                                               <p className="text-xs">Анализируем контекст...</p>
                                           </div>
                                       ) : aiResponse ? (
                                           <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/50">
                                               <div className="flex items-center gap-2 mb-2 text-violet-600 dark:text-violet-400 font-bold text-xs uppercase"><Bot size={14} /> Совет Консультанта</div>
                                               <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed"><ReactMarkdown components={markdownComponents}>{aiResponse}</ReactMarkdown></div>
                                           </div>
                                       ) : null}
                                       
                                       {aiResponse && (
                                           <button onClick={saveTherapyResponse} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"><Save size={18} /> Сохранить в историю</button>
                                       )}
                                   </div>
                               )}
                           </div>
                           
                           {activeModal.type === 'details' && (
                               <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                                   <button onClick={() => setActiveModal(null)} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 font-medium">Готово</button>
                               </div>
                           )}
                       </>
                   );
               })()}
            </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;