import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, AppConfig, Task } from '../types';
import { autoTagNote, findNotesByMood } from '../services/geminiService';
import { StickyNote, Plus, Search, Trash2, Archive, Box, Check, X, Tag, Pin, Filter, Loader2, Sparkles, ArrowLeft, PenLine } from 'lucide-react';
import EmptyState from './EmptyState';
import { Tooltip } from './Tooltip';

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
}

const Napkins: React.FC<Props> = ({ 
  notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, 
  deleteNote, reorderNote, updateNote, archiveNote, onAddTask 
}) => {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMoodSearch, setIsMoodSearch] = useState(false);
  const [moodQuery, setMoodQuery] = useState('');
  const [moodResults, setMoodResults] = useState<string[]>([]);
  const [isSearchingMood, setIsSearchingMood] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isAutoTagging, setIsAutoTagging] = useState(false);

  // Filter notes: Only Inbox
  const inboxNotes = notes.filter(n => n.status === 'inbox' || !n.status); 

  const displayedNotes = inboxNotes.filter(n => {
      if (isMoodSearch && moodResults.length > 0) {
          return moodResults.includes(n.id);
      }
      if (searchQuery) {
          return n.content.toLowerCase().includes(searchQuery.toLowerCase()) || n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      return true;
  }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.createdAt - a.createdAt;
  });

  const handleCreate = () => {
      if (!newContent.trim()) {
          setIsCreating(false);
          return;
      }
      const newNote: Note = {
          id: Date.now().toString(),
          content: newContent,
          tags: [],
          createdAt: Date.now(),
          status: 'inbox',
          isPinned: false
      };
      addNote(newNote);
      setNewContent('');
      setIsCreating(false);
  };

  const handleMoodSearch = async () => {
      if (!moodQuery.trim()) return;
      setIsSearchingMood(true);
      const ids = await findNotesByMood(inboxNotes, moodQuery, config);
      setMoodResults(ids);
      setIsSearchingMood(false);
  };

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  useEffect(() => {
      if (selectedNote) {
          setEditContent(selectedNote.content);
      }
  }, [selectedNote]);

  const togglePin = (e: React.MouseEvent, note: Note) => {
      e.stopPropagation();
      updateNote({ ...note, isPinned: !note.isPinned });
  };

  const handleAutoTag = async () => {
      if (!selectedNote) return;
      setIsAutoTagging(true);
      const tags = await autoTagNote(selectedNote.content, config);
      updateNote({ ...selectedNote, tags: [...new Set([...selectedNote.tags, ...tags])] });
      setIsAutoTagging(false);
  };

  const handleSaveEdit = () => {
      if (selectedNote && editContent.trim() !== selectedNote.content) {
          updateNote({ ...selectedNote, content: editContent });
      }
      setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a]">
        <header className={`p-4 md:p-8 pb-0 shrink-0 ${selectedNoteId ? 'hidden md:block' : 'block'}`}>
            <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Заметки</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Входящие идеи и мысли</p>
        </header>

        <div className="flex flex-1 overflow-hidden p-4 md:p-8 gap-6 relative">
            {/* LEFT PANE: LIST */}
            <div className={`${selectedNoteId ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 flex-col gap-4 overflow-y-auto pr-2 border-r-0 md:border-r border-slate-200 dark:border-slate-700 custom-scrollbar-light`}>
                
                {/* Search Bar */}
                <div className="sticky top-0 bg-[#f8fafc] dark:bg-[#0f172a] z-10 pb-2 space-y-2">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all"
                        />
                        <button onClick={() => setIsMoodSearch(!isMoodSearch)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isMoodSearch ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-500'}`}>
                            <Sparkles size={14} />
                        </button>
                    </div>
                    {isMoodSearch && (
                        <div className="animate-in slide-in-from-top-2">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Какое настроение? (ИИ поиск)" 
                                    value={moodQuery}
                                    onChange={(e) => setMoodQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleMoodSearch()}
                                    className="flex-1 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl text-sm focus:outline-none text-indigo-800 dark:text-indigo-200 placeholder:text-indigo-300"
                                />
                                <button onClick={handleMoodSearch} disabled={isSearchingMood} className="px-3 bg-indigo-500 text-white rounded-xl flex items-center justify-center">
                                    {isSearchingMood ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Create New Note Input (Collapsible) */}
                {isCreating ? (
                    <div className="bg-white dark:bg-[#1e293b] p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm animate-in zoom-in-95 duration-200">
                        <textarea 
                            autoFocus
                            placeholder="Пиши здесь..."
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            className="w-full h-24 resize-none outline-none text-sm bg-transparent text-slate-800 dark:text-slate-200"
                            onKeyDown={(e) => { if(e.key === 'Enter' && e.ctrlKey) handleCreate(); }}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setIsCreating(false)} className="p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"><X size={16} /></button>
                            <button onClick={handleCreate} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">Создать</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setIsCreating(true)} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 dark:text-slate-500 font-medium hover:border-indigo-300 hover:text-indigo-500 dark:hover:border-indigo-700 dark:hover:text-indigo-400 flex items-center justify-center gap-2 transition-colors bg-slate-50/50 dark:bg-slate-800/50">
                        <Plus size={18} /> Новая заметка
                    </button>
                )}

                {/* Notes List */}
                <div className="space-y-3 pb-20 md:pb-0">
                    {displayedNotes.length === 0 ? (
                        <div className="py-8">
                             <EmptyState icon={StickyNote} title="Нет заметок" description={searchQuery ? "Ничего не найдено" : "Создайте первую заметку"} color="slate" />
                        </div>
                    ) : (
                        displayedNotes.map(note => (
                            <div 
                                key={note.id} 
                                onClick={() => setSelectedNoteId(note.id)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all active:scale-[0.98] group relative ${selectedNoteId === note.id ? 'bg-white dark:bg-[#1e293b] border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'bg-white dark:bg-[#1e293b] border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                     <div className="flex-1 line-clamp-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                                        <ReactMarkdown 
                                            components={{
                                                p: ({node, ...props}) => <span {...props} />,
                                                a: ({node, ...props}) => <span className="text-indigo-500 underline" {...props} />
                                            }}
                                        >
                                            {note.content}
                                        </ReactMarkdown>
                                     </div>
                                     {note.isPinned && <Pin size={14} className="text-indigo-500 shrink-0 ml-2 rotate-45" fill="currentColor" />}
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50 dark:border-slate-700">
                                    <div className="flex flex-wrap gap-1">
                                        {note.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">#{tag}</span>
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono">{new Date(note.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANE: DETAIL */}
            <div className={`
                flex-col
                ${selectedNoteId 
                    ? 'fixed inset-0 z-[100] bg-[#f8fafc] dark:bg-[#0f172a] p-4 flex animate-in zoom-in-95 duration-200' 
                    : 'hidden'
                }
                md:flex md:static md:z-auto md:w-2/3 md:bg-transparent md:p-0 md:animate-none
            `}>
                {selectedNote ? (
                    <div className="flex flex-col h-full bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        {/* Toolbar */}
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedNoteId(null)} className="md:hidden p-2 -ml-2 text-slate-400"><ArrowLeft size={20} /></button>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:inline-block">Детали заметки</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Tooltip content={selectedNote.isPinned ? "Открепить" : "Закрепить"}>
                                    <button onClick={(e) => togglePin(e, selectedNote)} className={`p-2 rounded-lg transition-colors ${selectedNote.isPinned ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-700'}`}>
                                        <Pin size={18} fill={selectedNote.isPinned ? "currentColor" : "none"} />
                                    </button>
                                </Tooltip>
                                
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                                <Tooltip content="Авто-теги (ИИ)">
                                    <button onClick={handleAutoTag} disabled={isAutoTagging} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        {isAutoTagging ? <Loader2 size={18} className="animate-spin" /> : <Tag size={18} />}
                                    </button>
                                </Tooltip>
                                <Tooltip content="Отправить в Хаб">
                                    <button onClick={() => { moveNoteToSandbox(selectedNote.id); setSelectedNoteId(null); }} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        <Box size={18} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="В архив">
                                    <button onClick={() => { archiveNote(selectedNote.id); setSelectedNoteId(null); }} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        <Archive size={18} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Удалить">
                                    <button onClick={() => { if(confirm("Удалить заметку?")) { deleteNote(selectedNote.id); setSelectedNoteId(null); } }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar-light">
                            {isEditing ? (
                                <textarea 
                                    className="w-full h-full resize-none outline-none text-base leading-relaxed bg-transparent text-slate-800 dark:text-slate-200"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    autoFocus
                                />
                            ) : (
                                <div 
                                    className="prose prose-slate dark:prose-invert max-w-none cursor-text min-h-[50%]" 
                                    onClick={() => { setIsEditing(true); setEditContent(selectedNote.content); }}
                                >
                                    <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
                                </div>
                            )}
                        </div>

                        {/* Footer / Tags */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 flex flex-wrap gap-2 items-center">
                             {isEditing && (
                                 <div className="w-full flex justify-end gap-2 mb-2">
                                     <button onClick={() => { setIsEditing(false); setEditContent(selectedNote.content); }} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Отмена</button>
                                     <button onClick={handleSaveEdit} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Сохранить</button>
                                 </div>
                             )}
                             
                             <div className="flex items-center gap-2 text-slate-400 text-xs">
                                 <Tag size={14} /> Теги:
                             </div>
                             {selectedNote.tags.length > 0 ? (
                                 selectedNote.tags.map(tag => (
                                     <span key={tag} className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-500 dark:text-slate-300">
                                         #{tag}
                                         <button onClick={(e) => { e.stopPropagation(); updateNote({...selectedNote, tags: selectedNote.tags.filter(t => t !== tag)}); }} className="ml-1.5 hover:text-red-500"><X size={10} /></button>
                                     </span>
                                 ))
                             ) : (
                                 <span className="text-xs text-slate-300 dark:text-slate-600 italic">Нет тегов (используй ИИ или добавь вручную)</span>
                             )}
                             {/* Manual tag add could go here */}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600">
                        <StickyNote size={64} className="mb-4 opacity-20" />
                        <p className="text-lg font-light">Выберите заметку для просмотра</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Napkins;