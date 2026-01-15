
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import Masonry from 'react-masonry-css';
import { motion, AnimatePresence } from 'framer-motion';
import { JournalEntry, Task, Note, AppConfig, MentorAnalysis } from '../types';
import { analyzeJournalPath } from '../services/geminiService';
import { Book, Plus, X, Trash2, Calendar, Edit3, Save, Sparkles, StickyNote, CheckCircle2, Link, Bot, BrainCircuit, Quote, Unlink, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';
import { applyTypography } from '../constants';

interface Props {
  entries: JournalEntry[];
  mentorAnalyses: MentorAnalysis[];
  tasks: Task[];
  notes: Note[];
  config: AppConfig;
  addEntry: (entry: JournalEntry) => void;
  deleteEntry: (id: string) => void;
  updateEntry: (entry: JournalEntry) => void;
  addMentorAnalysis: (analysis: MentorAnalysis) => void;
  deleteMentorAnalysis: (id: string) => void;
  initialTaskId?: string | null;
  onClearInitialTask?: () => void;
  onNavigateToTask?: (id: string) => void;
  onNavigateToNote?: (id: string) => void;
}

const breakpointColumnsObj = {
  default: 3,
  1100: 2,
  700: 1
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed font-serif" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300 font-serif" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300 font-serif" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
};

const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, icon, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/50 overflow-hidden mb-2">
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} 
        className="w-full flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors group"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
           {icon}
           {title}
        </div>
        <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <div className="px-3 pb-3 pt-0 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="pt-3">
                        {children}
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const getNotePreviewContent = (content: string) => {
    let clean = content.replace(/!\[.*?\]\(.*?\)/g, ''); // Remove images
    if (clean.length > 150) clean = clean.substring(0, 150) + '...';
    return clean;
};

