
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, Subtask, JournalEntry, AppConfig } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { applyTypography } from '../constants';
import { 
  Plus, MoreHorizontal, Calendar, X, CheckCircle2, Circle, AlertCircle, 
  Sparkles, Zap, MessageCircle, ArrowRight, Trash2, Archive, GripVertical, 
  ListTodo, PlusCircle, Check, Play, Pause, RotateCcw, PenTool, BookOpen, 
  ChevronRight, ChevronDown, Loader2, Minus 
} from 'lucide-react';
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
  isCard?: boolean;
}> = ({ title, children, icon, isCard }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`${isCard ? 'border-t border-slate-100 dark:border-slate-700/50 pt-2' : 'bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-3'}`}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className={`w-full flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded ${isCard ? 'py-1 px-1' : 'p-4'}`}
      >
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
           {icon}
           {title}
        </div>
        <div className="text-slate-400">
          {isOpen ? <Minus size={12} /> : <Plus size={12} />}
        </div>
      </button>
      {isOpen && (
        <div className={`${isCard ? 'pt-2' : 'px-4 pb-4 pt-0'} animate-in slide-in-from-top-1 duration-200`}>
           <div className={`${isCard ? '' : 'pt-3 border-t border-slate-200/50 dark:border-slate-700/50'} text-sm`}>
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const Kanban: React.FC<Props> = ({ 
    tasks, 
    journalEntries, 
    config, 
    addTask, 
    updateTask, 
    deleteTask, 
    reorderTask, 
    archiveTask, 
    onReflectInJournal, 
    initialTaskId, 
    onClearInitialTask 
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [cardSubtaskInputs, setCardSubtaskInputs] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (initialTaskId) {
       setSelectedTaskId(initialTaskId);
       onClearInitialTask?.();
    }
  }, [initialTaskId, onClearInitialTask]);

  const activeTasks = tasks.filter(t => !t.isArchived);
  const todoTasks = activeTasks.filter(t => t.column === 'todo').sort((a,b) => b.createdAt - a.createdAt);
  const doingTasks = activeTasks.filter(t => t.column === 'doing').sort((a,b) => b.createdAt - a.createdAt);
  const doneTasks = activeTasks.filter(t => t.column === 'done').sort((a,b) => b.createdAt - a.createdAt);

  const handleAddTask = () => {
      if (!newTaskContent.trim()) return;
      addTask({
          id: Date.now().toString(),
          content: applyTypography(newTaskContent),
          column: 'todo',
          createdAt: Date.now()
      });
      setNewTaskContent('');
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('taskId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, column: 'todo' | 'doing' | 'done', targetTaskId?: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('taskId');
      
      // Check if it's a task drag (not subtask)
      if (draggedId && !e.dataTransfer.types.includes('subtaskid')) {
          const task = tasks.find(t => t.id === draggedId);
          if (task && task.column !== column) {
              updateTask({ ...task, column });
          } else if (targetTaskId && task && task.column === column && targetTaskId !== draggedId) {
              reorderTask(draggedId, targetTaskId);
          }
      }
  };

  // --- SUBTASK LOGIC ---
  const handleSubtaskDragStart = (e: React.DragEvent, subtaskId: string, taskId: string) => {
      e.stopPropagation();
      e.dataTransfer.setData('subtaskId', subtaskId);
      e.dataTransfer.setData('parentTaskId', taskId);
      // Mark as subtask drag
      e.dataTransfer.types.push('subtaskid'); 
  };

  const handleSubtaskDrop = (e: React.DragEvent, targetSubtaskId: string, task: Task) => {
      e.preventDefault();
      e.stopPropagation();
      const draggedSubtaskId = e.dataTransfer.getData('subtaskId');
      const parentTaskId = e.dataTransfer.getData('parentTaskId');

      if (parentTaskId === task.id && draggedSubtaskId !== targetSubtaskId && task.subtasks) {
          const subtasks = [...task.subtasks];
          const dIdx = subtasks.findIndex(s => s.id === draggedSubtaskId);
          const tIdx = subtasks.findIndex(s => s.id === targetSubtaskId);
          if (dIdx > -1 && tIdx > -1) {
              const [moved] = subtasks.splice(dIdx, 1);
              subtasks.splice(tIdx, 0, moved);
              updateTask({ ...task, subtasks });
          }
      }
  };

  const handleToggleSubtask = (subtaskId: string, taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.subtasks) {
          const updatedSubtasks = task.subtasks.map(s => 
              s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
          );
          updateTask({ ...task, subtasks: updatedSubtasks });
      }
  };

  const handleDeleteSubtask = (subtaskId: string, taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.subtasks) {
          const updatedSubtasks = task.subtasks.filter(s => s.id !== subtaskId);
          updateTask({ ...task, subtasks: updatedSubtasks });
      }
  };

  const handleAddSubtaskFromCard = (taskId: string) => {
      const text = cardSubtaskInputs[taskId]?.trim();
      if (!text) return;
      
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const newSubtask: Subtask = {
              id: Date.now().toString(),
              text: applyTypography(text),
              isCompleted: false
          };
          updateTask({ 
              ...task, 
              subtasks: [...(task.subtasks || []), newSubtask] 
          });
          setCardSubtaskInputs(prev => ({ ...prev, [taskId]: '' }));
      }
  };

  // --- AI LOGIC ---
  const handleGenerateChallenge = async (task: Task) => {
      if (isAiProcessing) return;
      setIsAiProcessing(true);
      const challengeText = await generateTaskChallenge(task.content, config);
      updateTask({
          ...task,
          activeChallenge: challengeText,
          isChallengeCompleted: false
      });
      setIsAiProcessing(false);
  };

  const handleTherapy = async (task: Task) => {
      if (isAiProcessing) return;
      setIsAiProcessing(true);
      const advice = await getKanbanTherapy(task.content, task.column === 'done' ? 'completed' : 'stuck', config);
      updateTask({
          ...task,
          consultationHistory: [advice, ...(task.consultationHistory || [])]
      });
      setIsAiProcessing(false);
      setSelectedTaskId(task.id); // Open details to show advice
  };

  const completeChallenge = (task: Task) => {
      if (!task.activeChallenge) return;
      updateTask({
          ...task,
          isChallengeCompleted: true,
          challengeHistory: [task.activeChallenge, ...(task.challengeHistory || [])],
          // Keep activeChallenge but marked as done, or move to history? 
          // Current logic keeps it in activeChallenge but with isChallengeCompleted=true
      });
  };

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
                    className="flex items-center gap-2 group p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        {/* Drag Handle */}
                        <div 
                            className="text-slate-300 dark:text-slate-600 cursor-move hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                             <GripVertical size={12} />
                        </div>

                        {/* Toggle Checkbox */}
                        <button 
                            className={`shrink-0 ${subtask.isCompleted ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-500'}`}
                            onClick={(e) => { e.stopPropagation(); handleToggleSubtask(subtask.id, task.id); }}
                        >
                            {subtask.isCompleted ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        </button>

                        {/* Text */}
                        <span 
                            className={`text-xs flex-1 break-words leading-snug cursor-pointer select-none ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}
                            onClick={(e) => { e.stopPropagation(); handleToggleSubtask(subtask.id, task.id); }}
                        >
                            {subtask.text}
                        </span>

                        {/* Delete Button */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(subtask.id, task.id); }}
                            className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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

  const renderColumn = (title: string, columnTasks: Task[], columnId: 'todo' | 'doing' | 'done', color: string) => (
    <div 
        className="flex flex-col h-full bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, columnId)}
    >
        <div className={`p-4 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center ${color}`}>
            <h3 className="text-sm font-bold uppercase tracking-wider">{title}</h3>
            <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-md text-xs font-bold">{columnTasks.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar-light">
            {columnId === 'todo' && (
                <div className="bg-white dark:bg-[#1e293b] rounded-xl p-3 shadow-sm border border-slate-200 dark:border-slate-700">
                    <input 
                        className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400 dark:text-slate-200"
                        placeholder="+ Новая задача"
                        value={newTaskContent}
                        onChange={(e) => setNewTaskContent(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    />
                </div>
            )}
            
            {columnTasks.map(task => (
                <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDrop={(e) => handleDrop(e, columnId, task.id)}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="bg-white dark:bg-[#1e293b] rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group relative"
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] text-slate-400 font-mono">{new Date(task.createdAt).toLocaleDateString()}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            {columnId === 'done' && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }}
                                    className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-400 hover:text-indigo-600 rounded"
                                    title="В архив"
                                >
                                    <Archive size={14} />
                                </button>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 rounded"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed mb-3">
                        <ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown>
                    </div>

                    {/* Challenge Indicator */}
                    {task.activeChallenge && (
                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${task.isChallengeCompleted ? 'text-emerald-500' : 'text-amber-500'}`}>
                            <Zap size={12} className="fill-current" /> {task.isChallengeCompleted ? 'Челлендж выполнен' : 'Активный челлендж'}
                        </div>
                    )}
                    
                    {/* Checklist Preview */}
                    {renderCardChecklist(task)}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50 mt-2">
                        <div className="flex gap-2">
                            <Tooltip content="Консультант">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleTherapy(task); }}
                                    disabled={isAiProcessing}
                                    className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                >
                                    {isAiProcessing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />}
                                </button>
                            </Tooltip>
                            {columnId === 'todo' && !task.activeChallenge && (
                                <Tooltip content="Создать Челлендж">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleGenerateChallenge(task); }}
                                        disabled={isAiProcessing}
                                        className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                                    >
                                        <Zap size={14} />
                                    </button>
                                </Tooltip>
                            )}
                            <Tooltip content="Рефлексия">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onReflectInJournal(task.id); }}
                                    className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors"
                                >
                                    <BookOpen size={14} />
                                </button>
                            </Tooltip>
                        </div>

                        {columnId !== 'done' && (
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    updateTask({ ...task, column: columnId === 'todo' ? 'doing' : 'done' });
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                {columnId === 'todo' ? <Play size={14} fill="currentColor" /> : <Check size={14} />}
                            </button>
                        )}
                    </div>
                </div>
            ))}
            
            {columnTasks.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-xs italic">
                    Нет задач
                </div>
            )}
        </div>
    </div>
  );

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden relative">
       <header className="mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">От слов к делу</p>
        </div>
        <button 
            onClick={() => {
                const completed = tasks.filter(t => t.column === 'done' && !t.isArchived);
                if (completed.length === 0) return;
                if (confirm(`Отправить в архив ${completed.length} выполненных задач?`)) {
                    completed.forEach(t => archiveTask(t.id));
                }
            }}
            className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1"
        >
            <Archive size={14} /> Архивация готового
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-w-[300px] md:min-w-0">
              {renderColumn("К исполнению", todoTasks, 'todo', 'text-slate-600 dark:text-slate-300')}
              {renderColumn("В работе", doingTasks, 'doing', 'text-indigo-600 dark:text-indigo-400')}
              {renderColumn("Готово", doneTasks, 'done', 'text-emerald-600 dark:text-emerald-400')}
          </div>
      </div>

      {/* TASK DETAILS MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTaskId(null)}>
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${selectedTask.column === 'done' ? 'bg-emerald-100 text-emerald-600' : selectedTask.column === 'doing' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                            {selectedTask.column === 'done' ? <CheckCircle2 size={24} /> : selectedTask.column === 'doing' ? <Loader2 size={24} className="animate-spin-slow" /> : <Circle size={24} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Детали задачи</h3>
                            <div className="text-xs text-slate-400">{new Date(selectedTask.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                    <button onClick={() => setSelectedTaskId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-full"><X size={20} /></button>
                </div>

                <div className="space-y-6">
                    {/* Main Content */}
                    <div className="bg-slate-50 dark:bg-[#0f172a] p-5 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                            <ReactMarkdown components={markdownComponents}>{selectedTask.content}</ReactMarkdown>
                        </div>
                    </div>

                    {/* Original Context */}
                    {selectedTask.description && (
                        <div>
                             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><BookOpen size={14}/> Контекст</h4>
                             <div className="text-sm text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                 <ReactMarkdown components={markdownComponents}>{selectedTask.description}</ReactMarkdown>
                             </div>
                        </div>
                    )}

                    {/* Active Challenge */}
                    {selectedTask.activeChallenge && (
                         <div className={`p-5 rounded-xl border-l-4 ${selectedTask.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'}`}>
                             <div className="flex justify-between items-center mb-3">
                                 <h4 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${selectedTask.isChallengeCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                     <Zap size={16} className="fill-current" /> 
                                     {selectedTask.isChallengeCompleted ? 'Челлендж выполнен' : 'Текущий Челлендж'}
                                 </h4>
                                 {!selectedTask.isChallengeCompleted && (
                                     <button onClick={() => completeChallenge(selectedTask)} className="px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors">
                                         Завершить
                                     </button>
                                 )}
                             </div>
                             <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                                 <ReactMarkdown components={markdownComponents}>{selectedTask.activeChallenge}</ReactMarkdown>
                             </div>
                         </div>
                    )}

                    {/* Consultation History (Therapy) */}
                    {selectedTask.consultationHistory && selectedTask.consultationHistory.length > 0 && (
                        <div>
                             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><MessageCircle size={14}/> Консультации</h4>
                             <div className="space-y-3">
                                 {selectedTask.consultationHistory.map((advice, idx) => (
                                     <div key={idx} className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                                         <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                                             <ReactMarkdown components={markdownComponents}>{advice}</ReactMarkdown>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={() => { if(confirm("Удалить задачу?")) { deleteTask(selectedTask.id); setSelectedTaskId(null); } }} className="px-4 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors">Удалить</button>
                    <button onClick={() => setSelectedTaskId(null)} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 font-medium text-sm">Закрыть</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
