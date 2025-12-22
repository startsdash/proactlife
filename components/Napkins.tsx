import React, { useState, useMemo } from 'react';
import { Note, AppConfig } from '../types';
import { PenTool, Plus, Search, Loader, X, Filter } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import EmptyState from './EmptyState';
import { autoTagNote, findNotesByMood } from '../services/geminiService';

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
  onAddTask: (task: any) => void;
}

const Napkins: React.FC<Props> = ({ 
  notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, deleteNote, updateNote
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [activeColorFilter, setActiveColorFilter] = useState<string | null>(null);
  const [tagQuery, setTagQuery] = useState('');
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Filter Logic
  const filteredNotes = useMemo(() => {
    let res = notes.filter(n => n.status === 'inbox'); // Assuming Napkins shows inbox notes or all? Usually Napkins = Raw/Inbox
    
    if (searchQuery) {
        res = res.filter(n => n.content.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    if (activeColorFilter) {
        res = res.filter(n => n.color === activeColorFilter);
    }

    if (tagQuery) {
        res = res.filter(n => n.tags.some(t => t.toLowerCase().includes(tagQuery.toLowerCase())));
    }

    if (aiFilteredIds) {
        res = res.filter(n => aiFilteredIds.includes(n.id));
    }

    return res;
  }, [notes, searchQuery, activeColorFilter, tagQuery, aiFilteredIds]);

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    const newNote: Note = {
      id: Date.now().toString(),
      content: newNoteContent,
      tags: [],
      createdAt: Date.now(),
      status: 'inbox',
      color: 'bg-white'
    };
    addNote(newNote);
    setNewNoteContent('');
    
    // Auto-tag in background
    autoTagNote(newNoteContent, config).then(tags => {
        if (tags && tags.length > 0) {
            updateNote({ ...newNote, tags });
        }
    });
  };

  const handleAiSearch = async () => {
      if (!searchQuery) return;
      setIsAiLoading(true);
      const ids = await findNotesByMood(notes, searchQuery, config);
      setAiFilteredIds(ids);
      setIsAiLoading(false);
  };

  const clearFilters = () => {
      setSearchQuery('');
      setTagQuery('');
      setActiveColorFilter(null);
      setAiFilteredIds(null);
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 animate-in fade-in">
        {/* Header & Controls */}
        <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200">Салфетки</h1>
                    <p className="text-sm text-slate-500">Сырые мысли и идеи.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Поиск..."
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                        />
                        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                        {aiFilteredIds && (
                             <button onClick={() => setAiFilteredIds(null)} className="absolute right-2 top-2 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md hover:bg-indigo-200">
                                AI Reset
                             </button>
                        )}
                    </div>
                    <button 
                        onClick={handleAiSearch}
                        disabled={!searchQuery || isAiLoading}
                        className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 disabled:opacity-50"
                        title="AI Mood Match"
                    >
                        {isAiLoading ? <Loader size={20} className="animate-spin"/> : <PenTool size={20} />}
                    </button>
                </div>
            </div>

            {/* Quick Input */}
            <div className="relative">
                <textarea 
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="О чем думаешь?"
                    className="w-full p-4 pr-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm resize-none h-24 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700 dark:text-slate-200"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) handleAddNote();
                    }}
                />
                <button 
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className="absolute right-3 bottom-3 p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                    <Plus size={20} />
                </button>
            </div>
            
            {(activeColorFilter || tagQuery || aiFilteredIds) && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Filter size={12} /> Фильтры активны:
                    {activeColorFilter && <span className="bg-slate-100 px-2 py-1 rounded">Цвет</span>}
                    {tagQuery && <span className="bg-slate-100 px-2 py-1 rounded">Тег: {tagQuery}</span>}
                    {aiFilteredIds && <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded">AI Selection</span>}
                    <button onClick={clearFilters} className="text-red-400 hover:text-red-500 ml-auto"><X size={14}/></button>
                </div>
            )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto min-h-0">
            {filteredNotes.length === 0 ? (
                <div className="col-span-1 md:col-span-2 py-6">
                    <EmptyState 
                      icon={PenTool} 
                      title="Чистый лист" 
                      description={searchQuery || activeColorFilter || aiFilteredIds || tagQuery ? 'Ничего не найдено по вашему запросу.' : 'Входящие пусты. Отличное начало для новых мыслей.'}
                    />
                </div>
            ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4 pb-20">
                    {filteredNotes.map(note => (
                        <div key={note.id} className="break-inside-avoid bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-shadow group relative">
                            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                <ReactMarkdown>{note.content}</ReactMarkdown>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1">
                                {note.tags.map(t => (
                                    <span key={t} onClick={() => setTagQuery(t)} className="text-[10px] bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-100">#{t}</span>
                                ))}
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button onClick={() => moveNoteToSandbox(note.id)} className="p-1.5 bg-white dark:bg-slate-700 border rounded-lg text-slate-400 hover:text-amber-500 shadow-sm" title="В Хаб">
                                    <Search size={14} />
                                </button>
                                <button onClick={() => deleteNote(note.id)} className="p-1.5 bg-white dark:bg-slate-700 border rounded-lg text-slate-400 hover:text-red-500 shadow-sm">
                                    <X size={14} />
                                </button>
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