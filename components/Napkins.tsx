import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import Masonry from 'react-masonry-css';
import { Note, AppConfig, Task, JournalEntry, SketchItem } from '../types';
import { Search, Filter, Plus, X, Tag, RotateCcw, RotateCw, Bold, Italic, Eraser, Layout, Palette, Trash2, Archive, Box, MoreHorizontal, Check, Edit3, CornerUpRight, Image as ImageIcon, Send, StickyNote } from 'lucide-react';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { applyTypography } from '../constants';

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

const TagSelector = ({ selectedTags, onChange, existingTags }: { selectedTags: string[], onChange: (tags: string[]) => void, existingTags: string[] }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    useEffect(() => {
        if (inputValue.trim()) {
            setSuggestions(existingTags.filter(t => t.toLowerCase().includes(inputValue.toLowerCase()) && !selectedTags.includes(t)));
        } else {
            setSuggestions([]);
        }
    }, [inputValue, existingTags, selectedTags]);

    const addTag = (tag: string) => {
        if (!selectedTags.includes(tag)) {
            onChange([...selectedTags, tag]);
        }
        setInputValue('');
    };

    const removeTag = (tag: string) => {
        onChange(selectedTags.filter(t => t !== tag));
    };

    return (
        <div className="flex flex-wrap gap-2 items-center">
            {selectedTags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs rounded-full">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-indigo-800 dark:hover:text-indigo-200"><X size={12} /></button>
                </span>
            ))}
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="#тег" 
                    className="bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 min-w-[60px]"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && inputValue.trim()) {
                            addTag(inputValue.trim().replace(/^#/, ''));
                        }
                    }}
                />
                {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 p-1 min-w-[120px]">
                        {suggestions.map(s => (
                            <button key={s} onClick={() => addTag(s)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                                #{s}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const Napkins: React.FC<Props> = ({ notes, config, addNote, moveNoteToSandbox, deleteNote, updateNote, archiveNote }) => {
    const [creationContent, setCreationContent] = useState('');
    const [creationTags, setCreationTags] = useState<string[]>([]);
    const [creationColor, setCreationColor] = useState('white');
    const [creationTitle, setCreationTitle] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

    // Editor History
    const [history, setHistory] = useState<string[]>(['']);
    const [historyIndex, setHistoryIndex] = useState(0);
    const contentEditableRef = useRef<HTMLDivElement>(null);
    const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const allExistingTags = useMemo(() => Array.from(new Set(notes.flatMap(n => n.tags))), [notes]);

    const filteredNotes = useMemo(() => {
        return notes.filter(n => {
            const matchesSearch = !searchQuery || (n.content.toLowerCase().includes(searchQuery.toLowerCase()) || n.title?.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesTag = !activeTagFilter || n.tags.includes(activeTagFilter);
            return matchesSearch && matchesTag;
        });
    }, [notes, searchQuery, activeTagFilter]);

    // Editor Helpers
    const saveSnapshot = useCallback((content: string) => {
        if (content === history[historyIndex]) return;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(content);
        if (newHistory.length > 20) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const handleInput = () => {
        if (contentEditableRef.current) {
            setCreationContent(contentEditableRef.current.innerHTML);
            if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
            historyTimeoutRef.current = setTimeout(() => {
                if (contentEditableRef.current) saveSnapshot(contentEditableRef.current.innerHTML);
            }, 500);
        }
    };

    const execCmd = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        if (contentEditableRef.current) {
            contentEditableRef.current.focus();
            saveSnapshot(contentEditableRef.current.innerHTML);
        }
    };

    const execUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            if (contentEditableRef.current) {
                contentEditableRef.current.innerHTML = history[newIndex];
                setCreationContent(history[newIndex]);
            }
        }
    };

    const execRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            if (contentEditableRef.current) {
                contentEditableRef.current.innerHTML = history[newIndex];
                setCreationContent(history[newIndex]);
            }
        }
    };

    const handleCreateNote = () => {
        if (!creationContent.trim() && !creationTitle.trim()) return;
        
        // Simple HTML to Markdown conversion for storage
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = creationContent;
        const textContent = tempDiv.innerText;

        const newNote: Note = {
            id: Date.now().toString(),
            title: creationTitle.trim() ? applyTypography(creationTitle) : undefined,
            content: applyTypography(textContent), // Storing as plain text for now to simplify
            tags: creationTags,
            color: creationColor,
            createdAt: Date.now(),
            status: 'inbox'
        };

        addNote(newNote);
        
        // Reset
        setCreationContent('');
        setCreationTitle('');
        setCreationTags([]);
        setCreationColor('white');
        setHistory(['']);
        setHistoryIndex(0);
        if (contentEditableRef.current) contentEditableRef.current.innerHTML = '';
        setIsExpanded(false);
    };

    const breakpointColumns = {
        default: 3,
        1100: 2,
        700: 1
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a]">
            {/* Header */}
            <div className="px-4 md:px-8 pt-4 md:pt-8 mb-6 shrink-0">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight font-sans">Заметки</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-sans">Поток входящих мыслей</p>
                    </div>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Поиск..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e293b] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 transition-shadow shadow-sm"
                        />
                    </div>
                    {allExistingTags.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 max-w-full md:max-w-md scrollbar-none">
                            <button 
                                onClick={() => setActiveTagFilter(null)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${!activeTagFilter ? 'bg-slate-800 text-white' : 'bg-white dark:bg-[#1e293b] text-slate-500 hover:bg-slate-100'}`}
                            >
                                Все
                            </button>
                            {allExistingTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setActiveTagFilter(tag === activeTagFilter ? null : tag)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${tag === activeTagFilter ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-[#1e293b] text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar-light px-4 md:px-8 pb-20">
                {/* Creation Input */}
                <div className={`w-full max-w-3xl mx-auto mb-10 transition-all duration-300 ${isExpanded ? 'shadow-xl' : 'shadow-sm hover:shadow-md'}`}>
                    <div className={`bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden ${getNoteColorClass(creationColor).replace('bg-', 'bg-opacity-50 ')}`}>
                        {!isExpanded ? (
                            <div onClick={() => setIsExpanded(true)} className="p-4 flex items-center gap-3 cursor-text text-slate-400">
                                <Plus size={20} />
                                <span className="text-sm font-medium">Новая заметка...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <input 
                                    type="text" 
                                    placeholder="Заголовок" 
                                    value={creationTitle}
                                    onChange={e => setCreationTitle(e.target.value)}
                                    className="px-6 pt-6 pb-2 text-lg font-bold bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100"
                                />
                                <div 
                                    ref={contentEditableRef}
                                    contentEditable
                                    onInput={handleInput}
                                    className="px-6 py-2 min-h-[100px] outline-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed"
                                />
                                
                                <div className="px-6 py-2">
                                    <TagSelector selectedTags={creationTags} onChange={setCreationTags} existingTags={allExistingTags} />
                                </div>

                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-1">
                                        <Tooltip content="Отменить"><button onClick={execUndo} disabled={historyIndex <= 0} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                        <Tooltip content="Повторить"><button onClick={execRedo} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
                                        <Tooltip content="Жирный"><button onClick={() => execCmd('bold')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><Bold size={16} /></button></Tooltip>
                                        <Tooltip content="Курсив"><button onClick={() => execCmd('italic')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"><Italic size={16} /></button></Tooltip>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setIsExpanded(false)} className="text-slate-400 hover:text-slate-600 text-sm">Отмена</button>
                                        <button onClick={handleCreateNote} className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors">Сохранить</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes Grid */}
                {filteredNotes.length === 0 ? (
                    <EmptyState icon={StickyNote} title="Нет заметок" description={searchQuery ? "Ничего не найдено" : "Создайте первую заметку"} />
                ) : (
                    <Masonry breakpointCols={breakpointColumns} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
                        {filteredNotes.map(note => (
                            <motion.div 
                                layout
                                key={note.id} 
                                className={`mb-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group hover:shadow-md transition-shadow ${getNoteColorClass(note.color)}`}
                            >
                                <div className="p-5">
                                    {note.title && <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{note.title}</h3>}
                                    <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-hidden relative">
                                        {note.content}
                                        {note.content.length > 300 && <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white dark:from-[#1e293b] to-transparent" />}
                                    </div>
                                    {note.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-4">
                                            {note.tags.map(tag => (
                                                <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-md uppercase tracking-wider">#{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex gap-1">
                                        <Tooltip content="В Хаб"><button onClick={() => moveNoteToSandbox(note.id)} className="p-1.5 hover:bg-amber-100 text-slate-400 hover:text-amber-600 rounded"><Box size={14} /></button></Tooltip>
                                        <Tooltip content="В Архив"><button onClick={() => archiveNote(note.id)} className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded"><Archive size={14} /></button></Tooltip>
                                    </div>
                                    <button onClick={() => deleteNote(note.id)} className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                                </div>
                            </motion.div>
                        ))}
                    </Masonry>
                )}
            </div>
        </div>
    );
};

export default Napkins;