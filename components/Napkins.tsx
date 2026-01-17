import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, Task, Habit, AppConfig, SketchItem, Flashcard, JournalEntry } from '../types';
import { 
  StickyNote, Plus, X, Trash2, Archive, Box, Edit3, 
  MoreHorizontal, Palette, Image as ImageIcon, Search, 
  RotateCw, Diamond, Sparkles, Zap, BrainCircuit, Mic,
  Maximize2, History
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';
import { applyTypography } from '../constants';

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

const ORACLE_VIBES = [
    { id: 'chaos', label: 'Хаос', icon: Sparkles },
    { id: 'structure', label: 'Структура', icon: Box },
    { id: 'insight', label: 'Инсайт', icon: Zap },
    { id: 'memory', label: 'Память', icon: BrainCircuit }
];

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed font-serif" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
};

const allowDataUrls = (url: string) => url;

interface Props {
  notes: Note[];
  flashcards: Flashcard[];
  tasks: Task[];
  habits: Habit[];
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

const Napkins: React.FC<Props> = ({ 
    notes, addNote, deleteNote, updateNote, archiveNote, moveNoteToSandbox, initialNoteId, onClearInitialNote 
}) => {
    // State
    const [inputText, setInputText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showOracle, setShowOracle] = useState(false);
    const [oracleState, setOracleState] = useState<'select' | 'thinking' | 'result'>('select');
    const [oracleVibe, setOracleVibe] = useState(ORACLE_VIBES[0]);
    const [oracleNote, setOracleNote] = useState<Note | null>(null);

    // Filtered Notes
    const filteredNotes = useMemo(() => {
        return notes
            .filter(n => n.status === 'inbox')
            .filter(n => n.content.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.createdAt - a.createdAt);
    }, [notes, searchQuery]);

    // Handlers
    const handleAddNote = () => {
        if (!inputText.trim()) return;
        const newNote: Note = {
            id: Date.now().toString(),
            content: applyTypography(inputText),
            tags: [],
            createdAt: Date.now(),
            status: 'inbox',
            color: 'white'
        };
        addNote(newNote);
        setInputText('');
    };

    const castOracleSpell = (vibe: typeof ORACLE_VIBES[0]) => {
        setOracleState('thinking');
        setTimeout(() => {
            const candidates = notes.filter(n => n.status !== 'trash');
            if (candidates.length > 0) {
                const random = candidates[Math.floor(Math.random() * candidates.length)];
                setOracleNote(random);
                setOracleState('result');
            } else {
                setOracleState('select');
                alert("Нет заметок для Оракула");
            }
        }, 1500);
    };

    const closeOracle = () => {
        setShowOracle(false);
        setOracleState('select');
        setOracleNote(null);
    };

    const handleAcceptOracleResult = () => {
        if (oracleNote) {
            closeOracle();
        }
    };

    const breakpointColumnsObj = {
        default: 3,
        1100: 2,
        700: 1
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-8 bg-[#f8fafc] dark:bg-[#0f172a]">
            {/* Header with Search and Oracle Button */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Заметки</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Входящий поток мыслей</p>
                </div>
                <button 
                    onClick={() => setShowOracle(true)}
                    className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-transform hover:scale-105"
                >
                    <Sparkles size={20} />
                </button>
            </div>

            {/* Input Area */}
            <div className="mb-8 relative max-w-2xl mx-auto w-full z-10">
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col">
                    <textarea 
                        className="w-full bg-transparent resize-none outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 min-h-[80px]"
                        placeholder="О чем думаешь?"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddNote();
                            }
                        }}
                    />
                    <div className="flex justify-between items-center mt-2">
                        <div className="flex gap-2">
                            {/* Tools placeholder */}
                        </div>
                        <button 
                            onClick={handleAddNote}
                            disabled={!inputText.trim()}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-opacity"
                        >
                            Добавить
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Поиск..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            </div>

            {/* Notes Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light min-h-0 pr-2">
                {filteredNotes.length === 0 ? (
                    <EmptyState 
                        icon={StickyNote} 
                        title="Пусто" 
                        description="Здесь будут твои заметки" 
                        color="indigo"
                    />
                ) : (
                    <Masonry
                        breakpointCols={breakpointColumnsObj}
                        className="my-masonry-grid"
                        columnClassName="my-masonry-grid_column"
                    >
                        {filteredNotes.map(note => (
                            <motion.div 
                                key={note.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`${getNoteColorClass(note.color)} p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all group mb-4 relative overflow-hidden`}
                            >
                                <div className="text-sm text-slate-800 dark:text-slate-200 font-serif leading-relaxed max-h-[400px] overflow-hidden relative">
                                    <ReactMarkdown components={markdownComponents} urlTransform={allowDataUrls} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                        {note.content}
                                    </ReactMarkdown>
                                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-[#1e293b] to-transparent pointer-events-none opacity-0" />
                                </div>
                                
                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[9px] text-slate-400 font-mono">{new Date(note.createdAt).toLocaleDateString()}</span>
                                    <div className="flex gap-1">
                                        <Tooltip content="В Хаб">
                                            <button onClick={() => moveNoteToSandbox(note.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-indigo-500 transition-colors">
                                                <Box size={14} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="В Архив">
                                            <button onClick={() => archiveNote(note.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-amber-500 transition-colors">
                                                <Archive size={14} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Удалить">
                                            <button onClick={() => deleteNote(note.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </Masonry>
                )}
            </div>

            {/* ORACLE MODAL */}
            <AnimatePresence>
                {showOracle && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 backdrop-blur-[20px] bg-white/30 dark:bg-black/40"
                            onClick={closeOracle}
                        />
                        
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-2xl bg-white/80 dark:bg-[#1e293b]/90 backdrop-blur-xl rounded-[40px] shadow-2xl overflow-hidden border border-white/50 dark:border-white/10 flex flex-col h-[600px] max-h-[85vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <button onClick={closeOracle} className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-20">
                                <X size={20} className="text-slate-400" />
                            </button>

                            <div className="flex justify-center items-center gap-6 pt-8 pb-4 border-b border-transparent shrink-0">
                                {ORACLE_VIBES.map(vibe => (
                                    <button 
                                        key={vibe.id}
                                        onClick={() => setOracleVibe(vibe)}
                                        className={`text-[10px] font-mono uppercase tracking-widest transition-all flex items-center gap-2 pb-1 ${oracleVibe.id === vibe.id ? 'text-slate-900 dark:text-slate-100 border-b border-slate-900 dark:border-slate-100' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-b border-transparent'}`}
                                    >
                                        <vibe.icon size={14} className={oracleVibe.id === vibe.id ? "text-indigo-500" : "text-slate-400"} />
                                        {vibe.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 flex flex-col relative overflow-hidden">
                                {oracleState === 'select' && (
                                    <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                                        <Diamond size={24} strokeWidth={1} className="text-slate-300 mb-8" />
                                        <button 
                                            onClick={() => castOracleSpell(oracleVibe)}
                                            className="px-8 py-4 border border-slate-300 dark:border-slate-600 rounded-full text-xs font-mono uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all duration-500 active:scale-95"
                                        >
                                            [ ВЫЗВАТЬ МЫСЛЬ ]
                                        </button>
                                    </div>
                                )}

                                {oracleState === 'thinking' && (
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
                                            <Diamond size={48} strokeWidth={0.5} className="text-slate-800 dark:text-white animate-pulse relative z-10" />
                                        </div>
                                        <div className="mt-8 text-[10px] font-mono uppercase tracking-[0.3em] text-slate-400 animate-pulse">
                                            Сканирую архив...
                                        </div>
                                    </div>
                                )}

                                {oracleState === 'result' && oracleNote && (
                                    <div className="flex-1 flex flex-col p-8 md:p-12 overflow-y-auto custom-scrollbar-ghost min-h-0">
                                        <div className="flex justify-center mb-8 shrink-0">
                                            <Diamond size={16} strokeWidth={1} className="text-indigo-500" />
                                        </div>
                                        
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="my-auto text-center w-full"
                                        >
                                            <div className="font-serif text-xl md:text-2xl leading-relaxed text-slate-800 dark:text-slate-200">
                                                <ReactMarkdown components={{...markdownComponents, p: ({children}: any) => <span>{children}</span>}} urlTransform={allowDataUrls} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                                    {oracleNote.content}
                                                </ReactMarkdown>
                                            </div>
                                        </motion.div>

                                        <div className="mt-12 text-center shrink-0 flex flex-col items-center gap-6">
                                            <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest opacity-40">
                                                {new Date(oracleNote.createdAt).toLocaleDateString()} • ID: {oracleNote.id.slice(-5)}
                                            </div>

                                            <button 
                                                onClick={() => castOracleSpell(oracleVibe)}
                                                className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-2"
                                            >
                                                <RotateCw size={12} /> [ ЕЩЕ РАЗ ]
                                            </button>
                                            
                                            <button 
                                                onClick={handleAcceptOracleResult}
                                                className="text-xs font-mono uppercase tracking-[0.2em] text-slate-900 dark:text-white border-b border-transparent hover:border-slate-900 dark:hover:border-white transition-all pb-1"
                                            >
                                                [ ПРИНЯТЬ В РАБОТУ ]
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Napkins;