import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, Subtask, JournalEntry, AppConfig } from '../types';
import { generateTaskChallenge, getKanbanTherapy } from '../services/geminiService';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { 
  Plus, MoreHorizontal, Calendar, Zap, MessageCircle, 
  Trash2, X, Check, GripVertical, CheckCircle2, Circle, 
  Play, Pause, Book, Archive, Layout, ListTodo, AlertTriangle, 
  ChevronRight, ChevronDown, Minus, Edit3
} from 'lucide-react';

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
    <div className={`rounded-lg border overflow-hidden transition-all ${isCard ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 mb-3'}`}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className={`w-full flex items-center justify-between text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors ${isCard ? 'p-2' : 'p-4'}`}
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
        <div className={`${isCard ? 'px-2 pb-2' : 'px-4 pb-4'} pt-0 animate-in slide-in-from-top-1 duration-200`}>
           <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-sm">
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [activeColumn, setActiveColumn] = useState<'todo' | 'doing' | 'done'>('doing');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // States for subtasks in card view
  const [cardSubtaskInputs, setCardSubtaskInputs] = useState<Record<string, string>>({});
  
  // Task Editing Modal State
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editChallenge, setEditChallenge] = useState('');
  const [isGeneratingChallenge, setIsGeneratingChallenge] = useState(false);
  const [isTherapistThinking, setIsTherapistThinking] = useState(false);

  useEffect(() => {
    if (initialTaskId) {
      const task = tasks.find(t => t.id === initialTaskId);
      if (task) {
        setSelectedTask(task);
        onClearInitialTask?.();
      }
    }
  }, [initialTaskId, tasks, onClearInitialTask]);

  const handleAddTask = (column: 'todo' | 'doing') => {
    if (!newTaskContent.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      content: applyTypography(newTaskContent),
      column,
      createdAt: Date.now()
    };
    addTask(newTask);
    setNewTaskContent('');
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumn: 'todo' | 'doing' | 'done') => {
    e.preventDefault();
    const id = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.id === id);
    if (task && task.column !== targetColumn) {
      updateTask({ ...task, column: targetColumn });
    }
  };

  const handleTaskDrop = (e: React.DragEvent, targetId: string) => {
      e.stopPropagation(); // Stop bubbling to column drop
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('taskId');
      if (draggedId && draggedId !== targetId) {
          reorderTask(draggedId, targetId);
      }
  };

  // --- SUBTASK DRAG LOGIC ---
  const handleSubtaskDragStart = (e: React.DragEvent, subtaskId: string, taskId: string) => {
      e.stopPropagation();
      e.dataTransfer.setData('subtaskId', subtaskId);
      e.dataTransfer.setData('parentId', taskId);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleSubtaskDrop = (e: React.DragEvent, targetSubtaskId: string, task: Task) => {
      e.preventDefault();
      e.stopPropagation();
      const droppedSubtaskId = e.dataTransfer.getData('subtaskId');
      const parentId = e.dataTransfer.getData('parentId');
      
      if (parentId !== task.id || !droppedSubtaskId || droppedSubtaskId === targetSubtaskId) return;

      const subtasks = [...(task.subtasks || [])];
      const draggedIdx = subtasks.findIndex(s => s.id === droppedSubtaskId);
      const targetIdx = subtasks.findIndex(s => s.id === targetSubtaskId);
      
      if (draggedIdx > -1 && targetIdx > -1) {
          const [removed] = subtasks.splice(draggedIdx, 1);
          subtasks.splice(targetIdx, 0, removed);
          updateTask({ ...task, subtasks });
      }
  };

  const handleAddSubtaskFromCard = (taskId: string) => {
      const text = cardSubtaskInputs[taskId]?.trim();
      if (!text) return;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const newSubtask: Subtask = {
              id: Date.now().toString(),
              text,
              isCompleted: false
          };
          updateTask({ ...task, subtasks: [...(task.subtasks || []), newSubtask] });
          setCardSubtaskInputs(prev => ({...prev, [taskId]: ''}));
      }
  };

  const handleDeleteSubtask = (subtaskId: string, taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.subtasks) {
          updateTask({ ...task, subtasks: task.subtasks.filter(s => s.id !== subtaskId) });
      }
  };

  const handleToggleSubtask = (subtaskId: string, taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.subtasks) {
          const updatedSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s);
          updateTask({ ...task, subtasks: updatedSubtasks });
      }
  };

  // --- CHALLENGE LOGIC ---
  const generateChallenge = async () => {
      if (!selectedTask) return;
      setIsGeneratingChallenge(true);
      const challenge = await generateTaskChallenge(selectedTask.content, config);
      setEditChallenge(challenge);
      updateTask({ ...selectedTask, activeChallenge: challenge, isChallengeCompleted: false, challengeHistory: [...(selectedTask.challengeHistory || [])] });
      setIsGeneratingChallenge(false);
  };

  const completeChallenge = () => {
      if (!selectedTask) return;
      const updated = { 
          ...selectedTask, 
          isChallengeCompleted: true, 
          challengeHistory: selectedTask.activeChallenge ? [selectedTask.activeChallenge, ...(selectedTask.challengeHistory || [])] : selectedTask.challengeHistory,
          activeChallenge: undefined // Clear active challenge or keep it as completed? Usually keep it to show completion status.
          // Let's keep activeChallenge but mark it completed. When generating new one, we push old one to history.
      };
      updateTask(updated);
      setSelectedTask(updated);
  };

  const askTherapist = async (type: 'stuck' | 'completed') => {
      if (!selectedTask) return;
      setIsTherapistThinking(true);
      const advice = await getKanbanTherapy(selectedTask.content, type, config);
      const newConsultation = `**Консультант (${type === 'stuck' ? 'Затор' : 'Успех'}):**\n${advice}`;
      const updated = { ...selectedTask, consultationHistory: [newConsultation, ...(selectedTask.consultationHistory || [])] };
      updateTask(updated);
      setSelectedTask(updated);
      setIsTherapistThinking(false);
  };

  // Renders
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
                        <span className={`text-sm flex-1 break-words leading-snug ${subtask.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>
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
                        className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
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

  const renderColumn = (colId: 'todo' | 'doing' | 'done', title: string, icon: React.ReactNode) => {
    const colTasks = tasks.filter(t => t.column === colId && !t.isArchived).sort((a, b) => b.createdAt - a.createdAt);
    const isMobileHidden = window.innerWidth < 768 && activeColumn !== colId;

    return (
      <div 
        className={`flex-1 flex flex-col h-full min-w-0 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 ${isMobileHidden ? 'hidden' : 'flex'}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, colId)}
      >
        <div className="p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${colId === 'todo' ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : colId === 'doing' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'}`}>
                {icon}
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">{title}</h3>
            <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-bold text-slate-400 border border-slate-100 dark:border-slate-700">{colTasks.length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar-light min-h-0">
          {colTasks.map(task => (
            <div 
              key={task.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDrop={(e) => handleTaskDrop(e, task.id)}
              onClick={() => { setSelectedTask(task); setEditContent(task.content); setEditChallenge(task.activeChallenge || ''); }}
              className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-2">
                 <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Calendar size={10} /> {new Date(task.createdAt).toLocaleDateString()}
                 </div>
                 {task.activeChallenge && !task.isChallengeCompleted && (
                     <Tooltip content="Активный челлендж">
                        <Zap size={12} className="text-amber-500 animate-pulse" />
                     </Tooltip>
                 )}
              </div>
              
              <div className="text-sm text-slate-800 dark:text-slate-200 leading-snug line-clamp-3 mb-2">
                  <ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown>
              </div>

              {/* Quick Subtask View/Add */}
              {renderCardChecklist(task)}

              <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                  <div className="flex -space-x-1">
                      {/* Avatars or Tags placeholder */}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {colId === 'done' && (
                          <Tooltip content="В архив">
                              <button onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }} className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-400 hover:text-emerald-600 rounded"><Archive size={14} /></button>
                          </Tooltip>
                      )}
                      <Tooltip content="Удалить">
                          <button onClick={(e) => { e.stopPropagation(); if(confirm('Удалить задачу?')) deleteTask(task.id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                      </Tooltip>
                  </div>
              </div>
            </div>
          ))}
          {colTasks.length === 0 && (
              <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-xs text-slate-400">
                  Нет задач
              </div>
          )}
        </div>

        {/* Quick Add (Only for Todo/Doing) */}
        {colId !== 'done' && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
               <div className="relative">
                   <input 
                      type="text" 
                      placeholder="Новая задача..." 
                      className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all dark:text-slate-200"
                      value={activeColumn === colId ? newTaskContent : ''}
                      onChange={(e) => {
                          if (activeColumn !== colId) setActiveColumn(colId);
                          setNewTaskContent(e.target.value);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask(colId)}
                   />
                   <button 
                      onClick={() => handleAddTask(colId)}
                      className="absolute right-1.5 top-1.5 p-1.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                   >
                       <Plus size={14} />
                   </button>
               </div>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
      
      {/* Mobile Column Switcher */}
      <div className="md:hidden p-4 pb-0 flex gap-2 overflow-x-auto">
          {['todo', 'doing', 'done'].map((col) => (
              <button 
                key={col}
                onClick={() => setActiveColumn(col as any)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors border ${activeColumn === col ? 'bg-slate-800 text-white border-slate-800 dark:bg-indigo-600 dark:border-indigo-600' : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
              >
                  {col === 'todo' ? 'Надо' : col === 'doing' ? 'В работе' : 'Готово'}
              </button>
          ))}
      </div>

      <div className="flex-1 flex gap-4 p-4 md:p-8 overflow-hidden">
          {renderColumn('todo', 'К исполнению', <Layout size={18} />)}
          {renderColumn('doing', 'В процессе', <Play size={18} />)}
          {renderColumn('done', 'Завершено', <CheckCircle2 size={18} />)}
      </div>

      {/* Detail Modal */}
      {selectedTask && (
          <div className="fixed inset-0 z-50 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
              <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6 shrink-0">
                      <div>
                          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              {isEditingContent ? 'Редактирование' : 'Детали задачи'}
                              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${selectedTask.column === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>{selectedTask.column}</span>
                          </h3>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => onReflectInJournal(selectedTask.id)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center gap-2">
                              <Book size={20} /> <span className="hidden md:inline text-sm font-medium">В дневник</span>
                          </button>
                          <button onClick={() => setSelectedTask(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg">
                              <X size={24} />
                          </button>
                      </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar-light space-y-6">
                      
                      {/* Main Content */}
                      <div className="group relative">
                          {isEditingContent ? (
                              <div>
                                  <textarea 
                                    className="w-full h-32 p-3 border border-indigo-300 dark:border-indigo-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                  />
                                  <div className="flex justify-end gap-2 mt-2">
                                      <button onClick={() => setIsEditingContent(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded">Отмена</button>
                                      <button onClick={() => { updateTask({...selectedTask, content: applyTypography(editContent)}); setIsEditingContent(false); }} className="px-3 py-1.5 text-xs bg-slate-900 text-white rounded hover:bg-slate-800">Сохранить</button>
                                  </div>
                              </div>
                          ) : (
                              <div className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <ReactMarkdown components={markdownComponents}>{selectedTask.content}</ReactMarkdown>
                                  <button onClick={() => { setEditContent(selectedTask.content); setIsEditingContent(true); }} className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-700 shadow-sm rounded text-slate-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Edit3 size={14} />
                                  </button>
                              </div>
                          )}
                      </div>

                      {/* Subtasks in Modal */}
                      {renderCardChecklist(selectedTask)}

                      {/* Challenge Section */}
                      <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800/50">
                          <div className="flex justify-between items-center mb-4">
                              <h4 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2 text-sm uppercase tracking-wide">
                                  <Zap size={16} /> Режим Челленджа
                              </h4>
                              {selectedTask.activeChallenge && !selectedTask.isChallengeCompleted && (
                                  <button onClick={completeChallenge} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm">
                                      <Check size={14} /> Выполнить
                                  </button>
                              )}
                          </div>
                          
                          {selectedTask.activeChallenge ? (
                              <div className={`p-4 rounded-lg bg-white dark:bg-slate-800 border ${selectedTask.isChallengeCompleted ? 'border-emerald-200 dark:border-emerald-800' : 'border-indigo-200 dark:border-indigo-800'} shadow-sm`}>
                                  <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                      <ReactMarkdown components={markdownComponents}>{selectedTask.activeChallenge}</ReactMarkdown>
                                  </div>
                                  {selectedTask.isChallengeCompleted && (
                                      <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                          <CheckCircle2 size={14} /> Челлендж завершен!
                                      </div>
                                  )}
                              </div>
                          ) : (
                              <div className="text-center py-6 text-slate-400 text-sm italic">
                                  Нет активного челленджа
                              </div>
                          )}

                          <div className="mt-4 flex justify-center">
                              <button 
                                onClick={generateChallenge} 
                                disabled={isGeneratingChallenge}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                              >
                                  {isGeneratingChallenge ? <span className="animate-spin">⏳</span> : <Zap size={16} />}
                                  {selectedTask.activeChallenge ? "Сгенерировать новый" : "Бросить вызов (AI)"}
                              </button>
                          </div>
                      </div>

                      {/* Therapy / Advice */}
                      <div className="space-y-3">
                          <h4 className="font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide flex items-center gap-2">
                              <MessageCircle size={14} /> Совет мудреца
                          </h4>
                          <div className="flex gap-2">
                              <button onClick={() => askTherapist('stuck')} disabled={isTherapistThinking} className="flex-1 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                  <AlertTriangle size={16} /> Я застрял
                              </button>
                              <button onClick={() => askTherapist('completed')} disabled={isTherapistThinking} className="flex-1 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                  <CheckCircle2 size={16} /> Урок успеха
                              </button>
                          </div>
                          
                          {selectedTask.consultationHistory && selectedTask.consultationHistory.length > 0 && (
                              <div className="mt-4 space-y-4">
                                  {selectedTask.consultationHistory.map((consult, idx) => (
                                      <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300">
                                          <ReactMarkdown components={markdownComponents}>{consult}</ReactMarkdown>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Kanban;