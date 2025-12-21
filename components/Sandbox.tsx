
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, Task, Flashcard, AppConfig } from '../types';
import { analyzeSandboxItem, SandboxAnalysis } from '../services/geminiService';
import { ICON_MAP } from '../constants';
import EmptyState from './EmptyState';
import { CheckSquare, Library, Loader2, Quote, BrainCircuit, ArrowLeft, Tag, Archive, Trash2, Dumbbell, Box } from 'lucide-react';

interface Props {
  notes: Note[];
  config: AppConfig;
  onProcessNote: (noteId: string) => void;
  onAddTask: (task: Task) => void;
  onAddFlashcard: (card: Flashcard) => void;
  deleteNote: (id: string) => void;
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
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
    h1: ({node, children, ...props}: any) => <h1 className="text-lg font-bold mt-4 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h1>,
    h2: ({node, children, ...props}: any) => <h2 className="text-base font-bold mt-3 mb-2 text-slate-900 dark:text-slate-100 tracking-tight" {...props}>{cleanHeader(children)}</h2>,
    h3: ({node, children, ...props}: any) => <h3 className="text-sm font-bold mt-3 mb-1 text-slate-900 dark:text-slate-100 uppercase tracking-wide" {...props}>{cleanHeader(children)}</h3>,
    h4: ({node, children, ...props}: any) => <h4 className="text-sm font-bold mt-2 mb-1 text-slate-800 dark:text-slate-200" {...props}>{cleanHeader(children)}</h4>,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-indigo-200 dark:border-indigo-800 pl-4 py-1 my-3 text-slate-600 dark:text-slate-400 italic bg-indigo-50/30 dark:bg-indigo-900/20 rounded-r-lg" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-slate-900 dark:text-slate-100" {...props} />,
    em: ({node, ...props}: any) => <em className="italic text-slate-800 dark:text-slate-200" {...props} />,
    code: ({node, inline, className, children, ...props}: any) => {
         return inline 
            ? <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400 border border-slate-200 dark:border-slate-700" {...props}>{children}</code>
            : <code className="block bg-slate-900 dark:bg-black text-slate-50 p-3 rounded-lg text-xs font-mono my-3 overflow-x-auto whitespace-pre-wrap" {...props}>{children}</code>
    }
};