const Journal: React.FC<Props> = ({ entries, mentorAnalyses, tasks, notes, config, addEntry, deleteEntry, updateEntry, addMentorAnalysis, deleteMentorAnalysis, initialTaskId, onClearInitialTask, onNavigateToTask, onNavigateToNote }) => {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (initialTaskId) {
      setIsCreatorOpen(true);
      // Pre-link task logic would go here if we had a dedicated link field in creator
      // For now, we rely on context or just opening the creator
      onClearInitialTask?.();
    }
  }, [initialTaskId, onClearInitialTask]);

  const handleCreate = () => {
    if (!newContent.trim()) return;
    
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: Date.now(),
      content: applyTypography(newContent),
      isInsight: false,
      linkedTaskId: initialTaskId || undefined // Link if context exists
    };
    
    addEntry(entry);
    setNewContent('');
    setIsCreatorOpen(false);
  };

  const handleUpdate = () => {
    if (selectedEntry && editContent.trim()) {
      updateEntry({ ...selectedEntry, content: applyTypography(editContent) });
      setIsEditing(false);
    }
  };

  const handleAnalyze = async () => {
      setIsAnalyzing(true);
      try {
          const result = await analyzeJournalPath(entries, config);
          const analysis: MentorAnalysis = {
              id: Date.now().toString(),
              date: Date.now(),
              content: result,
              mentorName: 'AI Mentor'
          };
          addMentorAnalysis(analysis);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
      <div className="p-4 md:p-8 shrink-0">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Дневник</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Хроники Пути</p>
          </div>
          <button 
            onClick={() => setIsCreatorOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold shadow-lg hover:scale-105 transition-transform"
          >
            <Plus size={18} /> <span className="hidden md:inline">Запись</span>
          </button>
        </header>

        {/* Creator */}
        <AnimatePresence>
            {isCreatorOpen && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-8"
                >
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 relative">
                        <textarea 
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            placeholder="О чем ты думаешь?"
                            className="w-full min-h-[150px] bg-transparent border-none outline-none resize-none font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setIsCreatorOpen(false)} className="px-4 py-2 text-slate-400 hover:text-slate-600 transition-colors text-sm">Отмена</button>
                            <button onClick={handleCreate} disabled={!newContent.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">Сохранить</button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
          
          {/* MENTOR INSIGHTS */}
          {mentorAnalyses.length > 0 && (
              <div className="mb-10 space-y-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                      <Sparkles size={14} className="text-purple-500" /> Менторский Анализ
                  </div>
                  {mentorAnalyses.map(analysis => (
                      <div key={analysis.id} className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-slate-800 rounded-2xl p-6 border border-purple-100 dark:border-purple-800/30 relative group">
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-300">
                                      <Bot size={16} />
                                  </div>
                                  <div>
                                      <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{analysis.mentorName}</div>
                                      <div className="text-[10px] text-slate-400">{new Date(analysis.date).toLocaleDateString()}</div>
                                  </div>
                              </div>
                              <button onClick={() => deleteMentorAnalysis(analysis.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                          <div className="prose prose-sm dark:prose-invert font-serif text-slate-600 dark:text-slate-300 max-w-none">
                              <ReactMarkdown>{analysis.content}</ReactMarkdown>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {/* ENTRIES LIST */}
          {entries.length === 0 ? (
              <EmptyState icon={Book} title="Дневник пуст" description="Начни записывать свои мысли и наблюдения" color="cyan" actionLabel="Первая запись" onAction={() => setIsCreatorOpen(true)} />
          ) : (
              <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                  {entries.map(entry => (
                      <motion.div 
                          key={entry.id}
                          layoutId={`journal-${entry.id}`}
                          onClick={() => { setSelectedEntry(entry); setEditContent(entry.content); setIsEditing(false); }}
                          className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group mb-6 relative overflow-hidden"
                      >
                          {entry.isInsight && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-100 to-transparent dark:from-yellow-900/20 -mr-8 -mt-8 rounded-full blur-xl" />}
                          
                          <div className="flex justify-between items-center mb-3 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                              <span className="flex items-center gap-2">
                                  {new Date(entry.date).toLocaleDateString()}
                                  {entry.mood && <span className="text-base">{['😖','😕','😐','🙂','🤩'][entry.mood - 1]}</span>}
                              </span>
                              {entry.isInsight && <Sparkles size={12} className="text-yellow-500 fill-yellow-500" />}
                          </div>
                          
                          <div className="text-slate-700 dark:text-slate-300 font-serif text-sm leading-relaxed line-clamp-6 mb-4">
                              <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
                          </div>

                          <div className="flex items-center gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/50 opacity-60 group-hover:opacity-100 transition-opacity">
                              {entry.linkedTaskId && <div className="flex items-center gap-1 text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded"><Link size={10} /> Задача</div>}
                              {(entry.linkedNoteIds?.length || 0) > 0 && <div className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded"><StickyNote size={10} /> Заметки ({entry.linkedNoteIds?.length})</div>}
                          </div>
                      </motion.div>
                  ))}
              </Masonry>
          )}
          
          <div className="flex justify-center mt-12">
              <button 
                  onClick={handleAnalyze} 
                  disabled={isAnalyzing || entries.length < 3}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all disabled:opacity-50"
              >
                  {isAnalyzing ? <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" /> : <BrainCircuit size={18} />}
                  <span>{isAnalyzing ? 'Анализирую...' : 'Запросить анализ Пути'}</span>
              </button>
          </div>
      </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
          {selectedEntry && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedEntry(null)}>
                  <motion.div 
                      layoutId={`journal-${selectedEntry.id}`}
                      className="bg-white dark:bg-[#1e293b] w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                      onClick={e => e.stopPropagation()}
                  >
                      {/* Modal Header */}
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                          <div className="flex items-center gap-3">
                              <span className="text-sm font-mono text-slate-400 uppercase tracking-widest">
                                  {new Date(selectedEntry.date).toLocaleDateString()} {new Date(selectedEntry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              {selectedEntry.mood && <span className="text-xl">{['😖','😕','😐','🙂','🤩'][selectedEntry.mood - 1]}</span>}
                          </div>
                          <div className="flex gap-2">
                              {!isEditing && (
                                  <>
                                      <Tooltip content={selectedEntry.isInsight ? "Убрать инсайт" : "Отметить как инсайт"}>
                                          <button 
                                              onClick={() => updateEntry({ ...selectedEntry, isInsight: !selectedEntry.isInsight })}
                                              className={`p-2 rounded-lg transition-colors ${selectedEntry.isInsight ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-slate-300 hover:text-yellow-500'}`}
                                          >
                                              <Sparkles size={18} />
                                          </button>
                                      </Tooltip>
                                      <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={18} /></button>
                                      <button onClick={() => { deleteEntry(selectedEntry.id); setSelectedEntry(null); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                  </>
                              )}
                              <button onClick={() => setSelectedEntry(null)} className="p-2 text-slate-400 hover:text-slate-600 ml-2"><X size={20} /></button>
                          </div>
                      </div>

                      {/* Modal Content */}
                      <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar-light flex-1">
                          {isEditing ? (
                              <textarea 
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full h-64 bg-transparent border-none outline-none resize-none font-serif text-lg leading-relaxed text-slate-800 dark:text-slate-200"
                              />
                          ) : (
                              <div className="prose prose-lg dark:prose-invert font-serif text-slate-700 dark:text-slate-300 max-w-none">
                                  <ReactMarkdown components={markdownComponents}>{selectedEntry.content}</ReactMarkdown>
                              </div>
                          )}

                          {/* Context Section */}
                          <div className="mt-8 space-y-4">
                                {/* Linked Task Render */}
                                {selectedEntry.linkedTaskId && (() => {
                                    const task = tasks.find(t => t.id === selectedEntry.linkedTaskId);
                                    if (!task) return null;
                                    return (
                                        <CollapsibleSection title="Контекст: Задача" icon={<CheckCircle2 size={14}/>}>
                                            <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${task.column === 'done' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{task.title || task.content}</span>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <Tooltip content="Открепить">
                                                        <button onClick={() => updateEntry({ ...selectedEntry, linkedTaskId: undefined })} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Unlink size={14}/></button>
                                                    </Tooltip>
                                                    <Tooltip content="Перейти к задаче">
                                                        <button onClick={() => onNavigateToTask?.(task.id)} className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors"><ExternalLink size={14}/></button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        </CollapsibleSection>
                                    );
                                })()}

                                {/* Linked Notes Render - Grouped */}
                                {(() => {
                                    const linkedNotesList = notes.filter(n => (selectedEntry.linkedNoteIds?.includes(n.id)) || (selectedEntry.linkedNoteId === n.id));
                                    if (linkedNotesList.length === 0) return null;
                                    
                                    return (
                                        <CollapsibleSection title="Контекст: Заметки" icon={<StickyNote size={14}/>}>
                                            <div className="space-y-4">
                                                {linkedNotesList.map((note, index) => (
                                                    <div key={note.id} className={`flex items-start gap-2 ${index > 0 ? "pt-3 border-t border-slate-200/50 dark:border-slate-700/50" : ""}`}>
                                                        <Tooltip content="Открепить заметку">
                                                            <button
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    const newIds = (selectedEntry.linkedNoteIds || []).filter(id => id !== note.id);
                                                                    const isLegacy = selectedEntry.linkedNoteId === note.id;
                                                                    updateEntry({ 
                                                                        ...selectedEntry, 
                                                                        linkedNoteIds: newIds,
                                                                        linkedNoteId: isLegacy ? undefined : selectedEntry.linkedNoteId
                                                                    }); 
                                                                }}
                                                                className="mt-0.5 p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                                                            >
                                                                <Unlink size={14} />
                                                            </button>
                                                        </Tooltip>
                                                        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-serif cursor-pointer hover:text-indigo-500 transition-colors flex-1" onClick={() => onNavigateToNote?.(note.id)}>
                                                            <ReactMarkdown components={markdownComponents}>{getNotePreviewContent(note.content)}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    );
                                })()}
                          </div>
                      </div>

                      {/* Footer Actions */}
                      {isEditing && (
                          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/30">
                              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium">Отмена</button>
                              <button onClick={handleUpdate} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2">
                                  <Save size={16} /> Сохранить
                              </button>
                          </div>
                      )}
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default Journal;
