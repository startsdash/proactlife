
import React, { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { getKanbanTherapy, generateTaskChallenge } from '../services/geminiService';
import { CheckCircle2, MessageCircle, X, Zap, RotateCcw, Play, FileText, Check, Trash2, Plus, Minus, Book, ArrowDown, ArrowUp, Square, Circle, XCircle, Kanban as KanbanIcon, ListTodo, Bot, Pin, GripVertical, ChevronDown, Edit3, Search, Rocket, MoreHorizontal } from 'lucide-react';
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

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-1 text-sm text-slate-700 dark:text-slate-300 leading-snug" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-1 text-sm" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-semibold text-slate-900 dark:text-white" {...props} />,
};

// --- MINIMALISTIC SPHERE INDICATOR ---
const SphereDot: React.FC<{ spheres: string[] }> = ({ spheres }) => {
    if (!spheres || spheres.length === 0) return null;
    return (
        <div className="flex gap-1">
            {spheres.map(id => {
                const s = SPHERES.find(sp => sp.id === id);
                if (!s) return null;
                return (
                    <Tooltip key={id} content={s.label}>
                        <div className={`w-2 h-2 rounded-full ${s.bg.replace('50', '400').replace('/30', '')} ring-1 ring-white dark:ring-slate-800`} />
                    </Tooltip>
                );
            })}
        </div>
    );
};

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<{taskId: string, type: 'details'} | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');

  const baseActiveTasks = tasks.filter(t => !t.isArchived);
  const activeTasks = baseActiveTasks.filter(task => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (task.title?.toLowerCase().includes(q) || task.content.toLowerCase().includes(q));
  });

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'doing', title: 'In Progress', color: 'bg-indigo-50 dark:bg-indigo-900/10' },
    { id: 'done', title: 'Done', color: 'bg-emerald-50 dark:bg-emerald-900/10' }
  ];

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetCol: string, targetId?: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('taskId');
      if (!draggedId) return;
      
      const draggedTask = tasks.find(t => t.id === draggedId);
      if (!draggedTask) return;

      if (targetId && draggedTask.column === targetCol) {
          reorderTask(draggedId, targetId);
      } else if (draggedTask.column !== targetCol) {
          updateTask({ ...draggedTask, column: targetCol as any });
      }
  };

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

  const renderCard = (task: Task) => {
      const subtasksTotal = task.subtasks?.length || 0;
      const subtasksDone = task.subtasks?.filter(s => s.isCompleted).length || 0;
      const hasChallenge = task.activeChallenge && !task.isChallengeCompleted;
      const hasJournal = journalEntries.some(e => e.linkedTaskId === task.id);

      return (
          <div 
            key={task.id}
            draggable
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.stopPropagation(); handleDrop(e, task.column, task.id); }}
            onClick={() => setActiveModal({ taskId: task.id, type: 'details' })}
            className={`
                group relative bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm 
                hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-default
                ${task.column === 'done' ? 'opacity-70 grayscale-[0.5] hover:grayscale-0' : ''}
            `}
          >
              <div className="flex justify-between items-start mb-2">
                  <SphereDot spheres={task.spheres || []} />
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-1 text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
              </div>

              {task.title && (
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1 leading-snug">{task.title}</h4>
              )}
              <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-3">
                  <ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown>
              </div>

              {/* Footer Metrics */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                  {subtasksTotal > 0 && (
                      <div className={`flex items-center gap-1 text-[10px] font-bold ${subtasksDone === subtasksTotal ? 'text-emerald-500' : 'text-slate-400'}`}>
                          <ListTodo size={12} /> {subtasksDone}/{subtasksTotal}
                      </div>
                  )}
                  {hasChallenge && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500" title="Активный челлендж">
                          <Zap size={12} fill="currentColor" />
                      </div>
                  )}
                  {hasJournal && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-500" title="Есть записи в дневнике">
                          <Book size={12} />
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8">
      <header className="flex justify-between items-center mb-6 shrink-0">
          <div>
              <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
              <p className="text-sm text-slate-500">Поток задач</p>
          </div>
          <div className="relative">
              <input 
                type="text" 
                placeholder="Поиск..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-slate-700 w-40 focus:w-60 transition-all"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
          <div className="flex h-full gap-6 min-w-[800px]">
              {columns.map(col => (
                  <div 
                    key={col.id} 
                    className="flex-1 flex flex-col h-full min-w-[280px]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                      <div className="flex justify-between items-center mb-3 px-1">
                          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest">{col.title}</h3>
                          <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-mono">
                              {activeTasks.filter(t => t.column === col.id).length}
                          </span>
                      </div>
                      
                      <div className={`flex-1 rounded-2xl p-2 space-y-3 overflow-y-auto custom-scrollbar-light ${col.id === 'todo' ? '' : 'bg-slate-50/50 dark:bg-slate-900/30 border border-transparent dark:border-slate-800'}`}>
                          {col.id === 'todo' && (
                              <div className="mb-2">
                                  {!isCreatorOpen ? (
                                      <button 
                                        onClick={() => setIsCreatorOpen(true)}
                                        className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                      >
                                          <Plus size={16} /> Новая задача
                                      </button>
                                  ) : (
                                      <div className="bg-white dark:bg-[#1e293b] p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-lg animate-in slide-in-from-top-2">
                                          <input 
                                            className="w-full text-sm font-bold bg-transparent outline-none mb-2 placeholder:text-slate-300"
                                            placeholder="Заголовок"
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            autoFocus
                                          />
                                          <textarea 
                                            className="w-full text-xs bg-transparent outline-none resize-none h-16 placeholder:text-slate-300"
                                            placeholder="Описание..."
                                            value={newTaskContent}
                                            onChange={(e) => setNewTaskContent(e.target.value)}
                                          />
                                          <div className="flex justify-end gap-2 mt-2">
                                              <button onClick={() => setIsCreatorOpen(false)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">Отмена</button>
                                              <button onClick={handleCreateTask} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700">Создать</button>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}
                          
                          {activeTasks.filter(t => t.column === col.id).map(task => renderCard(task))}
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default Kanban;
