import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task } from '../types';
import { RotateCcw, Trash2, History, Calendar, CheckCircle2, FileText, X, Zap, List, Plus, Minus, MessageCircle } from 'lucide-react';

interface Props {
  tasks: Task[];
  restoreTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

// Helper to strip trailing colons from headers (Recursive)
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

// Standardized Markdown Styles (Matches Kanban)
const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-3 last:mb-0 text-slate-800 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-800" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-slate-800" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-lg font-bold mt-4 mb-2 text-slate-900 tracking-tight" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-base font-bold mt-3 mb-2 text-slate-900 tracking-tight" {...props}>{cleanHeader(children)}</h2>,
    h3: ({node, children, ...props}: any) => <h3 className="text-sm font-bold mt-3 mb-1 text-slate-900 uppercase tracking-wide" {...props}>{cleanHeader(children)}</h3>,
    h4: ({node, children, ...props}: any) => <h4 className="text-sm font-bold mt-2 mb-1 text-slate-800" {...props}>{cleanHeader(children)}</h4>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-indigo-200 pl-4 py-1 my-3 text-slate-600 italic bg-indigo-50/30 rounded-r-lg" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900" {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-slate-800" {...props} />,
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, children, icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden mb-3">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 transition-colors"
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
        <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-1 duration-200">
           <div className="pt-3 border-t border-slate-200/50 text-sm">
             {children}
           </div>
        </div>
      )}
    </div>
  );
};

const Archive: React.FC<Props> = ({ tasks, restoreTask, deleteTask }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
      console.log("Archive Component Mounted");
  }, []);

  // Filter only archived tasks and sort by newest first
  const archivedTasks = tasks
    .filter(t => t.isArchived)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="h-full p-4 md:p-8 flex flex-col overflow-hidden relative">
      <header className="mb-6 shrink-0">
        <h1 className="text-2xl md:text-3xl font-light text-slate-800 tracking-tight flex items-center gap-3">
            <History className="text-slate-400" size={32} />
            <span>Архив <span className="text-slate-400 text-lg">/ History</span></span>
        </h1>
        <p className="text-slate-500 mt-2 text-sm">История ваших действий и побед.</p>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar-light">
        {archivedTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            <History size={48} className="mb-4 opacity-20" />
            <p>Архив пуст</p>
            <p className="text-sm opacity-60">Выполненные задачи появятся здесь после архивации.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedTasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => setSelectedTask(task)}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1 hidden md:inline-flex">
                    <CheckCircle2 size={12} /> Завершено
                  </span>
                   <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1 md:hidden">
                    <CheckCircle2 size={12} />
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-slate-700 text-sm font-medium leading-relaxed mb-4 line-clamp-4">
                  {task.content}
                </div>

                {task.description && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold mb-1">
                      <FileText size={10} /> Источник
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
                   <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Восстановить задачу в 'Сделано'?")) restoreTask(task.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 md:px-4 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Восстановить в Сделано"
                   >
                      <RotateCcw size={14} /> <span className="hidden md:inline">Восстановить</span>
                   </button>
                   <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Удалить задачу из истории навсегда?")) deleteTask(task.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 md:px-4 text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить навсегда"
                   >
                      <Trash2 size={14} /> <span className="hidden md:inline">Удалить</span>
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TASK DETAILS MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">Архивная задача</h3>
                    <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>

                <div className="space-y-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-4">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Задача</span>
                         <div className="text-base text-slate-800 font-medium leading-relaxed">
                            <ReactMarkdown components={markdownComponents}>{selectedTask.content}</ReactMarkdown>
                         </div>
                    </div>

                    {selectedTask.description && (
                        <CollapsibleSection title="Источник" icon={<FileText size={14} />}>
                            <div className="text-sm text-slate-700 leading-relaxed">
                                <ReactMarkdown components={markdownComponents}>{selectedTask.description}</ReactMarkdown>
                            </div>
                        </CollapsibleSection>
                    )}

                    {selectedTask.activeChallenge && (
                        <CollapsibleSection title="Финальный Челлендж" icon={<Zap size={14} />}>
                            <div className={`p-3 rounded-lg border ${selectedTask.isChallengeCompleted ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${selectedTask.isChallengeCompleted ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {selectedTask.isChallengeCompleted ? 'Статус: Выполнен' : 'Статус: Активен'}
                                </span>
                                <div className="text-sm leading-relaxed text-slate-900">
                                  <ReactMarkdown components={markdownComponents}>{selectedTask.activeChallenge}</ReactMarkdown>
                                </div>
                            </div>
                        </CollapsibleSection>
                    )}

                    {selectedTask.challengeHistory && selectedTask.challengeHistory.length > 0 && (
                        <CollapsibleSection title="История Челленджей" icon={<History size={14} />}>
                            <ul className="space-y-3">
                                {selectedTask.challengeHistory.map((h, i) => (
                                    <li key={i} className="text-sm text-slate-900 py-2 border-b border-slate-100 last:border-0">
                                        <ReactMarkdown components={markdownComponents}>{h}</ReactMarkdown>
                                    </li>
                                ))}
                            </ul>
                        </CollapsibleSection>
                    )}
                    
                    {selectedTask.consultationHistory && selectedTask.consultationHistory.length > 0 && (
                        <CollapsibleSection title="История консультаций" icon={<MessageCircle size={14}/>}>
                            <ul className="space-y-4">
                                {selectedTask.consultationHistory.map((consultation, index) => (
                                    <li key={index} className="text-sm text-slate-900 py-3 border-b border-slate-100 last:border-0">
                                        <ReactMarkdown components={markdownComponents}>{consultation}</ReactMarkdown>
                                    </li>
                                ))}
                            </ul>
                        </CollapsibleSection>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 px-2">
                        <span className="font-mono">ID: {selectedTask.id.slice(-6)}</span>
                        <span className="flex items-center gap-1 text-emerald-600 font-medium ml-auto"><CheckCircle2 size={14}/> Завершено</span>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-50">
                    <button 
                        onClick={() => {
                            if (window.confirm("Восстановить задачу в 'Сделано'?")) {
                                restoreTask(selectedTask.id);
                                setSelectedTask(null);
                            }
                        }}
                        className="px-3 py-2 md:px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2 border border-transparent hover:border-slate-200 transition-colors"
                        title="Восстановить"
                    >
                        <RotateCcw size={16} /> <span className="hidden md:inline">Восстановить</span>
                    </button>
                     <button 
                        onClick={() => {
                            if (window.confirm("Удалить задачу из истории навсегда?")) {
                                deleteTask(selectedTask.id);
                                setSelectedTask(null);
                            }
                        }}
                        className="px-3 py-2 md:px-4 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2 border border-transparent hover:border-red-100 transition-colors"
                        title="Удалить"
                    >
                        <Trash2 size={16} /> <span className="hidden md:inline">Удалить</span>
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Archive;