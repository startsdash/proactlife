
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, Subtask, AppConfig, JournalEntry } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { 
  Plus, MoreHorizontal, X, CheckCircle2, Circle, AlertCircle, 
  RotateCcw, Trash2, BrainCircuit, Zap, ArrowRight, Play, 
  CheckSquare, History, MessageCircle, Pin, ListTodo,
  Calendar, GripVertical, FileText, Minus, ChevronDown, ChevronUp,
  Layout,
  Trophy
} from 'lucide-react';

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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-800 dark:text-slate-300 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-base font-bold mt-3 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{children}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-sm font-bold mt-2 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{children}</h2>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-indigo-200 dark:border-indigo-800 pl-4 py-1 my-2 text-sm text-slate-600 dark:text-slate-400 italic bg-indigo-50/30 dark:bg-indigo-900/20 rounded-r-lg" {...props} />,
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
  defaultOpen?: boolean;
}> = ({ title, children, icon, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-3">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
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
        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-1 duration-200">
           <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50 text-sm">
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const ChallengeRenderer: React.FC<{ 
    content: string, 
    onToggleLine: (index: number) => void,
    pinnedIndices: number[],
    mode: 'active' | 'history'
}> = ({ content, onToggleLine, pinnedIndices, mode }) => {
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
            const isPinned = pinnedIndices.includes(i);
            
            renderedParts.push(
                <div 
                    key={`cb-${i}`}
                    className={`flex items-start gap-2 w-full text-left py-1.5 px-2 rounded-lg mb-0.5 transition-colors group ${mode === 'active' ? 'hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer' : ''}`}
                    style={{ marginLeft: `${indent}px` }}
                    onClick={mode === 'active' ? () => onToggleLine(i) : undefined}
                >
                    <div className={`mt-0.5 shrink-0 transition-colors ${isChecked ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-500'}`}>
                        {isChecked ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </div>
                    <span className={`text-sm flex-1 ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
                        <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span className="m-0 p-0">{children}</span>}}>{label}</ReactMarkdown>
                    </span>
                    {mode === 'active' && isPinned && (
                        <Pin size={12} className="text-indigo-400 shrink-0 transform rotate-45" />
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

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  
  // AI States
  const [isTherapyLoading, setIsTherapyLoading] = useState(false);
  const [isChallengeLoading, setIsChallengeLoading] = useState(false);

  useEffect(() => {
    if (initialTaskId) {
      setSelectedTaskId(initialTaskId);
      onClearInitialTask?.();
    }
  }, [initialTaskId, onClearInitialTask]);

  const columns: { id: 'todo' | 'doing' | 'done', title: string, color: string }[] = [
    { id: 'todo', title: 'Очередь', color: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'doing', title: 'В работе', color: 'bg-indigo-50 dark:bg-indigo-900/10' },
    { id: 'done', title: 'Готово', color: 'bg-emerald-50 dark:bg-emerald-900/10' }
  ];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumn: 'todo' | 'doing' | 'done', targetTaskId?: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('taskId');
    if (!draggedId) return;

    const task = tasks.find(t => t.id === draggedId);
    if (!task) return;

    if (task.column !== targetColumn) {
        updateTask({ ...task, column: targetColumn });
    } else if (targetTaskId && targetTaskId !== draggedId) {
        reorderTask(draggedId, targetTaskId);
    }
  };

  // --- TASK DETAIL HANDLERS ---
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const handleAddSubtask = () => {
    if (!selectedTask || !newSubtaskText.trim()) return;
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      text: newSubtaskText,
      isCompleted: false
    };
    updateTask({
      ...selectedTask,
      subtasks: [...(selectedTask.subtasks || []), newSubtask]
    });
    setNewSubtaskText('');
  };

  const handleToggleSubtask = (subtaskId: string) => {
    if (!selectedTask) return;
    const updatedSubtasks = selectedTask.subtasks?.map(s => 
        s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
    );
    updateTask({ ...selectedTask, subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!selectedTask) return;
    const updatedSubtasks = selectedTask.subtasks?.filter(s => s.id !== subtaskId);
    updateTask({ ...selectedTask, subtasks: updatedSubtasks });
  };

  const handleToggleSubtaskPin = (subtaskId: string) => {
      if (!selectedTask) return;
      const updatedSubtasks = selectedTask.subtasks?.map(s => 
          s.id === subtaskId ? { ...s, isPinned: !s.isPinned } : s
      );
      updateTask({ ...selectedTask, subtasks: updatedSubtasks });
  };

  const handleArchive = () => {
      if (selectedTask) {
          archiveTask(selectedTask.id);
          setSelectedTaskId(null);
      }
  };

  // AI HANDLERS
  const handleGetTherapy = async () => {
      if (!selectedTask) return;
      setIsTherapyLoading(true);
      const advice = await getKanbanTherapy(selectedTask.content, selectedTask.column === 'done' ? 'completed' : 'stuck', config);
      updateTask({
          ...selectedTask,
          consultationHistory: [...(selectedTask.consultationHistory || []), advice]
      });
      setIsTherapyLoading(false);
  };

  const handleGenerateChallenge = async () => {
      if (!selectedTask) return;
      setIsChallengeLoading(true);
      
      // If there is an active challenge, move it to history first
      let updatedTask = { ...selectedTask };
      if (updatedTask.activeChallenge) {
          updatedTask.challengeHistory = [
              ...(updatedTask.challengeHistory || []),
              updatedTask.activeChallenge // Save old challenge state
          ];
      }

      const newChallenge = await generateTaskChallenge(selectedTask.content, config);
      updatedTask.activeChallenge = newChallenge;
      updatedTask.isChallengeCompleted = false;
      updatedTask.pinnedChallengeIndices = []; // Reset pins
      
      updateTask(updatedTask);
      setIsChallengeLoading(false);
  };

  const handleToggleChallengeLine = (index: number) => {
      if (!selectedTask || !selectedTask.activeChallenge) return;
      
      const lines = selectedTask.activeChallenge.split('\n');
      if (index < 0 || index >= lines.length) return;
      
      const line = lines[index];
      const match = line.match(/^\s*(?:[-*+]|\d+\.)?\s*\[([ xX])\]/);
      
      if (match) {
          const currentStatus = match[1].toLowerCase() === 'x';
          const newStatus = currentStatus ? ' ' : 'x';
          const newLine = line.replace(/\[([ xX])\]/, `[${newStatus}]`);
          lines[index] = newLine;
          
          const newContent = lines.join('\n');
          
          // Check if all checkboxes are checked
          const allCheckboxes = lines.filter(l => l.match(/^\s*(?:[-*+]|\d+\.)?\s*\[([ xX])\]/));
          const allChecked = allCheckboxes.every(l => l.match(/^\s*(?:[-*+]|\d+\.)?\s*\[[xX]\]/));

          updateTask({
              ...selectedTask,
              activeChallenge: newContent,
              isChallengeCompleted: allChecked
          });
          
          if (allChecked && !selectedTask.isChallengeCompleted) {
              if (window.confetti) window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }
      }
  };

  const handleToggleChallengePin = () => {
      // Toggle visibility of challenge on main card (simplified: show if active exists)
      // Actually we have `pinnedChallengeIndices` but for now let's just use the whole challenge block as pinning logic
      // Or maybe toggle the whole section? 
      // Let's implement individual line pinning in the Renderer if needed, but for now
      // simple "Active Challenge" presence is enough.
  };

  const activeTasks = tasks.filter(t => !t.isArchived);

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
      <header className="p-4 md:p-8 pb-0 shrink-0">
        <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">От слов к делу</p>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-8">
        <div className="flex h-full gap-4 md:gap-6 min-w-[300px] md:min-w-0">
          {columns.map(col => (
            <div 
                key={col.id} 
                className="flex-1 min-w-[280px] md:min-w-0 flex flex-col h-full rounded-2xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="p-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wide">{col.title}</h3>
                      <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-bold">
                          {activeTasks.filter(t => t.column === col.id).length}
                      </span>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar-light">
                  {activeTasks.filter(t => t.column === col.id).map(task => (
                      <div 
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDrop={(e) => handleDrop(e, col.id, task.id)}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative ${task.isChallengeCompleted ? 'ring-1 ring-emerald-400 dark:ring-emerald-600' : ''}`}
                      >
                           <div className="flex justify-between items-start mb-2">
                               <div className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-3 leading-relaxed">
                                   {task.content}
                               </div>
                               <div className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <GripVertical size={14} />
                               </div>
                           </div>

                           {/* Pinned Subtasks */}
                           {task.subtasks && task.subtasks.some(s => s.isPinned) && (
                               <div className="mt-3 space-y-1">
                                   {task.subtasks.filter(s => s.isPinned).map(s => (
                                       <div key={s.id} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                           {s.isCompleted ? <CheckCircle2 size={12} className="text-emerald-500"/> : <Circle size={12} className="text-indigo-400"/>}
                                           <span className={s.isCompleted ? 'line-through opacity-70' : ''}>{s.text}</span>
                                       </div>
                                   ))}
                               </div>
                           )}

                           {/* Active Challenge Indicator */}
                           {task.activeChallenge && (
                               <div className={`mt-3 px-2 py-1.5 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide ${task.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'}`}>
                                   <Zap size={12} fill={task.isChallengeCompleted ? "currentColor" : "none"} />
                                   {task.isChallengeCompleted ? 'Челлендж выполнен' : 'Челлендж активен'}
                               </div>
                           )}
                           
                           {/* Footer Info */}
                           <div className="mt-3 pt-2 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                                <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                                {task.subtasks && task.subtasks.length > 0 && (
                                    <span className="flex items-center gap-1">
                                        <ListTodo size={12} /> {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                                    </span>
                                )}
                           </div>
                      </div>
                  ))}
                  {activeTasks.filter(t => t.column === col.id).length === 0 && (
                      <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                          Пусто
                      </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTaskId(null)}>
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6 shrink-0">
                    <div className="flex-1">
                         <div className="flex items-center gap-2 mb-2">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${selectedTask.column === 'done' ? 'bg-emerald-100 text-emerald-700' : selectedTask.column === 'doing' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                 {selectedTask.column === 'todo' ? 'Очередь' : selectedTask.column === 'doing' ? 'В работе' : 'Готово'}
                             </span>
                             {selectedTask.description && <span className="text-[10px] text-slate-400 flex items-center gap-1"><FileText size={10}/> Есть описание</span>}
                         </div>
                         <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">
                             {selectedTask.content}
                         </h2>
                    </div>
                    <div className="flex gap-2 ml-4">
                        <Tooltip content="В Архив">
                            <button onClick={handleArchive} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"><Trophy size={20} /></button>
                        </Tooltip>
                        <Tooltip content="Удалить">
                             <button onClick={() => { if(window.confirm("Удалить задачу?")) { deleteTask(selectedTask.id); setSelectedTaskId(null); }}} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={20} /></button>
                        </Tooltip>
                        <button onClick={() => setSelectedTaskId(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"><X size={20} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-light pr-2 space-y-4">
                     
                     {/* 1. Description Source */}
                     {selectedTask.description && (
                         <CollapsibleSection title="Контекст / Источник" icon={<FileText size={14}/>}>
                             <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                 <ReactMarkdown components={markdownComponents}>{selectedTask.description}</ReactMarkdown>
                             </div>
                         </CollapsibleSection>
                     )}

                     {/* 2. Subtasks / Checklist */}
                     <CollapsibleSection title={`Чек-лист (${selectedTask.subtasks?.filter(s => s.isCompleted).length || 0}/${selectedTask.subtasks?.length || 0})`} icon={<ListTodo size={14}/>} defaultOpen={true}>
                           <div className="space-y-2 mb-3">
                               {selectedTask.subtasks?.map(subtask => (
                                   <div key={subtask.id} className="flex items-start gap-2 group min-h-[28px]">
                                       <button onClick={() => handleToggleSubtask(subtask.id)} className={`mt-0.5 shrink-0 transition-colors ${subtask.isCompleted ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500'}`}>
                                           {subtask.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                       </button>
                                       <span className={`text-sm flex-1 break-words min-w-0 mt-0.5 ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{subtask.text}</span>
                                       
                                       <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <Tooltip content={subtask.isPinned ? "Открепить" : "Закрепить на карточке"}>
                                                <button 
                                                    onClick={() => handleToggleSubtaskPin(subtask.id)} 
                                                    className={`p-1.5 rounded-lg transition-colors ${subtask.isPinned ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40' : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
                                                >
                                                    <Pin size={14} className={subtask.isPinned ? "fill-current" : ""} />
                                                </button>
                                           </Tooltip>
                                           <button onClick={() => handleDeleteSubtask(subtask.id)} className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded"><X size={14}/></button>
                                       </div>
                                   </div>
                               ))}
                           </div>
                           
                           <div className="flex gap-2">
                               <input 
                                  type="text" 
                                  placeholder="Новый пункт..." 
                                  className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:text-slate-200"
                                  value={newSubtaskText}
                                  onChange={(e) => setNewSubtaskText(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                               />
                               <button onClick={handleAddSubtask} disabled={!newSubtaskText.trim()} className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"><Plus size={18} /></button>
                           </div>
                     </CollapsibleSection>

                     {/* 3. Challenge Section */}
                     <div className="space-y-3 pt-2">
                         <div className="flex justify-between items-center">
                             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Zap size={14}/> Челлендж</h3>
                             <button 
                                onClick={handleGenerateChallenge} 
                                disabled={isChallengeLoading}
                                className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                             >
                                 {isChallengeLoading ? <div className="w-3 h-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /> : <Play size={10} fill="currentColor" />}
                                 {selectedTask.activeChallenge ? 'Новый вызов' : 'Сгенерировать'}
                             </button>
                         </div>

                         {selectedTask.activeChallenge ? (
                             <div className={`p-4 rounded-xl border-2 transition-all relative overflow-hidden ${selectedTask.isChallengeCompleted ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/50 shadow-sm'}`}>
                                 {selectedTask.isChallengeCompleted && (
                                     <div className="absolute top-0 right-0 p-2 bg-emerald-500 text-white rounded-bl-xl text-[10px] font-bold uppercase tracking-widest shadow-sm">
                                         Выполнено
                                     </div>
                                 )}
                                 <div className="pr-2">
                                     <ChallengeRenderer 
                                        content={selectedTask.activeChallenge} 
                                        mode="active" 
                                        onToggleLine={handleToggleChallengeLine}
                                        pinnedIndices={selectedTask.pinnedChallengeIndices || []}
                                     />
                                 </div>
                             </div>
                         ) : (
                             <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-center text-slate-400">
                                 <Zap size={24} className="mb-2 opacity-50" />
                                 <p className="text-sm">Бросьте себе вызов.</p>
                                 <p className="text-xs opacity-70">ИИ создаст чек-лист для проверки на прочность.</p>
                             </div>
                         )}

                         {/* Challenge History */}
                         {selectedTask.challengeHistory && selectedTask.challengeHistory.length > 0 && (
                            <CollapsibleSection title="История Челленджей" icon={<History size={14}/>}>
                                <div className="space-y-4">
                                    {selectedTask.challengeHistory.map((challenge, index) => (
                                       <div key={index} className="py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 opacity-70 hover:opacity-100 transition-opacity">
                                          <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                                             <ChallengeRenderer content={challenge} mode="history" onToggleLine={() => {}} pinnedIndices={[]} />
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                            </CollapsibleSection>
                         )}
                     </div>

                     {/* 4. AI Consultant */}
                     <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><BrainCircuit size={14}/> Консультант</h3>
                             <button 
                                onClick={handleGetTherapy} 
                                disabled={isTherapyLoading}
                                className="text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                             >
                                 {isTherapyLoading ? <div className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" /> : <MessageCircle size={12} />}
                                 Совет
                             </button>
                        </div>
                        
                        {selectedTask.consultationHistory && selectedTask.consultationHistory.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-100 dark:border-amber-800/30">
                                <div className="text-sm text-slate-800 dark:text-slate-200 italic leading-relaxed">
                                    <ReactMarkdown components={markdownComponents}>
                                        {selectedTask.consultationHistory[selectedTask.consultationHistory.length - 1]}
                                    </ReactMarkdown>
                                </div>
                                {selectedTask.consultationHistory.length > 1 && (
                                    <div className="mt-2 pt-2 border-t border-amber-100 dark:border-amber-800/30">
                                        <CollapsibleSection title={`Предыдущие советы (${selectedTask.consultationHistory.length - 1})`} icon={<History size={12}/>}>
                                            <div className="space-y-3">
                                                {selectedTask.consultationHistory.slice(0, -1).reverse().map((adv, i) => (
                                                    <div key={i} className="text-xs text-slate-600 dark:text-slate-400 italic pb-2 border-b border-amber-100 dark:border-amber-800/30 last:border-0">
                                                        <ReactMarkdown components={markdownComponents}>{adv}</ReactMarkdown>
                                                    </div>
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    </div>
                                )}
                            </div>
                        )}
                     </div>

                </div>
                
                {/* Footer Actions */}
                <div className="pt-6 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <button 
                        onClick={() => onReflectInJournal(selectedTask.id)}
                        className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                    >
                        <ArrowRight size={14} /> Рефлексия в дневнике
                    </button>
                    
                    {selectedTask.column !== 'done' ? (
                        <button 
                            onClick={() => updateTask({ ...selectedTask, column: 'done' })}
                            className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-emerald-600 shadow-md shadow-emerald-200 dark:shadow-none transition-all flex items-center gap-2"
                        >
                            <CheckCircle2 size={16} /> Завершить задачу
                        </button>
                    ) : (
                        <button 
                            onClick={handleArchive}
                            className="bg-slate-900 dark:bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-indigo-700 shadow-md transition-all flex items-center gap-2"
                        >
                            <Trophy size={16} /> В Зал славы
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;
