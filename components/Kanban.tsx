
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { applyTypography } from '../constants';
import { Plus, MoreVertical, Trash2, Archive, MessageCircle, Play, CheckCircle2, Circle, AlertCircle, Bot, Zap, ArrowRight, X, Clock, GripVertical, Check, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';

interface Props {
  tasks: Task[];
  journalEntries: JournalEntry[];
  config: AppConfig;
  addTask: (t: Task) => void;
  updateTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  reorderTask: (draggedId: string, targetId: string) => void;
  archiveTask: (id: string) => void;
  onReflectInJournal: (taskId: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask: () => void;
}

const cleanHeader = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') return children.replace(/:\s*$/, '');
    if (Array.isArray(children)) {
        return React.Children.map(children, (child, i) => {
             // @ts-ignore
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
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed [&>p]:mb-0" {...props} />,
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

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [newTaskContent, setNewTaskContent] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isAIGenerating, setIsAIGenerating] = useState<string | null>(null);
  const [cardSubtaskInputs, setCardSubtaskInputs] = useState<Record<string, string>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Scroll to task if initialTaskId is set
  useEffect(() => {
      if (initialTaskId) {
          const el = document.getElementById(`task-${initialTaskId}`);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
              setTimeout(() => {
                  el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2');
                  onClearInitialTask();
              }, 2000);
          }
      }
  }, [initialTaskId, onClearInitialTask]);

  const handleAddNewTask = () => {
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
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumn: 'todo' | 'doing' | 'done') => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      if (taskId) {
          const task = tasks.find(t => t.id === taskId);
          if (task && task.column !== targetColumn) {
              updateTask({ ...task, column: targetColumn });
          }
      }
  };

  const handleCardDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const draggedId = e.dataTransfer.getData('taskId');
      if (draggedId && draggedId !== targetId) {
          reorderTask(draggedId, targetId);
      }
  };

  const handleGenerateChallenge = async (task: Task) => {
      if (!config.challengeAuthors.length) {
          alert("Авторы челленджей не настроены.");
          return;
      }
      setIsAIGenerating(task.id);
      const challenge = await generateTaskChallenge(task.content, config);
      updateTask({ ...task, activeChallenge: challenge, isChallengeCompleted: false, challengeHistory: [...(task.challengeHistory || [])] });
      setIsAIGenerating(null);
  };

  const handleConsultTherapist = async (task: Task) => {
      setIsAIGenerating(task.id);
      const advice = await getKanbanTherapy(task.content, task.column === 'done' ? 'completed' : 'stuck', config);
      updateTask({ 
          ...task, 
          consultationHistory: [...(task.consultationHistory || []), advice] 
      });
      setIsAIGenerating(null);
      // alert(advice); // Simple alert for now, or maybe a modal?
      // Better: open task details? For now just keep it in history.
  };

  const handleToggleSubtask = (task: Task, subtaskId: string) => {
      if (!task.subtasks) return;
      const updatedSubtasks = task.subtasks.map(s => 
          s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
      );
      updateTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (task: Task, subtaskId: string) => {
      if (!task.subtasks) return;
      const updatedSubtasks = task.subtasks.filter(s => s.id !== subtaskId);
      updateTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleAddSubtaskFromCard = (taskId: string) => {
      const text = cardSubtaskInputs[taskId]?.trim();
      if (!text) return;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
          const newSubtask: Subtask = { id: Date.now().toString(), text: applyTypography(text), isCompleted: false };
          updateTask({ ...task, subtasks: [...(task.subtasks || []), newSubtask] });
          setCardSubtaskInputs(prev => ({ ...prev, [taskId]: '' }));
      }
  };

  const startEditing = (task: Task) => {
      setEditingTaskId(task.id);
      setEditContent(task.content);
      setActiveMenuId(null);
  };

  const saveEditing = (task: Task) => {
      if (editContent.trim()) {
          updateTask({ ...task, content: applyTypography(editContent) });
          setEditingTaskId(null);
      }
  };

  const columns = [
      { id: 'todo', label: 'Очередь', icon: Circle, color: 'text-slate-500' },
      { id: 'doing', label: 'В работе', icon: Play, color: 'text-indigo-500' },
      { id: 'done', label: 'Готово', icon: CheckCircle2, color: 'text-emerald-500' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8 overflow-hidden">
      <header className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Действуй, а не планируй</p>
        </div>
      </header>

      {/* Input */}
      <div className="mb-6 shrink-0">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-2 flex items-center gap-2 max-w-2xl">
              <input 
                  type="text" 
                  className="flex-1 bg-transparent px-3 py-2 outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  placeholder="Новая миссия..."
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNewTask()}
              />
              <button 
                  onClick={handleAddNewTask}
                  disabled={!newTaskContent.trim()}
                  className="bg-slate-900 dark:bg-indigo-600 text-white p-2 rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                  <Plus size={20} />
              </button>
          </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 h-full min-w-[800px] pb-4">
              {columns.map(col => {
                  const colTasks = tasks.filter(t => t.column === col.id && !t.isArchived).sort((a,b) => b.createdAt - a.createdAt);
                  return (
                      <div 
                          key={col.id} 
                          className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 min-w-[280px]"
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, col.id as any)}
                      >
                          <div className={`p-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 ${col.color}`}>
                              <col.icon size={18} />
                              <h3 className="font-bold text-sm uppercase tracking-wider">{col.label}</h3>
                              <span className="ml-auto text-xs bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400">{colTasks.length}</span>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar-light">
                              {colTasks.length === 0 ? (
                                  <div className="h-32 flex items-center justify-center text-slate-300 dark:text-slate-700 text-sm italic">
                                      Пусто
                                  </div>
                              ) : (
                                  colTasks.map(task => (
                                      <div 
                                          key={task.id}
                                          id={`task-${task.id}`}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, task.id)}
                                          onDragOver={handleDragOver}
                                          onDrop={(e) => handleCardDrop(e, task.id)}
                                          className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative cursor-grab active:cursor-grabbing"
                                      >
                                          {/* Header */}
                                          <div className="flex justify-between items-start mb-2">
                                              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                                  <Clock size={10} /> {new Date(task.createdAt).toLocaleDateString()}
                                              </div>
                                              <div className="relative">
                                                  <button onClick={() => setActiveMenuId(activeMenuId === task.id ? null : task.id)} className="text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                                                      <MoreVertical size={16} />
                                                  </button>
                                                  {activeMenuId === task.id && (
                                                      <>
                                                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-20 w-48 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                                                              <button onClick={() => startEditing(task)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2"><Plus size={14} /> Редактировать</button>
                                                              <button onClick={() => { archiveTask(task.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-2"><Archive size={14} /> В архив</button>
                                                              <button onClick={() => { deleteTask(task.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"><Trash2 size={14} /> Удалить</button>
                                                          </div>
                                                      </>
                                                  )}
                                              </div>
                                          </div>

                                          {/* Content */}
                                          {editingTaskId === task.id ? (
                                              <div className="mb-2">
                                                  <textarea 
                                                      className="w-full p-2 border border-indigo-300 rounded text-sm bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600" 
                                                      rows={3}
                                                      value={editContent} 
                                                      onChange={(e) => setEditContent(e.target.value)} 
                                                  />
                                                  <div className="flex justify-end gap-2 mt-2">
                                                      <button onClick={() => setEditingTaskId(null)} className="text-xs text-slate-500">Отмена</button>
                                                      <button onClick={() => saveEditing(task)} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Сохранить</button>
                                                  </div>
                                              </div>
                                          ) : (
                                              <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed mb-3">
                                                  <ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown>
                                              </div>
                                          )}

                                          {/* Subtasks */}
                                          {task.subtasks && task.subtasks.length > 0 && (
                                              <div className="space-y-1 mb-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                  {task.subtasks.map(s => (
                                                      <div key={s.id} className="flex items-start gap-2 group/sub">
                                                          <button onClick={() => handleToggleSubtask(task, s.id)} className={`mt-0.5 shrink-0 ${s.isCompleted ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                              {s.isCompleted ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                                          </button>
                                                          <span className={`text-xs flex-1 ${s.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{s.text}</span>
                                                          <button onClick={() => handleDeleteSubtask(task, s.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 transition-opacity"><X size={12} /></button>
                                                      </div>
                                                  ))}
                                              </div>
                                          )}

                                          {/* Add Subtask Input (From Snippet) */}
                                          <div className="flex gap-1 mt-2 mb-3" onClick={e => e.stopPropagation()}>
                                              <input
                                                  type="text"
                                                  className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                                                  placeholder="Добавить подзадачу..."
                                                  value={cardSubtaskInputs[task.id] || ''}
                                                  onChange={(e) => setCardSubtaskInputs(prev => ({...prev, [task.id]: e.target.value}))}
                                                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtaskFromCard(task.id)}
                                              />
                                              <button onClick={() => handleAddSubtaskFromCard(task.id)} className="px-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800">
                                                  <Plus size={12} />
                                              </button>
                                          </div>

                                          {/* Challenge & AI Actions */}
                                          <div className="pt-3 border-t border-slate-50 dark:border-slate-700 flex flex-col gap-2">
                                              {/* Challenge Section */}
                                              {task.activeChallenge ? (
                                                  <div className={`p-2 rounded-lg text-xs ${task.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-100 dark:border-amber-800'}`}>
                                                      <div className="flex justify-between items-start mb-1">
                                                          <span className="font-bold flex items-center gap-1 uppercase tracking-wider text-[10px]"><Zap size={10} /> Челлендж</span>
                                                          {!task.isChallengeCompleted && (
                                                              <button onClick={() => updateTask({...task, isChallengeCompleted: true})} className="text-[10px] bg-white dark:bg-black/20 px-1.5 py-0.5 rounded border border-transparent hover:border-current transition-colors">Завершить</button>
                                                          )}
                                                      </div>
                                                      <div className="leading-snug opacity-90"><ReactMarkdown components={markdownComponents}>{task.activeChallenge}</ReactMarkdown></div>
                                                  </div>
                                              ) : (
                                                  task.column === 'doing' && (
                                                      <button 
                                                          onClick={() => handleGenerateChallenge(task)} 
                                                          disabled={isAIGenerating === task.id}
                                                          className="w-full py-1.5 rounded-lg border border-dashed border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 text-xs hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center justify-center gap-2 transition-colors"
                                                      >
                                                          {isAIGenerating === task.id ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                                                          Бросить вызов (ИИ)
                                                      </button>
                                                  )
                                              )}

                                              {/* Footer Actions */}
                                              <div className="flex justify-between items-center mt-1">
                                                  <div className="flex gap-1">
                                                      <Tooltip content="Совет">
                                                          <button onClick={() => handleConsultTherapist(task)} disabled={isAIGenerating === task.id} className="p-1.5 text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md">
                                                              {isAIGenerating === task.id ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                                                          </button>
                                                      </Tooltip>
                                                      <Tooltip content="Рефлексия">
                                                          <button onClick={() => onReflectInJournal(task.id)} className="p-1.5 text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-md">
                                                              <MessageCircle size={14} />
                                                          </button>
                                                      </Tooltip>
                                                  </div>
                                                  {task.consultationHistory && task.consultationHistory.length > 0 && (
                                                      <Tooltip content="Есть советы">
                                                          <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                                                              <Bot size={10} /> {task.consultationHistory.length}
                                                          </span>
                                                      </Tooltip>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>
    </div>
  );
};

export default Kanban;
