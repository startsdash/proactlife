import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, Flashcard, AppConfig, Task, JournalEntry, SketchItem } from '../types';
import { 
    Layers, Sparkles, BrainCircuit, Filter, Star, ArrowLeft, RotateCw, ArrowRight, Trash2, 
    Plus, Search, X, Edit3, Palette, Archive, Box, MoreVertical, Check, Layout
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import ReactMarkdown from 'react-markdown';
import Masonry from 'react-masonry-css';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';

const NOISE_PATTERN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`;

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

interface Props {
  notes: Note[];
  flashcards: Flashcard[];
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
  initialNoteId?: string | null;
  onClearInitialNote?: () => void;
  journalEntries: JournalEntry[];
}

// --- KINETIC FLASHCARD DECK ---
const KineticFlashcardDeck = ({ 
    cards, 
    onDelete, 
    onToggleStar 
}: { 
    cards: Flashcard[], 
    onDelete: (id: string) => void,
    onToggleStar: (id: string) => void
}) => {
    const [index, setIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);

    // Filter cards based on mode
    const displayedCards = useMemo(() => {
        return showFavorites ? cards.filter(c => c.isStarred) : cards;
    }, [cards, showFavorites]);

    // Ensure index stays valid if cards are removed
    useEffect(() => {
        if (index >= displayedCards.length && displayedCards.length > 0) {
            setIndex(Math.max(0, displayedCards.length - 1));
        }
    }, [displayedCards.length, index]);

    // Handle empty filtered state
    if (displayedCards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-6">
                    <Layers size={32} className="text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-light text-slate-800 dark:text-slate-200">
                    {showFavorites ? "Нет избранных карточек" : "Колода пуста"}
                </h3>
                <p className="text-sm text-slate-500 max-w-xs mt-2">
                    {showFavorites ? "Отметьте важные карточки звездочкой." : "Кристаллизуй знания в Хабе, чтобы они появились здесь."}
                </p>
                {showFavorites && (
                    <button 
                        onClick={() => setShowFavorites(false)}
                        className="mt-6 px-4 py-2 text-xs font-mono uppercase tracking-widest text-indigo-500 hover:text-indigo-600 transition-colors border border-indigo-200 rounded-full hover:bg-indigo-50 dark:border-indigo-900 dark:hover:bg-indigo-900/20"
                    >
                        Показать все
                    </button>
                )}
            </div>
        );
    }

    // Ensure index is valid after filter change
    const safeIndex = index % displayedCards.length;
    const currentCard = displayedCards[safeIndex];

    const nextCard = () => {
        setIsFlipped(false);
        setIndex((prev) => (prev + 1) % displayedCards.length);
    };

    const prevCard = () => {
        setIsFlipped(false);
        setIndex((prev) => (prev - 1 + displayedCards.length) % displayedCards.length);
    };

    const toggleFlip = () => setIsFlipped(!isFlipped);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Удалить эту карточку?")) {
            onDelete(currentCard.id);
            // If we delete the last card, move index back
            if (safeIndex >= displayedCards.length - 1) {
                setIndex(Math.max(0, safeIndex - 1));
            }
        }
    };

    return (
        <div className="flex items-center justify-center h-full min-h-[500px] w-full p-4 md:p-8">
            {/* The "Oracle-like" Window */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-2xl min-h-[400px] bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden flex flex-col transition-colors duration-500"
                onClick={toggleFlip}
            >
                {/* Background Atmosphere (Fog/Neon) */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[40px]">
                    <motion.div 
                        animate={{ 
                            scale: isFlipped ? 1.2 : 1,
                            opacity: isFlipped ? 0.4 : 0.2
                        }}
                        transition={{ duration: 1 }}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] transition-colors duration-700 ${isFlipped ? 'bg-amber-500' : 'bg-indigo-500'}`}
                    />
                    <div style={{ backgroundImage: NOISE_PATTERN }} className="absolute inset-0 opacity-10 mix-blend-overlay" />
                </div>

                {/* Header Controls */}
                <div className="flex justify-between items-center px-8 pt-8 pb-2 relative z-20" onClick={e => e.stopPropagation()}>
                    {/* Status Label */}
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        {isFlipped ? <Sparkles size={12} className="text-amber-500" /> : <BrainCircuit size={12} className="text-indigo-500" />}
                        <span>{isFlipped ? 'ОТВЕТ' : 'ВОПРОС'}</span>
                        <span className="opacity-50 mx-2">//</span>
                        <span>{safeIndex + 1} ИЗ {displayedCards.length}</span>
                    </div>

                    {/* Top Right Controls: Filter & Star */}
                    <div className="flex items-center gap-3">
                        <Tooltip content="Показать только избранное">
                            <button 
                                onClick={() => { setShowFavorites(!showFavorites); setIndex(0); }}
                                className={`p-2 rounded-full transition-all ${showFavorites ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500 hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                <Filter size={16} strokeWidth={showFavorites ? 2.5 : 1.5} />
                            </button>
                        </Tooltip>
                        
                        <Tooltip content={currentCard.isStarred ? "Убрать из избранного" : "Добавить в избранное"}>
                            <button 
                                onClick={() => onToggleStar(currentCard.id)}
                                className={`p-2 rounded-full transition-all ${currentCard.isStarred ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                            >
                                <Star size={16} strokeWidth={currentCard.isStarred ? 0 : 1.5} fill={currentCard.isStarred ? "currentColor" : "none"} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center relative z-10 cursor-pointer overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentCard.id + (isFlipped ? '_back' : '_front')}
                            initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="w-full h-full flex items-center justify-center"
                        >
                            {/* Scrollable container for text to keep card size fixed */}
                            <div className="w-full h-[320px] overflow-y-auto pr-2 custom-scrollbar-ghost">
                                <div className="min-h-full flex flex-col justify-center">
                                    <div className="font-serif text-xl md:text-3xl leading-relaxed text-slate-800 dark:text-slate-100 select-none whitespace-pre-wrap">
                                        {isFlipped ? currentCard.back : currentCard.front}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer / Controls */}
                <div className="pb-8 px-8 flex justify-between items-end relative z-20" onClick={e => e.stopPropagation()}>
                    {/* Centered Navigation */}
                    <div className="flex-1 flex justify-center gap-8 pl-12">
                        <button 
                            onClick={prevCard}
                            className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-900 dark:text-white border-b border-transparent hover:border-slate-900 dark:hover:border-white transition-all pb-1 flex items-center gap-2"
                        >
                            <ArrowLeft size={12} /> [ ПРЕД ]
                        </button>

                        <button 
                            onClick={toggleFlip}
                            className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-2 group"
                        >
                            <RotateCw size={14} className={`transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
                            [ ПЕРЕВЕРНУТЬ ]
                        </button>

                        <button 
                            onClick={nextCard}
                            className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-900 dark:text-white border-b border-transparent hover:border-slate-900 dark:hover:border-white transition-all pb-1 flex items-center gap-2"
                        >
                            [ СЛЕД ] <ArrowRight size={12} />
                        </button>
                    </div>

                    {/* Delete Button (Bottom Right) */}
                    <div className="shrink-0">
                        <Tooltip content="Удалить карточку">
                            <button 
                                onClick={handleDelete}
                                className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                            >
                                <Trash2 size={16} strokeWidth={1.5} />
                            </button>
                        </Tooltip>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const Napkins: React.FC<Props> = ({
  notes, flashcards, config, addNote, updateNote, deleteNote, archiveNote,
  moveNoteToSandbox, onAddTask, deleteFlashcard, toggleFlashcardStar,
  initialNoteId, onClearInitialNote
}) => {
  const [newNoteContent, setNewNoteContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  useEffect(() => {
      if (initialNoteId) {
          const note = notes.find(n => n.id === initialNoteId);
          if (note) setEditingNote(note);
          onClearInitialNote?.();
      }
  }, [initialNoteId, notes]);

  const handleCreateNote = () => {
      if (!newNoteContent.trim()) return;
      const newNote: Note = {
          id: Date.now().toString(),
          content: newNoteContent,
          createdAt: Date.now(),
          status: 'inbox',
          tags: [],
          color: 'white'
      };
      addNote(newNote);
      setNewNoteContent('');
  };

  const filteredNotes = notes.filter(n => 
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
      <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden relative">
          
          <div className="p-4 md:p-8 pb-0 shrink-0 z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
              <div>
                  <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">
                      Заметки
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Входящие идеи и факты</p>
              </div>
              <div className="relative group w-full md:w-64">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                      type="text" 
                      placeholder="Поиск..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] rounded-2xl border-none text-sm outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 shadow-sm"
                  />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14}/></button>}
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar-light p-4 md:p-8">
              
              {/* Flashcards Section (Collapsible or Featured) */}
              {flashcards && flashcards.length > 0 && (
                  <div className="mb-12">
                      <KineticFlashcardDeck 
                          cards={flashcards} 
                          onDelete={deleteFlashcard} 
                          onToggleStar={toggleFlashcardStar} 
                      />
                  </div>
              )}

              {/* Input Area */}
              <div className="max-w-3xl mx-auto mb-10">
                  <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 relative focus-within:ring-2 focus-within:ring-indigo-100 transition-shadow">
                      <textarea
                          placeholder="Запиши новую мысль..."
                          className="w-full bg-transparent border-none outline-none resize-none min-h-[80px] text-base text-slate-800 dark:text-slate-200 placeholder:text-slate-400 font-serif leading-relaxed"
                          value={newNoteContent}
                          onChange={(e) => setNewNoteContent(e.target.value)}
                          onKeyDown={(e) => { if((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleCreateNote(); }}
                      />
                      <div className="flex justify-between items-center mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                          <div className="text-[10px] text-slate-400 font-mono hidden md:block">CMD + ENTER to save</div>
                          <button 
                              onClick={handleCreateNote} 
                              disabled={!newNoteContent.trim()}
                              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                          >
                              <Plus size={16} /> Сохранить
                          </button>
                      </div>
                  </div>
              </div>

              {/* Notes Grid */}
              <Masonry
                  breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
                  className="my-masonry-grid"
                  columnClassName="my-masonry-grid_column"
              >
                  {filteredNotes.map(note => (
                      <motion.div 
                          key={note.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onClick={() => setEditingNote(note)}
                          className={`${getNoteColorClass(note.color)} rounded-2xl p-6 shadow-sm border border-slate-200/50 dark:border-slate-800/50 cursor-pointer hover:shadow-md transition-all relative group overflow-hidden mb-6`}
                      >
                          {note.coverUrl && (
                              <div className="h-32 -mx-6 -mt-6 mb-4 overflow-hidden relative">
                                  <img src={note.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                              </div>
                          )}
                          
                          <div className="mb-2">
                              {note.title && <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">{applyTypography(note.title)}</h3>}
                              <div className="text-sm text-slate-600 dark:text-slate-300 font-serif leading-relaxed line-clamp-[10]">
                                  <ReactMarkdown>{note.content}</ReactMarkdown>
                              </div>
                          </div>

                          <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] text-slate-400 font-mono">{new Date(note.createdAt).toLocaleDateString()}</span>
                              <div className="flex gap-1">
                                  <Tooltip content="В Хаб">
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); moveNoteToSandbox(note.id); }}
                                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                      >
                                          <Box size={14} />
                                      </button>
                                  </Tooltip>
                                  <Tooltip content="В Архив">
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                      >
                                          <Trash2 size={14} />
                                      </button>
                                  </Tooltip>
                              </div>
                          </div>
                      </motion.div>
                  ))}
              </Masonry>
              
              {filteredNotes.length === 0 && (
                  <EmptyState 
                      icon={Edit3} 
                      title="Пустота" 
                      description={searchQuery ? "Ничего не найдено" : "Запиши свою первую мысль"} 
                      color="blue"
                  />
              )}
          </div>
          
          {/* Edit Modal - Simplistic implementation for robustness */}
          <AnimatePresence>
              {editingNote && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingNote(null)}>
                      <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          className={`${getNoteColorClass(editingNote.color)} w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
                          onClick={e => e.stopPropagation()}
                      >
                          <div className="p-6 overflow-y-auto flex-1">
                              <textarea 
                                  className="w-full bg-transparent text-xl font-bold mb-2 outline-none resize-none placeholder:text-slate-300"
                                  placeholder="Заголовок (опционально)"
                                  value={editingNote.title || ''}
                                  onChange={e => updateNote({...editingNote, title: e.target.value})}
                                  rows={1}
                              />
                              <textarea 
                                  className="w-full bg-transparent text-base font-serif leading-relaxed outline-none resize-none min-h-[300px]"
                                  value={editingNote.content}
                                  onChange={e => updateNote({...editingNote, content: e.target.value})}
                              />
                          </div>
                          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 flex justify-between items-center">
                              <button onClick={() => deleteNote(editingNote.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                              <button onClick={() => setEditingNote(null)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded-xl font-medium">Готово</button>
                          </div>
                      </motion.div>
                  </div>
              )}
          </AnimatePresence>
      </div>
  );
}

export default Napkins;