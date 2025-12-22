import React, { useState, useMemo } from 'react';
import { Note, AppConfig, Task, Flashcard } from '../types';
import { Box, ArrowLeft, BrainCircuit, Library, Trash2, Check, Plus, ArrowRight, Wand2, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import EmptyState from './EmptyState';
import { analyzeSandboxItem, SandboxAnalysis } from '../services/geminiService';

interface Props {
  notes: Note[];
  config: AppConfig;
  onProcessNote: (id: string) => void;
  onAddTask: (task: Task) => void;
  onAddFlashcard: (card: Flashcard) => void;
  deleteNote: (id: string) => void;
}

const Sandbox: React.FC<Props> = ({ 
  notes, config, onProcessNote, onAddTask, onAddFlashcard, deleteNote 
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SandboxAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Filter for inbox/sandbox notes
  const incomingNotes = useMemo(() => notes.filter(n => n.status === 'sandbox' || n.status === 'inbox'), [notes]);
  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId), [notes, selectedNoteId]);

  const handleSelectNote = (note: Note) => {
      setSelectedNoteId(note.id);
      setAnalysis(null);
  };

  const handleBackToList = () => {
      setSelectedNoteId(null);
      setAnalysis(null);
  };

  const handleManualArchive = () => {
      if (selectedNoteId) {
          onProcessNote(selectedNoteId);
          handleBackToList();
      }
  };

  const runAnalysis = async () => {
      if (!selectedNote) return;
      setIsAnalyzing(true);
      const mentorId = config.mentors[0]?.id || 'default';
      const result = await analyzeSandboxItem(selectedNote.content, mentorId, config);
      setAnalysis(result);
      setIsAnalyzing(false);
  };

  const acceptTask = () => {
      if (analysis && selectedNote) {
          onAddTask({
              id: Date.now().toString(),
              content: analysis.suggestedTask,
              column: 'todo',
              createdAt: Date.now()
          });
          onProcessNote(selectedNote.id);
          handleBackToList();
      }
  };

  const acceptFlashcard = () => {
      if (analysis && selectedNote) {
          onAddFlashcard({
              id: Date.now().toString(),
              front: analysis.suggestedFlashcardFront,
              back: analysis.suggestedFlashcardBack,
              nextReview: Date.now(),
              level: 0
          });
          onProcessNote(selectedNote.id);
          handleBackToList();
      }
  };

  const markdownComponents = {
      p: ({node, ...props}: any) => <p className="mb-2" {...props} />
  };

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a]">
        {/* Left: Inbox List */}
        <div className={`
            w-full md:w-1/3 bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-slate-800 flex flex-col
            ${selectedNoteId ? 'hidden md:flex' : 'flex'}
        `}>
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-[#1e293b] z-10">
                <h1 className="text-xl font-light text-slate-800 dark:text-slate-200">Хаб</h1>
                <p className="text-xs text-slate-500">Трансформация идей.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar-light">
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider sticky top-0 bg-white dark:bg-[#1e293b] py-2 z-10">Входящие ({incomingNotes.length})</h3>
                {incomingNotes.length === 0 ? (
                    <div className="py-10">
                        <EmptyState 
                            icon={Box} 
                            title="Входящих нет" 
                            description="Отправь заметку из «Входящих», чтобы поработать с ней." 
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
        </div>

        {/* Right: Workbench */}
        <div className={`
            flex-1 flex-col overflow-y-auto custom-scrollbar-light bg-[#f8fafc] dark:bg-[#0f172a]
            ${selectedNoteId ? 'flex fixed inset-0 z-[100] md:static md:z-auto' : 'hidden md:flex'}
        `}>
            {selectedNoteId && (
                <div className="md:hidden p-4 border-b border-slate-200 bg-white dark:bg-[#1e293b] flex justify-between items-center">
                     <div className="flex items-center gap-2" onClick={handleBackToList}>
                        <button className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm"><ArrowLeft size={20} /></button>
                        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Назад</span>
                     </div>
                     <button onClick={handleManualArchive} className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Library size={14} /> <span className="hidden md:inline">В Зал славы</span>
                     </button>
                </div>
            )}

            {!selectedNoteId ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600 p-8 text-center">
                    <BrainCircuit size={64} className="mb-6 opacity-40" />
                    <p className="text-lg font-light">Выбери заметку для работы</p>
                </div>
            ) : (
                <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-8">
                    {/* Source Note */}
                    <div className="bg-white dark:bg-[#1e293b] p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                            <ReactMarkdown>{selectedNote!.content}</ReactMarkdown>
                        </div>
                    </div>

                    {/* AI Actions */}
                    {!analysis ? (
                        <div className="flex flex-col items-center gap-4">
                            <button 
                                onClick={runAnalysis} 
                                disabled={isAnalyzing}
                                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 font-medium text-lg disabled:opacity-70 disabled:scale-100"
                            >
                                {isAnalyzing ? <Loader2 className="animate-spin" /> : <Wand2 />}
                                {isAnalyzing ? 'Ментор думает...' : 'Анализировать'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                             {/* Analysis Result */}
                             <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl relative overflow-hidden">
                                <Sparkles className="absolute top-4 right-4 text-amber-400 opacity-20" size={100} />
                                <h3 className="text-amber-400 font-bold uppercase tracking-wider text-xs mb-3 flex items-center gap-2"><BrainCircuit size={14}/> Вердикт Ментора</h3>
                                <div className="text-lg leading-relaxed font-serif italic opacity-90">
                                    "{analysis.analysis}"
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {/* Task Proposal */}
                                 <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm hover:border-emerald-300 transition-colors group">
                                     <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl"><Check size={24}/></div>
                                        <button onClick={acceptTask} className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">Создать</button>
                                     </div>
                                     <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Действие</h4>
                                     <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{analysis.suggestedTask}</p>
                                 </div>

                                 {/* Flashcard Proposal */}
                                 <div className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm hover:border-indigo-300 transition-colors group">
                                     <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl"><Library size={24}/></div>
                                        <button onClick={acceptFlashcard} className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">Запомнить</button>
                                     </div>
                                     <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Навык / Принцип</h4>
                                     <div className="space-y-2">
                                         <div className="text-xs font-bold text-slate-400 uppercase">Вопрос</div>
                                         <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">{analysis.suggestedFlashcardFront}</p>
                                         <div className="w-full h-px bg-slate-100 dark:bg-slate-700 my-2" />
                                         <div className="text-xs font-bold text-slate-400 uppercase">Ответ</div>
                                         <p className="text-slate-600 dark:text-slate-400 text-sm">{analysis.suggestedFlashcardBack}</p>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    )}
                    
                    {/* Manual Actions */}
                    <div className="flex justify-center pt-8">
                         <button onClick={handleManualArchive} className="text-slate-400 hover:text-slate-600 text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <Trash2 size={16} /> Архив без обработки
                         </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Sandbox;