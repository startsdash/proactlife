
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import ReactMarkdown from 'react-markdown';
import { Note, Task, Habit, SketchItem, Flashcard, AppConfig, JournalEntry, Module } from '../types';
import { autoTagNote } from '../services/geminiService';
import { 
    StickyNote, Plus, Trash2, Archive, Hash, Search, 
    Box, Kanban, Flame, Book, Tablet, Sparkles, X, 
    Edit3, Image as ImageIcon, Palette, ArrowRight, RefreshCw, 
    MoreHorizontal, Copy, Layout, Maximize2, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { applyTypography } from '../constants';

interface Props {
  notes: Note[];
  flashcards: Flashcard[];
  tasks: Task[];
  habits: Habit[];
  sketchItems: SketchItem[];
  config: AppConfig;
  addNote: (note: Note) => void;
  moveNoteToSandbox: (id: string) => void;
  moveNoteToInbox: (id: string) => void;
  deleteNote: (id: string) => void;
  reorderNote: (draggedId: string, targetId: string) => void;
  updateNote: (note: Note) => void;
  archiveNote: (id: string) => void;
  onAddTask: (task: Task) => void;
  onAddJournalEntry: (entry: JournalEntry) => void;
  addSketchItem: (item: SketchItem) => void;
  deleteFlashcard: (id: string) => void;
  toggleFlashcardStar: (id: string) => void;
  initialNoteId: string | null;
  onClearInitialNote: () => void;
  journalEntries: JournalEntry[];
  onNavigate: (module: Module) => void;
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

const Napkins: React.FC<Props> = ({ 
    notes, flashcards, tasks, habits, sketchItems, config, 
    addNote, moveNoteToSandbox, moveNoteToInbox, deleteNote, 
    reorderNote, updateNote, archiveNote, onAddTask, onAddJournalEntry, 
    addSketchItem, deleteFlashcard, toggleFlashcardStar, 
    initialNoteId, onClearInitialNote, journalEntries, onNavigate 
}) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedColor, setSelectedColor] = useState('white');
  const [activeTab, setActiveTab] = useState<'inbox' | 'library'>('inbox');
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derived state for path status checking
  const getPathStatus = useCallback((note: Note) => {
      // Hub Check: Look for a note in sandbox with same content
      const hubNote = notes.find(n => n.status === 'sandbox' && n.content === note.content);
      const hubId = hubNote?.id;
      
      // Sprint: Check heuristic (content match)
      const task = tasks.find(t => !t.isArchived && (
          (note.title && t.title === note.title) || 
          (note.content && t.content.includes(note.content.substring(0, 50))) ||
          (note.content && t.description && t.description.includes(note.content.substring(0, 50)))
      ));
      const sprintId = task?.id;

      // Habit: Heuristic
      const habit = habits.find(h => !h.isArchived && (h.description?.includes(note.content.substring(0, 50)) || (note.title && h.title === note.title)));
      
      // Journal: Check for links
      const entry = journalEntries?.find(j => 
          (j.linkedNoteId === note.id || j.linkedNoteIds?.includes(note.id)) && !j.isArchived
      );
      const journalId = entry?.id;
      const journalInsight = entry?.isInsight || false;

      // Sketchpad
      const sketchItem = sketchItems?.find(i => i.content === note.content);
      const sketchpadId = sketchItem?.id;

      return {
          hubId,
          sprintId,
          journalId,
          sketchpadId,
          habit: !!habit,
          journalInsight
      };
  }, [tasks, habits, journalEntries, notes, sketchItems]);

  const filteredNotes = useMemo(() => {
      return notes.filter(n => {
          if (n.status === 'sandbox') return false; // Sandbox notes shown in Sandbox module
          if (n.status === 'trash') return false; // Trash shown in Archive
          
          // Tab filtering
          if (activeTab === 'inbox' && n.status !== 'inbox') return false;
          if (activeTab === 'library' && n.status !== 'archived') return false;

          // Search
          if (searchQuery) {
              const q = searchQuery.toLowerCase();
              return (n.content.toLowerCase().includes(q) || n.title?.toLowerCase().includes(q) || n.tags?.some(t => t.toLowerCase().includes(q)));
          }
          return true;
      }).sort((a, b) => b.createdAt - a.createdAt);
  }, [notes, activeTab, searchQuery]);

  const handleCreateNote = async () => {
      if (!newNoteContent.trim() && !newNoteTitle.trim()) return;
      
      const newNote: Note = {
          id: Date.now().toString(),
          title: newNoteTitle.trim() ? applyTypography(newNoteTitle) : undefined,
          content: applyTypography(newNoteContent),
          tags: [],
          createdAt: Date.now(),
          status: 'inbox',
          color: selectedColor
      };

      addNote(newNote);
      setNewNoteContent('');
      setNewNoteTitle('');
      setSelectedColor('white');
      setIsExpanded(false);

      // Auto-tag in background if tool enabled
      if (config.aiTools.find(t => t.id === 'tagger' && !t.isDisabled)) {
          const tags = await autoTagNote(newNote.content, config);
          if (tags.length > 0) {
              updateNote({ ...newNote, tags });
          }
      }
  };

  const handleAutoTag = async (note: Note) => {
      setIsAutoTagging(true);
      try {
          const tags = await autoTagNote(note.content, config);
          if (tags.length > 0) {
              updateNote({ ...note, tags: [...new Set([...note.tags, ...tags])] });
          }
      } finally {
          setIsAutoTagging(false);
      }
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
        
        {/* HEADER */}
        <div className="shrink-0 w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 z-10">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">
                        Заметки
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Входящий поток мыслей</p>
                </div>
                
                {/* TABS */}
                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('inbox')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'inbox' ? 'bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Входящие
                    </button>
                    <button 
                        onClick={() => setActiveTab('library')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'library' ? 'bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Библиотека
                    </button>
                </div>
             </header>
        </div>

        {/* INPUT & LIST AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
            
            {/* SEARCH */}
            <div className="max-w-2xl mx-auto mb-6 relative group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по заметкам..."
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-shadow shadow-sm placeholder:text-slate-400"
                />
            </div>

            {/* CREATION CARD */}
            <div className="max-w-2xl mx-auto mb-10">
                <div 
                    className={`${getNoteColorClass(selectedColor)} border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm transition-all duration-300 overflow-hidden ${isExpanded ? 'ring-2 ring-indigo-50 dark:ring-indigo-900/20' : ''}`}
                >
                    {isExpanded && (
                        <input 
                            type="text" 
                            placeholder="Заголовок (опционально)" 
                            value={newNoteTitle}
                            onChange={(e) => setNewNoteTitle(e.target.value)}
                            className="w-full px-6 pt-4 pb-2 bg-transparent border-none outline-none font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                        />
                    )}
                    <textarea 
                        ref={textareaRef}
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        onFocus={() => setIsExpanded(true)}
                        placeholder="Быстрая заметка..."
                        className="w-full px-6 py-4 bg-transparent border-none outline-none resize-none min-h-[60px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                        rows={isExpanded ? 4 : 1}
                    />
                    
                    {isExpanded && (
                        <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                    {colors.map(c => (
                                        <button 
                                            key={c.id} 
                                            onClick={() => setSelectedColor(c.id)}
                                            className={`w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600 transition-transform ${selectedColor === c.id ? 'scale-125 ring-2 ring-offset-1 ring-slate-300 dark:ring-slate-600' : 'hover:scale-110'}`}
                                            style={{ backgroundColor: c.hex }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { setIsExpanded(false); setNewNoteContent(''); setNewNoteTitle(''); }}
                                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    Отмена
                                </button>
                                <button 
                                    onClick={handleCreateNote}
                                    disabled={!newNoteContent.trim() && !newNoteTitle.trim()}
                                    className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Сохранить
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* LIST */}
            {filteredNotes.length === 0 ? (
                <EmptyState 
                    icon={StickyNote} 
                    title={activeTab === 'inbox' ? "Входящие пусты" : "Библиотека пуста"} 
                    description={searchQuery ? "Ничего не найдено" : activeTab === 'inbox' ? "Все мысли разобраны или еще не записаны" : "Сохраняй важные заметки здесь"} 
                    color="indigo"
                />
            ) : (
                <Masonry
                    breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
                    className="my-masonry-grid"
                    columnClassName="my-masonry-grid_column"
                >
                    {filteredNotes.map(note => {
                        const status = getPathStatus(note);
                        
                        return (
                            <motion.div 
                                key={note.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`relative group mb-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${getNoteColorClass(note.color)} border-slate-200 dark:border-slate-800`}
                            >
                                <div className="p-6 pb-12">
                                    {note.title && <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-slate-100">{note.title}</h3>}
                                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif whitespace-pre-wrap">
                                        <ReactMarkdown>{note.content}</ReactMarkdown>
                                    </div>
                                    
                                    {/* TAGS */}
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {note.tags?.map(tag => (
                                            <span key={tag} className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded">
                                                #{tag}
                                            </span>
                                        ))}
                                        <button 
                                            onClick={() => handleAutoTag(note)}
                                            disabled={isAutoTagging}
                                            className="text-[10px] text-slate-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Tag size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* FOOTER INDICATORS */}
                                <div className="absolute bottom-4 left-6 flex items-center gap-2">
                                    {status.hubId && <Tooltip content="В Хабе"><div className="text-amber-500"><Box size={14} /></div></Tooltip>}
                                    {status.sprintId && <Tooltip content="В Спринте"><div className="text-emerald-500"><Kanban size={14} /></div></Tooltip>}
                                    {status.habit && <Tooltip content="В Трекере"><div className="text-orange-500"><Flame size={14} /></div></Tooltip>}
                                    {status.journalId && <Tooltip content="В Дневнике"><div className="text-cyan-500"><Book size={14} /></div></Tooltip>}
                                    {status.sketchpadId && <Tooltip content="В Скетчпаде"><div className="text-violet-500"><Tablet size={14} /></div></Tooltip>}
                                </div>

                                {/* HOVER ACTIONS */}
                                <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                                    {activeTab === 'inbox' ? (
                                        <>
                                            <Tooltip content="В Хаб">
                                                <button onClick={() => moveNoteToSandbox(note.id)} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"><Box size={16} /></button>
                                            </Tooltip>
                                            <Tooltip content="В Архив">
                                                <button onClick={() => archiveNote(note.id)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"><Archive size={16} /></button>
                                            </Tooltip>
                                        </>
                                    ) : (
                                        <Tooltip content="Вернуть во входящие">
                                            <button onClick={() => moveNoteToInbox(note.id)} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"><RefreshCw size={16} /></button>
                                        </Tooltip>
                                    )}
                                    <Tooltip content="Удалить">
                                        <button onClick={() => { if(confirm('Удалить заметку?')) deleteNote(note.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </Tooltip>
                                </div>
                            </motion.div>
                        );
                    })}
                </Masonry>
            )}
        </div>
    </div>
  );
};

export default Napkins;
