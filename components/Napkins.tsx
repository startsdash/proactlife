import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, SketchItem, JournalEntry, Flashcard, Habit, Module } from '../types';
import { applyTypography, ICON_MAP } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { 
  Plus, Search, X, Trash2, Archive, Edit3, 
  MoreHorizontal, ArrowRight, CornerDownRight, 
  Layout, Palette, StickyNote, Inbox, Library,
  Grid, List, CheckCircle2, Link as LinkIcon
} from 'lucide-react';

interface Props {
  notes: Note[];
  flashcards?: Flashcard[];
  tasks?: Task[];
  habits?: Habit[];
  sketchItems?: SketchItem[];
  config: AppConfig;
  addNote: (note: Note) => void;
  moveNoteToSandbox: (id: string) => void;
  moveNoteToInbox: (id: string) => void;
  archiveNote: (id: string) => void;
  deleteNote: (id: string) => void;
  reorderNote: (draggedId: string, targetId: string) => void;
  updateNote: (note: Note) => void;
  onAddTask: (task: Task) => void;
  onAddJournalEntry: (entry: JournalEntry) => void;
  addSketchItem?: (item: SketchItem) => void;
  deleteSketchItem?: (id: string) => void;
  updateSketchItem?: (item: SketchItem) => void;
  
  deleteFlashcard: (id: string) => void;
  toggleFlashcardStar: (id: string) => void;

  defaultTab?: 'inbox' | 'library' | 'flashcards';
  initialNoteId?: string | null;
  onClearInitialNote?: () => void;
  journalEntries?: JournalEntry[];
  onNavigate: (module: Module) => void;
  onNavigateToItem?: (module: Module, itemId: string) => void;
}

const colors = [
    { id: 'white', class: 'bg-white dark:bg-[#1e293b]', hex: '#ffffff' },
    { id: 'red', class: 'bg-red-50 dark:bg-red-900/20', hex: '#fef2f2' },
    { id: 'amber', class: 'bg-amber-50 dark:bg-amber-900/20', hex: '#fffbeb' },
    { id: 'emerald', class: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#ecfdf5' },
    { id: 'blue', class: 'bg-blue-50 dark:bg-blue-900/20', hex: '#eff6ff' },
    { id: 'indigo', class: 'bg-indigo-50 dark:bg-indigo-900/20', hex: '#eef2ff' },
    { id: 'purple', class: 'bg-purple-50 dark:bg-purple-900/20', hex: '#faf5ff' },
];

const getNoteColorClass = (colorId?: string) => colors.find(c => c.id === colorId)?.class || 'bg-white dark:bg-[#1e293b]';

const breakpointColumnsObj = {
  default: 4,
  1600: 3,
  1100: 2,
  700: 1
};

const allowDataUrls = (url: string) => url;

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-base mt-2 mb-1 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-3 italic text-slate-500 dark:text-slate-400 my-2 text-sm" {...props} />,
    img: ({node, ...props}: any) => <img className="rounded-lg max-h-48 object-cover my-2 w-full" {...props} loading="lazy" />,
};

