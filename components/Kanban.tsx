
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCw, Play, FileText, Check, Archive as ArchiveIcon, ChevronLeft, ChevronRight, History, Trash2, Plus, Minus, Book, Save, ArrowDown, ArrowUp, Square, CheckSquare, Circle, XCircle, Kanban as KanbanIcon } from 'lucide-react';
import EmptyState from './EmptyState';

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

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  isCard?: boolean;
}> = ({ title, children, icon, isCard = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`${isCard ? 'bg-slate-50/80 dark:bg-slate-800/50 mb-2 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 mb-3'} rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden`}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className={`w-full flex items-center justify-between ${isCard ? 'p-2' : 'p-4'} text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors`}
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
        <div className={`${isCard ? 'px-2 pb-2' : 'px-4 pb-4'} pt-0 animate-in slide-in-from-top-1 duration-200`}>
           <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-sm">
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const ProgressBar: React.FC<{ percent: number }> = ({ percent }) => {
    const isComplete = percent === 100;
    
    let barGradient = "bg-gradient-to-r from-indigo-400 to-purple-500";
    let textColor = "text-purple-600 dark:text-purple-400";
    let shadowClass = "shadow-purple-500/30";

    if (isComplete) {
        barGradient = "bg-gradient-to-r from-emerald-400 to-teal-500";
        textColor = "text-emerald-600 dark:text-emerald-400";
        shadowClass = "shadow-emerald-500/30";
    } else if (percent < 30) {
        barGradient = "bg-gradient-to-r from-blue-400 to-indigo-400";
        textColor = "text-indigo-500 dark:text-indigo-400";
        shadowClass = "shadow-indigo-500/30";
    }

    return (
        <div className="w-full px-0.5 mb-3 mt-1">
            <div className="flex justify-between items-end mb-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider opacity-90 flex items-center gap-1">
                    Прогресс
                </span>
                <span className={`text-[10px] font-extrabold ${textColor} transition-colors duration-500`}>
                    {percent}%
                </span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner ring-1 ring-slate-100/50 dark:ring-slate-700/50">
                <div 
                    className={`h-full ${barGradient} transition-all duration-700 ease-out rounded-full shadow-[0_0_10px] ${shadowClass} relative`} 
                    style={{ width: `${percent}%` }} 
                >
                    <div className="absolute top-0 left-0 w-full h-[40%] bg-white/30 rounded-t-full"></div>
                </div>
            </div>
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
    onToggle: (index: number) => void 
}> = ({ content, onToggle }) => {
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
            renderedParts.push(
                <button 
                    key={`cb-${i}`}
                    onClick={(e) => { e.stopPropagation(); onToggle(currentIdx); }}
                    className="flex items-start gap-2 w-full text-left py-1 hover:bg-black/5 dark:hover:bg-white/5 rounded group px-1 mb-0.5"
                    style={{ marginLeft: `${indent}px` }}
                >
                    <div className={`mt-0.5 shrink-0 ${isChecked ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-400'}`}>
                        {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </div>
                    <span className={`text-sm ${isChecked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{label}</ReactMarkdown>
                    </span>
                </button>
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
            alert('Сначала завершите активный челлендж!');
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
  
  const moveToDoing = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      if (!canMoveTask(task, 'doing')) return;
      updateTask({ ...task, column: 'doing' });
  };

  const getTaskForModal = () => tasks.find(t => t.id === activeModal?.taskId);

  const renderColumn = (col: typeof columns[0]) => {
    if (!col) return null;
    const tasksInCol = activeTasks.filter(t => t.column === col.id);
    
    return (
    <div key={col.id} className={`bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl flex flex-col h-full border-t-4 ${col.color} p-2 md:p-3 min-h-0 overflow-hidden`} onDrop={(e) => handleColumnDrop(e, col.id)} onDragOver={handleDragOver}>
        <h3 className="font-semibold text-slate-600 dark:text-slate-400 mb-3 flex justify-between items-center text-sm px-1 shrink-0">{col.title} <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-full">{tasksInCol.length}</span></h3>
        <div className="flex-1 overflow-y-auto space-y-3 pb-20 md:pb-2 min-h-0 px-1 custom-scrollbar-light">
            {tasksInCol.length === 0 ? (
                <div className="py-10">
                   <EmptyState 
                        icon={KanbanIcon} 
                        title="Пусто" 
                        description="Перетащите задачи сюда." 
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

                    const challengeStats = task.activeChallenge ? getChallengeStats(task.activeChallenge) : { total: 0, checked: 0, percent: 0 };
                    const hasJournalEntry = journalEntries.some(e => e.linkedTaskId === task.id);
                    
                    return (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} onDrop={(e) => handleTaskDrop(e, task.id)} onDragOver={handleDragOver} onClick={() => setActiveModal({taskId: task.id, type: 'details'})} className={`bg-white dark:bg-[#1e293b] p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all cursor-default relative group ${borderClass}`}>
                        
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>{statusText}</span>
                            <div className="flex items-center gap-2">
                                {StatusIcon && <div className={statusColor}><StatusIcon size={14} fill={task.isChallengeCompleted ? "none" : "currentColor"} /></div>}
                            </div>
                        </div>

                        <div className="mb-3"><div className={`text-slate-800 dark:text-slate-200 font-normal text-sm leading-relaxed`}><ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown></div></div>
                        
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
                                    <div className={`p-2 rounded-lg border transition-all ${!task.isChallengeCompleted && col.id !== 'doing' ? 'mt-2 mb-2' : ''} ${task.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'}`}>
                                         {challengeStats.total > 0 && <ProgressBar percent={challengeStats.percent} />}
                                        
                                         {task.isChallengeCompleted ? (
                                            <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                                               <StaticChallengeRenderer content={task.activeChallenge || ''} mode="history" />
                                            </div>
                                         ) : (
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="w-full">
                                                    <InteractiveChallenge 
                                                        content={task.activeChallenge || ''} 
                                                        onToggle={(idx) => toggleChallengeCheckbox(idx, task)} 
                                                    />
                                                </div>
                                                <button onClick={(e) => toggleChallengeComplete(e, task)} className={`shrink-0 rounded-full w-5 h-5 flex items-center justify-center border transition-all mt-0.5 ${task.isChallengeCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-transparent border-indigo-300 dark:border-indigo-600 text-transparent hover:border-indigo-500'}`}><Check size={12} strokeWidth={3} /></button>
                                            </div>
                                         )}

                                        {task.isChallengeCompleted && hasChallengeAuthors && (
                                            <button 
                                                onClick={(e) => generateChallenge(e, task.id, task.content)} 
                                                disabled={generatingChallengeFor === task.id}
                                                className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700/50 text-emerald-600 dark:text-emerald-400 rounded text-[10px] font-bold uppercase tracking-wide hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                <RotateCw size={12} className={generatingChallengeFor === task.id ? "animate-spin" : ""} /> 
                                                Новый челлендж
                                            </button>
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
                                    <button 
                                        onClick={(e) => moveToDoing(e, task)} 
                                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors"
                                        title="Поработать"
                                    >
                                        <Play size={18} className="fill-current" />
                                    </button>
                               )}

                               {col.id === 'doing' && (
                                   <>
                                   <button 
                                        onClick={(e) => { e.stopPropagation(); onReflectInJournal(task.id); }}
                                        className={`p-2 rounded-lg border transition-colors ${
                                            hasJournalEntry 
                                            ? 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40' 
                                            : 'border-transparent text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-100'
                                        }`}
                                        title={hasJournalEntry ? "В «Дневнике»" : "В «Дневник»"}
                                   >
                                        <Book size={18} />
                                   </button>

                                   {!challengeDrafts[task.id] && hasChallengeAuthors && (
                                       <button 
                                            onClick={(e) => {
                                                if (task.activeChallenge && !task.isChallengeCompleted) {
                                                    e.stopPropagation();
                                                    alert("Сначала завершите активный челлендж!");
                                                    return;
                                                }
                                                generateChallenge(e, task.id, task.content);
                                            }} 
                                            disabled={generatingChallengeFor === task.id} 
                                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors disabled:opacity-50"
                                            title="Челлендж (ИИ)"
                                        >
                                            <Zap size={18} className={generatingChallengeFor === task.id ? "opacity-50" : ""} />
                                        </button>
                                   )}

                                   {hasKanbanTherapist && (
                                       <button 
                                            onClick={(e) => openTherapy(e, task)} 
                                            className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg border border-transparent hover:border-amber-100 dark:hover:border-amber-800"
                                            title="Консультант (ИИ)"
                                       >
                                           <MessageCircle size={18} /> 
                                       </button>
                                   )}
                                   </>
                               )}
                               
                               {col.id === 'done' && (
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if(window.confirm('Перенести задачу в "Архив"?')) archiveTask(task.id); 
                                        }} 
                                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-colors"
                                        title='В "Архив"'
                                    >
                                        <History size={18} /> 
                                    </button>
                               )}

                               <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if(window.confirm('Удалить задачу?')) deleteTask(task.id); 
                                    }} 
                                    className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-transparent hover:border-red-100 dark:hover:border-red-800 transition-colors"
                                    title="Удалить"
                                >
                                    <Trash2 size={18} />
                                </button>

                            </div>
                            <div className="flex gap-2 items-center justify-between">
                                <div className="w-8 flex justify-start">{col.id !== 'todo' && <button onClick={(e) => moveTask(e, task, 'left')} className="p-1.5 bg-slate-100 dark:bg-slate-700 md:hidden rounded-lg text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600"><ChevronLeft size={16} /></button>}</div>
                                <div className="w-8 flex justify-end">{col.id !== 'done' && <button onClick={(e) => moveTask(e, task, 'right')} className="p-1.5 bg-slate-100 dark:bg-slate-700 md:hidden rounded-lg text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600"><ChevronRight size={16} /></button>}</div>
                            </div>
                        </div>
                    </div>
                )})}
            )}
        </div>
    </div>
    );
  };

  return (
    <div className="h-full p-3 md:p-8 flex flex-col overflow-hidden relative">
      <header className="mb-4 shrink-0"><h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Действия <span className="text-emerald-500 text-sm md:text-lg">/ От слов к делу</span></h1></header>
      
      <div className="flex flex-wrap gap-2 mb-4 animate-in slide-in-from-top-2 shrink-0">
         <div className="flex bg-white dark:bg-[#1e293b] p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
             <button onClick={toggleSortOrder} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
                 {sortOrder === 'desc' && <><ArrowDown size={14} /> Сначала новые</>}
                 {sortOrder === 'asc' && <><ArrowUp size={14} /> Сначала старые</>}
             </button>
         </div>
         <div className="flex bg-white dark:bg-[#1e293b] p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <button onClick={() => setFilterChallenge('all')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filterChallenge === 'all' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Все</button>
            <button onClick={() => setFilterChallenge('active')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${filterChallenge === 'active' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-indigo-500'}`}><Zap size={12}/> Активные</button>
            <button onClick={() => setFilterChallenge('completed')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${filterChallenge === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-emerald-500'}`}><CheckCircle2 size={12}/> Финал</button>
         </div>
         <div className="flex bg-white dark:bg-[#1e293b] p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
             <button onClick={() => setFilterJournal(filterJournal === 'all' ? 'linked' : 'all')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${filterJournal === 'linked' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-amber-100 dark:ring-amber-900/30' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50/50'}`}><Book size={12}/> В дневнике</button>
         </div>
      </div>
      
      <div className="flex md:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4 shrink-0">{columns.map(col => (<button key={col.id} onClick={() => setActiveMobileCol(col.id as any)} className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${activeMobileCol === col.id ? 'bg-white dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-400'}`}>{col.title} ({activeTasks.filter(t => t.column === col.id).length})</button>))}</div>
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="md:hidden h-full flex flex-col">{renderColumn(columns.find(c => c.id === activeMobileCol) || columns[0])}</div>
        <div className="hidden md:grid grid-cols-3 gap-6 h-full">{columns.map(col => renderColumn(col))}</div>
      </div>
      {activeModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        {activeModal.type === 'details' && 'Детали задачи'}
                        {activeModal.type !== 'details' && 'ИИ-консультант'}
                    </h3>
                    <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
                </div>
                {activeModal.type === 'details' ? (
                     <div className="space-y-4">
                        <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
                            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block mb-3">Задача</span>
                            <div className="text-sm text-slate-800 dark:text-slate-200 font-normal leading-relaxed">
                                <ReactMarkdown components={markdownComponents}>{getTaskForModal()?.content}</ReactMarkdown>
                            </div>
                        </div>

                        {getTaskForModal()?.description && (
                            <CollapsibleSection title="Источник" icon={<FileText size={14}/>}>
                                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                     <ReactMarkdown components={markdownComponents}>{getTaskForModal()?.description}</ReactMarkdown>
                                </div>
                            </CollapsibleSection>
                        )}
                        
                        {getTaskForModal()?.activeChallenge && (
                          <CollapsibleSection 
                            title={getTaskForModal()?.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"} 
                            icon={<Zap size={14}/>}
                          >
                             <div className={`p-3 rounded-lg border ${getTaskForModal()?.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'}`}>
                                
                                {getChallengeStats(getTaskForModal()?.activeChallenge || '').total > 0 && (
                                     <div className="mb-4 bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                                        <ProgressBar percent={getChallengeStats(getTaskForModal()?.activeChallenge || '').percent} />
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
                                   <div key={index} className="py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                      <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                                         <StaticChallengeRenderer content={challenge} mode="history" />
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </CollapsibleSection>
                        )}
                        
                        {getTaskForModal()?.consultationHistory && getTaskForModal()!.consultationHistory!.length > 0 && (
                          <CollapsibleSection title="История консультаций" icon={<MessageCircle size={14}/>}>
                             <ul className="space-y-4">
                                {getTaskForModal()!.consultationHistory!.map((consultation, index) => (
                                   <li key={index} className="text-sm text-slate-900 dark:text-slate-200 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                      <ReactMarkdown components={markdownComponents}>{consultation}</ReactMarkdown>
                                   </li>
                                ))}
                             </ul>
                          </CollapsibleSection>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-700"><div>ID: <span className="font-mono">{getTaskForModal()?.id}</span></div><div>Создано: {new Date(getTaskForModal()?.createdAt || 0).toLocaleDateString()}</div></div>
                     </div>
                ) : (
                    <>
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl min-h-[120px] mb-6">
                            {isLoading ? (
                                <div className="flex items-center gap-2 text-slate-500"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"/> ИИ думает...</div>
                            ) : (
                                <div className="text-slate-800 dark:text-slate-200 leading-relaxed text-sm"><ReactMarkdown components={markdownComponents}>{aiResponse}</ReactMarkdown></div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            {aiResponse && !isLoading && (
                                <button onClick={saveTherapyResponse} className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg font-medium border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                                    <Save size={16} /> Сохранить в историю
                                </button>
                            )}
                            <button onClick={() => setActiveModal(null)} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 font-medium">
                                Закрыть
                            </button>
                        </div>
                    </>
                )}
            </div>
            <div className="absolute inset-0 z-[-1]" onClick={() => setActiveModal(null)} />
        </div>
      )}
    </div>
  );
};
export default Kanban;
