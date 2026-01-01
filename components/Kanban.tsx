
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { applyTypography, SPHERES, ICON_MAP } from '../constants';
import { Plus, MoreHorizontal, X, Check, Trash2, Calendar, Zap, Bot, ArrowRight, Clock, AlertCircle, GripVertical, CheckCircle2, Circle, RotateCcw, RotateCw, Heading1, Heading2, Bold, Italic, Eraser, ListTodo, FileText, History, Trophy, MessageCircle, Minus, ChevronDown, Lock, PenTool } from 'lucide-react';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';

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

const NEON_COLORS: Record<string, string> = {
    productivity: '#818cf8', // Indigo
    growth: '#34d399',      // Emerald
    relationships: '#fb7185' // Rose
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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-base font-bold mt-3 mb-2 tracking-tight" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-sm font-bold mt-2 mb-2 tracking-tight" {...props}>{cleanHeader(children)}</h2>,
    h3: ({node, children, ...props}: any) => <h3 className="text-xs font-bold mt-2 mb-1 uppercase tracking-wide" {...props}>{cleanHeader(children)}</h3>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-indigo-200 dark:border-indigo-800 pl-4 py-1 my-2 text-sm italic bg-indigo-50/30 dark:bg-indigo-900/20 rounded-r-lg" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700" {...props}>{children}</code>
            : <code className="block bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

// --- HELPERS ---

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
}> = ({ title, children, icon, defaultOpen = false, actions }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-3">
      <div className="w-full flex items-center justify-between p-3">
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="flex-1 flex items-center gap-2 text-left hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {icon}
            {title}
            </div>
            <div className="text-slate-400">
            {isOpen ? <Minus size={12} /> : <Plus size={12} />}
            </div>
          </button>
          {actions && <div className="pl-2">{actions}</div>}
      </div>
      {isOpen && (
        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-1 duration-200">
           <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-sm">
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const SegmentedProgressBar: React.FC<{ total: number, current: number, color: string }> = ({ total, current, color }) => {
    return (
        <div className="flex gap-1 h-1.5 mb-3 w-full">
            {Array.from({ length: total }).map((_, i) => (
                <div 
                    key={i} 
                    className={`flex-1 rounded-full transition-all duration-300 ${i < current ? color.replace('text-', 'bg-') : 'bg-slate-200 dark:bg-slate-700'}`}
                />
            ))}
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
                Icon = CheckCircle2; // Changed from XCircle for history to look positive if completed
                iconClass = "text-slate-400";
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

const InteractiveChallenge: React.FC<{
    content: string;
    onToggle: (lineIndex: number) => void;
    onPin?: (lineIndex: number) => void;
    pinnedIndices?: number[];
}> = ({ content, onToggle, onPin, pinnedIndices = [] }) => {
    const lines = content.split('\n');
    return (
        <div className="space-y-1">
            {lines.map((line, i) => {
                const match = line.match(/^(\s*)(?:[-*+]|\d+\.)?\s*\[([ xX])\]\s+(.*)/);
                if (match) {
                    const indent = match[1].length * 8; // approx px per space
                    const isChecked = match[2].toLowerCase() === 'x';
                    const text = match[3];
                    const isPinned = pinnedIndices.includes(i);

                    return (
                        <div key={i} className="flex items-start gap-2 group hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded p-1 transition-colors relative" style={{ marginLeft: `${indent}px` }}>
                            <button onClick={() => onToggle(i)} className={`mt-0.5 shrink-0 ${isChecked ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500'}`}>
                                {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            </button>
                            <span className={`text-sm flex-1 ${isChecked ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{text}</ReactMarkdown>
                            </span>
                            {onPin && (
                                <button 
                                    onClick={() => onPin(i)} 
                                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${isPinned ? 'opacity-100 text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}
                                >
                                    <Zap size={12} className={isPinned ? "fill-current" : ""} />
                                </button>
                            )}
                        </div>
                    );
                } else if (line.trim()) {
                    return <div key={i} className="text-sm text-slate-600 dark:text-slate-400 py-1 pl-1"><ReactMarkdown components={markdownComponents}>{line}</ReactMarkdown></div>;
                }
                return null;
            })}
        </div>
    );
};

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [activeModal, setActiveModal] = useState<{ type: 'details' | 'therapy' | null, taskId: string | null }>({ type: null, taskId: null });
  const [therapyType, setTherapyType] = useState<'stuck' | 'completed'>('stuck');
  const [isGenerating, setIsGenerating] = useState(false);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  
  // Editor State
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const editContentEditableRef = useRef<HTMLDivElement>(null);
  const [editHistory, setEditHistory] = useState<string[]>(['']);
  const [editHistoryIndex, setEditHistoryIndex] = useState(0);
  const editHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialTaskId) {
      const task = tasks.find(t => t.id === initialTaskId);
      if (task) {
        openTaskDetails(task);
        if (onClearInitialTask) onClearInitialTask();
      }
    }
  }, [initialTaskId, tasks]);

  // RICH TEXT LOGIC
  const saveEditHistorySnapshot = (content: string) => {
      if (content === editHistory[editHistoryIndex]) return;
      const newHistory = editHistory.slice(0, editHistoryIndex + 1);
      newHistory.push(content);
      if (newHistory.length > 50) newHistory.shift();
      setEditHistory(newHistory);
      setEditHistoryIndex(newHistory.length - 1);
  };

  const handleEditInput = () => {
      if (editHistoryTimeoutRef.current) clearTimeout(editHistoryTimeoutRef.current);
      editHistoryTimeoutRef.current = setTimeout(() => {
          saveEditHistorySnapshot(editContentEditableRef.current?.innerHTML || '');
      }, 500);
  };

  const execEditCmd = (command: string, value: string | undefined = undefined) => {
      document.execCommand(command, false, value);
      if (editContentEditableRef.current) {
          editContentEditableRef.current.focus();
          saveEditHistorySnapshot(editContentEditableRef.current.innerHTML);
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

  // HANDLERS
  const getTaskForModal = () => tasks.find(t => t.id === activeModal.taskId);

  const openTaskDetails = (task: Task) => {
      setActiveModal({ type: 'details', taskId: task.id });
      setEditTaskTitle(task.title || '');
      setEditHistory([task.content || '']); // Simple text for now, could be HTML conversion if stored as HTML
      setEditHistoryIndex(0);
      setIsEditingTask(false);
  };

  const handleSaveTaskContent = () => {
      const task = getTaskForModal();
      if (!task) return;
      
      const content = editContentEditableRef.current?.innerText || ''; // Saving as plain text/markdown for now to match app style
      
      updateTask({
          ...task,
          title: editTaskTitle,
          content: content
      });
      setIsEditingTask(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('taskId', id);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, column: 'todo' | 'doing' | 'done') => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) {
          const task = tasks.find(t => t.id === taskId);
          if (task && task.column !== column) {
              updateTask({ ...task, column });
          }
      }
  };

  // SUBTASKS
  const handleAddSubtask = () => {
      const task = getTaskForModal();
      if (!task || !newSubtaskText.trim()) return;
      const newSubtask: Subtask = {
          id: Date.now().toString(),
          text: newSubtaskText,
          isCompleted: false
      };
      updateTask({ ...task, subtasks: [...(task.subtasks || []), newSubtask] });
      setNewSubtaskText('');
  };

  const handleToggleSubtask = (subtaskId: string) => {
      const task = getTaskForModal();
      if (!task || !task.subtasks) return;
      const updatedSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s);
      updateTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
      const task = getTaskForModal();
      if (!task || !task.subtasks) return;
      updateTask({ ...task, subtasks: task.subtasks.filter(s => s.id !== subtaskId) });
  };

  const handleSubtaskDragStart = (e: React.DragEvent, subtaskId: string, parentTaskId: string) => {
      e.dataTransfer.setData('subtaskId', subtaskId);
      e.dataTransfer.setData('parentTaskId', parentTaskId);
      e.stopPropagation();
  };

  const handleSubtaskDrop = (e: React.DragEvent, targetSubtaskId: string, task: Task) => {
      e.preventDefault();
      e.stopPropagation();
      const draggedSubtaskId = e.dataTransfer.getData('subtaskId');
      const parentTaskId = e.dataTransfer.getData('parentTaskId');
      
      if (parentTaskId !== task.id || !task.subtasks) return;

      const subtasks = [...task.subtasks];
      const draggedIndex = subtasks.findIndex(s => s.id === draggedSubtaskId);
      const targetIndex = subtasks.findIndex(s => s.id === targetSubtaskId);

      if (draggedIndex >= 0 && targetIndex >= 0) {
          const [removed] = subtasks.splice(draggedIndex, 1);
          subtasks.splice(targetIndex, 0, removed);
          updateTask({ ...task, subtasks });
      }
  };

  // CHALLENGES
  const toggleChallengeCheckbox = (lineIndex: number, task: Task) => {
      if (!task.activeChallenge) return;
      const lines = task.activeChallenge.split('\n');
      const line = lines[lineIndex];
      const match = line.match(/^(\s*)(?:[-*+]|\d+\.)?\s*\[([ xX])\]\s+(.*)/);
      if (match) {
          const isChecked = match[2].toLowerCase() === 'x';
          const newLine = `${match[1]}- [${isChecked ? ' ' : 'x'}] ${match[3]}`;
          lines[lineIndex] = newLine;
          updateTask({ ...task, activeChallenge: lines.join('\n') });
      }
  };

  const toggleChallengeComplete = () => {
      const task = getTaskForModal();
      if (task) {
          // If completing, move to history? Or just mark completed?
          // Logic: If marking completed, snapshot to history if user wants, or just toggle flag.
          // App logic seems to toggle flag.
          if (!task.isChallengeCompleted) {
              // Completing
              if (window.confetti) window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }
          updateTask({ ...task, isChallengeCompleted: !task.isChallengeCompleted });
      }
  };

  const deleteActiveChallenge = (e: React.MouseEvent) => {
      e.stopPropagation();
      const task = getTaskForModal();
      if (task && confirm("Удалить текущий челлендж?")) {
          // Archive to history before deleting?
          const newHistory = task.activeChallenge ? [...(task.challengeHistory || []), task.activeChallenge] : task.challengeHistory;
          updateTask({ ...task, activeChallenge: undefined, isChallengeCompleted: false, pinnedChallengeIndices: [], challengeHistory: newHistory });
      }
  };

  const handleToggleChallengeStepPin = (lineIndex: number) => {
      const task = getTaskForModal();
      if (!task) return;
      const currentPins = task.pinnedChallengeIndices || [];
      const newPins = currentPins.includes(lineIndex) ? currentPins.filter(i => i !== lineIndex) : [...currentPins, lineIndex];
      updateTask({ ...task, pinnedChallengeIndices: newPins });
  };

  const deleteChallengeFromHistory = (index: number) => {
      const task = getTaskForModal();
      if (task && task.challengeHistory) {
          const newHistory = [...task.challengeHistory];
          newHistory.splice(index, 1);
          updateTask({ ...task, challengeHistory: newHistory });
      }
  };

  // CONSULTATIONS
  const deleteConsultation = (index: number) => {
      const task = getTaskForModal();
      if (task && task.consultationHistory) {
          const newHistory = [...task.consultationHistory];
          newHistory.splice(index, 1);
          updateTask({ ...task, consultationHistory: newHistory });
      }
  };

  // AI ACTIONS
  const handleGenerateChallenge = async () => {
      const task = getTaskForModal();
      if (!task) return;
      if (task.activeChallenge && !confirm("Заменить текущий челлендж новым?")) return;

      setIsGenerating(true);
      try {
          const challenge = await generateTaskChallenge(task.content, config);
          updateTask({ 
              ...task, 
              activeChallenge: challenge, 
              isChallengeCompleted: false, 
              pinnedChallengeIndices: [] 
          });
      } finally {
          setIsGenerating(false);
      }
  };

  const handleGetTherapy = async () => {
      const task = getTaskForModal();
      if (!task) return;
      setIsGenerating(true);
      try {
          const advice = await getKanbanTherapy(task.content, therapyType, config);
          const newHistory = [advice, ...(task.consultationHistory || [])];
          updateTask({ ...task, consultationHistory: newHistory });
          setActiveModal({ ...activeModal, type: 'details' }); // Switch back to details to show result
      } finally {
          setIsGenerating(false);
      }
  };

  // --- RENDER HELPERS ---
  const activeTasks = tasks.filter(t => !t.isArchived);
  const todoTasks = activeTasks.filter(t => t.column === 'todo');
  const doingTasks = activeTasks.filter(t => t.column === 'doing');
  const doneTasks = activeTasks.filter(t => t.column === 'done');

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden relative">
        <header className="px-4 md:px-8 pt-4 md:pt-8 pb-4 shrink-0 flex justify-between items-center">
            <div>
                <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Фокус на действии</p>
            </div>
            <button 
                onClick={() => addTask({ id: Date.now().toString(), content: 'Новая задача', column: 'todo', createdAt: Date.now() })}
                className="bg-slate-900 dark:bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
                <Plus size={24} />
            </button>
        </header>

        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-8 pt-0">
            <div className="flex h-full gap-6 min-w-[900px] md:min-w-0">
                {/* COLUMN: TODO */}
                <div 
                    className="flex-1 flex flex-col min-w-[300px] bg-slate-100/50 dark:bg-slate-900/30 rounded-3xl p-4 border border-slate-200/50 dark:border-white/5"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'todo')}
                >
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="font-bold text-slate-500 dark:text-slate-400 uppercase text-xs tracking-widest flex items-center gap-2">
                            <Circle size={12} className="text-slate-400" /> Очередь <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] shadow-sm">{todoTasks.length}</span>
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar-light space-y-3 pr-1">
                        {todoTasks.map(task => (
                            <div 
                                key={task.id} 
                                draggable 
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onClick={() => openTaskDetails(task)}
                                className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer group transition-all relative overflow-hidden"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-400 transition-colors" />
                                {task.spheres && task.spheres.length > 0 && (
                                    <div className="flex gap-1 mb-2">
                                        {task.spheres.map(s => {
                                            const sp = SPHERES.find(x => x.id === s);
                                            return sp ? <div key={s} className={`w-2 h-2 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`} /> : null;
                                        })}
                                    </div>
                                )}
                                <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-3 leading-relaxed mb-2">{task.title || task.content}</h4>
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center gap-2">
                                        {task.activeChallenge && <Zap size={12} className={task.isChallengeCompleted ? "text-emerald-500" : "text-amber-500"} />}
                                        {task.subtasks && task.subtasks.length > 0 && (
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <ListTodo size={10} /> {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                                            </span>
                                        )}
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }} className="p-1 text-slate-300 hover:text-red-400"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {todoTasks.length === 0 && <EmptyState icon={Circle} title="" description="Нет задач" color="slate" />}
                    </div>
                </div>

                {/* COLUMN: DOING */}
                <div 
                    className="flex-1 flex flex-col min-w-[300px] bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl p-4 border border-indigo-100/50 dark:border-indigo-900/30"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'doing')}
                >
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-xs tracking-widest flex items-center gap-2">
                            <Clock size={12} className="animate-pulse" /> В работе <span className="bg-white dark:bg-indigo-900 px-2 py-0.5 rounded-full text-[10px] shadow-sm">{doingTasks.length}</span>
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar-light space-y-3 pr-1">
                        {doingTasks.map(task => (
                            <div 
                                key={task.id} 
                                draggable 
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onClick={() => openTaskDetails(task)}
                                className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-indigo-100 dark:border-indigo-900 shadow-md hover:shadow-lg cursor-pointer group transition-all relative overflow-hidden ring-1 ring-indigo-50 dark:ring-indigo-900/50"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
                                {task.spheres && task.spheres.length > 0 && (
                                    <div className="flex gap-1 mb-2">
                                        {task.spheres.map(s => {
                                            const sp = SPHERES.find(x => x.id === s);
                                            return sp ? <div key={s} className={`w-2 h-2 rounded-full ${sp.bg.replace('50', '400').replace('/30', '')}`} /> : null;
                                        })}
                                    </div>
                                )}
                                <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-3 leading-relaxed mb-2">{task.title || task.content}</h4>
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center gap-2">
                                        {task.activeChallenge && <Zap size={12} className={task.isChallengeCompleted ? "text-emerald-500" : "text-amber-500"} />}
                                        {task.subtasks && task.subtasks.length > 0 && (
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                <ListTodo size={10} /> {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {doingTasks.length === 0 && <EmptyState icon={Clock} title="" description="Фокус свободен" color="indigo" />}
                    </div>
                </div>

                {/* COLUMN: DONE */}
                <div 
                    className="flex-1 flex flex-col min-w-[300px] bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl p-4 border border-emerald-100/50 dark:border-emerald-900/30"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'done')}
                >
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-xs tracking-widest flex items-center gap-2">
                            <CheckCircle2 size={12} /> Готово <span className="bg-white dark:bg-emerald-900 px-2 py-0.5 rounded-full text-[10px] shadow-sm">{doneTasks.length}</span>
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar-light space-y-3 pr-1">
                        {doneTasks.map(task => (
                            <div 
                                key={task.id} 
                                draggable 
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onClick={() => openTaskDetails(task)}
                                className="bg-white/80 dark:bg-[#1e293b]/80 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900 shadow-sm hover:shadow-md cursor-pointer group transition-all relative overflow-hidden opacity-80 hover:opacity-100"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400" />
                                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed line-through decoration-slate-300">{task.title || task.content}</h4>
                                <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }} className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"><Trophy size={14} /></button>
                                </div>
                            </div>
                        ))}
                        {doneTasks.length === 0 && <EmptyState icon={CheckCircle2} title="" description="Нет завершенных" color="emerald" />}
                    </div>
                </div>
            </div>
        </div>

        {/* MODAL */}
        {activeModal.taskId && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setActiveModal({ type: null, taskId: null })}>
                <div 
                    className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start shrink-0">
                        <div>
                            {activeModal.type === 'details' ? (
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    {isEditingTask ? 'Редактирование' : 'Детали задачи'}
                                    {!isEditingTask && (
                                        <button onClick={() => setIsEditingTask(true)} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                            <PenTool size={16} />
                                        </button>
                                    )}
                                </h2>
                            ) : (
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Bot size={20}/> Канбан-Терапевт</h2>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {activeModal.type === 'details' && !isEditingTask && (
                                <>
                                    <Tooltip content="Канбан-Терапевт">
                                        <button onClick={() => setActiveModal({...activeModal, type: 'therapy'})} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"><Bot size={20}/></button>
                                    </Tooltip>
                                    <Tooltip content="Сгенерировать Челлендж">
                                        <button onClick={handleGenerateChallenge} disabled={isGenerating} className={`p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors ${isGenerating ? 'animate-spin' : ''}`}><Zap size={20}/></button>
                                    </Tooltip>
                                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                </>
                            )}
                            <button onClick={() => setActiveModal({ type: null, taskId: null })} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={20}/></button>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar-light">
                        {activeModal.type === 'therapy' && (
                            <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
                                <div className="mb-6 flex gap-4 justify-center">
                                    <button onClick={() => setTherapyType('stuck')} className={`px-4 py-3 rounded-xl border-2 flex items-center gap-2 font-bold transition-all ${therapyType === 'stuck' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-400 hover:border-indigo-300'}`}>
                                        <Lock size={18} /> Я застрял
                                    </button>
                                    <button onClick={() => setTherapyType('completed')} className={`px-4 py-3 rounded-xl border-2 flex items-center gap-2 font-bold transition-all ${therapyType === 'completed' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400 hover:border-emerald-300'}`}>
                                        <Trophy size={18} /> Я справился
                                    </button>
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                    <button onClick={handleGetTherapy} disabled={isGenerating} className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-lg hover:scale-105 transition-transform shadow-xl disabled:opacity-50 disabled:scale-100 flex items-center gap-3">
                                        {isGenerating ? <RotateCw className="animate-spin" /> : <Bot />}
                                        Получить совет
                                    </button>
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
                                        <div className="flex flex-col animate-in fade-in duration-200 relative z-10">
                                            <input 
                                                type="text" 
                                                placeholder="Название" 
                                                value={editTaskTitle} 
                                                onChange={(e) => setEditTaskTitle(e.target.value)} 
                                                className="px-0 pb-2 bg-transparent text-xl font-sans font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 outline-none border-b border-transparent focus:border-indigo-200 dark:focus:border-indigo-900/50 mb-4 transition-colors" 
                                            />
                                            
                                            {/* Editor Toolbar */}
                                            <div className="flex items-center justify-between mb-2 gap-2">
                                                <div className="flex items-center gap-1 pb-1 overflow-x-auto scrollbar-none flex-1 mask-fade-right">
                                                    <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execEditUndo(); }} disabled={editHistoryIndex <= 0} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                                    <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execEditRedo(); }} disabled={editHistoryIndex >= editHistory.length - 1} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                    <Tooltip content="Заголовок 1"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('formatBlock', 'H1'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Heading1 size={16} /></button></Tooltip>
                                                    <Tooltip content="Заголовок 2"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('formatBlock', 'H2'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Heading2 size={16} /></button></Tooltip>
                                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                    <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('bold'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Bold size={16} /></button></Tooltip>
                                                    <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('italic'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Italic size={16} /></button></Tooltip>
                                                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                    <Tooltip content="Очистить"><button onMouseDown={handleClearEditStyle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Eraser size={16} /></button></Tooltip>
                                                </div>
                                            </div>

                                            <div 
                                                ref={editContentEditableRef} 
                                                contentEditable 
                                                onInput={handleEditInput} 
                                                className="w-full min-h-[140px] outline-none text-base text-slate-700 dark:text-slate-200 py-2 leading-relaxed font-sans [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 cursor-text" 
                                                style={{ whiteSpace: 'pre-wrap' }} 
                                                data-placeholder="Описание задачи..." 
                                                dangerouslySetInnerHTML={{ __html: editHistory[editHistoryIndex] }}
                                            />

                                            {/* SPHERES IN EDIT MODE ONLY */}
                                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Сферы</label>
                                                <SphereSelector selected={task.spheres || []} onChange={(s) => updateTask({...task, spheres: s})} />
                                            </div>

                                            <div className="flex flex-col-reverse md:flex-row justify-end items-stretch md:items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-4">
                                                <button onClick={() => setIsEditingTask(false)} className="px-5 py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 w-full md:w-auto text-center font-medium">Отмена</button>
                                                <button onClick={handleSaveTaskContent} className="px-8 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 font-bold text-sm flex items-center justify-center gap-2 w-full md:w-auto shadow-lg shadow-indigo-500/20"><Check size={18} /> Сохранить</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="group relative pr-1">
                                            {/* 1. Context (Description) */}
                                            {task.description && (
                                                <CollapsibleSection title="Контекст" icon={<FileText size={12}/>} defaultOpen={false}>
                                                    <div className="text-xs text-[#6B6E70] dark:text-slate-400 leading-relaxed font-sans">
                                                        <ReactMarkdown components={markdownComponents}>{applyTypography(task.description)}</ReactMarkdown>
                                                    </div>
                                                </CollapsibleSection>
                                            )}

                                            {/* Main Content */}
                                            <div className="text-[#2F3437] dark:text-slate-300 text-sm font-normal leading-relaxed font-sans mb-4">
                                                <ReactMarkdown components={markdownComponents}>{applyTypography(task.content)}</ReactMarkdown>
                                            </div>

                                            {/* 2. Checklist */}
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
                                                                
                                                                <span className={`text-sm flex-1 break-words leading-relaxed transition-all duration-300 ${s.isCompleted ? "text-slate-400 line-through opacity-50" : "text-[#2F3437] dark:text-slate-200"}`}>{s.text}</span>
                                                                
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

                                            {/* 3. Challenge */}
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

                                            {/* 4. History (Collapsible) */}
                                            {((task.challengeHistory && task.challengeHistory.length > 0) || (task.consultationHistory && task.consultationHistory.length > 0)) && (
                                                <CollapsibleSection title="История" icon={<History size={12}/>} defaultOpen={false}>
                                                    <div className="space-y-4">
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
                                                                <div className="text-[#2F3437] dark:text-slate-300 leading-relaxed opacity-80"><ReactMarkdown components={markdownComponents}>{applyTypography(h)}</ReactMarkdown></div>
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
                                                </CollapsibleSection>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                    
                    {/* Modal Footer */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center shrink-0">
                        {activeModal.type === 'details' && getTaskForModal() && (
                            <>
                                <button onClick={() => { if(confirm("Удалить задачу?")) { deleteTask(getTaskForModal()!.id); setActiveModal({ type: null, taskId: null }); } }} className="text-red-400 hover:text-red-600 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Удалить</button>
                                <button onClick={() => { onReflectInJournal(getTaskForModal()!.id); }} className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"><MessageCircle size={16} /> Отрефлексировать</button>
                            </>
                        )}
                        {activeModal.type === 'therapy' && (
                            <button onClick={() => setActiveModal({ ...activeModal, type: 'details' })} className="ml-auto text-slate-500 hover:text-slate-700 text-sm font-medium px-4 py-2">Назад</button>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Kanban;
