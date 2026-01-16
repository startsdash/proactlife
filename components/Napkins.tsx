
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Masonry from 'react-masonry-css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Note, Task, Flashcard, AppConfig, JournalEntry, SketchItem } from '../types';
import { autoTagNote } from '../services/geminiService';
import { 
  Search, Plus, X, Loader2, Tag, Archive, Trash2, Box, Palette, Layout, 
  Pin, MoreHorizontal, Maximize2, MoveRight, Image as ImageIcon, Mic, 
  Sparkles, BrainCircuit, Filter, Star 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from './Tooltip';
import { applyTypography } from '../constants';
import EmptyState from './EmptyState';

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

const allowDataUrls = (url: string) => url;

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
    p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed font-serif" {...props} />,
    a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="pl-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="font-sans font-bold text-xl mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-sans font-bold text-lg mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-500 dark:text-slate-400 my-3 font-serif" {...props} />,
    img: ({node, ...props}: any) => <img className="rounded-xl max-h-60 object-cover my-3 block w-full shadow-sm" {...props} loading="lazy" />,
};

const Napkins: React.FC<Props> = ({ 
    notes, flashcards, config, addNote, moveNoteToSandbox, moveNoteToInbox, deleteNote, reorderNote, updateNote, archiveNote, 
    initialNoteId, onClearInitialNote 
}) => {
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newCover, setNewCover] = useState<string | null>(null);
  const [newColor, setNewColor] = useState('white');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoTagging, setIsAutoTagging] = useState(false);
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (initialNoteId) {
          const exists = notes.find(n => n.id === initialNoteId);
          if (exists) setSelectedNoteId(initialNoteId);
          onClearInitialNote?.();
      }
  }, [initialNoteId, notes, onClearInitialNote]);

  const filteredNotes = useMemo(() => {
      const query = searchQuery.toLowerCase();
      return notes.filter(n => 
          (n.content.toLowerCase().includes(query) || 
           n.title?.toLowerCase().includes(query) ||
           n.tags.some(t => t.toLowerCase().includes(query)))
      ).sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.createdAt - a.createdAt;
      });
  }, [notes, searchQuery]);

  const handleCreateNote = async () => {
      if (!newContent.trim() && !newCover && !newTitle.trim()) return;
      
      const tags = [...newTags];
      
      const newNote: Note = {
          id: Date.now().toString(),
          title: newTitle.trim() ? applyTypography(newTitle.trim()) : undefined,
          content: applyTypography(newContent),
          tags,
          createdAt: Date.now(),
          status: 'inbox',
          color: newColor,
          coverUrl: newCover || undefined,
          connectedNoteIds: []
      };
      
      addNote(newNote);
      
      // Auto-tag in background
      if (config.aiTools.find(t => t.id === 'tagger' && !t.isDisabled)) {
          if (newContent.length > 50) {
              autoTagNote(newContent, config).then(generatedTags => {
                  if (generatedTags.length > 0) {
                      updateNote({ 
                          ...newNote, 
                          tags: Array.from(new Set([...tags, ...generatedTags])) 
                      });
                  }
              });
          }
      }

      setNewContent('');
      setNewTitle('');
      setNewTags([]);
      setNewCover(null);
      setNewColor('white');
      setIsInputOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          processImage(file).then(base64 => {
              // If input is empty, use as cover, else append to content
              if (!newContent.trim() && !newCover) {
                  setNewCover(base64);
              } else {
                  setNewContent(prev => prev + `\n\n![Image](${base64})`);
              }
          });
      }
  };

  const togglePin = (note: Note, e: React.MouseEvent) => {
      e.stopPropagation();
      updateNote({ ...note, isPinned: !note.isPinned });
  };

  const breakpointColumnsObj = {
    default: 3,
    1100: 2,
    700: 1
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#0f172a]">
        {/* HEADER */}
        <div className="w-full px-4 md:px-8 pt-4 md:pt-8 mb-4 shrink-0">
             <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Заметки</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Входящие мысли и идеи</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64 group">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button 
                        onClick={() => setIsInputOpen(true)}
                        className="p-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                        <Plus size={20} />
                    </button>
                </div>
             </header>
        </div>

        {/* INPUT MODAL */}
        <AnimatePresence>
            {isInputOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsInputOpen(false)}>
                    <motion.div 
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className={`${getNoteColorClass(newColor)} w-full max-w-lg rounded-2xl shadow-2xl p-4 md:p-6 border border-slate-200 dark:border-slate-700 overflow-hidden relative`}
                        onClick={e => e.stopPropagation()}
                    >
                        {newCover && (
                            <div className="relative h-32 -mx-6 -mt-6 mb-4 group">
                                <img src={newCover} alt="Cover" className="w-full h-full object-cover" />
                                <button onClick={() => setNewCover(null)} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                            </div>
                        )}
                        
                        <input 
                            placeholder="Заголовок (опционально)" 
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full bg-transparent text-lg font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none mb-3"
                        />
                        
                        <textarea 
                            placeholder="О чем думаешь?" 
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            className="w-full bg-transparent text-base text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none resize-none min-h-[120px] font-serif leading-relaxed"
                            autoFocus
                        />

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5 dark:border-white/5">
                            <div className="flex gap-2">
                                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                                    <ImageIcon size={18} />
                                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </button>
                                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-lg p-1">
                                    {colors.map(c => (
                                        <button 
                                            key={c.id}
                                            onClick={() => setNewColor(c.id)}
                                            className={`w-4 h-4 rounded-full border border-black/10 ${c.id === newColor ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                                            style={{ backgroundColor: c.hex }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setIsInputOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Отмена</button>
                                <button onClick={handleCreateNote} className="px-6 py-2 text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:shadow-lg transition-all active:scale-95">Создать</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* NOTES GRID */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-20 custom-scrollbar-light">
            {filteredNotes.length === 0 ? (
                <EmptyState 
                    icon={Box} 
                    title="Нет заметок" 
                    description={searchQuery ? "Ничего не найдено" : "Создайте первую заметку"} 
                    actionLabel={!searchQuery ? "Создать" : undefined}
                    onAction={() => setIsInputOpen(true)}
                />
            ) : (
                <Masonry
                    breakpointCols={breakpointColumnsObj}
                    className="my-masonry-grid"
                    columnClassName="my-masonry-grid_column"
                >
                    {filteredNotes.map(note => (
                        <div 
                            key={note.id} 
                            onClick={() => setSelectedNoteId(note.id)}
                            className={`
                                ${getNoteColorClass(note.color)} relative rounded-2xl p-5 mb-6
                                border border-slate-200/50 dark:border-slate-800 shadow-sm hover:shadow-md 
                                transition-all cursor-pointer group overflow-hidden flex flex-col
                            `}
                        >
                            {note.isPinned && (
                                <div className="absolute top-3 right-3 text-indigo-500 z-10">
                                    <Pin size={14} className="fill-current" />
                                </div>
                            )}

                            {note.coverUrl && (
                                <div className="h-32 w-full shrink-0 relative overflow-hidden rounded-lg mb-3">
                                    <img src={note.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                </div>
                            )}

                            {note.title && <h3 className="font-sans font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 leading-tight">{applyTypography(note.title)}</h3>}
                            
                            <div className="text-slate-600 dark:text-slate-300 font-serif text-sm leading-relaxed max-h-[300px] overflow-hidden relative">
                                <ReactMarkdown 
                                    components={markdownComponents} 
                                    urlTransform={allowDataUrls} 
                                    remarkPlugins={[remarkGfm]} 
                                    rehypePlugins={[rehypeRaw]}
                                >
                                    {note.content}
                                </ReactMarkdown>
                                <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white dark:from-[#1e293b] to-transparent pointer-events-none opacity-50" />
                            </div>

                            {note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-4">
                                    {note.tags.map(tag => (
                                        <span key={tag} className="text-[10px] bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-2 py-1 rounded font-mono uppercase tracking-wider">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* HOVER ACTIONS */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-slate-900/90 p-1 rounded-lg backdrop-blur-sm shadow-sm border border-slate-100 dark:border-slate-800">
                                <Tooltip content={note.isPinned ? "Открепить" : "Закрепить"}>
                                    <button onClick={(e) => togglePin(note, e)} className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 ${note.isPinned ? 'text-indigo-500' : 'text-slate-400'}`}>
                                        <Pin size={14} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="В Хаб">
                                    <button onClick={(e) => { e.stopPropagation(); moveNoteToSandbox(note.id); }} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-500">
                                        <Box size={14} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Архивировать">
                                    <button onClick={(e) => { e.stopPropagation(); archiveNote(note.id); }} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600">
                                        <Archive size={14} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Удалить">
                                    <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500">
                                        <Trash2 size={14} />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    ))}
                </Masonry>
            )}
        </div>

        {/* DETAIL MODAL */}
        <AnimatePresence>
            {selectedNoteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedNoteId(null)}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-[#1e293b] w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {(() => {
                            const note = notes.find(n => n.id === selectedNoteId);
                            if (!note) return null;
                            
                            return (
                                <>
                                    <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex gap-2">
                                            <button onClick={() => togglePin(note, { stopPropagation: () => {} } as any)} className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${note.isPinned ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400'}`}>
                                                <Pin size={18} />
                                            </button>
                                            <button onClick={() => { moveNoteToSandbox(note.id); setSelectedNoteId(null); }} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-500 transition-colors">
                                                <Box size={18} />
                                            </button>
                                            <button onClick={() => { archiveNote(note.id); setSelectedNoteId(null); }} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
                                                <Archive size={18} />
                                            </button>
                                            <button onClick={() => { deleteNote(note.id); setSelectedNoteId(null); }} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <button onClick={() => setSelectedNoteId(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                                            <X size={20} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar-light">
                                        {note.coverUrl && (
                                            <div className="rounded-xl overflow-hidden mb-6 shadow-sm">
                                                <img src={note.coverUrl} alt="Cover" className="w-full max-h-64 object-cover" />
                                            </div>
                                        )}
                                        
                                        {note.title ? (
                                            <input 
                                                value={note.title}
                                                onChange={(e) => updateNote({...note, title: e.target.value})}
                                                className="w-full bg-transparent text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 outline-none font-sans"
                                                placeholder="Заголовок"
                                            />
                                        ) : (
                                            <div className="h-2" />
                                        )}

                                        <textarea 
                                            value={note.content}
                                            onChange={(e) => updateNote({...note, content: e.target.value})}
                                            className="w-full h-[400px] bg-transparent text-base text-slate-700 dark:text-slate-300 font-serif leading-relaxed outline-none resize-none"
                                        />
                                    </div>
                                    
                                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                                        <div className="text-xs text-slate-400 font-mono">
                                            {new Date(note.createdAt).toLocaleString()}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {colors.map(c => (
                                                <button 
                                                    key={c.id}
                                                    onClick={() => updateNote({...note, color: c.id})}
                                                    className={`w-5 h-5 rounded-full border border-black/10 ${c.id === note.color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : ''}`}
                                                    style={{ backgroundColor: c.hex }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Napkins;
