
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Masonry from 'react-masonry-css';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import { Note, AppConfig, Task, SketchItem, JournalEntry, Flashcard, Habit, Module } from '../types';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';
import { Send, Tag as TagIcon, RotateCcw, RotateCw, X, Trash2, GripVertical, ChevronUp, ChevronDown, LayoutGrid, Library, Box, Edit3, Pin, Palette, Check, Search, Plus, Sparkles, Kanban, Dices, Shuffle, Quote, ArrowRight, PenTool, Orbit, Flame, Waves, Clover, ArrowLeft, Image as ImageIcon, Bold, Italic, List, Code, Underline, Eraser, Type, Globe, Layout, Upload, RefreshCw, Archive, Clock, Diamond, Tablet, Book, BrainCircuit, Star, Pause, Play, Maximize2, Zap, Circle, Gem, Aperture, Layers, Filter, StickyNote } from 'lucide-react';

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

const breakpointColumnsObj = {
  default: 4,
  1600: 3,
  1100: 2,
  700: 1
};

const allowDataUrls = (url: string) => url;

const extractImages = (content: string): string[] => {
    const matches = content.matchAll(/!\[.*?\]\((.*?)\)/g);
    return Array.from(matches, m => m[1]);
};

const getPreviewContent = (content: string) => {
    let cleanText = content.replace(/!\[.*?\]\(.*?\)/g, '');
    cleanText = cleanText.replace(/[ \t]+/g, ' ').trim();
    const sentences = cleanText.match(/[^\.!\?]+[\.!\?]+(?=\s|$)/g) || [cleanText];
    let limit = 0;
    let sentenceCount = 0;
    for (let s of sentences) {
        if (sentenceCount >= 3) break;
        if (limit + s.length > 300 && sentenceCount >= 1) break;
        limit += s.length;
        sentenceCount++;
    }
    let preview = sentences.slice(0, sentenceCount).join(' ');
    if (preview.length === 0 && cleanText.length > 0) preview = cleanText;
    if (preview.length > 300) {
        preview = preview.slice(0, 300);
        const lastSpace = preview.lastIndexOf(' ');
        if (lastSpace > 0) preview = preview.slice(0, lastSpace);
    }
    if (preview.length < cleanText.length) preview = preview.replace(/[\.!\?,\s]+$/, '') + '...';
    return preview;
};

