
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task, AppConfig, JournalEntry, Subtask } from '../types';
import { generateTaskChallenge, getKanbanTherapy } from '../services/geminiService';
import { applyTypography } from '../constants';
import { Plus, MoreVertical, Calendar, CheckCircle2, Circle, Clock, Zap, MessageCircle, ArrowRight, X, Trash2, Edit3, Archive, Bot, Loader2, Play, Pause, RotateCcw, AlertCircle, Layout, User, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { Tooltip } from './Tooltip';

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

type ModalState = {
    type: 'create' | 'details';
    taskId?: string;
    column?: 'todo' | 'doing' | 'done';
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-sm text-slate-800 dark:text-slate-300 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-2 space-y-1 text-sm text-slate-800 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700" {...props}>{children}</code>
            : <code className="block bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

const Kanban: React.FC<Props> = ({ tasks, journalEntries, config, addTask, updateTask, deleteTask, reorderTask, archiveTask, onReflectInJournal, initialTaskId, onClearInitialTask }) => {
  const [activeModal, setActiveModal] = useState<ModalState | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  
  // Create Form State
  const [newTaskContent, setNewTaskContent] = useState('');
  
  // Edit/Detail Form State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  useEffect(() => {
      if (initialTaskId) {
          const task = tasks.find(t => t.id === initialTaskId);
          if (task) {
              setActiveModal({ type: 'details', taskId: initialTaskId });
              onClearInitialTask?.();
          }
      }
  }, [initialTaskId, tasks, onClearInitialTask]);

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
      if (task && task.column !== targetColumn) {
          updateTask({ ...task, column: targetColumn });
      }
      
      if (targetId && draggedId !== targetId) {
          reorderTask(draggedId, targetId);
      }
  };

  const handleCreateTask = () => {
      if (!newTaskContent.trim() || !activeModal || activeModal.type !== 'create') return;
      
      const newTask: Task = {
          id: Date.now().toString(),
          content: applyTypography(newTaskContent),
          column: activeModal.column || 'todo',
          createdAt: Date.now(),
      };
      
      addTask(newTask);
      setNewTaskContent('');
      setActiveModal(null);
  };

  const handleOpenDetails = (task: Task) => {
      setActiveModal({ type: 'details', taskId: task.id });
      setEditTitle(task.title || '');
      setEditContent(task.content);
      setIsEditingTask(false);
  };

  const handleSaveDetails = () => {
      if (!activeModal?.taskId) return;
      const task = tasks.find(t => t.id === activeModal.taskId);
      if (!task) return;

      updateTask({
          ...task,
          title: editTitle.trim() ? applyTypography(editTitle) : undefined,
          content: applyTypography(editContent)
      });
      setIsEditingTask(false);
  };

  const handleGenerateChallenge = async () => {
      if (!activeModal?.taskId) return;
      const task = tasks.find(t => t.id === activeModal.taskId);
      if (!task) return;

      setIsProcessingAI(true);
      try {
          const challenge = await generateTaskChallenge(task.content, config);
          updateTask({
              ...task,
              activeChallenge: challenge,
              isChallengeCompleted: false
          });
      } finally {
          setIsProcessingAI(false);
      }
  };

  const handleCompleteChallenge = () => {
      if (!activeModal?.taskId) return;
      const task = tasks.find(t => t.id === activeModal.taskId);
      if (!task || !task.activeChallenge) return;

      if (window.confirm("Завершить челлендж? Он будет сохранен в историю.")) {
          const history = task.challengeHistory || [];
          updateTask({
              ...task,
              isChallengeCompleted: true,
              challengeHistory: [task.activeChallenge, ...history],
              // activeChallenge remains visible as "completed" state until cleared or replaced
          });
          if (window.confetti) window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
  };

  const handleGetTherapy = async () => {
      if (!activeModal?.taskId) return;
      const task = tasks.find(t => t.id === activeModal.taskId);
      if (!task) return;

      setIsProcessingAI(true);
      try {
          const therapy = await getKanbanTherapy(task.content, task.column === 'done' ? 'completed' : 'stuck', config);
          const history = task.consultationHistory || [];
          updateTask({
              ...task,
              consultationHistory: [therapy, ...history]
          });
      } finally {
          setIsProcessingAI(false);
      }
  };

  const handleCloseModal = () => {
      setActiveModal(null);
      setNewTaskContent('');
      setIsEditingTask(false);
  };

  const getTaskForModal = () => {
      if (activeModal?.type === 'details' && activeModal.taskId) {
          return tasks.find(t => t.id === activeModal.taskId);
      }
      return null;
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.subtasks) return;
      
      const newSubtasks = task.subtasks.map(st => st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st);
      updateTask({ ...task, subtasks: newSubtasks });
  };

  const addSubtask = (taskId: string, text: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const newSubtask: Subtask = { id: Date.now().toString(), text, isCompleted: false };
      updateTask({ ...task, subtasks: [...(task.subtasks || []), newSubtask] });
  };

  const deleteSubtask = (taskId: string, subtaskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !task.subtasks) return;
      updateTask({ ...task, subtasks: task.subtasks.filter(st => st.id !== subtaskId) });
  };

  const columns = [
      { id: 'todo', label: 'В планах', icon: Circle, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/10' },
      { id: 'doing', label: 'В процессе', icon: Loader2, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10' },
      { id: 'done', label: 'Готово', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10' }
  ] as const;

  const renderTaskCard = (task: Task) => {
      const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
      const totalSubtasks = task.subtasks?.length || 0;
      const hasChallenge = !!task.activeChallenge;
      
      return (
          <div 
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, task.column, task.id)}
              onClick={() => handleOpenDetails(task)}
              className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group mb-3 relative"
          >
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2 leading-snug line-clamp-3">
                  {task.title && <span className="block font-bold mb-1">{task.title}</span>}
                  {task.content}
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                  {totalSubtasks > 0 && (
                      <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${completedSubtasks === totalSubtasks ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                          <CheckSquare size={10} /> {completedSubtasks}/{totalSubtasks}
                      </div>
                  )}
                  {hasChallenge && (
                      <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${task.isChallengeCompleted ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30'}`}>
                          <Zap size={10} /> {task.isChallengeCompleted ? 'Выполнено' : 'Челлендж'}
                      </div>
                  )}
                  {task.consultationHistory && task.consultationHistory.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                          <MessageCircle size={10} /> {task.consultationHistory.length}
                      </div>
                  )}
              </div>
              
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip content="В архив">
                      <button 
                          onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                      >
                          <Archive size={14} />
                      </button>
                  </Tooltip>
              </div>
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a]">
        <header className="mb-6 flex justify-between items-end shrink-0">
            <div>
                <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Спринты</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Фокус на действии</p>
            </div>
        </header>

        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start h-full">
            {columns.map(col => {
                const colTasks = tasks.filter(t => t.column === col.id && !t.isArchived).sort((a,b) => b.createdAt - a.createdAt);
                const Icon = col.icon;
                
                return (
                    <div 
                        key={col.id} 
                        className="flex flex-col w-80 md:w-96 shrink-0 h-full max-h-full rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        <div className={`p-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 ${col.bg} rounded-t-2xl`}>
                            <div className="flex items-center gap-2">
                                <Icon size={18} className={col.color} />
                                <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{col.label}</span>
                                <span className="bg-white dark:bg-slate-800 text-slate-500 text-xs px-2 py-0.5 rounded-full font-bold">{colTasks.length}</span>
                            </div>
                            <Tooltip content="Добавить задачу">
                                <button 
                                    onClick={() => setActiveModal({ type: 'create', column: col.id })}
                                    className="p-1.5 hover:bg-white/50 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                                >
                                    <Plus size={18} />
                                </button>
                            </Tooltip>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar-light">
                            {colTasks.length === 0 ? (
                                <div className="h-24 flex items-center justify-center text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                    Пусто
                                </div>
                            ) : (
                                colTasks.map(renderTaskCard)
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* MODALS */}
        {activeModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCloseModal}>
                
                {/* CREATE TASK MODAL */}
                {activeModal.type === 'create' && (
                    <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Новая задача</h3>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <textarea 
                            autoFocus
                            className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 resize-none text-sm"
                            placeholder="Что нужно сделать?"
                            value={newTaskContent}
                            onChange={e => setNewTaskContent(e.target.value)}
                            onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateTask(); } }}
                        />
                        <div className="flex justify-end mt-4">
                            <button 
                                onClick={handleCreateTask}
                                disabled={!newTaskContent.trim()}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Создать
                            </button>
                        </div>
                    </div>
                )}

                {/* DETAILS MODAL */}
                {activeModal.type === 'details' && (() => {
                    const task = getTaskForModal();
                    if (!task) return null;
                    return (
                        <div className="bg-white dark:bg-[#1e293b] w-full max-w-2xl rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-6 shrink-0">
                                <div className="flex-1">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                                        <Calendar size={12} /> {new Date(task.createdAt).toLocaleDateString()}
                                        <span className="text-slate-300">|</span>
                                        <span className={`px-1.5 py-0.5 rounded ${task.column === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {task.column === 'todo' ? 'В планах' : task.column === 'doing' ? 'В процессе' : 'Готово'}
                                        </span>
                                    </div>
                                    {!isEditingTask ? (
                                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                            {task.title || <span className="text-slate-400 font-normal italic">Без названия</span>}
                                        </h2>
                                    ) : (
                                        <input 
                                            value={editTitle}
                                            onChange={e => setEditTitle(e.target.value)}
                                            placeholder="Название задачи"
                                            className="w-full text-xl font-bold bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-transparent focus:border-indigo-300 outline-none"
                                        />
                                    )}
                                </div>
                                <div className="flex items-center shrink-0 gap-1 ml-4">
                                    {!isEditingTask && (
                                        <>
                                            <Tooltip content="Редактировать">
                                                <button onClick={() => setIsEditingTask(true)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors">
                                                    <Edit3 size={18} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Удалить">
                                                <button onClick={() => { if(window.confirm('Удалить задачу?')) { deleteTask(task.id); handleCloseModal(); } }} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </Tooltip>
                                            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700/50 mx-1"></div>
                                        </>
                                    )}
                                    <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X size={20} /></button>
                                </div>
                            </div>

                            <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar-light">
                                {/* CONTENT */}
                                {isEditingTask ? (
                                    <textarea 
                                        value={editContent}
                                        onChange={e => setEditContent(e.target.value)}
                                        className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-sm leading-relaxed"
                                    />
                                ) : (
                                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                        <ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown>
                                    </div>
                                )}

                                {isEditingTask && (
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsEditingTask(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm">Отмена</button>
                                        <button onClick={handleSaveDetails} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Сохранить</button>
                                    </div>
                                )}

                                {/* AI TOOLS */}
                                {!isEditingTask && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* CHALLENGE SECTION */}
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2 font-bold text-xs uppercase text-slate-500">
                                                    <Zap size={14} className="text-amber-500" /> Челлендж
                                                </div>
                                                {task.activeChallenge && !task.isChallengeCompleted && (
                                                    <button onClick={handleCompleteChallenge} className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-200 transition-colors font-bold">Завершить</button>
                                                )}
                                            </div>
                                            
                                            {task.activeChallenge ? (
                                                <div className="text-sm text-slate-700 dark:text-slate-300 mb-3 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <ReactMarkdown components={markdownComponents}>{task.activeChallenge}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 text-xs text-slate-400 italic">Нет активного челленджа</div>
                                            )}
                                            
                                            <button 
                                                onClick={handleGenerateChallenge}
                                                disabled={isProcessingAI}
                                                className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isProcessingAI ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                                                {task.activeChallenge ? 'Сгенерировать новый' : 'Бросить вызов (ИИ)'}
                                            </button>
                                        </div>

                                        {/* THERAPY SECTION */}
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2 font-bold text-xs uppercase text-slate-500">
                                                    <MessageCircle size={14} className="text-indigo-500" /> Советник
                                                </div>
                                            </div>
                                            
                                            {task.consultationHistory && task.consultationHistory.length > 0 ? (
                                                <div className="text-sm text-slate-700 dark:text-slate-300 mb-3 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 max-h-32 overflow-y-auto custom-scrollbar-light">
                                                    <ReactMarkdown components={markdownComponents}>{task.consultationHistory[0]}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 text-xs text-slate-400 italic">Нет записей консультаций</div>
                                            )}
                                            
                                            <button 
                                                onClick={handleGetTherapy}
                                                disabled={isProcessingAI}
                                                className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isProcessingAI ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                                                {task.column === 'done' ? 'Анализ победы' : 'Помощь в решении'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* SUBTASKS */}
                                {!isEditingTask && (
                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold uppercase text-slate-400">Чек-лист</span>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Новый пункт..."
                                                    className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-3 py-1 text-xs w-48 outline-none focus:ring-1 focus:ring-indigo-200"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const val = e.currentTarget.value.trim();
                                                            if (val) {
                                                                addSubtask(task.id, val);
                                                                e.currentTarget.value = '';
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {task.subtasks?.map(st => (
                                                <div key={st.id} className="flex items-center gap-3 group">
                                                    <button onClick={() => toggleSubtask(task.id, st.id)} className={`shrink-0 ${st.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}>
                                                        {st.isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                    </button>
                                                    <span className={`text-sm flex-1 ${st.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{st.text}</span>
                                                    <button onClick={() => deleteSubtask(task.id, st.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                                                </div>
                                            ))}
                                            {(!task.subtasks || task.subtasks.length === 0) && (
                                                <div className="text-xs text-slate-400 italic pl-1">Нет подзадач</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                                <button onClick={() => onReflectInJournal(task.id)} className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                    <ArrowRight size={14} /> Открыть в Дневнике
                                </button>
                                {task.isArchived && <span className="text-xs text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded">Архивировано</span>}
                            </div>
                        </div>
                    );
                })()}
            </div>
        )}
    </div>
  );
};

export default Kanban;
