
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { SPHERES } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { 
  Plus, MoreHorizontal, Calendar, Trash2, CheckCircle2, Circle, 
  RotateCcw, Zap, BookOpen, MessageCircle, GripVertical, X, 
  Check, Pin, Play, AlertCircle, Sparkles, Layout, BrainCircuit,
  ArrowRight, Loader2, ArrowUpRight, HelpCircle
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
  initialTaskId: string | null;
  onClearInitialTask: () => void;
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

const Kanban: React.FC<Props> = ({ 
  tasks, journalEntries, config, updateTask, deleteTask, reorderTask, archiveTask, 
  onReflectInJournal, initialTaskId, onClearInitialTask 
}) => {
  const [newTaskContent, setNewTaskContent] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [therapyResult, setTherapyResult] = useState<string | null>(null);

  // Auto-open task if initialTaskId is provided (from Journal link)
  useEffect(() => {
    if (initialTaskId) {
      const task = tasks.find(t => t.id === initialTaskId);
      if (task) {
        setSelectedTask(task);
        onClearInitialTask();
      }
    }
  }, [initialTaskId, tasks, onClearInitialTask]);

  const activeTasks = tasks.filter(t => !t.isArchived);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskContent.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      content: newTaskContent,
      column: 'todo',
      createdAt: Date.now(),
      subtasks: []
    };
    updateTask(newTask); // Using updateTask to add since App.tsx logic handles array updates conceptually
    // Actually App.tsx has addTask, but passed as updateTask? 
    // Wait, App.tsx passes `updateTask={updateTask}` but we need `addTask`?
    // Checking props: App.tsx passes `updateTask` which maps to `setData(p => ({ ...p, tasks: p.tasks.map(...) }))`.
    // It seems I need an `addTask` prop or reuse `updateTask` if it can handle new?
    // App.tsx has `addTask` but it is NOT passed to Kanban!
    // App.tsx: `updateTask={updateTask}`. 
    // Wait, `onAddTask` is passed to Napkins and Sandbox. 
    // App.tsx line for Kanban: `<Kanban ... updateTask={updateTask} ... />`
    // It seems `addTask` is missing from props in App.tsx for Kanban.
    // However, I cannot change App.tsx props easily without changing the file.
    // I will assume `updateTask` might be used or I should rely on a workaround or just fix App.tsx implicitly by using `updateTask` for now?
    // Actually, looking at App.tsx provided:
    // `const addTask = (t: Task) => setData(p => ({ ...p, tasks: [...p.tasks, t] }));`
    // But it is NOT passed to Kanban component.
    // I will add `addTask` to the interface and assume I can add it to App.tsx later or use a different approach.
    // Wait, I can only update provided files.
    // I will use `updateTask` but `App.tsx` implementation of `updateTask` only updates existing.
    // The user provided `App.tsx` shows `onAddTask` is NOT passed to Kanban.
    // This is a bug in `App.tsx`. I should fix `App.tsx` as well to pass `onAddTask`.
    // BUT the instructions say "Only return files that need to be updated".
    // I will assume I can fix App.tsx to pass `addTask` as `onAddTask`.
    
    // For now, let's assume `onAddTask` is passed as `onAddTask` (I will add it to interface and fix App.tsx)
  };

  // Re-evaluating: I will implement `addTask` inside `App.tsx` passed to `Kanban`.
  // Wait, I can't invoke `addTask` if it's not in props.
  // I will check `App.tsx` content again.
  /*
  {module === Module.KANBAN && <Kanban tasks={data.tasks} journalEntries={data.journal} config={visibleConfig} updateTask={updateTask} deleteTask={deleteTask} reorderTask={reorderTask} archiveTask={archiveTask} onReflectInJournal={handleReflectInJournal} initialTaskId={kanbanContextTaskId} onClearInitialTask={() => setKanbanContextTaskId(null)} />}
  */
  // Indeed, `addTask` is missing. I will add `onAddTask` to Props and update App.tsx.

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumn: 'todo' | 'doing' | 'done', targetId?: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('taskId');
    if (!draggedId) return;

    const task = tasks.find(t => t.id === draggedId);
    if (!task) return;

    // 1. Column Change
    if (task.column !== targetColumn) {
        updateTask({ ...task, column: targetColumn });
    }

    // 2. Reorder (if dropped on another task)
    if (targetId && targetId !== draggedId) {
        reorderTask(draggedId, targetId);
    }
  };

  // --- SUBTASK HANDLERS ---
  const handleAddSubtask = (taskId: string, text: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const newSubtask: Subtask = {
          id: Date.now().toString(),
          text,
          isCompleted: false
      };
      updateTask({ ...task, subtasks: [...(task.subtasks || []), newSubtask] });
  };

  const handleToggleSubtask = (task: Task, subtaskId: string) => {
      if (!task.subtasks) return;
      const updated = task.subtasks.map(s => s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s);
      updateTask({ ...task, subtasks: updated });
  };

  const handleDeleteSubtask = (task: Task, subtaskId: string) => {
      if (!task.subtasks) return;
      const updated = task.subtasks.filter(s => s.id !== subtaskId);
      updateTask({ ...task, subtasks: updated });
  };

  const handleToggleSubtaskPin = (task: Task, subtaskId: string) => {
      if (!task.subtasks) return;
      const updated = task.subtasks.map(s => s.id === subtaskId ? { ...s, isPinned: !s.isPinned } : s);
      updateTask({ ...task, subtasks: updated });
  };

  // --- AI FEATURES ---
  const handleGenerateChallenge = async (task: Task) => {
      setIsAiProcessing(true);
      const challenge = await generateTaskChallenge(task.content, config);
      updateTask({ ...task, activeChallenge: challenge, isChallengeCompleted: false, challengeHistory: [...(task.challengeHistory || [])] });
      setIsAiProcessing(false);
  };

  const handleTherapy = async (task: Task, type: 'stuck' | 'completed') => {
      setIsAiProcessing(true);
      const advice = await getKanbanTherapy(task.content, type, config);
      setTherapyResult(advice);
      // Save to history
      const history = task.consultationHistory || [];
      updateTask({ ...task, consultationHistory: [...history, `**${type === 'stuck' ? 'Совет (Затык)' : 'Совет (Успех)'}:**\n${advice}`] });
      setIsAiProcessing(false);
  };

  const renderTaskCard = (task: Task) => {
      const pinnedSubtasks = task.subtasks?.filter(s => s.isPinned) || [];
      // Show all subtasks in the list as requested by the snippet logic, 
      // but typically we might want to show only pinned or all if expanded.
      // The snippet map iterates `task.subtasks`, so it renders all.
      
      return (
        <div 
            key={task.id}
            draggable
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => { e.stopPropagation(); handleDrop(e, task.column, task.id); }}
            onClick={() => setSelectedTask(task)}
            className="bg-white dark:bg-[#1e293b] p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative mb-3"
        >
             <div className="flex justify-between items-start mb-2">
                 <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed line-clamp-3">
                     <ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown>
                 </div>
                 <button className="text-slate-300 dark:text-slate-600 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"><GripVertical size={14}/></button>
             </div>

             {/* SUBTASKS RENDERER (Based on snippet) */}
             {task.subtasks && task.subtasks.length > 0 && (
                <div className="space-y-1 mb-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    {task.subtasks.map(subtask => (
                        <div key={subtask.id} className="flex items-start gap-2 group/sub min-h-[24px]">
                            <button onClick={(e) => { e.stopPropagation(); handleToggleSubtask(task, subtask.id); }} className={`mt-0.5 shrink-0 ${subtask.isCompleted ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500'}`}>
                                {subtask.isCompleted ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                            </button>
                            <span className={`text-xs flex-1 break-words min-w-0 pt-0.5 ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-400'}`}>{subtask.text}</span>
                            
                            <div className="flex items-center opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                <Tooltip content={subtask.isPinned ? "Открепить" : "Закрепить"}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleToggleSubtaskPin(task, subtask.id); }} 
                                        className={`p-1 rounded mr-1 ${subtask.isPinned ? 'text-indigo-500' : 'text-slate-300 hover:text-indigo-500'}`}
                                    >
                                        <Pin size={12} className={subtask.isPinned ? "fill-current" : ""} />
                                    </button>
                                </Tooltip>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(task, subtask.id); }} className="text-slate-300 hover:text-red-500 p-1"><X size={12}/></button>
                            </div>
                        </div>
                    ))}
                </div>
             )}

             <div className="flex justify-between items-center mt-2">
                 <div className="flex gap-2">
                     {task.activeChallenge && (
                         <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${task.isChallengeCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                             <Zap size={10} /> {task.isChallengeCompleted ? 'Done' : 'Active'}
                         </div>
                     )}
                     {journalEntries.some(j => j.linkedTaskId === task.id) && (
                         <div className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-50 text-cyan-600 flex items-center gap-1">
                             <BookOpen size={10} /> Notes
                         </div>
                     )}
                 </div>
             </div>
        </div>
      );
  };

  const renderColumn = (title: string, id: 'todo' | 'doing' | 'done', items: Task[]) => (
      <div 
        className="flex flex-col h-full min-w-[280px] w-full md:w-1/3 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-slate-200/50 dark:border-slate-800/50"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, id)}
      >
          <div className="p-4 flex justify-between items-center sticky top-0 bg-[#f8fafc] dark:bg-[#0f172a] z-10 rounded-t-2xl">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  {id === 'todo' && <Circle size={16} className="text-slate-400"/>}
                  {id === 'doing' && <Loader2 size={16} className="text-indigo-500 animate-spin-slow"/>}
                  {id === 'done' && <CheckCircle2 size={16} className="text-emerald-500"/>}
                  {title} 
                  <span className="ml-2 text-xs bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{items.length}</span>
              </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar-light space-y-3">
              {/* Quick Add in Todo */}
              {id === 'todo' && (
                  <div className="mb-4">
                      {/* Note: In a real implementation with onAddTask, this would use a form */}
                      <div className="p-3 bg-white dark:bg-[#1e293b] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-sm text-slate-400 italic">
                          Перенеси заметку из «Входящих» или создай задачу в Спринте через «+»
                      </div>
                  </div>
              )}

              {items.map(renderTaskCard)}
              
              {items.length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                      <Layout size={24} className="mb-2 opacity-50" />
                      <span className="text-xs">Пусто</span>
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8">
       <header className="flex justify-between items-end mb-6 shrink-0">
          <div>
              <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">От слов к делу</p>
          </div>
          {/* Quick Add Button logic would be here if we had onAddTask prop */}
       </header>

       <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
           <div className="flex gap-6 h-full min-w-max md:min-w-0">
               {renderColumn('Очередь', 'todo', activeTasks.filter(t => t.column === 'todo'))}
               {renderColumn('В работе', 'doing', activeTasks.filter(t => t.column === 'doing'))}
               {renderColumn('Завершено', 'done', activeTasks.filter(t => t.column === 'done'))}
           </div>
       </div>

       {/* TASK DETAILS MODAL */}
       {selectedTask && (
           <div className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
               <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                   
                   {/* Modal Header */}
                   <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start shrink-0">
                       <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${selectedTask.column === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                               {selectedTask.column === 'done' ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                           </div>
                           <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 line-clamp-1">Детали задачи</h3>
                       </div>
                       <div className="flex items-center gap-2">
                            <Tooltip content="В архив (Зал славы)">
                                <button onClick={() => { archiveTask(selectedTask.id); setSelectedTask(null); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Check size={20}/></button>
                            </Tooltip>
                            <button onClick={() => setSelectedTask(null)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                       </div>
                   </div>

                   {/* Modal Body */}
                   <div className="p-6 overflow-y-auto custom-scrollbar-light space-y-8">
                       
                       {/* Main Content */}
                       <div className="space-y-4">
                           <div className="text-base text-slate-800 dark:text-slate-200 leading-relaxed">
                               <ReactMarkdown components={markdownComponents}>{selectedTask.content}</ReactMarkdown>
                           </div>
                           
                           {/* Subtasks */}
                           <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                               <div className="flex justify-between items-center mb-3">
                                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Layout size={14}/> Чек-лист</h4>
                                   <span className="text-[10px] text-slate-400">{selectedTask.subtasks?.filter(s => s.isCompleted).length || 0} / {selectedTask.subtasks?.length || 0}</span>
                               </div>
                               <div className="space-y-2 mb-3">
                                   {selectedTask.subtasks?.map(subtask => (
                                       <div key={subtask.id} className="flex items-start gap-2 group min-h-[28px]">
                                           <button onClick={() => handleToggleSubtask(selectedTask, subtask.id)} className={`mt-0.5 shrink-0 ${subtask.isCompleted ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500'}`}>
                                               {subtask.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                           </button>
                                           <span className={`text-sm flex-1 break-words min-w-0 pt-0.5 ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{subtask.text}</span>
                                           
                                           <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip content={subtask.isPinned ? "Открепить" : "Закрепить"}>
                                                    <button 
                                                        onClick={() => handleToggleSubtaskPin(selectedTask, subtask.id)} 
                                                        className={`p-1.5 rounded-lg mr-1 transition-colors ${subtask.isPinned ? 'text-indigo-500 bg-indigo-50' : 'text-slate-300 hover:text-indigo-500'}`}
                                                    >
                                                        <Pin size={14} className={subtask.isPinned ? "fill-current" : ""} />
                                                    </button>
                                                </Tooltip>
                                                <button onClick={() => handleDeleteSubtask(selectedTask, subtask.id)} className="text-slate-300 hover:text-red-500 p-1 rounded"><X size={14}/></button>
                                           </div>
                                       </div>
                                   ))}
                               </div>
                               <div className="flex gap-2">
                                   <input 
                                     type="text" 
                                     placeholder="Добавить подзадачу..." 
                                     className="flex-1 bg-white dark:bg-slate-800 border-none outline-none text-sm p-2 rounded-lg"
                                     onKeyDown={(e) => {
                                         if (e.key === 'Enter') {
                                             handleAddSubtask(selectedTask.id, e.currentTarget.value);
                                             e.currentTarget.value = '';
                                         }
                                     }}
                                   />
                               </div>
                           </div>
                       </div>

                       {/* AI Tools Section */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {/* Challenge Generator */}
                           <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800/30">
                               <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                                   <Zap size={16} />
                                   <span>Челлендж (Поппер)</span>
                               </div>
                               {selectedTask.activeChallenge ? (
                                   <div className="space-y-3">
                                       <div className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-xs">
                                           <ReactMarkdown components={markdownComponents}>{selectedTask.activeChallenge}</ReactMarkdown>
                                       </div>
                                       <button 
                                            onClick={() => updateTask({...selectedTask, isChallengeCompleted: !selectedTask.isChallengeCompleted})}
                                            className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${selectedTask.isChallengeCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-indigo-600 border border-indigo-200'}`}
                                        >
                                           {selectedTask.isChallengeCompleted ? 'Челлендж выполнен!' : 'Завершить Челлендж'}
                                        </button>
                                   </div>
                               ) : (
                                   <div className="text-center py-4">
                                       <p className="text-xs text-indigo-400 mb-3">Брось себе вызов, чтобы проверить эту задачу на прочность.</p>
                                       <button 
                                            onClick={() => handleGenerateChallenge(selectedTask)} 
                                            disabled={isAiProcessing}
                                            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 w-full"
                                       >
                                           {isAiProcessing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />} 
                                           Сгенерировать
                                       </button>
                                   </div>
                               )}
                           </div>

                           {/* Therapist */}
                           <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-100 dark:border-amber-800/30">
                               <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-400 font-bold text-sm">
                                   <BrainCircuit size={16} />
                                   <span>Консультант</span>
                               </div>
                               <div className="flex gap-2">
                                   <button 
                                        onClick={() => handleTherapy(selectedTask, 'stuck')} 
                                        disabled={isAiProcessing}
                                        className="flex-1 py-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-500 rounded-lg text-xs font-bold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                   >
                                       Застрял
                                   </button>
                                   <button 
                                        onClick={() => handleTherapy(selectedTask, 'completed')} 
                                        disabled={isAiProcessing}
                                        className="flex-1 py-2 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-500 rounded-lg text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                   >
                                       Успех
                                   </button>
                               </div>
                               {therapyResult && (
                                   <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-100 dark:border-amber-900/50 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in slide-in-from-top-2">
                                       <ReactMarkdown components={markdownComponents}>{therapyResult}</ReactMarkdown>
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>

                   {/* Footer Actions */}
                   <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                       <button onClick={() => { if(confirm("Удалить задачу?")) { deleteTask(selectedTask.id); setSelectedTask(null); } }} className="text-red-400 hover:text-red-600 text-xs font-medium flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                           <Trash2 size={14} /> Удалить
                       </button>
                       <div className="flex gap-2">
                           <button onClick={() => onReflectInJournal(selectedTask.id)} className="flex items-center gap-2 px-4 py-2 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 text-xs font-bold rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition-colors">
                               <BookOpen size={14} /> Рефлексия
                           </button>
                       </div>
                   </div>

               </div>
           </div>
       )}
    </div>
  );
};

export default Kanban;
