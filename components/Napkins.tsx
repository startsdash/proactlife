import React, { useState, useEffect } from 'react';
import { Note, AppConfig, Task, JournalEntry, SketchItem } from '../types';
import { Plus, Search, Archive, Trash2, Edit2, Box, ArrowRight, Sparkles, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sketchpad from './Sketchpad';
import { autoTagNote } from '../services/geminiService';

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
  sketchItems: SketchItem[];
  addSketchItem: (item: SketchItem) => void;
  deleteSketchItem: (id: string) => void;
  updateSketchItem: (item: SketchItem) => void;
  defaultTab?: 'napkins' | 'sketchpad';
}

const Napkins: React.FC<Props> = ({ 
    notes, config, addNote, moveNoteToSandbox, moveNoteToInbox, deleteNote, reorderNote, updateNote, archiveNote, 
    sketchItems, addSketchItem, deleteSketchItem, updateSketchItem, defaultTab = 'napkins'
}) => {
    const [activeTab, setActiveTab] = useState<'napkins' | 'sketchpad'>(defaultTab);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [isAutoTagging, setIsAutoTagging] = useState(false);
    
    useEffect(() => {
        if (defaultTab) setActiveTab(defaultTab);
    }, [defaultTab]);

    const activeNotes = notes.filter(n => n.status === 'inbox');

    const handleAddNote = async () => {
        if (!newNoteContent.trim()) return;
        
        let tags: string[] = [];
        const tagTool = config.aiTools.find(t => t.id === 'tagger');
        
        if (tagTool && !tagTool.isDisabled) {
             setIsAutoTagging(true);
             try {
                 tags = await autoTagNote(newNoteContent, config);
             } catch (e) {
                 console.error(e);
             } finally {
                 setIsAutoTagging(false);
             }
        }

        const newNote: Note = {
            id: Date.now().toString(),
            content: newNoteContent,
            createdAt: Date.now(),
            status: 'inbox',
            tags: tags,
            connectedNoteIds: []
        };
        addNote(newNote);
        setNewNoteContent('');
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden transition-colors duration-500">
            {/* Tab Switcher */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm flex gap-1">
                <button 
                    onClick={() => setActiveTab('napkins')}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === 'napkins' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    Заметки
                </button>
                <button 
                    onClick={() => setActiveTab('sketchpad')}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === 'sketchpad' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                    Скетчпад
                </button>
            </div>

            <div className="flex-1 h-full overflow-hidden">
                {activeTab === 'sketchpad' ? (
                    <Sketchpad 
                        items={sketchItems} 
                        addItem={addSketchItem} 
                        deleteItem={deleteSketchItem} 
                        updateItem={updateSketchItem} 
                    />
                ) : (
                    <div className="h-full flex flex-col pt-20 px-4 md:px-8 pb-4 max-w-5xl mx-auto w-full">
                        {/* INPUT AREA */}
                        <div className="w-full bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-8 relative z-10 transition-all focus-within:shadow-md focus-within:border-indigo-300 dark:focus-within:border-indigo-700">
                            <textarea
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                onKeyDown={(e) => {
                                    if(e.key === 'Enter' && e.metaKey) {
                                        handleAddNote();
                                    }
                                }}
                                placeholder="О чем думаешь? (Cmd+Enter для сохранения)"
                                className="w-full h-24 bg-transparent border-none outline-none resize-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 font-serif leading-relaxed text-lg"
                            />
                            <div className="flex justify-between items-center mt-2">
                                <div className="text-xs text-slate-400 flex items-center gap-2">
                                    {isAutoTagging && <span className="flex items-center gap-1 animate-pulse text-indigo-500"><Sparkles size={12}/> AI Tagging...</span>}
                                </div>
                                <button 
                                    onClick={handleAddNote} 
                                    disabled={!newNoteContent.trim() || isAutoTagging}
                                    className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-md"
                                >
                                    <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>

                        {/* NOTES LIST */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar-light pb-20 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-min content-start">
                            <AnimatePresence>
                                {activeNotes.length === 0 ? (
                                    <div className="col-span-full text-center py-20 text-slate-400 select-none">
                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Type size={24} className="opacity-50"/>
                                        </div>
                                        <p>Входящие пусты</p>
                                    </div>
                                ) : (
                                    activeNotes.map(note => (
                                        <motion.div
                                            key={note.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="bg-white dark:bg-[#1e293b] rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative break-inside-avoid"
                                        >
                                            <div className="text-slate-800 dark:text-slate-200 font-serif leading-relaxed mb-4 whitespace-pre-wrap">
                                                {note.content}
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {note.tags.map(tag => (
                                                    <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 opacity-40 group-hover:opacity-100 transition-opacity">
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => moveNoteToSandbox(note.id)} className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-500 rounded-lg transition-colors" title="В Хаб">
                                                        <Box size={14} />
                                                    </button>
                                                    <button onClick={() => archiveNote(note.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 rounded-lg transition-colors" title="В Архив">
                                                        <Archive size={14} />
                                                    </button>
                                                    <button onClick={() => deleteNote(note.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-lg transition-colors" title="Удалить">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Napkins;