import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, AppConfig, Task } from '../types';
import { applyTypography } from '../constants';
import { autoTagNote } from '../services/geminiService';
import { Plus, Search, Trash2, Archive, Box, Pin, X, Wand2, StickyNote, ArrowLeft } from 'lucide-react';
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
    notes, 
    config, 
    addNote, 
    moveNoteToSandbox, 
    deleteNote, 
    updateNote, 
    archiveNote 
}) => {
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [isAutoTagging, setIsAutoTagging] = useState(false);

    // Filter notes: Inbox only, active (not archived/sandbox handled elsewhere usually or here as status)
    // The App.tsx passes all notes, we should filter for inbox?
    // App.tsx passes `data.notes`. `Napkins` is for `Module.NAPKINS`.
    // Usually Napkins module shows 'inbox' status notes.
    // Based on App.tsx: `moveNoteToSandbox` implies they move out of view.
    
    const activeNotes = notes.filter(n => n.status === 'inbox');
    
    const filteredNotes = activeNotes.filter(n => 
        (n.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
        n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
    ).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
    });

    const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

    useEffect(() => {
        if (selectedNote) {
            setEditContent(selectedNote.content);
            // Don't force editing mode, allow viewing
            if (!isEditing) setIsEditing(false);
        } else {
            setIsEditing(false);
            setEditContent('');
        }
    }, [selectedNoteId, selectedNote]); // Removed isEditing from deps to avoid loop

    const handleCreateNote = () => {
        const newNote: Note = {
            id: Date.now().toString(),
            content: '',
            tags: [],
            createdAt: Date.now(),
            status: 'inbox',
            title: ''
        };
        addNote(newNote);
        setSelectedNoteId(newNote.id);
        setIsEditing(true);
    };

    const handleSave = () => {
        if (selectedNote) {
            updateNote({ ...selectedNote, content: applyTypography(editContent) });
            // Keep editing mode if desired, or exit? Usually auto-save behavior in textareas
            // But if we use Blur, we exit editing? 
            // Let's rely on textarea onChange to update local state and blur to save/exit?
            // Actually, for a notes app, typing usually updates immediately or debounced.
            // Here we update on blur or manual save.
        }
    };

    const handleAutoTag = async () => {
        if (!selectedNote) return;
        setIsAutoTagging(true);
        try {
            const tags = await autoTagNote(selectedNote.content, config);
            const mergedTags = Array.from(new Set([...selectedNote.tags, ...tags]));
            updateNote({ ...selectedNote, tags: mergedTags });
        } catch (e) {
            console.error(e);
        } finally {
            setIsAutoTagging(false);
        }
    };

    const togglePin = (e: React.MouseEvent, note: Note) => {
        e.stopPropagation();
        updateNote({ ...note, isPinned: !note.isPinned });
    };

    const markdownComponents = {
        p: ({node, ...props}: any) => <p className="mb-2 last:mb-0 text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />,
        a: ({node, ...props}: any) => <a className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
        ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
        ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-slate-700 dark:text-slate-300" {...props} />,
        li: ({node, ...props}: any) => <li className="pl-1 leading-relaxed" {...props} />,
        h1: ({node, ...props}: any) => <h1 className="text-lg font-bold mt-4 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
        h2: ({node, ...props}: any) => <h2 className="text-base font-bold mt-3 mb-2 text-slate-900 dark:text-slate-100" {...props} />,
        blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-slate-200 dark:border-slate-700 pl-4 py-1 my-3 text-slate-500 italic" {...props} />,
    };

    return (
        <div className="flex h-full overflow-hidden bg-[#f8fafc] dark:bg-[#0f172a]">
            {/* Sidebar List */}
            <div className={`${selectedNote ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 lg:w-1/4 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b]`}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative mb-3">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={handleCreateNote}
                        className="w-full py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                        <Plus size={18} /> Новая заметка
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar-light p-2 space-y-2">
                    {filteredNotes.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-slate-400 text-sm">Нет заметок</p>
                        </div>
                    ) : (
                        filteredNotes.map(note => (
                            <div 
                                key={note.id} 
                                onClick={() => setSelectedNoteId(note.id)}
                                className={`p-4 rounded-xl cursor-pointer transition-all border group relative ${selectedNoteId === note.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm' : 'bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`font-bold text-sm truncate pr-6 ${!note.title ? 'text-slate-400 italic' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {note.title || 'Без названия'}
                                    </h4>
                                    {note.isPinned && <Pin size={12} className="text-indigo-500 fill-current shrink-0" />}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {note.content || 'Пустая заметка...'}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(note.createdAt).toLocaleDateString()}
                                    </span>
                                    {note.tags.length > 0 && (
                                        <div className="flex gap-1 overflow-hidden">
                                            {note.tags.slice(0, 2).map(t => (
                                                <span key={t} className="text-[9px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">#{t}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Quick Actions on Hover */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                                    <button 
                                        onClick={(e) => togglePin(e, note)}
                                        className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 ${note.isPinned ? 'text-indigo-500' : 'text-slate-400'}`}
                                    >
                                        <Pin size={12} className={note.isPinned ? "fill-current" : ""} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if(confirm('Удалить?')) deleteNote(note.id); }}
                                        className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div className={`${!selectedNote ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden`}>
                {!selectedNote ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <StickyNote size={64} className="mb-4 opacity-20" />
                        <p className="text-lg font-light">Выберите заметку</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Toolbar */}
                        <div className="shrink-0 p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#1e293b]">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setSelectedNoteId(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600">
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider hidden md:block">
                                    {new Date(selectedNote.createdAt).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Tooltip content="Авто-теги (AI)">
                                    <button onClick={handleAutoTag} disabled={isAutoTagging} className={`p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all ${isAutoTagging ? 'animate-pulse text-indigo-500' : ''}`}>
                                        <Wand2 size={18} />
                                    </button>
                                </Tooltip>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                                <Tooltip content="В Хаб">
                                    <button onClick={() => moveNoteToSandbox(selectedNote.id)} className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
                                        <Box size={18} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="В Архив">
                                    <button onClick={() => archiveNote(selectedNote.id)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                                        <Archive size={18} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="Удалить">
                                    <button onClick={() => { if(confirm('Удалить заметку?')) deleteNote(selectedNote.id); }} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar-light">
                            <div className="p-8 max-w-3xl mx-auto min-h-full flex flex-col">
                                <div className="mb-6">
                                    <input 
                                        type="text" 
                                        className="w-full text-3xl font-bold text-slate-900 dark:text-white bg-transparent border-none outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 font-serif leading-tight"
                                        placeholder="Заголовок..."
                                        value={selectedNote.title || ''}
                                        onChange={(e) => updateNote({ ...selectedNote, title: applyTypography(e.target.value) })}
                                    />
                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {selectedNote.tags.map(tag => (
                                            <div key={tag} className="group relative">
                                                <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    #{tag}
                                                    <button onClick={() => updateNote({...selectedNote, tags: selectedNote.tags.filter(t => t !== tag)})} className="hover:text-red-500"><X size={10} /></button>
                                                </span>
                                            </div>
                                        ))}
                                        <div className="relative flex items-center">
                                            <Plus size={14} className="absolute left-2 text-slate-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Тег..." 
                                                className="bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-md py-0.5 pl-6 pr-2 text-xs outline-none focus:border-indigo-300 w-24 transition-all"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.currentTarget.value.trim();
                                                        if (val && !selectedNote.tags.includes(val)) {
                                                            updateNote({ ...selectedNote, tags: [...selectedNote.tags, val] });
                                                            e.currentTarget.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col">
                                    {isEditing ? (
                                        <textarea 
                                            className="w-full flex-1 resize-none bg-transparent outline-none text-base text-slate-700 dark:text-slate-300 leading-relaxed font-mono"
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            placeholder="Начните писать..."
                                            autoFocus
                                            onBlur={handleSave}
                                        />
                                    ) : (
                                        <div 
                                            className="flex-1 prose dark:prose-invert max-w-none cursor-text text-base text-slate-700 dark:text-slate-300 leading-relaxed pb-20"
                                            onClick={() => setIsEditing(true)}
                                        >
                                            {selectedNote.content ? (
                                                <ReactMarkdown components={markdownComponents}>{selectedNote.content}</ReactMarkdown>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600">Нажмите, чтобы начать писать...</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Napkins;