const processImage = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('File is not an image'));
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                } else {
                    reject(new Error('Canvas context failed'));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const markdownComponents = {
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-800 dark:text-slate-200" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
};

const Napkins: React.FC<Props> = ({ 
    notes, flashcards = [], tasks = [], habits = [], sketchItems = [], config, 
    addNote, moveNoteToSandbox, moveNoteToInbox, archiveNote, deleteNote, 
    reorderNote, updateNote, onAddTask, onAddJournalEntry, addSketchItem, 
    deleteSketchItem, updateSketchItem, deleteFlashcard, toggleFlashcardStar,
    initialNoteId, onClearInitialNote, journalEntries = [], onNavigate, onNavigateToItem 
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'library'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Compute visible notes based on tab and search
  const visibleNotes = useMemo(() => {
      let filtered = notes.filter(n => {
          // Status filtering logic
          if (activeTab === 'inbox') return n.status === 'inbox';
          if (activeTab === 'library') return n.status !== 'trash' && n.status !== 'inbox'; // Show Archive/Sandbox/Processed in Library?
          // If "Library" means just "All Notes" excluding trash:
          return n.status !== 'trash'; 
      });

      // Simple fix: if Library tab is meant to show everything that's not inbox or trash
      if (activeTab === 'library') {
          filtered = notes.filter(n => n.status !== 'trash' && n.status !== 'inbox');
      } else {
          filtered = notes.filter(n => n.status === 'inbox');
      }

      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(n => 
              n.content.toLowerCase().includes(q) || 
              (n.title && n.title.toLowerCase().includes(q)) || 
              n.tags.some(t => t.toLowerCase().includes(q))
          );
      }
      return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [notes, activeTab, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden">
        
        {/* HEADER */}
        <div className="shrink-0 w-full px-4 md:px-8 pt-4 md:pt-8 mb-6 z-50">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">
                        Заметки
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Хаос и Порядок</p>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('inbox')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'inbox' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        Входящие
                    </button>
                    <button 
                        onClick={() => setActiveTab('library')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'library' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                        Библиотека
                    </button>
                </div>
             </header>
        </div>

        {/* SEARCH BAR */}
        <div className="px-4 md:px-8 mb-6 shrink-0">
            <div className="relative max-w-xl">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Поиск мыслей..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border border-slate-100 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                />
            </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
            {visibleNotes.length === 0 ? (
                <EmptyState 
                    icon={activeTab === 'inbox' ? StickyNote : Library} 
                    title={activeTab === 'inbox' ? "Входящие пусты" : "Библиотека пуста"} 
                    description={activeTab === 'inbox' ? "Создайте новую заметку, чтобы начать" : "Переместите заметки из входящих для хранения"}
                    color="indigo"
                />
            ) : (
                <Masonry breakpointCols={breakpointColumnsObj} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                    {visibleNotes.map(note => {
                        const previewText = getPreviewContent(note.content);
                        const colorClass = colors.find(c => c.id === note.color)?.class || 'bg-white dark:bg-[#1e293b]';
                        
                        // --- CONNECTION LOGIC ---
                        // 1. Hub (Sandbox): Note is connected to another note that is in Sandbox status
                        const connectedIds = note.connectedNoteIds || [];
                        const hubConnection = notes.find(n => n.status === 'sandbox' && connectedIds.includes(n.id));
                        
                        // 2. Journal: Entry references this note
                        const journalConnection = journalEntries.find(j => (j.linkedNoteIds?.includes(note.id) || j.linkedNoteId === note.id));
                        const isJournalArchived = journalConnection?.isArchived;
                        
                        // 3. Sprint (Task): Task connected via explicit ID linkage (custom convention)
                        // Or reverse check if we assume tasks track connected note IDs
                        const taskConnection = tasks.find(t => connectedIds.includes(t.id));
                        const isTaskArchived = taskConnection?.isArchived;

                        // 4. Sketchpad
                        const sketchConnection = sketchItems.find(s => connectedIds.includes(s.id));

                        return (
                            <motion.div 
                                key={note.id}
                                layoutId={note.id}
                                className={`relative rounded-2xl border transition-all duration-300 group overflow-hidden flex flex-col mb-6 ${colorClass} border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md`}
                            >
                                {note.coverUrl && (
                                    <div className="h-32 w-full shrink-0 relative overflow-hidden">
                                        <img src={note.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                
                                <div className="p-5 flex flex-col gap-2">
                                    {/* Header */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            {note.title && <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight mb-1 truncate">{note.title}</h3>}
                                            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                                                {new Date(note.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="text-slate-600 dark:text-slate-300 font-serif text-sm leading-relaxed line-clamp-6 my-2">
                                        <ReactMarkdown components={markdownComponents}>{previewText}</ReactMarkdown>
                                    </div>

                                    {/* Footer: Connections & Actions */}
                                    <div className="flex justify-between items-end pt-3 mt-auto border-t border-slate-100 dark:border-slate-800/50">
                                        
                                        {/* GHOST DOTS (Connections) */}
                                        <div className="flex items-center gap-1.5 h-6">
                                            {/* Hub */}
                                            {hubConnection && (
                                                <Tooltip content="В Хабе">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onNavigateToItem && onNavigateToItem(Module.SANDBOX, hubConnection.id); }}
                                                        className="w-1.5 h-1.5 rounded-full border border-amber-400 bg-transparent hover:bg-amber-400 transition-colors" 
                                                    />
                                                </Tooltip>
                                            )}
                                            
                                            {/* Journal */}
                                            {journalConnection && (
                                                <Tooltip content={isJournalArchived ? "В архиве дневника" : "В Дневнике"}>
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            onNavigateToItem && onNavigateToItem(isJournalArchived ? Module.ARCHIVE : Module.JOURNAL, journalConnection.id); 
                                                        }}
                                                        className={`w-1.5 h-1.5 rounded-full border border-cyan-400 bg-transparent hover:bg-cyan-400 transition-colors ${isJournalArchived ? 'opacity-50 border-dashed' : ''}`} 
                                                    />
                                                </Tooltip>
                                            )}

                                            {/* Kanban */}
                                            {taskConnection && (
                                                <Tooltip content={isTaskArchived ? "В Зале славы" : "В Спринтах"}>
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            onNavigateToItem && onNavigateToItem(isTaskArchived ? Module.ARCHIVE : Module.KANBAN, taskConnection.id); 
                                                        }}
                                                        className={`w-1.5 h-1.5 rounded-full border border-emerald-400 bg-transparent hover:bg-emerald-400 transition-colors ${isTaskArchived ? 'opacity-50 border-dashed' : ''}`} 
                                                    />
                                                </Tooltip>
                                            )}

                                            {/* Sketchpad */}
                                            {sketchConnection && (
                                                <Tooltip content="В Скетчпаде">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onNavigateToItem && onNavigateToItem(Module.SKETCHPAD, sketchConnection.id); }}
                                                        className="w-1.5 h-1.5 rounded-full border border-fuchsia-400 bg-transparent hover:bg-fuchsia-400 transition-colors" 
                                                    />
                                                </Tooltip>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip content="В Хаб">
                                                <button onClick={() => moveNoteToSandbox(note.id)} className="p-1.5 text-slate-400 hover:text-amber-500 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20"><Box size={14} /></button>
                                            </Tooltip>
                                            <Tooltip content="Архивировать">
                                                <button onClick={() => archiveNote(note.id)} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20"><Archive size={14} /></button>
                                            </Tooltip>
                                            <Tooltip content="Удалить">
                                                <button onClick={() => deleteNote(note.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                                            </Tooltip>
                                        </div>
                                    </div>
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
