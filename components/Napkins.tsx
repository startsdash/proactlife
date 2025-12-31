import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Note, AppConfig, Task } from '../types';
import { autoTagNote } from '../services/geminiService';
import { 
  Plus, Search, X, Trash2, Archive, Box, 
  Image as ImageIcon, Tag, ArrowRight, RefreshCw, Upload, 
  Shuffle, Pin, Copy, Loader2, StickyNote, MoreVertical, Check
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import EmptyState from './EmptyState';

const UNSPLASH_PRESETS = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2670&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2670&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501854140884-074bf6b24363?q=80&w=2560&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=2574&auto=format&fit=crop"
];

const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// Cover Picker
const CoverPicker: React.FC<{ onSelect: (url: string) => void, onClose: () => void }> = ({ onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<string[]>(UNSPLASH_PRESETS);
    const [loading, setLoading] = useState(false);
    
    // Robust Env Getter for the API Key inside the component or file scope
    const getUnsplashKey = () => {
        const keys = [
            'UNSPLASH_ACCESS_KEY', 
            'VITE_UNSPLASH_ACCESS_KEY', 
            'NEXT_PUBLIC_UNSPLASH_ACCESS_KEY', 
            'REACT_APP_UNSPLASH_ACCESS_KEY'
        ];
        
        for (const k of keys) {
            // @ts-ignore
            if (typeof process !== 'undefined' && process.env?.[k]) return process.env[k];
            // @ts-ignore
            if (typeof import.meta !== 'undefined' && import.meta.env?.[k]) return import.meta.env[k];
        }
        return '';
    };

    const searchUnsplash = async (q?: string) => {
        const key = getUnsplashKey();
        if (!key) {
            if (q) alert("Ключ Unsplash не найден. Используйте встроенные пресеты или добавьте UNSPLASH_ACCESS_KEY.");
            return;
        }
        
        setLoading(true);
        try {
            const page = Math.floor(Math.random() * 10) + 1;
            const endpoint = q 
                ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=20&page=${page}&client_id=${key}`
                : `https://api.unsplash.com/photos/random?count=20&client_id=${key}`;
            
            const res = await fetch(endpoint);
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            
            const urls = q 
                ? data.results.map((img: any) => img.urls.regular) 
                : data.map((img: any) => img.urls.regular);
            
            setResults(urls);
        } catch (e) {
            console.error("Unsplash Fetch Error", e);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') searchUnsplash(query);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try { onSelect(await processImage(file)); onClose(); } catch (err) { console.error(err); }
        }
    };

    return (
        <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 w-80 flex flex-col gap-3" onMouseDown={e => e.stopPropagation()}>
            <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Обложка</span><button onClick={onClose}><X size={14} /></button></div>
            
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Поиск Unsplash..." 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-400"
                />
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <button 
                    onClick={() => searchUnsplash(query)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                    title="Найти"
                >
                    <ArrowRight size={12} />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar-light min-h-[60px]">
                {loading ? (
                    <div className="col-span-3 flex items-center justify-center py-4 text-slate-400">
                        <RefreshCw size={16} className="animate-spin" />
                    </div>
                ) : (
                    results.map((url, i) => (
                        <button key={i} onClick={() => { onSelect(url); onClose(); }} className="aspect-video rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500 relative group bg-slate-100">
                            <img src={url} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                    ))
                )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-xs font-medium cursor-pointer transition-colors text-slate-600 dark:text-slate-300">
                    <Upload size={12} /> Своя 
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
                <button onClick={() => searchUnsplash()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors text-slate-600 dark:text-slate-300">
                    <Shuffle size={12} /> Случайные
                </button>
            </div>
        </div>
    );
};

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
    deleteNote, updateNote, archiveNote 
}) => {
    const [input, setInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCoverPicker, setShowCoverPicker] = useState(false);
    const [activeCover, setActiveCover] = useState<string | undefined>(undefined);
    const [isAutoTagging, setIsAutoTagging] = useState(false);

    const activeNotes = useMemo(() => {
        return notes.filter(n => n.status === 'inbox').sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt - a.createdAt);
    }, [notes]);

    const filteredNotes = useMemo(() => {
        if (!searchQuery) return activeNotes;
        const q = searchQuery.toLowerCase();
        return activeNotes.filter(n => n.content.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)));
    }, [activeNotes, searchQuery]);

    const handleAddNote = async () => {
        if (!input.trim()) return;
        
        let tags: string[] = [];
        if (config.aiTools.find(t => t.id === 'tagger' && !t.isDisabled)) {
            setIsAutoTagging(true);
            try {
                tags = await autoTagNote(input, config);
            } catch (e) {
                console.error("Auto-tagging failed", e);
            } finally {
                setIsAutoTagging(false);
            }
        }

        const newNote: Note = {
            id: Date.now().toString(),
            content: input,
            createdAt: Date.now(),
            status: 'inbox',
            tags: tags,
            coverUrl: activeCover,
            isPinned: false
        };
        addNote(newNote);
        setInput('');
        setActiveCover(undefined);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleAddNote();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] p-4 md:p-8">
            <header className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Заметки</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Входящие мысли и идеи</p>
                </div>
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Поиск..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-100 outline-none w-48 md:w-64 transition-all"
                    />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar-light pb-24">
                {/* INPUT AREA */}
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-8 relative group">
                    {activeCover && (
                        <div className="relative h-32 w-full mb-4 rounded-xl overflow-hidden group/cover">
                            <img src={activeCover} className="w-full h-full object-cover" alt="cover" />
                            <button onClick={() => setActiveCover(undefined)} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover/cover:opacity-100 transition-opacity">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    <textarea 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="О чем думаешь? (Cmd+Enter чтобы сохранить)"
                        className="w-full h-24 md:h-32 bg-transparent outline-none resize-none text-slate-700 dark:text-slate-200 text-sm leading-relaxed placeholder:text-slate-400 font-medium"
                    />
                    <div className="flex justify-between items-center mt-2 border-t border-slate-50 dark:border-slate-700 pt-3">
                        <div className="flex gap-2 relative">
                            <button 
                                onClick={() => setShowCoverPicker(!showCoverPicker)} 
                                className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors ${activeCover ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                            >
                                <ImageIcon size={18} />
                            </button>
                            {showCoverPicker && (
                                <CoverPicker onSelect={setActiveCover} onClose={() => setShowCoverPicker(false)} />
                            )}
                        </div>
                        <button 
                            onClick={handleAddNote}
                            disabled={!input.trim() || isAutoTagging}
                            className="bg-slate-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isAutoTagging ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            <span>Сохранить</span>
                        </button>
                    </div>
                </div>

                {/* NOTES GRID */}
                {filteredNotes.length === 0 ? (
                    <EmptyState 
                        icon={StickyNote} 
                        title={searchQuery ? "Ничего не найдено" : "Нет заметок"} 
                        description={searchQuery ? "Попробуй другой запрос" : "Запиши свою первую мысль выше"} 
                        color="indigo"
                    />
                ) : (
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                        {filteredNotes.map(note => (
                            <div key={note.id} className="break-inside-avoid bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
                                {note.coverUrl && (
                                    <div className="h-32 w-full overflow-hidden relative">
                                        <img src={note.coverUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" alt="cover" />
                                    </div>
                                )}
                                <div className="p-5">
                                    <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap mb-4 font-normal">
                                        <ReactMarkdown>{note.content}</ReactMarkdown>
                                    </div>
                                    
                                    {note.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {note.tags.map(tag => (
                                                <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                                    <Tag size={10} /> {tag.replace(/^#/, '')}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex gap-1">
                                            <Tooltip content="В Хаб">
                                                <button onClick={() => moveNoteToSandbox(note.id)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors">
                                                    <Box size={16} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content={note.isPinned ? "Открепить" : "Закрепить"}>
                                                <button onClick={() => updateNote({...note, isPinned: !note.isPinned})} className={`p-1.5 rounded-lg transition-colors ${note.isPinned ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                                                    <Pin size={16} className={note.isPinned ? "fill-current" : ""} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                        <div className="flex gap-1">
                                            <Tooltip content="В Архив">
                                                <button onClick={() => archiveNote(note.id)} className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                                                    <Archive size={16} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Удалить">
                                                <button onClick={() => deleteNote(note.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Napkins;