const Napkins: React.FC<Props> = ({ 
  notes, 
  config, 
  addNote, 
  updateNote, 
  deleteNote, 
  archiveNote,
  moveNoteToSandbox,
  moveNoteToInbox,
  initialNoteId, 
  onClearInitialNote,
  onNavigateToItem
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'library'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  
  // Note Refs for scrolling
  const noteRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Auto-scroll to initialNoteId
  useEffect(() => {
    if (initialNoteId && noteRefs.current[initialNoteId]) {
      // Small delay to ensure layout is stable
      setTimeout(() => {
        noteRefs.current[initialNoteId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        onClearInitialNote?.();
      }, 300);
    }
  }, [initialNoteId, onClearInitialNote, activeTab]);

  // Switch tab if initialNoteId is in library
  useEffect(() => {
      if (initialNoteId) {
          const targetNote = notes.find(n => n.id === initialNoteId);
          if (targetNote) {
              if (targetNote.status === 'inbox' && activeTab !== 'inbox') setActiveTab('inbox');
              if (targetNote.status === 'archived' && activeTab !== 'library') setActiveTab('library');
          }
      }
  }, [initialNoteId, notes]);

  const filteredNotes = notes
    .filter(n => {
      if (activeTab === 'inbox') return n.status === 'inbox';
      if (activeTab === 'library') return n.status === 'archived';
      return false;
    })
    .filter(n => n.content.toLowerCase().includes(searchQuery.toLowerCase()) || n.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt);

  const handleCreateNote = () => {
    if (!newNoteContent.trim()) return;
    addNote({
      id: Date.now().toString(),
      content: applyTypography(newNoteContent),
      tags: [],
      createdAt: Date.now(),
      status: 'inbox',
      color: 'white'
    });
    setNewNoteContent('');
    setIsInputFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleCreateNote();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a]">
      {/* Header */}
      <header className="px-6 py-6 md:py-8 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 z-20">
        <div>
          <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">
            Заметки
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">
            Буфер обмена мыслей
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'inbox' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Inbox size={14} /> Входящие
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'library' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Library size={14} /> Библиотека
          </button>
        </div>
      </header>

      {/* Input Area (Only in Inbox) */}
      {activeTab === 'inbox' && (
        <div className="px-6 pb-6 shrink-0 z-20">
          <div className={`
            max-w-2xl mx-auto w-full transition-all duration-300 rounded-2xl border
            ${isInputFocused ? 'bg-white dark:bg-[#1e293b] shadow-xl border-indigo-200 dark:border-indigo-800 scale-100' : 'bg-white/60 dark:bg-[#1e293b]/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
          `}>
            <div className="relative">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => !newNoteContent && setIsInputFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Записать мысль..."
                className={`
                  w-full bg-transparent border-none outline-none resize-none p-4 text-base font-serif leading-relaxed text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500
                  ${isInputFocused ? 'min-h-[120px]' : 'min-h-[56px]'}
                  transition-all duration-300
                `}
              />
              <AnimatePresence>
                {isInputFocused && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex justify-between items-center px-4 pb-3 border-t border-slate-100 dark:border-slate-700/50 pt-3"
                  >
                    <span className="text-[10px] text-slate-400 font-mono">CMD + ENTER</span>
                    <button 
                      onClick={handleCreateNote}
                      disabled={!newNoteContent.trim()}
                      className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold uppercase tracking-wider hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-lg"
                    >
                      Сохранить
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-20 custom-scrollbar-light">
        
        {/* Search Bar (Only if items exist) */}
        {notes.length > 0 && (
          <div className="max-w-md mx-auto mb-8 relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Поиск в заметках..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-transparent border-b border-slate-200 dark:border-slate-700 text-sm focus:border-indigo-500 outline-none transition-colors text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
            />
          </div>
        )}

        {filteredNotes.length === 0 ? (
          <div className="py-20">
            <EmptyState 
              icon={StickyNote} 
              title={activeTab === 'inbox' ? "Входящие пусты" : "Библиотека пуста"} 
              description={activeTab === 'inbox' ? "Отличное время записать новую идею" : "Здесь будут храниться обработанные заметки"}
              color="indigo" 
            />
          </div>
        ) : (
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {filteredNotes.map(note => {
              const isHighlighted = note.id === initialNoteId;
              
              return (
                <div 
                  key={note.id} 
                  ref={el => noteRefs.current[note.id] = el}
                  className={`relative group mb-6 transition-all duration-500 ${isHighlighted ? 'z-10' : 'z-0'}`}
                >
                  {/* Glow Effect for Highlighted Note */}
                  {isHighlighted && (
                    <div className="absolute -inset-0.5 bg-indigo-500/30 dark:bg-indigo-400/20 rounded-3xl blur-lg animate-pulse pointer-events-none" />
                  )}

                  <motion.div 
                    layoutId={note.id}
                    className={`
                      ${getNoteColorClass(note.color)} rounded-2xl border shadow-sm p-5 relative overflow-hidden flex flex-col gap-3
                      ${isHighlighted ? 'ring-2 ring-indigo-500 shadow-xl scale-[1.02]' : 'border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600'}
                      transition-all duration-300
                    `}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </div>
                      
                      {/* Connection Indicator (Ghost Style) */}
                      {note.connectedNoteIds && note.connectedNoteIds.length > 0 && (
                        <Tooltip content={`${note.connectedNoteIds.length} связей`}>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-[9px] font-mono text-slate-500">
                            <LinkIcon size={10} />
                            <span>{note.connectedNoteIds.length}</span>
                          </div>
                        </Tooltip>
                      )}
                    </div>

                    {/* Content */}
                    <div className="font-serif text-slate-700 dark:text-slate-300 text-sm leading-relaxed max-h-[400px] overflow-hidden relative">
                      <ReactMarkdown 
                        components={markdownComponents}
                        urlTransform={allowDataUrls}
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                      >
                        {applyTypography(note.content)}
                      </ReactMarkdown>
                      {/* Gradient fade for long content */}
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-[#1e293b] to-transparent pointer-events-none opacity-50" />
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 mt-auto border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex gap-1">
                        <Tooltip content="В Хаб (Обработка)">
                          <button 
                            onClick={() => moveNoteToSandbox(note.id)}
                            className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                          >
                            <CornerDownRight size={14} />
                          </button>
                        </Tooltip>
                        
                        {activeTab === 'inbox' ? (
                          <Tooltip content="В архив">
                            <button 
                              onClick={() => archiveNote(note.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            >
                              <Archive size={14} />
                            </button>
                          </Tooltip>
                        ) : (
                          <Tooltip content="В заметки">
                            <button 
                              onClick={() => moveNoteToInbox(note.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            >
                              <Inbox size={14} />
                            </button>
                          </Tooltip>
                        )}
                        
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
                        
                        <Tooltip content="Удалить">
                          <button 
                            onClick={() => { if(confirm("Удалить заметку?")) deleteNote(note.id); }}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </Tooltip>
                      </div>

                      {/* Color Picker Trigger could go here */}
                      <button 
                        onClick={() => {
                           // Cycle color logic
                           const currentIndex = colors.findIndex(c => c.id === (note.color || 'white'));
                           const nextColor = colors[(currentIndex + 1) % colors.length].id;
                           updateNote({ ...note, color: nextColor });
                        }}
                        className="p-1.5 text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 rounded-lg transition-colors"
                      >
                        <Palette size={14} />
                      </button>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </Masonry>
        )}
      </div>
    </div>
  );
};

export default Napkins;