const Sandbox: React.FC<Props> = ({ notes, config, onProcessNote, onAddTask, onAddFlashcard, deleteNote }) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SandboxAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mentorId, setMentorId] = useState<string>(config.mentors[0]?.id || 'peterson');

  const incomingNotes = notes.filter(n => n.status === 'sandbox');

  const handleSelectNote = (note: Note) => {
    setSelectedNoteId(note.id);
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
      if (!selectedNoteId) return;
      const note = notes.find(n => n.id === selectedNoteId);
      if (!note) return;

      setIsAnalyzing(true);
      const result = await analyzeSandboxItem(note.content, mentorId, config);
      setAnalysis(result);
      setIsAnalyzing(false);
  };

  const handleBackToList = () => {
    setSelectedNoteId(null);
    setAnalysis(null);
  };

  const handleAcceptTask = () => {
    if (!analysis || !selectedNoteId) return;
    const originalNote = notes.find(n => n.id === selectedNoteId);
    onAddTask({
      id: Date.now().toString(),
      content: analysis.suggestedTask,
      description: originalNote ? originalNote.content : undefined,
      column: 'todo',
      createdAt: Date.now()
    });
    alert("Задача создана! Заметка осталась в «Песочнице».");
  };

  const handleAcceptCard = () => {
    if (!analysis || !selectedNoteId) return;
    onAddFlashcard({
      id: Date.now().toString(),
      front: analysis.suggestedFlashcardFront,
      back: analysis.suggestedFlashcardBack,
      level: 0,
      nextReview: Date.now()
    });
    alert("Навык создан! Заметка осталась в «Песочнице».");
  };
  
  const handleManualArchive = () => {
      if (selectedNoteId) {
          if (window.confirm("Перенести заметку в «Библиотеку»?")) {
            onProcessNote(selectedNoteId);
            setAnalysis(null);
            setSelectedNoteId(null);
          }
      }
  };

  const RenderIcon = ({ name, className }: { name: string, className?: string }) => {
      const Icon = ICON_MAP[name] || ICON_MAP['User'];
      return <Icon className={className} size={24} />;
  };

  const currentMentor = config.mentors.find(m => m.id === mentorId);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a]">
        <header className={`p-4 md:p-8 pb-0 shrink-0 ${selectedNoteId ? 'hidden md:block' : 'block'}`}>
            <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Песочница <span className="text-amber-500 text-base md:text-lg">/ Лаборатория смыслов</span></h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm md:text-base">Верстак смыслов. Преврати хаос в порядок.</p>
        </header>

        <div className="flex flex-1 overflow-hidden p-4 md:p-8 gap-6 relative">
            {/* Left: Incoming Queue */}
            <div className={`${selectedNoteId ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 flex-col gap-4 overflow-y-auto pr-2 border-r-0 md:border-r border-slate-200 dark:border-slate-700 custom-scrollbar-light`}>
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider sticky top-0 bg-[#f8fafc] dark:bg-[#0f172a] py-2 z-10">Входящие ({incomingNotes.length})</h3>
                {incomingNotes.length === 0 ? (
                    <div className="py-10">
                        <EmptyState 
                            icon={Box} 
                            title="Входящих нет" 
                            description="Отправьте заметки из «Салфеток», чтобы начать работу над ними." 
                            color="amber"
                        />
                    </div>
                ) : (
                    <div className="space-y-3 pb-20 md:pb-0">
                        {incomingNotes.map(note => (
                            <div key={note.id} onClick={() => handleSelectNote(note)} className={`p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] group relative ${selectedNoteId === note.id ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 shadow-sm' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-800 shadow-sm'}`}>
                                <div className="text-sm text-slate-700 dark:text-slate-300 line-clamp-4 leading-relaxed mb-3">
                                    <ReactMarkdown components={markdownComponents}>{note.content}</ReactMarkdown>
                                </div>
                                <div className="flex justify-between items-center mt-2 border-t border-slate-50 dark:border-slate-700 pt-2">
                                    <div className="flex gap-1 flex-wrap">
                                        {note.tags.slice(0, 2).map(t => (
                                            <span key={t} className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md text-slate-500 dark:text-slate-400 font-medium flex items-center gap-0.5">
                                                {t.replace(/^#/, '')}
                                            </span>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if (window.confirm("Удалить заметку?")) {
                                                deleteNote(note.id);
                                                if (selectedNoteId === note.id) {
                                                    setAnalysis(null);
                                                    setSelectedNoteId(null);
                                                }
                                            }
                                        }} 
                                        className="p-1.5 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-slate-100 dark:border-slate-700 hover:border-red-100 dark:hover:border-red-800 shadow-sm"
                                        title="Удалить"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Workbench */}
            <div className={`
                flex-col overflow-y-auto custom-scrollbar-light
                ${selectedNoteId 
                    ? 'fixed inset-0 z-[100] bg-[#f8fafc] dark:bg-[#0f172a] p-4 flex animate-in zoom-in-95 duration-200' 
                    : 'hidden'
                }
                md:flex md:static md:z-auto md:w-2/3 md:bg-transparent md:p-0 md:animate-none
            `}>
                <div className="md:hidden mb-4 flex items-center justify-between text-slate-500 dark:text-slate-400 shrink-0">
                     <div className="flex items-center gap-2" onClick={handleBackToList}>
                        <button className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm"><ArrowLeft size={20} /></button>
                        <span className="font-medium text-sm">Назад</span>
                     </div>
                     <button onClick={handleManualArchive} className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Library size={14} /> <span className="hidden md:inline">В библиотеку</span>
                     </button>
                </div>

                {!selectedNoteId ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600 p-8 text-center">
                        <BrainCircuit size={64} className="mb-6 opacity-40" />
                        <p className="text-lg font-light">Выберите заметку для анализа</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-lg md:shadow-sm border border-slate-200 dark:border-slate-700 p-5 md:p-8 h-full md:h-auto overflow-y-auto flex flex-col relative custom-scrollbar-light">
                        
                        {!isAnalyzing && !analysis && (
                            <div className="mb-8 animate-in fade-in slide-in-from-top-4 mt-8 md:mt-0">
                                <h3 className="text-center text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Выбери ИИ-ментора</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {config.mentors.map(m => (
                                        <button key={m.id} onClick={() => setMentorId(m.id)} className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${mentorId === m.id ? `bg-slate-50 dark:bg-slate-700 border-slate-400 dark:border-slate-500 ring-1 ring-slate-200 dark:ring-slate-600` : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-sm'}`}>
                                            <RenderIcon name={m.icon} className={`mb-2 ${mentorId === m.id ? m.color : 'text-slate-400'}`} />
                                            <span className={`text-xs font-medium ${mentorId === m.id ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{m.name}</span>
                                        </button>
                                    ))}
                                </div>
                                <button onClick={handleAnalyze} className="w-full mt-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none">
                                    <BrainCircuit size={18} /> Начать анализ
                                </button>
                            </div>
                        )}

                        {isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center h-64 space-y-6">
                                <Loader2 className="animate-spin text-amber-500" size={48} />
                                <div className="text-center">
                                    <p className="text-slate-600 dark:text-slate-300 font-medium">Консилиум анализирует идею…</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 font-mono uppercase tracking-wide">Mode: {currentMentor?.name}</p>
                                </div>
                            </div>
                        ) : analysis ? (
                            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6 md:mt-0">
                                <div className="flex justify-between items-center pr-24">
                                    <button onClick={() => setAnalysis(null)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline">Сменить ментора</button>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 ${currentMentor?.color}`}>{currentMentor?.name} Mode</span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border-l-4 border-slate-800 dark:border-slate-400">
                                    <h4 className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold mb-3 text-[10px] uppercase tracking-wider"><Quote size={16} className="text-amber-600" /> Анализ смысла</h4>
                                    <div className="text-slate-700 dark:text-slate-300 italic leading-relaxed text-base">
                                        <ReactMarkdown components={markdownComponents}>{analysis.analysis}</ReactMarkdown>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-10">
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all hover:shadow-md flex flex-col bg-white dark:bg-[#1e293b]">
                                        <div className="mb-6"><div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Путь Действия</div><div className="text-slate-800 dark:text-slate-200 mb-4 text-sm"><ReactMarkdown components={markdownComponents}>{analysis.suggestedTask}</ReactMarkdown></div></div>
                                        <button onClick={handleAcceptTask} className="mt-auto w-full py-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-medium text-sm flex items-center justify-center gap-2 transition-colors"><CheckSquare size={18} /> Создать задачу</button>
                                    </div>
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-md flex flex-col bg-white dark:bg-[#1e293b]">
                                        <div className="mb-6">
                                            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Путь Знания</div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">Вопрос:</div><div className="text-slate-800 dark:text-slate-200 mb-4 text-sm"><ReactMarkdown components={markdownComponents}>{analysis.suggestedFlashcardFront}</ReactMarkdown></div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">Ответ:</div><div className="text-slate-800 dark:text-slate-200 text-sm"><ReactMarkdown components={markdownComponents}>{analysis.suggestedFlashcardBack}</ReactMarkdown></div>
                                        </div>
                                        <button onClick={handleAcceptCard} className="mt-auto w-full py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium text-sm flex items-center justify-center gap-2 transition-colors"><Dumbbell size={18} /> Создать навык</button>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
export default Sandbox;
