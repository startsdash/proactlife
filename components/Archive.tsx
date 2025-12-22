import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task } from '../types';
import { RotateCcw, Trash2, History, Calendar, CheckCircle2, FileText, X, Zap, List, Plus, Minus, MessageCircle, Circle, XCircle } from 'lucide-react';
import EmptyState from './EmptyState';

interface Props {
  tasks: Task[];
  restoreTask: (id: string) => void;
  deleteTask: (id: string) => void;
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
}> = ({ title, children, icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden mb-3">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
           <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50 text-sm">
             {children}
           </div>
        </div>
      )}
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

const Archive: React.FC<Props> = ({ tasks, restoreTask, deleteTask }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
      console.log("Archive Component Mounted");
  }, []);

  const archivedTasks = tasks
    .filter(t => t.isArchived)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="h-full p-4 md:p-8 flex flex-col overflow-hidden relative">
      <header className="mb-6 shrink-0">
        <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-3">
            <History className="text-slate-400" size={32} />
            <span>Зал славы</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Выполненные миссии</p>
      </header>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar-light">
        {archivedTasks.length === 0 ? (
          <div className="py-10">
              <EmptyState 
                  icon={History} 
                  title="Все впереди!" 
                  description="Немного конфетти для мотивации" 
                  color="amber"
              />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedTasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => setSelectedTask(task)}
                className="bg-white dark:bg-[#1e293b] p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md flex items-center gap-1 hidden md:inline-flex">
                    <CheckCircle2 size={12} /> Завершено
                  </span>
                   <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md flex items-center gap-1 md:hidden">
                    <CheckCircle2 size={12} />
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(task.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="text-slate-800 dark:text-slate-200 text-sm font-normal leading-relaxed mb-4 line-clamp-4">
                  <ReactMarkdown components={markdownComponents}>{task.content}</ReactMarkdown>
                </div>

                {task.description && (
                  <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold mb-1">
                      <FileText size={10} /> Источник
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{task.description}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-50 dark:border-slate-700">
                   <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Восстановить задачу в Спринты?")) restoreTask(task.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 md:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                      title="Восстановить в Спринты"
                   >
                      <RotateCcw size={14} /> <span className="hidden md:inline">Восстановить</span>
                   </button>
                   <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm("Удалить задачу из истории навсегда?")) deleteTask(task.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 md:px-4 text-xs font-medium text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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

      {selectedTask && (
        <div className="fixed inset-0 z-[100] bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Детали задачи</h3>
                    <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
                </div>
                
                <div className="space-y-4">
                     <div className="bg-white dark:bg-[#0f172a] p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
                        <div className="text-sm text-slate-800 dark:text-slate-200 font-normal leading-relaxed">
                            <ReactMarkdown components={markdownComponents}>{selectedTask.content}</ReactMarkdown>
                        </div>
                     </div>
                     
                     {selectedTask.description && (
                        <CollapsibleSection title="Источник" icon={<FileText size={14}/>}>
                            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                 <ReactMarkdown components={markdownComponents}>{selectedTask.description}</ReactMarkdown>
                            </div>
                        </CollapsibleSection>
                     )}

                     {selectedTask.activeChallenge && (
                      <CollapsibleSection 
                        title="Челлендж" 
                        icon={<Zap size={14}/>}
                      >
                         <div className={`p-3 rounded-lg border ${selectedTask.isChallengeCompleted ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'}`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${selectedTask.isChallengeCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                               {selectedTask.isChallengeCompleted ? 'Статус: Выполнен' : 'Статус: Активен'}
                            </span>
                            <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                                <StaticChallengeRenderer content={selectedTask.activeChallenge || ''} mode="history" />
                            </div>
                         </div>
                      </CollapsibleSection>
                    )}

                    {selectedTask.challengeHistory && selectedTask.challengeHistory.length > 0 && (
                      <CollapsibleSection title="История Челленджей" icon={<History size={14}/>}>
                         <div className="space-y-4">
                            {selectedTask.challengeHistory.map((challenge, index) => (
                               <div key={index} className="py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                  <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-200">
                                     <StaticChallengeRenderer content={challenge} mode="history" />
                                  </div>
                               </div>
                            ))}
                         </div>
                      </CollapsibleSection>
                    )}

                    {selectedTask.consultationHistory && selectedTask.consultationHistory.length > 0 && (
                      <CollapsibleSection title="История консультаций" icon={<MessageCircle size={14}/>}>
                         <ul className="space-y-4">
                            {selectedTask.consultationHistory.map((consultation, index) => (
                               <li key={index} className="text-sm text-slate-900 dark:text-slate-200 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                  <ReactMarkdown components={markdownComponents}>{consultation}</ReactMarkdown>
                               </li>
                            ))}
                         </ul>
                      </CollapsibleSection>
                    )}
                </div>
                <div className="mt-8 flex justify-end">
                    <button onClick={() => setSelectedTask(null)} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 font-medium">Закрыть</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Archive;