
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import Masonry from 'react-masonry-css';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, JournalEntry, SketchItem } from '../types';
import { autoTagNote } from '../services/geminiService';
import { applyTypography } from '../constants';
import { Tooltip } from './Tooltip';
import { 
  Library, Box, Kanban, Book, Tablet, RotateCcw, 
  Plus, Search, X, Palette, Image as ImageIcon, 
  Maximize2, Trash2, Sparkles, PenTool 
} from 'lucide-react';

interface Props {
  notes: Note[];
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
  initialNoteId?: string | null;
  onClearInitialNote?: () => void;
  journalEntries: JournalEntry[];
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
  1400: 3,
  1000: 2,
  600: 1
};

const Napkins: React.FC<Props> = (props) => {
  const { notes, config, addNote, updateNote, deleteNote, initialNoteId, onClearInitialNote, journalEntries } = props;
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreationOpen, setIsCreationOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  // Search filtering
  const filteredNotes = useMemo(() => {
      if (!searchQuery) return notes;
      const q = searchQuery.toLowerCase();
      return notes.filter(n => 
          n.content.toLowerCase().includes(q) || 
          n.tags.some(t => t.toLowerCase().includes(q))
      );
  }, [notes, searchQuery]);

  // Scroll to initial note
  useEffect(() => {
      if (initialNoteId) {
          setSelectedNoteId(initialNoteId);
          onClearInitialNote?.();
      }
  }, [initialNoteId, onClearInitialNote]);

  const handleCreate = async () => {
      if (!newNoteContent.trim()) return;
      
      const content = applyTypography(newNoteContent);
      setIsProcessing(true);
      
      // Auto-tagging
      let tags: string[] = [];
      try {
          tags = await autoTagNote(content, config);
      } catch (e) {
          console.error(e);
      }

      const newNote: Note = {
          id: Date.now().toString(),
          content,
          tags,
          createdAt: Date.now(),
          status: 'inbox',
          color: 'white'
      };

      addNote(newNote);
      setNewNoteContent('');
      setIsProcessing(false);
      setIsCreationOpen(false);
  };

  const handleColorChange = (note: Note, colorId: string) => {
      updateNote({ ...note, color: colorId });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
        {/* Header */}
        <div className="shrink-0 w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 z-50">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">
                        Заметки
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хаос мыслей</p>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64 group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 dark:text-slate-200 transition-shadow shadow-sm placeholder:text-slate-400"
                        />
                    </div>
                    <button 
                        onClick={() => setIsCreationOpen(true)}
                        className="p-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl shadow-lg hover:scale-105 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                </div>
             </header>
        </div>

        {/* Creation Modal */}
        <AnimatePresence>
            {isCreationOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsCreationOpen(false)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl p-6 relative overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Новая заметка</h3>
                            <button onClick={() => setIsCreationOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <textarea 
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder="О чем ты думаешь?"
                            className="w-full h-64 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-slate-800 dark:text-slate-200 resize-none outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-serif text-lg leading-relaxed mb-4"
                            autoFocus
                        />
                        
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={handleCreate}
                                disabled={!newNoteContent.trim() || isProcessing}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isProcessing && <Sparkles size={16} className="animate-spin" />}
                                {isProcessing ? 'Обработка...' : 'Сохранить'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
            {filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60">
                    <PenTool size={48} className="mb-4" strokeWidth={1} />
                    <p>Здесь пока пусто. Создай первую заметку!</p>
                </div>
            ) : (
                <Masonry
                    breakpointCols={breakpointColumnsObj}
                    className="my-masonry-grid"
                    columnClassName="my-masonry-grid_column"
                >
                    {filteredNotes.map(note => {
                        const isArchived = note.status === 'archived';
                        const isLinkedToJournal = journalEntries.some(j => j.linkedNoteId === note.id);

                        return (
                            <motion.div
                                layoutId={note.id}
                                key={note.id}
                                className={`relative group mb-4 rounded-2xl border transition-all duration-300 ${getNoteColorClass(note.color)} border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-lg`}
                                onClick={() => setSelectedNoteId(note.id)}
                            >
                                <div className="p-6 pb-14">
                                    <div className="text-slate-800 dark:text-slate-200 font-serif text-base leading-relaxed break-words whitespace-pre-wrap max-h-[300px] overflow-hidden relative">
                                        <ReactMarkdown>{note.content}</ReactMarkdown>
                                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-[#1e293b] to-transparent pointer-events-none" />
                                    </div>
                                    
                                    {note.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {note.tags.map(tag => (
                                                <span key={tag} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions Footer */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 bg-gradient-to-t from-white/90 via-white/60 to-transparent dark:from-slate-900/90 dark:via-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex justify-between items-end rounded-b-2xl">
                                    <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                                        {!isArchived ? (
                                            <Tooltip content="Переместить в библиотеку">
                                                <button onClick={(e) => { e.stopPropagation(); props.archiveNote(note.id); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Library size={16} strokeWidth={1.5} /></button>
                                            </Tooltip>
                                        ) : (
                                            <>
                                                <Tooltip content="В хаб"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В хаб?')) props.moveNoteToSandbox(note.id); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Box size={16} strokeWidth={1.5} /></button></Tooltip>
                                                
                                                <Tooltip content="В спринты"><button onClick={(e) => { e.stopPropagation(); if(window.confirm('В спринты?')) { props.onAddTask({ id: Date.now().toString(), title: note.title, content: note.content, column: 'todo', createdAt: Date.now() }); } }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Kanban size={16} strokeWidth={1.5} /></button></Tooltip>
                                                
                                                <Tooltip content={isLinkedToJournal ? "В дневнике" : "В дневник"}>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); if (!isLinkedToJournal) props.onAddJournalEntry({ id: Date.now().toString(), date: Date.now(), content: note.content, linkedNoteId: note.id }); }} 
                                                        disabled={isLinkedToJournal}
                                                        className={`p-2 rounded-full transition-all ${
                                                            isLinkedToJournal 
                                                            ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 opacity-100 cursor-default' 
                                                            : 'text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 opacity-60 hover:opacity-100'
                                                        }`}
                                                    >
                                                        <Book size={16} strokeWidth={1.5} />
                                                    </button>
                                                </Tooltip>
                                                
                                                <Tooltip content="В скетчпад"><button onClick={(e) => { e.stopPropagation(); props.addSketchItem({ id: Date.now().toString(), type: 'text', content: note.content, createdAt: Date.now(), rotation: 0, color: note.color }); }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Tablet size={16} strokeWidth={1.5} /></button></Tooltip>
                                            </>
                                        )}
                                        
                                        {/* Color Picker Trigger */}
                                        <div className="relative group/color">
                                            <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-colors opacity-60 hover:opacity-100">
                                                <Palette size={16} strokeWidth={1.5} />
                                            </button>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/color:flex bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 gap-1">
                                                {colors.map(c => (
                                                    <button 
                                                        key={c.id}
                                                        onClick={(e) => { e.stopPropagation(); handleColorChange(note, c.id); }}
                                                        className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-125 transition-transform"
                                                        style={{ backgroundColor: c.hex }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <Tooltip content="Удалить">
                                            <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><Trash2 size={16} strokeWidth={1.5} /></button>
                                        </Tooltip>
                                    </div>
                                    
                                    {isArchived ? (
                                        <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-black/5 dark:border-white/5 shadow-sm">
                                            <Tooltip content="Вернуть во входящие">
                                                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Вернуть во входящие?')) { props.moveNoteToInbox(note.id); } }} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all opacity-60 hover:opacity-100"><RotateCcw size={16} strokeWidth={1.5} /></button>
                                            </Tooltip>
                                        </div>
                                    ) : (
                                        <div className="p-2 font-mono text-[8px] text-slate-900 dark:text-white select-none opacity-30 tracking-widest">
                                            ID // {note.id.slice(-5).toLowerCase()}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </Masonry>
            )}
        </div>

        {/* Note Detail Modal */}
        <AnimatePresence>
            {selectedNoteId && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedNoteId(null)}>
                    {(() => {
                        const note = notes.find(n => n.id === selectedNoteId);
                        if (!note) return null;
                        return (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`w-full max-w-2xl ${getNoteColorClass(note.color)} rounded-3xl shadow-2xl p-8 relative overflow-y-auto max-h-[90vh]`}
                                onClick={e => e.stopPropagation()}
                            >
                                <button onClick={() => setSelectedNoteId(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-6">
                                    {new Date(note.createdAt).toLocaleString()}
                                </div>
                                <div className="text-slate-800 dark:text-slate-200 font-serif text-lg leading-relaxed whitespace-pre-wrap">
                                    <ReactMarkdown>{note.content}</ReactMarkdown>
                                </div>
                                {note.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-black/5 dark:border-white/5">
                                        {note.tags.map(tag => (
                                            <span key={tag} className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-black/5 dark:bg-white/5 px-3 py-1 rounded-lg">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })()}
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Napkins;
