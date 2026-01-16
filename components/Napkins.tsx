import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Masonry from 'react-masonry-css';
import ReactMarkdown from 'react-markdown';
import { Note, AppConfig, Task, SketchItem, JournalEntry, Flashcard } from '../types';
import { Layers, Sparkles, BrainCircuit, RotateCw, ArrowRight, Plus, Search, Mic, Image as ImageIcon, Trash2, Archive, Box, MoreVertical, X, Check, Copy, LayoutGrid, Zap } from 'lucide-react';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';

const NOISE_PATTERN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E")`;

const KineticFlashcardDeck = ({ cards }: { cards: Flashcard[] }) => {
    const [index, setIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    if (!cards || cards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-6">
                    <Layers size={32} className="text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-light text-slate-800 dark:text-slate-200">Колода пуста</h3>
                <p className="text-sm text-slate-500 max-w-xs mt-2">Кристаллизуй знания в Хабе, чтобы они появились здесь.</p>
            </div>
        );
    }

    const currentCard = cards[index];

    const nextCard = () => {
        setIsFlipped(false);
        setIndex((prev) => (prev + 1) % cards.length);
    };

    const toggleFlip = () => setIsFlipped(!isFlipped);

    return (
        <div className="flex items-center justify-center h-full min-h-[600px] w-full p-4 md:p-8">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-2xl h-[500px] md:h-[600px] bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden flex flex-col transition-colors duration-500"
                onClick={toggleFlip}
            >
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

                <div className="flex justify-center pt-8 pb-4 relative z-10 shrink-0">
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                        {isFlipped ? <Sparkles size={12} className="text-amber-500" /> : <BrainCircuit size={12} className="text-indigo-500" />}
                        {isFlipped ? 'RESPONSE' : 'QUERY'} // {String(index + 1).padStart(2, '0')}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar-ghost relative z-10 w-full">
                    <div className="min-h-full flex flex-col items-center justify-center p-8 md:p-12 text-center cursor-pointer">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentCard.id + (isFlipped ? '_back' : '_front')}
                                initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="w-full"
                            >
                                <div className="font-serif text-2xl md:text-3xl lg:text-4xl leading-relaxed text-slate-800 dark:text-slate-100 select-none whitespace-pre-wrap break-words">
                                    {isFlipped ? currentCard.back : currentCard.front}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <div className="pb-8 md:pb-10 flex justify-center gap-8 relative z-20 shrink-0" onClick={e => e.stopPropagation()}>
                    <button 
                        onClick={toggleFlip}
                        className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-2 group"
                    >
                        <RotateCw size={14} className={`transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
                        [ FLIP ]
                    </button>

                    <button 
                        onClick={nextCard}
                        className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-900 dark:text-white border-b border-transparent hover:border-slate-900 dark:hover:border-white transition-all pb-1 flex items-center gap-2"
                    >
                        [ NEXT_NODE ] <ArrowRight size={12} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

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
  initialNoteId?: string | null;
  onClearInitialNote?: () => void;
  journalEntries: JournalEntry[];
}

const Napkins: React.FC<Props> = ({ 
    notes, flashcards, config, addNote, moveNoteToSandbox, moveNoteToInbox, deleteNote, 
    reorderNote, updateNote, archiveNote, onAddTask, onAddJournalEntry, addSketchItem, 
    initialNoteId, onClearInitialNote, journalEntries 
}) => {
    const [viewMode, setViewMode] = useState<'grid' | 'deck'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);

    const filteredNotes = notes.filter(n => 
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
        n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleCreateNote = () => {
        if (!newNoteContent.trim()) return;
        const note: Note = {
            id: Date.now().toString(),
            content: newNoteContent,
            tags: [], // Could implement auto-tagging here later
            createdAt: Date.now(),
            status: 'inbox'
        };
        addNote(note);
        setNewNoteContent('');
        setIsInputFocused(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleCreateNote();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] overflow-hidden">
            {/* Header */}
            <header className="shrink-0 px-4 md:px-8 pt-4 md:pt-8 mb-4">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Заметки</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Входящие мысли</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            <LayoutGrid size={20} strokeWidth={1.5} />
                        </button>
                        <button 
                            onClick={() => setViewMode('deck')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'deck' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        >
                            <Layers size={20} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {viewMode === 'grid' && (
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1 group">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" strokeWidth={1} />
                            <input 
                                type="text" 
                                placeholder="Поиск..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 transition-shadow shadow-sm placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                )}
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
                {viewMode === 'deck' ? (
                    <KineticFlashcardDeck cards={flashcards} />
                ) : (
                    <>
                        {/* Input Area */}
                        <div className={`mb-8 transition-all duration-300 ${isInputFocused ? 'scale-100' : 'scale-100'}`}>
                            <div className={`bg-white dark:bg-[#1e293b] rounded-3xl shadow-sm border transition-colors ${isInputFocused ? 'border-indigo-300 dark:border-indigo-700 ring-4 ring-indigo-50 dark:ring-indigo-900/20' : 'border-slate-200 dark:border-slate-800'}`}>
                                <textarea 
                                    value={newNoteContent}
                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                    onFocus={() => setIsInputFocused(true)}
                                    onBlur={() => !newNoteContent && setIsInputFocused(false)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Записать мысль..."
                                    className="w-full bg-transparent p-6 min-h-[80px] max-h-[300px] outline-none text-slate-800 dark:text-slate-200 resize-none placeholder:text-slate-400 text-lg font-serif"
                                />
                                {isInputFocused && (
                                    <div className="px-4 pb-4 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                                        <span className="text-[10px] text-slate-400 font-mono">CMD + ENTER</span>
                                        <button 
                                            onClick={handleCreateNote}
                                            disabled={!newNoteContent.trim()}
                                            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium text-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                                        >
                                            Сохранить
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notes Grid */}
                        {filteredNotes.length === 0 ? (
                            <div className="py-12">
                                <EmptyState 
                                    icon={Box} 
                                    title="Пусто" 
                                    description={searchQuery ? "Ничего не найдено" : "Здесь будут твои заметки"} 
                                    color="indigo"
                                />
                            </div>
                        ) : (
                            <Masonry
                                breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
                                className="my-masonry-grid"
                                columnClassName="my-masonry-grid_column"
                            >
                                {filteredNotes.map(note => (
                                    <div key={note.id} className="group relative bg-white dark:bg-[#1e293b] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 mb-6">
                                        <div className="font-serif text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                                            <ReactMarkdown>{note.content}</ReactMarkdown>
                                        </div>
                                        <div className="mt-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] font-mono text-slate-400">{new Date(note.createdAt).toLocaleDateString()}</span>
                                            <div className="flex gap-2">
                                                <Tooltip content="В Хаб">
                                                    <button onClick={() => moveNoteToSandbox(note.id)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors">
                                                        <Box size={14} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip content="Удалить">
                                                    <button onClick={() => { if(confirm("Удалить?")) deleteNote(note.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </Masonry>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Napkins;